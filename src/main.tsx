import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { isApiError, setUnauthorizedHandler } from "./api/client"
import { endSession } from "./features/session"
import { tokenStore } from "./lib/stores"
import { routeTree } from "./routeTree.gen"
import "./index.css"

const RETRYABLE = new Set(["TRANSIENT_ERROR", "NETWORK_ERROR"])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => isApiError(error) && RETRYABLE.has(error.code) && count < 2,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Sessão expirada: limpa dados privados, preserva o checkout e volta ao login com retorno.
setUnauthorizedHandler(() => {
  if (!tokenStore.get()) return
  endSession(queryClient, { keepCheckout: true })
  toast.error("Sua sessão expirou. Entre novamente para continuar.")
  const { pathname, href } = router.state.location
  if (pathname !== "/login") void router.navigate({ to: "/login", search: { redirect: href } })
})

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "true") return
  const { startMocks } = await import("./mocks/browser")
  await startMocks()
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})