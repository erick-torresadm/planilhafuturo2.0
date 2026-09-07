import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Money } from "@/components/Money";
import { KpiCard } from "@/components/KpiCard";
import { selectAll, getProfile } from "@/lib/db";
import { totalGastoFixoMensal, parcelasNoMes, parcelasPagas, type GastoFixo, type Parcela } from "@/lib/finance";
import {
  Compass, AlertTriangle, TrendingDown, PauseCircle, Wallet, PiggyBank,
  CheckCircle2, ArrowRight, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/plano-financeiro")({
  head: () => ({ meta: [{ title: "Guia — sair do aperto todo mês — planilhafuturo" }] }),
  component: GuiaPage,
});

function Section({
  icon: Icon, title, subtitle, tone = "default", children, delay = 0,
}: {
  icon: LucideIcon; title: string; subtitle?: string;
  tone?: "default" | "warning" | "positive";
  children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        "rounded-2xl border p-4 sm:p-5 space-y-3",
        tone === "warning" && "border-negative/30 bg-negative-soft/30",
        tone === "positive" && "border-positive/30 bg-positive-soft/30",
        tone === "default" && "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "h-8 w-8 rounded-xl grid place-items-center shrink-0",
            tone === "warning" ? "bg-negative/10 text-negative" : tone === "positive" ? "bg-positive/10 text-positive" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function GuiaPage() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile(), retry: false });
  const gastosQ = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelasQ = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const caixinhasQ = useQuery({ queryKey: ["caixinhas"], queryFn: () => selectAll("caixinhas") });

  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();

  const totalFixo = useMemo(
    () => totalGastoFixoMensal((gastosQ.data ?? []) as GastoFixo[]),
    [gastosQ.data],
  );
  const totalParcelas = useMemo(
    () => parcelasNoMes((parcelasQ.data ?? []) as Parcela[], y, m0),
    [parcelasQ.data, y, m0],
  );
  const chao = totalFixo + totalParcelas;
  const renda = Number((profile.data as any)?.renda_mensal) || 0;
  const sobraEstimada = renda - chao;

  const lazer = ((caixinhasQ.data ?? []) as any[]).find((c) => c.nome === "Lazer");
  const reserva = ((caixinhasQ.data ?? []) as any[]).find((c) => c.nome === "Reserva de Emergência");
  const parcelasAtivas = useMemo(
    () => ((parcelasQ.data ?? []) as Parcela[]).filter((p) => parcelasPagas(p) < p.qtd_parcelas).length,
    [parcelasQ.data],
  );

  const loading = profile.isPending || gastosQ.isPending || parcelasQ.isPending;

  return (
    <div className="page-container space-y-4 animate-in max-w-3xl">
      <PageHeader
        eyebrow="Guia"
        title="Por que nunca sobra?"
        subtitle="Seu plano pra parar de viver no aperto até o fim do mês"
      />

      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          <KpiCard label="Chão do mês" value={chao} tone="negative" hint="fixo + parcelas" />
          <KpiCard label="Renda fixa" value={renda} tone="primary" hint="seu salário" />
          <KpiCard label="Sobra estimada" value={sobraEstimada} tone={sobraEstimada >= 0 ? "positive" : "negative"} />
          <KpiCard label="Guardado — Lazer" value={Number(lazer?.atual ?? 0)} hint={`meta ${lazer?.meta ?? 1800}`} />
          <KpiCard label="Guardado — Reserva" value={Number(reserva?.atual ?? 0)} hint={`meta ${reserva?.meta ?? 1000}`} />
          <div className="card-strong p-5">
            <div className="eyebrow">Parcelas ativas</div>
            <div className="mt-2 num-lg text-2xl lg:text-[26px] leading-tight text-foreground">{parcelasAtivas}</div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">ainda rodando</div>
          </div>
        </motion.div>
      )}

      <Section icon={Compass} title="O problema não é quanto você ganha" delay={0}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Renda irregular de PJ assusta porque nunca dá pra saber quando o próximo dinheiro cai.
          Mas o medo de "não vou ter até o fim do mês" quase sempre não é falta de dinheiro —
          é um <strong className="text-foreground">chão de compromissos</strong> maior do que parece,
          empilhado por parcelas de compras antigas somadas às contas fixas de sempre.
        </p>
      </Section>

      <Section
        icon={AlertTriangle}
        title="Seu chão real este mês"
        subtitle="Tudo isso sai antes de você tocar em qualquer coisa"
        tone="warning"
        delay={0.05}
      >
        {loading ? (
          <p className="text-xs text-muted-foreground">Calculando com seus dados...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Contas fixas (aluguel, carro, saúde, assinaturas...)</span>
              <Money value={totalFixo} signed={false} className="font-semibold" />
            </div>
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Parcelas de cartão ainda rodando</span>
              <Money value={totalParcelas} signed={false} className="font-semibold" />
            </div>
            <div className="flex items-center justify-between text-sm py-2 font-bold">
              <span>Total do chão</span>
              <Money value={chao} signed={false} className="text-negative text-base" />
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Cada parcela nova que você faz empilha mais chão em cima do chão antigo que ainda não acabou.
          É por isso que o alívio nunca chega: quando uma parcela some, outra recém-comprada já ocupou o lugar dela.
        </p>
      </Section>

      <Section icon={PauseCircle} title="Passo 1 — parar de empilhar" tone="positive" delay={0.1}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Você já fez isso — parou de parcelar, só abriu exceção pro seguro do carro (parcelado porque
          era isso ou pagar à vista de uma vez). Essa é a regra: <strong className="text-foreground">
          parcelado só quando não tem outro jeito</strong>, nunca por impulso. Enquanto o chão atual
          de parcelas não baixar, toda compra nova é à vista ou espera.
        </p>
      </Section>

      <Section icon={Wallet} title="Passo 2 — vire seu próprio salário" delay={0.15}>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Em vez de sacar da empresa quando dá (R$70 aqui, R$1.500 ali, sem padrão), define um valor fixo
          e transfere em datas certas — tipo dia 5 e dia 20. O resto fica guardado na empresa como reserva
          pros meses mais fracos.
        </p>
        <div className="rounded-xl bg-muted p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Seu salário fixo sugerido</span>
          <Money value={renda || 6500} signed={false} className="font-bold text-base" />
        </div>
        {!loading && renda > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" />
            Já ajustado no seu perfil. Sobra estimada depois do chão:{" "}
            <Money value={sobraEstimada} className="font-semibold" />
          </div>
        )}
      </Section>

      <Section icon={PiggyBank} title="Passo 3 — lazer com dinheiro próprio" delay={0.2}>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Presente, roupa nova, um passeio — isso não pode competir com conta de luz. Por isso a
          caixinha de <strong className="text-foreground">Lazer</strong> enche primeiro, todo mês,
          com valor fixo — nunca com "o que sobrar", porque pra você isso sempre foi zero.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Lazer</div>
            <Money value={lazer?.atual ?? 0} signed={false} className="font-bold text-sm" />
            <div className="text-[10px] text-muted-foreground mt-0.5">
              meta <Money value={lazer?.meta ?? 1800} signed={false} className="inline" />
            </div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Reserva de emergência</div>
            <Money value={reserva?.atual ?? 0} signed={false} className="font-bold text-sm" />
            <div className="text-[10px] text-muted-foreground mt-0.5">
              meta <Money value={reserva?.meta ?? 1000} signed={false} className="inline" />
            </div>
          </div>
        </div>
        <a
          href="/desejos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-1"
        >
          Ver e ajustar suas caixinhas <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </Section>

      <Section icon={TrendingDown} title="O que esperar dos próximos meses" delay={0.25}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Suas parcelas atuais têm prazo pra acabar — o chão vai encolher sozinho mês a mês, contanto
          que nenhuma parcela nova entre no lugar. Acompanhe essa queda em{" "}
          <a href="/parcelas" className="text-primary font-semibold">Parcelas</a> e em{" "}
          <a href="/fluxo" className="text-primary font-semibold">Fluxo</a>. Quando o chão baixar de
          verdade, aí sim dá pra pensar em uma compra maior parcelada — com folga, não no desespero.
        </p>
      </Section>
    </div>
  );
}
