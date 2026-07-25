import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Receipt, CreditCard,
  Sparkles, Wallet, ListChecks, Settings, LogOut, Menu, X, Bell, Zap, Search, Plus,
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

// Desktop top pill nav — 4 principais
const TOP_PILLS = [NAV[0], NAV[1], NAV[2], NAV[3]];
// Bottom nav mobile
const BOTTOM = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[7]];

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
    <div className="min-h-screen w-full bg-background">
      {/* ============ Desktop icon rail ============ */}
      <aside className="hidden lg:flex fixed top-6 bottom-6 left-6 z-40 w-16 flex-col items-center py-4 rounded-3xl bg-card border border-border shadow-[0_10px_40px_-20px_rgba(0,0,0,0.10)]">
        <Link to="/app" className="h-10 w-10 rounded-2xl bg-foreground grid place-items-center mb-4" aria-label="Início">
          <Logo size={18} withWordmark={false} monoColor="#a7f3d0" />
        </Link>
        <nav className="flex-1 flex flex-col items-center gap-1.5 w-full px-2 overflow-y-auto no-scrollbar">
          {NAV.map((n) => {
            const a = active(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={n.label}
                className={cn(
                  "relative h-11 w-11 grid place-items-center rounded-2xl transition-all",
                  a
                    ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-6px] shadow-primary/60"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          title="Sair"
          className="h-11 w-11 grid place-items-center rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </aside>

      {/* ============ Main column ============ */}
      <div className="lg:pl-28 lg:pr-6 min-h-screen flex flex-col">
        {/* Topbar — search + pills + actions */}
        <header className="sticky top-0 z-30 pt-4 pb-2 bg-background/85 backdrop-blur-lg">
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Mobile: burger + brand */}
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden shrink-0 grid place-items-center h-10 w-10 rounded-2xl bg-card border border-border"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search — grande e branco arredondado tipo Monetra */}
            <label className="flex-1 min-w-0 flex items-center gap-2 h-11 lg:h-12 px-4 rounded-2xl bg-card border border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                placeholder="Buscar ou digitar um comando"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">⌘K</kbd>
            </label>

            {/* Desktop pills */}
            <nav className="hidden xl:flex items-center gap-1 h-12 px-1.5 rounded-2xl bg-card border border-border">
              {TOP_PILLS.map((n) => {
                const a = active(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "relative h-9 px-3.5 grid place-items-center rounded-xl text-xs font-semibold transition-colors",
                      a ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a && (
                      <motion.span
                        layoutId="top-pill"
                        className="absolute inset-0 rounded-xl bg-foreground/[0.06]"
                        transition={{ type: "spring", stiffness: 320, damping: 30 }}
                      />
                    )}
                    <span className="relative">{n.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Create button — pill lime-mint */}
            <button
              className="hidden sm:inline-flex h-11 lg:h-12 items-center gap-1.5 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:brightness-95 transition shadow-[0_8px_22px_-10px] shadow-primary/70"
              onClick={() => nav({ to: "/gastos" })}
            >
              <Plus className="h-4 w-4" /> Novo
            </button>

            {/* Actions cluster */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button className="grid place-items-center h-11 w-11 rounded-2xl bg-card border border-border hover:bg-muted transition" aria-label="Notificações">
                <Bell className="h-4 w-4" />
                <span className="absolute mt-[-14px] ml-[14px] h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
              </button>
              <Link
                to="/config"
                className="h-11 w-11 rounded-2xl bg-foreground text-primary grid place-items-center text-sm font-bold hover:opacity-90 transition"
                aria-label="Perfil"
              >
                E
              </Link>
            </div>
          </div>

          {/* Section title breadcrumb (desktop) */}
          <div className="hidden lg:flex items-baseline gap-3 mt-4 px-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{current.label}</h1>
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              · planilhafuturo
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 pt-2 pb-32 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ============ Floating Bottom Nav (mobile/tablet) ============ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pointer-events-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto mx-auto max-w-md rounded-[28px] bg-card border border-border shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)]">
          <div className="grid grid-cols-5">
            {BOTTOM.map((n) => {
              const a = active(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold",
                    a ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "relative grid place-items-center h-9 w-11 rounded-2xl transition-all",
                      a ? "bg-primary text-primary-foreground" : "",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
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
              className="absolute inset-y-3 left-3 w-[85vw] max-w-xs rounded-3xl bg-card border border-border shadow-2xl p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-foreground grid place-items-center shrink-0">
                    <Logo size={18} withWordmark={false} monoColor="#a7f3d0" />
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
                        "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition",
                        a
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <button
                onClick={logout}
                className="mt-4 flex items-center gap-2 px-3 py-3 rounded-2xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
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
