// Valores em ETH sempre como string decimal (ex.: "1.19"). Quantidades são inteiras.

export type Network = "ethereum" | "polygon" | "solana"
export type WalletProvider = "metamask" | "walletconnect" | "coinbase"
export type NftSort = "recent" | "price-asc" | "price-desc" | "popular"
export type NftTab = "all" | "new" | "trending"

export type ApiErrorCode =
    | "VALIDATION_ERROR"
    | "UNAUTHENTICATED"
    | "SESSION_EXPIRED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "AVAILABILITY_CONFLICT"
    | "PRICE_CHANGED"
    | "COUPON_INVALID"
    | "COUPON_EXPIRED"
    | "IDEMPOTENCY_CONFLICT"
    | "PAYMENT_DECLINED"
    | "TRANSIENT_ERROR"

export interface ApiErrorBody {
    code: ApiErrorCode
    message: string
    fieldErrors?: Record<string, string>
}

// ---------- NFTs ----------
export interface Edition {
    id: string // "1-1" | "1-10" | "1-50" | "open"
    label: string // "1/1" | "1/10" | "1/50" | "ABERTA"
    available: number
}

export interface Nft {
    id: string
    tokenId: string
    name: string
    collection: string
    category: string
    network: Network
    priceEth: string
    previousPriceEth?: string
    imageUrl: string
    images: string[]
    rare: boolean
    rating: number
    reviewCount: number
    description: string
    attributes: string[]
    editions: Edition[]
    createdAt: string
    popularity: number
    version: number // sobe a cada alteração; usado pelos eventos em tempo real
}

export interface NftListQuery {
    q?: string
    category?: string[]
    network?: Network[]
    minPrice?: string
    maxPrice?: string
    sort?: NftSort
    tab?: NftTab
    page?: number
    pageSize?: number
}

export interface NftListResponse {
    items: Nft[]
    page: number
    pageSize: number
    total: number
    totalPages: number
    facets: {
        categories: Record<string, number>
        networks: Record<string, number>
        priceRange: { min: string; max: string }
    }
}

// ---------- Conta e sessão ----------
export interface User {
    id: string
    email: string
    username: string
    displayName: string
    ensName: string
    walletAlias: string
    avatarUrl: string | null
}

export interface Session {
    user: User
    expiresAt: string
}

export interface LoginInput {
    email: string
    password: string
}

export interface RegisterInput {
    username: string
    email: string
    password: string
}

export interface AuthResponse {
    token: string
    session: Session
}

export interface UpdateProfileInput {
    displayName: string
    username: string
    email: string
    ensName: string
    walletAlias: string
}

export interface ChangePasswordInput {
    currentPassword: string
    newPassword: string
}

// ---------- Favoritos ----------
export interface FavoritesResponse {
    nftIds: string[]
}

// ---------- Carrinho e cotação ----------
export interface CartItemInput {
    nftId: string
    editionId: string
    quantity: number
}

export interface CartItem extends CartItemInput {
    id: string
}

export interface Cart {
    items: CartItem[]
    version: number
    updatedAt: string
}

export interface QuoteInput {
    items: CartItemInput[]
    couponCode?: string
}

export interface QuoteLine extends CartItemInput {
    unitPriceEth: string
    lineTotalEth: string
    available: number
    ok: boolean
}

export interface Quote {
    id: string
    lines: QuoteLine[]
    subtotalEth: string
    discountEth: string
    networkFeeEth: string
    totalEth: string
    couponCode?: string
    expiresAt: string
}

// ---------- Carteiras ----------
export interface Wallet {
    id: string
    kind: "primary" | "secondary"
    displayName: string
    alias: string
    network: Network
    address: string
    secondaryAddress?: string
    provider: WalletProvider
    referralCode: string
    email: string
    ensName: string
}

export type WalletInput = Omit<Wallet, "id" | "kind">

// ---------- Pedidos ----------
export type OrderStatus = "pending" | "confirmed" | "declined"

export interface OrderItemSnapshot {
    nftId: string
    name: string
    tokenId: string
    imageUrl: string
    editionLabel: string
    quantity: number
    unitPriceEth: string
    lineTotalEth: string
}

export interface CollectorInput {
    displayName: string
    username: string
    profileName: string
    email: string
    ensName: string
    referralCode: string
    note?: string
}

export interface CreateOrderInput {
    quoteId: string
    items: CartItemInput[]
    couponCode?: string
    walletId: string
    provider: WalletProvider
    network: Network
    collector: CollectorInput
}

export interface Order {
    id: string
    status: OrderStatus
    items: OrderItemSnapshot[]
    subtotalEth: string
    discountEth: string
    networkFeeEth: string
    totalEth: string
    couponCode?: string
    walletAddress: string
    provider: WalletProvider
    txHash?: string
    declineReason?: string
    createdAt: string
    updatedAt: string
    version: number
}

// ---------- Eventos em tempo real (Socket.IO) ----------
export interface RealtimeEventBase {
    id: string // identidade estável (para deduplicar)
    resource: { type: "nft" | "order"; id: string }
    version: number // para descartar eventos antigos
    occurredAt: string
}

export interface NftUpdatedEvent extends RealtimeEventBase {
    type: "nft.updated"
    data: { priceEth: string; availability: Record<string, number> }
}

export interface OrderUpdatedEvent extends RealtimeEventBase {
    type: "order.updated"
    userId: string
    data: { status: OrderStatus; txHash?: string; declineReason?: string }
}