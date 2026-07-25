import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import {
  ArrowRight, Check, ShieldCheck, Clock, Headphones, PlayCircle,
  Sparkles, Target, Zap, ListChecks, CalendarDays, TrendingUp,
  Wallet, Receipt, CreditCard, ChevronDown, Star, Lock,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { joinWaitlist } from "@/lib/waitlist.functions";

export const Route = createFileRoute("/pv2")({
  head: () => ({
    meta: [
      { title: "planilhafuturo — Pare de rezar pra planilha não quebrar" },
      { name: "description", content: "O método simples pra enxergar seus próximos 6 meses de dinheiro em um olhar. Sem fórmula, sem aba escondida, sem cara de Excel." },
      { property: "og:title", content: "planilhafuturo — Pare de rezar pra planilha não quebrar" },
      { property: "og:description", content: "O método simples pra enxergar seus próximos 6 meses de dinheiro em um olhar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PV2,
});

/* ================= LAYOUT PRIMITIVES ================= */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`w-full px-5 sm:px-8 ${className}`}>
      <div className="mx-auto max-w-3xl">{children}</div>
    </section>
  );
}

function CtaButton({ children = "Quero minha vida financeira organizada" }: { children?: React.ReactNode }) {
  return (
    <Link
      to="/auth"
      className="group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-5 text-base sm:text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 hover:-translate-y-0.5 transition-all uppercase tracking-wide"
    >
      {children}
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function TrustRow() {
  const items = [
    { icon: Clock, label: "Acesso por", strong: "1 ano" },
    { icon: Headphones, label: "Suporte", strong: "toda semana" },
    { icon: ShieldCheck, label: "Garantia de", strong: "7 dias" },
  ];
  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.strong} className="flex flex-col items-center gap-2">
            <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-sm text-muted-foreground">
              {it.label} <span className="font-bold text-foreground">{it.strong}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentLogos() {
  return (
    <div className="mt-6 flex items-center justify-center gap-3 flex-wrap opacity-70">
      {["VISA", "MASTER", "ELO", "HIPER", "AMEX", "PIX", "BOLETO"].map((b) => (
        <div key={b} className="rounded-md border border-border bg-card px-3 py-1.5 text-[10px] font-mono text-muted-foreground tracking-widest">
          {b}
        </div>
      ))}
    </div>
  );
}

/* ================= HIGHLIGHT ================= */
function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="absolute inset-x-0 bottom-0 h-[55%] bg-primary/30 -z-10 rounded-sm" />
      <span className="relative">{children}</span>
    </span>
  );
}

/* ================= COMPONENT ================= */
function PV2() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top logo bar */}
      <header className="py-6 border-b border-border/60">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 flex items-center justify-center">
          <Logo size={32} />
        </div>
      </header>

      <Hero />
      <ThreeThings />
      <VideoBlock />
      <FirstCta />
      <MethodIntro />
      <Phases />
      <ForWho />
      <Bonuses />
      <Author />
      <SupportBlock />
      <PriceStack />
      <Guarantee />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ================= HERO ================= */
function Hero() {
  return (
    <Section className="pt-12 sm:pt-16 pb-6 text-center">
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
        Descubra abaixo o método que vai te ensinar 3 coisas:
      </motion.p>
    </Section>
  );
}

/* ================= 3 THINGS ================= */
function ThreeThings() {
  const items = [
    { n: 1, text: <>Qual é o melhor jeito de começar a organizar seu dinheiro, <strong>usando um app simples</strong> — sem fórmula, sem aba escondida.</> },
    { n: 2, text: <>Um plano de ação para <strong>parar de viver no vermelho e começar a sobrar dinheiro todo mês</strong>, mesmo ganhando o mesmo salário.</> },
    { n: 3, text: <>Como <strong>enxergar seus próximos 6 meses de dinheiro em um olhar</strong>, e saber se dá pra viajar em outubro sem quebrar em novembro.</> },
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

/* ================= "VIDEO" BLOCK (app preview) ================= */
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
        {/* App preview mock */}
        <div className="relative aspect-video bg-gradient-to-br from-primary/10 via-background to-primary/5">
          {/* Floating "app icons" */}
          <FloatingIcon className="top-[15%] left-[8%]" delay={0} tone="bg-[oklch(0.75_0.15_25)]"><Receipt className="h-6 w-6 text-white" /></FloatingIcon>
          <FloatingIcon className="top-[10%] left-[22%]" delay={0.2} tone="bg-white border border-border"><CalendarDays className="h-6 w-6 text-primary" /></FloatingIcon>
          <FloatingIcon className="top-[42%] left-[10%]" delay={0.4} tone="bg-foreground"><Wallet className="h-6 w-6 text-background" /></FloatingIcon>
          <FloatingIcon className="top-[30%] left-[26%]" delay={0.6} tone="bg-primary"><CreditCard className="h-6 w-6 text-primary-foreground" /></FloatingIcon>

          {/* Central play + label */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="grid place-items-center h-20 w-20 rounded-full border-2 border-foreground/80 bg-background/80 backdrop-blur">
                <PlayCircle className="h-14 w-14 text-foreground" strokeWidth={1} />
              </div>
            </div>
          </div>

          {/* Bottom label — like the "Assista a aula" white bar */}
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

/* ================= FIRST CTA ================= */
function FirstCta() {
  return (
    <Section className="py-8">
      <CtaButton />
      <PaymentLogos />
      <TrustRow />
    </Section>
  );
}

/* ================= METHOD INTRO ================= */
function MethodIntro() {
  return (
    <Section className="py-20 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Um plano <Hi>simples</Hi> para organizar seu dinheiro em 6 meses
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">
          Essa é a base do método <strong className="text-foreground">Planejamento Futuro</strong>.
        </p>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          Cada fase tem um objetivo, e depende da anterior — por isso funciona. A gente quebra uma caminhada longa <strong className="text-foreground">em passos simples e possíveis.</strong>
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
      tag: "Iniciante",
      title: "Ter clareza do agora",
      icon: Target,
      goal: "Objetivo: enxergar sua situação real",
      body: <>Se você não sabe pra onde vai seu dinheiro, <strong>você não consegue mudar nada.</strong> Ponto.<br /><br />Aqui você faz 3 movimentos pontuais: cadastra sua renda, solta seus gastos fixos e vê pela primeira vez <strong>quanto sobra (ou falta) todo mês.</strong></>,
      chips: ["Renda", "Gastos fixos", "Sobra mensal"],
    },
    {
      tag: "Visionário",
      title: "Ver os próximos 6 meses",
      icon: TrendingUp,
      goal: "Objetivo: parar de ser surpreendido",
      body: <>Com o básico no lugar, a gente ativa a projeção. É fácil demais quebrar quando um IPVA aparece do nada em janeiro. <br /><br />Aqui você começa a ver <strong>o saldo do seu dia 15 de dezembro</strong>, hoje. Sem susto, sem "achismo".</>,
      chips: ["Fluxo diário", "Projeção 6 meses", "Saldo por dia"],
    },
    {
      tag: "Organizado",
      title: "Sistema que não quebra",
      icon: ListChecks,
      goal: "Objetivo: sair da planilha eterna",
      body: <>Ninguém segue uma planilha de 8 abas por muito tempo. Por isso você só usa <strong>6 telas simples</strong> pra organizar tudo: fluxo, gastos, parcelas, desejos, investimentos e tarefas.<br /><br />(Muitos usuários relatam <strong>redução clara de ansiedade</strong> nessa fase.)</>,
      chips: ["Parcelas", "Cartões", "Contas a pagar"],
    },
    {
      tag: "Realizador",
      title: "Realizar desejos com data",
      icon: Sparkles,
      goal: "Objetivo: comprar o que quer, sem culpa",
      body: <>Aqui procrastinar objetivo financeiro fica difícil. <br /><br />Você coloca o que quer (viagem, notebook, curso), põe a data, e o app te fala <strong>se dá — e o quanto guardar por mês.</strong> Nada de "vou tentar". É plano.</>,
      chips: ["Desejos", "Caixinhas", "Metas com prazo"],
    },
    {
      tag: "Mestre",
      title: "Patrimônio crescendo sozinho",
      icon: Zap,
      goal: "Objetivo: ver o dinheiro trabalhar",
      body: <>Muito <strong>esforço direcionado e intencional.</strong> Reserva de emergência montada, dívidas sob controle, investimento entrando todo mês.<br /><br />Nessa fase você tem clareza total: <strong>saúde financeira,</strong> tempo de qualidade e liberdade pra decisões grandes.</>,
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
            className="relative"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="grid place-items-center h-11 w-11 rounded-xl bg-primary/10 border border-primary/30">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-xs uppercase tracking-widest text-primary font-bold">Fase 0{i + 1} · {p.tag}</div>
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-black leading-tight">{p.title}</h3>
            <div className="mt-2 font-bold text-foreground">{p.goal}</div>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">{p.body}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {p.chips.map((c) => (
                <span key={c} className="rounded-full bg-card border border-border px-3 py-1 text-xs font-semibold text-foreground">
                  {c}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}
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
    "Vivem no automático, sem clareza de pra onde vai o dinheiro",
    "Querem viajar, comprar, investir — mas nunca sobra",
    "Não têm 1 mês de reserva de emergência",
  ];
  return (
    <Section className="py-24">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pra quem é</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          O planilhafuturo é pra pessoas que:
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
  const bonuses = [
    { icon: CalendarDays, title: "Fluxo diário dos 6 meses", body: "Todos os dias, com saldo calculado sozinho. Zero fórmula." },
    { icon: Receipt, title: "Gastos fixos + anuais", body: "IPVA, IPTU, seguro — cada um no seu dia certo. Não escapa." },
    { icon: CreditCard, title: "Parcelas ilimitadas", body: "Divide sozinho pelos meses. Você sabe quando termina de pagar." },
    { icon: Sparkles, title: "Desejos & caixinhas", body: "Metas com data. O app te diz se cabe no seu bolso." },
    { icon: Wallet, title: "Investimentos & patrimônio", body: "Vê seu dinheiro crescer mês a mês. Projeção incluída." },
    { icon: ListChecks, title: "Contas a pagar como tarefa", body: "Vira checklist. Marca como pago e some. Simples assim." },
  ];
  return (
    <Section className="py-24 border-t border-border">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">O que está incluso</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Tudo que sua planilha fazia. <span className="italic text-muted-foreground">Só que sem quebrar.</span>
        </h2>
      </div>
      <div className="space-y-4">
        {bonuses.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex gap-5 items-start rounded-2xl border border-border bg-card p-5"
            >
              <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h4 className="font-display text-xl font-black">{b.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{b.body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

/* ================= AUTHOR ================= */
function Author() {
  return (
    <Section className="py-24">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Por que <span className="italic">criei</span> o planilhafuturo?
        </h2>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="grid place-items-center h-16 w-16 rounded-full bg-primary/15 border border-primary/30 font-display text-2xl font-black text-primary">
            E
          </div>
          <div>
            <div className="font-bold text-lg">Erick Torres</div>
            <div className="text-sm text-muted-foreground">Criador do planilhafuturo</div>
          </div>
        </div>
        <div className="space-y-4 text-base leading-relaxed text-foreground/90">
          <p>Eu mantinha uma planilha de 8 abas. Todo santo mês. Até o dia que ela quebrou porque eu apaguei uma fórmula sem querer.</p>
          <p>A verdade é que <strong>a lógica da planilha é ótima</strong> — fluxo diário, gastos fixos, parcelas, desejos. O problema é a planilha em si: quebra, é chata de mexer no celular, você esquece de atualizar.</p>
          <p>O planilhafuturo é isso: <strong>a mesma lógica, 100x mais simples.</strong> Você abre no ônibus, preenche o valor, e vê seu futuro financeiro em um olhar. Sem cara de Excel, sem aba escondida, sem rezar pra não quebrar.</p>
        </div>
      </div>
    </Section>
  );
}

/* ================= SUPPORT ================= */
function SupportBlock() {
  return (
    <Section className="py-24">
      <div className="text-center mb-8">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Suporte</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Suporte como você <span className="italic">nunca viu</span>
        </h2>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 space-y-4 text-base leading-relaxed">
        <p>A maioria dos SaaS te entrega um e-mail e some. <strong>Aqui é diferente.</strong></p>
        <p>Você fala direto com quem construiu o app. Todas as semanas, tira dúvida no WhatsApp, pede feature, reporta bug. E a gente responde de verdade — não é bot.</p>
        <p className="text-muted-foreground text-sm">Enquanto você tiver dúvida, a gente responde. Sem burocracia.</p>
      </div>
    </Section>
  );
}

/* ================= PRICE STACK ================= */
function PriceStack() {
  const stack = [
    "1 ano de acesso ao planilhafuturo",
    "Fluxo diário de 6 meses projetados",
    "Gastos fixos, anuais e parcelas ilimitadas",
    "Desejos, caixinhas e metas com data",
    "Investimentos e patrimônio",
    "Lembretes de contas a pagar",
    "Exportar CSV a qualquer momento",
    "Suporte humano toda semana",
    "Todas as atualizações do ano",
  ];
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
            <li key={s} className="flex items-start gap-3">
              <div className="grid place-items-center h-6 w-6 rounded-full bg-primary shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
              </div>
              <span className="text-base">{s}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <div className="text-sm text-muted-foreground line-through">De R$ 588/ano</div>
          <div className="mt-1 font-display text-lg font-bold text-muted-foreground">Por apenas 12x de</div>
          <div className="mt-2 font-display text-6xl sm:text-7xl font-black tracking-tight num-lg">R$ 29<span className="text-3xl">,90</span></div>
          <div className="mt-3 text-base text-muted-foreground">ou <strong className="text-foreground">R$ 300 à vista</strong> no PIX</div>

          <div className="mt-8">
            <CtaButton>Quero minha vida financeira organizada</CtaButton>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Pagamento 100% seguro
          </div>
          <PaymentLogos />
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="font-display text-xl italic text-muted-foreground">
          Ou compre uma vez só e não pague nunca mais.
        </p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
          <div className="font-display text-2xl font-black">Vitalício</div>
          <div className="h-6 w-px bg-border" />
          <div className="font-mono num-lg text-lg font-bold">R$ 800</div>
          <div className="text-xs text-muted-foreground">pagamento único</div>
        </div>
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
    { q: "Preciso conectar meu banco?", a: "Não. Você digita — é rápido e você fica no controle total. Integração com Open Finance vem em 2026." },
    { q: "Funciona no celular?", a: "Foi desenhado pra celular primeiro. 80% dos nossos usuários usam no ônibus, no metrô, na fila do café." },
    { q: "É igual à planilha que eu uso?", a: "A lógica é a mesma (fluxo diário, gastos fixos, parcelas, desejos). A diferença é que aqui você não quebra nada — e ainda tem no bolso." },
    { q: "E se eu nunca me organizei antes?", a: "Melhor ainda. O app foi feito pra ser óbvio: abre, cadastra sua renda, solta os gastos, vê o futuro. Em 2 minutos você começa." },
    { q: "Posso cancelar quando quiser?", a: "Pode. Sem multa, sem enrolação. Seus dados ficam disponíveis pra exportar por 30 dias." },
    { q: "Meus dados ficam seguros?", a: "Ficam. Tudo criptografado, infraestrutura de nível bancário. Só você acessa sua conta." },
    { q: "E se eu travar em algo?", a: "Manda no WhatsApp do suporte. Responde humano, em até 24h. Não é bot." },
    { q: "Vocês vão sumir daqui a 6 meses?", a: "Não. É SaaS pago com receita real — sobrevive de assinante, não de investidor." },
  ];
  return (
    <Section className="py-24 border-t border-border">
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
          Entra no beta grátis e testa antes de decidir.
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
    <footer className="border-t border-border mt-16">
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
