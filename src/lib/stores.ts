import { createPersistedStore } from "./persisted"

export interface PendingCheckout {
    userId: string
    key: string
    orderId?: string
}

export const tokenStore = createPersistedStore<string | null>("kurio:token", null)
export const guestCartStore = createPersistedStore<string | null>("kurio:guest-cart", null)
export const couponStore = createPersistedStore<string | null>("kurio:coupon", null)
export const pendingCheckoutStore = createPersistedStore<PendingCheckout | null>("kurio:pending-checkout", null)

export function getGuestCartId(): string {
    let id = guestCartStore.get()
    if (!id) {
        id = crypto.randomUUID()
        guestCartStore.set(id)
    }
    return id
}

export function rotateGuestCartId(): void {
    guestCartStore.set(crypto.randomUUID())
}