import { Link } from "@tanstack/react-router"
import type { Nft } from "@/api/contracts"
import { Skeleton } from "./skeleton"

export function NftCard({ nft, priority = false }: { nft: Nft; priority?: boolean }) {
    return (
        <article className="group relative flex h-full flex-col gap-3 rounded-nft bg-surface-card p-3 transition-colors hover:bg-muted">
            <div className="relative overflow-hidden rounded-nft">
                <img
                    src={nft.imageUrl}
                    alt=""
                    width={360}
                    height={360}
                    loading={priority ? "eager" : "lazy"}
                    decoding="async"
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                {nft.rare && <span className="absolute left-0 top-0 bg-secondary px-3 py-1 text-xs font-bold text-ink">RARO</span>}
            </div>
            <h3 className="text-name">
                <Link
                    to="/nft/$id"
                    params={{ id: nft.id }}
                    className="after:absolute after:inset-0 after:rounded-nft focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary"
                >
                    {nft.name}
                </Link>
            </h3>
            <p className="text-ui font-bold text-primary">
                {nft.priceEth} ETH
                {nft.previousPriceEth && (
                    <s className="ml-2 text-sm font-normal text-text-secondary">
                        <span className="sr-only">Preço anterior: </span>
                        {nft.previousPriceEth} ETH
                    </s>
                )}
            </p>
        </article>
    )
}

export function NftCardSkeleton() {
    return (
        <div className="flex flex-col gap-3 rounded-nft bg-surface-card p-3">
            <Skeleton className="aspect-square w-full rounded-nft" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
        </div>
    )
}