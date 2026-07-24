import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Receipt, CreditCard,
  Sparkles, Wallet, ListChecks, Settings, LogOut, Menu, X, Bell,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, short: "Home" },
  { to: "/fluxo", label: "Fluxo Diário", icon: CalendarDays, short: "Fluxo" },
  { to: "/gastos", label: "Gastos Fixos", icon: Receipt, short: "Gastos" },
  { to: "/parcelas", label: "Parcelas", icon: CreditCard, short: "Parc" },
  { to: "/desejos", label: "Desejos", icon: Sparkles, short: "Desejos" },
  { to: "/investimentos", label: "Investimentos", icon: Wallet, short: "Invest" },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, short: "Tarefas" },
  { to: "/config", label: "Configurações", icon: Settings, short: "Config" },
];

// Bottom nav shows only the 5 most-used
const BOTTOM = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[5]];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [loc.pathname]);

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const active = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname === to || loc.pathname.startsWith(to + "/");
  const current = NAV.find((n) => active(n.to)) ?? NAV[0];

  return (
    <div className="min-h-screen flex w-full">
      {/* ============ Desktop Sidebar ============ */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-2">
          <Logo size={28} withWordmark={false} />
          <div>
            <div className="font-display text-lg leading-tight">planilhafuturo</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Finanças</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const a = active(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  a
                    ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                    : "text-sidebar-foreground/80 hover:bg-black/5 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", a && "drop-shadow-[0_0_6px_oklch(0.82_0.19_165)]")} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-black/5 hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* ============ Main column ============ */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
          <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
            <button onClick={() => setOpen(true)} className="lg:hidden tap-target -ml-2 grid place-items-center rounded-lg hover:bg-black/5">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Logo size={24} withWordmark={false} />
              <div className="font-display text-lg">planilhafuturo</div>
            </div>
            <div className="hidden lg:block">
              <div className="text-xs text-muted-foreground">Você está em</div>
              <div className="font-display font-semibold text-sm -mt-0.5">{current.label}</div>
            </div>
            <div className="flex-1" />
            <button className="tap-target grid place-items-center rounded-lg hover:bg-black/5 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 pb-28 lg:pb-6">{children}</main>

        {/* Bottom nav (mobile only) */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5">
            {BOTTOM.map((n) => {
              const a = active(n.to);
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium tap-target",
                    a ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {a && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                  <Icon className={cn("h-5 w-5", a && "drop-shadow-[0_0_8px_oklch(0.82_0.19_165)]")} />
                  {n.short}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ============ Mobile off-canvas ============ */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar border-r border-sidebar-border p-4 flex flex-col fade-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Logo size={28} withWordmark={false} />
                <div>
                  <div className="font-display text-lg">planilhafuturo</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Finanças</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="tap-target grid place-items-center rounded-lg hover:bg-black/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {NAV.map((n) => {
                const a = active(n.to);
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm",
                      a ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30" : "hover:bg-black/5",
                    )}
                  >
                    <Icon className="h-4 w-4" /> {n.label}
                  </Link>
                );
              })}
            </nav>
            <button onClick={logout} className="mt-4 flex items-center gap-2 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:bg-black/5">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
