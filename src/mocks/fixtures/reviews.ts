import type { Nft, Review } from "@/api/contracts"

const AUTHORS = ["Marina Costa", "Diego Alves", "Paula Ramos", "Rafael Nunes", "Júlia Martins", "Thiago Lopes"]
const COMMENTS = [
    "Acabamento impecável, as cores ficam ainda melhores em tela grande.",
    "Chegou na carteira em segundos. Ótima experiência de compra.",
    "Uma das melhores peças da coleção Kurio Apes.",
    "Os atributos raros valem cada ETH.",
    "Gostei da procedência registrada e dos metadados completos.",
    "Arte com personalidade, virou a peça central da minha coleção.",
]

/** Gera as avaliações mais recentes de um NFT, sempre iguais para o mesmo NFT. */
export function reviewsFor(nft: Nft, limit = 5): Review[] {
    const seed = nft.tokenId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0)
    return Array.from({ length: Math.min(limit, nft.reviewCount) }, (_, i) => ({
        id: `${nft.id}-review-${i + 1}`,
        author: AUTHORS[(seed + i) % AUTHORS.length],
        rating: 4 + ((seed + i) % 2),
        comment: COMMENTS[(seed + i * 2) % COMMENTS.length],
        createdAt: new Date(Date.UTC(2026, 6, 20) - i * 3 * 86_400_000).toISOString(),
    }))
}