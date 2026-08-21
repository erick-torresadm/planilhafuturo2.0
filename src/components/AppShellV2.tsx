import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Home,
  CalendarDays,
  Receipt,
  CreditCard,
  Sparkles,
  Wallet,
  ListChecks,
  Zap,
  TrendingUp,
  History,
  Settings,
  LogOut,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Info,
  ChevronsLeft,
  ChevronsRight,
  Grid2x2,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/db";
import { toast } from "sonner";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { PrivacyProvider, usePrivacy } from "@/lib/privacy";

/* ============================================================
   AppShellV2 — casca do app inteiro. Sidebar colapsavel com
   indicador animado, bottom-nav flutuante, sheet "mais" com grid.
   ============================================================ */
const NAV = [
  { to: "/app", label: "Hoje", icon: Home, hint: "Resumo do dia" },
  { to: "/fluxo", label: "Fluxo", icon: CalendarDays, hint: "Projeção mensal" },
  { to: "/gastos", label: "Gastos", icon: Receipt, hint: "Contas fixas" },
  { to: "/parcelas", label: "Parcelas", icon: CreditCard, hint: "Compras no cartão" },
] as const;

const MORE = [
  { to: "/investimentos", label: "Investimentos", icon: Wallet, hint: "Sua carteira" },
  { to: "/mercado", label: "Mercado", icon: TrendingUp, hint: "Indicadores" },
  { to: "/historico", label: "Histórico", icon: History, hint: "Meses passados" },
  { to: "/desejos", label: "Desejos", icon: Sparkles, hint: "Metas & sonhos" },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, hint: "Lembretes" },
  { to: "/produtividade", label: "Foco & Notas", icon: Zap, hint: "Pomodoro, notas & hábitos" },
  { to: "/sobre", label: "Sobre", icon: Info, hint: "Instalar no celular" },
  { to: "/config", label: "Configurações", icon: Settings, hint: "Perfil e preferências" },
] as const;

const ALL = [...NAV, ...MORE];
const BOTTOM_NAV = [
  ...NAV.slice(0, 3),
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, hint: "Lembretes" },
] as const;
const REMAINING = ALL.filter((n) => !BOTTOM_NAV.some((b) => b.to === n.to));

export function AppShellV2({ children }: { children: ReactNode }) {
  return (
    <PrivacyProvider>
      <ShellInnerV2>{children}</ShellInnerV2>
    </PrivacyProvider>
  );
}

