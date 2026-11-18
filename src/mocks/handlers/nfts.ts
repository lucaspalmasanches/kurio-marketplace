import { http, HttpResponse, delay } from "msw"
import type { ApiErrorBody } from "@/api/contracts"
import { getState } from "../db"
import { parseListQuery, queryNfts } from "../lib/query-nfts"

export const nftHandlers = [
    http.get("/api/nfts", async ({ request }) => {
        await delay(250)
        const query = parseListQuery(new URL(request.url).searchParams)
        return HttpResponse.json(queryNfts(getState().nfts, query))
    }),

    http.get("/api/nfts/:id", async ({ params }) => {
        await delay(200)
        const nft = getState().nfts.find((n) => n.id === params.id)
        if (!nft) {
            const body: ApiErrorBody = { code: "NOT_FOUND", message: "NFT não encontrado." }
            return HttpResponse.json(body, { status: 404 })
        }
        return HttpResponse.json(nft)
    }),
]