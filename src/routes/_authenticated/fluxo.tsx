import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { MESES, MESES_ABREV, isoDate, brl } from "@/lib/format";
import { computaMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { DataView } from "@/components/DataView";
import { SheetCell } from "@/components/SheetCell";

export const Route = createFileRoute("/_authenticated/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo Diário — Planilha" }] }),
  component: FluxoPage,
});

function FluxoPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const today = new Date();
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [monthOffset, setMonthOffset] = useState(0); // for mobile card view: which month among 6 to show

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

  const meses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(anchor.y, anchor.m + i, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }), [anchor]);

  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);

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

  function commit(data: string, tipo: string, valor: number, prev: number) {
    if (valor === prev) return;
    upsertLanc.mutate({ data, tipo, valor });
    if (valor > 0 && tipo.startsWith("entrada")) playSound("kaching");
    else if (valor > 0) playSound("pop");
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Fluxo Diário</h1>
          <p className="text-sm text-muted-foreground">6 meses de projeção — saldo dia a dia</p>
        </div>
        <div className="flex items-center gap-1 glass p-1 rounded-lg">
          <button onClick={() => { const d = new Date(anchor.y, anchor.m - 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}
            className="tap-target grid place-items-center rounded hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
          <div className="text-xs font-semibold px-3 min-w-40 text-center">
            {MESES_ABREV[anchor.m]}/{String(anchor.y).slice(2)} — {MESES_ABREV[meses[5].m]}/{String(meses[5].y).slice(2)}
          </div>
          <button onClick={() => { const d = new Date(anchor.y, anchor.m + 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}
            className="tap-target grid place-items-center rounded hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setAnchor({ y: today.getFullYear(), m: today.getMonth() })}
            className="text-[11px] font-semibold px-2 text-primary">Hoje</button>
        </div>
      </div>

      {/* Mobile: month picker + cards */}
      <div className="lg:hidden space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {mesesData.map((mm, i) => {
            const active = i === monthOffset;
            const totalEnt = mm.dias.reduce((a, d) => a + d.entradaFixa + d.entradaDiaria, 0);
            const totalSai = mm.dias.reduce((a, d) => a + d.saidaFixa + d.saidaDiaria, 0);
            return (
              <button key={i} onClick={() => setMonthOffset(i)}
                className={`shrink-0 px-4 py-2 rounded-lg text-left transition-all ${active ? "mint-gradient" : "glass"}`}>
                <div className="text-[10px] uppercase tracking-widest opacity-70">{MESES_ABREV[mm.m]}</div>
                <div className={`font-display font-bold text-sm ${active ? "" : "text-foreground"}`}>
                  <Money value={totalEnt - totalSai} signed showSign />
                </div>
              </button>
            );
          })}
        </div>

        <MobileMonth mm={mesesData[monthOffset]} today={today} onCommit={commit} />
      </div>

      {/* Desktop: full 6-month grid */}
      <div className="hidden lg:block glass overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-max">
            {mesesData.map((mm) => {
              const totalEF = mm.dias.reduce((a, d) => a + d.entradaFixa, 0);
              const totalED = mm.dias.reduce((a, d) => a + d.entradaDiaria, 0);
              const totalSF = mm.dias.reduce((a, d) => a + d.saidaFixa, 0);
              const totalSD = mm.dias.reduce((a, d) => a + d.saidaDiaria, 0);
              const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
              return (
                <div key={`${mm.y}-${mm.m}`} className="border-r border-border last:border-r-0">
                  <div className="bg-header px-3 py-3 text-center text-xs font-bold uppercase tracking-widest text-header-foreground">
                    {MESES[mm.m]} <span className="opacity-60">{mm.y}</span>
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
                          <tr key={d.dia} className={`${i % 2 ? "sheet-row-alt" : ""} ${isToday ? "ring-1 ring-primary/60 ring-inset" : ""}`}>
                            <td className="sheet-td text-center font-semibold text-muted-foreground">{d.dia}</td>
                            <td className="sheet-td p-0 bg-cell-in">
                              <SheetCell value={d.entradaFixa} onCommit={(v) => commit(d.data, "entrada_fixa", v, d.entradaFixa)} />
                            </td>
                            <td className="sheet-td p-0 bg-cell-in">
                              <SheetCell value={d.entradaDiaria} onCommit={(v) => commit(d.data, "entrada_diaria", v, d.entradaDiaria)} />
                            </td>
                            <td className="sheet-td p-0 bg-cell-out">
                              <SheetCell value={d.saidaFixa} onCommit={() => {}} readOnly />
                            </td>
                            <td className="sheet-td p-0 bg-cell-out">
                              <SheetCell value={d.saidaDiaria} onCommit={(v) => commit(d.data, "saida_diaria", v, d.saidaDiaria)} />
                            </td>
                            <td className={`sheet-td text-right font-bold ${d.saldo < 0 ? "text-negative" : "text-positive"}`}>
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
                        <td className="sheet-td text-right text-primary">{brl(saldoFim)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Saldo base: <b className="text-foreground"><Money value={saldoInicial} /></b> — ajuste em Configurações.
      </div>
    </div>
  );
}

function MobileMonth({ mm, today, onCommit }: { mm: any; today: Date; onCommit: (d: string, t: string, v: number, p: number) => void }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const totalEnt = mm.dias.reduce((a: number, d: any) => a + d.entradaFixa + d.entradaDiaria, 0);
  const totalSai = mm.dias.reduce((a: number, d: any) => a + d.saidaFixa + d.saidaDiaria, 0);
  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="glass p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3 w-3 text-positive" /> Entradas</div>
          <div className="font-display font-bold text-positive text-sm mt-1"><Money value={totalEnt} compact /></div>
        </div>
        <div className="glass p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="h-3 w-3 text-negative" /> Saídas</div>
          <div className="font-display font-bold text-negative text-sm mt-1"><Money value={totalSai} compact /></div>
        </div>
        <div className="glass p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo</div>
          <div className="font-display font-bold text-primary text-sm mt-1"><Money value={saldoFim} compact signed /></div>
        </div>
      </div>

      <div className="glass overflow-hidden">
        {mm.dias.map((d: any) => {
          const isToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
          const total = d.entradaFixa + d.entradaDiaria - d.saidaFixa - d.saidaDiaria;
          const expanded = expandedDay === d.dia;
          return (
            <div key={d.dia} className={`border-b border-border last:border-b-0 ${isToday ? "bg-primary/10" : ""}`}>
              <button onClick={() => setExpandedDay(expanded ? null : d.dia)}
                className="w-full flex items-center justify-between px-4 py-3 tap-target">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center text-sm font-bold ${isToday ? "mint-gradient" : "bg-white/5 text-muted-foreground"}`}>
                    {d.dia}
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">Movimento</div>
                    <div className="text-sm font-semibold"><Money value={total} signed showSign /></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo</div>
                  <div className={`text-sm font-bold ${d.saldo < 0 ? "text-negative" : "text-primary"}`}>{brl(d.saldo)}</div>
                </div>
              </button>
              {expanded && (
                <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2 fade-up">
                  <QuickInput label="Entrada fixa" color="in" value={d.entradaFixa} onCommit={(v) => onCommit(d.data, "entrada_fixa", v, d.entradaFixa)} />
                  <QuickInput label="Entrada dia" color="in" value={d.entradaDiaria} onCommit={(v) => onCommit(d.data, "entrada_diaria", v, d.entradaDiaria)} />
                  <QuickInput label="Saída fixa" color="out" value={d.saidaFixa} readOnly />
                  <QuickInput label="Saída dia" color="out" value={d.saidaDiaria} onCommit={(v) => onCommit(d.data, "saida_diaria", v, d.saidaDiaria)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickInput({ label, color, value, onCommit, readOnly }: { label: string; color: "in" | "out"; value: number; onCommit?: (v: number) => void; readOnly?: boolean }) {
  const c = color === "in" ? "border-positive/30 bg-cell-in text-positive" : "border-negative/30 bg-cell-out text-negative";
  return (
    <div className={`rounded-lg border p-2 ${c}`}>
      <div className="text-[9px] uppercase tracking-widest opacity-70">{label}</div>
      {readOnly ? (
        <div className="font-semibold text-sm mt-1">{value ? brl(value) : "—"}</div>
      ) : (
        <Input
          type="number"
          step="0.01"
          defaultValue={value || ""}
          placeholder="0,00"
          onBlur={(e) => {
            const v = Number(e.target.value) || 0;
            if (v !== value) onCommit?.(v);
          }}
          className="mt-1 h-8 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0 text-foreground"
        />
      )}
    </div>
  );
}
