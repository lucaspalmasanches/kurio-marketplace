import { useQuery } from "@tanstack/react-query"
import type { NftListQuery } from "@/api/contracts"
import { listNfts } from "@/api/nfts"
import { recordResourceVersion } from "@/lib/realtime"
import { NftCard, NftCardSkeleton } from "./nft-card"

const QUERY: NftListQuery = { sort: "popular", pageSize: 6 }

export function MoreFromCollection({ nftId }: { nftId: string }) {
    const related = useQuery({
        queryKey: ["nfts", "list", QUERY],
        queryFn: async ({ signal }) => {
            const data = await listNfts(QUERY, signal)
            for (const nft of data.items) recordResourceVersion("nft", nft.id, nft.version)
            return data
        },
    })

    // Conteúdo complementar: em caso de falha, a seção não é exibida.
    if (related.isError) return null
    const items = (related.data?.items ?? []).filter((n) => n.id !== nftId).slice(0, 5)

    return (
        <section aria-labelledby="mais-colecao" className="mt-12">
            <h2 id="mais-colecao" className="mb-4 border-b border-border pb-2 text-section font-bold text-primary">Mais desta coleção</h2>
            <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
                {related.isPending
                    ? Array.from({ length: 5 }, (_, i) => (
                        <li key={i} className="w-56 shrink-0 snap-start"><NftCardSkeleton /></li>
                    ))
                    : items.map((nft) => (
                        <li key={nft.id} className="w-56 shrink-0 snap-start"><NftCard nft={nft} sizes="224px" /></li>
                    ))}
            </ul>
        </section>
    )
}