import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"
import type { Nft } from "@/api/contracts"
import { connectRealtime, disconnectRealtime, onRealtimeEvent, onRealtimeStatus } from "@/lib/realtime"
import { useSession } from "./session"

export function RealtimeBridge() {
    const queryClient = useQueryClient()
    const { token, user } = useSession()
    const userId = user?.id ?? null

    // Conecta como visitante ou como o usuário da sessão; troca de usuário reconecta do zero.
    useEffect(() => {
        if (token && !userId) return
        void connectRealtime({ token: userId ? token : null, userId })
        return () => disconnectRealtime()
    }, [token, userId])

    useEffect(() => {
        const offEvent = onRealtimeEvent((event) => {
            if (event.type === "nft.updated") {
                const id = event.resource.id
                let name: string | null = null
                queryClient.setQueryData<Nft>(["nft", id], (old) => {
                    if (!old) return old
                    name = old.name
                    return {
                        ...old,
                        previousPriceEth: old.priceEth !== event.data.priceEth ? old.priceEth : old.previousPriceEth,
                        priceEth: event.data.priceEth,
                        version: event.version,
                        editions: old.editions.map((e) => ({ ...e, available: event.data.availability[e.id] ?? e.available })),
                    }
                })
                void queryClient.invalidateQueries({ queryKey: ["nfts"] })
                void queryClient.invalidateQueries({ queryKey: ["quote"] })
                if (name) toast.info(`${name}: preço ou disponibilidade atualizados.`)
            } else {
                void queryClient.invalidateQueries({ queryKey: ["order", event.resource.id] })
                void queryClient.invalidateQueries({ queryKey: ["cart"] })
            }
        })
        // Após reconectar, reconcilia com a API REST.
        const offStatus = onRealtimeStatus((status, info) => {
            if (status === "connected" && info.reconnected) void queryClient.invalidateQueries({ type: "active" })
        })
        return () => {
            offEvent()
            offStatus()
        }
    }, [queryClient])

    return null
}