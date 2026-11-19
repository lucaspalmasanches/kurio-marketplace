import { expect, test, type Page } from "@playwright/test"

async function login(page: Page, email = "ana@kurio.test") {
    await page.goto("/login")
    const main = page.getByRole("main")
    await main.getByLabel("E-mail").fill(email)
    await main.getByLabel(/^Senha/).fill("Kurio@123")
    await main.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page).toHaveURL(/\/$/)
}

test("perfil: validação, edição persistida após refresh e senha atual incorreta", async ({ page }) => {
    await login(page)
    await page.goto("/perfil")
    const main = page.getByRole("main")
    const name = main.getByLabel(/^Nome de exibição/)

    await expect(name).toHaveValue("Ana Souza")
    await name.fill("")
    await main.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(main.getByText("Informe o nome de exibição.")).toBeVisible()

    await name.fill("Ana Colecionadora")
    await main.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(page.getByText("Perfil atualizado.")).toBeVisible()
    await page.reload()
    await expect(main.getByLabel(/^Nome de exibição/)).toHaveValue("Ana Colecionadora")

    await main.getByLabel(/^Senha atual/).fill("errada123")
    await main.getByLabel(/^Nova senha/).fill("NovaSenha1")
    await main.getByLabel(/^Confirmar nova senha/).fill("NovaSenha1")
    await main.getByRole("button", { name: "Alterar senha" }).click()
    await expect(main.getByText("Senha atual incorreta.")).toBeVisible()
})

test("carteiras: validação e cadastro da carteira secundária", async ({ page }) => {
    await login(page, "bruno@kurio.test")
    await page.goto("/carteiras")
    const main = page.getByRole("main")

    await main.getByRole("button", { name: "Adicionar" }).click()
    const secondary = main.getByRole("region", { name: "Carteira secundária" })
    await secondary.getByRole("button", { name: "Igual à carteira principal" }).click()
    await secondary.getByLabel(/^Apelido da carteira/).fill("Reserva")
    await secondary.getByLabel(/^Endereço da carteira/).fill("0x123")
    await secondary.getByRole("button", { name: "Salvar carteira" }).click()
    await expect(secondary.getByText(/Endereço inválido/)).toBeVisible()

    await secondary.getByLabel(/^Endereço da carteira/).fill(`0x${"a".repeat(40)}`)
    await secondary.getByRole("button", { name: "Salvar carteira" }).click()
    await expect(page.getByText("Carteira secundária salva.")).toBeVisible()

    await page.reload()
    await expect(main.getByRole("region", { name: "Carteira secundária" }).getByLabel(/^Apelido da carteira/)).toHaveValue("Reserva")
})