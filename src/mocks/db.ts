import type { Cart, CartItemInput, Nft, Order, User, Wallet } from "@/api/contracts"
import { nftFixtures } from "./fixtures/nfts"
import { userFixtures, walletFixtures } from "./fixtures/users"
import { hashPassword } from "./lib/crypto"
import { scenarioPresets, type ScenarioConfig } from "./scenario-presets"

// Mude o número se alterar a estrutura dos dados de exemplo.
const STORAGE_KEY = "kurio:mock-db:v3"

export interface StoredUser extends User {
    passwordHash: string
}

export interface StoredSession {
    token: string
    userId: string
    expiresAt: string
}

export interface StoredOrder extends Order {
    userId: string
    plannedOutcome: "confirmed" | "declined"
    settleAt: string
    purchased: CartItemInput[]
}

export interface IdempotencyRecord {
    fingerprint: string
    orderId: string
}

export interface DbState {
    nfts: Nft[]
    users: StoredUser[]
    sessions: StoredSession[]
    favorites: Record<string, string[]>
    wallets: Record<string, Wallet[]>
    carts: Record<string, Cart>
    orders: StoredOrder[]
    idempotency: Record<string, IdempotencyRecord>
    scenario: ScenarioConfig
}

async function seed(): Promise<DbState> {
    const users: StoredUser[] = await Promise.all(
        userFixtures.map(async ({ password, ...user }) => ({
            ...user,
            passwordHash: await hashPassword(password),
        })),
    )
    return {
        nfts: structuredClone(nftFixtures),
        users,
        sessions: [],
        favorites: { user_ana: ["emerald-ape-042"], user_bruno: [] },
        wallets: structuredClone(walletFixtures),
        carts: {},
        orders: [],
        idempotency: {},
        scenario: structuredClone(scenarioPresets.default),
    }
}

function load(): DbState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as DbState) : null
    } catch {
        return null // sem localStorage ou JSON inválido: recomeça do estado inicial
    }
}

let state: DbState | null = null

export async function initDb(): Promise<void> {
    if (state) return
    state = load() ?? (await seed())
    commit()
}

export function getState(): DbState {
    if (!state) throw new Error("Banco de mocks não inicializado. Chame initDb() antes.")
    return state
}

export function commit(): void {
    if (!state) return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        // ignorar falha de persistência
    }
}

export async function resetDb(): Promise<void> {
    state = await seed()
    commit()
}