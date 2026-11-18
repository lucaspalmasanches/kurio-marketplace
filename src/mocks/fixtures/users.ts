import type { User, Wallet } from "@/api/contracts"

export const DEFAULT_PASSWORD = "Kurio@123"

export const userFixtures: Array<User & { password: string }> = [
    {
        id: "user_ana",
        email: "ana@kurio.test",
        username: "ana",
        displayName: "Ana Souza",
        ensName: "ana",
        walletAlias: "Principal",
        avatarUrl: null,
        password: DEFAULT_PASSWORD,
    },
    {
        id: "user_bruno",
        email: "bruno@kurio.test",
        username: "bruno",
        displayName: "Bruno Lima",
        ensName: "bruno",
        walletAlias: "Principal",
        avatarUrl: null,
        password: DEFAULT_PASSWORD,
    },
]

export const walletFixtures: Record<string, Wallet[]> = {
    user_ana: [
        {
            id: "wallet_ana_primary",
            kind: "primary",
            displayName: "Ana Souza",
            alias: "Principal",
            profileName: "Ana Souza",
            network: "ethereum",
            address: "0xA91F3c7D2b8E4F105a6C9d3E7B2f0A41C8D5E82C",
            provider: "metamask",
            referralCode: "KURIO-ANA",
            email: "ana@kurio.test",
            ensName: "ana",
        },
        {
            id: "wallet_ana_secondary",
            kind: "secondary",
            displayName: "Ana Souza",
            alias: "Reserva",
            profileName: "Ana Souza",
            network: "polygon",
            address: "0x7Bc4E1f09A2d3C58b6E7F4a1D9c0B2E3f5A6D718",
            secondaryAddress: "nova.kurio.eth",
            provider: "coinbase",
            referralCode: "KURIO-ANA",
            email: "ana@kurio.test",
            ensName: "ana",
        },
    ],
    user_bruno: [
        {
            id: "wallet_bruno_primary",
            kind: "primary",
            displayName: "Bruno Lima",
            alias: "Principal",
            profileName: "Bruno Lima",
            network: "ethereum",
            address: "0x3D5f9A1c7E2b4086F1a3C5e7D9b2A4c6E8f0B1d2",
            provider: "walletconnect",
            referralCode: "KURIO-BRUNO",
            email: "bruno@kurio.test",
            ensName: "bruno",
        },
    ],
}