import { readFileSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import os from "node:os"

const PROFILES = ["mobile", "desktop"]
const CATEGORIES = [
  ["performance", "Performance"],
  ["accessibility", "Accessibility"],
  ["best-practices", "Best Practices"],
  ["seo", "SEO"],
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

let environment = null
let md = "# Lighthouse: medianas de 3 execuções por página e perfil\n\n"

for (const profile of PROFILES) {
  const dir = join("lighthouse", "reports", profile)
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"))

  const byUrl = new Map()
  for (const run of manifest) {
    const list = byUrl.get(run.url) ?? []
    list.push(JSON.parse(readFileSync(join(dir, basename(run.jsonPath)), "utf8")))
    byUrl.set(run.url, list)
  }

  md += `## ${profile === "mobile" ? "Mobile" : "Desktop"}\n\n`
  md += `| Página | ${CATEGORIES.map(([, label]) => label).join(" | ")} | LCP (ms) | CLS | TBT (ms) |\n`
  md += `|---|${CATEGORIES.map(() => "---").join("|")}|---|---|---|\n`

  for (const [url, reports] of byUrl) {
    environment ??= reports[0]
    const scores = CATEGORIES.map(([id]) => Math.round(median(reports.map((r) => r.categories[id]?.score ?? 0)) * 100))
    const metric = (id) => median(reports.map((r) => r.audits[id]?.numericValue ?? 0))
    md += `| ${new URL(url).pathname} | ${scores.join(" | ")} | ${Math.round(metric("largest-contentful-paint"))} | ${metric("cumulative-layout-shift").toFixed(3)} | ${Math.round(metric("total-blocking-time"))} |\n`
  }
  md += "\n"
}

md += "## Ambiente e condições\n\n"
md += `- Data: ${new Date().toISOString()}\n`
md += `- Lighthouse: ${environment?.lighthouseVersion}\n`
md += `- Navegador: ${environment?.environment?.hostUserAgent}\n`
md += `- Node.js: ${process.version}\n`
md += `- Sistema: ${os.type()} ${os.release()} (${os.arch()}), CPU: ${os.cpus()[0]?.model}\n`
md += "- Build otimizado (`vite build`) servido por `vite preview`, mocks MSW no cenário padrão, perfil novo do navegador a cada execução\n"
md += "- Mobile: emulação e throttling padrão do Lighthouse; Desktop: preset `desktop`\n"
md += "- Configuração: `lighthouse/lighthouserc.mobile.json` e `lighthouse/lighthouserc.desktop.json`\n"

writeFileSync(join("lighthouse", "RESULTS.md"), md)
console.log(md)