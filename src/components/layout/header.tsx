import { Link, useNavigate } from "@tanstack/react-router"
import { LogIn, LogOut, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart"
import { useLogout, useSession } from "@/features/session"

export function Header() {
    const { user } = useSession()
    const cart = useCart()
    const logout = useLogout()
    const navigate = useNavigate()
    const count = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

    const onLogout = async () => {
        await logout()
        toast.success("Você saiu da sua conta.")
        void navigate({ to: "/", search: {} })
    }

    return (
        <header className="border-b border-border">
            <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 lg:px-0">
                <Link to="/" search={{}} aria-label="Kurio, página inicial" className="text-sm font-bold tracking-[0.25em]">
                    KURIO
                </Link>
                <nav aria-label="Principal" className="hidden md:block">
                    <ul className="flex items-center gap-8 text-ui">
                        <li>
                            <Link
                                to="/"
                                search={{}}
                                activeOptions={{ exact: true, includeSearch: false }}
                                activeProps={{ className: "border-b-2 border-primary font-bold text-primary" }}
                                className="pb-1"
                            >
                                Início
                            </Link>
                        </li>
                        <li>
                            <Link to="/" search={{}} hash="catalogo" className="pb-1 hover:text-primary">Mercado</Link>
                        </li>
                        <li><span aria-disabled="true" title="Em breve" className="cursor-not-allowed text-text-secondary">Criadores</span></li>
                        <li><span aria-disabled="true" title="Em breve" className="cursor-not-allowed text-text-secondary">Aprenda</span></li>
                    </ul>
                </nav>
                <div className="flex items-center gap-3">
                    <Link
                        to="/carrinho"
                        aria-label={`Carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
                        className="relative hidden size-10 place-items-center rounded-full hover:bg-muted md:grid"
                    >
                        <ShoppingCart aria-hidden className="size-5" />
                        {count > 0 && (
                            <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                {count}
                            </span>
                        )}
                    </Link>
                    {user ? (
                        <>
                            <Link to="/perfil" className="hidden max-w-32 truncate text-sm hover:text-primary sm:inline">{user.displayName}</Link>
                            <Button variant="outline" size="sm" onClick={onLogout}>
                                <LogOut aria-hidden />
                                Sair
                            </Button>
                        </>
                    ) : (
                        <Button asChild size="sm">
                            <Link to="/login" search={{}}>
                                <LogIn aria-hidden />
                                Entrar
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}