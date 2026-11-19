import { setupWorker } from "msw/browser"
import { initDb, resetDb } from "./db"
import { handlers } from "./handlers"
import { dropConnections } from "./handlers/realtime"
import { getLastEvent, publishEvent } from "./lib/events"
import { emitStaleNftEvent, updateNft, type NftPatch } from "./lib/nft-changes"
import { schedulePendingOrders } from "./lib/orders"
import { expireSessions, getScenarioName, listScenarios, setScenario } from "./scenario"

export const worker = setupWorker(...handlers)

declare global {
    interface Window {
        __kurioMocks?: {
            resetDb: () => Promise<void>
            setScenario: (name: string) => void
            getScenario: () => string
            listScenarios: () => { name: string; description: string }[]
            expireSessions: () => void
            updateNft: (id: string, patch: NftPatch) => void
            replayLastEvent: () => void
            emitStaleNft: (id: string) => void
            dropConnections: () => void
        }
    }
}

export async function startMocks(): Promise<void> {
    await initDb()

    const requested = new URLSearchParams(window.location.search).get("scenario")
    if (requested) {
        try {
            setScenario(requested)
        } catch (error) {
            console.warn(error)
        }
    }

    schedulePendingOrders()

    window.__kurioMocks = {
        resetDb,
        setScenario,
        getScenario: getScenarioName,
        listScenarios,
        expireSessions,
        updateNft: (id, patch) => {
            updateNft(id, patch)
        },
        replayLastEvent: () => {
            const event = getLastEvent()
            if (event) publishEvent(event)
        },
        emitStaleNft: emitStaleNftEvent,
        dropConnections,
    }
    await worker.start({ onUnhandledRequest: "bypass" })
}