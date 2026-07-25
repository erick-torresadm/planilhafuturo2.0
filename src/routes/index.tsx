import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useState, useRef, type FormEvent } from "react";
import {
  ArrowRight, Check, CalendarDays, Receipt, CreditCard, Sparkles,
  Wallet, ListChecks, TrendingUp, Star, ChevronDown, Zap, ShieldCheck, LineChart,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Testimonials } from "@/components/Testimonials";
import { GradientOrbs } from "@/components/lp/GradientOrbs";
import { AnimatedNumber } from "@/components/lp/AnimatedNumber";
import { MagneticButton } from "@/components/lp/MagneticButton";
import { TiltCard } from "@/components/lp/TiltCard";
import { CookieBanner } from "@/components/CookieBanner";
import { ChatWidget } from "@/components/ChatWidget";
import { joinWaitlist } from "@/lib/waitlist.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "planilhafuturo — Planejamento financeiro em 6 meses, sem planilha" },
      { name: "description", content: "Enxergue seus próximos 6 meses de dinheiro em um olhar. Fluxo diário, gastos fixos, parcelas e desejos — feito pra brasileiro comum, não pra planilheiro." },
      { property: "og:title", content: "planilhafuturo — Planejamento financeiro em 6 meses, sem planilha" },
      { property: "og:description", content: "Enxergue seus próximos 6 meses de dinheiro em um olhar. Fluxo diário, gastos fixos, parcelas e desejos — feito pra brasileiro comum, não pra planilheiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`w-full px-5 sm:px-8 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Landing() {
  return (
    <div className="lp-dark min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />
      <Hero />
      <Stats />
      <SocialProof />
      <Features />
      <Showcase />
      <ForWho />
      <Compare />
      <Steps />
      <Testimonials />
      <Pricing />
      <PlanilhaOffer />
      <Guarantee />
      <Faq />
      <Cta />
      <Footer />
      <CookieBanner />
      <ChatWidget />
    </div>
  );
}


/* ============ NAV ============ */
function Nav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-3 sm:top-5 inset-x-0 z-40 px-3 sm:px-5"
    >
      <div className="mx-auto max-w-5xl rounded-full bg-white/85 backdrop-blur-xl border border-border shadow-[0_10px_40px_-15px_rgba(0,0,0,0.12)]">
        <div className="h-14 pl-4 pr-2 sm:pl-5 sm:pr-2.5 flex items-center gap-3">
          <Link to="/" className="shrink-0"><Logo size={26} /></Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground mx-auto">
            <a href="#features" className="hover:text-foreground transition">Produto</a>
            <a href="#showcase" className="hover:text-foreground transition">Como funciona</a>
            <a href="#pricing" className="hover:text-foreground transition">Preços</a>
            <Link to="/docs" className="hover:text-foreground transition">Docs</Link>
          </nav>
          <div className="ml-auto md:ml-0 flex items-center gap-1.5 shrink-0">
            <Link to="/auth" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-full">
              Entrar
            </Link>
            <Link
              to="/auth"
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:brightness-105 transition shadow-[0_8px_24px_-8px_rgba(16,185,129,0.55)]"
            >
              Começar
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}


