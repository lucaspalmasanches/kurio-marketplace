import { queryOptions } from "@tanstack/react-query"
import { getNft } from "@/api/nfts"
import { recordResourceVersion } from "@/lib/realtime"

export function nftQuery(id: string) {
    return queryOptions({
        queryKey: ["nft", id],
        queryFn: async ({ signal }) => {
            const nft = await getNft(id, signal)
            recordResourceVersion("nft", nft.id, nft.version)
            return nft
        },
    })
}