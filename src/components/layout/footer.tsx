import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const FEATURES = [
    { letter: "W", title: "Segurança da carteira", text: "Proteja sua carteira e colecione arte digital verificada com confiança." },
    { letter: "C", title: "Criadores em destaque", text: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede." },
    { letter: "D", title: "Alertas de lançamentos", text: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado." },
]

const COLUMNS = [
    { title: "Meu perfil", items: ["Meu perfil", "Minha coleção", "Atividade", "Estúdio do criador", "Lista de interesse"] },
    { title: "Central de ajuda", items: ["Central de ajuda", "Como comprar NFTs", "Carteira e segurança", "Política do mercado", "Denunciar item"] },
    { title: "Coleções", items: ["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"] },
]

export function Footer() {
    return (
        <footer className="mx-auto mt-16 w-full max-w-[1200px] px-4 pb-8 lg:px-0">
            <div className="grid gap-8 rounded-t-nft bg-surface-card p-8 md:grid-cols-4">
                {FEATURES.map((f) => (
                    <div key={f.letter} className="flex flex-col gap-3 md:border-r md:border-border md:pr-6">
                        <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-primary font-bold text-ink">{f.letter}</span>
                        <h2 className="font-bold">{f.title}</h2>
                        <p className="text-sm text-text-secondary">{f.text}</p>
                    </div>
                ))}
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        toast.info("A newsletter não está disponível nesta demonstração.")
                    }}
                    className="flex flex-col gap-3"
                >
                    <h2 className="font-bold">Antecipe-se ao próximo lançamento</h2>
                    <div className="flex">
                        <label htmlFor="newsletter" className="sr-only">E-mail</label>
                        <input id="newsletter" type="email" placeholder="digite seu e-mail..." className="h-9 min-w-0 flex-1 rounded-l-[5px] border border-border bg-background px-2 text-sm placeholder:text-text-secondary" />
                        <Button type="submit" size="sm" className="h-9 rounded-l-none">Enviar</Button>
                    </div>
                    <p className="text-xs text-text-secondary">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
                </form>
            </div>
            <div className="grid gap-3 bg-surface-dark px-8 py-5 text-sm md:grid-cols-4">
                <p className="font-bold tracking-[0.2em]">KURIO</p>
                <p>Feito para colecionadores, criadores e cultura</p>
                <p>contato@email.com</p>
                <p>+55 11 4002 8922</p>
            </div>
            <div className="grid gap-8 bg-surface-card px-8 py-8 sm:grid-cols-2 md:grid-cols-4">
                {COLUMNS.map((c) => (
                    <div key={c.title}>
                        <h2 className="mb-3 font-bold">{c.title}</h2>
                        <ul className="flex flex-col gap-2 text-sm text-text-secondary">
                            {c.items.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </div>
                ))}
                <div>
                    <h2 className="mb-3 font-bold">Carteiras compatíveis</h2>
                    <p className="text-xs text-text-secondary">METAMASK · WALLETCONNECT · COINBASE</p>
                </div>
            </div>
            <p className="bg-surface-card pb-6 text-center text-xs text-text-secondary">© 2026 Kurio. Propriedade digital para todos.</p>
        </footer>
    )
}