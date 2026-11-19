import type { Session, User } from "@/api/contracts"
import { getState, type StoredSession, type StoredUser } from "../db"
import { newId } from "./crypto"
import { errorResponse } from "./http"

export const SESSION_TTL_MS = 60 * 60 * 1000

export function toPublicUser(user: StoredUser): User {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        ensName: user.ensName,
        walletAlias: user.walletAlias,
        avatarUrl: user.avatarUrl,
    }
}

export function toSession(session: StoredSession, user: StoredUser): Session {
    return { user: toPublicUser(user), expiresAt: session.expiresAt }
}

export function createSession(userId: string): StoredSession {
    const session: StoredSession = {
        token: newId("tok"),
        userId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    }
    getState().sessions.push(session)
    return session
}

export function requireAuth(
    request: Request,
): { user: StoredUser; session: StoredSession } | Response {
    const header = request.headers.get("authorization")
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : ""
    if (!token) return errorResponse(401, "UNAUTHENTICATED", "Faça login para continuar.")

    const { sessions, users } = getState()
    const session = sessions.find((s) => s.token === token)
    if (!session) return errorResponse(401, "UNAUTHENTICATED", "Sessão inválida.")
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
        return errorResponse(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.")
    }
    const user = users.find((u) => u.id === session.userId)
    if (!user) return errorResponse(401, "UNAUTHENTICATED", "Sessão inválida.")
    return { user, session }
}

export function findUserByToken(token: string): StoredUser | null {
    const { sessions, users } = getState()
    const session = sessions.find((s) => s.token === token)
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null
    return users.find((u) => u.id === session.userId) ?? null
}