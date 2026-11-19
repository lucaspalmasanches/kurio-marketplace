# Arquitetura

## Organização

- `src/api`: contratos tipados (`contracts.ts`), validações compartilhadas entre UI e mocks (`validation.ts`), cliente Axios com interceptores e funções por recurso.
- `src/features`: hooks de estado remoto (TanStack Query) por domínio: sessão, carrinho/cotação, favoritos, carteiras, ponte de tempo real.
- `src/lib`: cliente Socket.IO (`realtime.ts`), stores persistidas (token, carrinho do visitante, cupom, checkout pendente).
- `src/routes`: rotas por arquivo (TanStack Router). `_auth` protege perfil, carteiras, favoritos, pagamento e pedido.
- `src/mocks`: MSW. Banco simulado persistido em `localStorage`, cenários determinísticos, handlers REST e Socket.IO. Nenhum componente, hook ou cliente Axios contém respostas fictícias.

## Contratos REST (prefixo `/api`)

Erros: `{ code, message, fieldErrors? }`, com os códigos `VALIDATION_ERROR` (400), `UNAUTHENTICATED`/`SESSION_EXPIRED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT`/`AVAILABILITY_CONFLICT`/`PRICE_CHANGED`/`IDEMPOTENCY_CONFLICT` (409), `COUPON_INVALID`/`COUPON_EXPIRED` (422) e `TRANSIENT_ERROR` (5xx). Valores em ETH trafegam como string decimal e quantidades como inteiros.

| Recurso | Endpoints |
|---|---|
| Sessão | `POST /auth/register`, `POST /auth/login`, `GET /auth/session`, `POST /auth/logout` (Bearer token, TTL 60 min) |
| NFTs | `GET /nfts?q&category&network&minPrice&maxPrice&sort&tab&page&pageSize`, `GET /nfts/:id`, `GET /nfts/:id/reviews` |
| Favoritos | `GET /favorites`, `PUT /favorites/:nftId`, `DELETE /favorites/:nftId` |
| Carrinho | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `POST /cart/merge`. Visitante identificado por `x-cart-id`. |
| Cotação | `POST /quote` → subtotal, desconto, taxa de rede, total, disponibilidade por linha. O `id` é um hash do conteúdo. |
| Pedidos | `POST /orders` (cabeçalho `Idempotency-Key`), `GET /orders`, `GET /orders/:id` |
| Perfil | `GET /profile`, `PATCH /profile`, `PUT /profile/avatar`, `POST /profile/password` |
| Carteiras | `GET /wallets`, `POST /wallets`, `PUT /wallets/:id`, `POST /wallets/:id/connect` |

**Idempotência:** a mesma chave com o mesmo conteúdo devolve o mesmo pedido (`200` + `Idempotent-Replay`); a mesma chave com conteúdo diferente devolve `409 IDEMPOTENCY_CONFLICT`. O servidor recalcula a cotação e recusa a compra se o `quoteId` mudou (`PRICE_CHANGED`) ou se falta estoque. O recibo é um snapshot gravado no pedido.

## Eventos (Socket.IO)

| Evento | Payload |
|---|---|
| `nft.updated` | `{ id, type, resource: { type: "nft", id }, version, occurredAt, data: { priceEth, availability } }` |
| `order.updated` | `{ ..., resource: { type: "order", id }, userId, data: { status, txHash?, declineReason? } }` |

Cliente → servidor: `session.authenticate { token }`. Servidor → cliente: `session.ready` ou `session.rejected`. Eventos de pedido só são emitidos ao dono.

O cliente descarta eventos duplicados (por `id`) e antigos (versão ≤ à última conhecida, inclusive a vinda da REST). Pedidos de outro usuário também são descartados.

**Transporte nos mocks:** `ws.link(origem)` do MSW + `@mswjs/socket.io-binding`, com o cliente usando apenas o transporte `websocket`. Limitações: o binding não envia ping (o mock envia o pacote `2` a cada 20 s), não suporta salas, namespaces nem acks, e por isso a autenticação é feita por evento. O `socket.io-client` é carregado por import dinâmico depois de o MSW iniciar.

## Sessão

