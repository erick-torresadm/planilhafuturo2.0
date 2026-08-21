import { useMemo } from "react";
import { MESES_ABREV, compactNum, saldoHeat } from "@/lib/format";
import { usePrivacy, DOTS } from "@/lib/privacy";
import { cn } from "@/lib/utils";
import type { MesData } from "@/components/FluxoMonth";
import type { DiaFluxo } from "@/lib/finance";

/* ─── Horizonte de saldos ───
   Grid compacta: dias nas linhas, meses nas colunas, cada célula
   colorida por heat-map (vermelho → cinza → verde) do saldo do dia.
   Clique num dia abre o detalhe (onDayClick) — usado pra listar e
   remover os lançamentos daquele dia. */
export function HorizonteSaldos({
  mesesData,
  today,
  onDayClick,
}: {
  mesesData: MesData[];
  today: Date;
  onDayClick?: (dia: DiaFluxo, mesLabel: string) => void;
}) {
  const { hidden } = usePrivacy();
  const maxDays = Math.max(...mesesData.map((m) => m.dias.length), 28);
  const rows = Array.from({ length: maxDays }, (_, i) => i + 1);

  const [min, max] = useMemo(() => {
    let lo = 0;
    let hi = 0;
    for (const m of mesesData) {
      for (const d of m.dias) {
        if (d.saldo < lo) lo = d.saldo;
        if (d.saldo > hi) hi = d.saldo;
      }
    }
    return [lo, hi];
  }, [mesesData]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-card border-b border-r border-border px-3 py-2.5 text-left font-bold text-foreground">
                dia
              </th>
              {mesesData.map((m) => {
                const isToday = m.y === today.getFullYear() && m.m === today.getMonth();
                return (
                  <th
                    key={`${m.y}-${m.m}`}
                    className={cn(
                      "sticky top-0 z-10 border-b border-border px-3 py-2.5 text-center font-bold whitespace-nowrap",
                      isToday ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {MESES_ABREV[m.m].toLowerCase()}/{String(m.y).slice(2)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((dia) => {
              const isCurrentDay = today.getDate() === dia;
              return (
                <tr key={dia}>
                  <td
                    className={cn(
                      "sticky left-0 z-10 bg-card border-r border-b border-border/60 px-3 py-1.5 text-center font-semibold",
                      isCurrentDay ? "bg-foreground text-background" : "text-muted-foreground",
                    )}
                  >
                    {dia}
                  </td>
                  {mesesData.map((m) => {
                    const d = m.dias[dia - 1];
                    if (!d) {
                      return (
                        <td
                          key={`${m.y}-${m.m}-${dia}`}
                          className="border-b border-border/40 bg-muted/20"
                        />
                      );
                    }
                    const heat = saldoHeat(d.saldo, min, max);
                    const mesLabel = `${MESES_ABREV[m.m]}/${String(m.y).slice(2)}`;
                    return (
                      <td
                        key={`${m.y}-${m.m}-${dia}`}
                        className="border-b border-border/40 p-0"
                        style={{ background: heat.background }}
                      >
                        <button
                          type="button"
                          onClick={() => onDayClick?.(d, mesLabel)}
                          aria-label={`Ver ações de ${dia} ${mesLabel}`}
                          className={cn(
                            "w-full h-full min-h-9 px-3 py-1.5 text-right font-mono tabular-nums font-semibold transition-[filter]",
                            onDayClick && "cursor-pointer hover:brightness-95",
                          )}
                          style={{ color: heat.color }}
                        >
                          {hidden ? DOTS : compactNum(d.saldo)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
