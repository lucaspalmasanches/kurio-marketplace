import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { listNfts } from "@/api/nfts"

export const Route = createFileRoute("/")({
    component: Home,
})

function Home() {
    const { data, isPending, error } = useQuery({
        queryKey: ["nfts", "list", {}],
        queryFn: ({ signal }) => listNfts({}, signal),
    })

    if (isPending) return <p className="p-8">Carregando…</p>
    if (error) return <p className="p-8">Erro ao carregar.</p>

    return (
        <div className="p-8">
            <p>Total: {data.total}</p>
            <ul>
                {data.items.map((n) => (
                    <li key={n.id}>
                        {n.name} — {n.priceEth} ETH
                    </li>
                ))}
            </ul>
        </div>
    )
}