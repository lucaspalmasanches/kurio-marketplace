import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage } from "@/api/client"
import type { Cart, CartItemInput } from "@/api/contracts"
import { addCartItem, createQuote, getCart, removeCartItem, updateCartItem } from "@/api/endpoints"
import { useOwnerKey } from "./session"

export function useCart() {
    const owner = useOwnerKey()
    return useQuery({
        queryKey: ["cart", owner],
        queryFn: ({ signal }) => getCart(signal),
        enabled: owner !== null,
    })
}

export function toQuoteItems(cart: Cart | undefined): CartItemInput[] {
    return (cart?.items ?? []).map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity }))
}

export function quoteKey(owner: string | null, items: CartItemInput[], coupon: string | null) {
    return ["quote", owner, items, coupon] as const
}

export function useQuote(items: CartItemInput[], coupon: string | null) {
    const owner = useOwnerKey()
    return useQuery({
        queryKey: quoteKey(owner, items, coupon),
        queryFn: ({ signal }) => createQuote({ items, couponCode: coupon ?? undefined }, signal),
        enabled: owner !== null && items.length > 0,
        placeholderData: keepPreviousData,
    })
}

export function useCartMutations() {
    const owner = useOwnerKey()
    const queryClient = useQueryClient()
    const onSuccess = (cart: Cart) => {
        queryClient.setQueryData(["cart", owner], cart)
    }
    const onError = (error: unknown) => {
        toast.error(errorMessage(error, "Não foi possível atualizar o carrinho."))
    }
    const add = useMutation({ mutationFn: addCartItem, onSuccess, onError })
    const update = useMutation({
        mutationFn: (vars: { itemId: string; quantity: number }) => updateCartItem(vars.itemId, vars.quantity),
        onSuccess,
        onError,
    })
    const remove = useMutation({ mutationFn: removeCartItem, onSuccess, onError })
    return { add, update, remove }
}