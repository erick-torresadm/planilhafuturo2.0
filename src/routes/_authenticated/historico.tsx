import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll, getProfile } from "@/lib/db";
import { computaMes, type GastoFixo, type Parcela } from "@/lib/finance";
import { useMemo, useState } from "react";
import { useSounds } from "@/hooks/useSounds";
import { useLancamentosLocal } from "@/hooks/useLancamentosLocal";
import { MonthScroller, FluxoMonthView } from "@/components/FluxoMonth";
import { PageHeader } from "@/components/PageHeader";
import { useBrl } from "@/lib/privacy";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — planilhafuturo" }] }),
  component: HistoricoPage,
});

// Quantos meses para trás o histórico começa a mostrar.
const BACK = 24;

function HistoricoPage() {
  const { playSound } = useSounds();
  const today = new Date();
  const [start] = useState(() => {
    const d = new Date(today.getFullYear(), today.getMonth() - BACK, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [anchor, setAnchor] = useState(start);
  const [monthOffset, setMonthOffset] = useState(0);

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const { list: lanc, upsert } = useLancamentosLocal();

  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(anchor.y, anchor.m + i, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }), [anchor]);

  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);

  const mesesData = useMemo(() => {
    const g = (gastos.data ?? []) as GastoFixo[];
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    let carry = saldoInicial;
    return meses.map((mm) => {
      const dias = computaMes(mm.y, mm.m, carry, g, p, lanc);
      carry = dias.length ? dias[dias.length - 1].saldo : carry;
      return { ...mm, dias };
    });
  }, [meses, gastos.data, parcelas.data, lanc, saldoInicial]);

  function commit(data: string, tipo: string, valor: number, prev: number) {
    if (valor === prev) return;
    upsert({ data, tipo, valor });
    if (valor > 0 && tipo.startsWith("entrada")) playSound("kaching");
    else if (valor > 0) playSound("pop");
  }

  const loading = profile.isPending || gastos.isPending || parcelas.isPending;
  const mm = mesesData[monthOffset];
  const f = useBrl();
  const canGoBack = anchor.y > start.y || (anchor.y === start.y && anchor.m > start.m);

  return (
    <div className="page-container space-y-3 animate-in">
      <PageHeader
        title="Histórico"
        subtitle="Todos os meses, incluindo os passados"
      />
      <MonthScroller
        mesesData={mesesData}
        offset={monthOffset}
        onSelect={setMonthOffset}
        onPrev={() => { const d = new Date(anchor.y, anchor.m - 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); setMonthOffset(0); }}
        onNext={() => { const d = new Date(anchor.y, anchor.m + 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); setMonthOffset(0); }}
        canGoBack={canGoBack}
        today={today}
      />
      <FluxoMonthView mm={mm} today={today} onCommit={commit} loading={loading} />
      <div className="text-xs text-muted-foreground text-center pt-2">
        Saldo base: <span className="font-semibold text-foreground">{f(saldoInicial)}</span> · ajuste em Configurações
      </div>
    </div>
  );
}
