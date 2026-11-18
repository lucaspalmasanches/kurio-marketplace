import Decimal from "decimal.js"
import type { Network, Nft, NftListQuery, NftListResponse, NftSort, NftTab } from "@/api/contracts"

const SORTS: NftSort[] = ["recent", "price-asc", "price-desc", "popular"]
const TABS: NftTab[] = ["all", "new", "trending"]

export function parseListQuery(sp: URLSearchParams): NftListQuery {
    const list = (key: string) =>
        sp.get(key)?.split(",").map((s) => s.trim()).filter(Boolean) ?? []
    const page = Number.parseInt(sp.get("page") ?? "1", 10)
    const pageSize = Number.parseInt(sp.get("pageSize") ?? "9", 10)
    const sort = sp.get("sort") as NftSort | null
    const tab = sp.get("tab") as NftTab | null

    return {
        q: sp.get("q")?.trim() || undefined,
        category: list("category"),
        network: list("network") as Network[],
        minPrice: sp.get("minPrice") || undefined,
        maxPrice: sp.get("maxPrice") || undefined,
        sort: sort && SORTS.includes(sort) ? sort : undefined,
        tab: tab && TABS.includes(tab) ? tab : "all",
        page: Number.isFinite(page) && page > 0 ? page : 1,
        pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 48) : 9,
    }
}

function toDecimal(value?: string): Decimal | null {
    if (!value) return null
    try {
        return new Decimal(value)
    } catch {
        return null
    }
}

const byRecent = (a: Nft, b: Nft) => b.createdAt.localeCompare(a.createdAt)
const byPopular = (a: Nft, b: Nft) => b.popularity - a.popularity

const sorters: Record<NftSort, (a: Nft, b: Nft) => number> = {
    recent: byRecent,
    popular: byPopular,
    "price-asc": (a, b) => new Decimal(a.priceEth).comparedTo(b.priceEth),
    "price-desc": (a, b) => new Decimal(b.priceEth).comparedTo(a.priceEth),
}

export function queryNfts(all: Nft[], query: NftListQuery): NftListResponse {
    let base = all
    if (query.tab === "new") base = [...all].sort(byRecent).slice(0, 18)
    if (query.tab === "trending") base = [...all].sort(byPopular).slice(0, 18)

    const q = query.q?.toLowerCase()
    const min = toDecimal(query.minPrice)
    const max = toDecimal(query.maxPrice)

    const filtered = base.filter(
        (n) =>
            (!q || [n.name, n.collection, n.tokenId, ...n.attributes].some((v) => v.toLowerCase().includes(q))) &&
            (!query.category?.length || query.category.includes(n.category)) &&
            (!query.network?.length || query.network.includes(n.network)) &&
            (!min || new Decimal(n.priceEth).gte(min)) &&
            (!max || new Decimal(n.priceEth).lte(max)),
    )

    const sort = query.sort ?? (query.tab === "trending" ? "popular" : "recent")
    const sorted = [...filtered].sort((a, b) => sorters[sort](a, b) || a.id.localeCompare(b.id))

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 9
    const total = sorted.length

    const countBy = (key: "category" | "network") =>
        all.reduce<Record<string, number>>((acc, n) => {
            acc[n[key]] = (acc[n[key]] ?? 0) + 1
            return acc
        }, {})

    const prices = all.map((n) => new Decimal(n.priceEth))

    return {
        items: sorted.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        facets: {
            categories: countBy("category"),
            networks: countBy("network"),
            priceRange: {
                min: prices.length ? Decimal.min(...prices).toFixed(2) : "0.00",
                max: prices.length ? Decimal.max(...prices).toFixed(2) : "0.00",
            },
        },
    }
}