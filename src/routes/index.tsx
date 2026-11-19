import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { CATEGORIES, HERO_IMAGE, NETWORKS } from "@/api/catalog"
import { errorMessage } from "@/api/client"
import type { Network, NftListQuery, NftListResponse, NftSort, NftTab } from "@/api/contracts"
import { listNfts } from "@/api/nfts"
import { NftCard, NftCardSkeleton } from "@/components/nft-card"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { recordResourceVersion } from "@/lib/realtime"
import { cn } from "@/lib/utils"
import { nftSrcSet } from "@/lib/images"

const PAGE_SIZE = 9
const SORTS: { value: NftSort; label: string }[] = [
    { value: "recent", label: "Listados recentemente" },
    { value: "price-asc", label: "Menor preço" },
    { value: "price-desc", label: "Maior preço" },
    { value: "popular", label: "Mais populares" },
]
const TABS: { value: NftTab; label: string }[] = [
    { value: "all", label: "Todos os NFTs" },
    { value: "new", label: "Novos lançamentos" },
    { value: "trending", label: "Em alta" },
]
const NETWORK_SLUGS: string[] = NETWORKS.map((n) => n.slug)

export interface HomeSearch {
    q?: string
    category?: string[]
    network?: Network[]
    minPrice?: string
    maxPrice?: string
    sort?: NftSort
    tab?: NftTab
    page?: number
}

function text(value: unknown): string | undefined {
    if (typeof value === "number") return String(value)
    return typeof value === "string" && value.trim() ? value.trim() : undefined
}
function list(value: unknown): string[] | undefined {
    const raw = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",") : []
    const clean = raw.map((v) => v.trim()).filter(Boolean)
    return clean.length ? clean : undefined
}

export const Route = createFileRoute("/")({
    validateSearch: (s: Record<string, unknown>): HomeSearch => {
        const sort = text(s.sort)
        const tab = text(s.tab)
        const page = Number(s.page)
        const network = list(s.network)?.filter((n): n is Network => NETWORK_SLUGS.includes(n))
        return {
            q: text(s.q),
            category: list(s.category),
            network: network?.length ? network : undefined,
            minPrice: text(s.minPrice),
            maxPrice: text(s.maxPrice),
            sort: SORTS.some((o) => o.value === sort) && sort !== "recent" ? (sort as NftSort) : undefined,
            tab: TABS.some((t) => t.value === tab) && tab !== "all" ? (tab as NftTab) : undefined,
            page: Number.isInteger(page) && page > 1 ? page : undefined,
        }
    },
    component: Home,
})

