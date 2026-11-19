import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { errorMessage, isApiError } from "@/api/client"
import type { CartItem, CartItemInput, Quote, QuoteLine } from "@/api/contracts"
import { createQuote } from "@/api/endpoints"
import { QuantityStepper } from "@/components/quantity-stepper"
import { QuoteTotals, QuoteTotalsSkeleton } from "@/components/quote-summary"
import { Skeleton } from "@/components/skeleton"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { quoteKey, toQuoteItems, useCart, useCartMutations, useQuote } from "@/features/cart"
import { nftQuery } from "@/features/nft"
import { useOwnerKey, useSession } from "@/features/session"
import { couponStore } from "@/lib/stores"

export const Route = createFileRoute("/carrinho")({ component: CartPage })

const wrap = "mx-auto max-w-[1200px] px-4 py-8 lg:px-0"

function CartPage() {
    const navigate = useNavigate()
    const { user } = useSession()
    const cart = useCart()
    const coupon = couponStore.useValue()
    const items = toQuoteItems(cart.data)
    const quote = useQuote(items, coupon)

    if (cart.isPending) {
        return (
            <div className={wrap} aria-busy="true" aria-label="Carregando carrinho">
                <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            </div>
        )
    }
    if (cart.isError) {
        return <div className={wrap}><ErrorState message={errorMessage(cart.error, "Não foi possível carregar o carrinho.")} onRetry={() => void cart.refetch()} /></div>
    }
    if (cart.data.items.length === 0) {
        return (
            <div className={wrap}>
                <EmptyState
                    title="Seu carrinho está vazio"
                    description="Explore o catálogo e adicione NFTs para começar."
                    action={<Button asChild><Link to="/" search={{}}>Explorar NFTs</Link></Button>}
                />
            </div>
        )
    }

    const lines = new Map((quote.data?.lines ?? []).map((l) => [`${l.nftId}|${l.editionId}`, l]))
    const blocked = (quote.data?.lines ?? []).some((l) => !l.ok)
    const couponError =
        isApiError(quote.error) && (quote.error.code === "COUPON_INVALID" || quote.error.code === "COUPON_EXPIRED")
            ? quote.error.message
            : null

    const finish = () => {
        if (user) void navigate({ to: "/pagamento" })
        else void navigate({ to: "/login", search: { redirect: "/pagamento" } })
    }

    return (
        <div className={`${wrap} grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]`}>
            <section aria-labelledby="carrinho-titulo" className="flex flex-col gap-4">
                <nav aria-label="Trilha" className="text-sm text-text-secondary">
                    <Link to="/" search={{}} className="hover:text-primary">Início</Link> / <span aria-current="page" className="text-foreground">Carrinho</span>
                </nav>
                <h1 id="carrinho-titulo" className="text-title font-bold">Carrinho de NFTs</h1>
                <ul className="flex flex-col gap-3">
                    {cart.data.items.map((item) => (
                        <CartRow key={item.id} item={item} line={lines.get(`${item.nftId}|${item.editionId}`)} />
                    ))}
                </ul>
            </section>

            <div className="flex flex-col gap-4">
                <Summary quote={quote}>
                    {coupon ? (
                        <div className="flex items-center justify-between rounded-[5px] border border-primary px-3 py-2 text-sm">
                            <span>Cupom <strong>{coupon}</strong> aplicado</span>
                            <button type="button" onClick={() => couponStore.set(null)} className="text-primary underline">Remover</button>
                        </div>
                    ) : (
                        <CouponForm items={items} />
                    )}
                    {couponError && <p role="alert" className="text-sm text-destructive">{couponError}</p>}
                </Summary>
                {blocked && <p role="alert" className="text-sm text-destructive">Ajuste os itens indisponíveis para finalizar.</p>}
                <Button onClick={finish} disabled={blocked || !quote.data || quote.isFetching} className="w-full">Conectar e finalizar</Button>
                <Link to="/" search={{}} className="text-center text-sm text-primary hover:underline">Continuar explorando</Link>
            </div>
        </div>
    )
}

