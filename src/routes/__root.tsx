import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Link, Outlet, type ErrorComponentProps } from "@tanstack/react-router"
import { Toaster } from "sonner"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { RealtimeBridge } from "@/features/realtime-bridge"
import { MobileNav } from "@/components/layout/mobile-nav"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: RootLayout,
    notFoundComponent: NotFound,
    errorComponent: RootError,
})

function RootLayout() {
    return (
        <div className="flex min-h-dvh flex-col bg-background pb-20 text-foreground md:pb-0">
            <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
                Pular para o conteúdo
            </a>
            <Header />
            <main id="conteudo" className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <MobileNav />
            <RealtimeBridge />
            <Toaster theme="dark" position="top-center" richColors closeButton />
        </div>
    )
}

function NotFound() {
    return (
        <div className="mx-auto max-w-[1200px] px-4 py-16">
            <EmptyState
                title="Página não encontrada"
                description="O endereço acessado não existe."
                action={<Button asChild><Link to="/" search={{}}>Voltar ao início</Link></Button>}
            />
        </div>
    )
}

function RootError({ reset }: ErrorComponentProps) {
    return (
        <div className="mx-auto max-w-[1200px] px-4 py-16">
            <ErrorState message="Ocorreu um erro inesperado nesta tela." onRetry={reset} />
        </div>
    )
}