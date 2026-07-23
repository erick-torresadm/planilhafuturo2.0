import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Receipt, CreditCard,
  Sparkles, Wallet, ListChecks, Settings, LogOut,
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/fluxo", label: "Fluxo Diário", icon: CalendarDays },
  { to: "/app/gastos", label: "Gastos Fixos", icon: Receipt },
  { to: "/app/parcelas", label: "Parcelas", icon: CreditCard },
  { to: "/app/desejos", label: "Fila de Desejos", icon: Sparkles },
  { to: "/app/investimentos", label: "Investimentos", icon: Wallet },
  { to: "/app/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/app/config", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav2 = useNavigate();
  async function logout() {
    await supabase.auth.signOut();
    nav2({ to: "/auth" });
  }
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="text-lg font-bold tracking-tight">Planilha</div>
          <div className="text-xs opacity-70">Planejamento financeiro</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/app" && loc.pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="m-2 flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/60"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </aside>
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  );
}
