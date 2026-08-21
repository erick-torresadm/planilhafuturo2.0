import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll, getProfile } from "@/lib/db";
import { computaMes, type GastoFixo, type Parcela } from "@/lib/finance";
import { useMemo, useState } from "react";
import { useSounds } from "@/hooks/useSounds";
import { useLancamentosLocal } from "@/hooks/useLancamentosLocal";
import { MonthScroller, FluxoMonthView } from "@/components/FluxoMonth";
import { HorizonteSaldos } from "@/components/HorizonteSaldos";
import { useBrl } from "@/lib/privacy";
import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

/* /v2/fluxo — mesma logica de dados de /fluxo (nenhuma regra de negocio
   reescrita), so roda dentro da casca AppShellV2. */
export const Route = createFileRoute("/_authenticated/v2/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo Diário — planilhafuturo v2" }] }),
  component: FluxoPageV2,
});

function FluxoPageV2() {
  const { playSound } = useSounds();
  const today = new Date();
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [monthOffset, setMonthOffset] = useState(0);
  const [view, setView] = useState<"detalhe" | "horizonte">("detalhe");

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const { list: lanc, upsert } = useLancamentosLocal();

  const meses = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(anchor.y, anchor.m + i, 1);
        return { y: d.getFullYear(), m: d.getMonth() };
      }),
    [anchor],
  );

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
  const atCurrent = anchor.y === today.getFullYear() && anchor.m === today.getMonth();

  return (
    <div className="page-container space-y-3 animate-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          {view === "detalhe" && (
            <MonthScroller
              mesesData={mesesData}
              offset={monthOffset}
              onSelect={setMonthOffset}
              onPrev={() => {
                const d = new Date(anchor.y, anchor.m - 1, 1);
                setAnchor({ y: d.getFullYear(), m: d.getMonth() });
                setMonthOffset(0);
              }}
              onNext={() => {
                const d = new Date(anchor.y, anchor.m + 1, 1);
                setAnchor({ y: d.getFullYear(), m: d.getMonth() });
                setMonthOffset(0);
              }}
              canGoBack={!atCurrent}
              today={today}
            />
          )}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shrink-0">
          <button
            type="button"
            onClick={() => setView("detalhe")}
            aria-label="Ver detalhe do mês"
            className={cn(
              "h-11 w-11 grid place-items-center rounded-lg transition-colors",
              view === "detalhe"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Rows3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("horizonte")}
            aria-label="Ver horizonte de 12 meses"
            className={cn(
              "h-11 w-11 grid place-items-center rounded-lg transition-colors",
              view === "horizonte"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === "detalhe" ? (
        <FluxoMonthView mm={mm} today={today} onCommit={commit} loading={loading} />
      ) : (
        <HorizonteSaldos mesesData={mesesData} today={today} />
      )}

      <div className="text-xs text-muted-foreground text-center pt-2">
        Saldo base: <span className="font-semibold text-foreground">{f(saldoInicial)}</span> ·
        ajuste em Configurações
      </div>
    </div>
  );
}
