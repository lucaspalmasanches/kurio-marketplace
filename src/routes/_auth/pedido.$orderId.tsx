import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { LoaderCircle, MailOpen } from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { PROVIDER_LABEL } from "@/api/catalog"
import { errorMessage, isApiError } from "@/api/client"
import type { Order } from "@/api/contracts"
import { getOrder } from "@/api/endpoints"
import { EmptyState, ErrorState, PageSpinner } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate, shortAddress } from "@/lib/format"
import { recordResourceVersion } from "@/lib/realtime"
import { couponStore, pendingCheckoutStore } from "@/lib/stores"

export const Route = createFileRoute("/_auth/pedido/$orderId")({ component: OrderPage })

function Wrapper({ children }: { children: ReactNode }) {
    return <div className="mx-auto max-w-[720px] px-4 py-12">{children}</div>
}

function OrderPage() {
    const { orderId } = Route.useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const order = useQuery({
        queryKey: ["order", orderId],
        queryFn: async ({ signal }) => {
            const data = await getOrder(orderId, signal)
            recordResourceVersion("order", data.id, data.version)
            return data
        },
        // O evento order.updated é o caminho principal; a consulta periódica cobre quedas de conexão.
        refetchInterval: (query) => (query.state.data?.status === "pending" ? 5000 : false),
    })

    const status = order.data?.status
    useEffect(() => {
        if (status !== "confirmed" && status !== "declined") return
        if (pendingCheckoutStore.get()?.orderId === orderId) pendingCheckoutStore.set(null)
        if (status === "confirmed") {
            couponStore.set(null)
            void queryClient.invalidateQueries({ queryKey: ["cart"] })
        }
    }, [status, orderId, queryClient])

    if (order.isPending) return <PageSpinner label="Carregando pedido…" />
    if (order.isError) {
        const missing = isApiError(order.error) && (order.error.status === 404 || order.error.status === 403)
        return (
            <Wrapper>
                {missing ? (
                    <EmptyState title="Pedido não encontrado" description="Verifique o endereço do pedido." action={<Button asChild><Link to="/" search={{}}>Voltar ao início</Link></Button>} />
                ) : (
                    <ErrorState message={errorMessage(order.error, "Não foi possível carregar o pedido.")} onRetry={() => void order.refetch()} />
                )}
            </Wrapper>
        )
    }

    const data = order.data
    if (data.status === "pending") {
        return (
            <Wrapper>
                <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-nft bg-surface-card p-8 text-center">
                    <LoaderCircle aria-hidden className="size-10 animate-spin text-primary motion-reduce:animate-none" />
                    <h1 className="text-ui font-bold">Aguardando confirmação da rede</h1>
                    <p className="text-body text-text-secondary">Seu pedido foi enviado. Você pode recarregar esta página com segurança: a compra não será duplicada.</p>
                </div>
            </Wrapper>
        )
    }
    if (data.status === "declined") {
        return (
            <Wrapper>
                <div role="alert" className="flex flex-col items-center gap-4 rounded-nft bg-surface-card p-8 text-center">
                    <h1 className="text-ui font-bold">Pagamento recusado</h1>
                    <p className="text-body text-text-secondary">{data.declineReason ?? "A transação não foi concluída."} Seus itens continuam no carrinho.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Button asChild><Link to="/pagamento">Tentar novamente</Link></Button>
                        <Button asChild variant="outline"><Link to="/carrinho">Ver carrinho</Link></Button>
                    </div>
                </div>
            </Wrapper>
        )
    }
    return <Receipt order={data} onClose={() => void navigate({ to: "/", search: {} })} />
}

function Receipt({ order, onClose }: { order: Order; onClose: () => void }) {
    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-surface-card sm:max-w-[560px]">
                <DialogHeader className="items-center text-center">
                    <MailOpen aria-hidden className="size-14 text-primary" />
                    <DialogTitle className="text-ui font-bold">Seus NFTs agora estão na sua carteira</DialogTitle>
                    <DialogDescription>Recibo do pedido confirmado (transação simulada).</DialogDescription>
                </DialogHeader>
                <dl className="grid grid-cols-2 gap-3 border-y border-primary py-3 text-sm sm:grid-cols-4">
                    <div><dt className="font-bold">ID da transação</dt><dd>{shortAddress(order.txHash ?? "")}</dd></div>
                    <div><dt className="font-bold">Data</dt><dd>{formatDate(order.updatedAt)}</dd></div>
                    <div><dt className="font-bold">Total</dt><dd>{order.totalEth} ETH</dd></div>
                    <div><dt className="font-bold">Carteira</dt><dd>{PROVIDER_LABEL[order.provider]}</dd></div>
                </dl>
                <table className="w-full text-sm">
                    <caption className="mb-2 text-left font-bold">Detalhes da transação</caption>
                    <thead>
                        <tr className="border-b border-border">
                            <th scope="col" className="py-2 text-left">NFTs</th>
                            <th scope="col" className="py-2">Edições</th>
                            <th scope="col" className="py-2 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item) => (
                            <tr key={`${item.nftId}-${item.editionLabel}`}>
                                <td className="py-2">
                                    <div className="flex items-center gap-3">
                                        <img src={item.imageUrl} alt="" width={48} height={48} className="size-12 rounded-md object-cover" />
                                        <div>
                                            <p className="font-bold">{item.name}</p>
                                            <p className="text-text-secondary">ID do token: #{item.tokenId} · {item.editionLabel}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-center">(x {item.quantity})</td>
                                <td className="text-right font-bold text-primary">{item.lineTotalEth} ETH</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                    <dt>Desconto</dt><dd className="text-right">(-) {order.discountEth} ETH</dd>
                    <dt>Taxa de rede</dt><dd className="text-right">{order.networkFeeEth} ETH</dd>
                    <dt className="font-bold">Total</dt><dd className="text-right font-bold text-primary">{order.totalEth} ETH</dd>
                </dl>
                <p className="text-center text-sm text-text-secondary">Transação confirmada na rede (simulada). A propriedade foi registrada na carteira conectada.</p>
                <Button asChild className="mx-auto">
                    <a href={`https://etherscan.io/tx/${order.txHash ?? ""}`} target="_blank" rel="noopener noreferrer">Ver no Etherscan (link simulado)</a>
                </Button>
            </DialogContent>
        </Dialog>
    )
}