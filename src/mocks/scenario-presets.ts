import type { ApiErrorCode } from "@/api/contracts"

export type FaultKey =
    | "auth.login"
    | "auth.register"
    | "auth.session"
    | "nfts.list"
    | "nfts.detail"
    | "favorites.read"
    | "favorites.write"
    | "cart.read"
    | "cart.write"
    | "quote.create"
    | "orders.create"
    | "orders.read"
    | "profile.read"
    | "profile.write"
    | "wallets.read"
    | "wallets.write"

export type Fault =
    | { type: "network"; times?: number }
    | { type: "timeout"; times?: number }
    | { type: "http"; status: number; code?: ApiErrorCode; message?: string; times?: number }

export interface ScenarioConfig {
    name: string
    description: string
    latencyMs: [number, number]
    outOfOrderList: boolean
    emptyCatalog: boolean
    offline: boolean
    faults: Partial<Record<FaultKey, Fault>>
}

function make(
    name: string,
    description: string,
    overrides: Partial<Omit<ScenarioConfig, "name" | "description">> = {},
): ScenarioConfig {
    return {
        name,
        description,
        latencyMs: [80, 250],
        outOfOrderList: false,
        emptyCatalog: false,
        offline: false,
        faults: {},
        ...overrides,
    }
}

export const scenarioPresets: Record<string, ScenarioConfig> = Object.fromEntries(
    [
        make("default", "Rede estável, latência baixa e variável."),
        make("slow", "Latência alta (1,5 a 3 s) para ver os skeletons.", { latencyMs: [1500, 3000] }),
        make("out-of-order", "A listagem alterna respostas lentas e rápidas (fora de ordem).", {
            outOfOrderList: true,
        }),
        make("empty-catalog", "O catálogo volta vazio.", { emptyCatalog: true }),
        make("offline", "Toda chamada à API falha por erro de conexão.", { offline: true }),
        make("server-error", "Listagem e detalhe de NFT respondem 500.", {
            faults: {
                "nfts.list": { type: "http", status: 500 },
                "nfts.detail": { type: "http", status: 500 },
            },
        }),
        make("flaky", "Falha 2 vezes (503) e depois recupera, para testar nova tentativa.", {
            faults: {
                "nfts.list": { type: "http", status: 503, times: 2 },
                "nfts.detail": { type: "http", status: 503, times: 1 },
            },
        }),
        make("favorites-fail", "Incluir ou remover favorito responde 500 (testa o rollback).", {
            faults: { "favorites.write": { type: "http", status: 500 } },
        }),
        make("forbidden", "Carteiras respondem 403 (sem permissão).", {
            faults: {
                "wallets.read": { type: "http", status: 403, code: "FORBIDDEN", message: "Sem permissão." },
                "wallets.write": { type: "http", status: 403, code: "FORBIDDEN", message: "Sem permissão." },
            },
        }),
    ].map((s) => [s.name, s]),
)