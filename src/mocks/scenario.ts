import { delay, HttpResponse } from "msw"
import type { ApiErrorCode } from "@/api/contracts"
import { commit, getState } from "./db"
import { errorResponse } from "./lib/http"
import { scenarioPresets, type FaultKey } from "./scenario-presets"

function mulberry32(seed: number) {
    let a = seed
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const SEED = 2026
let rng = mulberry32(SEED)
let listCalls = 0

function nextLatency(key: FaultKey): number {
    const { latencyMs, outOfOrderList } = getState().scenario
    if (outOfOrderList && key === "nfts.list") {
        const slow = listCalls % 2 === 0
        listCalls += 1
        return slow ? 1500 : 120
    }
    const [min, max] = latencyMs
    return Math.round(min + rng() * (max - min))
}

function defaultCode(status: number): ApiErrorCode {
    if (status === 401) return "UNAUTHENTICATED"
    if (status === 403) return "FORBIDDEN"
    if (status === 404) return "NOT_FOUND"
    if (status === 409) return "CONFLICT"
    if (status >= 500) return "TRANSIENT_ERROR"
    return "VALIDATION_ERROR"
}

/** Aplica latência e falhas do cenário. Retorna uma resposta se a chamada deve falhar. */
export async function applyScenario(key: FaultKey): Promise<Response | null> {
    const { scenario } = getState()
    if (scenario.offline) return HttpResponse.error()

    await delay(nextLatency(key))

    const fault = scenario.faults[key]
    if (!fault) return null
    if (fault.times !== undefined) {
        if (fault.times <= 0) return null
        fault.times -= 1
        commit()
    }

    switch (fault.type) {
        case "network":
            return HttpResponse.error()
        case "timeout":
            await delay("infinite")
            return HttpResponse.error()
        case "http":
            return errorResponse(
                fault.status,
                fault.code ?? defaultCode(fault.status),
                fault.message ?? "Falha simulada pelo cenário.",
            )
    }
}

export function listScenarios() {
    return Object.values(scenarioPresets).map(({ name, description }) => ({ name, description }))
}

export function getScenarioName(): string {
    return getState().scenario.name
}

export function setScenario(name: string): void {
    const preset = scenarioPresets[name]
    if (!preset) {
        throw new Error(
            `Cenário desconhecido: "${name}". Disponíveis: ${Object.keys(scenarioPresets).join(", ")}`,
        )
    }
    getState().scenario = structuredClone(preset)
    rng = mulberry32(SEED)
    listCalls = 0
    commit()
}

export function expireSessions(): void {
    const past = new Date(Date.now() - 1000).toISOString()
    for (const session of getState().sessions) session.expiresAt = past
    commit()
}