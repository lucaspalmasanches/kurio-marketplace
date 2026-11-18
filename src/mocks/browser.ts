import { setupWorker } from "msw/browser"
import { initDb, resetDb } from "./db"
import { handlers } from "./handlers"
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

    window.__kurioMocks = { resetDb, setScenario, getScenario: getScenarioName, listScenarios, expireSessions }
    await worker.start({ onUnhandledRequest: "bypass" })
}