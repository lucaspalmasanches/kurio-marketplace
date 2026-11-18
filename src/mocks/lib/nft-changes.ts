import Decimal from "decimal.js"
import type { Nft, NftUpdatedEvent } from "@/api/contracts"
import { commit, getState } from "../db"
import { newId } from "./crypto"
import { publishEvent } from "./events"

export interface NftPatch {
    priceEth?: string
    availability?: Record<string, number>
}

/** Altera preço/disponibilidade, sobe a versão e publica nft.updated. Mantém REST e eventos coerentes. */
export function updateNft(nftId: string, patch: NftPatch): Nft | null {
    const nft = getState().nfts.find((n) => n.id === nftId)
    if (!nft) return null

    if (patch.priceEth !== undefined && patch.priceEth !== nft.priceEth) {
        nft.previousPriceEth = nft.priceEth
        nft.priceEth = new Decimal(patch.priceEth).toFixed(2)
    }
    if (patch.availability) {
        for (const edition of nft.editions) {
            const value = patch.availability[edition.id]
            if (value !== undefined) edition.available = Math.max(0, Math.trunc(value))
        }
    }
    nft.version += 1
    commit()

    const event: NftUpdatedEvent = {
        type: "nft.updated",
        id: newId("evt"),
        resource: { type: "nft", id: nft.id },
        version: nft.version,
        occurredAt: new Date().toISOString(),
        data: {
            priceEth: nft.priceEth,
            availability: Object.fromEntries(nft.editions.map((e) => [e.id, e.available])),
        },
    }
    publishEvent(event)
    return nft
}