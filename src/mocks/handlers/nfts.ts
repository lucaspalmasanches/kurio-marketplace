import { http, HttpResponse } from "msw"
import { getState } from "../db"
import { errorResponse } from "../lib/http"
import { parseListQuery, queryNfts } from "../lib/query-nfts"
import { applyScenario } from "../scenario"
import type { ReviewsResponse } from "@/api/contracts"
import { reviewsFor } from "../fixtures/reviews"

export const nftHandlers = [
    http.get("/api/nfts", async ({ request }) => {
        const early = await applyScenario("nfts.list")
        if (early) return early

        const query = parseListQuery(new URL(request.url).searchParams)
        const { nfts, scenario } = getState()
        return HttpResponse.json(queryNfts(scenario.emptyCatalog ? [] : nfts, query))
    }),

    http.get("/api/nfts/:id", async ({ params }) => {
        const early = await applyScenario("nfts.detail")
        if (early) return early

        const nft = getState().nfts.find((n) => n.id === params.id)
        if (!nft) return errorResponse(404, "NOT_FOUND", "NFT não encontrado.")
        return HttpResponse.json(nft)
    }),

    http.get("/api/nfts/:id/reviews", async ({ params }) => {
        const early = await applyScenario("nfts.detail")
        if (early) return early

        const nft = getState().nfts.find((n) => n.id === params.id)
        if (!nft) return errorResponse(404, "NOT_FOUND", "NFT não encontrado.")
        const body: ReviewsResponse = { items: reviewsFor(nft), total: nft.reviewCount, average: nft.rating }
        return HttpResponse.json(body)
    }),
]