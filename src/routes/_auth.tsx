import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { tokenStore } from "@/lib/stores"

export const Route = createFileRoute("/_auth")({
    beforeLoad: ({ location }) => {
        if (!tokenStore.get()) throw redirect({ to: "/login", search: { redirect: location.href } })
    },
    component: () => <Outlet />,
})