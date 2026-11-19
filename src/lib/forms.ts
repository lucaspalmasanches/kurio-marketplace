import type { FieldErrors } from "@/api/validation"

export interface AuthSearch {
    redirect?: string
}

export function safeRedirect(value: unknown): string | undefined {
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined
}

/** Foca o primeiro campo com erro. Retorna true se havia erros. */
export function focusFirstError(form: HTMLFormElement, errors: FieldErrors): boolean {
    const first = Object.keys(errors)[0]
    if (!first) return false
    const element = form.elements.namedItem(first)
    if (element instanceof HTMLElement) element.focus()
    return true
}