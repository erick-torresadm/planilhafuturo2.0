import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Home, CalendarDays, Receipt, CreditCard,
  Sparkles, Wallet, ListChecks, Zap,
  Settings, LogOut, Menu, X, MoreHorizontal,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

const PRIMARY = [
  { to: "/app",     label: "Hoje",    icon: Home },
  { to: "/fluxo",   label: "Fluxo",   icon: CalendarDays },
  { to: "/gastos",  label: "Gastos",  icon: Receipt },
] as const;

const SECONDARY = [
  { to: "/parcelas",      label: "Parcelas",      icon: CreditCard,  hint: "Compras no cartão" },
  { to: "/investimentos", label: "Investimentos", icon: Wallet,      hint: "Sua reserva" },
  { to: "/desejos",       label: "Desejos & Metas", icon: Sparkles,  hint: "O que quer comprar" },
  { to: "/tarefas",       label: "Tarefas",       icon: ListChecks,  hint: "Lembretes financeiros" },
  { to: "/produtividade", label: "Produtividade", icon: Zap,         hint: "Foco e hábitos" },
  { to: "/config",        label: "Configurações", icon: Settings,    hint: "Perfil e preferências" },
] as const;

const ALL = [...PRIMARY, ...SECONDARY];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); setDrawerOpen(false); }, [loc.pathname]);

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const active = (to: string) =>
    loc.pathname === to || loc.pathname.startsWith(to + "/");
  const current = ALL.find((n) => active(n.to)) ?? PRIMARY[0];

  const inSecondary = SECONDARY.some((n) => active(n.to));

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      {/* =============== Desktop Sidebar =============== */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 z-40 w-[240px] flex-col bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border shrink-0">
          <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center shrink-0">
            <Logo size={16} withWordmark={false} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold tracking-tight truncate">planilhafuturo</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">Fluxo financeiro</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 no-scrollbar">
          <div className="mb-5">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Essencial</div>
            <div className="space-y-0.5">
              {PRIMARY.map((n) => {
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to} className={cn("sidebar-item", active(n.to) && "sidebar-item-active")}>
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{n.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="mb-5">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Mais</div>
            <div className="space-y-0.5">
              {SECONDARY.map((n) => {
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to} className={cn("sidebar-item", active(n.to) && "sidebar-item-active")}>
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{n.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button onClick={logout} className="sidebar-item w-full text-left">
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* =============== Main =============== */}
      <div className="flex flex-col min-h-[100dvh] lg:pl-[240px]">
        {/* Topbar — minimal on mobile */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
          <div
            className="h-14 lg:h-16 flex items-center gap-2 px-4 lg:px-6"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {/* Mobile brand */}
            <Link to="/app" className="lg:hidden flex items-center gap-2 min-w-0 flex-1">
              <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center shrink-0">
                <Logo size={13} withWordmark={false} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-[15px] font-bold leading-none truncate">{current.label}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5 truncate">planilhafuturo</div>
              </div>
            </Link>

            {/* Desktop title */}
            <div className="hidden lg:flex items-baseline gap-2 min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold tracking-tight truncate">{current.label}</h1>
            </div>

            {/* Right actions */}
            <Link
              to="/config"
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-[13px] font-bold shrink-0"
              aria-label="Perfil"
            >
              E
            </Link>
          </div>
        </header>

        {/* Content — padding-bottom for mobile bottom nav + safe area */}
        <main className="flex-1 min-w-0 pb-[calc(env(safe-area-inset-bottom)+80px)] lg:pb-0">
          {children}
        </main>
      </div>

      {/* =============== Mobile Bottom Tab Bar =============== */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4 h-[64px]">
          {PRIMARY.map((n) => {
            const Icon = n.icon;
            const a = active(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                  a ? "text-primary" : "text-muted-foreground",
                )}
              >
                {a && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary" />}
                <Icon className={cn("h-[22px] w-[22px] transition-transform", a && "scale-110")} strokeWidth={a ? 2.5 : 2} />
                <span className="text-[10.5px] font-semibold">{n.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 relative",
              inSecondary ? "text-primary" : "text-muted-foreground",
            )}
          >
            {inSecondary && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary" />}
            <MoreHorizontal className={cn("h-[22px] w-[22px]", inSecondary && "scale-110")} strokeWidth={inSecondary ? 2.5 : 2} />
            <span className="text-[10.5px] font-semibold">Mais</span>
          </button>
        </div>
      </nav>

      {/* =============== Mobile "Mais" bottom sheet =============== */}
      <AnimatePresence>
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl border-t border-border overflow-hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="pt-2 pb-1 grid place-items-center">
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 pt-3 pb-1 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Mais</h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="h-9 w-9 rounded-full bg-muted grid place-items-center"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-3 pt-2 pb-4 grid grid-cols-2 gap-2">
                {SECONDARY.map((n) => {
                  const Icon = n.icon;
                  const a = active(n.to);
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                        a ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                        a ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold truncate">{n.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{n.hint}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-border px-3 py-3">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-sm font-semibold text-negative"
                >
                  <LogOut className="h-4 w-4" /> Sair da conta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Silent unused imports keepers */}
      <span className="hidden">{drawerOpen ? "" : ""}{Menu ? "" : ""}</span>
    </div>
  );
}
