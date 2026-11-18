import { http, HttpResponse } from "msw"
import type { QuoteInput } from "@/api/contracts"
import { errorResponse } from "../lib/http"
import { computeQuote } from "../lib/quote"
import { applyScenario } from "../scenario"

export const quoteHandlers = [
    http.post("/api/quote", async ({ request }) => {
        const early = await applyScenario("quote.create")
        if (early) return early

        const input = (await request.json()) as QuoteInput
        const result = computeQuote(input.items, input.couponCode)
        if (!result.ok) return errorResponse(result.status, result.code, result.message)
        return HttpResponse.json(result.quote)
    }),
]