import { useMemo } from "react";
import { MESES_ABREV, compactNum, saldoHeat } from "@/lib/format";
import { usePrivacy, DOTS } from "@/lib/privacy";
import { cn } from "@/lib/utils";
import type { MesData } from "@/components/FluxoMonth";

/* ─── Horizonte de saldos ───
   Grid compacta: dias nas linhas, meses nas colunas, cada célula
   colorida por heat-map (vermelho → cinza → verde) do saldo do dia.
   Inspirado em apps de finanças com visão calendário de 12 meses. */
export function HorizonteSaldos({ mesesData, today }: { mesesData: MesData[]; today: Date }) {
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
                    return (
                      <td
                        key={`${m.y}-${m.m}-${dia}`}
                        className="border-b border-border/40 px-3 py-1.5 text-right font-mono tabular-nums font-semibold"
                        style={{ background: heat.background, color: heat.color }}
                      >
                        {hidden ? DOTS : compactNum(d.saldo)}
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
