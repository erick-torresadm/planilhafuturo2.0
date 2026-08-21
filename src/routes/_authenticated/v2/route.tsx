import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShellV2 } from "@/components/AppShellV2";

/* Layout do /v2 — herda auth + paywall + migracao de dados do
   _authenticated pai (nao duplica nenhuma logica), so troca a casca
   visual (AppShell -> AppShellV2). */
export const Route = createFileRoute("/_authenticated/v2")({
  component: () => (
    <AppShellV2>
      <Outlet />
    </AppShellV2>
  ),
});
