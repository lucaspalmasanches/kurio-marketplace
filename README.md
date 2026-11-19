# Kurio — NFT Marketplace (Desafio Frontend Jungle Gaming)

Aplicação React + TypeScript com dados simulados por MSW (REST e Socket.IO).

**Deploy:** https://kurio-marketplace-one.vercel.app/

## Stack

React · TypeScript · Vite · TanStack Router · TanStack Query · Axios · Socket.IO (cliente) · Tailwind CSS v4 · shadcn/ui · MSW 2 + @mswjs/socket.io-binding · Playwright · decimal.js · sonner

## Setup

```bash
npm install
npx playwright install chromium   # apenas para os testes E2E
# sem espaço no disco do sistema? instale dentro do projeto:
# export PLAYWRIGHT_BROWSERS_PATH=0 && npx playwright install chromium
npm run dev                        # http://localhost:5173
```

### Variáveis de ambiente

| Variável | Valor | Efeito |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW (REST e Socket.IO). Está no `.env` versionado, então o build de demonstração também usa os mocks. |

## Credenciais fictícias

| E-mail | Senha |
|---|---|
| ana@kurio.test | Kurio@123 |
| bruno@kurio.test | Kurio@123 |

Cupons: `KURIO10` (10%), `WELCOME` (0,25 ETH), `EXPIRED10` (expirado). Qualquer outro código é inválido.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Build otimizado (verifica tipos antes) |
| `npm run preview` | Serve o build |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (build + preview + testes em desktop e mobile) |
| `npm run test:e2e:report` | Abre o relatório HTML (traces das falhas ficam em `test-results/`) |
| `npm run test:visual` | Regressão visual (início, detalhe, carrinho e pagamento) |
| `npm run test:visual:update` | Regenera as baselines após uma mudança visual intencional |
| `npm run lighthouse` | Build + auditoria Lighthouse (3 execuções por página, mobile e desktop) e resumo em `lighthouse/RESULTS.md` |
| `npm run images` | Gera as imagens WebP otimizadas a partir dos originais em `design/nfts/` |

## Cenários de mock

Selecione pela URL (`/?scenario=nome`) ou pelo console (`__kurioMocks.setScenario("nome")`). O cenário fica salvo até ser trocado. Para voltar ao padrão, use `/?scenario=default`.

| Cenário | O que simula |
|---|---|
| `default` | Rede estável, latência baixa e variável |
| `slow` | Latência de 1,5 a 3 s (skeletons) |
| `out-of-order` | Respostas da listagem fora de ordem |
| `empty-catalog` | Catálogo vazio |
| `offline` | Falha de conexão em todas as chamadas |
| `server-error` | HTTP 500 na listagem e no detalhe |
| `flaky` | 503 duas vezes e depois sucesso |
| `favorites-fail` | Falha ao favoritar (rollback otimista) |
| `forbidden` | 403 nas carteiras |
| `wallet-rejected` | Carteira recusa a conexão no pagamento |
| `payment-declined` | Pedido criado e depois recusado |
| `order-timeout` | Pedido criado, mas a resposta não chega (recuperação por idempotência) |
| `price-change-checkout` | Preço muda ao finalizar (exige nova confirmação) |
| `sold-out-checkout` | Edição esgota ao finalizar |
| `pending-slow` | Pedido pendente por 8 s |

### Ferramentas no console (`window.__kurioMocks`)

- `await resetDb()`: restaura integralmente o cenário conhecido (depois, F5)
- `listScenarios()` e `getScenario()`
- `expireSessions()`: expira a sessão atual
- `updateNft("emerald-ape-042", { priceEth: "1.50" })`: altera preço ou disponibilidade e emite `nft.updated`
- `replayLastEvent()` e `emitStaleNft(id)`: evento duplicado e evento antigo (devem ser ignorados)
- `dropConnections()`: derruba o Socket.IO (o cliente reconecta e reconcilia com a REST)

## Reproduzir fluxos de falha

1. **Preço muda com NFT no carrinho:** coloque um NFT no carrinho e rode `__kurioMocks.updateNft("emerald-ape-042", { priceEth: "1.50" })`. Um aviso aparece e o resumo é atualizado.
2. **Cotação desatualizada no checkout:** ative `price-change-checkout` antes de confirmar. A compra é bloqueada até aceitar os novos valores.
3. **Timeout e idempotência:** ative `order-timeout` e confirme. Após o timeout, o cliente reenvia com a mesma chave e recebe o mesmo pedido.
4. **Pagamento recusado:** ative `payment-declined`. O pedido termina recusado e o carrinho é preservado.
5. **Sessão expirada:** `__kurioMocks.expireSessions()` e navegue. O app volta ao login e retorna à tela anterior.
6. **Pedido pendente após refresh:** ative `pending-slow`, confirme e recarregue a página. O mesmo pedido é retomado.

Detalhes de arquitetura, contratos e limitações em [ARCHITECTURE.md](./ARCHITECTURE.md).