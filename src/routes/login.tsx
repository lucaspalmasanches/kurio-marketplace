import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { errorMessage, isApiError } from "@/api/client"
import { login } from "@/api/endpoints"
import { validateLogin, type FieldErrors } from "@/api/validation"
import { AuthCard } from "@/components/auth-card"
import { Field, PasswordField } from "@/components/field"
import { Button } from "@/components/ui/button"
import { startSession } from "@/features/session"
import { focusFirstError, safeRedirect, type AuthSearch } from "@/lib/forms"

export const Route = createFileRoute("/login")({
    validateSearch: (search: Record<string, unknown>): AuthSearch => ({ redirect: safeRedirect(search.redirect) }),
    component: LoginPage,
})

function LoginPage() {
    const { redirect } = Route.useSearch()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [errors, setErrors] = useState<FieldErrors>({})
    const [formError, setFormError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: login,
        onSuccess: async (auth) => {
            await startSession(queryClient, auth)
            toast.success(`Olá, ${auth.session.user.displayName}!`)
            router.history.push(redirect ?? "/")
        },
        onError: (error) => {
            if (isApiError(error) && error.fieldErrors) setErrors(error.fieldErrors)
            setFormError(errorMessage(error, "Não foi possível entrar. Tente novamente."))
        },
    })

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const input = { email: String(data.get("email") ?? "").trim(), password: String(data.get("password") ?? "") }
        const found = validateLogin(input)
        setErrors(found)
        setFormError(null)
        if (focusFirstError(event.currentTarget, found)) return
        mutation.mutate(input)
    }

    return (
        <AuthCard mode="login" redirect={redirect}>
            <p className="mb-5 text-center text-sm text-text-secondary">Entre para gerenciar sua carteira, coleção e perfil de criador.</p>
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                {formError && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{formError}</p>}
                <Field name="email" type="email" label="E-mail" autoComplete="email" placeholder="contato@email.com" error={errors.email} required />
                <PasswordField name="password" label="Senha" autoComplete="current-password" error={errors.password} required />
                <Button type="submit" disabled={mutation.isPending} className="w-full">{mutation.isPending ? "Entrando…" : "Entrar"}</Button>
            </form>
        </AuthCard>
    )
}