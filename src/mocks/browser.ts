import { setupWorker } from "msw/browser"
import { handlers } from "./handlers"
import { resetDb } from "./db"

export const worker = setupWorker(...handlers)

declare global {
    interface Window {
        __kurioMocks?: { resetDb: () => void }
    }
}

// Usado nos testes E2E e para resetar o cenário durante o desenvolvimento
window.__kurioMocks = { resetDb }