function ShellInnerV2({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { hidden, toggle } = usePrivacy();
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

  const active = (to: string) => loc.pathname === to || loc.pathname.startsWith(to + "/");
  const current = ALL.find((n) => active(n.to));
  const inMore = REMAINING.some((n) => active(n.to));

  return (
    <MotionConfig reducedMotion="user">
      <div className="v2-app font-sans min-h-[100dvh] w-full flex bg-background">
        {/* ─── Desktop Sidebar ─── */}
        <motion.aside
          animate={{ width: collapsed ? 76 : 232 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-col shrink-0 border-r border-border bg-card overflow-hidden"
        >
          <div
            className={cn(
              "h-14 flex items-center border-b border-border shrink-0",
              collapsed ? "justify-center px-2" : "justify-between px-4",
            )}
          >
            {!collapsed && <Logo size={18} />}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="h-11 w-11 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <LayoutGroup id="sidebar-v2">
            <nav className="flex-1 overflow-y-auto py-3 px-2.5 no-scrollbar space-y-0.5">
              {NAV.map((n) => (
                <SidebarLink key={n.to} n={n} active={active(n.to)} collapsed={collapsed} />
              ))}
              <div className={cn("my-2.5 border-t border-border", collapsed ? "mx-1" : "mx-2.5")} />
              {MORE.map((n) => (
                <SidebarLink key={n.to} n={n} active={active(n.to)} collapsed={collapsed} small />
              ))}
            </nav>
          </LayoutGroup>

          <div className="border-t border-border p-3 space-y-2">
            {!collapsed && <WorkspaceSwitcher />}
            {!collapsed && (
              <div className="flex items-center gap-2 px-1">
                <GreetingIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {greeting.text},{" "}
                  <span className="text-foreground font-medium">{nome.split(" ")[0]}</span>
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-2.5 w-full py-2 rounded-lg text-[13px] text-muted-foreground hover:bg-negative-soft/50 hover:text-negative transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
              )}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-[16px] w-[16px] shrink-0" strokeWidth={1.8} />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </motion.aside>

        {/* ─── Main ─── */}
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="h-14 flex items-center gap-3 px-4 lg:px-6 safe-top">
              <div className="lg:hidden flex items-center min-w-0 flex-1 gap-2">
                <Logo size={17} />
              </div>
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
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={toggle}
                  aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
                  title={hidden ? "Mostrar valores" : "Ocultar valores"}
                  className={cn(
                    "h-11 w-11 rounded-lg grid place-items-center transition-colors shrink-0 cursor-pointer",
                    hidden
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  {hidden ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
                <Link
                  to="/config"
                  className="h-11 w-11 rounded-lg grid place-items-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                  aria-label="Configurações"
                >
                  <Settings className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.main
              key={loc.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-w-0 pb-[84px] lg:pb-6"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

        {/* ─── Mobile floating bottom nav ─── */}
        <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 safe-bottom">
          <div className="grid grid-cols-5 h-[60px] rounded-3xl bg-card/95 backdrop-blur-xl border border-border shadow-elevated">
            {BOTTOM_NAV.map((n) => {
              const Icon = n.icon;
              const a = active(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className="relative flex flex-col items-center justify-center gap-0.5"
                >
                  {a && (
                    <motion.div
                      layoutId="bottom-nav-pill-v2"
                      className="absolute top-1.5 h-8 w-8 rounded-xl bg-primary/10"
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] relative",
                      a ? "text-primary" : "text-muted-foreground",
                    )}
                    strokeWidth={a ? 2.4 : 1.8}
                  />
                  <span
                    className={cn("eyebrow relative", a ? "text-primary" : "text-muted-foreground")}
                  >
                    {n.label}
                  </span>
                </Link>
              );
            })}
            <button
              onClick={() => setMoreOpen(true)}
              className="relative flex flex-col items-center justify-center gap-0.5"
            >
              {inMore && (
                <motion.div
                  layoutId="bottom-nav-pill-v2"
                  className="absolute top-1.5 h-8 w-8 rounded-xl bg-primary/10"
                  transition={{ duration: 0.25 }}
                />
              )}
              <Grid2x2
                className={cn(
                  "h-[18px] w-[18px] relative",
                  inMore ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={inMore ? 2.4 : 1.8}
              />
              <span
                className={cn(
                  "eyebrow relative",
                  inMore ? "text-primary" : "text-muted-foreground",
                )}
              >
                Mais
              </span>
            </button>
          </div>
        </nav>

        {/* ─── Mobile "Mais" sheet ─── */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              className="lg:hidden fixed inset-0 z-50"
              initial={false}
              animate="open"
              exit="closed"
            >
              <motion.div
                className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMoreOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-0 inset-x-0 bg-card rounded-t-[28px] border-t border-border overflow-hidden safe-bottom"
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-1">
                  <p className="eyebrow">Navegar</p>
                  <button
                    onClick={() => setMoreOpen(false)}
                    aria-label="Fechar"
                    className="h-11 w-11 rounded-full grid place-items-center text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-3 pt-2 pb-1">
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
                          <div
                            className={cn(
                              "h-11 w-11 rounded-xl grid place-items-center",
                              a
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-foreground/70",
                            )}
                          >
                            <Icon className="h-[20px] w-[20px]" strokeWidth={a ? 2.2 : 1.8} />
                          </div>
                          <span
                            className={cn(
                              "eyebrow text-center leading-tight",
                              a ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {n.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-border px-4 py-3 space-y-2">
                  <WorkspaceSwitcher />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-sm font-medium text-negative/80 hover:text-negative hover:bg-negative-soft/50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function SidebarLink({
  n,
  active,
  collapsed,
  small,
}: {
  n: (typeof NAV)[number];
  active: boolean;
  collapsed: boolean;
  small?: boolean;
}) {
  const Icon = n.icon;
  return (
    <Link
      to={n.to}
      className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors mb-0.5"
      title={collapsed ? n.label : undefined}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      <Icon
        className={cn(
          "relative shrink-0",
          small ? "h-[16px] w-[16px]" : "h-[18px] w-[18px]",
          active ? "text-primary" : "text-muted-foreground",
        )}
        strokeWidth={active ? 2.2 : 1.8}
      />
      {!collapsed && (
        <span
          className={cn(
            "relative truncate text-[13px] font-medium",
            active ? "text-primary font-semibold" : "text-muted-foreground",
          )}
        >
          {n.label}
        </span>
      )}
    </Link>
  );
}