Token em `localStorage`; a sessão é revalidada em `GET /auth/session` após refresh. Um 401 com token encerra a sessão, limpa os dados privados do cache e as subscriptions, e redireciona ao login com `redirect` para retomada. O contexto do checkout (cupom e pedido pendente) é preservado. No logout e na troca de usuário, todos os dados privados são removidos e o socket é reconectado.

## Carrinho

O carrinho fica no servidor simulado (por usuário, ou por `x-cart-id` para visitantes), o que permite mantê-lo após refresh. No login, `POST /cart/merge` junta o carrinho do visitante ao da conta, respeitando o estoque. A disponibilidade é validada a cada alteração, e após a confirmação são removidos apenas os itens e quantidades comprados.

## Cache e sincronização (TanStack Query)

- Chaves isoladas por usuário: `["cart", userId|"guest"]`, `["favorites", userId]`, `["wallets", userId]`, `["order", id]`, `["quote", owner, itens, cupom]`.
- `staleTime` de 30 s, sem refetch em foco. Retry automático apenas para `TRANSIENT_ERROR` e `NETWORK_ERROR` (até 2 vezes).
- Listagem com `keepPreviousData` (atualização em segundo plano visível) e `AbortSignal` repassado ao Axios. Como as chaves dependem dos parâmetros, respostas fora de ordem são descartadas.
- Atualização otimista com rollback nos favoritos.
- Pedido: mutation com retry usando a mesma chave de idempotência, botão bloqueado durante o envio e chave persistida para recuperação após refresh.

## Reconciliação REST × Socket.IO

`nft.updated` atualiza o detalhe no cache e invalida a listagem e as cotações. `order.updated` invalida o pedido e o carrinho. Ao reconectar, todas as queries ativas são invalidadas. Um pedido pendente também é consultado a cada 5 s como garantia, e o mock liquida pedidos vencidos na leitura, o que cobre o refresh durante pedidos pendentes.

## Performance (Lighthouse)

Auditoria do início (`/`) e do detalhe (`/nft/emerald-ape-042`) com build otimizado, mocks no cenário padrão, 3 execuções por página e perfil. Os valores abaixo são medianas. Ambiente, versões e condições estão em `lighthouse/RESULTS.md`; relatórios HTML/JSON em `lighthouse/reports/`; configuração em `lighthouse/lighthouserc.*.json`. Para reproduzir: `npm run lighthouse`.

| Perfil | Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Mobile | / | 84 | 100 | 100 | 100 | 4,16 s | 0,016 | 153 ms |
| Mobile | /nft/emerald-ape-042 | 84 | 100 | 100 | 100 | 4,16 s | 0,000 | 138 ms |
| Desktop | / | 99 | 100 | 100 | 100 | 0,93 s | 0,002 | 0 ms |
| Desktop | /nft/emerald-ape-042 | 99 | 100 | 100 | 100 | 0,99 s | 0,042 | 0 ms |

**Metas:** Accessibility, Best Practices e SEO foram atingidas em todos os casos, e Performance no desktop. **Performance no mobile ficou abaixo da meta (84 contra 90)**; entre rodadas, a mediana variou de 84 a 88.

### Causa identificada

- O elemento de LCP é a imagem do hero (no detalhe, a imagem do NFT, que é a mesma).
- No *LCP breakdown* do relatório, a imagem chega rápido (TTFB 30 ms, atraso de carga 50 ms, carga 20 ms), mas há **700 ms de *element render delay***: o gargalo é o JavaScript executado antes da renderização, não a imagem.
- O build de demonstração precisa incluir a camada de mocks (MSW, binding de Socket.IO e fixtures): cerca de **187 kB gzip (503 kB minificado)**, o maior pedaço do JavaScript inicial, somado a React, TanStack Router/Query e Radix. Na simulação mobile do Lighthouse (rede e CPU limitadas), o download e a execução desse código levam o LCP simulado a cerca de 4 s.
- Com um backend real, o código de mocks não seria entregue ao navegador.

### Otimizações aplicadas