function Home() {
    const search = Route.useSearch()
    const navigate = useNavigate({ from: "/" })
    const query: NftListQuery = { ...search, page: search.page ?? 1, pageSize: PAGE_SIZE }

    const nfts = useQuery({
        queryKey: ["nfts", "list", query],
        queryFn: async ({ signal }) => {
            const data = await listNfts(query, signal)
            for (const nft of data.items) recordResourceVersion("nft", nft.id, nft.version)
            return data
        },
        placeholderData: keepPreviousData,
    })

    // Toda mudança de filtro reinicia a paginação.
    const update = (patch: Partial<HomeSearch>, keepPage = false) =>
        navigate({
            search: (prev) => ({ ...prev, ...patch, ...(keepPage ? {} : { page: undefined }) }),
            resetScroll: false,
        })

    const toggle = (key: "category" | "network", value: string) => {
        const current: string[] = search[key] ?? []
        const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
        update({ [key]: next.length ? next : undefined } as Partial<HomeSearch>)
    }

    const hasFilters = Boolean(search.q || search.category || search.network || search.minPrice || search.maxPrice)
    const data = nfts.data

    return (
        <>
            <Hero />
            <section
                id="catalogo"
                aria-labelledby="catalogo-titulo"
                className="mx-auto grid max-w-[1200px] scroll-mt-4 gap-8 px-4 py-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-0"
            >
                <h2 id="catalogo-titulo" className="sr-only">Catálogo de NFTs</h2>
                <Filters
                    search={search}
                    facets={data?.facets}
                    onToggle={toggle}
                    onPrice={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
                />
                <div className="flex min-w-0 flex-col gap-6">
                    <SearchBox key={search.q ?? ""} initial={search.q ?? ""} onCommit={(q) => update({ q })} />
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div role="group" aria-label="Seções do catálogo" className="flex flex-wrap gap-4">
                            {TABS.map((tab) => {
                                const active = (search.tab ?? "all") === tab.value
                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => update({ tab: tab.value === "all" ? undefined : tab.value })}
                                        className={cn(
                                            "border-b-2 pb-1 text-sm",
                                            active ? "border-primary font-bold text-primary" : "border-transparent text-text-secondary hover:text-foreground",
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-text-secondary">
                            Ordenar por:
                            <select
                                value={search.sort ?? "recent"}
                                onChange={(e) => update({ sort: e.target.value === "recent" ? undefined : (e.target.value as NftSort) })}
                                className="h-9 rounded-[5px] border border-border bg-surface-card px-2 text-foreground"
                            >
                                {SORTS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {nfts.isPending ? (
                        <ul aria-busy="true" aria-label="Carregando NFTs" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: PAGE_SIZE }, (_, i) => (
                                <li key={i}><NftCardSkeleton /></li>
                            ))}
                        </ul>
                    ) : !data ? (
                        <ErrorState message={errorMessage(nfts.error, "Não foi possível carregar o catálogo.")} onRetry={() => void nfts.refetch()} />
                    ) : data.items.length === 0 ? (
                        <EmptyState
                            title="Nenhum NFT encontrado"
                            description={hasFilters ? "Tente remover alguns filtros ou mudar a busca." : "O catálogo está vazio no momento."}
                            action={hasFilters ? <Button variant="outline" onClick={() => navigate({ search: {} })}>Limpar filtros</Button> : undefined}
                        />
                    ) : (
                        <Results data={data} updating={nfts.isPlaceholderData} failed={nfts.isError} onPage={(page) => update({ page: page > 1 ? page : undefined }, true)} />
                    )}
                </div>
            </section>
        </>
    )
}

function Results({ data, updating, failed, onPage }: { data: NftListResponse; updating: boolean; failed: boolean; onPage: (page: number) => void }) {
    return (
        <>
            <p aria-live="polite" className="sr-only">
                {updating ? "Atualizando resultados" : `${data.total} NFTs encontrados`}
            </p>
            {failed && <p role="alert" className="text-sm text-destructive">Não foi possível atualizar. Mostrando os últimos resultados.</p>}
            <ul className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3", updating && "opacity-60")}>
                {data.items.map((nft, i) => (
                    <li key={nft.id}><NftCard nft={nft} priority={i < 3} /></li>
                ))}
            </ul>
            {data.totalPages > 1 && (
                <nav aria-label="Paginação" className="flex justify-center">
                    <ul className="flex gap-2">
                        {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((n) => (
                            <li key={n}>
                                <button
                                    type="button"
                                    onClick={() => onPage(n)}
                                    aria-label={`Página ${n}`}
                                    aria-current={n === data.page ? "page" : undefined}
                                    className={cn(
                                        "grid size-9 place-items-center rounded-[5px] border text-sm",
                                        n === data.page ? "border-primary bg-primary font-bold text-primary-foreground" : "border-border hover:border-primary",
                                    )}
                                >
                                    {n}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </>
    )
}

function Hero() {
    return (
        <section aria-labelledby="hero-titulo" className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 pt-10 md:grid-cols-[1fr_minmax(0,420px)] lg:px-0">
            <div className="flex flex-col gap-5">
                <p className="text-sm">Bem-vindo à Kurio</p>
                <h1 id="hero-titulo" className="text-[30px] font-bold leading-tight md:text-hero">SEJA DONO DO FUTURO DA ARTE DIGITAL</h1>
                <p className="max-w-md text-body text-text-secondary">
                    Descubra NFTs selecionados de criadores emergentes e colecione arte digital verificada.
                </p>
                <Button asChild className="w-fit uppercase">
                    <a href="#catalogo">Explorar</a>
                </Button>
            </div>
            <img
                src={HERO_IMAGE}
                alt="Ilustração de um macaco com óculos escuros e jaqueta verde"
                width={420}
                height={420}
                fetchPriority="high"
                className="aspect-square w-full rounded-nft object-cover"
                srcSet={nftSrcSet(HERO_IMAGE)}
                sizes="(min-width: 768px) 420px, 100vw"
            />
        </section>
    )
}

function SearchBox({ initial, onCommit }: { initial: string; onCommit: (q: string | undefined) => void }) {
    const [value, setValue] = useState(initial)
    useEffect(() => {
        if (value.trim() === initial) return
        const timer = window.setTimeout(() => onCommit(value.trim() || undefined), 350)
        return () => window.clearTimeout(timer)
    }, [value, initial, onCommit])

    return (
        <form
            role="search"
            onSubmit={(e) => {
                e.preventDefault()
                onCommit(value.trim() || undefined)
            }}
            className="relative"
        >
            <label htmlFor="busca" className="sr-only">Buscar NFTs</label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
            <input
                id="busca"
                type="search"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Explorar coleções"
                className="h-11 w-full rounded-[5px] border border-border bg-surface-card pl-10 pr-3 text-sm placeholder:text-text-secondary"
            />
        </form>
    )
}

interface FiltersProps {
    search: HomeSearch
    facets?: NftListResponse["facets"]
    onToggle: (key: "category" | "network", value: string) => void
    onPrice: (min?: string, max?: string) => void
}

function Filters({ search, facets, onToggle, onPrice }: FiltersProps) {
    const item = "flex cursor-pointer items-center justify-between gap-2 text-sm"
    return (
        <aside aria-label="Filtros" className="flex h-fit flex-col gap-8 rounded-nft bg-surface-card p-5">
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-3 text-ui font-bold">Coleções</legend>
                {CATEGORIES.map((c) => (
                    <label key={c.slug} className={item}>
                        <span className="flex items-center gap-2">
                            <input type="checkbox" className="size-4 accent-primary" checked={search.category?.includes(c.slug) ?? false} onChange={() => onToggle("category", c.slug)} />
                            {c.label}
                        </span>
                        <span className="text-text-secondary">({facets?.categories[c.slug] ?? 0})</span>
                    </label>
                ))}
            </fieldset>
            <PriceFilter key={`${search.minPrice ?? ""}-${search.maxPrice ?? ""}`} min={search.minPrice} max={search.maxPrice} onApply={onPrice} />
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-3 text-ui font-bold">Rede</legend>
                {NETWORKS.map((n) => (
                    <label key={n.slug} className={item}>
                        <span className="flex items-center gap-2">
                            <input type="checkbox" className="size-4 accent-primary" checked={search.network?.includes(n.slug) ?? false} onChange={() => onToggle("network", n.slug)} />
                            {n.label}
                        </span>
                        <span className="text-text-secondary">({facets?.networks[n.slug] ?? 0})</span>
                    </label>
                ))}
            </fieldset>
        </aside>
    )
}

function PriceFilter({ min, max, onApply }: { min?: string; max?: string; onApply: (min?: string, max?: string) => void }) {
    const [error, setError] = useState<string | null>(null)
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const lo = String(data.get("min") ?? "").trim().replace(",", ".")
        const hi = String(data.get("max") ?? "").trim().replace(",", ".")
        const valid = (v: string) => v === "" || /^\d+(\.\d+)?$/.test(v)
        if (!valid(lo) || !valid(hi)) {
            setError("Use números, por exemplo 0.5")
            return
        }
        if (lo && hi && Number(lo) > Number(hi)) {
            setError("O mínimo deve ser menor que o máximo.")
            return
        }
        setError(null)
        onApply(lo || undefined, hi || undefined)
    }
    const input = "mt-1 h-9 w-full rounded-[5px] border border-border bg-background px-2 text-foreground"
    return (
        <form onSubmit={submit} noValidate>
            <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-ui font-bold">Faixa de preço (ETH)</legend>
                <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm">
                        Mínimo
                        <input name="min" inputMode="decimal" defaultValue={min} aria-invalid={error ? true : undefined} aria-describedby={error ? "preco-erro" : undefined} className={input} />
                    </label>
                    <label className="text-sm">
                        Máximo
                        <input name="max" inputMode="decimal" defaultValue={max} aria-invalid={error ? true : undefined} aria-describedby={error ? "preco-erro" : undefined} className={input} />
                    </label>
                </div>
                {error && <p id="preco-erro" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" size="sm" className="w-fit">Aplicar</Button>
            </fieldset>
        </form>
    )
}