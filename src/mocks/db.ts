import type { Nft } from "@/api/contracts"
import { nftFixtures } from "./fixtures/nfts"

// Mude o número da versão se alterar a estrutura dos dados de exemplo.
const STORAGE_KEY = "kurio:mock-db:v1"

export interface DbState {
    nfts: Nft[]
}

function seed(): DbState {
    return { nfts: structuredClone(nftFixtures) }
}

function load(): DbState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw) as DbState
    } catch {
        // sem localStorage: segue com o estado inicial em memória
    }
    return seed()
}

let state: DbState = load()

export function getState(): DbState {
    return state
}

export function commit(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        // ignorar falha de persistência
    }
}

export function resetDb(): void {
    state = seed()
    commit()
}