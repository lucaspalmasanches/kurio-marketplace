import { api } from "./client"
import type {
    AuthResponse,
    Cart,
    CartItemInput,
    ChangePasswordInput,
    CreateOrderInput,
    CreateWalletInput,
    FavoritesResponse,
    LoginInput,
    Order,
    Quote,
    QuoteInput,
    RegisterInput,
    Session,
    UpdateAvatarInput,
    UpdateProfileInput,
    User,
    Wallet,
    WalletInput,
} from "./contracts"

// Sessão e conta
export async function login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", input)
    return data
}
export async function register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", input)
    return data
}
export async function getSession(signal?: AbortSignal): Promise<Session> {
    const { data } = await api.get<Session>("/auth/session", { signal })
    return data
}
export async function logout(): Promise<void> {
    await api.post("/auth/logout")
}

// Favoritos
export async function getFavorites(signal?: AbortSignal): Promise<FavoritesResponse> {
    const { data } = await api.get<FavoritesResponse>("/favorites", { signal })
    return data
}
export async function addFavorite(nftId: string): Promise<FavoritesResponse> {
    const { data } = await api.put<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`)
    return data
}
export async function removeFavorite(nftId: string): Promise<FavoritesResponse> {
    const { data } = await api.delete<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`)
    return data
}

// Carrinho
export async function getCart(signal?: AbortSignal): Promise<Cart> {
    const { data } = await api.get<Cart>("/cart", { signal })
    return data
}
export async function addCartItem(input: CartItemInput): Promise<Cart> {
    const { data } = await api.post<Cart>("/cart/items", input)
    return data
}
export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
    const { data } = await api.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, { quantity })
    return data
}
export async function removeCartItem(itemId: string): Promise<Cart> {
    const { data } = await api.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`)
    return data
}
export async function mergeCart(): Promise<Cart> {
    const { data } = await api.post<Cart>("/cart/merge")
    return data
}

// Cotação
export async function createQuote(input: QuoteInput, signal?: AbortSignal): Promise<Quote> {
    const { data } = await api.post<Quote>("/quote", input, { signal })
    return data
}

// Pedidos
export async function createOrder(input: CreateOrderInput, idempotencyKey: string): Promise<Order> {
    const { data } = await api.post<Order>("/orders", input, { headers: { "Idempotency-Key": idempotencyKey } })
    return data
}
export async function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
    const { data } = await api.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal })
    return data
}

// Perfil
export async function getProfile(signal?: AbortSignal): Promise<User> {
    const { data } = await api.get<User>("/profile", { signal })
    return data
}
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
    const { data } = await api.patch<User>("/profile", input)
    return data
}
export async function updateAvatar(input: UpdateAvatarInput): Promise<User> {
    const { data } = await api.put<User>("/profile/avatar", input)
    return data
}
export async function changePassword(input: ChangePasswordInput): Promise<void> {
    await api.post("/profile/password", input)
}

// Carteiras
export async function getWallets(signal?: AbortSignal): Promise<Wallet[]> {
    const { data } = await api.get<Wallet[]>("/wallets", { signal })
    return data
}
export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
    const { data } = await api.post<Wallet>("/wallets", input)
    return data
}
export async function updateWallet(id: string, input: WalletInput): Promise<Wallet> {
    const { data } = await api.put<Wallet>(`/wallets/${encodeURIComponent(id)}`, input)
    return data
}
export async function connectWallet(id: string): Promise<{ walletId: string; address: string; connected: boolean }> {
    const { data } = await api.post<{ walletId: string; address: string; connected: boolean }>(
        `/wallets/${encodeURIComponent(id)}/connect`,
    )
    return data
}