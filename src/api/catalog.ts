import type { Network, WalletProvider } from "./contracts"

export const CATEGORIES = [
    { slug: "arte-digital", label: "Arte digital" },
    { slug: "fotografia", label: "Fotografia" },
    { slug: "musica", label: "Música" },
    { slug: "arte-3d", label: "Arte 3D" },
    { slug: "colecionaveis", label: "Colecionáveis" },
    { slug: "generativa", label: "Generativa" },
    { slug: "jogos", label: "Jogos" },
    { slug: "assinaturas", label: "Assinaturas" },
    { slug: "utilidade", label: "Utilidade" },
] as const

export const NETWORKS: { slug: Network; label: string }[] = [
    { slug: "ethereum", label: "Ethereum" },
    { slug: "polygon", label: "Polygon" },
    { slug: "solana", label: "Solana" },
]

export const HERO_IMAGE = "/images/nfts/monkey-green-jacket.png"

export const PROVIDERS: { slug: WalletProvider; label: string }[] = [
    { slug: "walletconnect", label: "WalletConnect" },
    { slug: "metamask", label: "MetaMask" },
    { slug: "coinbase", label: "Coinbase Wallet" },
]

export const PROVIDER_LABEL = Object.fromEntries(PROVIDERS.map((p) => [p.slug, p.label])) as Record<WalletProvider, string>
export const NETWORK_LABEL = Object.fromEntries(NETWORKS.map((n) => [n.slug, n.label])) as Record<Network, string>