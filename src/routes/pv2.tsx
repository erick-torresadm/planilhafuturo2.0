import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import {
  ArrowRight, Check, ShieldCheck, Clock, Headphones, PlayCircle,
  Sparkles, Target, Zap, ListChecks, CalendarDays, TrendingUp,
  Wallet, Receipt, CreditCard, ChevronDown, Lock, MessageCircle,
  Video, Users, FileText, Radio, X, Gift, Award, Flame,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { joinWaitlist } from "@/lib/waitlist.functions";

/* ============================================================
   /pv2 — Landing longa (VSL) inspirada no formato Fluxo Produtivo
   Trocar o número abaixo pelo WhatsApp real quando disponível.
   ============================================================ */
const WHATSAPP_URL = "https://wa.me/5599999999999?text=Ol%C3%A1%21%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20planilhafuturo";

export const Route = createFileRoute("/pv2")({
  head: () => ({
    meta: [
      { title: "planilhafuturo — Pare de rezar pra planilha não quebrar" },
      { name: "description", content: "O método simples pra enxergar seus próximos 6 meses de dinheiro em um olhar. App + suporte em call com erick." },
      { property: "og:title", content: "planilhafuturo — Método completo pra organizar sua vida financeira" },
      { property: "og:description", content: "App + call de suporte semanal + método. Enxergue seus próximos 6 meses em um olhar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PV2,
});

/* ================= PRIMITIVES ================= */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`w-full px-5 sm:px-8 ${className}`}>
      <div className="mx-auto max-w-3xl">{children}</div>
    </section>
  );
}

function CtaButton({ children = "Quero minha vida financeira organizada", tone = "primary" }: { children?: React.ReactNode; tone?: "primary" | "outline" }) {
  const cls = tone === "primary"
    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110"
    : "bg-card text-foreground border-2 border-foreground/80 hover:bg-foreground hover:text-background";
  return (
    <Link
      to="/auth"
      className={`group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-5 text-base sm:text-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 ${cls}`}
    >
      {children}
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function TrustRow() {
  const items = [
    { icon: Clock, label: "Acesso por", strong: "1 ano" },
    { icon: Video, label: "Call ao vivo", strong: "toda semana" },
    { icon: MessageCircle, label: "Suporte", strong: "no WhatsApp" },
    { icon: ShieldCheck, label: "Garantia de", strong: "7 dias" },
  ];
  return (
    <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.strong} className="flex flex-col items-center gap-2">
            <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-xs sm:text-sm text-muted-foreground">
              {it.label} <span className="font-bold text-foreground block sm:inline">{it.strong}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentLogos() {
  return (
    <div className="mt-6 flex items-center justify-center gap-2 flex-wrap opacity-70">
      {["VISA", "MASTER", "ELO", "HIPER", "AMEX", "PIX", "BOLETO"].map((b) => (
        <div key={b} className="rounded-md border border-border bg-card px-3 py-1.5 text-[10px] font-mono text-muted-foreground tracking-widest">
          {b}
        </div>
      ))}
    </div>
  );
}

function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="absolute inset-x-0 bottom-0 h-[55%] bg-primary/30 -z-10 rounded-sm" />
      <span className="relative">{children}</span>
    </span>
  );
}

/* ================= ROOT ================= */
function PV2() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <Hero />
      <ThreeThings />
      <VideoBlock />
      <FirstCta />
      <Transformation />
      <BeforeAfter />
      <MethodIntro />
      <Phases />
      <LiveSupport />
      <MidCta />
      <SocialProof />
      <ForWho />
      <Bonuses />
      <Author />
      <Objections />
      <PriceStack />
      <Guarantee />
      <Faq />
      <FinalCta />
      <Footer />
      <WhatsAppFab />
    </div>
  );
}

/* ================= TOP BAR ================= */
function TopBar() {
  const anchors = [
    { href: "#metodo", label: "Método" },
    { href: "#suporte", label: "Suporte" },
    { href: "#bonus", label: "Bônus" },
    { href: "#oferta", label: "Oferta" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
        <Logo size={28} />
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {anchors.map((a) => (
            <a key={a.href} href={a.href} className="hover:text-foreground transition">{a.label}</a>
          ))}
        </nav>
        <a href="#oferta" className="rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold px-4 py-2 hover:brightness-110">
          Ver oferta
        </a>
      </div>
    </header>
  );
}

/* ================= HERO ================= */
function Hero() {
  return (
    <Section className="pt-12 sm:pt-20 pb-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary font-semibold mb-6"
      >
        <Radio className="h-3.5 w-3.5" /> Turma de beta com vagas limitadas
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="font-display text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] tracking-tight"
      >
        Qualquer pessoa pode ter uma <Hi>vida financeira</Hi> <Hi>organizada e previsível</Hi>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-8 text-lg font-bold"
      >
        Assista a apresentação abaixo e você vai aprender 3 coisas:
      </motion.p>
    </Section>
  );
}

/* ================= 3 THINGS ================= */
function ThreeThings() {
  const items = [
    { n: 1, text: <>Qual o melhor jeito de começar a organizar seu dinheiro, <strong>usando um app simples</strong> — sem fórmula, sem aba escondida.</> },
    { n: 2, text: <>Um plano de ação para <strong>parar de viver no vermelho e sobrar dinheiro todo mês</strong>, mesmo ganhando o mesmo salário.</> },
    { n: 3, text: <>Como <strong>enxergar seus próximos 6 meses de dinheiro em um olhar</strong> — e saber se dá pra viajar em outubro sem quebrar em novembro.</> },
  ];
  return (
    <Section className="py-8">
      <div className="space-y-6">
        {items.map((it, i) => (
          <motion.div
            key={it.n}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex items-start gap-5"
          >
            <div className="shrink-0 grid place-items-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-black text-lg shadow-md shadow-primary/30">
              {it.n}
            </div>
            <p className="pt-2 text-base sm:text-lg leading-relaxed">{it.text}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ================= VIDEO MOCK ================= */
function VideoBlock() {
  return (
    <Section className="py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative rounded-3xl overflow-hidden border-4 border-foreground/90 bg-card"
        style={{ boxShadow: "var(--shadow-hero)" }}
      >
        <div className="relative aspect-video bg-gradient-to-br from-primary/10 via-background to-primary/5">
          <FloatingIcon className="top-[15%] left-[8%]" delay={0} tone="bg-[oklch(0.75_0.15_25)]"><Receipt className="h-6 w-6 text-white" /></FloatingIcon>
          <FloatingIcon className="top-[10%] left-[22%]" delay={0.2} tone="bg-white border border-border"><CalendarDays className="h-6 w-6 text-primary" /></FloatingIcon>
          <FloatingIcon className="top-[42%] left-[10%]" delay={0.4} tone="bg-foreground"><Wallet className="h-6 w-6 text-background" /></FloatingIcon>
          <FloatingIcon className="top-[30%] left-[26%]" delay={0.6} tone="bg-primary"><CreditCard className="h-6 w-6 text-primary-foreground" /></FloatingIcon>

          <div className="absolute inset-0 grid place-items-center">
            <div className="grid place-items-center h-20 w-20 rounded-full border-2 border-foreground/80 bg-background/80 backdrop-blur hover:scale-110 transition-transform cursor-pointer">
              <PlayCircle className="h-14 w-14 text-foreground" strokeWidth={1} />
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background px-5 py-2 shadow-md">
            <div className="font-display text-2xl sm:text-3xl font-black">
              Veja <span className="italic">como funciona</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

function FloatingIcon({ children, className, delay, tone }: { children: React.ReactNode; className: string; delay: number; tone: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
      whileInView={{ opacity: 1, scale: 1, rotate: [-8, 4, -3, 0] }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
      className={`absolute grid place-items-center h-12 w-12 rounded-xl shadow-lg ${tone} ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ================= CTA REUSABLES ================= */
function FirstCta() {
  return (
    <Section className="py-8">
      <CtaButton />
      <PaymentLogos />
      <TrustRow />
    </Section>
  );
}
function MidCta() {
  return (
    <Section className="py-16">
      <CtaButton>Quero entrar no beta agora</CtaButton>
      <TrustRow />
    </Section>
  );
}

/* ================= TRANSFORMATION ================= */
function Transformation() {
  const bullets = [
    <>Deitar a cabeça no travesseiro <strong>sem se preocupar com boleto esquecido.</strong></>,
    <>Saber, no dia 5, <strong>exatamente o que vai sobrar no dia 30.</strong></>,
    <>Parar de <strong>fugir do extrato do cartão</strong> — enxergar cada parcela até o último mês.</>,
    <>Comprar o que gosta <strong>sem culpa</strong>, porque cabe no plano.</>,
    <>Ter <strong>reserva de emergência</strong> montada em 6 meses, mesmo começando do zero.</>,
    <>Sair do "automático" e ter <strong>clareza absoluta</strong> das próximas decisões financeiras.</>,
  ];
  return (
    <Section className="py-20">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Transformação</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Com o planilhafuturo <span className="italic">você será capaz de:</span>
        </h2>
      </div>
      <ul className="space-y-4">
        {bullets.map((b, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="grid place-items-center h-9 w-9 rounded-full bg-primary shrink-0">
              <Check className="h-5 w-5 text-primary-foreground" strokeWidth={3} />
            </div>
            <p className="pt-1 text-base sm:text-lg leading-relaxed">{b}</p>
          </motion.li>
        ))}
      </ul>
    </Section>
  );
}

/* ================= BEFORE/AFTER ================= */
function BeforeAfter() {
  const before = ["8 abas quebradas por fórmulas", "Trava quando você mexe errado", "Impossível de usar no celular", "Você esquece de atualizar", "Sem lembrete de conta pra pagar"];
  const after = ["1 tela — tudo já conectado", "Projeção automática, zero fórmula", "Feito pra celular primeiro", "Sincroniza sozinho", "Avisa antes do vencimento"];
  return (
    <Section className="py-16">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Antes × Depois</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          A mesma lógica. <span className="italic">Cem vezes mais simples.</span>
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-muted/30 p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-bold">Antes — planilha</div>
          <ul className="space-y-3 text-sm">
            {before.map((t) => (
              <li key={t} className="flex items-start gap-2 text-muted-foreground">
                <X className="h-4 w-4 text-negative shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/[0.04] p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-xs uppercase tracking-widest text-primary mb-4 font-bold">Agora — planilhafuturo</div>
          <ul className="space-y-3 text-sm">
            {after.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ================= METHOD INTRO ================= */
function MethodIntro() {
  return (
    <Section id="metodo" className="py-20 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Um plano <Hi>simples</Hi> para organizar seu dinheiro em 6 meses
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">
          Essa é a base do método <strong className="text-foreground">Planejamento Futuro</strong>.
        </p>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          Cada fase tem um objetivo e depende da anterior — por isso funciona. A gente quebra uma caminhada longa <strong className="text-foreground">em passos simples e possíveis.</strong>
        </p>
        <div className="mt-8 inline-block font-display text-2xl font-black italic border-b-4 border-primary pb-1">
          Entenda as etapas
        </div>
      </motion.div>
    </Section>
  );
}

/* ================= PHASES ================= */
function Phases() {
  const phases = [
    {
      tag: "Iniciante", title: "Ter clareza do agora", icon: Target,
      goal: "Objetivo: enxergar sua situação real",
      body: <>Se você não sabe pra onde vai seu dinheiro, <strong>você não consegue mudar nada.</strong> Ponto.<br /><br />Aqui você faz 3 movimentos: cadastra sua renda, solta seus gastos fixos e vê pela primeira vez <strong>quanto sobra (ou falta) todo mês.</strong></>,
      chips: ["Renda", "Gastos fixos", "Sobra mensal"],
    },
    {
      tag: "Visionário", title: "Ver os próximos 6 meses", icon: TrendingUp,
      goal: "Objetivo: parar de ser surpreendido",
      body: <>É fácil demais quebrar quando um IPVA aparece do nada em janeiro. Aqui você começa a ver <strong>o saldo do seu dia 15 de dezembro, hoje.</strong><br /><br />Sem susto, sem "achismo". Só olhando.</>,
      chips: ["Fluxo diário", "Projeção 6 meses", "Saldo por dia"],
    },
    {
      tag: "Organizado", title: "Sistema que não quebra", icon: ListChecks,
      goal: "Objetivo: sair da planilha eterna",
      body: <>Ninguém segue uma planilha de 8 abas por muito tempo. Você usa <strong>6 telas simples</strong> pra organizar tudo: fluxo, gastos, parcelas, desejos, investimentos e tarefas.<br /><br />(Muitos usuários relatam <strong>redução clara de ansiedade</strong> nessa fase.)</>,
      chips: ["Parcelas", "Cartões", "Contas a pagar"],
    },
    {
      tag: "Realizador", title: "Realizar desejos com data", icon: Sparkles,
      goal: "Objetivo: comprar o que quer, sem culpa",
      body: <>Você coloca o que quer (viagem, notebook, curso), põe a data, e o app te fala <strong>se dá — e o quanto guardar por mês.</strong><br /><br />Nada de "vou tentar". É plano.</>,
      chips: ["Desejos", "Caixinhas", "Metas com prazo"],
    },
    {
      tag: "Mestre", title: "Patrimônio crescendo sozinho", icon: Zap,
      goal: "Objetivo: ver o dinheiro trabalhar",
      body: <>Reserva de emergência montada, dívidas sob controle, investimento entrando todo mês.<br /><br />Nessa fase você tem clareza total: <strong>saúde financeira,</strong> tempo de qualidade e liberdade pra decisões grandes.</>,
      chips: ["Reserva", "Investimentos", "Patrimônio"],
    },
  ];
  return (
    <Section className="py-10 space-y-16">
      {phases.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.tag}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="grid place-items-center h-11 w-11 rounded-xl bg-primary/10 border border-primary/30">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-xs uppercase tracking-widest text-primary font-bold">Fase 0{i + 1} · {p.tag}</div>
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-black leading-tight">{p.title}</h3>
            <div className="mt-2 font-bold">{p.goal}</div>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">{p.body}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {p.chips.map((c) => (
                <span key={c} className="rounded-full bg-card border border-border px-3 py-1 text-xs font-semibold">{c}</span>
              ))}
            </div>
          </motion.div>
        );
      })}
    </Section>
  );
}

/* ================= LIVE SUPPORT ================= */
function LiveSupport() {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const highlight = new Set([1, 3]); // Ter, Qui
  return (
    <Section id="suporte" className="py-24">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Suporte ao vivo</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Call comigo <span className="italic">toda semana</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          A maioria dos SaaS te entrega um e-mail e some. Aqui é diferente.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl border-2 border-primary/40 bg-card overflow-hidden"
        style={{ boxShadow: "var(--shadow-hero)" }}
      >
        {/* mock "call header" */}
        <div className="bg-foreground text-background px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest">Sala aberta</span>
          </div>
          <div className="text-xs font-mono opacity-70">planilhafuturo · live</div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="grid grid-cols-7 gap-2 mb-8">
            {days.map((d, i) => (
              <div key={d} className={`text-center rounded-xl border p-3 ${highlight.has(i) ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{d}</div>
                {highlight.has(i) ? (
                  <div className="mt-2 text-xs font-bold text-primary">20h</div>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">—</div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4 text-base leading-relaxed">
            <p>Você entra numa call ao vivo comigo (Zoom / Google Meet), <strong>toda terça e quinta às 20h</strong>, e a gente destrava sua planilha juntos.</p>
            <p>Categorização travando? Não sabe se aquela parcela entra em fixo ou parcela? Quer revisar seu mês? <strong>É só entrar e perguntar.</strong></p>
            <p className="text-muted-foreground text-sm italic">Não é bot. Não é e-mail. É call de verdade — só acaba quando as dúvidas acabam.</p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Video, t: "Ao vivo", s: "Zoom / Meet" },
              { icon: Users, t: "Em grupo", s: "Aprende com os outros" },
              { icon: MessageCircle, t: "WhatsApp", s: "Entre as calls" },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.t} className="rounded-xl border border-border bg-background p-4 flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{k.t}</div>
                    <div className="text-xs text-muted-foreground">{k.s}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

/* ================= SOCIAL PROOF ================= */
function SocialProof() {
  const msgs = [
    { name: "Marina, 34", text: "Finalmente vi que sobrava R$ 400 escondidos no meu mês. Nunca tinha percebido." },
    { name: "Ricardo, 41", text: "Substituí uma planilha de 8 abas que eu mantinha há 6 anos. Nunca mais volto." },
    { name: "Camila, 27", text: "Zerei o cartão em 3 meses só de ver as parcelas todas ao mesmo tempo." },
    { name: "João, 38", text: "Meu marido virou fã, agora ele mexe mais do que eu 😂" },
    { name: "Beatriz, 29", text: "Consegui montar reserva de 3 meses. A projeção me deu segurança pra guardar." },
    { name: "Felipe, 45", text: "Uso todo dia no ônibus, na volta do trabalho. 2 minutinhos e tá atualizado." },
  ];
  return (
    <Section className="py-24">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Prova social</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Quem usa está <span className="italic">organizado em outro nível</span>
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">Todo dia a gente recebe mensagens assim.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {msgs.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-2xl rounded-tl-none bg-primary/10 border border-primary/20 p-4"
          >
            <p className="text-sm leading-relaxed">"{m.text}"</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-6 w-6 rounded-full bg-primary/30 grid place-items-center font-bold text-primary text-[10px]">
                {m.name[0]}
              </div>
              {m.name}
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground italic max-w-lg mx-auto">
        Temos uma pasta com dezenas de mensagens assim — colocamos só algumas pra não deixar a página gigante.
      </p>
    </Section>
  );
}

/* ================= FOR WHO ================= */
function ForWho() {
  const items = [
    "Vivem no vermelho e não sabem o motivo exato",
    "Se sentem esgotadas com boletos e cartão estourado",
    "Já tentaram planilha e desistiram na segunda semana",
    "Ficam com culpa toda vez que compram algo que gostam",
    "Vivem no automático, sem clareza pra onde vai o dinheiro",
    "Querem viajar, comprar, investir — mas nunca sobra",
    "Não têm nem 1 mês de reserva de emergência",
  ];
  return (
    <Section className="py-24">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pra quem é</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          O planilhafuturo é <span className="italic">pra pessoas que:</span>
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((t, i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="grid place-items-center h-8 w-8 rounded-full bg-primary/15 shrink-0">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm sm:text-base">{t}</div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ================= BONUSES ================= */
function Bonuses() {
  const core = [
    { icon: CalendarDays, title: "Fluxo diário dos 6 meses", body: "Todos os dias, com saldo calculado sozinho. Zero fórmula.", value: "R$ 297" },
    { icon: Receipt, title: "Gastos fixos + anuais", body: "IPVA, IPTU, seguro — cada um no seu dia certo. Não escapa.", value: "R$ 197" },
    { icon: CreditCard, title: "Parcelas ilimitadas", body: "Divide sozinho pelos meses. Você sabe quando termina.", value: "R$ 197" },
    { icon: Sparkles, title: "Desejos & caixinhas", body: "Metas com data. O app te diz se cabe no seu bolso.", value: "R$ 147" },
    { icon: Wallet, title: "Investimentos & patrimônio", body: "Vê seu dinheiro crescer mês a mês. Projeção incluída.", value: "R$ 197" },
    { icon: ListChecks, title: "Contas a pagar como tarefa", body: "Vira checklist. Marca como pago e some. Simples assim.", value: "R$ 97" },
  ];
  const bonus = [
    { icon: Video, title: "[Bônus] Call de suporte semanal", body: "Toda terça e quinta às 20h, ao vivo comigo. Só acaba quando as dúvidas acabam.", value: "R$ 1.200" },
    { icon: Users, title: "[Bônus] Mentoria em grupo mensal", body: "1x por mês, encontro estratégico: reserva, dívida grande, aposentadoria. Fica gravado.", value: "R$ 497" },
    { icon: FileText, title: "[Bônus] Workshop: reserva de emergência do zero", body: "Passo a passo pra montar 6 meses de reserva mesmo tendo dívida hoje.", value: "R$ 297" },
    { icon: Award, title: "[Bônus] Kit de metas anuais (PDF)", body: "Planilha imprimível pra revisar seu ano — impressa na parede funciona.", value: "R$ 97" },
    { icon: Gift, title: "[Bônus] Módulo aulas extras", body: "Dívida no cartão, negociação com banco, organização de senhas, e mais.", value: "R$ 197" },
  ];
  return (
    <Section id="bonus" className="py-24 border-t border-border">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">O que está incluso</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Tudo que sua planilha fazia. <span className="italic text-muted-foreground">Só que sem quebrar.</span>
        </h2>
        <p className="mt-4 text-base text-muted-foreground">Além do app, você ganha 5 bônus sem custo adicional.</p>
      </div>

      <div className="space-y-3">
        {core.map((b, i) => (
          <BonusCard key={b.title} b={b} i={i} />
        ))}
      </div>

      <div className="my-10 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <div className="text-xs uppercase tracking-widest text-primary font-bold">+ 5 bônus</div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3">
        {bonus.map((b, i) => (
          <BonusCard key={b.title} b={b} i={i} featured />
        ))}
      </div>
    </Section>
  );
}

function BonusCard({ b, i, featured = false }: { b: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; body: string; value: string }; i: number; featured?: boolean }) {
  const Icon = b.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: i * 0.05 }}
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4 sm:gap-5 items-center rounded-2xl border p-4 sm:p-5 ${featured ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card"}`}
    >
      <div className={`grid place-items-center h-12 w-12 sm:h-14 sm:w-14 rounded-2xl shrink-0 ${featured ? "bg-primary text-primary-foreground" : "bg-primary/10 border border-primary/20"}`}>
        <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${featured ? "" : "text-primary"}`} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <h4 className="font-display text-base sm:text-xl font-black leading-tight">{b.title}</h4>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{b.body}</p>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">valor</div>
        <div className="font-mono num-lg font-bold text-sm sm:text-base">{b.value}</div>
      </div>
    </motion.div>
  );
}

/* ================= AUTHOR ================= */
function Author() {
  return (
    <Section className="py-24">
      <div className="text-center mb-8">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Quem faz</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Quem é <span className="italic">Erick Torres?</span>
        </h2>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="grid place-items-center h-16 w-16 rounded-full bg-primary/15 border border-primary/30 font-display text-2xl font-black text-primary shrink-0">
            E
          </div>
          <div className="min-w-0">
            <div className="font-bold text-lg">Erick Torres</div>
            <div className="text-sm text-muted-foreground">Criador do planilhafuturo</div>
          </div>
        </div>
        <div className="space-y-4 text-base leading-relaxed">
          <p>Eu mantinha uma planilha de 8 abas. Todo santo mês. Até o dia que ela quebrou porque eu apaguei uma fórmula sem querer.</p>
          <p>A verdade é que <strong>a lógica da planilha é ótima</strong> — fluxo diário, gastos fixos, parcelas, desejos. O problema é a planilha em si: quebra, é chata de mexer no celular, você esquece de atualizar.</p>
          <p>O planilhafuturo é isso: <strong>a mesma lógica, 100x mais simples.</strong> Você abre no ônibus, preenche o valor, e vê seu futuro financeiro em um olhar.</p>
          <p>Como sei que quem tem problema com dinheiro precisa de acompanhamento — não só de app — eu abro <strong>duas calls por semana</strong> pra destravar sua planilha ao vivo comigo. Não é bot. Não é template. É eu, olhando sua situação.</p>
        </div>
      </div>
    </Section>
  );
}

/* ================= OBJECTIONS ================= */
function Objections() {
  const items = [
    { q: "Já tentei planilha e não deu certo…", a: "Justamente por isso o app existe. A planilha quebra, é chata e você esquece. Aqui você só preenche o valor — o resto é automático." },
    { q: "Não tenho tempo pra mais uma coisa…", a: "2 minutos por dia. Você preenche a entrada/saída do dia no ônibus e pronto. Menos tempo do que rolar Instagram." },
    { q: "Meu caso é complicado…", a: "É pra isso que existe a call semanal. Você entra, mostra sua situação e a gente resolve juntos, ao vivo." },
  ];
  return (
    <Section className="py-20">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Já sei o que você tá pensando</div>
        <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight">
          "Mas Erick, e se…"
        </h2>
      </div>
      <div className="space-y-4">
        {items.map((it, i) => (
          <motion.div
            key={it.q}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="font-display text-lg font-bold italic">"{it.q}"</div>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">{it.a}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ================= PRICE STACK ================= */
function PriceStack() {
  const stack = [
    { t: "1 ano de acesso ao planilhafuturo", v: "R$ 1.032" },
    { t: "Call de suporte semanal (2x)", v: "R$ 1.200" },
    { t: "Mentoria em grupo mensal", v: "R$ 497" },
    { t: "Workshop: reserva de emergência", v: "R$ 297" },
    { t: "Kit de metas anuais (PDF)", v: "R$ 97" },
    { t: "Módulo aulas extras", v: "R$ 197" },
    { t: "Atualizações do ano", v: "grátis" },
  ];
  const total = "R$ 3.320";
  return (
    <Section id="oferta" className="py-24 border-t border-border">
      <div className="text-center mb-8">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">A oferta</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Resumo de tudo que você recebe
        </h2>
      </div>

      <div className="rounded-3xl border-2 border-primary/40 bg-card p-6 sm:p-10" style={{ boxShadow: "var(--shadow-hero)" }}>
        <ul className="space-y-3">
          {stack.map((s) => (
            <li key={s.t} className="flex items-start gap-3">
              <div className="grid place-items-center h-6 w-6 rounded-full bg-primary shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
              </div>
              <span className="flex-1 text-sm sm:text-base">{s.t}</span>
              <span className="font-mono num-lg text-xs sm:text-sm font-bold text-muted-foreground shrink-0">{s.v}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-4 border-t-2 border-dashed border-border flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-widest">Valor total</span>
          <span className="font-mono num-lg text-lg sm:text-xl font-black">{total}</span>
        </div>

        <div className="mt-10 text-center">
          <div className="text-sm text-muted-foreground">Você paga apenas</div>
          <div className="mt-2 font-display text-6xl sm:text-7xl font-black tracking-tight num-lg">
            R$ 300<span className="text-2xl text-muted-foreground">/ano</span>
          </div>
          <div className="mt-2 text-base text-muted-foreground">ou <strong className="text-foreground">12x de R$ 29,90</strong> no cartão</div>

          <div className="mt-8">
            <CtaButton>Quero minha vida financeira organizada</CtaButton>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Pagamento 100% seguro
          </div>
          <PaymentLogos />
        </div>
      </div>

      {/* Vitalicio */}
      <div className="mt-10 rounded-3xl border-2 border-foreground/80 bg-foreground text-background p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-3 left-6 chip bg-primary text-primary-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full">Melhor valor</div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
          <div>
            <div className="font-display text-2xl font-black">Vitalício</div>
            <div className="text-sm opacity-70 mt-1">Compre uma vez. Não pague nunca mais. Inclui suporte em call com erick.</div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-black num-lg">R$ 800</span>
            <span className="text-xs opacity-70">único</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {["Todas as atualizações", "Suporte em call com erick", "Suporte prioritário", "Selo de fundador"].map((t) => {
            const isCall = t.includes("Suporte em call");
            return (
              <div key={t} className={`flex items-center gap-2 ${isCall ? "text-primary font-bold" : "opacity-90"}`}>
                {isCall ? <Headphones className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {t}
              </div>
            );
          })}
        </div>
        <Link to="/auth" className="mt-6 inline-flex items-center gap-2 rounded-full bg-background text-foreground px-5 py-3 text-sm font-bold hover:brightness-95 transition">
          Comprar vitalício <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Starter — barreira baixa */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-black">Starter</span>
            <span className="chip bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest">Barreira baixa</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Testa o app com 1 mês de projeção. Fluxo, gastos e parcelas — sem suporte em call.</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-black num-lg">R$ 69,90</span>
            <span className="text-xs text-muted-foreground">/ano</span>
          </div>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-full border border-foreground text-foreground px-4 py-2.5 text-sm font-bold hover:bg-foreground hover:text-background transition">
            Começar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Planilha original */}
      <div className="mt-6 rounded-3xl border-2 border-dashed border-border bg-surface-2 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-black">Só a planilha</span>
            <span className="chip bg-foreground text-background text-[10px] font-bold uppercase tracking-widest">Excel + Sheets</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Prefere planilha? A original que deu origem ao app — offline, personalizável, pagamento único.</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-black num-lg">R$ 129,90</span>
            <span className="text-xs text-muted-foreground">único</span>
          </div>
          <a
            href="https://wa.me/5599999999999?text=Ol%C3%A1%21%20Quero%20comprar%20a%20planilha%20por%20R%24%20129%2C90"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-bold hover:brightness-110 transition"
          >
            Quero a planilha <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-primary font-bold">
        <Flame className="h-4 w-4" /> Vagas limitadas na sala de suporte semanal
      </div>
    </Section>
  );
}

/* ================= GUARANTEE ================= */
function Guarantee() {
  return (
    <Section className="py-24">
      <div className="rounded-3xl border-2 border-dashed border-primary/40 bg-primary/[0.04] p-8 sm:p-12 text-center">
        <div className="inline-grid place-items-center h-20 w-20 rounded-full bg-primary text-primary-foreground mb-6">
          <ShieldCheck className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide">
          Garantia incondicional de 7 dias
        </h3>
        <p className="mt-4 text-base leading-relaxed max-w-xl mx-auto">
          Testa por 7 dias. Se por qualquer motivo achar que não é pra você, é só me avisar que <strong>devolvo 100% do seu dinheiro.</strong> Sem perguntinha chata, sem burocracia.
        </p>
      </div>
    </Section>
  );
}

/* ================= FAQ ================= */
function Faq() {
  const items = [
    { q: "Preciso conectar meu banco?", a: "Não. Você digita — é rápido e você fica no controle. Integração com Open Finance vem em 2026." },
    { q: "Funciona no celular?", a: "Foi desenhado pra celular primeiro. 80% dos nossos usuários usam no ônibus, no metrô, na fila do café." },
    { q: "Como funciona a call de suporte?", a: "Toda terça e quinta às 20h, sala aberta no Zoom. Entra, mostra sua situação e a gente destrava ao vivo. Não tem hora pra acabar — encerra quando as dúvidas acabam." },
    { q: "E se eu perder uma call?", a: "Fica gravada e liberada na área de aluno. Você assiste depois e ainda pode trazer sua dúvida na próxima." },
    { q: "É igual à planilha que eu uso?", a: "A lógica é a mesma (fluxo diário, gastos fixos, parcelas, desejos). A diferença é que aqui você não quebra nada — e ainda tem no bolso." },
    { q: "E se eu nunca me organizei antes?", a: "Melhor ainda. O app foi feito pra ser óbvio, e na call semanal a gente te ajuda a montar do zero." },
    { q: "Posso cancelar quando quiser?", a: "Pode. Sem multa. Seus dados ficam disponíveis pra exportar por 30 dias." },
    { q: "Meus dados ficam seguros?", a: "Ficam. Tudo criptografado, infraestrutura de nível bancário. Só você acessa sua conta." },
    { q: "Vocês vão sumir daqui a 6 meses?", a: "Não. É SaaS pago com receita real — sobrevive de assinante, não de investidor." },
  ];
  return (
    <Section id="faq" className="py-24 border-t border-border">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">FAQ</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Perguntas frequentes
        </h2>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {items.map((it) => (
          <details key={it.q} className="group">
            <summary className="flex items-center justify-between py-5 cursor-pointer list-none gap-4">
              <span className="font-bold text-base sm:text-lg">{it.q}</span>
              <ChevronDown className="h-5 w-5 text-primary shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-6 text-base text-muted-foreground leading-relaxed">{it.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* ================= FINAL CTA ================= */
function FinalCta() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await joinWaitlist({ data: { email, source: "pv2-final" } });
      setStatus("ok");
    } catch { setStatus("err"); }
  }
  return (
    <Section className="py-16">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight">
          Pare de rezar pra planilha <span className="italic">não quebrar.</span>
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          Ou entra no beta grátis e testa antes de decidir.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
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
          className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
        >
          {status === "ok" ? "Você entrou ✓" : status === "loading" ? "Enviando…" : "Entrar no beta"}
        </button>
      </form>
      {status === "err" && <div className="mt-3 text-center text-sm text-negative">Deu ruim. Tenta de novo?</div>}
      {status === "ok" && <div className="mt-3 text-center text-sm text-primary">Beleza. A gente te chama.</div>}

      <div className="mt-10">
        <CtaButton>Quero organizar meu dinheiro agora</CtaButton>
        <PaymentLogos />
        <TrustRow />
      </div>
    </Section>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  return (
    <footer className="border-t border-border mt-16 pb-20">
      <Section className="py-10 text-center">
        <div className="flex justify-center"><Logo size={28} /></div>
        <p className="mt-6 text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
          <strong>Aviso legal:</strong> nenhuma informação nesta página deve ser interpretada como garantia de resultados. Os depoimentos dependem do esforço individual, da aplicação do método e de fatores externos.
        </p>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <Link to="/docs" className="hover:text-foreground">Documentação</Link>
          <Link to="/auth" className="hover:text-foreground">Entrar</Link>
        </div>
        <div className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} planilhafuturo. Feito no Brasil.</div>
      </Section>
    </footer>
  );
}

/* ================= WHATSAPP FAB ================= */
function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 grid place-items-center h-14 w-14 rounded-full bg-[oklch(0.72_0.18_150)] text-white shadow-xl hover:scale-110 transition-transform"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="h-7 w-7" strokeWidth={2} fill="currentColor" fillOpacity={0.15} />
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
      </span>
    </a>
  );
}
