import type { Network } from "./contracts"

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