import { expect, test, type Page } from "@playwright/test"

async function setScenario(page: Page, name: string) {
    await page.evaluate((scenario) => {
        const mocks = (window as unknown as { __kurioMocks?: { setScenario: (n: string) => void } }).__kurioMocks
        mocks?.setScenario(scenario)
    }, name)
}

async function countOrders(page: Page): Promise<number> {
    return page.evaluate(async () => {
        const token = JSON.parse(localStorage.getItem("kurio:token") ?? "null") as string | null
        const response = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } })
        return ((await response.json()) as unknown[]).length
    })
}

/** Do detalhe do NFT até a tela de revisão do pedido, com login no meio do fluxo. */
async function goToReview(page: Page) {
    await page.goto("/nft/emerald-ape-042")
    await page.getByRole("button", { name: "Comprar", exact: true }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await page.getByRole("button", { name: "Conectar e finalizar" }).click()

    await expect(page).toHaveURL(/\/login/)
    await page.getByRole("main").getByLabel("E-mail").fill("ana@kurio.test")
    await page.getByRole("main").getByLabel(/^Senha/).fill("Kurio@123")
    await page.getByRole("button", { name: "Entrar", exact: true }).click()

    await expect(page).toHaveURL(/\/pagamento$/)
    await page.getByRole("button", { name: /^Conectar / }).click()
    await expect(page.getByText(/conectada\./)).toBeVisible()
    await page.getByRole("button", { name: "Revisar pedido" }).click()
    await expect(page.getByRole("heading", { name: "Revise seu pedido" })).toBeVisible()
}

test("compra completa, do catálogo ao recibo confirmado", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Emerald Ape #042" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible()
    await goToReview(page)

    await page.getByRole("button", { name: "Confirmar compra" }).click()
    const receipt = page.getByRole("dialog")
    await expect(receipt).toBeVisible({ timeout: 20_000 })
    await expect(receipt).toContainText("Seus NFTs agora estão na sua carteira")
    await expect(receipt).toContainText("Emerald Ape #042")
    expect(await countOrders(page)).toBe(1)
})

test("acesso direto ao detalhe e NFT inexistente", async ({ page }) => {
    await page.goto("/nft/emerald-ape-042")
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible()
    await page.goto("/nft/nao-existe")
    await expect(page.getByText("NFT não encontrado")).toBeVisible()
})

test("filtros, ordenação e paginação na URL sobrevivem a refresh e histórico", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("checkbox", { name: /Ethereum/ }).check()
    await expect(page).toHaveURL(/network=/)
    await page.getByLabel("Ordenar por:").selectOption("price-asc")
    await expect(page).toHaveURL(/sort=price-asc/)
    await page.getByRole("button", { name: "Página 2" }).click()
    await expect(page).toHaveURL(/page=2/)

    await page.reload()
    await expect(page.getByRole("checkbox", { name: /Ethereum/ })).toBeChecked()
    await expect(page.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page")

    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
})

test("skeletons durante carregamento lento", async ({ page }) => {
    await page.goto("/?scenario=slow")
    await expect(page.getByLabel("Carregando NFTs")).toBeVisible()
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible({ timeout: 15_000 })
})

test("timeout após criar o pedido recupera o mesmo pedido (idempotência)", async ({ page }) => {
    await page.goto("/")
    await goToReview(page)
    await setScenario(page, "order-timeout")

    await page.getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 40_000 })
    expect(await countOrders(page)).toBe(1)
})

test("preço alterado durante o checkout exige nova confirmação", async ({ page }) => {
    await page.goto("/")
    await goToReview(page)
    await setScenario(page, "price-change-checkout")

    await page.getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page.getByRole("alert").filter({ hasText: /mudaram/ })).toBeVisible()
    await page.getByRole("button", { name: "Aceitar novos valores" }).click()
    await page.getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 })
    expect(await countOrders(page)).toBe(1)
})