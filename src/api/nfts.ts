import { api } from "./client"
import type { Nft, NftListQuery, NftListResponse } from "./contracts"

export async function listNfts(query: NftListQuery, signal?: AbortSignal): Promise<NftListResponse> {
    const { data } = await api.get<NftListResponse>("/nfts", {
        params: {
            q: query.q,
            category: query.category?.length ? query.category.join(",") : undefined,
            network: query.network?.length ? query.network.join(",") : undefined,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            sort: query.sort,
            tab: query.tab,
            page: query.page,
            pageSize: query.pageSize,
        },
        signal,
    })
    return data
}

export async function getNft(id: string, signal?: AbortSignal): Promise<Nft> {
    const { data } = await api.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal })
    return data
}