import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { MESES_ABREV, isoDate, num, saldoHeat } from "@/lib/format";
import { SheetCell } from "@/components/SheetCell";
import { cn } from "@/lib/utils";
import { usePrivacy, useBrl, DOTS } from "@/lib/privacy";
import type { DiaFluxo } from "@/lib/finance";

export type MesData = { y: number; m: number; dias: DiaFluxo[] };
export type CommitFn = (data: string, tipo: string, valor: number, prev: number) => void;

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WD_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

/* ─── Scroller de meses ───
   A seleção usa borda/ring na cor do sinal do mês (nunca verde sólido),
   para um mês com saldo negativo não parecer positivo. */
export function MonthScroller({
  mesesData, offset, onSelect, onPrev, onNext, canGoBack, today,
}: {
  mesesData: MesData[];
  offset: number;
  onSelect: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoBack: boolean;
  today: Date;
}) {
  const f = useBrl();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        disabled={!canGoBack}
        aria-label="Mês anterior"
        className={cn(
          "h-9 w-9 rounded-xl border grid place-items-center shrink-0 active:scale-95 transition-transform",
          canGoBack
            ? "border-border bg-card hover:bg-muted text-muted-foreground"
            : "border-border/60 bg-muted/40 text-muted-foreground/40 cursor-not-allowed",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar snap-x snap-mandatory">
        {mesesData.map((m, i) => {
          const active = i === offset;
          const isToday = m.y === today.getFullYear() && m.m === today.getMonth();
          const saldoFim = m.dias.length ? m.dias[m.dias.length - 1].saldo : 0;
          const neg = saldoFim < 0;
          const pos = saldoFim > 0;
          const labelCls = neg ? "text-negative" : pos ? "text-positive" : "text-muted-foreground";
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={cn(
                "snap-start shrink-0 px-2.5 sm:px-3.5 py-2 rounded-xl border transition-all min-w-[68px] sm:min-w-[100px] text-left",
                active
                  ? neg
                    ? "border-negative ring-2 ring-negative/30 bg-negative-soft"
                    : pos
                      ? "border-positive ring-2 ring-positive/30 bg-positive-soft"
                      : "border-primary ring-2 ring-primary/25 bg-card"
                  : neg
                    ? "border-negative/30 bg-negative-soft/50 hover:bg-negative-soft/80"
                    : pos
                      ? "border-positive/30 bg-positive-soft/50 hover:bg-positive-soft/80"
                      : "border-border bg-card hover:bg-muted",
              )}
            >
              <div className={cn("text-xs uppercase tracking-widest font-semibold flex items-center gap-1", labelCls, !active && "opacity-70")}>
                {MESES_ABREV[m.m]}/{String(m.y).slice(2)}
                {isToday && (
                  <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", neg ? "bg-negative" : pos ? "bg-positive" : "bg-primary")} />
                )}
              </div>
              <div className={cn("font-mono font-bold text-xs tabular-nums truncate", labelCls)}>
                {f(saldoFim)}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        aria-label="Próximo mês"
        className="h-9 w-9 rounded-xl border border-border bg-card grid place-items-center shrink-0 active:scale-95 transition-transform hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Visão completa do mês (sparkline + grid mobile + tabela desktop) ─── */
export function FluxoMonthView({ mm, today, onCommit, loading }: {
  mm?: MesData;
  today: Date;
  onCommit: CommitFn;
  loading?: boolean;
}) {
  return (
    <>
      {mm && <MiniChart dias={mm.dias} />}
      <div className="lg:hidden">
        {mm && <DayFocus mm={mm} today={today} onCommit={onCommit} />}
      </div>
      <div className="hidden lg:block">
        {loading ? (
          <div className="card p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-10 w-full rounded-md" />)}
          </div>
        ) : mm ? (
          <MonthTable mm={mm} today={today} onCommit={onCommit} />
        ) : null}
      </div>
    </>
  );
}

/* Mini balance sparkline */
function MiniChart({ dias }: { dias: DiaFluxo[] }) {
  if (!dias || dias.length === 0) return null;
  const maxVal = Math.max(1, ...dias.map((d: any) => Math.abs(d.saldo)));
  const finalSaldo = dias[dias.length - 1]?.saldo ?? 0;
  const chartTone = finalSaldo < 0 ? "negative" : finalSaldo > 0 ? "positive" : "muted";
  const pts = dias.map((d: any, i: number) => ({
    x: (i / Math.max(1, dias.length - 1)) * 100,
    y: 28 - ((d.saldo / maxVal) * 24),
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const fill = d + ` L${pts[pts.length - 1].x},28 L0,28 Z`;
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <span className="eyebrow">Saldo diário</span>
      <svg viewBox="0 0 100 28" className="w-full h-8 mt-1" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fluxo-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#fluxo-fill)" className={chartTone === "negative" ? "text-negative" : chartTone === "positive" ? "text-positive" : "text-muted"} />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={chartTone === "negative" ? "text-negative" : chartTone === "positive" ? "text-positive" : "text-muted"} />
      </svg>
    </div>
  );
}

/* Mobile — spreadsheet-like day grid */
function DayFocus({ mm, today, onCommit }: { mm: MesData; today: Date; onCommit: CommitFn }) {
  const isCurrentMonth = mm.y === today.getFullYear() && mm.m === today.getMonth();
  const [sel, setSel] = useState<number>(isCurrentMonth ? today.getDate() : 1);
  const listRef = useRef<HTMLDivElement>(null);
  const f = useBrl();

  useEffect(() => {
    setSel(isCurrentMonth ? today.getDate() : 1);
  }, [mm.y, mm.m]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row="${sel}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);

  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
  const diasNeg = mm.dias.filter((d: any) => d.saldo < 0).length;

  return (
    <div className="space-y-2">
      {/* Day chip scroller */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        {mm.dias.map((d: any) => {
          const active = d.dia === sel;
          const dToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
          const wk = WD[new Date(mm.y, mm.m, d.dia).getDay()][0];
          return (
            <button
              key={d.dia}
              onClick={() => setSel(d.dia)}
              className={cn(
                "shrink-0 w-12 h-16 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md z-10"
                  : dToday
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : d.saldo < 0
                      ? "border-negative/30 bg-negative-soft text-negative"
                      : "border-border bg-card",
              )}
            >
              <span className="eyebrow">{wk}</span>
              <span className="text-lg font-black leading-none tabular-nums">{d.dia}</span>
            </button>
          );
        })}
      </div>

      {/* Spreadsheet-like day grid */}
      <div ref={listRef} className="rounded-xl bg-card border border-border divide-y divide-border max-h-[520px] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-muted/95 backdrop-blur flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="w-10 shrink-0">Dia</span>
          <span className="flex-1 text-center text-positive">Ent. Fixa</span>
          <span className="flex-1 text-center text-positive">Ent. Extra</span>
          <span className="flex-1 text-center text-negative">Saí. Extra</span>
          <span className="w-20 text-right shrink-0">Saldo</span>
        </div>

        {mm.dias.map((d: any) => {
          const isSel = d.dia === sel;
          const dToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
          const wd = WD_SHORT[new Date(mm.y, mm.m, d.dia).getDay()];
          return (
            <div
              key={d.dia}
              data-row={d.dia}
              onClick={() => setSel(d.dia)}
              className={cn(
                "flex items-center gap-1 px-3 py-2.5 transition-colors active:bg-muted/50",
                isSel && "bg-primary/[0.04] ring-1 ring-primary/20 ring-inset",
                dToday && !isSel && "bg-primary/[0.02]",
              )}
            >
              {/* Day */}
              <div className="w-10 shrink-0">
                <div className={cn("text-sm font-bold leading-tight", isSel ? "text-primary" : "")}>{d.dia}</div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{wd}</div>
              </div>

              {/* Editable cells */}
              <div className="flex-1 grid grid-cols-3 gap-1">
                <CellSm value={d.entradaFixa} onCommit={(v: number) => onCommit(d.data, "entrada_fixa", v, d.entradaFixa)} tone="in" />
                <CellSm value={d.entradaDiaria} onCommit={(v: number) => onCommit(d.data, "entrada_diaria", v, d.entradaDiaria)} tone="in" />
                <CellSm value={d.saidaDiaria} onCommit={(v: number) => onCommit(d.data, "saida_diaria", v, d.saidaDiaria)} tone="out" />
              </div>

              {/* Balance */}
              <div className={cn("w-20 text-right font-bold tabular-nums text-sm shrink-0", d.saldo < 0 ? "text-negative" : "text-positive")}>
                {f(d.saldo)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat icon={TrendingUp} label="Fim do mês" value={f(saldoFim)} tone={saldoFim < 0 ? "neg" : "pos"} />
        <MiniStat icon={TrendingDown} label="Dias neg." value={String(diasNeg)} tone={diasNeg > 0 ? "neg" : "pos"} />
        <MiniStat icon={DollarSign} label="Pior dia" value={f(Math.min(...mm.dias.map((d: any) => d.saldo)))} tone="neg" />
      </div>
    </div>
  );
}

/* Small inline editable cell for mobile grid */
function CellSm({ value, onCommit, tone }: { value: number; onCommit: (v: number) => void; tone: "in" | "out" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const committed = useRef(false);
  const { hidden } = usePrivacy();

  function open(e: React.MouseEvent) {
    e.stopPropagation();
    committed.current = false;
    setDraft(value ? String(value).replace(".", ",") : "");
    setEditing(true);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select();
    });
  }

  function commit() {
    if (committed.current) return;
    committed.current = true;
    const n = num(draft);
    setEditing(false);
    if (n !== value) onCommit(n);
  }

  function cancel() {
    committed.current = true;
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { cancel(); }
        }}
        inputMode="decimal"
        autoComplete="off"
        className="w-full h-8 px-1.5 rounded-md bg-primary/10 border-2 border-primary text-right tabular-nums font-mono text-[16px] font-semibold outline-none touch-manipulation"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "w-full h-8 px-1.5 rounded-md text-right tabular-nums text-sm font-semibold",
        "hover:bg-primary/5 active:bg-primary/10 touch-manipulation",
        tone === "in" ? "text-positive" : "text-negative",
        value === 0 ? "opacity-40" : "",
      )}
    >
      {hidden ? DOTS : value ? (
        value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ) : (
        <span className="text-muted-foreground/30">—</span>
      )}
    </button>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "pos" | "neg" }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-center gap-1.5 eyebrow mb-1">
        {Icon && <Icon className={cn("h-3 w-3", tone === "neg" ? "text-negative" : "text-positive")} />}
        {label}
      </div>
      <div className={cn("font-mono font-bold text-xs tabular-nums truncate", tone === "neg" ? "text-negative" : "text-positive")}>
        {value}
      </div>
    </div>
  );
}

/* Desktop table */
function MonthTable({ mm, today, onCommit }: { mm: MesData; today: Date; onCommit: CommitFn }) {
  const todayRef = useRef<HTMLTableRowElement>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const f = useBrl();

  if (!mm?.dias) return null;

  const totalEF = mm.dias.reduce((a: number, d: any) => a + d.entradaFixa, 0);
  const totalED = mm.dias.reduce((a: number, d: any) => a + d.entradaDiaria, 0);
  const totalSF = mm.dias.reduce((a: number, d: any) => a + d.saidaFixa, 0);
  const totalSD = mm.dias.reduce((a: number, d: any) => a + d.saidaDiaria, 0);
  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;
  const saldos = mm.dias.map((d: any) => d.saldo as number);
  const heatMin = Math.min(0, ...saldos);
  const heatMax = Math.max(0, ...saldos);

  useEffect(() => { todayRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [mm.y, mm.m]);

  return (
    <div className="rounded-xl bg-card border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="bg-muted">
            <th className="eyebrow text-left px-4 py-3 w-14">Dia</th>
            <th className="eyebrow text-right px-4 py-3">Ent. Fixa</th>
            <th className="eyebrow text-right px-4 py-3">Ent. Extra</th>
            <th className="eyebrow text-right px-4 py-3">Saí. Fixa</th>
            <th className="eyebrow text-right px-4 py-3">Saí. Extra</th>
            <th className="eyebrow text-right px-4 py-3">Saldo</th>
            <th className="w-10 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {mm.dias.map((d: any, i: number) => {
            const isToday = isoDate(mm.y, mm.m, d.dia) === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
            const wd = WD_SHORT[new Date(mm.y, mm.m, d.dia).getDay()];
            const isWk = [0, 6].includes(new Date(mm.y, mm.m, d.dia).getDay());
            const heat = saldoHeat(d.saldo, heatMin, heatMax);
            return (
              <tr
                key={d.dia}
                ref={isToday ? todayRef : undefined}
                className={cn(
                  "border-t border-border/60 transition-colors hover:bg-primary/[0.02]",
                  isToday && "ring-1 ring-primary/30 ring-inset",
                )}
                style={isToday ? { scrollMarginTop: 120, background: "color-mix(in oklab, var(--color-primary) 6%, transparent)" } : undefined}
              >
                <td className="px-4 py-2.5 align-top">
                  <div className={cn("text-base font-bold leading-none", isToday && "text-primary", isWk && !isToday && "text-muted-foreground")}>
                    {d.dia}
                  </div>
                  <div className="eyebrow mt-0.5">{wd}</div>
                </td>
                <td className="px-0 py-2.5">
                  <div className="bg-positive-soft/50 rounded-l-md overflow-hidden">
                    <SheetCell value={d.entradaFixa} onCommit={(v) => onCommit(d.data, "entrada_fixa", v, d.entradaFixa)} className="text-right font-semibold" />
                  </div>
                </td>
                <td className="px-0 py-2.5">
                  <div className="bg-positive-soft/50 overflow-hidden">
                    <SheetCell value={d.entradaDiaria} onCommit={(v) => onCommit(d.data, "entrada_diaria", v, d.entradaDiaria)} className="text-right font-semibold" />
                  </div>
                </td>
                <td className="px-0 py-2.5">
                  <div className="bg-negative-soft/50 overflow-hidden">
                    <SheetCell value={d.saidaFixa} onCommit={() => {}} readOnly className="text-right font-semibold" />
                  </div>
                </td>
                <td className="px-0 py-2.5">
                  <div className="bg-negative-soft/50 rounded-r-md overflow-hidden">
                    <SheetCell value={d.saidaDiaria} onCommit={(v) => onCommit(d.data, "saida_diaria", v, d.saidaDiaria)} className="text-right font-semibold" />
                  </div>
                </td>
                <td
                  className="px-4 py-2.5 text-right font-bold tabular-nums"
                  style={{ background: heat.background, color: heat.color }}
                >
                  {f(d.saldo)}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={() => setExpanded(ex => ex === d.dia ? null : d.dia)}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded === d.dia && "rotate-90")} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted font-bold">
            <td className="px-4 py-3 text-xs uppercase tracking-wider">Total</td>
            <td className="px-4 py-3 text-right tabular-nums text-positive">{f(totalEF)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-positive">{f(totalED)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-negative">{f(totalSF)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-negative">{f(totalSD)}</td>
            <td className={cn("px-4 py-3 text-right tabular-nums", saldoFim < 0 ? "text-negative" : "text-positive")}>{f(saldoFim)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
