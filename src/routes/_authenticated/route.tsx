import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

// AUTH TEMPORARIAMENTE DESATIVADA para testes.
// Reative trocando por: beforeLoad checando supabase.auth.getUser() + redirect("/auth")
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
