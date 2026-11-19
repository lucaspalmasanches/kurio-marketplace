import sharp from "sharp"
import { mkdir, readdir } from "node:fs/promises"
import { join, parse } from "node:path"

const SOURCE = "design/nfts"
const OUTPUT = "public/images/nfts"
const WIDTHS = [400, 840]

await mkdir(OUTPUT, { recursive: true })

for (const file of await readdir(SOURCE)) {
  if (!file.endsWith(".png")) continue
  const { name } = parse(file)
  for (const width of WIDTHS) {
    const target = join(OUTPUT, `${name}-${width}.webp`)
    await sharp(join(SOURCE, file)).resize({ width, height: width, fit: "cover" }).webp({ quality: 80 }).toFile(target)
    console.log("gerado:", target)
  }
}