/* ============ HERO ============ */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const mockupScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const words = "Seu dinheiro nos próximos 6 meses.".split(" ");

  return (
    <div ref={ref} className="relative overflow-hidden pt-14 sm:pt-20 pb-24">
      <GradientOrbs />
      <div aria-hidden className="absolute inset-0 lp-grid-anim" />

      <Section className="relative">
        <motion.div initial="hidden" animate="show" variants={stagger} className="text-center max-w-3xl mx-auto">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur px-3 py-1.5 text-xs text-foreground/90 mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="font-mono uppercase tracking-widest text-[10px]">v1.0 · beta aberto</span>
          </motion.div>

          <h1 className="font-display text-[2.6rem] leading-[1.02] sm:text-6xl md:text-7xl">
            {words.map((w, i) => {
              const isFuture = ["próximos", "meses."].includes(w);
              return (
                <motion.span
                  key={i}
                  variants={fadeUp}
                  className={`inline-block mr-[0.25em] ${isFuture ? "grad-text" : ""}`}
                >
                  {w}
                </motion.span>
              );
            })}
          </h1>

          <motion.p variants={fadeUp} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            Uma planilha inteligente que mostra o que vai sobrar ou faltar todo dia.
            Sem fórmula, sem aba escondida, sem cara de Excel dos anos 2000.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <MagneticButton
              href="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold transition shadow-[0_0_0_1px_rgba(115,255,184,0.5),0_20px_50px_-15px_rgba(45,212,168,0.7)] hover:brightness-110"
            >
              Começar grátis <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <a href="#showcase" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/40 backdrop-blur px-6 py-3.5 text-sm font-semibold text-foreground/90 hover:border-primary/40 hover:text-primary transition">
              Ver produto ao vivo
            </a>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-4 text-xs text-muted-foreground font-mono">
            <span className="text-primary">▸</span> sem cartão · 2 min pra ver o futuro
          </motion.p>
        </motion.div>

        {/* Mockup */}
        <motion.div
          style={{ y: mockupY, scale: mockupScale }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 relative mx-auto max-w-4xl"
        >
          <TiltCard className="rounded-2xl">
            <div className="relative rounded-2xl border border-primary/20 bg-card overflow-hidden shadow-[0_40px_120px_-30px_rgba(45,212,168,0.35)]">
              <div className="flex items-center gap-1.5 px-4 h-9 border-b border-border bg-surface-2/60">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="ml-3 text-[11px] text-muted-foreground font-mono">planilhafuturo.com.br/app</span>
                <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-primary/80">
                  <span className="lp-ticker-blink h-1.5 w-1.5 rounded-full bg-primary" />
                  live
                </span>
              </div>
              <MockupContent />
            </div>
          </TiltCard>
          <div aria-hidden className="absolute -inset-x-10 -bottom-20 h-40 bg-primary/30 blur-3xl -z-10" />
        </motion.div>
      </Section>
    </div>
  );
}

