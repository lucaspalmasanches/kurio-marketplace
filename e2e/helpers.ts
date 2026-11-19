import { expect, type Page } from "@playwright/test"

type MockMethod =
    | "setScenario"
    | "expireSessions"
    | "updateNft"
    | "replayLastEvent"
    | "emitStaleNft"
    | "dropConnections"

/** Chama as ferramentas de cenário expostas pelos mocks (window.__kurioMocks). */
export async function callMock(page: Page, method: MockMethod, ...args: unknown[]) {
    await page.waitForFunction(() => "__kurioMocks" in window)
    await page.evaluate(
        ({ method, args }) => {
            const mocks = (window as unknown as { __kurioMocks: Record<string, (...a: unknown[]) => unknown> }).__kurioMocks
            return mocks[method](...args)
        },
        { method, args },
    )
}

export async function countOrders(page: Page): Promise<number> {
    return page.evaluate(async () => {
        const token = JSON.parse(localStorage.getItem("kurio:token") ?? "null") as string | null
        const response = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } })
        return ((await response.json()) as unknown[]).length
    })
}

/** Preenche o formulário de login já aberto. */
export async function submitLogin(page: Page, email = "ana@kurio.test", password = "Kurio@123") {
    const main = page.getByRole("main")
    await main.getByLabel("E-mail").fill(email)
    await main.getByLabel(/^Senha/).fill(password)
    await main.getByRole("button", { name: "Entrar", exact: true }).click()
}

export async function login(page: Page, email = "ana@kurio.test") {
    await page.goto("/login")
    await submitLogin(page, email)
    await expect(page).toHaveURL(/\/$/)
}

/** Do detalhe do NFT até a revisão do pedido, com login no meio do fluxo. */
export async function goToReview(page: Page) {
    await page.goto("/nft/emerald-ape-042")
    await page.getByRole("button", { name: "Comprar", exact: true }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await page.getByRole("button", { name: "Conectar e finalizar" }).click()
    await expect(page).toHaveURL(/\/login/)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/pagamento$/)
    await page.getByRole("button", { name: /^Conectar / }).click()
    await expect(page.getByText(/conectada\./)).toBeVisible()
    await page.getByRole("button", { name: "Revisar pedido" }).click()
    await expect(page.getByRole("heading", { name: "Revise seu pedido" })).toBeVisible()
}