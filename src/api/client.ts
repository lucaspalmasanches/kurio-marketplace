import axios from "axios"
import type { ApiErrorBody, ApiErrorCode } from "./contracts"
import { getGuestCartId, tokenStore } from "@/lib/stores"
import { whenMocksReady } from "@/lib/mocks-ready"

export type ClientErrorCode = ApiErrorCode | "NETWORK_ERROR"

export class ApiError extends Error {
    readonly status: number
    readonly code: ClientErrorCode
    readonly fieldErrors?: Record<string, string>

    constructor(status: number, code: ClientErrorCode, message: string, fieldErrors?: Record<string, string>) {
        super(message)
        this.name = "ApiError"
        this.status = status
        this.code = code
        this.fieldErrors = fieldErrors
    }
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
}

export function errorMessage(error: unknown, fallback = "Ocorreu um erro inesperado."): string {
    return isApiError(error) ? error.message : fallback
}

let unauthorizedHandler: ((error: ApiError) => void) | null = null
export function setUnauthorizedHandler(handler: ((error: ApiError) => void) | null): void {
    unauthorizedHandler = handler
}

export const api = axios.create({
    baseURL: "/api",
    timeout: 10_000,
    headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use(async (config) => {
    await whenMocksReady()
    const token = tokenStore.get()
    if (token) config.headers.set("Authorization", `Bearer ${token}`)
    config.headers.set("x-cart-id", getGuestCartId())
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isCancel(error)) return Promise.reject(error)
        if (!axios.isAxiosError(error) || !error.response) {
            return Promise.reject(
                new ApiError(0, "NETWORK_ERROR", "Falha de conexão. Verifique sua internet e tente novamente."),
            )
        }
        const { status, data } = error.response
        const body = (data ?? {}) as Partial<ApiErrorBody>
        const apiError = new ApiError(
            status,
            body.code ?? (status >= 500 ? "TRANSIENT_ERROR" : "VALIDATION_ERROR"),
            body.message ?? "Ocorreu um erro inesperado.",
            body.fieldErrors,
        )
        const sentToken = Boolean(error.config?.headers.get("Authorization"))
        if (status === 401 && sentToken && error.config?.url !== "/auth/login" && unauthorizedHandler) {
            unauthorizedHandler(apiError)
        }
        return Promise.reject(apiError)
    },
)