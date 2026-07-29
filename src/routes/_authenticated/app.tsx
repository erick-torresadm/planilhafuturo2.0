import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { selectAll, getProfile } from "@/lib/db";
import { computaMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { MESES, MESES_ABREV } from "@/lib/format";
import { Money } from "@/components/Money";
import { KpiCard } from "@/components/KpiCard";
import { useSounds } from "@/hooks/useSounds";
import { useLancamentosLocal } from "@/hooks/useLancamentosLocal";
import {
  Plus, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Receipt,
  CreditCard, Target, Wallet, ArrowRight,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Hoje — planilhafuturo" }] }),
  component: HojePage,
});

function HojePage() {
  const { playSound } = useSounds();
  const today = new Date();
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const dToday = today.getDate();
  const dayName = today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const { list: lanc } = useLancamentosLocal();

  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);
  const nome = (profile.data?.nome ?? "").split(" ")[0] || "você";

  const seis = useMemo(() => {
    const g = (gastos.data ?? []) as GastoFixo[];
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    let carry = saldoInicial;
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(y, m0 + i, 1);
      const yy = d.getFullYear(); const mm = d.getMonth();
      const dias = computaMes(yy, mm, carry, g, p, lanc);
      carry = dias.length ? dias[dias.length - 1].saldo : carry;
      return { y: yy, m: mm, dias, saldoFim: carry };
    });
  }, [gastos.data, parcelas.data, lanc, saldoInicial, y, m0]);

  const mesAtual = seis[0];
  const diaHoje = mesAtual?.dias.find((d: any) => d.dia === dToday) ?? mesAtual?.dias[0];
  const saldoHoje = diaHoje?.saldo ?? saldoInicial;
  const saldoFimMes = mesAtual?.saldofim ?? saldoInicial;

  const totalEntradasMes = mesAtual?.dias.reduce((a: number, d: any) => a + d.entradaFixa + d.entradaDiaria, 0) ?? 0;
  const totalSaidasMes = mesAtual?.dias.reduce((a: number, d: any) => a + d.saidaFixa + d.saidaDiaria, 0) ?? 0;

  const primeiroNegativo = seis.find((mm) => mm.saldoFim < 0);
  const ultimoPositivo = [...seis].reverse().find((mm) => mm.saldoFim >= 0);

  /* Sparkline data */
  const maxAbs = useMemo(() => Math.max(1, ...seis.map((s) => Math.abs(s.saldoFim))), [seis]);
  const sparkH = 48;
  const sparkPts = seis.map((s, i) => ({
    x: i * 20,
    y: sparkH / 2 - ((s.saldoFim / maxAbs) * (sparkH / 2 - 4)),
    v: s.saldoFim,
  }));
  const sparkLine = sparkPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const sparkArea = sparkLine + ` L${sparkPts[sparkPts.length - 1].x},${sparkH} L0,${sparkH} Z`;

  const [qaOpen, setQaOpen] = useState<null | "in" | "out">(null);
  const [qaValor, setQaValor] = useState("");

  function commitQuick() {
    const n = Number(qaValor.replace(/\./g, "").replace(",", ".")) || 0;
    if (n <= 0 || !diaHoje) { setQaOpen(null); setQaValor(""); return; }
    playSound(qaOpen === "in" ? "kaching" : "pop");
    // TODO: persist lancamento
    setQaOpen(null); setQaValor("");
  }

  return (
    <div className="page-container space-y-4 animate-in">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Olá, {nome}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight mt-0.5">{dayName}</h1>
        </div>
        <Link to="/fluxo" className="text-xs font-semibold text-primary hover:underline">
          Ver fluxo <ArrowRight className="h-3 w-3 inline" />
        </Link>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {/* Hero — Saldo */}
        <div className="metric-card md:col-span-3">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top_right,var(--color-primary),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Saldo disponível</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {dToday} {MESES[m0].toLowerCase()}
              </span>
            </div>
            <div className={cn(
              "font-mono text-4xl font-bold tracking-tight leading-none mt-2 tabular-nums",
              saldoHoje < 0 ? "text-negative" : "text-foreground",
            )}>
              <Money value={saldoHoje} />
            </div>

            {/* Sparkline */}
            <div className="mt-4 h-12">
              <svg viewBox="0 0 100 48" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="spark-bg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sparkArea} fill="url(#spark-bg)" className="text-primary" />
                <path d={sparkLine} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
                {sparkPts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="currentColor" className="text-primary" />
                ))}
              </svg>
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">Projeção fim do mês</span>
              <span className={cn(
                "font-semibold tabular-nums flex items-center gap-1",
                saldoFimMes < 0 ? "text-negative" : "text-positive",
              )}>
                {saldoFimMes < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                <Money value={saldoFimMes} />
              </span>
            </div>
          </div>
        </div>

        {/* Movimento do mês */}
        <div className="metric-card md:col-span-3 metric-card-positive">
          <span className="eyebrow">Movimento do mês</span>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-positive-soft/70 p-4">
              <div className="flex items-center gap-1.5 text-positive text-xs font-semibold">
                <TrendingUp className="h-3.5 w-3.5" /> Entradas
              </div>
              <div className="mt-1.5 font-display text-xl font-bold text-positive tabular-nums">
                <Money value={totalEntradasMes} />
              </div>
            </div>
            <div className="rounded-xl bg-negative-soft/70 p-4">
              <div className="flex items-center gap-1.5 text-negative text-xs font-semibold">
                <TrendingDown className="h-3.5 w-3.5" /> Saídas
              </div>
              <div className="mt-1.5 font-display text-xl font-bold text-negative tabular-nums">
                <Money value={totalSaidasMes} />
              </div>
            </div>
          </div>
        </div>

        {/* Alerta */}
        {primeiroNegativo && (
          <Link to="/fluxo" className="md:col-span-6 card-hover p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning-soft grid place-items-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Fica no vermelho em {MESES_ABREV[primeiroNegativo.m]}</div>
              <div className="text-xs text-muted-foreground">
                Saldo previsto: <Money value={primeiroNegativo.saldoFim} className="text-negative font-semibold" />
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        )}
        {!primeiroNegativo && ultimoPositivo && (
          <div className="md:col-span-6 card-hover p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-positive-soft grid place-items-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-positive" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Fluxo saudável nos próximos 6 meses</div>
              <div className="text-xs text-muted-foreground">
                Continua positivo até pelo menos {MESES[ultimoPositivo.m]}.
              </div>
            </div>
          </div>
        )}

        {/* Projeção 6 meses — área chart */}
        <div className="metric-card md:col-span-3">
          <span className="eyebrow">Projeção 6 meses</span>
          <div className="mt-3 h-28">
            <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="proj-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const maxV = Math.max(1, ...seis.map((s) => Math.abs(s.saldoFim)));
                const pts = seis.map((s, i) => ({
                  x: (i / Math.max(1, seis.length - 1)) * 290 + 5,
                  y: 90 - ((s.saldoFim / maxV) * 75 + (s.saldoFim >= 0 ? 0 : 0)),
                  v: s.saldoFim,
                }));
                const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                const fill = d + ` L${pts[pts.length - 1].x},95 L5,95 Z`;
                return (
                  <>
                    <path d={fill} fill="url(#proj-fill)" className="text-primary" />
                    <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3.5" fill="var(--color-card)" stroke="currentColor" strokeWidth="2" className="text-primary" />
                        <text x={p.x} y={105} textAnchor="middle" className="fill-muted-foreground" fontSize="9" fontFamily="var(--font-mono)">
                          {MESES_ABREV[seis[i].m]}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Atalhos */}
        <div className="md:col-span-3">
          <span className="eyebrow block mb-2">Atalhos</span>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/gastos" className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 transition-colors">
              <Receipt className="h-4 w-4" strokeWidth={2} />
              <span className="text-sm font-semibold">Gastos fixos</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Link>
            <Link to="/parcelas" className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 text-violet-600 hover:bg-violet-500/15 transition-colors">
              <CreditCard className="h-4 w-4" strokeWidth={2} />
              <span className="text-sm font-semibold">Parcelas</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Link>
            <Link to="/desejos" className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 transition-colors">
              <Target className="h-4 w-4" strokeWidth={2} />
              <span className="text-sm font-semibold">Desejos</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Link>
            <Link to="/investimentos" className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 transition-colors">
              <Wallet className="h-4 w-4" strokeWidth={2} />
              <span className="text-sm font-semibold">Investir</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Link>
          </div>
        </div>
      </div>

      {/* FAB — Quick add */}
      <button
        onClick={() => setQaOpen("in")}
        className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 z-30 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg grid place-items-center active:scale-90 transition-transform"
        aria-label="Adicionar lançamento"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Quick-add sheet */}
      {qaOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" onClick={() => { setQaOpen(null); setQaValor(""); }}>
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-2xl border border-border p-5 space-y-4 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid place-items-center">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25 sm:hidden" />
            </div>
            <div>
              <span className="eyebrow">{qaOpen === "in" ? "Nova entrada" : "Nova saída"}</span>
              <h3 className="font-display text-lg font-bold mt-0.5">Hoje, {dToday} de {MESES[m0].toLowerCase()}</h3>
            </div>
            <div className={cn(
              "flex items-center gap-2 h-16 px-4 rounded-2xl border-2",
              qaOpen === "in" ? "border-positive bg-positive-soft" : "border-negative bg-negative-soft",
            )}>
              <span className={cn("text-lg font-mono font-bold", qaOpen === "in" ? "text-positive" : "text-negative")}>R$</span>
              <input
                autoFocus
                inputMode="decimal"
                value={qaValor}
                onChange={(e) => setQaValor(e.target.value.replace(/[^\d.,]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && commitQuick()}
                placeholder="0,00"
                className="flex-1 bg-transparent outline-none text-2xl font-mono font-bold tabular-nums text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setQaOpen(null); setQaValor(""); }} className="h-12 rounded-xl border border-border text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={commitQuick}
                className={cn("h-12 rounded-xl text-white font-bold", qaOpen === "in" ? "bg-positive" : "bg-negative")}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
