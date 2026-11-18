import { http, HttpResponse } from "msw"
import type { CreateWalletInput, Wallet, WalletInput } from "@/api/contracts"
import { validateWallet } from "@/api/validation"
import { commit, getState } from "../db"
import { requireAuth } from "../lib/auth"
import { newId } from "../lib/crypto"
import { errorResponse } from "../lib/http"
import { applyScenario } from "../scenario"

function normalize(input: WalletInput): WalletInput {
    return {
        displayName: input.displayName.trim(),
        alias: input.alias.trim(),
        profileName: input.profileName.trim(),
        network: input.network,
        address: input.address.trim(),
        secondaryAddress: input.secondaryAddress?.trim() || undefined,
        provider: input.provider,
        referralCode: input.referralCode.trim(),
        email: input.email.trim().toLowerCase(),
        ensName: input.ensName.trim().toLowerCase(),
    }
}

export const walletHandlers = [
    http.get("/api/wallets", async ({ request }) => {
        const early = await applyScenario("wallets.read")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth
        return HttpResponse.json(getState().wallets[auth.user.id] ?? [])
    }),

    http.post("/api/wallets", async ({ request }) => {
        const early = await applyScenario("wallets.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const input = (await request.json()) as CreateWalletInput
        const fieldErrors = validateWallet(input)
        if (Object.keys(fieldErrors).length) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", fieldErrors)
        }
        if (input.kind !== "primary" && input.kind !== "secondary") {
            return errorResponse(400, "VALIDATION_ERROR", "Tipo de carteira inválido.")
        }

        const list = (getState().wallets[auth.user.id] ??= [])
        if (list.some((w) => w.kind === input.kind)) {
            return errorResponse(
                409,
                "CONFLICT",
                input.kind === "primary"
                    ? "Você já possui uma carteira principal."
                    : "Você já possui uma carteira secundária.",
            )
        }

        const wallet: Wallet = { id: newId("wallet"), kind: input.kind, ...normalize(input) }
        list.push(wallet)
        commit()
        return HttpResponse.json(wallet, { status: 201 })
    }),

    http.put("/api/wallets/:id", async ({ request, params }) => {
        const early = await applyScenario("wallets.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const input = (await request.json()) as WalletInput
        const fieldErrors = validateWallet(input)
        if (Object.keys(fieldErrors).length) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", fieldErrors)
        }

        const id = String(params.id)
        const state = getState()
        const mine = state.wallets[auth.user.id]?.find((w) => w.id === id)
        if (!mine) {
            const belongsToSomeoneElse = Object.values(state.wallets).some((list) =>
                list.some((w) => w.id === id),
            )
            return belongsToSomeoneElse
                ? errorResponse(403, "FORBIDDEN", "Você não tem permissão para editar esta carteira.")
                : errorResponse(404, "NOT_FOUND", "Carteira não encontrada.")
        }

        Object.assign(mine, normalize(input))
        commit()
        return HttpResponse.json(mine)
    }),
]