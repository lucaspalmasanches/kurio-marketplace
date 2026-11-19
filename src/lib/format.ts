export function shortAddress(value: string): string {
    return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
}

export function formatDate(iso: string): string {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso))
}