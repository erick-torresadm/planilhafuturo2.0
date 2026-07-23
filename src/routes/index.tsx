import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useState, type FormEvent } from "react";
import {
  ArrowRight, Check, CalendarDays, Receipt, CreditCard, Sparkles,
  Wallet, ListChecks, Table2, TrendingUp, ShieldCheck, Zap, Star,
  ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { joinWaitlist } from "@/lib/waitlist.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "dindinho — Planejamento financeiro em 6 meses, sem planilha" },
      { name: "description", content: "Enxergue seus próximos 6 meses de dinheiro em um olhar. Fluxo diário, gastos fixos, parcelas e desejos — feito pra brasileiro comum, não pra planilheiro." },
      { property: "og:title", content: "dindinho — Seu dinheiro nos próximos 6 meses" },
      { property: "og:description", content: "O SaaS que substitui aquela planilha complicada. Simples, visual, mobile-first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
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
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <SocialProof />
      <Compare />
      <Features />
      <Steps />
      <Pricing />
      <Faq />
      <Cta />
      <Footer />
    </div>
  );
}

/* ============ NAV ============ */
function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Logo size={28} />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Produto</a>
          <a href="#pricing" className="hover:text-foreground transition">Preços</a>
          <a href="#faq" className="hover:text-foreground transition">Perguntas</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2">
            Entrar
          </Link>
          <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-full mint-gradient px-4 py-2 text-sm font-semibold hover:brightness-110 transition">
            Começar grátis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ============ HERO ============ */