1. **Imagens:** os PNGs exportados do Figma (~2 MB cada) foram convertidos em WebP de 400 px e 840 px, servidos com `srcset`/`sizes` (originais em `design/nfts/`, conversão com `npm run images`). Isso tirou cerca de 8 MB do deploy, sem efeito mensurável na nota, o que confirmou que a imagem não era o gargalo.
2. **Preload da imagem de LCP** com `fetchpriority="high"` no `index.html`.
3. **Renderização sem esperar os mocks:** cabeçalho, hero e skeletons aparecem de imediato, e apenas o transporte (Axios e Socket.IO) aguarda a camada de rede ficar pronta (`src/lib/mocks-ready.ts`). Melhora a percepção de carregamento, mas não alterou o LCP simulado.

### O que não foi feito, de propósito

Adiar o carregamento dos mocks, desativá-los ou usar uma versão simplificada apenas durante a auditoria aumentaria a nota sem refletir a aplicação entregue, o que o desafio proíbe.

### Próximos passos possíveis

Analisar a composição do bundle de mocks (por exemplo, dependências do MSW que não são usadas) e dividi-lo em partes carregadas sob demanda; medir também no deploy (Vercel), que serve os arquivos com compressão e CDN.

## Decisões de UX e desvios do Figma

- Login e cadastro são páginas, e não modais no desktop.
- Faixa de preço com campos numéricos em vez de slider.
- Contagens dos filtros calculadas a partir dos dados (os números do Figma não são consistentes entre si).
- Os IDs de token do Figma variam entre telas; foi usado um ID por NFT.
- Bordas com o laranja a 30% de opacidade; raio de 5px no desktop.
- Ações fora do escopo (Criadores, Aprenda, newsletter, login social) aparecem como indisponíveis e não simulam sucesso.
- Links do Etherscan e hashes de transação são simulados.
- Barra inferior no mobile: o botão central do Figma (ícone sem rótulo) leva ao catálogo; o coração leva à nova página "Lista de interesse" (`/favoritos`), também acessível pelo menu do perfil.
- "Mais desta coleção" usa rolagem horizontal com *scroll snap* em vez de carrossel com indicadores.
- A aba de avaliações mostra a média, o total e as 5 avaliações mais recentes, vindas de `GET /api/nfts/:id/reviews`.

## Testes E2E (Playwright)

Executados em Chromium, desktop (1440px) e mobile (Pixel 7), sempre a partir de um estado isolado (contexto novo, mocks no cenário padrão). Cobertura:

- Compra completa, do catálogo ao recibo confirmado
- Acesso direto ao detalhe e NFT inexistente
- Busca/filtros combinados, ordenação e paginação na URL, com refresh e histórico
- Cadastro com conflito, logout e troca de usuário com isolamento de dados
- Sessão expirada com retorno à tela anterior
- Favoritos com falha na mutation e rollback otimista
- Carrinho: quantidades, remoção, cupom inválido e válido, persistência após refresh e login
- Pagamento recusado com clique repetido (um único pedido)
- Timeout após criar o pedido, com recuperação por idempotência
- Preço alterado durante o checkout, exigindo nova confirmação
- Tempo real via Socket.IO: atualização do resumo e descarte de eventos duplicados e antigos
- Pedido pendente retomado após desconexão e refresh
- Perfil (validação, persistência e senha) e carteiras (validação e cadastro)
- Teclado: atalho para o conteúdo, foco em erros de validação, login sem mouse, foco preso no diálogo e Escape
- Skeletons com latência lenta e recuperação após falha de servidor
- Detalhe com abas por teclado, avaliações e "Mais desta coleção"; lista de interesse; navegação inferior no mobile

**Regressão visual:** `e2e/visual.spec.ts` compara início, detalhe, carrinho e pagamento (desktop e mobile) com as baselines versionadas em `e2e/visual.spec.ts-snapshots/`. Os dados vêm do cenário padrão dos mocks; carrinho e login são criados pela API para evitar avisos na tela, e as animações são desativadas na captura. As baselines foram geradas em Windows/Chromium; em outro sistema operacional a renderização de fontes pode variar e as baselines devem ser regeneradas com `npm run test:visual:update`.

### Limitações da simulação

- A compra não reduz o estoque das edições.
- Senhas são guardadas como hash SHA-256 no mock: adequado para simulação, não para produção. `crypto.subtle` exige contexto seguro (localhost ou HTTPS).
- Hashes de transação e links do Etherscan são simulados.