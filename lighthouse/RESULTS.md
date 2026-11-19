# Lighthouse: medianas de 3 execuções por página e perfil

## Mobile

| Página | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---|---|---|---|---|---|---|
| / | 88 | 100 | 100 | 100 | 3685 | 0.016 | 149 |
| /nft/emerald-ape-042 | 87 | 100 | 100 | 100 | 3986 | 0.000 | 111 |

## Desktop

| Página | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---|---|---|---|---|---|---|
| / | 99 | 100 | 100 | 100 | 881 | 0.002 | 0 |
| /nft/emerald-ape-042 | 99 | 100 | 100 | 100 | 893 | 0.042 | 0 |

## Ambiente e condições

- Data: 2026-11-19T16:24:33.513Z
- Lighthouse: 13.6.0
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36
- Node.js: v24.19.0
- Sistema: Windows_NT 10.0.19045 (x64), CPU: Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz
- Build otimizado (`vite build`) servido por `vite preview`, mocks MSW no cenário padrão, perfil novo do navegador a cada execução
- Mobile: emulação e throttling padrão do Lighthouse; Desktop: preset `desktop`
- Configuração: `lighthouse/lighthouserc.mobile.json` e `lighthouse/lighthouserc.desktop.json`
