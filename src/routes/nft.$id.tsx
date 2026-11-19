import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Heart, ShoppingCart, Star } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { errorMessage, isApiError } from "@/api/client"
import type { Nft } from "@/api/contracts"
import { QuantityStepper } from "@/components/quantity-stepper"
import { Skeleton } from "@/components/skeleton"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { useCart, useCartMutations } from "@/features/cart"
import { useFavorites, useToggleFavorite } from "@/features/favorites"
import { nftQuery } from "@/features/nft"
import { useSession } from "@/features/session"
import { cn } from "@/lib/utils"
import { nftSrcSet, nftThumb } from "@/lib/images"
import { NftTabs } from "@/components/nft-tabs"
import { MoreFromCollection } from "@/components/more-from-collection"

export const Route = createFileRoute("/nft/$id")({ component: NftDetailPage })

const wrap = "mx-auto max-w-[1200px] px-4 py-8 lg:px-0"

function NftDetailPage() {
    const { id } = Route.useParams()
    const nft = useQuery(nftQuery(id))

    if (nft.isPending) return <DetailSkeleton />
    if (nft.isError) {
        if (isApiError(nft.error) && nft.error.status === 404) {
            return (
                <div className={wrap}>
                    <EmptyState
                        title="NFT não encontrado"
                        description="Ele pode ter sido removido ou o endereço está incorreto."
                        action={<Button asChild><Link to="/" search={{}}>Voltar ao catálogo</Link></Button>}
                    />
                </div>
            )
        }
        return (
            <div className={wrap}>
                <ErrorState message={errorMessage(nft.error, "Não foi possível carregar este NFT.")} onRetry={() => void nft.refetch()} />
            </div>
        )
    }
    return <NftDetail nft={nft.data} />
}

