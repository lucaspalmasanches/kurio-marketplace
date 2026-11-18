import { http, HttpResponse } from "msw"
import type { FavoritesResponse } from "@/api/contracts"
import { commit, getState } from "../db"
import { requireAuth } from "../lib/auth"
import { errorResponse } from "../lib/http"
import { applyScenario } from "../scenario"

export const favoriteHandlers = [
    http.get("/api/favorites", async ({ request }) => {
        const early = await applyScenario("favorites.read")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const body: FavoritesResponse = { nftIds: getState().favorites[auth.user.id] ?? [] }
        return HttpResponse.json(body)
    }),

    http.put("/api/favorites/:nftId", async ({ request, params }) => {
        const early = await applyScenario("favorites.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const nftId = String(params.nftId)
        const state = getState()
        if (!state.nfts.some((n) => n.id === nftId)) {
            return errorResponse(404, "NOT_FOUND", "NFT não encontrado.")
        }
        const list = (state.favorites[auth.user.id] ??= [])
        if (!list.includes(nftId)) list.push(nftId)
        commit()

        const body: FavoritesResponse = { nftIds: list }
        return HttpResponse.json(body)
    }),

    http.delete("/api/favorites/:nftId", async ({ request, params }) => {
        const early = await applyScenario("favorites.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const nftId = String(params.nftId)
        const state = getState()
        state.favorites[auth.user.id] = (state.favorites[auth.user.id] ?? []).filter((id) => id !== nftId)
        commit()

        const body: FavoritesResponse = { nftIds: state.favorites[auth.user.id] }
        return HttpResponse.json(body)
    }),
]