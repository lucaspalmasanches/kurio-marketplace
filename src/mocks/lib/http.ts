import { HttpResponse } from "msw"
import type { ApiErrorBody, ApiErrorCode } from "@/api/contracts"
import type { FieldErrors } from "@/api/validation"

export function errorResponse(
    status: number,
    code: ApiErrorCode,
    message: string,
    fieldErrors?: FieldErrors,
) {
    const body: ApiErrorBody = { code, message, fieldErrors }
    return HttpResponse.json(body, { status })
}