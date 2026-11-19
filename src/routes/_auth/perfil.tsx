import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { UserRound } from "lucide-react"
import { useState, type ChangeEvent, type FormEvent } from "react"
import { toast } from "sonner"
import { errorMessage, isApiError } from "@/api/client"
import type { Session, UpdateProfileInput, User } from "@/api/contracts"
import { changePassword, getProfile, updateAvatar, updateProfile } from "@/api/endpoints"
import { validatePasswordChange, validateProfile, type FieldErrors } from "@/api/validation"
import { AccountLayout } from "@/components/account-layout"
import { Field, PasswordField } from "@/components/field"
import { ErrorState, PageSpinner } from "@/components/states"
import { Button } from "@/components/ui/button"
import { useSession } from "@/features/session"
import { focusFirstError } from "@/lib/forms"

export const Route = createFileRoute("/_auth/perfil")({ component: ProfilePage })

function ProfilePage() {
    const { user } = useSession()
    const profile = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: ({ signal }) => getProfile(signal),
        enabled: Boolean(user),
    })

    return (
        <AccountLayout>
            {profile.isPending ? (
                <PageSpinner label="Carregando perfil…" />
            ) : profile.isError ? (
                <ErrorState message={errorMessage(profile.error, "Não foi possível carregar o perfil.")} onRetry={() => void profile.refetch()} />
            ) : (
                <div className="flex flex-col gap-12">
                    <ProfileForm user={profile.data} />
                    <AvatarEditor user={profile.data} />
                    <PasswordForm />
                </div>
            )}
        </AccountLayout>
    )
}

/** Mantém perfil e sessão coerentes no cache (o nome no cabeçalho atualiza na hora). */
function useSyncUser() {
    const queryClient = useQueryClient()
    const { token, user } = useSession()
    return (next: User) => {
        queryClient.setQueryData(["profile", user?.id], next)
        queryClient.setQueryData<Session>(["session", token], (old) => (old ? { ...old, user: next } : old))
    }
}

function ProfileForm({ user }: { user: User }) {
    const sync = useSyncUser()
    const [errors, setErrors] = useState<FieldErrors>({})

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (next) => {
            sync(next)
            setErrors({})
            toast.success("Perfil atualizado.")
        },
        onError: (error) => {
            if (isApiError(error) && error.fieldErrors) setErrors(error.fieldErrors)
            toast.error(errorMessage(error, "Não foi possível salvar o perfil."))
        },
    })

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const value = (name: string) => String(data.get(name) ?? "").trim()
        const input: UpdateProfileInput = {
            displayName: value("displayName"),
            username: value("username"),
            email: value("email"),
            ensName: value("ensName"),
            walletAlias: value("walletAlias"),
        }
        const found = validateProfile(input)
        setErrors(found)
        if (focusFirstError(event.currentTarget, found)) return
        mutation.mutate(input)
    }

    return (
        <section aria-labelledby="perfil-titulo" className="flex flex-col gap-5">
            <h1 id="perfil-titulo" className="text-ui font-bold">Perfil do colecionador</h1>
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field name="displayName" label="Nome de exibição" required defaultValue={user.displayName} error={errors.displayName} autoComplete="name" />
                    <Field name="username" label="Nome de usuário" required defaultValue={user.username} error={errors.username} autoComplete="username" />
                    <Field name="email" type="email" label="E-mail" required defaultValue={user.email} error={errors.email} autoComplete="email" />
                    <Field name="ensName" label="Nome ENS (.eth)" required defaultValue={user.ensName} error={errors.ensName} />
                    <Field name="walletAlias" label="Apelido da carteira" required defaultValue={user.walletAlias} error={errors.walletAlias} />
                </div>
                <Button type="submit" className="w-fit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Salvando…" : "Salvar"}
                </Button>
            </form>
        </section>
    )
}

const MAX_AVATAR_BYTES = 280_000

function AvatarEditor({ user }: { user: User }) {
    const sync = useSyncUser()
    const [error, setError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: updateAvatar,
        onSuccess: (next) => {
            sync(next)
            setError(null)
            toast.success(next.avatarUrl ? "Avatar atualizado." : "Avatar removido.")
        },
        onError: (err) => setError(errorMessage(err, "Não foi possível atualizar o avatar.")),
    })

    const onFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return
        if (!file.type.startsWith("image/")) {
            setError("Escolha um arquivo de imagem.")
            return
        }
        if (file.size > MAX_AVATAR_BYTES) {
            setError("A imagem deve ter até 280 KB.")
            return
        }
        const reader = new FileReader()
        reader.onload = () => mutation.mutate({ avatarUrl: String(reader.result) })
        reader.onerror = () => setError("Não foi possível ler a imagem.")
        reader.readAsDataURL(file)
    }

    return (
        <section aria-labelledby="avatar-titulo" className="flex flex-col gap-3">
            <h2 id="avatar-titulo" className="font-bold">Avatar</h2>
            <div className="flex flex-wrap items-center gap-4">
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Seu avatar" width={64} height={64} className="size-16 rounded-full object-cover" />
                ) : (
                    <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-surface-dark">
                        <UserRound className="size-6 text-primary" />
                    </span>
                )}
                <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
                    {mutation.isPending ? "Enviando…" : "Alterar"}
                    <input type="file" accept="image/*" onChange={onFile} disabled={mutation.isPending} className="sr-only" />
                </label>
                <Button type="button" variant="ghost" disabled={!user.avatarUrl || mutation.isPending} onClick={() => mutation.mutate({ avatarUrl: null })}>
                    Remover
                </Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </section>
    )
}

function PasswordForm() {
    const [errors, setErrors] = useState<FieldErrors>({})

    const mutation = useMutation({
        mutationFn: changePassword,
        onError: (error) => {
            if (isApiError(error) && error.fieldErrors) setErrors(error.fieldErrors)
            else toast.error(errorMessage(error, "Não foi possível alterar a senha."))
        },
    })

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const input = {
            currentPassword: String(data.get("currentPassword") ?? ""),
            newPassword: String(data.get("newPassword") ?? ""),
        }
        const found = validatePasswordChange(input)
        if (!found.newPassword && data.get("confirmNewPassword") !== input.newPassword) {
            found.confirmNewPassword = "As senhas não conferem."
        }
        setErrors(found)
        if (focusFirstError(form, found)) return
        mutation.mutate(input, {
            onSuccess: () => {
                form.reset()
                setErrors({})
                toast.success("Senha alterada com sucesso.")
            },
        })
    }

    return (
        <section aria-labelledby="senha-titulo" className="flex flex-col gap-5">
            <h2 id="senha-titulo" className="font-bold">Alterar senha</h2>
            <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
                <PasswordField name="currentPassword" label="Senha atual" autoComplete="current-password" error={errors.currentPassword} />
                <PasswordField name="newPassword" label="Nova senha" autoComplete="new-password" error={errors.newPassword} />
                <PasswordField name="confirmNewPassword" label="Confirmar nova senha" autoComplete="new-password" error={errors.confirmNewPassword} />
                <Button type="submit" className="w-fit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Alterando…" : "Alterar senha"}
                </Button>
            </form>
        </section>
    )
}