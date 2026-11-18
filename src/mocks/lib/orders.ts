import type { Order, OrderUpdatedEvent } from "@/api/contracts"
import { commit, getState, type StoredOrder } from "../db"
import { newId } from "./crypto"
import { publishEvent } from "./events"
import { hash32 } from "./hash"

export function toPublicOrder(order: StoredOrder): Order {
    return {
        id: order.id,
        status: order.status,
        items: order.items,
        subtotalEth: order.subtotalEth,
        discountEth: order.discountEth,
        networkFeeEth: order.networkFeeEth,
        totalEth: order.totalEth,
        couponCode: order.couponCode,
        walletAddress: order.walletAddress,
        provider: order.provider,
        txHash: order.txHash,
        declineReason: order.declineReason,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        version: order.version,
    }
}

function fakeTxHash(seed: string): string {
    let out = "0x"
    for (let i = 0; i < 8; i++) out += hash32(`${seed}:${i}`).toString(16).padStart(8, "0")
    return out
}

function removePurchasedFromCart(order: StoredOrder): void {
    const cart = getState().carts[`user:${order.userId}`]
    if (!cart) return
    for (const bought of order.purchased) {
        const item = cart.items.find((i) => i.nftId === bought.nftId && i.editionId === bought.editionId)
        if (item) item.quantity -= bought.quantity
    }
    cart.items = cart.items.filter((i) => i.quantity > 0)
    cart.version += 1
    cart.updatedAt = new Date().toISOString()
}

/** Pedidos confirmados ou recusados são terminais: nada acontece se já foi liquidado. */
export function settleOrder(orderId: string): void {
    const order = getState().orders.find((o) => o.id === orderId)
    if (!order || order.status !== "pending") return

    if (order.plannedOutcome === "confirmed") {
        order.status = "confirmed"
        order.txHash = fakeTxHash(order.id)
        removePurchasedFromCart(order)
    } else {
        order.status = "declined"
        order.declineReason = "Pagamento recusado pela carteira."
    }
    order.version += 1
    order.updatedAt = new Date().toISOString()
    commit()

    const event: OrderUpdatedEvent = {
        type: "order.updated",
        id: newId("evt"),
        resource: { type: "order", id: order.id },
        version: order.version,
        occurredAt: order.updatedAt,
        userId: order.userId,
        data: { status: order.status, txHash: order.txHash, declineReason: order.declineReason },
    }
    publishEvent(event)
}

/** Liquidação "preguiçosa": cobre o caso em que a página foi recarregada e o timer se perdeu. */
export function settleIfDue(order: StoredOrder): void {
    if (order.status === "pending" && Date.now() >= new Date(order.settleAt).getTime()) {
        settleOrder(order.id)
    }
}

export function scheduleSettle(order: StoredOrder): void {
    const wait = Math.max(0, new Date(order.settleAt).getTime() - Date.now())
    setTimeout(() => settleOrder(order.id), wait)
}

export function schedulePendingOrders(): void {
    for (const order of getState().orders) {
        if (order.status === "pending") scheduleSettle(order)
    }
}