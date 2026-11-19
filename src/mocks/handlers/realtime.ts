import { toSocketIo } from "@mswjs/socket.io-binding"
import { ws } from "msw"
import { findUserByToken } from "../lib/auth"
import { subscribeEvents } from "../lib/events"

// A URL usa a origem da própria página, então funciona no dev, no preview e no deploy.
const WS_ORIGIN = window.location.origin.replace(/^http/, "ws")
export const socketLink = ws.link(WS_ORIGIN)

// O binding não envia ping do Engine.IO; sem ele o cliente se desconecta por "ping timeout".
const PING_EVERY_MS = 20_000

type Peer = { close: () => void }
const peers = new Map<Peer, () => void>()

/** Derruba todas as conexões (o cliente Socket.IO tenta reconectar sozinho). */
export function dropConnections(): void {
    for (const [client, cleanup] of [...peers]) {
        cleanup()
        client.close()
    }
}

export const realtimeHandlers = [
    socketLink.addEventListener("connection", (connection) => {
        const io = toSocketIo(connection)
        let userId: string | null = null

        io.client.on("session.authenticate", (_event, payload?: { token?: string }) => {
            const user = payload?.token ? findUserByToken(payload.token) : null
            userId = user?.id ?? null
            io.client.emit(user ? "session.ready" : "session.rejected", { userId })
        })

        const unsubscribe = subscribeEvents((event) => {
            // Pedidos só chegam ao dono; eventos de NFT são públicos.
            if (event.type === "order.updated" && event.userId !== userId) return
            try {
                io.client.emit(event.type, event)
            } catch {
                // conexão já fechada
            }
        })

        const ping = setInterval(() => {
            try {
                connection.client.send("2")
            } catch {
                // conexão já fechada
            }
        }, PING_EVERY_MS)

        let cleaned = false
        const cleanup = () => {
            if (cleaned) return
            cleaned = true
            clearInterval(ping)
            unsubscribe()
            peers.delete(connection.client)
        }

        peers.set(connection.client, cleanup)
        connection.client.addEventListener("close", cleanup)
    }),
]