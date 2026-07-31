import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { selectAll, getProfile } from "@/lib/db";
import { computaMes, totalGastoFixoMensal, parcelasNoMes, type GastoFixo, type Parcela } from "@/lib/finance";
import { MESES, MESES_ABREV } from "@/lib/format";
import { useSounds } from "@/hooks/useSounds";
import { useLancamentosLocal } from "@/hooks/useLancamentosLocal";
import { useExternalData } from "@/hooks/useExternalData";
import { Plus, TrendingUp, DollarSign, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardMercury } from "@/components/dashboards";
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
  const invest = useQuery({ queryKey: ["investimentos"], queryFn: () => selectAll("investimentos") });
  const { list: lanc, upsert } = useLancamentosLocal();

  const { data: extData } = useExternalData();

  const loading = profile.isPending || gastos.isPending || parcelas.isPending;

  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);
  const nome = (profile.data?.nome ?? "").split(" ")[0] || "você";

  const [saldoVisivel, setSaldoVisivel] = useState(true);

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
  const saldoFimMes = mesAtual?.dias[mesAtual.dias.length - 1]?.saldo ?? saldoInicial;

  const totalEntradasMes = mesAtual?.dias.reduce((a: number, d: any) => a + d.entradaFixa + d.entradaDiaria, 0) ?? 0;
  const totalSaidasMes = mesAtual?.dias.reduce((a: number, d: any) => a + d.saidaFixa + d.saidaDiaria, 0) ?? 0;

  const primeiroNegativo = seis.find((mm) => mm.saldoFim < 0);
  const ultimoPositivo = [...seis].reverse().find((mm) => mm.saldoFim >= 0);

  const totalInvestido = ((invest.data ?? []) as any[]).reduce((a, r) => a + Number(r.posicao_atual), 0);

  const chartData = useMemo(() => seis.map((s) => ({
    label: MESES_ABREV[s.m],
    saldo: s.saldoFim,
    entradas: s.dias.reduce((a: number, d: any) => a + d.entradaFixa + d.entradaDiaria, 0),
    saidas: s.dias.reduce((a: number, d: any) => a + d.saidaFixa + d.saidaDiaria, 0),
  })), [seis]);

  const [qaOpen, setQaOpen] = useState<null | "in" | "out">(null);
  const [qaValor, setQaValor] = useState("");

  function commitQuick() {
    const n = Number(qaValor.replace(/\./g, "").replace(",", ".")) || 0;
    if (n <= 0 || !diaHoje) { setQaOpen(null); setQaValor(""); return; }

    // Add lancamento
    upsert({
      data: diaHoje.data,
      tipo: qaOpen === "in" ? "entrada_diaria" : "saida_diaria",
      valor: n
    });

    playSound(qaOpen === "in" ? "kaching" : "pop");
    setQaOpen(null); setQaValor("");
  }

  const variacaoPercentual = saldoInicial ? ((saldoHoje - saldoInicial) / saldoInicial) * 100 : 0;

  const renda = Number(profile.data?.renda_mensal ?? 0);
  const fixos = totalGastoFixoMensal(((gastos.data ?? []) as GastoFixo[]));
  const parcMes = parcelasNoMes(((parcelas.data ?? []) as unknown as Parcela[]), y, m0);

  const appData: AppDataForAI = {
    saldoHoje, saldoInicial, saldoFimMes, totalInvestido,
    totalEntradas: totalEntradasMes,
    totalSaidas: totalSaidasMes,
    gastosFixos: fixos,
    parcelasMes: parcMes,
    rendaMensal: renda,
  };

  const dashboardProps = {
    saldoHoje, saldoFimMes, saldoInicial,
    totalEntradasMes, totalSaidasMes,
    nome, dayName, dToday, m0,
    chartData, seis,
    primeiroNegativo, ultimoPositivo,
    totalInvestido, variacaoPercentual,
    saldoVisivel, setSaldoVisivel,
  };

  if (loading) {
    return (
      <div className="page-container space-y-4 animate-in">
        <div className="skeleton h-12 w-60 rounded-lg" />
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-4 animate-in">
      <DashboardMercury {...dashboardProps} />

      {/* External economic data */}
      {(extData.usd || extData.selic) && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="eyebrow">Mercado</span>
          {extData.usd && (
            <span className="chip chip-ghost flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> USD <strong className="tabular-nums">R$ {extData.usd.toFixed(2)}</strong>
            </span>
          )}
          {extData.eur && (
            <span className="chip chip-ghost flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> EUR <strong className="tabular-nums">R$ {extData.eur.toFixed(2)}</strong>
            </span>
          )}
          {extData.selic && (
            <span className="chip chip-ghost flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Selic <strong className="tabular-nums">{extData.selic.toFixed(2)}%</strong>
            </span>
          )}
          {extData.ipca && (
            <span className="chip chip-ghost flex items-center gap-1">
              <PiggyBank className="h-3 w-3" /> IPCA <strong className="tabular-nums">{extData.ipca.toFixed(1)}%</strong>
            </span>
          )}
          {extData.updatedAt && (
            <span className="text-[10px] text-muted-foreground/50">· {extData.updatedAt}</span>
          )}
        </div>
      )}

      {/* FABs */}
      <button
        onClick={() => setQaOpen("in")}
        className="fixed bottom-28 right-5 lg:bottom-8 lg:right-8 z-30 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg grid place-items-center active:scale-90 transition-transform"
        aria-label="Adicionar lançamento"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* AI Chat */}

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
              <button onClick={() => { setQaOpen(null); setQaValor(""); }} className="h-12 rounded-xl border border-border text-sm font-medium">Cancelar</button>
              <button onClick={commitQuick} className={cn("h-12 rounded-xl text-white font-bold", qaOpen === "in" ? "bg-positive" : "bg-negative")}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
