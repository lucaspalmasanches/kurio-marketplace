import Decimal from "decimal.js"
import { CATEGORIES, NETWORKS } from "@/api/catalog"
import type { Edition, Nft } from "@/api/contracts"

const ext = "png" // troque para "webp" se exportar nesse formato

const BASE = [
    { slug: "emerald-ape", name: "Emerald Ape", num: 42, price: "1.19", rare: true, attrs: ["Óculos", "Esmeralda", "Raro"] },
    { slug: "sage-nomad", name: "Sage Nomad", num: 9, price: "1.69", rare: false, attrs: ["Casaco", "Verde", "Comum"] },
    { slug: "neon-vessel", name: "Neon Vessel", num: 552, price: "1.99", old: "2.29", rare: true, attrs: ["Óculos", "Neon", "Raro"] },
    { slug: "cosmic-bloom", name: "Cosmic Bloom", num: 118, price: "1.29", rare: false, attrs: ["Chapéu", "Roxo", "Comum"] },
    { slug: "violet-nomad", name: "Violet Nomad", num: 314, price: "1.39", rare: false, attrs: ["Chapéu", "Violeta", "Comum"] },
    { slug: "ivory-baron", name: "Ivory Baron", num: 88, price: "1.79", rare: false, attrs: ["Terno", "Marfim", "Comum"] },
    { slug: "golden-beat", name: "Golden Beat", num: 207, price: "0.99", rare: false, attrs: ["Fone", "Dourado", "Comum"] },
    { slug: "golden-frequency", name: "Golden Frequency", num: 71, price: "0.59", rare: false, attrs: ["Fone", "Dourado", "Comum"] },
    { slug: "golden-signal", name: "Golden Signal", num: 160, price: "0.39", rare: false, attrs: ["Fone", "Dourado", "Comum"] },
] as const

const pad = (n: number, size: number) => String(n).padStart(size, "0")

function editionsFor(i: number): Edition[] {
    return [
        { id: "1-1", label: "1/1", available: i % 5 === 3 ? 0 : 1 },
        { id: "1-10", label: "1/10", available: i % 7 === 5 ? 0 : 10 },
        { id: "1-50", label: "1/50", available: 50 },
        { id: "open", label: "ABERTA", available: 200 },
    ]
}

export const nftFixtures: Nft[] = Array.from({ length: 36 }, (_, i) => {
    const base = BASE[i % BASE.length]
    const round = Math.floor(i / BASE.length)
    const num = base.num + round * 100
    const image = `/images/nfts/${base.slug}.${ext}`
    const price = new Decimal(base.price).plus(new Decimal("0.10").times(round)).toFixed(2)
    const old = "old" in base && round === 0 ? base.old : undefined

    return {
        id: `${base.slug}-${pad(num, 3)}`,
        tokenId: pad(num, 4),
        name: `${base.name} #${pad(num, 3)}`,
        collection: "Kurio Apes",
        category: CATEGORIES[i % CATEGORIES.length].slug,
        network: NETWORKS[(i + round) % NETWORKS.length].slug,
        priceEth: price,
        previousPriceEth: old,
        imageUrl: image,
        images: [image, image, image, image],
        rare: base.rare,
        rating: i === 0 ? 4.8 : Number((4 + ((i * 3) % 10) / 10).toFixed(1)),
        reviewCount: 19 + ((i * 7) % 60),
        description:
            "Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na Ethereum.",
        attributes: [...base.attrs],
        editions: editionsFor(i),
        createdAt: new Date(Date.UTC(2026, 6, 28) - i * 86_400_000).toISOString(),
        popularity: (i * 37) % 100,
        version: 1,
    }
})