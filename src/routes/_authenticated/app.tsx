import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { selectAll } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { computaMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { MESES, MESES_ABREV, brl, isoDate } from "@/lib/format";
import { Money } from "@/components/Money";
import { useEffect } from "react";
import { useSounds } from "@/hooks/useSounds";
import {
  Plus, ArrowRight, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, CalendarDays, Receipt,
  CreditCard, Sparkles, PiggyBank,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Hoje — planilhafuturo" }] }),
  component: HojePage,
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

function HojePage() {
  const { playSound } = useSounds();
  const today = new Date();
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const dToday = today.getDate();

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

  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);
  const nome = (profile.data?.nome ?? "").split(" ")[0] || "você";

  // 6 meses de projeção
  const seis = useMemo(() => {
    const g = (gastos.data ?? []) as GastoFixo[];
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    let carry = saldoInicial;
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(y, m0 + i, 1);
      const yy = d.getFullYear(); const mm = d.getMonth();
      const dias = computaMes(yy, mm, carry, g, p, lanc);
      carry = dias.length ? dias[dias.length - 1].saldo : carry;
      return { y: yy, m: mm, dias, saldoFim: carry };
    });
  }, [gastos.data, parcelas.data, lanc, saldoInicial, y, m0]);

  const mesAtual = seis[0];
  const diaHoje = mesAtual?.dias.find((d) => d.dia === dToday) ?? mesAtual?.dias[0];
  const saldoHoje = diaHoje?.saldo ?? saldoInicial;
  const saldoFimMes = mesAtual?.saldoFim ?? saldoInicial;

  const totalEntradasMes = mesAtual?.dias.reduce((a, d) => a + d.entradaFixa + d.entradaDiaria, 0) ?? 0;
  const totalSaidasMes = mesAtual?.dias.reduce((a, d) => a + d.saidaFixa + d.saidaDiaria, 0) ?? 0;

  const primeiroNegativo = seis.find((mm) => mm.saldoFim < 0);
  const ultimoPositivo = [...seis].reverse().find((mm) => mm.saldoFim >= 0);

  // quick add estado
  const [qaOpen, setQaOpen] = useState<null | "in" | "out">(null);
  const [qaValor, setQaValor] = useState("");

  function commitQuick() {
    const n = Number(qaValor.replace(/\./g, "").replace(",", ".")) || 0;
    if (n <= 0 || !diaHoje) { setQaOpen(null); setQaValor(""); return; }
    const tipo = qaOpen === "in" ? "entrada_diaria" : "saida_diaria";
    const atual = qaOpen === "in" ? diaHoje.entradaDiaria : diaHoje.saidaDiaria;
    upsert(diaHoje.data, tipo, atual + n);
    playSound(qaOpen === "in" ? "kaching" : "pop");
    setQaOpen(null); setQaValor("");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-6 space-y-4 lg:pt-8 lg:px-6 lg:space-y-6">
      {/* Saudação */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Olá, {nome}</p>
          <h1 className="font-display text-3xl lg:text-4xl leading-[1.05] tracking-tight truncate">
            <span className="italic text-muted-foreground">hoje é</span>{" "}
            {today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </h1>
        </div>
      </div>

      {/* HERO — saldo atual */}
      <section className="hope-card p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-foreground/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        <div className="relative">
          <div className="eyebrow">Saldo hoje</div>
          <div className={`font-mono text-[42px] lg:text-6xl font-semibold tracking-tight leading-none mt-2 tabular-nums ${saldoHoje < 0 ? "text-negative" : "text-foreground"}`}>
            <Money value={saldoHoje} />
          </div>
          <div className="mt-4 flex items-center gap-2 text-[12px]">
            <span className={`inline-flex items-center gap-1 font-mono font-semibold ${saldoFimMes < 0 ? "text-negative" : "text-positive"}`}>
              {saldoFimMes < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
              <Money value={saldoFimMes} />
            </span>
            <span className="text-muted-foreground">previsto fim de {MESES[m0].toLowerCase()}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 grid grid-cols-2 gap-2 relative">
          <button
            onClick={() => setQaOpen("in")}
            className="h-12 rounded-xl bg-foreground text-background font-semibold text-[13px] tracking-tight flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Plus className="h-4 w-4" /> Entrada
          </button>
          <button
            onClick={() => setQaOpen("out")}
            className="h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-[13px] tracking-tight flex items-center justify-center gap-2 hover:bg-muted active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" /> Saída
          </button>
        </div>
      </section>

      {/* Alertas */}
      {primeiroNegativo && (
        <Link to="/fluxo" className="hope-card p-4 flex items-center gap-3 border-l-4 !border-l-warning">
          <div className="h-10 w-10 rounded-xl bg-warning-soft grid place-items-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">Fica no vermelho em {MESES_ABREV[primeiroNegativo.m]}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              Saldo previsto: <Money value={primeiroNegativo.saldoFim} className="text-negative font-semibold" />
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      )}
      {!primeiroNegativo && ultimoPositivo && (
        <div className="hope-card p-4 flex items-center gap-3 border-l-4 !border-l-positive">
          <div className="h-10 w-10 rounded-xl bg-positive-soft grid place-items-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-positive" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">Fluxo saudável nos próximos 6 meses</div>
            <div className="text-[11px] text-muted-foreground truncate">Continua positivo até {MESES[ultimoPositivo.m]}.</div>
          </div>
        </div>
      )}

      {/* Movimento do mês */}
      <section className="hope-card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="eyebrow">Movimento</div>
            <h3 className="font-display text-base font-semibold mt-0.5">{MESES[m0]}</h3>
          </div>
          <Link to="/fluxo" className="text-[12px] font-semibold text-primary inline-flex items-center gap-1">
            Ver fluxo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-positive-soft p-3">
            <div className="flex items-center gap-1.5 text-positive text-[11px] font-semibold">
              <TrendingUp className="h-3.5 w-3.5" /> Entradas
            </div>
            <div className="mt-1 font-display text-lg font-bold text-positive tabular-nums truncate">
              <Money value={totalEntradasMes} />
            </div>
          </div>
          <div className="rounded-xl bg-negative-soft p-3">
            <div className="flex items-center gap-1.5 text-negative text-[11px] font-semibold">
              <TrendingDown className="h-3.5 w-3.5" /> Saídas
            </div>
            <div className="mt-1 font-display text-lg font-bold text-negative tabular-nums truncate">
              <Money value={totalSaidasMes} />
            </div>
          </div>
        </div>
      </section>

      {/* 6 meses strip */}
      <section className="hope-card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="eyebrow">Projeção</div>
            <h3 className="font-display text-base font-semibold mt-0.5">Próximos 6 meses</h3>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5 items-end h-28">
          {seis.map((mm, i) => {
            const maxAbs = Math.max(1, ...seis.map((s) => Math.abs(s.saldoFim)));
            const h = Math.max(6, (Math.abs(mm.saldoFim) / maxAbs) * 100);
            const pos = mm.saldoFim >= 0;
            return (
              <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                <div className={`w-full rounded-t-md ${pos ? "bg-primary" : "bg-negative"} transition-all`} style={{ height: `${h}%` }} />
                <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {MESES_ABREV[mm.m]}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
          <span>Hoje</span>
          <span>+6 meses</span>
        </div>
      </section>

      {/* Atalhos */}
      <section className="grid grid-cols-2 gap-2">
        <ShortLink to="/gastos"        icon={Receipt}    label="Gastos fixos" />
        <ShortLink to="/parcelas"      icon={CreditCard} label="Parcelas" />
        <ShortLink to="/desejos"       icon={Sparkles}   label="Desejos" />
        <ShortLink to="/investimentos" icon={PiggyBank}  label="Investimentos" />
      </section>

      {/* Quick-add modal */}
      {qaOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" onClick={() => { setQaOpen(null); setQaValor(""); }}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-2xl border border-border p-5 space-y-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid place-items-center">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />
            </div>
            <div>
              <div className="eyebrow">{qaOpen === "in" ? "Nova entrada" : "Nova saída"}</div>
              <h3 className="font-display text-lg font-bold mt-0.5">
                Hoje, {dToday} de {MESES[m0].toLowerCase()}
              </h3>
            </div>
            <div className={`flex items-center gap-2 h-16 px-4 rounded-2xl border-2 ${qaOpen === "in" ? "border-positive bg-positive-soft" : "border-negative bg-negative-soft"}`}>
              <span className={`text-lg font-mono font-bold ${qaOpen === "in" ? "text-positive" : "text-negative"}`}>R$</span>
              <input
                autoFocus
                inputMode="decimal"
                value={qaValor}
                onChange={(e) => setQaValor(e.target.value.replace(/[^\d.,]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && commitQuick()}
                placeholder="0,00"
                className={`flex-1 bg-transparent outline-none text-2xl font-mono font-bold tabular-nums ${qaOpen === "in" ? "text-positive" : "text-negative"}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setQaOpen(null); setQaValor(""); }} className="h-12 rounded-xl border border-border text-sm font-semibold">
                Cancelar
              </button>
              <button
                onClick={commitQuick}
                className={`h-12 rounded-xl text-white font-bold ${qaOpen === "in" ? "bg-positive" : "bg-negative"}`}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShortLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="hope-card p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
      <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold truncate">{label}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
