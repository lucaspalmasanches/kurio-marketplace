import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { errorMessage } from "@/api/client"
import { AccountLayout } from "@/components/account-layout"
import { NftCard, NftCardSkeleton } from "@/components/nft-card"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { useFavorites } from "@/features/favorites"
import { nftQuery } from "@/features/nft"

export const Route = createFileRoute("/_auth/favoritos")({ component: FavoritesPage })

const grid = "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"

function FavoritesPage() {
    const favorites = useFavorites()

    return (
        <AccountLayout>
            <section aria-labelledby="favoritos-titulo" className="flex flex-col gap-6">
                <h1 id="favoritos-titulo" className="text-ui font-bold">Lista de interesse</h1>
                {favorites.isPending ? (
                    <ul aria-busy="true" aria-label="Carregando favoritos" className={grid}>
                        {[0, 1, 2].map((i) => <li key={i}><NftCardSkeleton /></li>)}
                    </ul>
                ) : favorites.isError ? (
                    <ErrorState message={errorMessage(favorites.error, "Não foi possível carregar seus favoritos.")} onRetry={() => void favorites.refetch()} />
                ) : favorites.data.nftIds.length === 0 ? (
                    <EmptyState
                        title="Nenhum favorito ainda"
                        description="Toque em Favoritar em qualquer NFT para guardá-lo aqui."
                        action={<Button asChild><Link to="/" search={{}}>Explorar NFTs</Link></Button>}
                    />
                ) : (
                    <ul className={grid}>
                        {favorites.data.nftIds.map((id) => <li key={id}><FavoriteCard id={id} /></li>)}
                    </ul>
                )}
            </section>
        </AccountLayout>
    )
}

function FavoriteCard({ id }: { id: string }) {
    const nft = useQuery(nftQuery(id))
    if (nft.isPending) return <NftCardSkeleton />
    if (nft.isError) return null
    return <NftCard nft={nft.data} />
}