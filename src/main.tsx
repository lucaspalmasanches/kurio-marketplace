import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import "./index.css"

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

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
    </StrictMode>
  )
})