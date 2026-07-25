import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { MESES, MESES_ABREV, isoDate, brl } from "@/lib/format";
import { computaMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { SheetCell } from "@/components/SheetCell";
import { Money } from "@/components/Money";

export const Route = createFileRoute("/_authenticated/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo Diário — planilhafuturo" }] }),
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
        const copy = [...prev]; copy[idx] = { ...copy[idx], valor };
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

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return null;
        const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
        return data;
      } catch { return null; }
    },
  });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: async () => { try { return await selectAll("gastos_fixos"); } catch { return []; } } });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: async () => { try { return await selectAll("parcelas"); } catch { return []; } } });
  const { list: lanc, upsert } = useLancamentosLocal();

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
    upsert(data, tipo, valor);
    if (valor > 0 && tipo.startsWith("entrada")) playSound("kaching");
    else if (valor > 0) playSound("pop");
  }

  const mm = mesesData[monthOffset];

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-6 space-y-3 lg:pt-6 lg:px-6 lg:space-y-4">
      {/* Header: month scroller */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { const d = new Date(anchor.y, anchor.m - 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}
          className="h-10 w-10 rounded-xl border border-border bg-card grid place-items-center shrink-0 active:scale-95 transition-transform"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {mesesData.map((m, i) => {
            const active = i === monthOffset;
            const isToday = m.y === today.getFullYear() && m.m === today.getMonth();
            const saldoFim = m.dias.length ? m.dias[m.dias.length - 1].saldo : 0;
            return (
              <button
                key={i}
                onClick={() => setMonthOffset(i)}
                className={`snap-start shrink-0 px-3 py-2 rounded-xl border transition-all min-w-[92px] text-left ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : saldoFim < 0
                      ? "border-negative/40 bg-negative-soft text-negative"
                      : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className={`text-[10px] uppercase tracking-widest font-semibold ${active ? "opacity-80" : "opacity-70"}`}>
                  {MESES_ABREV[m.m]}/{String(m.y).slice(2)}{isToday && !active && <span className="ml-1 text-primary">•</span>}
                </div>
                <div className="font-mono font-bold text-[13px] tabular-nums truncate">{brl(saldoFim)}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { const d = new Date(anchor.y, anchor.m + 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}
          className="h-10 w-10 rounded-xl border border-border bg-card grid place-items-center shrink-0 active:scale-95 transition-transform"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ============ MOBILE: day focus ============ */}
      <div className="lg:hidden">
        <DayFocus mm={mm} today={today} onCommit={commit} onHoje={() => setAnchor({ y: today.getFullYear(), m: today.getMonth() })} />
      </div>

      {/* ============ DESKTOP: table ============ */}
      <div className="hidden lg:block hope-card overflow-hidden">
        <MonthTable mm={mm} today={today} onCommit={commit} />
      </div>

      <div className="text-[11px] text-muted-foreground text-center pt-2">
        Saldo base: <b className="text-foreground">{brl(saldoInicial)}</b> · ajuste em Configurações
      </div>
    </div>
  );
}

/* ============ MOBILE DAY FOCUS ============ */
function DayFocus({ mm, today, onCommit, onHoje }: any) {
  const isCurrentMonth = mm.y === today.getFullYear() && mm.m === today.getMonth();
  const initialDay = isCurrentMonth ? today.getDate() : 1;
  const [sel, setSel] = useState<number>(initialDay);
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSel(isCurrentMonth ? today.getDate() : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mm.y, mm.m]);

  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>(`[data-d="${sel}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [sel]);

  const day = mm.dias.find((d: any) => d.dia === sel) ?? mm.dias[0];
  const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const dt = new Date(mm.y, mm.m, day.dia);
  const isTd = isoDate(mm.y, mm.m, day.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
  const diasNeg = mm.dias.filter((d: any) => d.saldo < 0).length;

  const linhas = [
    { key: "ef", label: "Entrada fixa",  value: day.entradaFixa,    tipo: "entrada_fixa",    tone: "in" as const, hint: "Salário, renda recorrente" },
    { key: "ed", label: "Entrada extra", value: day.entradaDiaria,  tipo: "entrada_diaria",  tone: "in" as const, hint: "Freela, presentes, vendas" },
    { key: "sf", label: "Saída fixa",    value: day.saidaFixa,      tipo: null,              tone: "out" as const, hint: "Contas e parcelas do dia", readOnly: true },
    { key: "sd", label: "Saída extra",   value: day.saidaDiaria,    tipo: "saida_diaria",    tone: "out" as const, hint: "Gastos avulsos" },
  ];

  return (
    <div className="space-y-3">
      {/* Day chip scroller */}
      <div ref={chipsRef} className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        {mm.dias.map((d: any) => {
          const active = d.dia === sel;
          const dToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
          const dd = new Date(mm.y, mm.m, d.dia);
          const wk = WD[dd.getDay()][0];
          const neg = d.saldo < 0;
          return (
            <button
              key={d.dia}
              data-d={d.dia}
              onClick={() => setSel(d.dia)}
              className={`shrink-0 w-12 h-16 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md"
                  : dToday
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : neg
                      ? "border-negative/30 bg-negative-soft text-negative"
                      : "border-border bg-card"
              }`}
            >
              <span className={`text-[9px] font-bold uppercase ${active ? "opacity-80" : "opacity-70"}`}>{wk}</span>
              <span className="text-[17px] font-black leading-none tabular-nums">{d.dia}</span>
            </button>
          );
        })}
      </div>

      {/* Big day card */}
      <div className={`hope-card overflow-hidden ${isTd ? "ring-2 ring-primary" : ""}`}>
        <div className={`px-4 py-3 flex items-center justify-between ${isTd ? "bg-primary/10" : "bg-muted/40"} border-b border-border`}>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={`text-3xl font-black tabular-nums ${isTd ? "text-primary" : ""}`}>{day.dia}</span>
            <span className="text-sm font-semibold text-muted-foreground truncate">
              {dt.toLocaleDateString("pt-BR", { weekday: "long" })}
            </span>
            {isTd && <span className="chip bg-primary text-primary-foreground text-[9px]">HOJE</span>}
          </div>
          <div className="text-right shrink-0">
            <div className="eyebrow !text-[9px]">Saldo</div>
            <div className={`font-mono text-lg font-black tabular-nums ${day.saldo < 0 ? "text-negative" : "text-positive"}`}>
              {brl(day.saldo)}
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {linhas.map((l) => (
            <div key={l.key} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${l.tone === "in" ? "bg-positive" : "bg-negative"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold leading-tight">{l.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{l.hint}</div>
              </div>
              <div className={`shrink-0 w-32 h-11 rounded-lg border-2 overflow-hidden ${
                l.tone === "in" ? "border-positive/25 bg-positive-soft/40" : "border-negative/25 bg-negative-soft/40"
              }`}>
                <SheetCell
                  value={l.value}
                  onCommit={(v) => l.tipo && onCommit(day.data, l.tipo, v, l.value)}
                  readOnly={l.readOnly}
                  className="h-full font-bold text-[15px]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 border-t border-border">
          <button
            disabled={sel <= 1}
            onClick={() => setSel((d) => Math.max(1, d - 1))}
            className="h-12 flex items-center justify-center gap-1 text-sm font-semibold disabled:opacity-30 active:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <button
            onClick={() => { if (!isCurrentMonth) onHoje(); setSel(today.getDate()); }}
            className="h-12 flex items-center justify-center gap-1 text-sm font-bold text-primary border-x border-border active:bg-primary/10"
          >
            <Calendar className="h-4 w-4" /> Hoje
          </button>
          <button
            disabled={sel >= mm.dias.length}
            onClick={() => setSel((d) => Math.min(mm.dias.length, d + 1))}
            className="h-12 flex items-center justify-center gap-1 text-sm font-semibold disabled:opacity-30 active:bg-muted"
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resumo compacto */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Fim do mês" value={saldoFim} tone={saldoFim < 0 ? "neg" : "pos"} />
        <MiniStat label="Dias neg." value={diasNeg} raw tone={diasNeg > 0 ? "neg" : "pos"} />
        <MiniStat label="Pior dia" value={Math.min(...mm.dias.map((d: any) => d.saldo))} tone="neg" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone, raw }: { label: string; value: number; tone: "pos" | "neg"; raw?: boolean }) {
  return (
    <div className="hope-card p-3">
      <div className="eyebrow !text-[9px]">{label}</div>
      <div className={`mt-1 font-mono font-bold text-[13px] tabular-nums truncate ${tone === "neg" ? "text-negative" : "text-positive"}`}>
        {raw ? value : <Money value={value} />}
      </div>
    </div>
  );
}

/* ============ DESKTOP TABLE ============ */
function MonthTable({ mm, today, onCommit }: any) {
  const WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];
  const todayRef = useRef<HTMLTableRowElement>(null);
  const totalEF = mm.dias.reduce((a: number, d: any) => a + d.entradaFixa, 0);
  const totalED = mm.dias.reduce((a: number, d: any) => a + d.entradaDiaria, 0);
  const totalSF = mm.dias.reduce((a: number, d: any) => a + d.saidaFixa, 0);
  const totalSD = mm.dias.reduce((a: number, d: any) => a + d.saidaDiaria, 0);
  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;

  useEffect(() => { todayRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [mm.y, mm.m]);

  return (
    <div className="overflow-x-auto">
      <table className="sheet-grid w-full">
        <thead>
          <tr>
            <th className="sheet-th w-16 text-center">Dia</th>
            <th className="sheet-th w-32 text-right">Ent. Fixa</th>
            <th className="sheet-th w-32 text-right">Ent. Extra</th>
            <th className="sheet-th w-32 text-right">Saí. Fixa</th>
            <th className="sheet-th w-32 text-right">Saí. Extra</th>
            <th className="sheet-th sheet-th-last text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {mm.dias.map((d: any, i: number) => {
            const isToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
            const wd = WEEKDAY[new Date(mm.y, mm.m, d.dia).getDay()];
            const isWk = [0, 6].includes(new Date(mm.y, mm.m, d.dia).getDay());
            return (
              <tr
                key={d.dia}
                ref={isToday ? todayRef : undefined}
                className={isToday ? "bg-primary/10 ring-2 ring-primary ring-inset" : d.saldo < 0 ? "bg-negative-soft/60" : i % 2 ? "sheet-row-alt" : ""}
                style={isToday ? { scrollMarginTop: 120 } : undefined}
              >
                <td className={`sheet-td text-center ${isToday ? "text-primary font-bold" : isWk ? "text-muted-foreground" : ""}`}>
                  <div className={`${isToday ? "text-lg" : "text-base"} leading-none font-bold`}>{d.dia}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70 mt-0.5">{wd}</div>
                </td>
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
                <td className={`sheet-td sheet-td-last text-right font-bold tabular-nums ${d.saldo < 0 ? "text-negative" : "text-positive"}`}>
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
            <td className="sheet-td sheet-td-last text-right text-primary">{brl(saldoFim)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
