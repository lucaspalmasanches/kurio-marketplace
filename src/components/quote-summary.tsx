import { useQuery } from "@tanstack/react-query"
import type { Quote, QuoteLine } from "@/api/contracts"
import { nftQuery } from "@/features/nft"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

export function QuoteTotals({ quote, updating }: { quote: Quote; updating?: boolean }) {
    return (
        <dl aria-live="polite" className={cn("grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm", updating && "opacity-60")}>
            <dt>Subtotal</dt>
            <dd className="text-right">{quote.subtotalEth} ETH</dd>
            <dt>Desconto{quote.couponCode ? ` (${quote.couponCode})` : " do lançamento"}</dt>
            <dd className="text-right">(-) {quote.discountEth} ETH</dd>
            <dt>
                Taxa de rede
                <span className="block text-xs text-primary">Taxa estimada</span>
            </dt>
            <dd className="text-right">{quote.networkFeeEth} ETH</dd>
            <dt className="border-t border-border pt-3 text-ui font-bold">Total</dt>
            <dd className="border-t border-border pt-3 text-right text-ui font-bold text-primary">{quote.totalEth} ETH</dd>
        </dl>
    )
}

export function QuoteTotalsSkeleton() {
    return (
        <div className="flex flex-col gap-3" aria-hidden="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-full" />
        </div>
    )
}

function LineItem({ line }: { line: QuoteLine }) {
    const nft = useQuery(nftQuery(line.nftId))
    const edition = nft.data?.editions.find((e) => e.id === line.editionId)
    return (
        <li className="flex items-center gap-3 rounded-md bg-surface-card p-2">
            {nft.data ? (
                <img src={nft.data.imageUrl} alt="" width={48} height={48} className="size-12 rounded-md object-cover" />
            ) : (
                <Skeleton className="size-12" />
            )}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                    {nft.data?.name ?? "Carregando…"} <span className="font-normal text-text-secondary">(x {line.quantity})</span>
                </p>
                <p className="text-xs text-text-secondary">
                    ID do token: #{nft.data?.tokenId ?? "…"} · Edição {edition?.label ?? "…"}
                </p>
                {!line.ok && <p className="text-xs text-destructive">Indisponível na quantidade escolhida</p>}
            </div>
            <p className="font-bold text-primary">{line.lineTotalEth} ETH</p>
        </li>
    )
}

export function QuoteLines({ quote }: { quote: Quote }) {
    return (
        <ul className="flex flex-col gap-2">
            {quote.lines.map((line) => (
                <LineItem key={`${line.nftId}|${line.editionId}`} line={line} />
            ))}
        </ul>
    )
}