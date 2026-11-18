import Decimal from "decimal.js"
import { delay, http, HttpResponse } from "msw"
import type { CreateOrderInput, OrderItemSnapshot } from "@/api/contracts"
import { validateOrderInput } from "@/api/validation"
import { commit, getState, type StoredOrder } from "../db"
import { requireAuth } from "../lib/auth"
import { newId } from "../lib/crypto"
import { errorResponse } from "../lib/http"
import { updateNft } from "../lib/nft-changes"
import { scheduleSettle, settleIfDue, toPublicOrder } from "../lib/orders"
import { computeQuote } from "../lib/quote"
import { applyScenario } from "../scenario"

function fingerprint(input: CreateOrderInput): string {
    const items = input.items
        .map((i) => [i.nftId, i.editionId, i.quantity] as const)
        .sort((a, b) => `${a[0]}|${a[1]}`.localeCompare(`${b[0]}|${b[1]}`))
    const c = input.collector
    return JSON.stringify({
        quoteId: input.quoteId,
        items,
        coupon: input.couponCode?.trim().toUpperCase() ?? null,
        walletId: input.walletId,
        provider: input.provider,
        network: input.network,
        collector: [c.displayName, c.username, c.profileName, c.email, c.ensName, c.referralCode, c.note ?? ""],
    })
}

export const orderHandlers = [
    http.post("/api/orders", async ({ request }) => {
        const early = await applyScenario("orders.create")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const key = request.headers.get("idempotency-key")?.trim()
        if (!key) {
            return errorResponse(400, "VALIDATION_ERROR", "O cabeçalho Idempotency-Key é obrigatório.")
        }

        const input = (await request.json()) as CreateOrderInput
        const fieldErrors = validateOrderInput(input)
        if (Object.keys(fieldErrors).length) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", fieldErrors)
        }

        const state = getState()
        const idemKey = `${auth.user.id}:${key}`
        const fp = fingerprint(input)

        // Mesma chave + mesmo conteúdo = mesmo pedido (recuperação após timeout). Conteúdo diferente = conflito.
        const previous = state.idempotency[idemKey]
        if (previous) {
            if (previous.fingerprint !== fp) {
                return errorResponse(
                    409,
                    "IDEMPOTENCY_CONFLICT",
                    "Esta chave de idempotência já foi usada com outro conteúdo.",
                )
            }
            const existing = state.orders.find((o) => o.id === previous.orderId)
            if (existing) {
                settleIfDue(existing)
                return HttpResponse.json(toPublicOrder(existing), {
                    headers: { "Idempotent-Replay": "true" },
                })
            }
        }

        const wallet = (state.wallets[auth.user.id] ?? []).find((w) => w.id === input.walletId)
        if (!wallet) return errorResponse(404, "NOT_FOUND", "Carteira não encontrada.")

        // Cenários que alteram preço ou estoque no meio da compra (também geram evento nft.updated).
        const mutation = state.scenario.order.mutateOnCreate
        if (mutation && mutation.times > 0) {
            mutation.times -= 1
            commit()
            const first = input.items[0]
            const nft = state.nfts.find((n) => n.id === first.nftId)
            if (nft) {
                if (mutation.kind === "price") {
                    updateNft(nft.id, { priceEth: new Decimal(nft.priceEth).plus("0.10").toFixed(2) })
                } else {
                    updateNft(nft.id, { availability: { [first.editionId]: 0 } })
                }
            }
        }

        // Revalida preço, disponibilidade, cupom e taxas antes de confirmar.
        const result = computeQuote(input.items, input.couponCode)
        if (!result.ok) return errorResponse(result.status, result.code, result.message)
        const { quote } = result
        if (quote.lines.some((l) => !l.ok)) {
            return errorResponse(409, "AVAILABILITY_CONFLICT", "A disponibilidade mudou. Revise seu carrinho.")
        }
        if (quote.id !== input.quoteId) {
            return errorResponse(409, "PRICE_CHANGED", "Os valores mudaram. Revise e confirme novamente.")
        }

        // O recibo é um snapshot: alterações posteriores no catálogo não o modificam.
        const items: OrderItemSnapshot[] = quote.lines.flatMap((line) => {
            const nft = state.nfts.find((n) => n.id === line.nftId)
            const edition = nft?.editions.find((e) => e.id === line.editionId)
            if (!nft || !edition) return []
            return [
                {
                    nftId: nft.id,
                    name: nft.name,
                    tokenId: nft.tokenId,
                    imageUrl: nft.imageUrl,
                    editionLabel: edition.label,
                    quantity: line.quantity,
                    unitPriceEth: line.unitPriceEth,
                    lineTotalEth: line.lineTotalEth,
                },
            ]
        })

        const { order: scenarioOrder } = state.scenario
        const now = new Date()
        const order: StoredOrder = {
            id: newId("ord"),
            userId: auth.user.id,
            status: "pending",
            items,
            subtotalEth: quote.subtotalEth,
            discountEth: quote.discountEth,
            networkFeeEth: quote.networkFeeEth,
            totalEth: quote.totalEth,
            couponCode: quote.couponCode,
            walletAddress: wallet.address,
            provider: input.provider,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            version: 1,
            plannedOutcome: scenarioOrder.outcome,
            settleAt: new Date(now.getTime() + scenarioOrder.settleMs).toISOString(),
            purchased: input.items.map((i) => ({
                nftId: i.nftId,
                editionId: i.editionId,
                quantity: i.quantity,
            })),
        }
        state.orders.push(order)
        state.idempotency[idemKey] = { fingerprint: fp, orderId: order.id }
        commit()
        scheduleSettle(order)

        // Cenário de timeout: o pedido FOI criado, mas a resposta nunca chega.
        if (scenarioOrder.dropResponseTimes > 0) {
            scenarioOrder.dropResponseTimes -= 1
            commit()
            await delay("infinite")
            return HttpResponse.error()
        }

        return HttpResponse.json(toPublicOrder(order), { status: 201 })
    }),

    http.get("/api/orders", async ({ request }) => {
        const early = await applyScenario("orders.read")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const mine = getState()
            .orders.filter((o) => o.userId === auth.user.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        mine.forEach(settleIfDue)
        return HttpResponse.json(mine.map(toPublicOrder))
    }),

    http.get("/api/orders/:id", async ({ request, params }) => {
        const early = await applyScenario("orders.read")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const order = getState().orders.find((o) => o.id === params.id)
        if (!order) return errorResponse(404, "NOT_FOUND", "Pedido não encontrado.")
        if (order.userId !== auth.user.id) {
            return errorResponse(403, "FORBIDDEN", "Você não tem permissão para ver este pedido.")
        }
        settleIfDue(order)
        return HttpResponse.json(toPublicOrder(order))
    }),
]