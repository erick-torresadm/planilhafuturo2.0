import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { SheetCell } from "@/components/SheetCell";
import { MESES, MESES_ABREV, isoDate } from "@/lib/format";
import { computaMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { useSounds } from "@/hooks/useSounds";

export const Route = createFileRoute("/_authenticated/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo Diário — Planilha" }] }),
  component: FluxoPage,
});

function FluxoPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const today = new Date();
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
    return data;
  }});
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const lanc = useQuery({ queryKey: ["lancamentos"], queryFn: () => selectAll("lancamentos") });

  const upsertLanc = useMutation({
    mutationFn: async (p: { data: string; tipo: string; valor: number }) => {
      const existing = ((lanc.data ?? []) as any[]).find((l) => l.data === p.data && l.tipo === p.tipo);
      if (existing) {
        if (p.valor === 0) return deleteRow("lancamentos", existing.id);
        return updateRow("lancamentos", existing.id, { valor: p.valor });
      }
      if (p.valor === 0) return null;
      return insertRow("lancamentos", p);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });

  const meses = useMemo(() => {
    const out: { y: number; m: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(anchor.y, anchor.m + i, 1);
      out.push({ y: d.getFullYear(), m: d.getMonth() });
    }
    return out;
  }, [anchor]);

  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);

  // Encadeia saldos entre meses
  const mesesData = useMemo(() => {
    const g = (gastos.data ?? []) as GastoFixo[];
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    const l = (lanc.data ?? []) as unknown as Lancamento[];
    let carry = saldoInicial;
    return meses.map((mm) => {
      const dias = computaMes(mm.y, mm.m, carry, g, p, l);
      carry = dias.length ? dias[dias.length - 1].saldo : carry;
      return { ...mm, dias };
    });
  }, [meses, gastos.data, parcelas.data, lanc.data, saldoInicial]);

  function commitDia(data: string, tipo: string, valor: number, prev: number) {
    if (valor === prev) return;
    upsertLanc.mutate({ data, tipo, valor });
    if (valor > 0 && tipo.startsWith("entrada")) playSound("kaching");
    else if (valor > 0) playSound("pop");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Fluxo Diário</h1>
          <p className="text-sm text-muted-foreground">6 meses de projeção — saldo calculado dia a dia</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(anchor.y, anchor.m - 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm min-w-32 text-center font-medium">
            {MESES_ABREV[anchor.m]}/{anchor.y} — {MESES_ABREV[meses[5].m]}/{meses[5].y}
          </div>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(anchor.y, anchor.m + 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor({ y: today.getFullYear(), m: today.getMonth() })}>Hoje</Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <div className="flex min-w-max">
          {mesesData.map((mm) => {
            const totalEF = mm.dias.reduce((a, d) => a + d.entradaFixa, 0);
            const totalED = mm.dias.reduce((a, d) => a + d.entradaDiaria, 0);
            const totalSF = mm.dias.reduce((a, d) => a + d.saidaFixa, 0);
            const totalSD = mm.dias.reduce((a, d) => a + d.saidaDiaria, 0);
            const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
            return (
              <div key={`${mm.y}-${mm.m}`} className="border-r last:border-r-0">
                <div className="bg-header text-header-foreground px-3 py-2 text-center text-sm font-bold uppercase">
                  {MESES[mm.m]} {mm.y}
                </div>
                <table className="sheet-grid">
                  <thead>
                    <tr>
                      <th className="sheet-th w-10 text-center">Dia</th>
                      <th className="sheet-th w-24 text-right">Ent.Fixa</th>
                      <th className="sheet-th w-24 text-right">Ent.Dia</th>
                      <th className="sheet-th w-24 text-right">Saí.Fixa</th>
                      <th className="sheet-th w-24 text-right">Saí.Dia</th>
                      <th className="sheet-th w-28 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mm.dias.map((d, i) => {
                      const isToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
                      return (
                        <tr key={d.dia} className={`${i % 2 ? "sheet-row-alt" : ""} ${isToday ? "ring-1 ring-primary/50" : ""}`}>
                          <td className="sheet-td text-center font-medium">{d.dia}</td>
                          <td className="sheet-td p-0 bg-cell-in/30">
                            <SheetCell value={d.entradaFixa} onCommit={(v) => commitDia(d.data, "entrada_fixa", v, d.entradaFixa)} />
                          </td>
                          <td className="sheet-td p-0 bg-cell-in/30">
                            <SheetCell value={d.entradaDiaria} onCommit={(v) => commitDia(d.data, "entrada_diaria", v, d.entradaDiaria)} />
                          </td>
                          <td className="sheet-td p-0 bg-cell-out/30">
                            <SheetCell value={d.saidaFixa} onCommit={() => {}} readOnly />
                          </td>
                          <td className="sheet-td p-0 bg-cell-out/30">
                            <SheetCell value={d.saidaDiaria} onCommit={(v) => commitDia(d.data, "saida_diaria", v, d.saidaDiaria)} />
                          </td>
                          <td className={`sheet-td text-right font-semibold ${d.saldo < 0 ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive"}`}>
                            {brl(d.saldo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="sheet-total">
                      <td className="sheet-td text-center">Σ</td>
                      <td className="sheet-td text-right">{brl(totalEF)}</td>
                      <td className="sheet-td text-right">{brl(totalED)}</td>
                      <td className="sheet-td text-right">{brl(totalSF)}</td>
                      <td className="sheet-td text-right">{brl(totalSD)}</td>
                      <td className="sheet-td text-right">{brl(saldoFim)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Saldo inicial base: <b>{brl(saldoInicial)}</b> — ajuste em Configurações.
      </div>
    </div>
  );
}
