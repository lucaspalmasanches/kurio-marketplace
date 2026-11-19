import { useQuery } from "@tanstack/react-query"
import { getWallets } from "@/api/endpoints"
import { useSession } from "./session"

export function useWallets() {
    const { user } = useSession()
    return useQuery({
        queryKey: ["wallets", user?.id],
        queryFn: ({ signal }) => getWallets(signal),
        enabled: Boolean(user),
    })
}