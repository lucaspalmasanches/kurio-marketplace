import { expect, test, type Page } from "@playwright/test"

const SCREENSHOT = { maxDiffPixelRatio: 0.01 }

async function ready(page: Page) {
    await page.waitForFunction(() => "__kurioMocks" in window)
    await page.evaluate(() => document.fonts.ready)
}

/** Cria um carrinho de visitante pela API (sem toasts na tela). */
async function seedGuestCart(page: Page) {
    await page.evaluate(async () => {
        const cartId = JSON.parse(localStorage.getItem("kurio:guest-cart") ?? "null") as string | null
        if (!cartId) throw new Error("Carrinho de visitante ainda não criado")
        const items = [
            { nftId: "emerald-ape-042", editionId: "1-50", quantity: 2 },
            { nftId: "violet-nomad-314", editionId: "1-50", quantity: 1 },
        ]
        for (const item of items) {
            await fetch("/api/cart/items", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-cart-id": cartId },
                body: JSON.stringify(item),
            })
        }
    })
}

/** Login pela API, juntando o carrinho do visitante ao da conta. */
async function loginViaApi(page: Page) {
    await page.evaluate(async () => {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "ana@kurio.test", password: "Kurio@123" }),
        })
        const { token } = (await response.json()) as { token: string }
        localStorage.setItem("kurio:token", JSON.stringify(token))
        const cartId = JSON.parse(localStorage.getItem("kurio:guest-cart") ?? "null") as string
        await fetch("/api/cart/merge", { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-cart-id": cartId } })
    })
}

test("visual: início", async ({ page }) => {
    await page.goto("/")
    await ready(page)
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
    await expect(page).toHaveScreenshot("inicio.png", SCREENSHOT)
})

test("visual: detalhe do NFT", async ({ page }) => {
    await page.goto("/nft/emerald-ape-042")
    await ready(page)
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible()
    await expect(page).toHaveScreenshot("detalhe.png", SCREENSHOT)
})

test("visual: carrinho", async ({ page }) => {
    await page.goto("/")
    await ready(page)
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
    await seedGuestCart(page)
    await page.goto("/carrinho")
    await ready(page)
    await expect(page.getByRole("link", { name: "Violet Nomad #314" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Resumo da carteira" })).toContainText("Total")
    await expect(page).toHaveScreenshot("carrinho.png", SCREENSHOT)
})

test("visual: pagamento", async ({ page }) => {
    await page.goto("/")
    await ready(page)
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
    await seedGuestCart(page)
    await loginViaApi(page)
    await page.goto("/pagamento")
    await ready(page)
    await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible()
    await expect(page.getByText("Violet Nomad #314").first()).toBeVisible()
    await expect(page).toHaveScreenshot("pagamento.png", SCREENSHOT)
})