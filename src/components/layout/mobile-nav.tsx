import { Link } from "@tanstack/react-router"
import { Heart, Home, Search, ShoppingCart, UserRound } from "lucide-react"
import { useCart } from "@/features/cart"

export function MobileNav() {
    const cart = useCart()
    const count = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
    const item =
        "flex min-w-14 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[11px] text-text-secondary data-[status=active]:text-primary"

    return (
        <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card md:hidden">
            <ul className="mx-auto flex max-w-md items-end justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
                <li>
                    <Link to="/" search={{}} activeOptions={{ exact: true, includeSearch: false }} className={item}>
                        <Home aria-hidden className="size-5" />
                        Início
                    </Link>
                </li>
                <li>
                    <Link to="/favoritos" className={item}>
                        <Heart aria-hidden className="size-5" />
                        Favoritos
                    </Link>
                </li>
                <li>
                    <Link
                        to="/"
                        search={{}}
                        hash="catalogo"
                        aria-label="Explorar catálogo"
                        className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
                    >
                        <Search aria-hidden className="size-6" />
                    </Link>
                </li>
                <li>
                    <Link to="/carrinho" aria-label={`Carrinho, ${count} ${count === 1 ? "item" : "itens"}`} className={`${item} relative`}>
                        <ShoppingCart aria-hidden className="size-5" />
                        Carrinho
                        {count > 0 && (
                            <span aria-hidden="true" className="absolute right-1 top-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                {count}
                            </span>
                        )}
                    </Link>
                </li>
                <li>
                    <Link to="/perfil" className={item}>
                        <UserRound aria-hidden className="size-5" />
                        Perfil
                    </Link>
                </li>
            </ul>
        </nav>
    )
}