function Hero() {
  const reduce = useReducedMotion();
  return (
    <Section className="pt-16 sm:pt-24 pb-20 relative overflow-hidden">
      {/* subtle grid backdrop */}
      <div aria-hidden className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Beta aberto — grátis pra sempre no plano inicial
          </div>
          <h1 className="font-display text-[2.5rem] leading-[1.05] sm:text-6xl md:text-7xl tracking-tight">
            Seu dinheiro nos<br />
            <span className="italic text-primary" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>próximos 6 meses.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            Um app simples que mostra o que vai sobrar (ou faltar) todo mês. Sem fórmula, sem aba escondida, sem cara de Excel.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full mint-gradient px-6 py-3 text-sm font-semibold hover:brightness-110 transition tap-target">
              Começar de graça <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-accent transition tap-target">
              Ver como funciona
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito. 2 minutos pra começar.</p>
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 relative mx-auto max-w-4xl"
        >
          <div className="relative rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-hero)" }}>
            {/* window chrome */}
            <div className="flex items-center gap-1.5 px-4 h-9 border-b border-border bg-muted/40">
              <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.75_0.15_25)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.85_0.12_80)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.75_0.10_150)]" />
              <span className="ml-3 text-[11px] text-muted-foreground font-mono">dindinho.com.br/app</span>
            </div>
            <MockupContent />
          </div>
          {/* accent glow behind mockup */}
          <div aria-hidden className="absolute -inset-x-10 -bottom-10 h-40 bg-primary/20 blur-3xl -z-10" />
        </motion.div>
      </div>
    </Section>
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
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Saldo projetado</div>
          <div className="mt-1 font-display text-4xl num-lg">R$ 14.700</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">em 6 meses</div>
          <div className="text-sm font-semibold text-positive inline-flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> +R$ 6.280
          </div>
        </div>
      </div>
      {/* mini chart */}
      <div className="grid grid-cols-6 gap-2 h-32">
        {saldos.map((s, i) => (
          <div key={i} className="flex flex-col justify-end items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${(s / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 * i, ease: "easeOut" }}
              className="w-full rounded-t-md bg-primary/80"
            />
            <div className="text-[10px] text-muted-foreground font-mono">{meses[i]}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Entradas", value: "R$ 7.000", tone: "text-positive" },
          { label: "Saídas", value: "R$ 5.760", tone: "text-negative" },
          { label: "Sobra", value: "R$ 1.240", tone: "text-foreground" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
            <div className={`mt-1 text-sm num-lg font-semibold ${k.tone}`}>{k.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ SOCIAL PROOF (marquee de frases) ============ */
function SocialProof() {
  const items = [
    "“Substituí uma planilha de 8 abas.”",
    "“Finalmente entendi pra onde vai meu dinheiro.”",
    "“Uso todo dia no ônibus.”",
    "“Meu marido virou fã.”",
    "“Melhor que Mobills pra quem gosta de planilha.”",
    "“Sério, é lindo de usar.”",
  ];
  return (
    <div className="border-y border-border bg-card/50 py-6 overflow-hidden">
      <div className="flex gap-12 marquee whitespace-nowrap will-change-transform">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="text-sm text-muted-foreground font-display italic">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ============ COMPARE ============ */
function Compare() {
  return (
    <Section className="py-24">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <div className="text-xs uppercase tracking-widest text-primary mb-3">Do Excel pro app</div>
        <h2 className="font-display text-4xl sm:text-5xl">A mesma lógica.<br /><span className="italic">Cem vezes mais simples.</span></h2>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-2xl border border-border p-8 bg-muted/30">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Antes — planilha</div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {["8 abas conectadas por fórmulas", "Quebra quando você mexe errado", "Impossível de usar no celular", "Sem lembrete de conta pra pagar", "Você esquece de atualizar"].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-negative">✕</span> {t}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-2xl border border-primary/40 p-8 bg-primary/[0.04]" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-xs uppercase tracking-widest text-primary mb-4">Agora — dindinho</div>
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

/* ============ FEATURES (bento) ============ */
function Features() {
  const items = [
    { icon: CalendarDays, title: "Fluxo diário", desc: "Todos os dias dos próximos 6 meses, com saldo calculado.", accent: "col-span-2 row-span-2" },
    { icon: Receipt, title: "Gastos fixos", desc: "Contas mensais e anuais, cada uma no seu dia." },
    { icon: CreditCard, title: "Parcelas", desc: "Divide sozinho pelos meses. Sabe quando termina." },
    { icon: Sparkles, title: "Desejos & caixinhas", desc: "Metas com data. Ele diz se dá pra comprar." },
    { icon: Wallet, title: "Investimentos", desc: "Patrimônio, rendimento e projeção." },
    { icon: ListChecks, title: "Tarefas", desc: "Contas a pagar viram checklist." },
  ];
  return (
    <Section id="features" className="py-24">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl mb-12">
        <div className="text-xs uppercase tracking-widest text-primary mb-3">O que tem dentro</div>
        <h2 className="font-display text-4xl sm:text-5xl">Tudo que a planilha do Breno faz.<br /><span className="italic text-muted-foreground">Mais alguma coisa.</span></h2>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[180px] gap-3">
        {items.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`rounded-2xl border border-border bg-card p-6 flex flex-col hover:border-primary/40 transition ${f.accent ?? "md:col-span-1"}`}
            >
              <Icon className="h-6 w-6 text-primary mb-auto" />
              <div className="mt-4">
                <div className="font-display text-xl">{f.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
              </div>
            </motion.div>
          );
        })}
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
          <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="border-t border-border pt-6">
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
  const [annual, setAnnual] = useState(false);
  const plans = [
    { name: "Grátis", price: 0, priceYear: 0, features: ["Até 3 meses de projeção", "Fluxo diário completo", "Gastos e parcelas", "1 usuário"] },
    { name: "Pro", price: 19, priceYear: 15, badge: "Mais usado", features: ["6 meses de projeção", "Desejos e caixinhas", "Investimentos e patrimônio", "Lembretes por e-mail", "Exportar CSV"] },
  ];
  return (
    <Section id="pricing" className="py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="text-xs uppercase tracking-widest text-primary mb-3">Preços</div>
        <h2 className="font-display text-4xl sm:text-5xl">Menos que um café por semana.</h2>
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border p-1 bg-card text-sm">
          <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 rounded-full transition ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Mensal</button>
          <button onClick={() => setAnnual(true)} className={`px-4 py-1.5 rounded-full transition inline-flex items-center gap-1.5 ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Anual <span className={`text-[10px] font-mono ${annual ? "opacity-80" : "text-primary"}`}>-20%</span>
          </button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {plans.map((p) => {
          const price = annual ? p.priceYear : p.price;
          const isPro = p.name === "Pro";
          return (
            <div key={p.name} className={`rounded-2xl border p-8 relative ${isPro ? "border-primary/40 bg-primary/[0.03]" : "border-border bg-card"}`} style={isPro ? { boxShadow: "var(--shadow-card)" } : {}}>
              {p.badge && <div className="absolute -top-3 left-8 chip bg-primary text-primary-foreground">{p.badge}</div>}
              <div className="font-display text-2xl">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl num-lg">R${price}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              {annual && p.price > 0 && <div className="text-xs text-muted-foreground mt-1">Cobrado R$ {p.priceYear * 12} por ano</div>}
              <Link to="/auth" className={`mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${isPro ? "mint-gradient hover:brightness-110" : "border border-border hover:bg-accent"}`}>
                {p.price === 0 ? "Começar grátis" : "Assinar Pro"} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ============ FAQ ============ */
function Faq() {
  const items = [
    { q: "Meus dados ficam seguros?", a: "Ficam. Tudo criptografado, rodando na infraestrutura da Supabase. Só você acessa sua conta." },
    { q: "Preciso conectar meu banco?", a: "Não. Você digita — é rápido, e você fica no controle. Integração com Open Finance vem em 2026." },
    { q: "É igual à planilha do Breno?", a: "A lógica é a mesma (fluxo diário, gastos fixos, parcelas, desejos). A diferença é que aqui você não quebra nada." },
    { q: "Funciona no celular?", a: "Foi desenhado pra celular primeiro. 80% dos nossos usuários usam no ônibus." },
    { q: "Posso cancelar quando quiser?", a: "Pode. Sem multa, sem enrolação. Seus dados ficam disponíveis pra exportar por 30 dias." },
    { q: "Tem versão grátis pra sempre?", a: "Tem. O plano Grátis atende quem quer só ver os próximos 3 meses. Pro é pra quem quer os 6 meses e caixinhas." },
    { q: "Suporte se eu travar?", a: "Sim, humano de verdade. Responde em até 24h por e-mail." },
    { q: "Vocês vão sumir daqui a 6 meses?", a: "Não. É um SaaS pago com receita — a gente sobrevive dos assinantes, não de investidor." },
  ];
  return (
    <Section id="faq" className="py-24">
      <div className="grid md:grid-cols-[1fr_2fr] gap-12">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary mb-3">Perguntas</div>
          <h2 className="font-display text-4xl sm:text-5xl">Antes que<br /><span className="italic">você pergunte.</span></h2>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {items.map((it) => (
            <details key={it.q} className="group">
              <summary className="flex items-center justify-between py-5 cursor-pointer list-none">
                <span className="font-medium">{it.q}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
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
      <div className="relative rounded-3xl border border-border bg-card p-8 sm:p-16 text-center overflow-hidden">
        <div aria-hidden className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative">
          <h2 className="font-display text-4xl sm:text-5xl max-w-2xl mx-auto">Pare de rezar pra planilha não quebrar.</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">Entre no beta. Grátis, sem cartão, com todas as funções do Pro liberadas por 30 dias.</p>
          <form onSubmit={submit} className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={status === "loading" || status === "ok"}
              className="rounded-full mint-gradient px-6 py-3 text-sm font-semibold hover:brightness-110 transition disabled:opacity-60"
            >
              {status === "ok" ? "Você entrou ✓" : status === "loading" ? "Enviando…" : "Entrar no beta"}
            </button>
          </form>
          {status === "err" && <div className="mt-3 text-sm text-negative">Deu ruim. Tenta de novo?</div>}
          {status === "ok" && <div className="mt-3 text-sm text-primary">Beleza. A gente te chama.</div>}
        </div>
      </div>
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
            <div className="mt-2 text-xs text-muted-foreground">Planejamento financeiro que cabe no bolso.</div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Produto</a>
            <a href="#pricing" className="hover:text-foreground">Preços</a>
            <a href="#faq" className="hover:text-foreground">Perguntas</a>
            <Link to="/auth" className="hover:text-foreground">Entrar</Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} dindinho. Feito no Brasil.</div>
          <div className="font-mono">v0.1 · beta</div>
        </div>
      </Section>
    </footer>
  );
}
