import { expect, test } from "@playwright/test"
import { callMock, countOrders, goToReview, login, submitLogin } from "./helpers"

test("cadastro com conflito, logout e troca de usuário isolam os dados", async ({ page }) => {
    await page.goto("/cadastro")
    const main = page.getByRole("main")
    await main.getByLabel(/^Nome de usuário/).fill("carla")
    await main.getByLabel("E-mail").fill("ana@kurio.test")
    await main.getByLabel(/^Senha/).fill("Senha1234")
    await main.getByLabel(/^Confirmar senha/).fill("Senha1234")
    await main.getByRole("button", { name: "Criar conta", exact: true }).click()
    await expect(main.getByText("Este e-mail já está em uso.")).toBeVisible()

    await main.getByLabel("E-mail").fill("carla@kurio.test")
    await main.getByRole("button", { name: "Criar conta", exact: true }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible()

    // Carla não vê os favoritos da Ana
    await page.goto("/nft/emerald-ape-042")
    await expect(page.getByRole("button", { name: "Favoritar" })).toBeVisible()

    await page.getByRole("button", { name: "Sair" }).click()
    await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible()

    await login(page, "ana@kurio.test")
    await page.goto("/nft/emerald-ape-042")
    await expect(page.getByRole("button", { name: "Favoritado" })).toBeVisible()
})

test("sessão expirada volta ao login e retoma a tela anterior", async ({ page }) => {
    await login(page)
    await page.goto("/perfil")
    await expect(page.getByRole("main").getByLabel(/^Nome de exibição/)).toHaveValue("Ana Souza")

    await callMock(page, "expireSessions")
    await page.reload()
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await expect(page.getByText(/Sua sessão expirou/)).toBeVisible()

    await submitLogin(page)
    await expect(page).toHaveURL(/\/perfil$/)
})

test("favoritos: falha na mutation desfaz a alteração otimista e o estado se recupera", async ({ page }) => {
    await login(page)
    await page.goto("/nft/sage-nomad-009")
    await callMock(page, "setScenario", "favorites-fail")

    await page.getByRole("button", { name: "Favoritar" }).click()
    await expect(page.getByText(/A alteração foi desfeita/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Favoritar" })).toBeVisible()

    await callMock(page, "setScenario", "default")
    const saved = page.waitForResponse(
        (response) => response.url().includes("/api/favorites/") && response.request().method() === "PUT" && response.ok(),
    )
    await page.getByRole("button", { name: "Favoritar" }).click()
    await expect(page.getByRole("button", { name: "Favoritado" })).toBeVisible()
    await saved // só recarrega depois que a API confirmou
    await page.reload()
    await expect(page.getByRole("button", { name: "Favoritado" })).toBeVisible()
})

test("carrinho: quantidades, remoção, cupom e persistência após refresh e login", async ({ page }) => {
    await page.goto("/nft/emerald-ape-042")
    await page.getByText("1/50", { exact: true }).click()
    await page.getByRole("button", { name: "Aumentar quantidade" }).click()
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click()
    await expect(page.getByText(/Emerald Ape #042 adicionado/)).toBeVisible()

    await page.goto("/nft/ivory-baron-088")
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click()
    await expect(page.getByText(/Ivory Baron #088 adicionado/)).toBeVisible()

    await page.goto("/carrinho")
    const summary = page.getByRole("region", { name: "Resumo da carteira" })
    await expect(summary).toContainText("4.186 ETH") // 2 × 1.19 + 1.79 + 0.016

    await page.getByRole("button", { name: "Remover Ivory Baron #088 do carrinho" }).click()
    await expect(summary).toContainText("2.396 ETH")

    await page.getByLabel("Código promocional").fill("XYZ")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByText("Cupom inválido.")).toBeVisible()

    await page.getByLabel("Código promocional").fill("KURIO10")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(summary).toContainText("2.158 ETH") // 2.38 - 10% + 0.016

    await page.reload()
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
    await expect(summary).toContainText("2.158 ETH")

    // O carrinho do visitante é preservado ao autenticar
    await page.getByRole("button", { name: "Conectar e finalizar" }).click()
    await submitLogin(page)
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.getByText("(x 2)")).toBeVisible()
})

test("pagamento recusado com clique repetido gera um único pedido e preserva o carrinho", async ({ page }) => {
    await goToReview(page)
    await callMock(page, "setScenario", "payment-declined")

    await page.getByRole("button", { name: "Confirmar compra" }).dblclick()
    await expect(page.getByRole("heading", { name: "Pagamento recusado" })).toBeVisible({ timeout: 20_000 })
    expect(await countOrders(page)).toBe(1)

    await page.goto("/carrinho")
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
})

test("tempo real: preço alterado via Socket.IO atualiza o resumo e ignora eventos duplicados e antigos", async ({ page }) => {
    await page.goto("/nft/emerald-ape-042")
    await page.getByRole("button", { name: "Comprar", exact: true }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    const summary = page.getByRole("region", { name: "Resumo da carteira" })
    await expect(summary).toContainText("1.206 ETH")

    await callMock(page, "updateNft", "emerald-ape-042", { priceEth: "1.50" })
    const notice = page.getByText(/preço ou disponibilidade atualizados/)
    await expect(notice).toBeVisible()
    await expect(summary).toContainText("1.516 ETH")

    await callMock(page, "replayLastEvent")
    await callMock(page, "emitStaleNft", "emerald-ape-042")
    await page.waitForTimeout(1000)
    await expect(notice).toHaveCount(1)
    await expect(summary).toContainText("1.516 ETH")
})

test("pedido pendente é retomado após desconexão e refresh, sem nova compra", async ({ page }) => {
    await goToReview(page)
    await callMock(page, "setScenario", "pending-slow")

    await page.getByRole("button", { name: "Confirmar compra" }).click()
    const waiting = page.getByRole("heading", { name: "Aguardando confirmação da rede" })
    await expect(waiting).toBeVisible()

    await callMock(page, "dropConnections")
    await page.reload()
    await expect(waiting).toBeVisible()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 })
    expect(await countOrders(page)).toBe(1)
})

test("teclado: atalho para o conteúdo, foco em erro de validação e login sem mouse", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused()

    await page.goto("/cadastro")
    const main = page.getByRole("main")
    await main.getByRole("button", { name: "Criar conta", exact: true }).click()
    await expect(main.getByLabel(/^Nome de usuário/)).toBeFocused()
    await expect(main.getByText("Informe o nome de usuário.")).toBeVisible()

    await page.goto("/login")
    await main.getByLabel("E-mail").focus()
    await page.keyboard.type("ana@kurio.test")
    await page.keyboard.press("Tab")
    await expect(main.getByLabel(/^Senha/)).toBeFocused()
    await page.keyboard.type("Kurio@123")
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/$/)
})

test("recibo em diálogo mantém o foco e fecha com Escape", async ({ page }) => {
    await goToReview(page)
    await page.getByRole("button", { name: "Confirmar compra" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 20_000 })

    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab")
    const focusInside = await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false)
    expect(focusInside).toBe(true)

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
})

test("falha de servidor exibe erro e recupera após nova tentativa", async ({ page }) => {
    await page.goto("/?scenario=server-error")
    await expect(page.getByText("Algo deu errado")).toBeVisible({ timeout: 15_000 })

    await callMock(page, "setScenario", "default")
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
})

test("detalhe: abas por teclado, avaliações e mais desta coleção", async ({ page }) => {
    await page.goto("/nft/emerald-ape-042")
    const details = page.getByRole("tab", { name: "Detalhes do NFT" })
    await expect(details).toHaveAttribute("aria-selected", "true")

    await details.focus()
    await page.keyboard.press("ArrowRight")
    const reviews = page.getByRole("tab", { name: /Avaliações de colecionadores/ })
    await expect(reviews).toBeFocused()
    await expect(reviews).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("tabpanel")).toContainText(/Média 4\.8 de 5/)

    const related = page.getByRole("region", { name: "Mais desta coleção" })
    await expect(related.getByRole("link").first()).toBeVisible()
    await expect(related.getByRole("link", { name: "Emerald Ape #042" })).toHaveCount(0)
})

test("lista de interesse mostra os favoritos do usuário", async ({ page }) => {
    await login(page)
    await page.goto("/favoritos")
    await expect(page.getByRole("main").getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()
})

test("navegação inferior no mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "A barra aparece apenas em telas pequenas")
    await page.goto("/")
    const nav = page.getByRole("navigation", { name: "Navegação inferior" })
    await expect(nav).toBeVisible()
    await nav.getByRole("link", { name: "Favoritos" }).click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
})