import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Receipt, CreditCard,
  Sparkles, Wallet, ListChecks, Settings, LogOut, Menu, X, Bell, Zap, Search,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, short: "Home" },
  { to: "/fluxo", label: "Fluxo Diário", icon: CalendarDays, short: "Fluxo" },
  { to: "/produtividade", label: "Produtividade", icon: Zap, short: "Foco" },
  { to: "/gastos", label: "Gastos Fixos", icon: Receipt, short: "Gastos" },
  { to: "/parcelas", label: "Parcelas", icon: CreditCard, short: "Parc." },
  { to: "/desejos", label: "Desejos", icon: Sparkles, short: "Desejos" },
  { to: "/investimentos", label: "Investimentos", icon: Wallet, short: "Invest." },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, short: "Tarefas" },
  { to: "/config", label: "Ajustes", icon: Settings, short: "Ajustes" },
] as const;

// Bottom nav shows 5 most-used
const BOTTOM = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[7]];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const active = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname === to || loc.pathname.startsWith(to + "/");
  const current = NAV.find((n) => active(n.to)) ?? NAV[0];

  return (
    <div className="min-h-screen w-full bg-surface-2/40">
      {/* soft ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-mint-glow/15 blur-3xl" />
      </div>

      {/* ============ Floating Desktop Sidebar ============ */}
      <aside className="hidden lg:flex fixed top-4 bottom-4 left-4 z-40 w-64 flex-col rounded-3xl bg-white/85 backdrop-blur-xl border border-border shadow-[0_10px_40px_-15px_rgba(0,0,0,0.12)]">
        <Link to="/app" className="px-5 pt-5 pb-4 flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
            <Logo size={22} withWordmark={false} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base leading-tight truncate">planilhafuturo</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">v2 · finanças</div>
          </div>
        </Link>

        <div className="px-3 pb-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface text-xs text-muted-foreground hover:bg-white transition">
            <Search className="h-3.5 w-3.5" />
            <span>Buscar…</span>
            <kbd className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const a = active(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  a
                    ? "bg-primary/10 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {a && (
                  <motion.span
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                )}
                <Icon className={cn("relative h-4 w-4 shrink-0", a ? "text-primary" : "")} />
                <span className="relative truncate">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* ============ Main column ============ */}
      <div className="lg:pl-[17.5rem] lg:pr-4 lg:pt-4 min-h-screen flex flex-col">
        {/* Floating Topbar */}
        <header className="sticky top-2 lg:top-0 z-30 mx-2 sm:mx-3 lg:mx-0 mt-2 lg:mt-0">
          <div
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 h-14 px-3 sm:px-4 rounded-2xl border transition-all",
              scrolled
                ? "bg-white/90 backdrop-blur-xl border-border shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]"
                : "bg-white/70 backdrop-blur-md border-border/60",
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => setOpen(true)}
                className="lg:hidden shrink-0 grid place-items-center h-9 w-9 rounded-xl hover:bg-muted transition"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 lg:hidden min-w-0">
                <Logo size={22} withWordmark={false} />
                <div className="font-display text-base truncate">planilhafuturo</div>
              </div>
              <div className="hidden lg:flex flex-col min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Você está em
                </div>
                <div className="font-display font-semibold text-sm truncate">{current.label}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button className="hidden sm:grid place-items-center h-9 w-9 rounded-xl hover:bg-muted transition" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </button>
              <button className="relative grid place-items-center h-9 w-9 rounded-xl hover:bg-muted transition" aria-label="Notificações">
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary" />
              </button>
              <Link
                to="/config"
                className="ml-1 h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
                aria-label="Perfil"
              >
                E
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 pt-4 pb-32 lg:pb-8 px-2 sm:px-3 lg:px-0">
          <div className="lg:pl-0">{children}</div>
        </main>
      </div>

      {/* ============ Floating Bottom Nav (mobile/tablet) ============ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pointer-events-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto mx-auto max-w-md rounded-3xl bg-white/90 backdrop-blur-xl border border-border shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)]">
          <div className="grid grid-cols-5">
            {BOTTOM.map((n) => {
              const a = active(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium",
                    a ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "relative grid place-items-center h-9 w-11 rounded-xl transition-all",
                      a ? "bg-primary/10" : "",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {a && (
                      <motion.span
                        layoutId="bottom-dot"
                        className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className="truncate max-w-[60px]">{n.short}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ============ Mobile off-canvas ============ */}
      <AnimatePresence>
        {open && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-3 left-3 w-[85vw] max-w-xs rounded-3xl bg-white border border-border shadow-2xl p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
                    <Logo size={22} withWordmark={false} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-base truncate">planilhafuturo</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Finanças</div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 grid place-items-center h-9 w-9 rounded-xl hover:bg-muted transition"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto -mx-1 px-1">
                {NAV.map((n) => {
                  const a = active(n.to);
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition",
                        a
                          ? "bg-primary/10 text-foreground font-semibold border border-primary/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", a && "text-primary")} />
                      <span className="truncate">{n.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <button
                onClick={logout}
                className="mt-4 flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
