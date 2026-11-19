import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AuthCard({ mode, redirect, children }: { mode: "login" | "register"; redirect?: string; children: ReactNode }) {
    const tab = (active: boolean) => cn("text-ui", active ? "font-bold text-primary" : "text-foreground hover:text-primary")
    return (
        <div className="mx-auto w-full max-w-md px-4 py-12">
            <div className="rounded-nft border-b-4 border-primary bg-surface-card p-6 sm:p-8">
                <nav aria-label="Acesso" className="mb-6 flex justify-center gap-3">
                    <Link to="/login" search={{ redirect }} className={tab(mode === "login")} aria-current={mode === "login" ? "page" : undefined}>
                        Entrar
                    </Link>
                    <span aria-hidden="true">|</span>
                    <Link to="/cadastro" search={{ redirect }} className={tab(mode === "register")} aria-current={mode === "register" ? "page" : undefined}>
                        Criar conta
                    </Link>
                </nav>
                {children}
                <div className="mt-6 flex flex-col gap-2">
                    <p className="text-center text-xs text-text-secondary">Ou continue com</p>
                    <Button variant="outline" disabled className="w-full">Google (em breve)</Button>
                    <Button variant="outline" disabled className="w-full">Facebook (em breve)</Button>
                </div>
            </div>
        </div>
    )
}