function CartRow({ item, line }: { item: CartItem; line?: QuoteLine }) {
    const nft = useQuery(nftQuery(item.nftId))
    const { update, remove } = useCartMutations()
    const edition = nft.data?.editions.find((e) => e.id === item.editionId)
    const name = nft.data?.name ?? "NFT"

    return (
        <li className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-surface-card p-3 sm:grid-cols-[56px_minmax(0,1.5fr)_1fr_auto_1fr_auto]">
            {nft.data ? <img src={nft.data.imageUrl} alt="" width={56} height={56} className="size-14 rounded-md object-cover" /> : <Skeleton className="size-14" />}
            <div className="min-w-0">
                <p className="truncate font-bold"><Link to="/nft/$id" params={{ id: item.nftId }} className="hover:text-primary">{name}</Link></p>
                <p className="text-sm text-text-secondary">ID do token: #{nft.data?.tokenId ?? "…"} · Edição {edition?.label ?? "…"}</p>
            </div>
            <p className="hidden text-sm sm:block"><span className="sr-only">Preço unitário: </span>{line?.unitPriceEth ?? nft.data?.priceEth ?? "…"} ETH</p>
            <QuantityStepper
                value={item.quantity}
                min={1}
                max={edition?.available ?? item.quantity}
                label={`Quantidade de ${name}`}
                disabled={update.isPending}
                onChange={(quantity) => update.mutate({ itemId: item.id, quantity })}
            />
            <p className="hidden font-bold text-primary sm:block"><span className="sr-only">Total: </span>{line?.lineTotalEth ?? "…"} ETH</p>
            <button
                type="button"
                onClick={() => remove.mutate(item.id, { onSuccess: () => toast.success(`${name} removido do carrinho.`) })}
                disabled={remove.isPending}
                aria-label={`Remover ${name} do carrinho`}
                className="grid size-9 place-items-center rounded-full text-text-secondary hover:bg-muted hover:text-foreground"
            >
                <Trash2 aria-hidden className="size-4" />
            </button>
            {line && !line.ok && (
                <p role="alert" className="col-span-full text-sm text-destructive">
                    {line.available === 0 ? "Esta edição esgotou. Remova o item para continuar." : `Só restam ${line.available} unidade(s). Ajuste a quantidade.`}
                </p>
            )}
        </li>
    )
}

function Summary({ quote, children }: { quote: UseQueryResult<Quote>; children: React.ReactNode }) {
    return (
        <section aria-labelledby="resumo" className="flex flex-col gap-4">
            <h2 id="resumo" className="border-b border-border pb-3 text-section font-bold">Resumo da carteira</h2>
            {children}
            {quote.data ? (
                <QuoteTotals quote={quote.data} updating={quote.isFetching} />
            ) : quote.isError ? (
                <ErrorState message={errorMessage(quote.error, "Não foi possível calcular o total.")} onRetry={() => void quote.refetch()} />
            ) : (
                <QuoteTotalsSkeleton />
            )}
        </section>
    )
}

function CouponForm({ items }: { items: CartItemInput[] }) {
    const owner = useOwnerKey()
    const queryClient = useQueryClient()
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const code = String(new FormData(event.currentTarget).get("coupon") ?? "").trim().toUpperCase()
        if (!code) {
            setError("Digite um código promocional.")
            return
        }
        setBusy(true)
        setError(null)
        try {
            await queryClient.fetchQuery({
                queryKey: quoteKey(owner, items, code),
                queryFn: ({ signal }) => createQuote({ items, couponCode: code }, signal),
            })
            couponStore.set(code)
            toast.success("Cupom aplicado.")
        } catch (err) {
            setError(errorMessage(err, "Não foi possível validar o cupom."))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-1">
            <label htmlFor="cupom" className="text-sm font-bold">Código promocional</label>
            <div className="flex">
                <input
                    id="cupom"
                    name="coupon"
                    placeholder="Digite o código promocional"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "cupom-erro" : undefined}
                    className="h-10 min-w-0 flex-1 rounded-l-[5px] border border-primary bg-surface-card px-3 text-sm placeholder:text-text-secondary"
                />
                <Button type="submit" disabled={busy} className="h-10 rounded-l-none">Aplicar</Button>
            </div>
            {error && <p id="cupom-erro" role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
    )
}