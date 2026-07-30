import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll, getProfile } from "@/lib/db";
import { MESES, MESES_ABREV, isoDate, brl } from "@/lib/format";
import { computaMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { useLancamentosLocal } from "@/hooks/useLancamentosLocal";
import { SheetCell } from "@/components/SheetCell";
import { Money } from "@/components/Money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo Diário — planilhafuturo" }] }),
  component: FluxoPage,
});

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WD_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

function FluxoPage() {
  const { playSound } = useSounds();
  const today = new Date();
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [monthOffset, setMonthOffset] = useState(0);

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
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

  const loading = profile.isPending || gastos.isPending || parcelas.isPending;
  const mm = mesesData[monthOffset];

  return (
    <div className="page-container space-y-3 animate-in">
      {/* Month scroller */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { const d = new Date(anchor.y, anchor.m - 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); setMonthOffset(0); }}
          className="h-9 w-9 rounded-xl border border-border bg-card grid place-items-center shrink-0 active:scale-95 transition-transform"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {loading ? (
            <div className="flex gap-1">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="skeleton h-14 w-24 shrink-0 snap-start rounded-xl" />
              ))}
            </div>
          ) : (
            mesesData.map((m, i) => {
              const active = i === monthOffset;
              const isToday = m.y === today.getFullYear() && m.m === today.getMonth();
              const saldoFim = m.dias.length ? m.dias[m.dias.length - 1].saldo : 0;
              return (
                <button
                  key={i}
                  onClick={() => setMonthOffset(i)}
                  className={cn(
                    "snap-start shrink-0 px-2.5 sm:px-3.5 py-2 rounded-xl border transition-all min-w-[68px] sm:min-w-[100px] text-left",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : saldoFim < 0
                        ? "border-negative/30 bg-negative-soft/50 text-negative"
                        : saldoFim > 0
                          ? "border-positive/30 bg-positive-soft/50 text-positive"
                          : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <div className={cn("text-xs uppercase tracking-widest font-semibold", active ? "opacity-80" : "opacity-70")}>
                    {MESES_ABREV[m.m]}/{String(m.y).slice(2)}
                    {isToday && !active && <span className="ml-1 text-primary">•</span>}
                  </div>
                  <div className={cn("font-mono font-bold text-xs tabular-nums truncate", !active && saldoFim < 0 && "text-negative", !active && saldoFim > 0 && "text-positive")}>{brl(saldoFim)}</div>
                </button>
              );
            })
          )}
        </div>
        <button
          onClick={() => { const d = new Date(anchor.y, anchor.m + 1, 1); setAnchor({ y: d.getFullYear(), m: d.getMonth() }); setMonthOffset(0); }}
          className="h-9 w-9 rounded-xl border border-border bg-card grid place-items-center shrink-0 active:scale-95 transition-transform"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Mini sparkline + header */}
      {mm && <MiniChart dias={mm.dias} />}

      {/* Mobile */}
      <div className="lg:hidden">
        <DayFocus mm={mm} today={today} onCommit={commit} onHoje={() => { setAnchor({ y: today.getFullYear(), m: today.getMonth() }); setMonthOffset(0); }} />
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        {loading ? (
          <div className="card p-4 space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-10 w-full rounded-md" />)}
          </div>
        ) : (
          <MonthTable mm={mm} today={today} onCommit={commit} />
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2">
        Saldo base: <span className="font-semibold text-foreground">{brl(saldoInicial)}</span> · ajuste em Configurações
      </div>
    </div>
  );
}

