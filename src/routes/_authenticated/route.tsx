import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getProfile } from "@/lib/db";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Local dev: auto-auth with mock user
    const profile = getProfile();
    if (!profile) throw redirect({ to: "/auth" });
    return { user: { id: profile.id, email: profile.email, name: profile.nome } };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
