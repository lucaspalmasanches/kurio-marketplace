import Decimal from "decimal.js"
import type { ApiErrorCode, CartItemInput, Quote, QuoteLine } from "@/api/contracts"
import { getState } from "../db"
import { hash32 } from "./hash"

export const NETWORK_FEE = "0.016"
const QUOTE_TTL_MS = 5 * 60 * 1000

interface Coupon {
    kind: "percent" | "fixed"
    value: string
    expiresAt?: string
}

const COUPONS: Record<string, Coupon> = {
    KURIO10: { kind: "percent", value: "10" },
    WELCOME: { kind: "fixed", value: "0.25" },
    EXPIRED10: { kind: "percent", value: "10", expiresAt: "2026-01-01T00:00:00.000Z" },
}

export type QuoteResult =
    | { ok: true; quote: Quote }
    | { ok: false; status: number; code: ApiErrorCode; message: string }

function fail(status: number, code: ApiErrorCode, message: string): QuoteResult {
    return { ok: false, status, code, message }
}

export function computeQuote(items: CartItemInput[] | undefined, couponCode?: string): QuoteResult {
    if (!Array.isArray(items) || items.length === 0) {
        return fail(400, "VALIDATION_ERROR", "Informe ao menos um item.")
    }

    const { nfts } = getState()
    const lines: QuoteLine[] = []
    for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            return fail(400, "VALIDATION_ERROR", "Quantidade inválida.")
        }
        const nft = nfts.find((n) => n.id === item.nftId)
        const edition = nft?.editions.find((e) => e.id === item.editionId)
        if (!nft || !edition) return fail(404, "NOT_FOUND", "NFT ou edição não encontrados.")

        const unit = new Decimal(nft.priceEth)
        lines.push({
            nftId: item.nftId,
            editionId: item.editionId,
            quantity: item.quantity,
            unitPriceEth: unit.toFixed(2),
            lineTotalEth: unit.times(item.quantity).toFixed(2),
            available: edition.available,
            ok: item.quantity <= edition.available,
        })
    }

    const subtotal = lines.reduce((sum, line) => sum.plus(line.lineTotalEth), new Decimal(0))

    let discount = new Decimal(0)
    const code = couponCode?.trim().toUpperCase() || undefined
    if (code) {
        const coupon = COUPONS[code]
        if (!coupon) return fail(422, "COUPON_INVALID", "Cupom inválido.")
        if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
            return fail(422, "COUPON_EXPIRED", "Este cupom expirou.")
        }
        discount =
            coupon.kind === "percent"
                ? subtotal.times(coupon.value).div(100)
                : Decimal.min(coupon.value, subtotal)
    }

    const total = subtotal.minus(discount).plus(NETWORK_FEE)

    // O id depende só do que importa para o usuário (preços, disponibilidade, cupom e total).
    const fingerprint = JSON.stringify([
        lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPriceEth, l.ok]),
        code ?? null,
        total.toFixed(3),
    ])

    return {
        ok: true,
        quote: {
            id: `q_${hash32(fingerprint).toString(36)}`,
            lines,
            subtotalEth: subtotal.toFixed(2),
            discountEth: discount.toFixed(3),
            networkFeeEth: NETWORK_FEE,
            totalEth: total.toFixed(3),
            couponCode: code,
            expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
        },
    }
}