/* Mini balance sparkline */
function MiniChart({ dias }: { dias: any[] }) {
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

/* Mobile day focus */
function DayFocus({ mm, today, onCommit, onHoje }: any) {
  if (!mm?.dias) return null;
  const isCurrentMonth = mm.y === today.getFullYear() && mm.m === today.getMonth();
  const [sel, setSel] = useState<number>(isCurrentMonth ? today.getDate() : 1);
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSel(isCurrentMonth ? today.getDate() : 1);
  }, [mm.y, mm.m]);

  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>(`[data-d="${sel}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [sel]);

  const day = mm.dias.find((d: any) => d.dia === sel) ?? mm.dias[0];
  if (!day) return null;

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
              className={cn(
                "shrink-0 w-12 h-16 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md"
                  : dToday
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : neg
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

      {/* Day card */}
      <div className={cn("rounded-xl bg-card border border-border overflow-hidden", isTd && "ring-2 ring-primary")}>
        <div className={cn("px-4 py-3 flex items-center justify-between border-b border-border", isTd && "bg-primary/[0.04]")}>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={cn("text-3xl font-black tabular-nums", isTd && "text-primary")}>{day.dia}</span>
            <span className="text-sm font-semibold text-muted-foreground truncate">
              {dt.toLocaleDateString("pt-BR", { weekday: "long" })}
            </span>
            {isTd && <span className="chip bg-primary text-primary-foreground">HOJE</span>}
          </div>
          <div className="text-right shrink-0">
            <span className="eyebrow">Saldo</span>
            <div className={cn("font-mono text-lg font-black tabular-nums", day.saldo < 0 ? "text-negative" : "text-positive")}>
              {brl(day.saldo)}
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {linhas.map((l) => (
            <div key={l.key} className="flex items-center gap-3 px-4 py-3.5">
              <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", l.tone === "in" ? "bg-positive" : "bg-negative")} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{l.label}</div>
                <div className="text-xs text-muted-foreground truncate">{l.hint}</div>
              </div>
              <div className={cn(
                "shrink-0 w-32 h-11 rounded-lg border-2 overflow-hidden",
                l.tone === "in" ? "border-positive/25 bg-positive-soft/40" : "border-negative/25 bg-negative-soft/40",
              )}>
                <SheetCell
                  value={l.value}
                  onCommit={(v) => l.tipo && onCommit(day.data, l.tipo, v, l.value)}
                  readOnly={l.readOnly}
                  className="h-full font-bold text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 border-t border-border">
          <button
            disabled={sel <= 1}
            onClick={() => setSel((d) => Math.max(1, d - 1))}
            className="h-11 flex items-center justify-center gap-1 text-sm font-semibold disabled:opacity-30 active:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <button
            onClick={() => { if (!isCurrentMonth) onHoje(); setSel(today.getDate()); }}
            className="h-11 flex items-center justify-center gap-1 text-sm font-bold text-primary border-x border-border active:bg-primary/10"
          >
            <Calendar className="h-4 w-4" /> Hoje
          </button>
          <button
            disabled={sel >= mm.dias.length}
            onClick={() => setSel((d) => Math.min(mm.dias.length, d + 1))}
            className="h-11 flex items-center justify-center gap-1 text-sm font-semibold disabled:opacity-30 active:bg-muted"
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat icon={TrendingUp} label="Fim do mês" value={brl(saldoFim)} tone={saldoFim < 0 ? "neg" : "pos"} />
        <MiniStat icon={TrendingDown} label="Dias neg." value={String(diasNeg)} tone={diasNeg > 0 ? "neg" : "pos"} />
        <MiniStat icon={DollarSign} label="Pior dia" value={brl(Math.min(...mm.dias.map((d: any) => d.saldo)))} tone="neg" />
      </div>
    </div>
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
function MonthTable({ mm, today, onCommit }: any) {
  const todayRef = useRef<HTMLTableRowElement>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!mm?.dias) return null;

  const totalEF = mm.dias.reduce((a: number, d: any) => a + d.entradaFixa, 0);
  const totalED = mm.dias.reduce((a: number, d: any) => a + d.entradaDiaria, 0);
  const totalSF = mm.dias.reduce((a: number, d: any) => a + d.saidaFixa, 0);
  const totalSD = mm.dias.reduce((a: number, d: any) => a + d.saidaDiaria, 0);
  const saldoFim = mm.dias.length ? mm.dias[mm.dias.length - 1].saldo : 0;

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
            return (
              <tr
                key={d.dia}
                ref={isToday ? todayRef : undefined}
                className={cn(
                  "border-t border-border/60 transition-colors hover:bg-primary/[0.02]",
                  isToday ? "bg-primary/[0.04] ring-1 ring-primary/30 ring-inset" : d.saldo < 0 ? "bg-negative-soft/30" : "",
                )}
                style={isToday ? { scrollMarginTop: 120 } : undefined}
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
                <td className={cn("px-4 py-2.5 text-right font-bold tabular-nums", d.saldo < 0 ? "text-negative" : "text-positive")}>
                  {brl(d.saldo)}
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
            <td className="px-4 py-3 text-right tabular-nums text-positive">{brl(totalEF)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-positive">{brl(totalED)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-negative">{brl(totalSF)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-negative">{brl(totalSD)}</td>
            <td className={cn("px-4 py-3 text-right tabular-nums", saldoFim < 0 ? "text-negative" : "text-positive")}>{brl(saldoFim)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