function NftDetail({ nft }: { nft: Nft }) {
    const navigate = useNavigate()
    const { user } = useSession()
    const cart = useCart()
    const { add } = useCartMutations()
    const favorites = useFavorites()
    const toggleFavorite = useToggleFavorite()

    const [imageIndex, setImageIndex] = useState(0)
    const [chosenEdition, setChosenEdition] = useState<string | null>(null)
    const [quantityRaw, setQuantity] = useState(1)

    const firstAvailable = nft.editions.find((e) => e.available > 0)?.id ?? null
    const editionId = chosenEdition ?? firstAvailable
    const edition = nft.editions.find((e) => e.id === editionId) ?? null
    const inCart = cart.data?.items.find((i) => i.nftId === nft.id && i.editionId === editionId)?.quantity ?? 0
    const maxQuantity = Math.max(0, (edition?.available ?? 0) - inCart)
    const quantity = Math.min(Math.max(1, quantityRaw), Math.max(1, maxQuantity))
    const canBuy = edition !== null && maxQuantity > 0
    const isFavorite = favorites.data?.nftIds.includes(nft.id) ?? false

    const addToCart = (goToCart: boolean) => {
        if (!edition || !canBuy) return
        add.mutate(
            { nftId: nft.id, editionId: edition.id, quantity },
            {
                onSuccess: () => {
                    toast.success(`${nft.name} adicionado ao carrinho.`)
                    if (goToCart) void navigate({ to: "/carrinho" })
                },
            },
        )
    }

    const onFavorite = () => {
        if (!user) {
            void navigate({ to: "/login", search: { redirect: `/nft/${nft.id}` } })
            return
        }
        toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite })
    }

    return (
        <div className={wrap}>
            <nav aria-label="Trilha" className="mb-6 text-sm text-text-secondary">
                <ol className="flex flex-wrap gap-1">
                    <li><Link to="/" search={{}} className="hover:text-primary">Início</Link> /</li>
                    <li><Link to="/" search={{}} hash="catalogo" className="hover:text-primary">Mercado</Link> /</li>
                    <li aria-current="page" className="text-foreground">{nft.name}</li>
                </ol>
            </nav>

            <div className="grid gap-8 lg:grid-cols-[80px_minmax(0,420px)_1fr]">
                <ul aria-label="Galeria" className="order-2 flex gap-3 lg:order-none lg:flex-col">
                    {nft.images.map((src, i) => (
                        <li key={i}>
                            <button
                                type="button"
                                onClick={() => setImageIndex(i)}
                                aria-label={`Ver imagem ${i + 1} de ${nft.images.length}`}
                                aria-pressed={i === imageIndex}
                                className={cn("block overflow-hidden rounded-md border-2", i === imageIndex ? "border-primary" : "border-transparent")}
                            >
                                <img src={nftThumb(src)} alt="" width={80} height={80} className="size-16 object-cover lg:size-20" />
                            </button>
                        </li>
                    ))}
                </ul>

                <img
                    src={nft.images[imageIndex] ?? nft.imageUrl}
                    alt={`Arte do NFT ${nft.name}`}
                    width={420}
                    height={420}
                    className="aspect-square w-full rounded-nft object-cover"
                    srcSet={nftSrcSet(nft.images[imageIndex] ?? nft.imageUrl)}
                    sizes="(min-width: 1024px) 420px, 100vw"
                />

                <div className="flex flex-col gap-4">
                    <h1 className="text-title font-bold">{nft.name}</h1>
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-2xl font-bold text-primary">{nft.priceEth} ETH</p>
                        <p className="flex items-center gap-1 text-sm">
                            <Star aria-hidden className="size-4 fill-primary text-primary" />
                            <span className="sr-only">Avaliação: </span>
                            {nft.rating} ({nft.reviewCount} avaliações de colecionadores)
                        </p>
                    </div>

                    <section aria-labelledby="sobre">
                        <h2 id="sobre" className="font-bold">Sobre este NFT:</h2>
                        <p className="text-body text-text-secondary">{nft.description}</p>
                    </section>

                    <fieldset>
                        <legend className="mb-2 font-bold">Edição:</legend>
                        <div className="flex flex-wrap gap-2">
                            {nft.editions.map((e) => {
                                const soldOut = e.available === 0
                                const selected = e.id === editionId
                                return (
                                    <label
                                        key={e.id}
                                        className={cn(
                                            "cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
                                            selected ? "border-primary text-primary" : "border-border",
                                            soldOut && "cursor-not-allowed line-through opacity-50",
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="edicao"
                                            value={e.id}
                                            checked={selected}
                                            disabled={soldOut}
                                            onChange={() => {
                                                setChosenEdition(e.id)
                                                setQuantity(1)
                                            }}
                                            className="sr-only"
                                        />
                                        {e.label}
                                        {soldOut && <span className="sr-only"> (esgotada)</span>}
                                    </label>
                                )
                            })}
                        </div>
                        {!firstAvailable && <p role="status" className="mt-2 text-sm text-destructive">Todas as edições estão esgotadas.</p>}
                    </fieldset>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-text-secondary">
                        <dt>ID do token:</dt>
                        <dd>#{nft.tokenId}</dd>
                        <dt>Coleção:</dt>
                        <dd>{nft.collection}</dd>
                        <dt>Atributos:</dt>
                        <dd>{nft.attributes.join(", ")}</dd>
                    </dl>

                    <div className="flex flex-wrap items-center gap-3">
                        <QuantityStepper value={quantity} min={1} max={Math.max(1, maxQuantity)} onChange={setQuantity} label="Quantidade" disabled={!canBuy} />
                        <Button onClick={() => addToCart(true)} disabled={!canBuy || add.isPending}>Comprar</Button>
                        <Button variant="outline" onClick={() => addToCart(false)} disabled={!canBuy || add.isPending} aria-label="Adicionar ao carrinho">
                            <ShoppingCart aria-hidden />
                        </Button>
                        <Button variant="outline" onClick={onFavorite} aria-pressed={isFavorite}>
                            <Heart aria-hidden className={cn(isFavorite && "fill-primary text-primary")} />
                            {isFavorite ? "Favoritado" : "Favoritar"}
                        </Button>
                    </div>
                    {edition && edition.available > 0 && maxQuantity === 0 && (
                        <p role="status" className="text-sm text-text-secondary">Todas as unidades disponíveis desta edição já estão no seu carrinho.</p>
                    )}
                </div>
            </div>

            <NftTabs nft={nft} />
            <MoreFromCollection nftId={nft.id} />
        </div>
    )
}

function DetailSkeleton() {
    return (
        <div className={wrap} aria-busy="true" aria-label="Carregando NFT">
            <div className="grid gap-8 lg:grid-cols-[80px_minmax(0,420px)_1fr]">
                <div className="hidden flex-col gap-3 lg:flex">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="size-20" />)}
                </div>
                <Skeleton className="aspect-square w-full rounded-nft" />
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-1/2" />
                </div>
            </div>
        </div>
    )
}