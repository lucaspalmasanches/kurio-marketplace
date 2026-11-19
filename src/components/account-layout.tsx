import { Link, useNavigate } from "@tanstack/react-router"
import { LogOut, UserRound, Wallet, Heart } from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { useLogout } from "@/features/session"

const SOON = ["Atividade", "Ofertas", "Arquivos baixados", "Suporte"]

export function AccountLayout({ children }: { children: ReactNode }) {
    const logout = useLogout()
    const navigate = useNavigate()
    const item =
        "flex items-center gap-3 border-l-4 border-transparent px-4 py-2 text-sm text-primary hover:bg-muted data-[status=active]:border-primary data-[status=active]:bg-muted"

    const onLogout = async () => {
        await logout()
        toast.success("Você saiu da sua conta.")
        void navigate({ to: "/", search: {} })
    }

    return (
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-0">
            <nav aria-label="Minha conta" className="h-fit rounded-md bg-surface-card py-3">
                <p className="px-4 pb-2 text-ui font-bold">Meu perfil</p>
                <ul>
                    <li>
                        <Link to="/perfil" className={item}>
                            <UserRound aria-hidden className="size-4" />
                            Dados do perfil
                        </Link>
                    </li>
                    <li>
                        <Link to="/carteiras" className={item}>
                            <Wallet aria-hidden className="size-4" />
                            Carteiras
                        </Link>
                    </li>
                    <li>
                        <Link to="/favoritos" className={item}>
                            <Heart aria-hidden className="size-4" />
                            Lista de interesse
                        </Link>
                    </li>
                    {SOON.map((label) => (
                        <li key={label}>
                            <span aria-disabled="true" title="Em breve" className="block cursor-not-allowed px-5 py-2 text-sm text-text-secondary">{label}</span>
                        </li>
                    ))}
                    <li className="mt-2 border-t border-border pt-2">
                        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 px-5 py-2 text-sm font-bold text-primary hover:bg-muted">
                            <LogOut aria-hidden className="size-4" />
                            Sair
                        </button>
                    </li>
                </ul>
            </nav>
            <div className="min-w-0">{children}</div>
        </div>
    )
}