import { useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query"
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router"
import { LoaderCircle } from "lucide-react"
import { useState, type FormEvent } from "react"
import { NETWORKS, NETWORK_LABEL, PROVIDERS, PROVIDER_LABEL } from "@/api/catalog"
import { ApiError, errorMessage, isApiError } from "@/api/client"
import type { CartItemInput, CollectorInput, Network, Quote, User, Wallet, WalletProvider } from "@/api/contracts"
import { connectWallet, createOrder, createQuote } from "@/api/endpoints"
import { validateOrderInput, type FieldErrors } from "@/api/validation"
import { Field, SelectField, TextAreaField } from "@/components/field"
import { QuoteLines, QuoteTotals, QuoteTotalsSkeleton } from "@/components/quote-summary"
import { EmptyState, ErrorState, PageSpinner } from "@/components/states"
import { Button } from "@/components/ui/button"
import { quoteKey, toQuoteItems, useCart, useQuote } from "@/features/cart"
import { useSession } from "@/features/session"
import { useWallets } from "@/features/wallets"
import { shortAddress } from "@/lib/format"
import { focusFirstError } from "@/lib/forms"
import { couponStore, pendingCheckoutStore } from "@/lib/stores"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_auth/pagamento")({ component: CheckoutPage })

const wrap = "mx-auto max-w-[1200px] px-4 py-8 lg:px-0"

function CheckoutPage() {
    const { user } = useSession()
    const pending = pendingCheckoutStore.useValue()
    const cart = useCart()
    const wallets = useWallets()
    const coupon = couponStore.useValue()
    const items = toQuoteItems(cart.data)
    const quote = useQuote(items, coupon)

    // Pedido em andamento (ex.: página recarregada): retoma o mesmo pedido em vez de criar outro.
    if (user && pending?.orderId && pending.userId === user.id) {
        return <Navigate to="/pedido/$orderId" params={{ orderId: pending.orderId }} replace />
    }
    if (!user || cart.isPending || wallets.isPending) return <PageSpinner label="Carregando pagamento…" />
    if (cart.isError || wallets.isError) {
        return (
            <div className={wrap}>
                <ErrorState message="Não foi possível carregar o pagamento." onRetry={() => { void cart.refetch(); void wallets.refetch() }} />
            </div>
        )
    }
    if (cart.data.items.length === 0) {
        return (
            <div className={wrap}>
                <EmptyState title="Seu carrinho está vazio" description="Adicione NFTs ao carrinho para finalizar uma compra." action={<Button asChild><Link to="/" search={{}}>Explorar NFTs</Link></Button>} />
            </div>
        )
    }
    if (wallets.data.length === 0) {
        return <div className={wrap}><EmptyState title="Nenhuma carteira cadastrada" description="Cadastre uma carteira para receber seus NFTs." /></div>
    }
    return <CheckoutFlow user={user} wallets={wallets.data} items={items} coupon={coupon} quote={quote} />
}

interface FlowProps {
    user: User
    wallets: Wallet[]
    items: CartItemInput[]
    coupon: string | null
    quote: UseQueryResult<Quote>
}

type Connection = { status: "idle" | "connecting" | "connected" | "rejected"; message?: string }

function CheckoutFlow({ user, wallets, items, coupon, quote }: FlowProps) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const initialWallet = wallets.find((w) => w.kind === "primary") ?? wallets[0]

    const [walletId, setWalletId] = useState(initialWallet.id)
    const [provider, setProvider] = useState<WalletProvider>(initialWallet.provider)
    const [network, setNetwork] = useState<Network>(initialWallet.network)
    const [connection, setConnection] = useState<Connection>({ status: "idle" })
    const [step, setStep] = useState<"form" | "review">("form")
    const [errors, setErrors] = useState<FieldErrors>({})
    const [collector, setCollector] = useState<CollectorInput | null>(null)
    const [reviewedQuoteId, setReviewedQuoteId] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const wallet = wallets.find((w) => w.id === walletId) ?? initialWallet
    const current = quote.data

    const connect = useMutation({
        mutationFn: () => connectWallet(walletId),
        onMutate: () => setConnection({ status: "connecting" }),
        onSuccess: () => setConnection({ status: "connected" }),
        onError: (error) => setConnection({ status: "rejected", message: errorMessage(error, "A carteira recusou a conexão.") }),
    })

    const chooseWallet = (id: string) => {
        const next = wallets.find((w) => w.id === id)
        if (!next) return
        setWalletId(id)
        setProvider(next.provider)
        setNetwork(next.network)
        setConnection({ status: "idle" })
    }

    const confirm = useMutation({
        mutationFn: async () => {
            if (!collector || !reviewedQuoteId) throw new ApiError(400, "VALIDATION_ERROR", "Revise o pedido antes de confirmar.")
            // Revalida preço, disponibilidade, cupom e taxas antes de enviar.
            const fresh = await queryClient.fetchQuery({
                queryKey: quoteKey(user.id, items, coupon),
                queryFn: ({ signal }) => createQuote({ items, couponCode: coupon ?? undefined }, signal),
                staleTime: 0,
            })
            if (fresh.lines.some((l) => !l.ok)) throw new ApiError(409, "AVAILABILITY_CONFLICT", "A disponibilidade mudou. Revise seu carrinho.")
            if (fresh.id !== reviewedQuoteId) throw new ApiError(409, "PRICE_CHANGED", "Os valores mudaram desde a sua revisão. Confira e confirme novamente.")

            // Mesma chave em novas tentativas (clique repetido, timeout, refresh): o servidor devolve o mesmo pedido.
            const saved = pendingCheckoutStore.get()
            const key = saved && saved.userId === user.id && !saved.orderId ? saved.key : crypto.randomUUID()
            pendingCheckoutStore.set({ userId: user.id, key })
            return createOrder({ quoteId: fresh.id, items, couponCode: coupon ?? undefined, walletId, provider, network, collector }, key)
        },
        retry: (count, error) => isApiError(error) && (error.code === "NETWORK_ERROR" || error.code === "TRANSIENT_ERROR") && count < 3,
        retryDelay: 1500,
        onSuccess: (order) => {
            const saved = pendingCheckoutStore.get()
            pendingCheckoutStore.set({ userId: user.id, key: saved?.key ?? "", orderId: order.id })
            queryClient.setQueryData(["order", order.id], order)
            void navigate({ to: "/pedido/$orderId", params: { orderId: order.id } })
        },
        onError: (error) => {
            if (isApiError(error) && (error.code === "PRICE_CHANGED" || error.code === "AVAILABILITY_CONFLICT")) {
                pendingCheckoutStore.set(null)
                void queryClient.invalidateQueries({ queryKey: ["quote"] })
                setReviewedQuoteId(null)
            }
            if (isApiError(error) && error.code === "IDEMPOTENCY_CONFLICT") pendingCheckoutStore.set(null)
            setNotice(errorMessage(error, "Não foi possível concluir a compra. Tente novamente."))
        },
    })

    const goToReview = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const value = (name: string) => String(data.get(name) ?? "").trim()
        const input: CollectorInput = {
            displayName: value("displayName"),
            username: value("username"),
            profileName: value("profileName"),
            email: value("email"),
            ensName: value("ensName"),
            referralCode: value("referralCode"),
            note: value("note") || undefined,
        }
        const found = validateOrderInput({ quoteId: current?.id ?? "pendente", items, couponCode: coupon ?? undefined, walletId, provider, network, collector: input })
        if (connection.status !== "connected") found.connection = "Conecte a carteira para continuar."
        setErrors(found)
        if (Object.keys(found).length > 0) {
            if (!focusFirstError(event.currentTarget, found) || Object.keys(found)[0] === "connection") {
                document.getElementById("conectar-carteira")?.focus()
            }
            return
        }
        if (!current || current.lines.some((l) => !l.ok)) {
            setNotice("Há itens indisponíveis no carrinho. Ajuste o carrinho antes de continuar.")
            return
        }
        setCollector(input)
        setReviewedQuoteId(current.id)
        setNotice(null)
        setStep("review")
        window.scrollTo({ top: 0 })
    }

    if (step === "review" && collector && current) {
        const changed = reviewedQuoteId !== current.id
        return (
            <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-8">
                <h1 className="text-title font-bold">Revise seu pedido</h1>
                {changed && (
                    <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive p-4 text-sm">
                        <p>{notice ?? "Os valores ou a disponibilidade mudaram desde a sua revisão."} Confira o resumo atualizado abaixo.</p>
                        <Button type="button" variant="outline" className="w-fit" disabled={quote.isFetching} onClick={() => { setReviewedQuoteId(current.id); setNotice(null) }}>
                            Aceitar novos valores
                        </Button>
                    </div>
                )}
                {!changed && notice && <p role="alert" className="text-sm text-destructive">{notice}</p>}
                <QuoteLines quote={current} />
                <QuoteTotals quote={current} updating={quote.isFetching} />
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-surface-card p-4 text-sm">
                    <dt className="text-text-secondary">Colecionador</dt>
                    <dd>{collector.displayName} (@{collector.username})</dd>
                    <dt className="text-text-secondary">E-mail</dt>
                    <dd>{collector.email}</dd>
                    <dt className="text-text-secondary">Carteira</dt>
                    <dd>{wallet.alias} · {shortAddress(wallet.address)}</dd>
                    <dt className="text-text-secondary">Conexão</dt>
                    <dd>{PROVIDER_LABEL[provider]} · {NETWORK_LABEL[network]}</dd>
                </dl>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("form")} disabled={confirm.isPending}>Voltar e editar</Button>
                    <Button
                        type="button"
                        onClick={() => {
                            if (!confirm.isPending) confirm.mutate()
                        }}
                        disabled={confirm.isPending || changed || quote.isFetching}
                    >
                        {confirm.isPending ? (
                            <>
                                <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
                                Processando…
                            </>
                        ) : (
                            "Confirmar compra"
                        )}
                    </Button>
                </div>
                {confirm.isPending && <p role="status" className="text-sm text-text-secondary">Enviando pedido com segurança. Não feche esta página.</p>}
            </div>
        )
    }

    const option = (active: boolean) =>
        cn("flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary", active ? "border-primary" : "border-border")

    return (
        <div className={wrap}>
            <nav aria-label="Trilha" className="mb-6 text-sm text-text-secondary">
                <Link to="/" search={{}} className="hover:text-primary">Início</Link> / <Link to="/carrinho" className="hover:text-primary">Carrinho</Link> /{" "}
                <span aria-current="page" className="text-foreground">Pagamento</span>
            </nav>
            <form onSubmit={goToReview} noValidate className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
                <section aria-labelledby="perfil-colecionador" className="flex flex-col gap-5">
                    <h1 id="perfil-colecionador" className="text-ui font-bold">Perfil do colecionador</h1>
                    {Object.keys(errors).length > 0 && <p role="alert" className="text-sm text-destructive">Revise os campos destacados.</p>}
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field name="displayName" label="Nome de exibição" required defaultValue={collector?.displayName ?? user.displayName} error={errors.displayName} autoComplete="name" />
                        <Field name="username" label="Nome de usuário" required defaultValue={collector?.username ?? user.username} error={errors.username} autoComplete="username" />
                        <SelectField name="network" label="Rede" required value={network} onChange={(e) => setNetwork(e.target.value as Network)} error={errors.network} options={NETWORKS.map((n) => ({ value: n.slug, label: n.label }))} />
                        <Field name="profileName" label="Nome do perfil" required defaultValue={collector?.profileName ?? wallet.profileName} error={errors.profileName} />
                        <Field label="Endereço da carteira" readOnly value={wallet.address} />
                        <Field label="ENS ou carteira secundária (opcional)" readOnly value={wallet.secondaryAddress ?? "—"} />
                        <Field name="referralCode" label="Código de indicação" required defaultValue={collector?.referralCode ?? wallet.referralCode} error={errors.referralCode} />
                        <Field name="email" type="email" label="E-mail" required defaultValue={collector?.email ?? user.email} error={errors.email} autoComplete="email" />
                        <Field name="ensName" label="Nome ENS (.eth)" required defaultValue={collector?.ensName ?? user.ensName} error={errors.ensName} />
                    </div>
                    <TextAreaField name="note" label="Observação do colecionador (opcional)" defaultValue={collector?.note ?? ""} />
                </section>

                <aside aria-labelledby="seus-nfts" className="flex flex-col gap-5">
                    <h2 id="seus-nfts" className="text-ui font-bold">Seus NFTs</h2>
                    {current ? (
                        <>
                            <QuoteLines quote={current} />
                            <QuoteTotals quote={current} updating={quote.isFetching} />
                        </>
                    ) : quote.isError ? (
                        <ErrorState message={errorMessage(quote.error, "Não foi possível calcular o total.")} onRetry={() => void quote.refetch()} />
                    ) : (
                        <QuoteTotalsSkeleton />
                    )}

                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 font-bold">Carteira de destino</legend>
                        {wallets.map((w) => (
                            <label key={w.id} className={option(w.id === walletId)}>
                                <input type="radio" name="wallet" value={w.id} checked={w.id === walletId} onChange={() => chooseWallet(w.id)} className="accent-primary" />
                                <span>
                                    <span className="block font-bold">{w.alias}</span>
                                    <span className="text-text-secondary">{shortAddress(w.address)} · {NETWORK_LABEL[w.network]}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>

                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 font-bold">Carteira e rede</legend>
                        {PROVIDERS.map((p) => (
                            <label key={p.slug} className={option(provider === p.slug)}>
                                <input
                                    type="radio"
                                    name="provider"
                                    value={p.slug}
                                    checked={provider === p.slug}
                                    onChange={() => {
                                        setProvider(p.slug)
                                        setConnection({ status: "idle" })
                                    }}
                                    className="accent-primary"
                                />
                                {p.label}
                            </label>
                        ))}
                    </fieldset>

                    <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
                        <p role="status" aria-live="polite">
                            {connection.status === "connected"
                                ? `${PROVIDER_LABEL[provider]} conectada.`
                                : connection.status === "connecting"
                                    ? `Conectando ${PROVIDER_LABEL[provider]}…`
                                    : connection.status === "rejected"
                                        ? connection.message
                                        : "Carteira não conectada."}
                        </p>
                        {connection.status === "connected" ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => setConnection({ status: "idle" })}>Desconectar</Button>
                        ) : (
                            <Button id="conectar-carteira" type="button" variant="outline" size="sm" onClick={() => connect.mutate()} disabled={connection.status === "connecting"}>
                                {connection.status === "rejected" ? "Tentar conectar novamente" : `Conectar ${PROVIDER_LABEL[provider]}`}
                            </Button>
                        )}
                        {errors.connection && <p className="text-destructive">{errors.connection}</p>}
                    </div>

                    {notice && <p role="alert" className="text-sm text-destructive">{notice}</p>}
                    <Button type="submit" className="w-full" disabled={!current || quote.isFetching}>Revisar pedido</Button>
                </aside>
            </form>
        </div>
    )
}