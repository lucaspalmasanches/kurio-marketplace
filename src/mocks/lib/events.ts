import type { NftUpdatedEvent, OrderUpdatedEvent } from "@/api/contracts"

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
type Listener = (event: RealtimeEvent) => void

const listeners = new Set<Listener>()
let lastEvent: RealtimeEvent | null = null

export function subscribeEvents(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function publishEvent(event: RealtimeEvent): void {
    lastEvent = event
    for (const listener of [...listeners]) {
        try {
            listener(event)
        } catch (error) {
            console.error("[mocks] erro em listener de evento", error)
        }
    }
}

export function getLastEvent(): RealtimeEvent | null {
    return lastEvent
}