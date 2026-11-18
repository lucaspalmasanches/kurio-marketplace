import { http, HttpResponse } from "msw"
import type { ChangePasswordInput, UpdateAvatarInput, UpdateProfileInput } from "@/api/contracts"
import { validatePasswordChange, validateProfile, type FieldErrors } from "@/api/validation"
import { commit, getState } from "../db"
import { requireAuth, toPublicUser } from "../lib/auth"
import { hashPassword } from "../lib/crypto"
import { errorResponse } from "../lib/http"
import { applyScenario } from "../scenario"

const MAX_AVATAR_LENGTH = 400_000

export const profileHandlers = [
    http.get("/api/profile", async ({ request }) => {
        const early = await applyScenario("profile.read")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth
        return HttpResponse.json(toPublicUser(auth.user))
    }),

    http.patch("/api/profile", async ({ request }) => {
        const early = await applyScenario("profile.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const input = (await request.json()) as UpdateProfileInput
        const fieldErrors = validateProfile(input)
        if (Object.keys(fieldErrors).length) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", fieldErrors)
        }

        const email = input.email.trim().toLowerCase()
        const username = input.username.trim().toLowerCase()
        const others = getState().users.filter((u) => u.id !== auth.user.id)
        const conflicts: FieldErrors = {}
        if (others.some((u) => u.email.toLowerCase() === email)) {
            conflicts.email = "Este e-mail já está em uso."
        }
        if (others.some((u) => u.username.toLowerCase() === username)) {
            conflicts.username = "Este nome de usuário já está em uso."
        }
        if (Object.keys(conflicts).length) {
            return errorResponse(409, "CONFLICT", "Já existe uma conta com esses dados.", conflicts)
        }

        Object.assign(auth.user, {
            displayName: input.displayName.trim(),
            username,
            email,
            ensName: input.ensName.trim().toLowerCase(),
            walletAlias: input.walletAlias.trim(),
        })
        commit()
        return HttpResponse.json(toPublicUser(auth.user))
    }),

    http.put("/api/profile/avatar", async ({ request }) => {
        const early = await applyScenario("profile.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const { avatarUrl } = (await request.json()) as UpdateAvatarInput
        const valid =
            avatarUrl === null ||
            (typeof avatarUrl === "string" &&
                avatarUrl.startsWith("data:image/") &&
                avatarUrl.length <= MAX_AVATAR_LENGTH)
        if (!valid) {
            return errorResponse(400, "VALIDATION_ERROR", "Imagem inválida.", {
                avatarUrl: "Envie uma imagem de até cerca de 300 KB.",
            })
        }
        auth.user.avatarUrl = avatarUrl
        commit()
        return HttpResponse.json(toPublicUser(auth.user))
    }),

    http.post("/api/profile/password", async ({ request }) => {
        const early = await applyScenario("profile.write")
        if (early) return early
        const auth = requireAuth(request)
        if (auth instanceof Response) return auth

        const input = (await request.json()) as ChangePasswordInput
        const fieldErrors = validatePasswordChange(input)
        if (Object.keys(fieldErrors).length) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", fieldErrors)
        }
        if ((await hashPassword(input.currentPassword)) !== auth.user.passwordHash) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", {
                currentPassword: "Senha atual incorreta.",
            })
        }
        auth.user.passwordHash = await hashPassword(input.newPassword)
        commit()
        return new HttpResponse(null, { status: 204 })
    }),
]