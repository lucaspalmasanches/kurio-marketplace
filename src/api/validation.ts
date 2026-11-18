import type {
    ChangePasswordInput,
    LoginInput,
    RegisterInput,
    UpdateProfileInput,
    WalletInput,
    CollectorInput,
    CreateOrderInput,
} from "./contracts"

export type FieldErrors = Record<string, string>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/i
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const ENS_NAME_RE = /^[a-z0-9-]{3,}$/i
const ENS_FULL_RE = /^([a-z0-9-]+\.)+eth$/i
const NETWORKS: string[] = ["ethereum", "polygon", "solana"]
const PROVIDERS: string[] = ["metamask", "walletconnect", "coinbase"]

const isBlank = (value: string | undefined | null) => !value || value.trim() === ""

function checkEmail(value: string): string | null {
    if (isBlank(value)) return "Informe o e-mail."
    return EMAIL_RE.test(value.trim()) ? null : "E-mail inválido."
}

function checkUsername(value: string): string | null {
    if (isBlank(value)) return "Informe o nome de usuário."
    return USERNAME_RE.test(value.trim()) ? null : "Use de 3 a 20 letras, números ou _."
}

function checkPassword(value: string): string | null {
    if (isBlank(value)) return "Informe a senha."
    if (value.length < 8) return "A senha deve ter ao menos 8 caracteres."
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use letras e números na senha."
    return null
}

function checkEns(value: string): string | null {
    if (isBlank(value)) return "Informe o nome ENS."
    return ENS_NAME_RE.test(value.trim()) ? null : "Use letras, números ou hífen (mínimo 3)."
}

function checkSecondary(value: string | undefined): string | null {
    const v = value?.trim()
    if (!v) return null
    return ADDRESS_RE.test(v) || ENS_FULL_RE.test(v)
        ? null
        : "Use um endereço 0x… ou um nome ENS (.eth)."
}

function collect(entries: Array<[string, string | null]>): FieldErrors {
    const errors: FieldErrors = {}
    for (const [field, message] of entries) {
        if (message) errors[field] = message
    }
    return errors
}

export function validateRegister(input: RegisterInput): FieldErrors {
    return collect([
        ["username", checkUsername(input.username)],
        ["email", checkEmail(input.email)],
        ["password", checkPassword(input.password)],
    ])
}

export function validateLogin(input: LoginInput): FieldErrors {
    return collect([
        ["email", checkEmail(input.email)],
        ["password", isBlank(input.password) ? "Informe a senha." : null],
    ])
}

export function validateProfile(input: UpdateProfileInput): FieldErrors {
    return collect([
        ["displayName", isBlank(input.displayName) ? "Informe o nome de exibição." : null],
        ["username", checkUsername(input.username)],
        ["email", checkEmail(input.email)],
        ["ensName", checkEns(input.ensName)],
        ["walletAlias", isBlank(input.walletAlias) ? "Informe o apelido da carteira." : null],
    ])
}

export function validatePasswordChange(input: ChangePasswordInput): FieldErrors {
    const errors = collect([
        ["currentPassword", isBlank(input.currentPassword) ? "Informe a senha atual." : null],
        ["newPassword", checkPassword(input.newPassword)],
    ])
    if (!errors.newPassword && input.newPassword === input.currentPassword) {
        errors.newPassword = "A nova senha deve ser diferente da atual."
    }
    return errors
}

export function validateWallet(input: WalletInput): FieldErrors {
    return collect([
        ["displayName", isBlank(input.displayName) ? "Informe o nome de exibição." : null],
        ["alias", isBlank(input.alias) ? "Informe o apelido da carteira." : null],
        ["profileName", isBlank(input.profileName) ? "Informe o nome do perfil." : null],
        ["network", NETWORKS.includes(input.network) ? null : "Selecione uma rede."],
        [
            "address",
            isBlank(input.address)
                ? "Informe o endereço da carteira."
                : ADDRESS_RE.test(input.address.trim())
                    ? null
                    : "Endereço inválido (use 0x seguido de 40 caracteres hexadecimais).",
        ],
        ["secondaryAddress", checkSecondary(input.secondaryAddress)],
        ["provider", PROVIDERS.includes(input.provider) ? null : "Selecione o tipo de carteira."],
        ["referralCode", isBlank(input.referralCode) ? "Informe o código de indicação." : null],
        ["email", checkEmail(input.email)],
        ["ensName", checkEns(input.ensName)],
    ])
}

export function validateOrderInput(input: CreateOrderInput): FieldErrors {
    const c: Partial<CollectorInput> = input.collector ?? {}
    return collect([
        ["quoteId", isBlank(input.quoteId) ? "Cotação ausente. Revise o pedido." : null],
        ["items", Array.isArray(input.items) && input.items.length > 0 ? null : "O pedido não tem itens."],
        ["walletId", isBlank(input.walletId) ? "Selecione uma carteira." : null],
        ["provider", PROVIDERS.includes(input.provider) ? null : "Selecione o tipo de carteira."],
        ["network", NETWORKS.includes(input.network) ? null : "Selecione uma rede."],
        ["displayName", isBlank(c.displayName) ? "Informe o nome de exibição." : null],
        ["username", checkUsername(c.username ?? "")],
        ["profileName", isBlank(c.profileName) ? "Informe o nome do perfil." : null],
        ["email", checkEmail(c.email ?? "")],
        ["ensName", checkEns(c.ensName ?? "")],
        ["referralCode", isBlank(c.referralCode) ? "Informe o código de indicação." : null],
    ])
}