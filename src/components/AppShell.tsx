import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Home, CalendarDays, Receipt, CreditCard,
  Sparkles, Wallet, ListChecks, Zap,
  Settings, LogOut, Sun, Moon, SunDim,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NAV = [
  { to: "/app",     label: "Hoje",      icon: Home,         hint: "Resumo do dia" },
  { to: "/fluxo",   label: "Fluxo",     icon: CalendarDays,  hint: "Projeção mensal" },
  { to: "/gastos",  label: "Gastos",    icon: Receipt,       hint: "Contas fixas" },
  { to: "/parcelas",label: "Parcelas",  icon: CreditCard,    hint: "Compras no cartão" },
] as const;

const MORE = [
  { to: "/investimentos", label: "Investimentos", icon: Wallet,     hint: "Sua carteira" },
  { to: "/desejos",       label: "Desejos",       icon: Sparkles,   hint: "Metas & sonhos" },
  { to: "/tarefas",       label: "Tarefas",       icon: ListChecks, hint: "Lembretes" },
  { to: "/produtividade", label: "Foco & Hábitos",icon: Zap,        hint: "Pomodoro & hábitos" },
  { to: "/config",        label: "Configurações", icon: Settings,   hint: "Perfil e preferências" },
] as const;

const ALL = [...NAV, ...MORE];

/** 5-item bottom nav for mobile */
const BOTTOM_NAV = [
  ...NAV.slice(0, 3),
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, hint: "Lembretes" },
] as const;

const REMAINING = ALL.filter((n) => !BOTTOM_NAV.some((b) => b.to === n.to));

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile(), retry: false });

  const nome = (profile.data as any)?.nome ?? "Usuário";

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return { text: "Bom dia", icon: Sun };
    if (h < 18) return { text: "Boa tarde", icon: Sun };
    return { text: "Boa noite", icon: Moon };
  }
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  async function handleLogout() {
    try {
      await logout();
      toast.success("Até logo!");
    } catch {
      toast.error("Erro ao sair");
    }
  }

  const active = (to: string) =>
    loc.pathname === to || loc.pathname.startsWith(to + "/");
  const current = ALL.find((n) => active(n.to));
  const inMore = REMAINING.some((n) => active(n.to));

  return (
    <div className="min-h-[100dvh] w-full flex bg-background">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-border bg-card">
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
          <Logo size={18} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 no-scrollbar">
          {NAV.map((n) => {
            const Icon = n.icon;
            const a = active(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors mb-0.5",
                  a
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={a ? 2.2 : 1.8} />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}

          <div className="my-2 mx-3 border-t border-border" />

          {MORE.map((n) => {
            const Icon = n.icon;
            const a = active(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors mb-0.5",
                  a
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={a ? 2.2 : 1.8} />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User greeting + Logout */}
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <GreetingIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {greeting.text}, <span className="text-foreground font-medium">{nome.split(" ")[0]}</span>
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:bg-negative-soft/50 hover:text-negative transition-colors"
          >
            <LogOut className="h-[16px] w-[16px] shrink-0" strokeWidth={1.8} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="h-14 lg:h-14 flex items-center gap-3 px-4 lg:px-6 safe-top">
            {/* Mobile brand */}
            <div className="lg:hidden flex items-center min-w-0 flex-1">
              <Logo size={18} />
            </div>

            {/* Desktop page title */}
            <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold tracking-tight truncate">
                {current?.label ?? "planilhafuturo"}
              </h1>
              {current?.hint && (
                <span className="text-xs text-muted-foreground truncate hidden xl:block">
                  — {current.hint}
                </span>
              )}
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 ml-auto">
              <Link
                to="/config"
                className="h-8 w-8 rounded-lg bg-muted grid place-items-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                aria-label="Configurações"
              >
                <Settings className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 pb-[72px] lg:pb-4">
          {children}
        </main>
      </div>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
        <div className="grid grid-cols-5 h-[60px]">
          {BOTTOM_NAV.map((n) => {
            const Icon = n.icon;
            const a = active(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1",
                  a ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div className={cn(
                  "h-7 w-7 rounded-lg grid place-items-center transition-colors",
                  a && "bg-primary/10",
                )}>
                  <Icon className={cn("h-[18px] w-[18px]")} strokeWidth={a ? 2.5 : 1.8} />
                </div>
                <span className={cn("eyebrow mt-0.5", a && "text-primary")}>
                  {n.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1",
              inMore ? "text-primary" : "text-muted-foreground",
            )}
          >
            <div className={cn(
              "h-7 w-7 rounded-lg grid place-items-center transition-colors",
              inMore && "bg-primary/10",
            )}>
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={inMore ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <span className={cn("eyebrow mt-0.5", inMore && "text-primary")}>Mais</span>
          </button>
        </div>
      </nav>

      {/* ─── Mobile "Mais" Sheet ─── */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-card rounded-t-2xl border-t border-border overflow-hidden safe-bottom animate-slide-up">
            <div className="pt-2.5 pb-1 grid place-items-center">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            <div className="px-3 pt-2 pb-1">
              <p className="eyebrow px-2 mb-3">Navegar</p>
              <div className="grid grid-cols-4 gap-2">
                {ALL.map((n) => {
                  const Icon = n.icon;
                  const a = active(n.to);
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 px-1 py-3 rounded-xl transition-colors",
                        a ? "bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                      <div className={cn(
                        "h-11 w-11 rounded-xl grid place-items-center",
                        a ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground/70",
                      )}>
                        <Icon className="h-[20px] w-[20px]" strokeWidth={a ? 2.2 : 1.8} />
                      </div>
                      <span className={cn(
                        "eyebrow text-center leading-tight",
                        a ? "text-primary" : "text-muted-foreground",
                      )}>
                        {n.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 px-1">
                <GreetingIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {greeting.text}, <span className="text-foreground font-medium">{nome.split(" ")[0]}</span>
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-sm font-medium text-negative/80 hover:text-negative hover:bg-negative-soft/50 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
