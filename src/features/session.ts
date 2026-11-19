import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import type { AuthResponse } from "@/api/contracts"
import { getSession, logout, mergeCart } from "@/api/endpoints"
import { disconnectRealtime } from "@/lib/realtime"
import { couponStore, pendingCheckoutStore, rotateGuestCartId, tokenStore } from "@/lib/stores"

const PRIVATE_ROOTS = new Set(["session", "cart", "favorites", "wallets", "profile", "order", "quote"])

export function clearPrivateData(queryClient: QueryClient): void {
    queryClient.removeQueries({ predicate: (query) => PRIVATE_ROOTS.has(String(query.queryKey[0])) })
}

export function useSession() {
    const token = tokenStore.useValue()
    const query = useQuery({
        queryKey: ["session", token],
        queryFn: ({ signal }) => getSession(signal),
        enabled: Boolean(token),
        staleTime: 5 * 60_000,
        retry: false,
    })
    return {
        token,
        user: token ? (query.data?.user ?? null) : null,
        isLoading: Boolean(token) && query.isPending,
    }
}

/** Isola dados privados por usuário. null enquanto a sessão carrega. */
export function useOwnerKey(): string | null {
    const { token, user } = useSession()
    if (!token) return "guest"
    return user?.id ?? null
}

export async function startSession(queryClient: QueryClient, auth: AuthResponse): Promise<void> {
    clearPrivateData(queryClient)
    tokenStore.set(auth.token)
    queryClient.setQueryData(["session", auth.token], auth.session)
    try {
        await mergeCart() // junta o carrinho do visitante ao da conta
        rotateGuestCartId()
    } catch {
        // o carrinho do visitante continua salvo e pode ser mesclado depois
    }
    await queryClient.invalidateQueries({ queryKey: ["cart"] })
}

export function endSession(queryClient: QueryClient, options: { keepCheckout?: boolean } = {}): void {
    disconnectRealtime()
    tokenStore.set(null)
    if (!options.keepCheckout) {
        pendingCheckoutStore.set(null)
        couponStore.set(null)
    }
    rotateGuestCartId()
    clearPrivateData(queryClient)
}

export function useLogout() {
    const queryClient = useQueryClient()
    return async () => {
        try {
            await logout()
        } catch {
            // a sessão pode já estar inválida
        }
        endSession(queryClient)
    }
}