import { http, HttpResponse } from "msw"
import type { AuthResponse, LoginInput, RegisterInput } from "@/api/contracts"
import { validateLogin, validateRegister, type FieldErrors } from "@/api/validation"
import { commit, getState, type StoredUser } from "../db"
import { createSession, requireAuth, toSession } from "../lib/auth"
import { hashPassword, newId } from "../lib/crypto"
import { errorResponse } from "../lib/http"
import { applyScenario } from "../scenario"

export const authHandlers = [
    http.post("/api/auth/register", async ({ request }) => {
        const early = await applyScenario("auth.register")
        if (early) return early

        const input = (await request.json()) as RegisterInput
        const fieldErrors = validateRegister(input)
        if (Object.keys(fieldErrors).length) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", fieldErrors)
        }

        const state = getState()
        const email = input.email.trim().toLowerCase()
        const username = input.username.trim().toLowerCase()
        const conflicts: FieldErrors = {}
        if (state.users.some((u) => u.email.toLowerCase() === email)) {
            conflicts.email = "Este e-mail já está em uso."
        }
        if (state.users.some((u) => u.username.toLowerCase() === username)) {
            conflicts.username = "Este nome de usuário já está em uso."
        }
        if (Object.keys(conflicts).length) {
            return errorResponse(409, "CONFLICT", "Já existe uma conta com esses dados.", conflicts)
        }

        const user: StoredUser = {
            id: newId("user"),
            email,
            username,
            displayName: username,
            ensName: username,
            walletAlias: "Principal",
            avatarUrl: null,
            passwordHash: await hashPassword(input.password),
        }
        state.users.push(user)
        state.favorites[user.id] = []
        state.wallets[user.id] = []
        const session = createSession(user.id)
        commit()

        const body: AuthResponse = { token: session.token, session: toSession(session, user) }
        return HttpResponse.json(body, { status: 201 })
    }),

    http.post("/api/auth/login", async ({ request }) => {
        const early = await applyScenario("auth.login")
        if (early) return early

        const input = (await request.json()) as LoginInput
        const fieldErrors = validateLogin(input)
        if (Object.keys(fieldErrors).length) {
            return errorResponse(400, "VALIDATION_ERROR", "Revise os campos informados.", fieldErrors)
        }

        const state = getState()
        const email = input.email.trim().toLowerCase()
        const user = state.users.find((u) => u.email.toLowerCase() === email)
        const hash = await hashPassword(input.password)
        if (!user || user.passwordHash !== hash) {
            return errorResponse(401, "UNAUTHENTICATED", "E-mail ou senha incorretos.")
        }

        const session = createSession(user.id)
        commit()
        const body: AuthResponse = { token: session.token, session: toSession(session, user) }
        return HttpResponse.json(body)
    }),

    http.get("/api/auth/session", async ({ request }) => {
        const early = await applyScenario("auth.session")
        if (early) return early

        const auth = requireAuth(request)
        if (auth instanceof Response) return auth
        return HttpResponse.json(toSession(auth.session, auth.user))
    }),

    http.post("/api/auth/logout", async ({ request }) => {
        const header = request.headers.get("authorization")
        const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : ""
        const state = getState()
        state.sessions = state.sessions.filter((s) => s.token !== token)
        commit()
        return new HttpResponse(null, { status: 204 })
    }),
]