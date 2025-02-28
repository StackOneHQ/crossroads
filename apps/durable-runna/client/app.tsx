import { ChatInterface } from "@/client/components/chat";
import RunningPlanGenerator from "@/client/components/form";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./styles/app.css";

const rootRoute = createRootRoute({
  component: () => (
    <main className="app-container">
      <h1 className="app-title">Running Plan Generator</h1>
      <Outlet />
    </main>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RunningPlanGenerator,
})

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat/$planId',
  component: () => <ChatInterface />,
})

const routeTree = rootRoute.addChildren([indexRoute, chatRoute])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return <RouterProvider router={router} />
}

createRoot(document.getElementById("root")!).render(<App />);