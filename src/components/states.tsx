import { LoaderCircle } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function ErrorState({ title = "Algo deu errado", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-nft bg-surface-card p-8 text-center">
            <p className="text-ui font-bold">{title}</p>
            <p className="text-body text-text-secondary">{message}</p>
            {onRetry && <Button onClick={onRetry}>Tentar novamente</Button>}
        </div>
    )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div role="status" className="flex flex-col items-center gap-3 rounded-nft bg-surface-card p-8 text-center">
            <p className="text-ui font-bold">{title}</p>
            {description && <p className="text-body text-text-secondary">{description}</p>}
            {action}
        </div>
    )
}

export function PageSpinner({ label }: { label: string }) {
    return (
        <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-text-secondary">
            <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
            {label}
        </div>
    )
}