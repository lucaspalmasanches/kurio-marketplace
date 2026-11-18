/** Hash simples e determinístico (djb2). Não é criptográfico: serve só para ids de cotação e hashes de transação simulados. */
export function hash32(input: string): number {
    let h = 5381
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) + h) ^ input.charCodeAt(i)
    }
    return h >>> 0
}