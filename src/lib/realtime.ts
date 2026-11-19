import type { Socket } from "socket.io-client"
import type { NftUpdatedEvent, OrderUpdatedEvent } from "@/api/contracts"
import { whenMocksReady } from "./mocks-ready"

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
export type RealtimeStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected"

type RealtimeListener = (event: RealtimeEvent) => void
type StatusListener = (status: RealtimeStatus, info: { reconnected: boolean }) => void
interface ConnectOptions {
    token?: string | null
    userId?: string | null
}

const MAX_SEEN_IDS = 500

const seenIds = new Set<string>()
const versions = new Map<string, number>()
const eventListeners = new Set<RealtimeListener>()
const statusListeners = new Set<StatusListener>()

let socket: Socket | null = null
let activeUserId: string | null = null
let status: RealtimeStatus = "idle"
let hadConnection = false
let generation = 0

function setStatus(next: RealtimeStatus, reconnected = false): void {
    status = next
    for (const listener of [...statusListeners]) listener(next, { reconnected })
}

function isRealtimeEvent(value: unknown): value is RealtimeEvent {
    if (typeof value !== "object" || value === null) return false
    const e = value as Partial<RealtimeEvent>
    return (
        (e.type === "nft.updated" || e.type === "order.updated") &&
        typeof e.id === "string" &&
        typeof e.version === "number" &&
        typeof e.resource?.id === "string"
    )
}

/** Informa a versão de um recurso vinda da API REST, para que eventos mais antigos sejam ignorados. */
export function recordResourceVersion(type: "nft" | "order", id: string, version: number): void {
    const key = `${type}:${id}`
    if ((versions.get(key) ?? 0) < version) versions.set(key, version)
}

function accept(event: RealtimeEvent): boolean {
    // Eventos de pedido só valem para o usuário da sessão atual.
    if (event.type === "order.updated" && event.userId !== activeUserId) return false
    if (seenIds.has(event.id)) return false // duplicado

    const key = `${event.resource.type}:${event.resource.id}`
    if ((versions.get(key) ?? 0) >= event.version) return false // antigo ou repetido

    seenIds.add(event.id)
    if (seenIds.size > MAX_SEEN_IDS) {
        const oldest = seenIds.values().next().value
        if (oldest !== undefined) seenIds.delete(oldest)
    }
    versions.set(key, event.version)
    return true
}

function deliver(payload: unknown): void {
    if (!isRealtimeEvent(payload) || !accept(payload)) return
    for (const listener of [...eventListeners]) {
        try {
            listener(payload)
        } catch (error) {
            console.error("[realtime] erro em listener", error)
        }
    }
}

export function onRealtimeEvent(listener: RealtimeListener): () => void {
    eventListeners.add(listener)
    return () => {
        eventListeners.delete(listener)
    }
}

export function onRealtimeStatus(listener: StatusListener): () => void {
    statusListeners.add(listener)
    return () => {
        statusListeners.delete(listener)
    }
}

export function getRealtimeStatus(): RealtimeStatus {
    return status
}

export async function connectRealtime(options: ConnectOptions = {}): Promise<void> {
    disconnectRealtime()
    const mine = generation
    activeUserId = options.userId ?? null
    setStatus("connecting")
    // O socket só pode ser criado depois que o MSW substituiu o WebSocket.
    await whenMocksReady()
    if (mine !== generation) return

    // Import dinâmico: o socket.io-client precisa ser carregado DEPOIS que o MSW subiu,
    // porque a biblioteca pode guardar o WebSocket global ao ser importada.
    const { io } = await import("socket.io-client")
    if (mine !== generation) return // desconectado ou trocado durante o import

    const s = io(window.location.origin, {
        path: "/socket.io",
        transports: ["websocket"],
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
    })
    socket = s

    const markConnected = () => {
        if (socket !== s) return
        const reconnected = hadConnection
        hadConnection = true
        setStatus("connected", reconnected)
    }

    s.on("connect", () => {
        if (options.token) s.emit("session.authenticate", { token: options.token })
        else markConnected()
    })
    s.on("session.ready", markConnected)
    s.on("session.rejected", () => {
        if (socket !== s) return
        socket = null
        s.removeAllListeners()
        s.disconnect()
        setStatus("disconnected")
    })
    s.on("disconnect", () => {
        if (socket === s) setStatus("reconnecting")
    })
    s.on("connect_error", () => {
        if (socket === s) setStatus("reconnecting")
    })
    s.on("nft.updated", deliver)
    s.on("order.updated", deliver)
}

/** Libera o socket e limpa o estado da sessão (logout ou troca de usuário). */
export function disconnectRealtime(): void {
    generation += 1
    const s = socket
    socket = null
    if (s) {
        s.removeAllListeners()
        s.disconnect()
    }
    activeUserId = null
    hadConnection = false
    seenIds.clear()
    versions.clear()
    if (status !== "idle") setStatus("disconnected")
}