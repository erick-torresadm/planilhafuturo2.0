import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { MESES, MESES_ABREV, isoDate, brl } from "@/lib/format";
import { computaMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { SheetCell } from "@/components/SheetCell";

export const Route = createFileRoute("/_authenticated/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo Diário — Planilha" }] }),
  component: FluxoPage,
});

const LS_KEY = "fluxo_lancamentos_v1";

function useLancamentosLocal() {
  const [list, setList] = useState<Lancamento[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
  }, [list]);
  function upsert(data: string, tipo: string, valor: number) {
    setList((prev) => {
      const idx = prev.findIndex((l) => l.data === data && l.tipo === tipo);
      if (idx >= 0) {
        if (valor === 0) return prev.filter((_, i) => i !== idx);
        const copy = [...prev];
        copy[idx] = { ...copy[idx], valor };
        return copy;
      }
      if (valor === 0) return prev;
      return [...prev, { id: crypto.randomUUID(), data, tipo: tipo as any, valor }];
    });
  }
  return { list, upsert };
}

function FluxoPage() {
  const { playSound } = useSounds();
  const today = new Date();
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [monthOffset, setMonthOffset] = useState(0);

  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    } catch { return null; }
  }});
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: async () => { try { return await selectAll("gastos_fixos"); } catch { return []; } } });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: async () => { try { return await selectAll("parcelas"); } catch { return []; } } });
  const { list: lanc, upsert: upsertLanc } = useLancamentosLocal();

  const meses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
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
    upsertLanc(data, tipo, valor);
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

      {/* Mobile: month picker + single-month spreadsheet (like desktop) */}
      <div className="lg:hidden space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {mesesData.map((mm, i) => {
            const active = i === monthOffset;
            const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
            return (
              <button key={i} onClick={() => setMonthOffset(i)}
                className={`shrink-0 px-3 py-2 rounded-lg text-left transition-all ${active ? "mint-gradient" : "glass"}`}>
                <div className="text-[10px] uppercase tracking-widest opacity-70">{MESES_ABREV[mm.m]}/{String(mm.y).slice(2)}</div>
                <div className={`font-display font-bold text-xs ${saldoFim < 0 ? "text-negative" : ""}`}>{brl(saldoFim)}</div>
              </button>
            );
          })}
        </div>

        <MonthSheet mm={mesesData[monthOffset]} today={today} onCommit={commit} mobile />
      </div>

      {/* Desktop: full 6-month grid */}
      <div className="hidden lg:block glass overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-max">
            {mesesData.map((mm) => (
              <div key={`${mm.y}-${mm.m}`} className="border-r border-border last:border-r-0">
                <div className="bg-header px-3 py-3 text-center text-xs font-bold uppercase tracking-widest text-header-foreground">
                  {MESES[mm.m]} <span className="opacity-60">{mm.y}</span>
                </div>
                <MonthSheet mm={mm} today={today} onCommit={commit} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Saldo base: <b className="text-foreground">{brl(saldoInicial)}</b> — ajuste em Configurações.
      </div>
    </div>
  );
}

function MonthSheet({ mm, today, onCommit, mobile }: { mm: any; today: Date; onCommit: (d: string, t: string, v: number, p: number) => void; mobile?: boolean }) {
  const totalEF = mm.dias.reduce((a: number, d: any) => a + d.entradaFixa, 0);
  const totalED = mm.dias.reduce((a: number, d: any) => a + d.entradaDiaria, 0);
  const totalSF = mm.dias.reduce((a: number, d: any) => a + d.saidaFixa, 0);
  const totalSD = mm.dias.reduce((a: number, d: any) => a + d.saidaDiaria, 0);
  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;

  const todayRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (mobile && todayRef.current) {
      todayRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [mobile, mm.y, mm.m]);

  const wrapClass = mobile ? "glass overflow-hidden" : "";

  return (
    <div className={wrapClass}>
      <table className="sheet-grid w-full">
        <thead>
          <tr>
            <th className={`sheet-th ${mobile ? "w-12" : "w-10"} text-center`}>Dia</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Ent.Fixa</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Ent.Dia</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Saí.Fixa</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Saí.Dia</th>
            <th className={`sheet-th ${mobile ? "" : "w-28"} text-right`}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {mm.dias.map((d: any, i: number) => {
            const isToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
            const rowSize = isToday ? "text-base md:text-sm" : mobile ? "text-sm" : "";
            const rowExtra = isToday
              ? "bg-primary/15 ring-2 ring-primary ring-inset shadow-[0_0_20px_rgba(45,212,168,0.35)] font-bold"
              : i % 2 ? "sheet-row-alt" : "";
            return (
              <tr key={d.dia} ref={isToday ? todayRef : undefined} className={`${rowExtra} ${rowSize}`}>
                <td className={`sheet-td text-center font-semibold ${isToday ? "text-primary text-lg" : "text-muted-foreground"}`}>{d.dia}</td>
                <td className="sheet-td p-0 bg-cell-in">
                  <SheetCell value={d.entradaFixa} onCommit={(v) => onCommit(d.data, "entrada_fixa", v, d.entradaFixa)} />
                </td>
                <td className="sheet-td p-0 bg-cell-in">
                  <SheetCell value={d.entradaDiaria} onCommit={(v) => onCommit(d.data, "entrada_diaria", v, d.entradaDiaria)} />
                </td>
                <td className="sheet-td p-0 bg-cell-out">
                  <SheetCell value={d.saidaFixa} onCommit={() => {}} readOnly />
                </td>
                <td className="sheet-td p-0 bg-cell-out">
                  <SheetCell value={d.saidaDiaria} onCommit={(v) => onCommit(d.data, "saida_diaria", v, d.saidaDiaria)} />
                </td>
                <td className={`sheet-td text-right font-bold ${d.saldo < 0 ? "text-negative" : "text-positive"} ${isToday ? "text-base" : ""}`}>
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
}
