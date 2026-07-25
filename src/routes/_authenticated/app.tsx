import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Money } from "@/components/Money";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { MESES } from "@/lib/format";
import {
  DEMO_PROFILE, DEMO_GASTOS, DEMO_PARCELAS,
  totaisPorPilar,
} from "@/lib/demoData";
import {
  ArrowRight, ChevronLeft, ChevronRight,
  Wallet, TrendingUp, TrendingDown, PiggyBank,
  Receipt, CreditCard, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — planilhafuturo" },
      { name: "description", content: "Seu mês em um olhar: renda, compromissos e sobra." },
    ],
  }),
  component: DashboardPage,
});

function parcelasNoMesRef(y: number, m0: number) {
  let s = 0;
  for (const p of DEMO_PARCELAS) {
    const dt = new Date(p.data + "T00:00:00");
    const monthsAhead = (y - dt.getFullYear()) * 12 + (m0 - dt.getMonth());
    if (monthsAhead < 0) continue;
    const restantes = p.qtd_parcelas - (p.parcela_inicial - 1);
    if (monthsAhead >= restantes) continue;
    s += p.valor_total / p.qtd_parcelas;
  }
  return s;
}

function gastosNoMes(_y: number, m0: number) {
  let mensal = 0, anual = 0;
  for (const g of DEMO_GASTOS) {
    if (!g.ativo) continue;
    if (g.frequencia === "mensal") mensal += g.valor;
    else if (g.mes_anual && g.mes_anual - 1 === m0) anual += g.valor;
  }
  return mensal + anual;
}

function DashboardPage() {
  const hoje = new Date();
  const [offset, setOffset] = useState(0);
  const mRef = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
  const y = mRef.getFullYear();
  const m0 = mRef.getMonth();

  const renda = DEMO_PROFILE.renda_mensal;
  const pilares = totaisPorPilar(DEMO_GASTOS);
  const parc = useMemo(() => parcelasNoMesRef(y, m0), [y, m0]);
  const fixos = gastosNoMes(y, m0);

  const entradas = renda;
  const saidas = fixos + parc;
  const economias = Math.max(0, renda * 0.10);
  const sobra = entradas - saidas - economias;
  const compromissoPct = renda > 0 ? Math.min(100, (saidas / renda) * 100) : 0;

  const mesLabel = `${MESES[m0]} · ${y}`;

  const proximos6 = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(y, m0 + i, 1);
      const yi = d.getFullYear(); const mi = d.getMonth();
      const rc = renda;
      const sd = gastosNoMes(yi, mi) + parcelasNoMesRef(yi, mi);
      const sob = rc - sd - economias;
      return { label: MESES[mi].slice(0,3), value: sob };
    });
  }, [y, m0, renda, economias]);

  const maxAbs = Math.max(1, ...proximos6.map(p => Math.abs(p.value)));

  return (
    <>
      <PageBody>
        <PageHeader
          eyebrow="Visão geral"
          title="Dashboard"
          subtitle={`Resumo financeiro de ${mesLabel}`}
          actions={
            <div className="inline-flex items-center gap-1 bg-card border border-border rounded-md p-1 shadow-sm">
              <button
                onClick={() => setOffset(offset - 1)}
                className="h-8 w-8 grid place-items-center rounded hover:bg-muted text-muted-foreground"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-3 text-sm font-semibold tabular-nums min-w-[130px] text-center">
                {mesLabel}
              </div>
              <button
                onClick={() => setOffset(offset + 1)}
                className="h-8 w-8 grid place-items-center rounded hover:bg-muted text-muted-foreground"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        />

        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Renda mensal" value={entradas} icon={TrendingUp} tone="primary" hint="Entrada prevista" />
          <KpiCard label="Compromissos" value={saidas} icon={TrendingDown} tone="negative" hint={`${compromissoPct.toFixed(0)}% da renda`} />
          <KpiCard label="Economias (meta 10%)" value={economias} icon={PiggyBank} tone="positive" hint="Reserva / investimento" />
          <KpiCard
            label="Sobra prevista"
            value={sobra}
            icon={Wallet}
            tone={sobra >= 0 ? "positive" : "negative"}
            hint={sobra >= 0 ? "Fica no verde" : "Reveja gastos"}
          />
        </div>

        {/* Distribuição por pilar + Próximos 6 meses */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="hope-card p-5 lg:col-span-2">
            <div className="flex items-baseline justify-between gap-2 mb-4">
              <div>
                <div className="eyebrow">Projeção</div>
                <h3 className="font-display text-base font-semibold mt-1">Próximos 6 meses</h3>
              </div>
              <Link to="/fluxo" className="text-[12px] text-primary font-semibold inline-flex items-center gap-1 hover:underline">
                Ver fluxo diário <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-6 gap-2 h-40 items-end">
              {proximos6.map((p, i) => {
                const h = (Math.abs(p.value) / maxAbs) * 100;
                const positive = p.value >= 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className={`text-[10px] font-mono tabular-nums ${positive ? "text-positive" : "text-negative"}`}>
                      <Money value={p.value} compact signed showSign />
                    </div>
                    <div className="w-full rounded-t-md relative overflow-hidden bg-muted/60" style={{ height: `${Math.max(6, h)}%` }}>
                      <div className={`absolute inset-0 ${positive ? "bg-primary/80" : "bg-negative/80"}`} />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{p.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hope-card p-5">
            <div className="eyebrow">Alocação</div>
            <h3 className="font-display text-base font-semibold mt-1 mb-4">Pilares do mês</h3>
            <PilarBar label="Sobrevivência" value={pilares.S} total={renda} tone="primary" />
            <PilarBar label="Proteção"       value={pilares.P} total={renda} tone="positive" />
            <PilarBar label="Liberdade"      value={pilares.L} total={renda} tone="warning" />
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickCard to="/gastos"        icon={Receipt}     label="Gastos fixos" hint="Contas recorrentes" />
          <QuickCard to="/parcelas"      icon={CreditCard}  label="Parcelas"      hint="Compras no cartão" />
          <QuickCard to="/desejos"       icon={Sparkles}    label="Desejos"       hint="Metas e caixinhas" />
        </div>
      </PageBody>
    </>
  );
}

function PilarBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: "primary" | "positive" | "warning" }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const barColor = tone === "primary" ? "bg-primary" : tone === "positive" ? "bg-positive" : "bg-warning";
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          <Money value={value} /> <span className="text-[10px]">· {pct.toFixed(0)}%</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickCard({ to, icon: Icon, label, hint }: { to: string; icon: any; label: string; hint: string }) {
  return (
    <Link to={to} className="hope-card p-4 flex items-center gap-3 group">
      <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{hint}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
