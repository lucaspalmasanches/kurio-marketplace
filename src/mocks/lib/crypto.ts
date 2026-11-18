export async function hashPassword(password: string): Promise<string> {
    const data = new TextEncoder().encode(`kurio-mock:${password}`)
    const digest = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

export function newId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`
}