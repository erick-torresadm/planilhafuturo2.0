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

  // "Até quando posso gastar" — último mês em que o saldo final ainda é positivo
  const ultimoMesPositivo = useMemo(() => {
    let last: { y: number; m: number; saldo: number } | null = null;
    for (const mm of mesesData) {
      const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
      if (saldoFim >= 0) last = { y: mm.y, m: mm.m, saldo: saldoFim };
      else break;
    }
    return last;
  }, [mesesData]);

  const primeiroMesNegativo = useMemo(() => {
    for (const mm of mesesData) {
      const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
      if (saldoFim < 0) return { y: mm.y, m: mm.m, saldo: saldoFim };
    }
    return null;
  }, [mesesData]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight truncate">Fluxo Diário</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">6 meses de projeção — saldo dia a dia</p>
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0 bg-card">
          <button onClick={() => { const d = new Date(anchor.y, anchor.m - 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}
            className="h-9 w-9 grid place-items-center hover:bg-black/5" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
          <div className="hidden sm:block text-xs font-medium px-3 tabular-nums">
            {MESES_ABREV[anchor.m]}/{String(anchor.y).slice(2)} – {MESES_ABREV[meses[5].m]}/{String(meses[5].y).slice(2)}
          </div>
          <button onClick={() => { const d = new Date(anchor.y, anchor.m + 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); }}
            className="h-9 w-9 grid place-items-center hover:bg-black/5" aria-label="Próximo"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setAnchor({ y: today.getFullYear(), m: today.getMonth() })}
            className="text-[11px] font-semibold px-3 h-9 border-l border-border text-primary hover:bg-primary/10">Hoje</button>
        </div>
      </div>

      {/* Hint: até quando posso gastar */}
      {(ultimoMesPositivo || primeiroMesNegativo) && (
        <div className="glass px-4 py-3 flex items-center gap-3 text-sm">
          <div className={`h-2 w-2 rounded-full shrink-0 ${primeiroMesNegativo ? "bg-negative" : "bg-primary"}`} />
          <div className="min-w-0 flex-1">
            {primeiroMesNegativo ? (
              <>
                Você fica no verde até <b>{MESES[ultimoMesPositivo?.m ?? meses[0].m]} {ultimoMesPositivo?.y ?? meses[0].y}</b>.
                A partir de <b className="text-negative">{MESES[primeiroMesNegativo.m]} {primeiroMesNegativo.y}</b> o saldo fecha negativo em <b className="text-negative tabular-nums">{brl(primeiroMesNegativo.saldo)}</b>.
              </>
            ) : (
              <>Seu saldo continua positivo até <b>{MESES[ultimoMesPositivo!.m]} {ultimoMesPositivo!.y}</b> ({brl(ultimoMesPositivo!.saldo)}).</>
            )}
          </div>
        </div>
      )}

      {/* Month tabs — funciona em mobile e desktop */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 lg:justify-start">
        {mesesData.map((mm, i) => {
          const active = i === monthOffset;
          const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
          const isToday = mm.y === today.getFullYear() && mm.m === today.getMonth();
          return (
            <button key={i} onClick={() => setMonthOffset(i)}
              className={`shrink-0 px-3 py-2 rounded-lg text-left transition-all border ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-black/5"
              }`}>
              <div className={`text-[10px] uppercase tracking-widest ${active ? "opacity-80" : "text-muted-foreground"}`}>
                {MESES_ABREV[mm.m]}/{String(mm.y).slice(2)} {isToday && !active && <span className="text-primary">•</span>}
              </div>
              <div className={`font-semibold text-xs tabular-nums ${!active && saldoFim < 0 ? "text-negative" : ""}`}>{brl(saldoFim)}</div>
            </button>
          );
        })}
      </div>

      {/* Spreadsheet — mesma view em mobile e desktop */}
      <div className="glass overflow-x-auto">
        <MonthSheet mm={mesesData[monthOffset]} today={today} onCommit={commit} />
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
  const saldoMin = mm.dias.length ? Math.min(...mm.dias.map((d: any) => d.saldo)) : 0;
  const saldoMax = mm.dias.length ? Math.max(...mm.dias.map((d: any) => d.saldo)) : 0;
  const diasNegativos = mm.dias.filter((d: any) => d.saldo < 0).length;

  const todayRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [mm.y, mm.m]);

  const wrapClass = mobile ? "glass" : "";
  const WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];

  // Sparkline of balance across month
  const range = saldoMax - saldoMin || 1;
  const spark = mm.dias.map((d: any, i: number) => {
    const x = (i / Math.max(mm.dias.length - 1, 1)) * 100;
    const y = 100 - ((d.saldo - saldoMin) / range) * 100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const zeroY = 100 - ((0 - saldoMin) / range) * 100;

  return (
    <div className={wrapClass}>
      {/* Future summary strip */}
      <div className="px-3 py-2.5 border-b border-border bg-gradient-to-r from-transparent via-white/[0.02] to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider">
            <div>
              <div className="text-muted-foreground/70 font-semibold">Fim do mês</div>
              <div className={`text-sm font-black tabular-nums ${saldoFim < 0 ? "text-negative" : "text-positive"}`}>{brl(saldoFim)}</div>
            </div>
            <div>
              <div className="text-muted-foreground/70 font-semibold">Pior dia</div>
              <div className={`text-sm font-black tabular-nums ${saldoMin < 0 ? "text-negative" : "text-positive"}`}>{brl(saldoMin)}</div>
            </div>
            <div>
              <div className="text-muted-foreground/70 font-semibold">Dias neg.</div>
              <div className={`text-sm font-black tabular-nums ${diasNegativos > 0 ? "text-negative" : "text-positive"}`}>{diasNegativos}</div>
            </div>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-24 shrink-0">
            {saldoMin < 0 && saldoMax > 0 && (
              <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="text-muted-foreground/40" />
            )}
            <polyline
              points={spark}
              fill="none"
              stroke={saldoFim < 0 ? "oklch(0.55 0.20 25)" : "oklch(0.55 0.15 165)"}
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <table className="sheet-grid w-full">
        <thead>
          <tr>
            <th className={`sheet-th ${mobile ? "w-16" : "w-16"} text-center`}>Dia</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Ent. Fixa</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Ent. Dia</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Saí. Fixa</th>
            <th className={`sheet-th ${mobile ? "" : "w-24"} text-right`}>Saí. Dia</th>
            <th className={`sheet-th ${mobile ? "" : "w-28"} text-right`}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {mm.dias.map((d: any, i: number) => {
            const isToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
            const rowSize = isToday ? "text-base md:text-sm" : mobile ? "text-sm" : "";
            const dt = new Date(mm.y, mm.m, d.dia);
            const wd = WEEKDAY[dt.getDay()];
            const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
            const negRow = d.saldo < 0 && !isToday;
            const rowExtra = isToday
              ? "bg-primary/15 ring-2 ring-primary ring-inset shadow-[0_0_20px_rgba(45,212,168,0.35)] font-bold"
              : negRow
                ? "bg-negative/10"
                : i % 2 ? "sheet-row-alt" : "";
            return (
              <tr key={d.dia} ref={isToday ? todayRef : undefined} className={`${rowExtra} ${rowSize}`} style={isToday ? { scrollMarginTop: 120 } : undefined}>
                <td className={`sheet-td text-center font-bold ${isToday ? "text-primary" : isWeekend ? "text-muted-foreground/70" : "text-foreground"}`}>
                  <div className={`${isToday ? "text-lg" : "text-base"} leading-none`}>{d.dia}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider opacity-60 mt-0.5">{wd}</div>
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

function MonthDayFocus({ mm, today, onCommit }: { mm: any; today: Date; onCommit: (d: string, t: string, v: number, p: number) => void }) {
  const WEEKDAY = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const isCurrentMonth = mm.y === today.getFullYear() && mm.m === today.getMonth();
  const initialDay = isCurrentMonth ? today.getDate() : 1;
  const [selectedDay, setSelectedDay] = useState<number>(initialDay);

  useEffect(() => {
    setSelectedDay(isCurrentMonth ? today.getDate() : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mm.y, mm.m]);

  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>(`[data-day="${selectedDay}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selectedDay]);

  const day = mm.dias.find((d: any) => d.dia === selectedDay) ?? mm.dias[0];
  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
  const saldoMin = mm.dias.length ? Math.min(...mm.dias.map((d: any) => d.saldo)) : 0;
  const diasNegativos = mm.dias.filter((d: any) => d.saldo < 0).length;

  const dt = new Date(mm.y, mm.m, day.dia);
  const isToday = isoDate(mm.y, mm.m, day.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const rows: { key: string; label: string; hint: string; value: number; readOnly?: boolean; tone: "in" | "out"; tipo?: string }[] = [
    { key: "ef", label: "Entrada fixa", hint: "Salário, renda recorrente", value: day.entradaFixa, tone: "in", tipo: "entrada_fixa" },
    { key: "ed", label: "Entrada do dia", hint: "Extras, freelas, presentes", value: day.entradaDiaria, tone: "in", tipo: "entrada_diaria" },
    { key: "sf", label: "Saída fixa", hint: "Contas e parcelas do dia", value: day.saidaFixa, tone: "out", readOnly: true },
    { key: "sd", label: "Saída do dia", hint: "Gastos avulsos de hoje", value: day.saidaDiaria, tone: "out", tipo: "saida_diaria" },
  ];

  return (
    <div className="space-y-3">
      {/* Compact month summary */}
      <div className="glass px-3 py-2.5 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider">
        <div>
          <div className="text-muted-foreground/70 font-semibold">Fim do mês</div>
          <div className={`text-sm font-black tabular-nums ${saldoFim < 0 ? "text-negative" : "text-positive"}`}>{brl(saldoFim)}</div>
        </div>
        <div>
          <div className="text-muted-foreground/70 font-semibold">Pior dia</div>
          <div className={`text-sm font-black tabular-nums ${saldoMin < 0 ? "text-negative" : "text-positive"}`}>{brl(saldoMin)}</div>
        </div>
        <div>
          <div className="text-muted-foreground/70 font-semibold">Dias neg.</div>
          <div className={`text-sm font-black tabular-nums ${diasNegativos > 0 ? "text-negative" : "text-positive"}`}>{diasNegativos}</div>
        </div>
      </div>

      {/* Horizontal day chips */}
      <div ref={chipsRef} className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scroll-smooth">
        {mm.dias.map((d: any) => {
          const dd = new Date(mm.y, mm.m, d.dia);
          const wk = WEEKDAY[dd.getDay()][0];
          const isTd = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
          const active = d.dia === selectedDay;
          const neg = d.saldo < 0;
          return (
            <button
              key={d.dia}
              data-day={d.dia}
              onClick={() => setSelectedDay(d.dia)}
              className={`shrink-0 w-11 h-14 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : isTd
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : neg
                      ? "border-negative/30 bg-negative/5 text-negative"
                      : "border-border bg-card hover:bg-black/5"
              }`}
            >
              <span className={`text-[9px] font-semibold uppercase ${active ? "opacity-80" : "opacity-60"}`}>{wk}</span>
              <span className="text-base font-black leading-none tabular-nums">{d.dia}</span>
            </button>
          );
        })}
      </div>

      {/* Big day card */}
      <div className={`glass overflow-hidden ${isToday ? "ring-2 ring-primary shadow-[0_0_30px_rgba(45,212,168,0.25)]" : ""}`}>
        <div className={`px-4 py-3 flex items-center justify-between border-b border-border ${isToday ? "bg-primary/10" : "bg-black/[0.02]"}`}>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black tabular-nums ${isToday ? "text-primary" : ""}`}>{day.dia}</span>
            <span className="text-sm font-semibold text-muted-foreground">{WEEKDAY[dt.getDay()]}</span>
            {isToday && <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Hoje</span>}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saldo</div>
            <div className={`text-lg font-black tabular-nums ${day.saldo < 0 ? "text-negative" : "text-positive"}`}>{brl(day.saldo)}</div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.key} className={`flex items-center gap-3 px-4 py-3 ${r.tone === "in" ? "bg-cell-in/40" : "bg-cell-out/40"}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight">{r.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{r.hint}</div>
              </div>
              <div className={`shrink-0 w-40 h-11 rounded-md border ${r.tone === "in" ? "border-positive/30" : "border-negative/30"} bg-background overflow-hidden`}>
                <SheetCell
                  value={r.value}
                  onCommit={(v) => r.tipo && onCommit(day.data, r.tipo, v, r.value)}
                  readOnly={r.readOnly}
                  className="text-base font-bold h-full"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick nav */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-black/[0.02]">
          <button
            disabled={selectedDay <= 1}
            onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
            className="h-9 px-3 rounded-md border border-border text-sm font-semibold flex items-center gap-1 disabled:opacity-40 hover:bg-black/5"
          >
            <ChevronLeft className="h-4 w-4" /> Dia ant.
          </button>
          {!isToday && isCurrentMonth && (
            <button
              onClick={() => setSelectedDay(today.getDate())}
              className="h-9 px-3 rounded-md text-sm font-bold text-primary hover:bg-primary/10"
            >
              Ir para hoje
            </button>
          )}
          <button
            disabled={selectedDay >= mm.dias.length}
            onClick={() => setSelectedDay((d) => Math.min(mm.dias.length, d + 1))}
            className="h-9 px-3 rounded-md border border-border text-sm font-semibold flex items-center gap-1 disabled:opacity-40 hover:bg-black/5"
          >
            Próx. dia <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
