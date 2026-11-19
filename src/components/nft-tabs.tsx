import { useQuery } from "@tanstack/react-query"
import { Star } from "lucide-react"
import { useId, useRef, useState, type KeyboardEvent } from "react"
import { NETWORK_LABEL } from "@/api/catalog"
import { errorMessage } from "@/api/client"
import type { Nft } from "@/api/contracts"
import { getNftReviews } from "@/api/nfts"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"
import { ErrorState } from "./states"

type TabId = "detalhes" | "avaliacoes"

export function NftTabs({ nft }: { nft: Nft }) {
    const [active, setActive] = useState<TabId>("detalhes")
    const baseId = useId()
    const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ detalhes: null, avaliacoes: null })
    const tabs: { id: TabId; label: string }[] = [
        { id: "detalhes", label: "Detalhes do NFT" },
        { id: "avaliacoes", label: `Avaliações de colecionadores (${nft.reviewCount})` },
    ]

    // Setas esquerda/direita alternam as abas (padrão WAI-ARIA de tabs).
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
        event.preventDefault()
        const index = tabs.findIndex((t) => t.id === active)
        const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]
        setActive(next.id)
        tabRefs.current[next.id]?.focus()
    }

    return (
        <section aria-label="Informações do NFT" className="mt-12">
            <div role="tablist" aria-label="Informações do NFT" className="flex flex-wrap gap-6 border-b border-border">
                {tabs.map((tab) => {
                    const selected = tab.id === active
                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                tabRefs.current[tab.id] = el
                            }}
                            type="button"
                            role="tab"
                            id={`${baseId}-${tab.id}-tab`}
                            aria-selected={selected}
                            aria-controls={`${baseId}-${tab.id}-panel`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => setActive(tab.id)}
                            onKeyDown={onKeyDown}
                            className={cn(
                                "-mb-px border-b-2 pb-2 text-sm",
                                selected ? "border-primary font-bold text-primary" : "border-transparent hover:text-primary",
                            )}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            <div
                role="tabpanel"
                id={`${baseId}-detalhes-panel`}
                aria-labelledby={`${baseId}-detalhes-tab`}
                hidden={active !== "detalhes"}
                tabIndex={0}
                className="flex flex-col gap-4 pt-6 text-body text-text-secondary"
            >
                <p>
                    {nft.name} é uma obra digital da coleção {nft.collection}. Cada atributo fica armazenado nos metadados do token, com procedência registrada na rede.
                </p>
                <dl className="flex flex-col gap-3">
                    <div>
                        <dt className="font-bold text-foreground">Rede:</dt>
                        <dd>Cunhado na {NETWORK_LABEL[nft.network]}, com procedência imutável e metadados verificados.</dd>
                    </div>
                    <div>
                        <dt className="font-bold text-foreground">Atributos:</dt>
                        <dd>{nft.attributes.join(", ")}</dd>
                    </div>
                    <div>
                        <dt className="font-bold text-foreground">Edições:</dt>
                        <dd>{nft.editions.map((e) => `${e.label} (${e.available} disponíveis)`).join(" · ")}</dd>
                    </div>
                </dl>
            </div>

            <div
                role="tabpanel"
                id={`${baseId}-avaliacoes-panel`}
                aria-labelledby={`${baseId}-avaliacoes-tab`}
                hidden={active !== "avaliacoes"}
                tabIndex={0}
                className="pt-6"
            >
                {active === "avaliacoes" && <Reviews nftId={nft.id} />}
            </div>
        </section>
    )
}

function Reviews({ nftId }: { nftId: string }) {
    const reviews = useQuery({
        queryKey: ["reviews", nftId],
        queryFn: ({ signal }) => getNftReviews(nftId, signal),
    })

    if (reviews.isPending) {
        return (
            <div aria-busy="true" aria-label="Carregando avaliações" className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
        )
    }
    if (reviews.isError) {
        return <ErrorState message={errorMessage(reviews.error, "Não foi possível carregar as avaliações.")} onRetry={() => void reviews.refetch()} />
    }

    const { items, total, average } = reviews.data
    return (
        <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2 text-sm">
                <Star aria-hidden className="size-4 fill-primary text-primary" />
                Média {average.toFixed(1)} de 5 · {total} avaliações · exibindo as {items.length} mais recentes
            </p>
            <ul className="flex flex-col gap-3">
                {items.map((review) => (
                    <li key={review.id} className="rounded-md bg-surface-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold">{review.author}</p>
                            <p className="text-xs text-text-secondary">
                                <span className="sr-only">Nota {review.rating} de 5. </span>
                                <span aria-hidden="true" className="text-primary">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                                {" · "}
                                {formatDate(review.createdAt)}
                            </p>
                        </div>
                        <p className="mt-2 text-body text-text-secondary">{review.comment}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}