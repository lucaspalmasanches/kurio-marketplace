import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { NETWORKS, PROVIDERS } from "@/api/catalog"
import { errorMessage, isApiError } from "@/api/client"
import type { Network, Wallet, WalletInput, WalletKind, WalletProvider } from "@/api/contracts"
import { createWallet, updateWallet } from "@/api/endpoints"
import { validateWallet, type FieldErrors } from "@/api/validation"
import { AccountLayout } from "@/components/account-layout"
import { Field, SelectField } from "@/components/field"
import { ErrorState, PageSpinner } from "@/components/states"
import { Button } from "@/components/ui/button"
import { useSession } from "@/features/session"
import { useWallets } from "@/features/wallets"
import { focusFirstError } from "@/lib/forms"

export const Route = createFileRoute("/_auth/carteiras")({ component: WalletsPage })

function WalletsPage() {
    const wallets = useWallets()
    return (
        <AccountLayout>
            {wallets.isPending ? (
                <PageSpinner label="Carregando carteiras…" />
            ) : wallets.isError ? (
                <ErrorState message={errorMessage(wallets.error, "Não foi possível carregar as carteiras.")} onRetry={() => void wallets.refetch()} />
            ) : (
                <WalletsEditor wallets={wallets.data} />
            )}
        </AccountLayout>
    )
}

function WalletsEditor({ wallets }: { wallets: Wallet[] }) {
    const primary = wallets.find((w) => w.kind === "primary")
    const secondary = wallets.find((w) => w.kind === "secondary")
    const [addingSecondary, setAddingSecondary] = useState(false)

    return (
        <div className="flex flex-col gap-12">
            <h1 className="sr-only">Carteiras</h1>
            <WalletForm
                kind="primary"
                title="Carteira principal"
                description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
                wallet={primary}
            />
            {secondary || addingSecondary ? (
                <WalletForm
                    kind="secondary"
                    title="Carteira secundária"
                    wallet={secondary}
                    copyFrom={primary}
                    onCancel={secondary ? undefined : () => setAddingSecondary(false)}
                />
            ) : (
                <section aria-labelledby="secundaria-vazia" className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="secundaria-vazia" className="text-ui font-bold">Carteira secundária</h2>
                        <Button variant="link" className="text-primary" onClick={() => setAddingSecondary(true)}>Adicionar</Button>
                    </div>
                    <p className="text-sm text-text-secondary">Você ainda não adicionou uma carteira secundária.</p>
                </section>
            )}
        </div>
    )
}

interface WalletFormProps {
    kind: WalletKind
    title: string
    description?: string
    wallet?: Wallet
    copyFrom?: Wallet
    onCancel?: () => void
}

function WalletForm({ kind, title, description, wallet, copyFrom, onCancel }: WalletFormProps) {
    const { user } = useSession()
    const queryClient = useQueryClient()
    const [errors, setErrors] = useState<FieldErrors>({})
    const [values, setValues] = useState<Partial<Wallet> | undefined>(wallet)
    const [formVersion, setFormVersion] = useState(0)
    const headingId = `carteira-${kind}`

    const mutation = useMutation({
        mutationFn: (input: WalletInput) => (wallet ? updateWallet(wallet.id, input) : createWallet({ ...input, kind })),
        onSuccess: () => {
            setErrors({})
            void queryClient.invalidateQueries({ queryKey: ["wallets", user?.id] })
            toast.success(`${title} salva.`)
        },
        onError: (error) => {
            if (isApiError(error) && error.fieldErrors) setErrors(error.fieldErrors)
            toast.error(errorMessage(error, "Não foi possível salvar a carteira."))
        },
    })

    const copyPrimary = () => {
        if (!copyFrom) return
        setValues({ ...copyFrom })
        setFormVersion((v) => v + 1) // remonta o formulário com os novos valores
        setErrors({})
    }

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const value = (name: string) => String(data.get(name) ?? "").trim()
        const input: WalletInput = {
            displayName: value("displayName"),
            alias: value("alias"),
            profileName: value("profileName"),
            network: value("network") as Network,
            address: value("address"),
            secondaryAddress: value("secondaryAddress") || undefined,
            provider: value("provider") as WalletProvider,
            referralCode: value("referralCode"),
            email: value("email"),
            ensName: value("ensName"),
        }
        const found = validateWallet(input)
        setErrors(found)
        if (focusFirstError(event.currentTarget, found)) return
        mutation.mutate(input)
    }

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id={headingId} className="text-ui font-bold">{title}</h2>
                    {description && <p className="text-sm text-text-secondary">{description}</p>}
                </div>
                {copyFrom && (
                    <Button type="button" variant="outline" size="sm" onClick={copyPrimary}>Igual à carteira principal</Button>
                )}
            </div>
            <form key={formVersion} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field name="displayName" label="Nome de exibição" required defaultValue={values?.displayName ?? user?.displayName} error={errors.displayName} />
                    <Field name="alias" label="Apelido da carteira" required defaultValue={values?.alias} error={errors.alias} />
                    <SelectField
                        name="network"
                        label="Rede"
                        required
                        defaultValue={values?.network ?? ""}
                        error={errors.network}
                        options={[{ value: "", label: "Selecione uma rede" }, ...NETWORKS.map((n) => ({ value: n.slug, label: n.label }))]}
                    />
                    <Field name="profileName" label="Nome do perfil" required defaultValue={values?.profileName ?? user?.displayName} error={errors.profileName} />
                    <Field name="address" label="Endereço da carteira" required placeholder="Endereço 0x da carteira" defaultValue={values?.address} error={errors.address} />
                    <Field name="secondaryAddress" label="ENS ou carteira secundária (opcional)" placeholder="nome.eth ou 0x…" defaultValue={values?.secondaryAddress} error={errors.secondaryAddress} />
                    <SelectField
                        name="provider"
                        label="Tipo de carteira"
                        required
                        defaultValue={values?.provider ?? ""}
                        error={errors.provider}
                        options={[{ value: "", label: "Selecione uma carteira" }, ...PROVIDERS.map((p) => ({ value: p.slug, label: p.label }))]}
                    />
                    <Field name="referralCode" label="Código de indicação" required defaultValue={values?.referralCode} error={errors.referralCode} />
                    <Field name="email" type="email" label="E-mail" required defaultValue={values?.email ?? user?.email} error={errors.email} />
                    <Field name="ensName" label="Nome ENS (.eth)" required defaultValue={values?.ensName ?? user?.ensName} error={errors.ensName} />
                </div>
                <div className="flex gap-3">
                    <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando…" : "Salvar carteira"}</Button>
                    {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
                </div>
            </form>
        </section>
    )
}