import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { FavoritesResponse } from "@/api/contracts"
import { addFavorite, getFavorites, removeFavorite } from "@/api/endpoints"
import { useSession } from "./session"

export function useFavorites() {
    const { user } = useSession()
    return useQuery({
        queryKey: ["favorites", user?.id],
        queryFn: ({ signal }) => getFavorites(signal),
        enabled: Boolean(user),
    })
}

export function useToggleFavorite() {
    const { user } = useSession()
    const queryClient = useQueryClient()
    const key = ["favorites", user?.id]

    return useMutation({
        mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
            favorite ? addFavorite(nftId) : removeFavorite(nftId),
        onMutate: async ({ nftId, favorite }) => {
            await queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<FavoritesResponse>(key)
            const ids = previous?.nftIds ?? []
            queryClient.setQueryData<FavoritesResponse>(key, {
                nftIds: favorite ? [...new Set([...ids, nftId])] : ids.filter((id) => id !== nftId),
            })
            return { previous }
        },
        onError: (_error, _vars, context) => {
            queryClient.setQueryData(key, context?.previous)
            toast.error("Não foi possível atualizar seus favoritos. A alteração foi desfeita.")
        },
        onSuccess: (data) => {
            queryClient.setQueryData(key, data)
        },
    })
}