import { http, HttpResponse } from "msw"
import type { Cart, CartItemInput } from "@/api/contracts"
import { commit, getState } from "../db"
import { requireAuth } from "../lib/auth"
import { newId } from "../lib/crypto"
import { errorResponse } from "../lib/http"
import { applyScenario } from "../scenario"

function emptyCart(): Cart {
    return { items: [], version: 0, updatedAt: new Date().toISOString() }
}

function touch(cart: Cart): void {
    cart.version += 1
    cart.updatedAt = new Date().toISOString()
}

function isValidQuantity(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 1
}

function limitMessage(available: number): string {
    return available === 0
        ? "Esta edição está esgotada."
        : `Disponível apenas ${available} unidade(s) desta edição.`
}

function findEdition(nftId: unknown, editionId: unknown) {
    const nft = getState().nfts.find((n) => n.id === nftId)
    const edition = nft?.editions.find((e) => e.id === editionId)
    return nft && edition ? { nft, edition } : null
}

/** Usuário autenticado usa o carrinho da conta; visitante usa o x-cart-id. */
function resolveCartKey(request: Request): string | Response {
    if (request.headers.get("authorization")) {
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth
        return `user:${auth.user.id}`
    }
    const guestId = request.headers.get("x-cart-id")?.trim()
    if (!guestId) {
        return errorResponse(400, "VALIDATION_ERROR", "Informe o identificador do carrinho (x-cart-id).")
    }
    return `guest:${guestId}`
}

export const cartHandlers = [
    http.get("/api/cart", async ({ request }) => {
        const early = await applyScenario("cart.read")
        if (early) return early
        const key = resolveCartKey(request)
        if (key instanceof Response) return key
        return HttpResponse.json(getState().carts[key] ?? emptyCart())
    }),

    http.post("/api/cart/items", async ({ request }) => {
        const early = await applyScenario("cart.write")
        if (early) return early
        const key = resolveCartKey(request)
        if (key instanceof Response) return key

        const input = (await request.json()) as Partial<CartItemInput>
        if (!isValidQuantity(input.quantity)) {
            return errorResponse(400, "VALIDATION_ERROR", "Quantidade inválida.", {
                quantity: "Informe um número inteiro maior que zero.",
            })
        }
        const found = findEdition(input.nftId, input.editionId)
        if (!found) return errorResponse(404, "NOT_FOUND", "NFT ou edição não encontrados.")

        const state = getState()
        const cart = (state.carts[key] ??= emptyCart())
        const existing = cart.items.find(
            (i) => i.nftId === found.nft.id && i.editionId === found.edition.id,
        )
        const nextQuantity = (existing?.quantity ?? 0) + input.quantity
        if (nextQuantity > found.edition.available) {
            return errorResponse(409, "AVAILABILITY_CONFLICT", limitMessage(found.edition.available))
        }

        if (existing) {
            existing.quantity = nextQuantity
        } else {
            cart.items.push({
                id: newId("item"),
                nftId: found.nft.id,
                editionId: found.edition.id,
                quantity: input.quantity,
            })
        }
        touch(cart)
        commit()
        return HttpResponse.json(cart, { status: 201 })
    }),

    http.patch("/api/cart/items/:itemId", async ({ request, params }) => {
        const early = await applyScenario("cart.write")
        if (early) return early
        const key = resolveCartKey(request)
        if (key instanceof Response) return key

        const { quantity } = (await request.json()) as { quantity?: unknown }
        if (!isValidQuantity(quantity)) {
            return errorResponse(400, "VALIDATION_ERROR", "Quantidade inválida.", {
                quantity: "Informe um número inteiro maior que zero.",
            })
        }

        const cart = getState().carts[key]
        const item = cart?.items.find((i) => i.id === params.itemId)
        if (!cart || !item) return errorResponse(404, "NOT_FOUND", "Item não encontrado no carrinho.")

        const found = findEdition(item.nftId, item.editionId)
        if (!found) return errorResponse(404, "NOT_FOUND", "NFT ou edição não encontrados.")
        if (quantity > found.edition.available) {
            return errorResponse(409, "AVAILABILITY_CONFLICT", limitMessage(found.edition.available))
        }

        item.quantity = quantity
        touch(cart)
        commit()
        return HttpResponse.json(cart)
    }),

    http.delete("/api/cart/items/:itemId", async ({ request, params }) => {
        const early = await applyScenario("cart.write")
        if (early) return early
        const key = resolveCartKey(request)
        if (key instanceof Response) return key

        const state = getState()
        const cart = (state.carts[key] ??= emptyCart())
        cart.items = cart.items.filter((i) => i.id !== params.itemId)
        touch(cart)
        commit()
        return HttpResponse.json(cart)
    }),

    // No login: junta o carrinho do visitante (x-cart-id) ao carrinho da conta.
    http.post("/api/cart/merge", async ({ request }) => {
        const early = await applyScenario("cart.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const state = getState()
        const mineKey = `user:${auth.user.id}`
        const mine = (state.carts[mineKey] ??= emptyCart())

        const guestId = request.headers.get("x-cart-id")?.trim()
        const guest = guestId ? state.carts[`guest:${guestId}`] : undefined
        if (guest) {
            for (const item of guest.items) {
                const found = findEdition(item.nftId, item.editionId)
                if (!found) continue
                const existing = mine.items.find(
                    (i) => i.nftId === item.nftId && i.editionId === item.editionId,
                )
                const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, found.edition.available)
                if (quantity < 1) continue
                if (existing) {
                    existing.quantity = quantity
                } else {
                    mine.items.push({ id: newId("item"), nftId: item.nftId, editionId: item.editionId, quantity })
                }
            }
            delete state.carts[`guest:${guestId}`]
            touch(mine)
            commit()
        }
        return HttpResponse.json(mine)
    }),
]