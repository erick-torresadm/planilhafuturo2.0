import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Receipt, CreditCard,
  Sparkles, Wallet, ListChecks, Settings, LogOut, Menu, X, Bell, Zap, Search,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, group: "Principal" },
  { to: "/fluxo", label: "Fluxo Diário", icon: CalendarDays, group: "Principal" },
  { to: "/gastos", label: "Gastos Fixos", icon: Receipt, group: "Principal" },
  { to: "/parcelas", label: "Parcelas", icon: CreditCard, group: "Principal" },
  { to: "/investimentos", label: "Investimentos", icon: Wallet, group: "Patrimônio" },
  { to: "/desejos", label: "Desejos & Metas", icon: Sparkles, group: "Patrimônio" },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, group: "Rotina" },
  { to: "/produtividade", label: "Produtividade", icon: Zap, group: "Rotina" },
] as const;

const GROUPS = ["Principal", "Patrimônio", "Rotina"] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("shell-collapsed") === "1";
  });

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    try { localStorage.setItem("shell-collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const active = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname === to || loc.pathname.startsWith(to + "/");
  const current = NAV.find((n) => active(n.to)) ?? NAV[0];

  const sidebarWidth = collapsed ? 72 : 248;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* ============ Desktop Sidebar (Hope-style) ============ */}
      <aside
        className="hidden lg:flex fixed top-0 bottom-0 left-0 z-40 flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200"
        style={{ width: sidebarWidth }}
      >
        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-sidebar-border shrink-0", collapsed ? "justify-center px-2" : "px-5 gap-2.5")}>
          <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center shrink-0">
            <Logo size={16} withWordmark={false} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-[15px] font-semibold tracking-tight truncate">planilhafuturo</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">Sistema financeiro</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 no-scrollbar">
          {GROUPS.map((g) => {
            const items = NAV.filter((n) => n.group === g);
            return (
              <div key={g} className="mb-5">
                {!collapsed && (
                  <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {g}
                  </div>
                )}
                <div className="space-y-0.5">
                  {items.map((n) => {
                    const a = active(n.to);
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        title={collapsed ? n.label : undefined}
                        className={cn(
                          "sidebar-item",
                          a && "sidebar-item-active",
                          collapsed && "justify-center px-2",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="truncate">{n.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <Link
            to="/config"
            title={collapsed ? "Ajustes" : undefined}
            className={cn("sidebar-item", active("/config") && "sidebar-item-active", collapsed && "justify-center px-2")}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Ajustes</span>}
          </Link>
          <button
            onClick={logout}
            title={collapsed ? "Sair" : undefined}
            className={cn("sidebar-item w-full text-left", collapsed && "justify-center px-2")}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn("sidebar-item w-full text-left text-muted-foreground/70", collapsed && "justify-center px-2")}
          >
            {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <><ChevronsLeft className="h-[18px] w-[18px] shrink-0" /><span>Recolher</span></>}
          </button>
        </div>
      </aside>

      {/* ============ Main column ============ */}
      <div className="flex flex-col min-h-screen" style={{ paddingLeft: 0, marginLeft: 0 }}>
        <style>{`@media (min-width: 1024px) { .app-main { padding-left: ${sidebarWidth}px; } }`}</style>
        <div className="app-main flex flex-col min-h-screen">
          {/* Topbar */}
          <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur border-b border-border">
            <div className="h-full flex items-center gap-2 sm:gap-3 px-3 sm:px-6">
              {/* Mobile burger */}
              <button
                onClick={() => setOpen(true)}
                className="lg:hidden shrink-0 h-10 w-10 grid place-items-center rounded-md hover:bg-muted text-foreground"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Page title (desktop) */}
              <div className="hidden lg:flex items-baseline gap-2 min-w-0">
                <h1 className="font-display text-lg font-semibold tracking-tight truncate">{current.label}</h1>
                <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground truncate">
                  · {current.group}
                </span>
              </div>

              {/* Mobile brand */}
              <Link to="/app" className="lg:hidden flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-md bg-primary grid place-items-center shrink-0">
                  <Logo size={14} withWordmark={false} />
                </div>
                <span className="font-display text-sm font-semibold truncate">planilhafuturo</span>
              </Link>

              <div className="flex-1" />

              {/* Search */}
              <label className="hidden md:flex items-center gap-2 h-9 w-72 px-3 rounded-md bg-muted/60 border border-border text-sm">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  placeholder="Buscar…"
                  className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">⌘K</kbd>
              </label>

              {/* Actions */}
              <button className="relative h-9 w-9 grid place-items-center rounded-md hover:bg-muted text-foreground/70" aria-label="Notificações">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
              <Link
                to="/config"
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold"
                aria-label="Perfil"
              >
                E
              </Link>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* ============ Mobile Drawer ============ */}
      <AnimatePresence>
        {open && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 w-[80vw] max-w-xs bg-sidebar border-r border-sidebar-border flex flex-col"
            >
              <div className="h-16 flex items-center justify-between border-b border-sidebar-border px-4 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center shrink-0">
                    <Logo size={16} withWordmark={false} />
                  </div>
                  <div className="font-display text-sm font-semibold truncate">planilhafuturo</div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 grid place-items-center rounded-md hover:bg-muted"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {GROUPS.map((g) => {
                  const items = NAV.filter((n) => n.group === g);
                  return (
                    <div key={g} className="mb-5">
                      <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        {g}
                      </div>
                      <div className="space-y-0.5">
                        {items.map((n) => {
                          const a = active(n.to);
                          const Icon = n.icon;
                          return (
                            <Link
                              key={n.to}
                              to={n.to}
                              className={cn("sidebar-item", a && "sidebar-item-active")}
                            >
                              <Icon className="h-[18px] w-[18px] shrink-0" />
                              <span className="truncate">{n.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
              <div className="border-t border-sidebar-border p-3 space-y-1">
                <Link to="/config" className={cn("sidebar-item", active("/config") && "sidebar-item-active")}>
                  <Settings className="h-[18px] w-[18px]" /> <span>Ajustes</span>
                </Link>
                <button onClick={logout} className="sidebar-item w-full text-left">
                  <LogOut className="h-[18px] w-[18px]" /> <span>Sair</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
