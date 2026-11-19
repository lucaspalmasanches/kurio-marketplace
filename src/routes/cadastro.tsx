import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { errorMessage, isApiError } from "@/api/client"
import { register } from "@/api/endpoints"
import { validateRegister, type FieldErrors } from "@/api/validation"
import { AuthCard } from "@/components/auth-card"
import { Field, PasswordField } from "@/components/field"
import { Button } from "@/components/ui/button"
import { startSession } from "@/features/session"
import { focusFirstError, safeRedirect, type AuthSearch } from "@/lib/forms"

export const Route = createFileRoute("/cadastro")({
    validateSearch: (search: Record<string, unknown>): AuthSearch => ({ redirect: safeRedirect(search.redirect) }),
    component: RegisterPage,
})

function RegisterPage() {
    const { redirect } = Route.useSearch()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [errors, setErrors] = useState<FieldErrors>({})
    const [formError, setFormError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: register,
        onSuccess: async (auth) => {
            await startSession(queryClient, auth)
            toast.success("Conta criada com sucesso!")
            router.history.push(redirect ?? "/")
        },
        onError: (error) => {
            if (isApiError(error) && error.fieldErrors) setErrors(error.fieldErrors)
            setFormError(errorMessage(error, "Não foi possível criar a conta."))
        },
    })

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const input = {
            username: String(data.get("username") ?? "").trim(),
            email: String(data.get("email") ?? "").trim(),
            password: String(data.get("password") ?? ""),
        }
        const found = validateRegister(input)
        if (!found.password && data.get("confirmPassword") !== input.password) {
            found.confirmPassword = "As senhas não conferem."
        }
        setErrors(found)
        setFormError(null)
        if (focusFirstError(event.currentTarget, found)) return
        mutation.mutate(input)
    }

    return (
        <AuthCard mode="register" redirect={redirect}>
            <p className="mb-5 text-center text-sm text-text-secondary">Crie seu perfil de colecionador e conecte uma carteira quando quiser.</p>
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                {formError && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{formError}</p>}
                <Field name="username" label="Nome de usuário" autoComplete="username" error={errors.username} required />
                <Field name="email" type="email" label="E-mail" autoComplete="email" error={errors.email} required />
                <PasswordField name="password" label="Senha" autoComplete="new-password" error={errors.password} required />
                <PasswordField name="confirmPassword" label="Confirmar senha" autoComplete="new-password" error={errors.confirmPassword} required />
                <Button type="submit" disabled={mutation.isPending} className="w-full">{mutation.isPending ? "Criando…" : "Criar conta"}</Button>
            </form>
        </AuthCard>
    )
}