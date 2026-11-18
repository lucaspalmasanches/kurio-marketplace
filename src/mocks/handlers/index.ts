import { authHandlers } from "./auth"
import { favoriteHandlers } from "./favorites"
import { nftHandlers } from "./nfts"
import { profileHandlers } from "./profile"
import { walletHandlers } from "./wallets"

export const handlers = [
    ...authHandlers,
    ...nftHandlers,
    ...favoriteHandlers,
    ...profileHandlers,
    ...walletHandlers,
]