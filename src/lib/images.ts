/** As imagens de NFT existem em 400px e 840px (WebP). */
export function nftSrcSet(url: string): string | undefined {
    if (!url.endsWith("-840.webp")) return undefined
    return `${url.replace("-840.webp", "-400.webp")} 400w, ${url} 840w`
}

/** Versão pequena, para miniaturas (carrinho, galeria, recibo). */
export function nftThumb(url: string): string {
    return url.replace("-840.webp", "-400.webp")
}