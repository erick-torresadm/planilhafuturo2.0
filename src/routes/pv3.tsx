import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, MotionConfig } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Moon,
  Sun,
  Search,
  Landmark,
  Bitcoin,
  Home,
  Car,
  CreditCard,
  PiggyBank,
  Filter,
  ShoppingBag,
  Utensils,
  Fuel,
  Clapperboard,
  Lock,
  Globe,
  Eye,
  Wand2,
  Send,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Logo } from "@/components/Logo";
import { joinWaitlist } from "@/lib/waitlist.functions";

/* ============================================================
   /pv3 — Landing nova, isolada. Layout editorial claro inspirado
   em dashboards SaaS de finanças (mockups grandes, dot-grid,
   secao de IA escura), copy e marca proprias do planilhafuturo.
   Tema claro/escuro alternavel via classe .pv3 / .pv3.dark
   escopada em styles.css — nao afeta / nem /pv2.
   ============================================================ */
const WHATSAPP_URL =
  "https://wa.me/5599999999999?text=Ol%C3%A1%21%20Vim%20da%20p%C3%A1gina%20nova%20do%20planilhafuturo";

export const Route = createFileRoute("/pv3")({
  head: () => ({
    meta: [
      { title: "planilhafuturo — O app financeiro pessoal pra quem quer clareza" },
      {
        name: "description",
        content:
          "Acompanhe contas, cartões e investimentos, organize transações e projete os próximos 12 meses num painel só.",
      },
      { property: "og:title", content: "planilhafuturo — Clareza financeira em um painel só" },
      {
        property: "og:description",
        content: "Contas, cartões, orçamento e projeção de 12 meses — tudo em um app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PV3,
});

/* ================= THEME ================= */
function useTheme() {
  const [dark, setDark] = useState(false);
  return { dark, toggle: () => setDark((d) => !d) };
}

/* ================= PRIMITIVES ================= */
function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`w-full px-5 sm:px-8 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-card ${className}`}>
      {children}
    </div>
  );
}

function CtaButton({
  children = "Começar teste grátis",
  tone = "primary",
  full = false,
  size = "md",
}: {
  children?: ReactNode;
  tone?: "primary" | "outline";
  full?: boolean;
  size?: "md" | "lg";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-[1.06]"
      : "bg-card text-foreground border border-border hover:bg-secondary";
  const pad = size === "lg" ? "px-7 py-4 text-base" : "px-5 py-3 text-sm";
  return (
    <Link
      to="/auth"
      className={`group relative inline-flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-full ${pad} font-bold transition-all hover:-translate-y-0.5 ${cls}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ================= ROOT ================= */
function PV3() {
  const { dark, toggle } = useTheme();
  return (
    <MotionConfig reducedMotion="user">
      <div
        style={{ colorScheme: dark ? "dark" : "light" }}
        className={`pv3 ${dark ? "dark" : ""} min-h-screen bg-background text-foreground font-sans transition-colors duration-500`}
      >
        <TopBar dark={dark} onToggle={toggle} />
        <Hero />
        <AddAnything />
        <Transactions />
        <Budgeting />
        <Security />
        <AiSection />
        <FinalCta />
        <Footer />
      </div>
    </MotionConfig>
  );
}

/* ================= TOP BAR ================= */
function TopBar({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const links = [
    { href: "#produto", label: "Produto" },
    { href: "#seguranca", label: "Segurança" },
    { href: "#preco", label: "Preço" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <Logo size={24} />
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-1.5 text-sm">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggle}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/auth"
            className="hidden sm:inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <CtaButton size="md">Começar grátis</CtaButton>
        </div>
      </div>
    </header>
  );
}

/* ================= HERO ================= */
function Hero() {
  return (
    <Section className="relative pt-16 sm:pt-24 pb-8 text-center">
      <div className="dot-grid absolute inset-x-0 top-0 h-[560px]" aria-hidden />
      <div className="relative">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Apresentando o app novo
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-7 font-display text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.06] tracking-tight text-balance">
            O app financeiro
            <br />
            <span className="text-muted-foreground">pessoal pra todo mundo</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-muted-foreground text-balance">
            planilhafuturo é a plataforma completa de finanças pessoais. Acompanhe, organize e
            projete seu dinheiro em cada etapa da vida — num painel só.
          </p>
        </Reveal>
        <Reveal delay={0.24} className="mt-8 flex flex-col items-center gap-3">
          <CtaButton size="lg">Começar teste grátis</CtaButton>
          <span className="text-xs text-muted-foreground">
            7 dias grátis · sem cartão de crédito
          </span>
        </Reveal>
      </div>

      <Reveal delay={0.3} className="relative mt-14">
        <DashboardMock />
      </Reveal>
    </Section>
  );
}

function MiniStat({
  label,
  value,
  delta,
  up,
}: {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/60 px-3.5 py-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-sm font-bold text-foreground">{value}</span>
        <span
          className={`flex items-center text-[11px] font-semibold ${up ? "text-positive" : "text-negative"}`}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </span>
      </div>
    </div>
  );
}

function DashboardMock() {
  const nav = [
    { icon: Landmark, label: "Contas" },
    { icon: CreditCard, label: "Cartões" },
    { icon: PiggyBank, label: "Orçamento" },
    { icon: TrendingUp, label: "Investimentos" },
    { icon: ArrowLeftRight, label: "Transações" },
  ];
  const rows = [
    { icon: ShoppingBag, name: "Mercado Extra", cat: "Compras", v: "− R$ 284,90" },
    { icon: Utensils, name: "iFood", cat: "Alimentação", v: "− R$ 62,40" },
    { icon: Fuel, name: "Posto Ipiranga", cat: "Transporte", v: "− R$ 180,00" },
    { icon: Landmark, name: "Salário", cat: "Receita", v: "+ R$ 6.400,00" },
  ];
  return (
    <Card className="mx-auto max-w-5xl overflow-hidden text-left shadow-elevated">
      <div className="flex flex-col sm:flex-row">
        <div className="hidden sm:flex w-48 shrink-0 flex-col gap-1 border-r border-border bg-secondary/40 p-4">
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="h-6 w-6 rounded-lg bg-primary" />
            <span className="font-display text-sm font-bold">planilhafuturo</span>
          </div>
          {nav.map((n, i) => {
            const Icon = n.icon;
            return (
              <div
                key={n.label}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium ${i === 0 ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {n.label}
              </div>
            );
          })}
        </div>
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Bom dia, Erick</div>
              <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold">R$ 28.406,49</div>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" /> Buscar
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <MiniStat label="Este mês" value="R$ 1.450" delta="12%" up />
            <MiniStat label="Investido" value="R$ 9.820" delta="4,2%" up />
            <MiniStat label="Cartões" value="R$ 640" delta="8%" up={false} />
          </div>
          <div className="mt-4 h-20 sm:h-24 rounded-xl border border-border bg-gradient-to-t from-primary/10 to-transparent p-3">
            <svg viewBox="0 0 200 50" className="h-full w-full" preserveAspectRatio="none">
              <polyline
                points="0,40 20,32 40,35 60,20 80,26 100,14 120,18 140,8 160,15 180,6 200,10"
                fill="none"
                className="stroke-primary"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="mt-4 space-y-1.5">
            {rows.map((r) => {
              const Icon = r.icon;
              const pos = r.v.startsWith("+");
              return (
                <div
                  key={r.name}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-medium leading-tight">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{r.cat}</div>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs sm:text-sm font-semibold ${pos ? "text-positive" : "text-foreground"}`}
                  >
                    {r.v}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ================= SHARED FEATURE BLOCK ================= */
function FeatureBlock({
  id,
  title,
  highlight,
  description,
  mock,
  cards,
}: {
  id?: string;
  title: string;
  highlight: string;
  description: ReactNode;
  mock: ReactNode;
  cards: { title: string; text: string }[];
}) {
  return (
    <Section id={id} className="py-20 sm:py-28">
      <Reveal className="text-center max-w-2xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-balance">
          {title} <span className="text-muted-foreground">{highlight}</span>
        </h2>
      </Reveal>
      <Reveal delay={0.1} className="mt-12">
        {mock}
      </Reveal>
      <Reveal
        delay={0.16}
        className="mx-auto mt-8 max-w-2xl text-center text-sm sm:text-base text-muted-foreground"
      >
        {description}
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={0.1 + i * 0.08}>
            <Card className="h-full p-6">
              <h3 className="font-display text-base font-bold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ================= ADD ANYTHING ================= */
function AddAnything() {
  const items = [
    { icon: Landmark, label: "Contas bancárias" },
    { icon: TrendingUp, label: "Investimentos" },
    { icon: Bitcoin, label: "Cripto" },
    { icon: Home, label: "Imóveis" },
    { icon: Car, label: "Veículos" },
    { icon: CreditCard, label: "Cartões" },
  ];
  return (
    <FeatureBlock
      id="produto"
      title="Adicione qualquer coisa,"
      highlight="sim, qualquer coisa"
      mock={
        <Card className="mx-auto max-w-md p-4 text-left">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" /> O que você quer adicionar?
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <div
                  key={it.label}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-secondary/60"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" /> {it.label}
                </div>
              );
            })}
          </div>
        </Card>
      }
      description={
        <>
          Acompanhe suas <strong className="text-foreground">contas bancárias</strong>, ações e{" "}
          <strong className="text-foreground">cripto</strong>, monitore imóveis, veículos e tudo o
          mais que você tem — em qualquer moeda, tudo em um só lugar.
        </>
      }
      cards={[
        {
          title: "Conecte tudo automaticamente",
          text: "Vincule contas e cartões e deixe o app importar os lançamentos sozinho.",
        },
        {
          title: "Veja ativos e dívidas com clareza",
          text: "Patrimônio, investimentos e dívidas num único painel, sem planilha paralela.",
        },
        {
          title: "Não achou pronto? Adicione manual",
          text: "Cadastre contas manuais ou importe extratos via CSV em segundos.",
        },
      ]}
    />
  );
}

/* ================= TRANSACTIONS ================= */
function Transactions() {
  const rows = [
    {
      icon: ShoppingBag,
      name: "Amazon",
      cat: "Compras",
      tag: "Assinatura",
      v: "− R$ 39,90",
      pos: false,
    },
    {
      icon: Landmark,
      name: "Pagamento freela",
      cat: "Renda extra",
      tag: "Renda",
      v: "+ R$ 1.200,00",
      pos: true,
    },
    {
      icon: Utensils,
      name: "Restaurante Sabor",
      cat: "Alimentação",
      tag: "Lazer",
      v: "− R$ 128,00",
      pos: false,
    },
    {
      icon: Clapperboard,
      name: "Streaming Plus",
      cat: "Assinaturas",
      tag: "Fixo",
      v: "− R$ 34,90",
      pos: false,
    },
  ];
  return (
    <FeatureBlock
      title="Transações,"
      highlight="do seu jeito"
      mock={
        <Card className="mx-auto max-w-2xl overflow-hidden text-left">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Todas as contas · este mês
          </div>
          <div className="divide-y divide-border">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.cat}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {r.tag}
                    </span>
                    <span
                      className={`font-mono text-sm font-semibold ${r.pos ? "text-positive" : "text-foreground"}`}
                    >
                      {r.v}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      }
      description={
        <>
          Crie uma nova{" "}
          <strong className="text-foreground">receita, despesa ou transferência</strong> · edite e
          adicione <strong className="text-foreground">categorias e tags</strong> personalizadas ·
          crie filtros, importe via CSV, vincule transações e configure regras — e muito mais.
        </>
      }
      cards={[
        {
          title: "Fique por dentro de cada transação",
          text: "Cada lançamento é fácil de encontrar, editar e categorizar.",
        },
        {
          title: "Encontre exatamente o que precisa",
          text: "Filtros por conta, categoria, tag ou valor, na hora.",
        },
        {
          title: "Automatize suas transações",
          text: "Crie regras e economize tempo em lançamentos repetitivos.",
        },
      ]}
    />
  );
}

/* ================= BUDGETING ================= */
function Donut() {
  const segs = [
    { pct: 38, color: "var(--color-primary)" },
    { pct: 24, color: "var(--color-positive)" },
    { pct: 20, color: "var(--color-warning)" },
    { pct: 18, color: "var(--color-border)" },
  ];
  let acc = 0;
  const r = 15.9155;
  return (
    <svg viewBox="0 0 36 36" className="h-28 w-28 sm:h-32 sm:w-32 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="4" />
      {segs.map((s, i) => {
        const dash = `${s.pct} ${100 - s.pct}`;
        const offset = -acc;
        acc += s.pct;
        return (
          <circle
            key={i}
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="4"
            strokeDasharray={dash}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function Budgeting() {
  const cats = [
    { label: "Moradia", value: "R$ 1.800", of: "de R$ 1.900", color: "bg-primary" },
    { label: "Alimentação", value: "R$ 720", of: "de R$ 900", color: "bg-positive" },
    { label: "Assinaturas", value: "R$ 210", of: "de R$ 250", color: "bg-warning" },
    { label: "Lazer", value: "R$ 340", of: "de R$ 500", color: "bg-muted-foreground" },
  ];
  return (
    <FeatureBlock
      title="Orçamento,"
      highlight="feito simples"
      mock={
        <Card className="mx-auto max-w-2xl p-6 sm:p-8 text-left">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
            <div className="relative shrink-0">
              <Donut />
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-mono text-lg font-bold">R$ 3.070</div>
                  <div className="text-[10px] text-muted-foreground">de R$ 3.550</div>
                </div>
              </div>
            </div>
            <div className="w-full space-y-3">
              {cats.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
                    <span className="text-muted-foreground">{c.label}</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {c.value} <span className="font-normal text-muted-foreground">{c.of}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      }
      description={
        <>
          Personalize <strong className="text-foreground">orçamentos por categoria</strong>, defina{" "}
          <strong className="text-foreground">alocações inteligentes</strong> e fique no controle de
          cada categoria, todo mês.
        </>
      }
      cards={[
        {
          title: "Configure e personalize",
          text: "Monte orçamentos do seu jeito, sem modelo engessado.",
        },
        {
          title: "Acompanhe e fique no controle",
          text: "Veja onde o dinheiro vai e ajuste antes de estourar.",
        },
        {
          title: "Otimize com alocação automática",
          text: "O app sugere quanto separar pra cada categoria todo mês.",
        },
      ]}
    />
  );
}

/* ================= SECURITY ================= */
function Security() {
  const items = [
    {
      icon: Lock,
      title: "Segurança por design",
      text: "Seus dados ficam criptografados de ponta a ponta. Sem acesso interno desnecessário.",
    },
    {
      icon: Globe,
      title: "Infra confiável",
      text: "Construído sobre provedores auditados, com backup e monitoramento contínuo.",
    },
    {
      icon: Eye,
      title: "Transparência com você",
      text: "Você decide o que conecta, o que compartilha e pode exportar tudo quando quiser.",
    },
  ];
  return (
    <Section id="seguranca" className="py-20 sm:py-28">
      <Reveal className="text-center max-w-xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-balance">
          Segurança inconteste.{" "}
          <span className="text-muted-foreground">Transparência radical.</span>
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-3">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <Reveal key={it.title} delay={i * 0.08}>
              <Card className="h-full overflow-hidden">
                <div className="dot-grid relative h-32 bg-secondary/40" aria-hidden />
                <div className="p-6">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.text}</p>
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ================= AI SECTION (forced dark) ================= */
function AiSection() {
  const bubbles = [
    { me: true, text: "Quanto gastei em restaurantes esse mês?" },
    {
      me: false,
      text: "Você gastou R$ 412,30 em restaurantes em outubro — 18% a mais que setembro.",
    },
  ];
  return (
    <Section className="py-20 sm:py-28">
      <div className="pv3 dark rounded-3xl bg-background text-foreground overflow-hidden">
        <Reveal className="px-6 sm:px-14 pt-14 sm:pt-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
            <Wand2 className="h-3.5 w-3.5 text-primary" /> Novidade
          </span>
          <h2 className="mt-6 font-display text-3xl sm:text-5xl font-bold text-balance">
            Mais uma coisa. <span className="text-muted-foreground">E sim, é IA.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm sm:text-base text-muted-foreground text-balance">
            Pergunte qualquer coisa, tipo{" "}
            <em className="text-foreground not-italic font-medium">"quanto sobrou esse mês"</em> ou{" "}
            <em className="text-foreground not-italic font-medium">
              "como estão meus investimentos"
            </em>
            , e receba a resposta na hora.
          </p>
        </Reveal>
        <Reveal delay={0.12} className="px-5 sm:px-14 pb-14 sm:pb-20 pt-10">
          <Card className="mx-auto max-w-xl p-5 sm:p-6">
            <div className="space-y-3">
              {bubbles.map((b, i) => (
                <div key={i} className={`flex ${b.me ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      b.me ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    {b.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2.5">
              <span className="flex-1 text-sm text-muted-foreground">
                Pergunte qualquer coisa...
              </span>
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                <Send className="h-3.5 w-3.5" />
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}

/* ================= FINAL CTA ================= */
function FinalCta() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await joinWaitlist({ data: { email, source: "pv3" } });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Section id="preco" className="py-20 sm:py-28 text-center">
      <Reveal>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-balance">
          Transforme seu talvez
          <br />
          <span className="text-muted-foreground">numa certeza</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm sm:text-base text-muted-foreground">
          Comece grátis por 7 dias. R$ 27/mês depois, com call semanal e suporte incluídos.
        </p>
        <div className="mt-8 flex justify-center">
          <CtaButton size="lg">Começar teste grátis</CtaButton>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="mx-auto mt-14 max-w-md border-t border-border pt-10">
        <p className="text-xs text-muted-foreground mb-3">
          Ou entre pra lista de espera da próxima turma
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "done"}
            className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60 cursor-pointer"
          >
            {status === "done" ? "Entrei ✓" : status === "loading" ? "..." : "Entrar"}
          </button>
        </form>
        {status === "error" && (
          <p className="mt-2 text-xs text-destructive">Algo deu errado. Tenta de novo.</p>
        )}
      </Reveal>

      <Reveal delay={0.15} className="mx-auto mt-14 max-w-2xl">
        <Faq />
      </Reveal>
    </Section>
  );
}

/* ================= FAQ ================= */
function Faq() {
  const items = [
    {
      q: "Preciso saber de finanças pra usar?",
      a: "Não. O app foi feito pra quem nunca conseguiu manter uma planilha viva. Você lança e ele organiza.",
    },
    {
      q: "E se eu não gostar?",
      a: "7 dias de garantia incondicional. Se não fizer sentido, devolvemos 100% do valor.",
    },
    {
      q: "Como funciona a call semanal?",
      a: "Toda semana tem um encontro ao vivo pra revisar sua projeção e tirar dúvidas — fica gravado se você não puder ir.",
    },
    {
      q: "Dá pra usar no celular?",
      a: "Sim, o app funciona direto no navegador do celular, sem precisar instalar nada.",
    },
  ];
  return (
    <div id="faq">
      <h3 className="font-display text-xl font-bold text-center mb-6">Perguntas frequentes</h3>
      <Accordion type="single" collapsible className="space-y-3 text-left">
        {items.map((it, i) => (
          <AccordionItem
            key={it.q}
            value={`item-${i}`}
            className="rounded-2xl border border-border bg-card px-5"
          >
            <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
              {it.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{it.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  const cols = [
    {
      title: "Produto",
      links: [
        { l: "Como funciona", h: "#produto" },
        { l: "Segurança", h: "#seguranca" },
        { l: "Preço", h: "#preco" },
      ],
    },
    {
      title: "Recursos",
      links: [
        { l: "FAQ", h: "#faq" },
        { l: "Suporte", h: WHATSAPP_URL },
      ],
    },
    {
      title: "Legal",
      links: [
        { l: "Termos", h: "/termos" },
        { l: "Privacidade", h: "/privacidade" },
      ],
    },
  ];
  return (
    <footer className="border-t border-border py-14">
      <Section>
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo size={22} />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              O app financeiro pessoal pra você enxergar seus próximos 12 meses de dinheiro num
              painel só.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {c.title}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.l}>
                    {l.h.startsWith("http") || l.h.startsWith("#") ? (
                      <a
                        href={l.h}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.l}
                      </a>
                    ) : (
                      <Link
                        to={l.h}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.l}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} planilhafuturo. Todos os direitos reservados.
        </div>
      </Section>
    </footer>
  );
}