function MockupContent() {
  const meses = ["Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const saldos = [8420, 9180, 10240, 11530, 12980, 14700];
  const max = Math.max(...saldos);
  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Saldo projetado</div>
          <div className="mt-1 font-mono text-4xl font-semibold text-foreground">
            R$ <AnimatedNumber to={14700} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">em 6 meses</div>
          <div className="text-sm font-semibold text-primary inline-flex items-center gap-1 font-mono">
            <TrendingUp className="h-3.5 w-3.5" /> +R$ 6.280
          </div>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2 h-32">
        {saldos.map((s, i) => (
          <div key={i} className="flex flex-col justify-end items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${(s / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.6 + 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-t-md bg-gradient-to-t from-primary/50 to-primary"
              style={{ boxShadow: "0 0 20px -2px rgba(115,255,184,0.5)" }}
            />
            <div className="text-[10px] text-muted-foreground font-mono">{meses[i]}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Entradas", value: 7000, tone: "text-primary" },
          { label: "Saídas", value: 5760, tone: "text-negative" },
          { label: "Sobra", value: 1240, tone: "text-foreground" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-surface-2/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{k.label}</div>
            <div className={`mt-1 text-sm font-mono font-semibold ${k.tone}`}>
              R$ <AnimatedNumber to={k.value} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ STATS BAR ============ */
function Stats() {
  const stats = [
    { n: 6, suffix: " meses", label: "de projeção diária" },
    { n: 2400, prefix: "+", label: "brasileiros no beta" },
    { n: 97, suffix: "%", label: "usam no celular" },
    { n: 12, suffix: "s", label: "pra ver o futuro" },
  ];
  return (
    <div className="border-y border-border bg-surface-2/30 backdrop-blur">
      <Section className="py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center md:text-left"
            >
              <div className="font-mono text-3xl sm:text-4xl font-semibold text-primary">
                <AnimatedNumber to={s.n} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground uppercase tracking-widest font-mono">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ============ SOCIAL PROOF MARQUEE ============ */
function SocialProof() {
  const items = [
    "Substituí uma planilha de 8 abas",
    "Finalmente entendi pra onde vai meu dinheiro",
    "Uso todo dia no ônibus",
    "Meu marido virou fã",
    "Parece uma planilha de verdade",
    "Sério, é lindo de usar",
    "Nunca mais quebrei fórmula",
  ];
  return (
    <div className="border-b border-border py-8 overflow-hidden">
      <div className="flex gap-12 marquee whitespace-nowrap will-change-transform">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="text-sm text-muted-foreground inline-flex items-center gap-3">
            <span className="text-primary font-mono">▸</span>
            <span className="font-mono">{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============ FEATURES ============ */
function Features() {
  const items = [
    { icon: CalendarDays, title: "Fluxo diário", desc: "Todos os dias dos próximos 6 meses, com saldo calculado em tempo real." },
    { icon: Receipt, title: "Gastos fixos", desc: "Contas mensais e anuais, cada uma no seu dia de vencimento." },
    { icon: CreditCard, title: "Parcelas", desc: "Divide sozinho pelos meses. Você sabe exatamente quando termina." },
    { icon: Sparkles, title: "Desejos & metas", desc: "Caixinhas com data. O app diz se dá pra comprar ou não." },
    { icon: Wallet, title: "Investimentos", desc: "Patrimônio, rendimento e projeção — tudo num lugar só." },
    { icon: ListChecks, title: "Tarefas", desc: "Contas a pagar viram checklist. Lembrete antes do vencimento." },
  ];
  return (
    <Section id="features" className="py-24 relative">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl mb-14">
        <div className="eyebrow text-primary mb-3">// features</div>
        <h2 className="font-display text-4xl sm:text-5xl">
          Tudo que sua planilha fazia.<br />
          <span className="grad-text">Cem vezes mais simples.</span>
        </h2>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="lp-card p-6 group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="font-display text-xl">{f.title}</div>
              <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</div>
              <div className="mt-4 font-mono text-[10px] text-primary/60 uppercase tracking-widest">
                0{i + 1} / 06
              </div>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

/* ============ PRODUCT SHOWCASE ============ */
function Showcase() {
  const rows = [
    { icon: LineChart, title: "Enxerga tudo em um scroll", desc: "Do dia de hoje até dezembro — sem trocar de aba, sem calcular nada." },
    { icon: Zap, title: "Atualiza sozinho", desc: "Mudou o salário? A projeção inteira se recalcula em milissegundos." },
    { icon: ShieldCheck, title: "Seus dados, seu banco", desc: "Criptografia ponta a ponta. Nem a gente enxerga o que você digita." },
  ];
  return (
    <Section id="showcase" className="py-24 relative">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center max-w-2xl mx-auto mb-16">
        <div className="eyebrow text-primary mb-3">// how it works</div>
        <h2 className="font-display text-4xl sm:text-5xl">
          Um produto que pensa <span className="grad-text">à frente</span>.
        </h2>
      </motion.div>
      <div className="space-y-4">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, x: i % 2 ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="lp-card p-6 sm:p-8 flex items-center gap-6"
            >
              <div className="font-mono text-4xl sm:text-5xl font-semibold text-primary/40 shrink-0">
                0{i + 1}
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-display text-xl sm:text-2xl">{r.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{r.desc}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

/* ============ COMPARE ============ */
function Compare() {
  return (
    <Section className="py-24">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <div className="eyebrow text-primary mb-3">// migração</div>
        <h2 className="font-display text-4xl sm:text-5xl">A mesma lógica.<br /><span className="grad-text">Zero fórmula.</span></h2>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-2xl border border-border p-8 bg-surface-2/20">
          <div className="eyebrow text-muted-foreground mb-4">Antes · Excel</div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {["8 abas conectadas por fórmulas", "Quebra quando você mexe errado", "Impossível de usar no celular", "Sem lembrete de conta pra pagar", "Você esquece de atualizar"].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-negative font-mono">×</span> {t}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-2xl border border-primary/40 p-8 bg-primary/[0.05] lp-glow-pulse relative overflow-hidden">
          <div className="eyebrow text-primary mb-4">Agora · planilhafuturo</div>
          <ul className="space-y-3 text-sm">
            {["Tudo já conectado, sem fórmula", "Você só preenche os valores", "Feito pra celular primeiro", "Avisa antes do vencimento", "Sincroniza sozinho"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t}</li>
            ))}
          </ul>
        </motion.div>
      </div>
    </Section>
  );
}

/* ============ STEPS ============ */
function Steps() {
  const steps = [
    { n: "01", title: "Cadastra sua renda", desc: "Salário, freela, o que vier. Pode ter mais de uma fonte." },
    { n: "02", title: "Solta os gastos", desc: "Aluguel, streaming, mercado. Fixos e parcelas em 1 tela." },
    { n: "03", title: "Vê o futuro", desc: "6 meses de saldo projetado. Sabe se dá pra viajar em outubro." },
  ];
  return (
    <Section className="py-24">
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative border-t border-primary/20 pt-6"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 + 0.2 }}
              className="absolute top-0 left-0 h-px w-16 bg-primary origin-left"
            />
            <div className="font-mono text-xs text-primary">{s.n}</div>
            <div className="font-display text-2xl mt-3">{s.title}</div>
            <div className="text-sm text-muted-foreground mt-2">{s.desc}</div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ============ PRICING ============ */
function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "69,90",
      period: "/ano",
      priceNote: "Menos de R$ 6/mês.",
      cta: "Começar Starter",
      features: [
        "1 mês de projeção do fluxo",
        "Gastos fixos ilimitados",
        "Parcelas e cartões",
        "App no celular e desktop",
      ],
      muted: ["Sem produtividade", "Sem desejos & investimentos", "Sem suporte em call"],
    },
    {
      name: "Anual",
      price: "300",
      period: "/ano",
      priceNote: "R$ 25/mês · mais escolhido",
      badge: "popular",
      cta: "Assinar Anual",
      features: [
        "6 meses de projeção completa",
        "Fluxo diário e gastos fixos",
        "Parcelas e cartões ilimitados",
        "Desejos, caixinhas e metas",
        "Investimentos e patrimônio",
        "Produtividade (pomodoro + hábitos)",
        "Lembretes por e-mail",
        "Suporte exclusivo em call com erick",
      ],
    },
    {
      name: "Vitalício",
      price: "800",
      period: "único",
      priceNote: "Sem mensalidade. Para sempre.",
      badge: "fundador",
      cta: "Comprar Vitalício",
      features: [
        "Tudo do plano Anual",
        "Acesso vitalício, sem renovar",
        "Todas as atualizações futuras",
        "Suporte exclusivo em call com erick",
        "Suporte prioritário",
        "Selo de membro fundador",
      ],
    },
  ] as Array<{ name: string; price: string; period: string; priceNote: string; cta: string; features: readonly string[]; badge?: string; muted?: readonly string[] }>;
  return (
    <Section id="pricing" className="py-24">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="eyebrow text-primary mb-3">// pricing</div>
        <h2 className="font-display text-4xl sm:text-5xl">Escolha por onde começar.</h2>
        <p className="mt-4 text-muted-foreground">Barreira baixa. Upgrade quando quiser destravar tudo.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {plans.map((p) => {
          const isFeatured = p.name === "Anual";
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className={`relative rounded-2xl border p-6 sm:p-7 flex flex-col ${
                isFeatured
                  ? "border-primary/60 bg-gradient-to-b from-primary/[0.08] to-transparent md:scale-[1.03] lp-glow-pulse"
                  : "lp-card"
              }`}
            >
              {p.badge && (
                <div className={`absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest ${
                  isFeatured ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
                }`}>
                  {p.badge}
                </div>
              )}
              <div className="font-display text-2xl">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-mono text-5xl font-semibold text-foreground">R${p.price}</span>
                <span className="text-sm text-muted-foreground font-mono">{p.period}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">{p.priceNote}</div>
              <Link
                to="/auth"
                className={`mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                  isFeatured
                    ? "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_0_1px_rgba(115,255,184,0.5),0_15px_40px_-10px_rgba(45,212,168,0.6)]"
                    : "border border-border hover:border-primary/40 hover:text-primary"
                }`}
              >
                {p.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => {
                  const isCall = f.includes("Suporte exclusivo em call");
                  return (
                    <li key={f} className={`flex gap-2 items-start ${isCall ? "text-primary font-medium" : ""}`}>
                      {isCall ? <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                      {f}
                    </li>
                  );
                })}
                {"muted" in p && p.muted?.map((f) => (
                  <li key={f} className="flex gap-2 items-start text-muted-foreground/60 line-through">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 opacity-40" />{f}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8 font-mono">
        garantia de 7 dias · reembolso sem burocracia
      </p>
      <p className="text-center text-sm mt-3">
        Prefere só a planilha original?{" "}
        <a href="#planilha" className="text-primary font-semibold underline underline-offset-4 decoration-primary/40 hover:decoration-primary">
          Compre por R$ 129,90 →
        </a>
      </p>
    </Section>
  );
}

/* ============ SPREADSHEET OFFER ============ */
function PlanilhaOffer() {
  return (
    <Section id="planilha" className="py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl border border-border bg-card/60 backdrop-blur p-6 sm:p-10 grid md:grid-cols-2 gap-8 md:gap-12 items-center relative overflow-hidden"
      >
        <div aria-hidden className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="eyebrow text-primary mb-4">// alternativa · excel</div>
          <h2 className="font-display text-3xl sm:text-4xl leading-tight">
            Prefere planilha?<br /><span className="grad-text">A original que deu origem ao app.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Mesma metodologia E-S-D-E-C, offline no seu Excel ou Google Sheets. Personalize como quiser.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              "Mesma metodologia dos 6 meses",
              "Funciona offline · Excel + Sheets",
              "Você personaliza fórmulas",
              "Pagamento único · acesso vitalício",
              "Suporte por e-mail",
            ].map((f) => (
              <li key={f} className="flex gap-2 items-start">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{f}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold">R$ 129,90</span>
            <span className="text-sm text-muted-foreground font-mono">único</span>
          </div>
          <a
            href="https://wa.me/5599999999999?text=Ol%C3%A1%21%20Quero%20comprar%20a%20planilha%20por%20R%24%20129%2C90"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 text-primary px-6 py-3 text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition"
          >
            Quero a planilha <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-3 text-xs text-muted-foreground font-mono">entrega manual · respondo em 24h</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 bg-primary/20 rounded-3xl blur-2xl" aria-hidden />
          <TiltCard className="relative rounded-2xl">
            <div className="relative rounded-2xl border border-primary/20 bg-background overflow-hidden shadow-[0_30px_80px_-20px_rgba(45,212,168,0.4)]">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-surface-2/40">
                <span className="h-2.5 w-2.5 rounded-full bg-negative/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <span className="ml-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Planilha_do_Futuro.xlsx</span>
              </div>
              <div className="p-4 sm:p-5 font-mono text-[10px] sm:text-[11px]">
                <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 gap-y-1.5">
                  <div className="text-muted-foreground uppercase tracking-widest">DIA</div>
                  <div className="text-muted-foreground uppercase tracking-widest">ENTRADA</div>
                  <div className="text-muted-foreground uppercase tracking-widest">SAÍDA</div>
                  <div className="text-muted-foreground uppercase tracking-widest">SALDO</div>
                  {[
                    ["01", "R$ 7.000", "—", "R$ 7.000"],
                    ["05", "—", "R$ 1.200", "R$ 5.800"],
                    ["10", "—", "R$ 480", "R$ 5.320"],
                    ["15", "R$ 1.500", "—", "R$ 6.820"],
                    ["20", "—", "R$ 890", "R$ 5.930"],
                    ["25", "—", "R$ 1.740", "R$ 4.190"],
                    ["30", "—", "R$ 420", "R$ 3.770"],
                  ].map((row, i) => (
                    <div key={i} className="contents">
                      <div className="text-foreground/80">{row[0]}</div>
                      <div className="text-primary">{row[1]}</div>
                      <div className="text-negative">{row[2]}</div>
                      <div className="font-semibold">{row[3]}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Sobra do mês</span>
                  <span className="font-semibold text-primary">+ R$ 3.770</span>
                </div>
              </div>
            </div>
          </TiltCard>
        </div>
      </motion.div>
    </Section>
  );
}

/* ============ FAQ ============ */
function Faq() {
  const items = [
    { q: "Meus dados ficam seguros?", a: "Ficam. Tudo criptografado, rodando na infraestrutura da Lovable Cloud. Só você acessa sua conta." },
    { q: "Preciso conectar meu banco?", a: "Não. Você digita — é rápido, e você fica no controle. Integração com Open Finance vem em 2026." },
    { q: "É igual à planilha que eu uso hoje?", a: "A lógica é a mesma (fluxo diário, gastos fixos, parcelas, desejos). A diferença é que aqui você não quebra nada." },
    { q: "Funciona no celular?", a: "Foi desenhado pra celular primeiro. 80% dos nossos usuários usam no ônibus." },
    { q: "Posso cancelar quando quiser?", a: "Pode. Sem multa. Seus dados ficam disponíveis pra exportar por 30 dias." },
    { q: "Tem plano de entrada?", a: "O Starter (R$ 69,90/ano) mostra 1 mês. O Anual libera os 6 meses, produtividade e suporte em call comigo." },
    { q: "Por que só cobrança anual?", a: "Planejamento financeiro só faz sentido no longo prazo. Preço anual sai mais barato e nos ajuda a construir sem depender de investidor." },
    { q: "Vocês vão sumir daqui a 6 meses?", a: "Não. É um SaaS pago com receita — a gente sobrevive dos assinantes, não de VC." },
  ];
  return (
    <Section id="faq" className="py-24">
      <div className="grid md:grid-cols-[1fr_2fr] gap-12">
        <div>
          <div className="eyebrow text-primary mb-3">// faq</div>
          <h2 className="font-display text-4xl sm:text-5xl">Antes que<br /><span className="grad-text">você pergunte.</span></h2>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {items.map((it) => (
            <details key={it.q} className="group">
              <summary className="flex items-center justify-between py-5 cursor-pointer list-none hover:text-primary transition">
                <span className="font-medium">{it.q}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 group-open:text-primary" />
              </summary>
              <p className="pb-5 text-sm text-muted-foreground max-w-xl">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ============ CTA + WAITLIST ============ */
function Cta() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await joinWaitlist({ data: { email, source: "landing-cta" } });
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  }
  return (
    <Section className="py-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.1] via-card to-card p-8 sm:p-16 text-center overflow-hidden lp-glow-pulse"
      >
        <div aria-hidden className="absolute inset-0 lp-grid-anim opacity-40" />
        <div className="relative">
          <div className="eyebrow text-primary mb-4 justify-center">// pare de rezar</div>
          <h2 className="font-display text-4xl sm:text-5xl max-w-2xl mx-auto">
            Pare de rezar pra planilha <span className="grad-text">não quebrar.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Entre no beta. Grátis, sem cartão, com todas as funções do Pro liberadas por 30 dias.
          </p>
          <form onSubmit={submit} className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 rounded-full border border-border bg-background/60 backdrop-blur px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 font-mono"
            />
            <MagneticButton
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:brightness-110 transition disabled:opacity-60 shadow-[0_0_0_1px_rgba(115,255,184,0.5),0_15px_40px_-10px_rgba(45,212,168,0.6)]"
              onClick={() => {}}
            >
              {status === "ok" ? "Você entrou ✓" : status === "loading" ? "Enviando…" : "Entrar no beta"}
            </MagneticButton>
          </form>
          {status === "err" && <div className="mt-3 text-sm text-negative">Deu ruim. Tenta de novo?</div>}
          {status === "ok" && <div className="mt-3 text-sm text-primary">Beleza. A gente te chama.</div>}
        </div>
      </motion.div>
    </Section>
  );
}

/* ============ FOOTER ============ */
function Footer() {
  return (
    <footer className="border-t border-border">
      <Section className="py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Logo size={24} />
            <div className="mt-2 text-xs text-muted-foreground font-mono">planejamento financeiro que cabe no bolso</div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-primary transition">Produto</a>
            <a href="#pricing" className="hover:text-primary transition">Preços</a>
            <a href="#faq" className="hover:text-primary transition">Perguntas</a>
            <Link to="/docs" className="hover:text-primary transition">Docs</Link>
            <Link to="/termos" className="hover:text-primary transition">Termos</Link>
            <Link to="/privacidade" className="hover:text-primary transition">Privacidade</Link>
            <Link to="/cookies" className="hover:text-primary transition">Cookies</Link>
            <Link to="/auth" className="hover:text-primary transition">Entrar</Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div>© {new Date().getFullYear()} planilhafuturo · feito no Brasil · contato@planilhafuturo.com.br</div>
          <div className="inline-flex items-center gap-2">
            <span className="lp-ticker-blink h-1.5 w-1.5 rounded-full bg-primary" />
            v1.0 · beta
          </div>
        </div>
      </Section>
    </footer>
  );
}

/* ============ FOR WHO ============ */
function ForWho() {
  const yes = [
    "está em qualquer fase: CLT, autônomo ou estudante",
    "tem dívidas, empréstimos ou contas atrasadas pra organizar",
    "quer entender pra onde vai a renda — fixa ou variável",
    "sonha em fazer sobrar dinheiro sem se sentir mão-de-vaca",
  ];
  const no = [
    "procura milagre ou enriquecimento rápido",
    "quer só dica de investimento e trade",
    "não quer olhar pros próprios números",
    "espera resultado sem preencher nada",
  ];
  return (
    <Section className="py-24">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <div className="eyebrow text-primary mb-3">// pra quem</div>
        <h2 className="font-display text-4xl sm:text-5xl">É pra você se…</h2>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="lp-card p-8">
          <div className="eyebrow text-primary mb-4">// serve pra você</div>
          <ul className="space-y-3 text-sm">
            {yes.map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-8 bg-surface-2/20">
          <div className="eyebrow text-muted-foreground mb-4">// não é pra você</div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {no.map((t) => (
              <li key={t} className="flex gap-2"><span className="text-negative font-mono">×</span> {t}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ============ GUARANTEE ============ */
function Guarantee() {
  return (
    <Section className="py-16">
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-transparent p-8 sm:p-12 grid md:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="h-20 w-20 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mx-auto md:mx-0">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center md:text-left">
          <div className="eyebrow text-primary mb-2 justify-center md:justify-start">// garantia</div>
          <h3 className="font-display text-2xl sm:text-3xl">7 dias pra testar. Se não servir, devolvo cada centavo.</h3>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
            Você entra, mexe, testa em todos os cenários. Se em 7 dias corridos não fizer sentido pra sua
            vida financeira, é só me escrever — reembolso 100%, sem formulário, sem interrogatório.
          </p>
        </div>
      </div>
    </Section>
  );
}

