/**
 * Promessa que resolve quando a camada de rede está pronta (MSW iniciado no build de demonstração).
 * A interface renderiza imediatamente; apenas o transporte (Axios e Socket.IO) aguarda.
 */
let ready: Promise<void> = Promise.resolve()

export function setMocksReady(promise: Promise<void>): void {
    ready = promise
}

export function whenMocksReady(): Promise<void> {
    return ready
}