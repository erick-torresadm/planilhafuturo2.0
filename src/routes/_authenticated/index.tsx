import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { MESES_ABREV, brl } from "@/lib/format";
import { computaMes, totalGastoFixoMensal, parcelasNoMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { useMemo } from "react";
import { Money } from "@/components/Money";
import { ArrowRight, TrendingUp, Wallet, PiggyBank, Target, Sparkles, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — Planilha" }] }),
  component: DashboardPage,
});

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (!values.length) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const w = 100, h = 32;
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const last = values[values.length - 1];
  const positive = last >= 0;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? "oklch(0.82 0.19 165)" : "oklch(0.72 0.2 22)"} stopOpacity="0.35" />
          <stop offset="100%" stopColor={positive ? "oklch(0.82 0.19 165)" : "oklch(0.72 0.2 22)"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="url(#spark)" stroke="none" />
      <polyline points={pts} fill="none" stroke={positive ? "oklch(0.82 0.19 165)" : "oklch(0.72 0.2 22)"} strokeWidth="1.5" />
    </svg>
  );
}

function DashboardPage() {
  const nav = useNavigate();
  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
    return data;
  }});
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const lanc = useQuery({ queryKey: ["lancamentos"], queryFn: () => selectAll("lancamentos") });
  const invest = useQuery({ queryKey: ["investimentos"], queryFn: () => selectAll("investimentos") });
  const caixinhas = useQuery({ queryKey: ["caixinhas"], queryFn: () => selectAll("caixinhas") });

  const ano = new Date().getFullYear();
  const hojeM = new Date().getMonth();
  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);

  const dadosAno = useMemo(() => {
    const g = (gastos.data ?? []) as GastoFixo[];
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    const l = (lanc.data ?? []) as unknown as Lancamento[];
    let carry = saldoInicial;
    return Array.from({ length: 12 }, (_, m) => {
      const dias = computaMes(ano, m, carry, g, p, l);
      const entradas = dias.reduce((a, d) => a + d.entradaFixa + d.entradaDiaria, 0);
      const saidas = dias.reduce((a, d) => a + d.saidaFixa + d.saidaDiaria, 0);
      const liq = entradas - saidas;
      const fim = dias.length ? dias[dias.length - 1].saldo : carry;
      carry = fim;
      return { m, entradas, saidas, liq, saldoAcum: fim };
    });
  }, [gastos.data, parcelas.data, lanc.data, saldoInicial, ano]);

  const totalInvest = ((invest.data ?? []) as any[]).reduce((a, i) => a + Number(i.posicao_atual ?? 0), 0);
  const totalCaixinhas = ((caixinhas.data ?? []) as any[]).reduce((a, c) => a + Number(c.atual ?? 0), 0);
  const contaCorrente = dadosAno[hojeM]?.saldoAcum ?? 0;
  const patrimonio = contaCorrente + totalInvest + totalCaixinhas;

  const gastosAnuais = (gastos.data ?? []) as GastoFixo[];
  const totalMensalFixo = totalGastoFixoMensal(gastosAnuais);
  const reservaRec = totalMensalFixo * Number(profile.data?.meses_reserva_emergencia ?? 6);
  const reservaAtual = Math.max(0, contaCorrente);
  const reservaPct = reservaRec > 0 ? Math.min(100, (reservaAtual / reservaRec) * 100) : 0;

  const fluxo6 = useMemo(() => {
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    const renda = Number(profile.data?.renda_mensal ?? 0);
    let carry = contaCorrente;
    return Array.from({ length: 6 }, (_, i) => {
      const mm = (hojeM + i) % 12;
      const yy = ano + Math.floor((hojeM + i) / 12);
      const parcMes = parcelasNoMes(p, yy, mm);
      const sobra = renda - totalMensalFixo - parcMes;
      carry += sobra;
      return { m: mm, entrada: renda, fixos: totalMensalFixo, parc: parcMes, sobra, acum: carry, status: sobra >= 0 };
    });
  }, [parcelas.data, profile.data, totalMensalFixo, hojeM, ano, contaCorrente]);

  const sparkValues = dadosAno.slice(hojeM, hojeM + 6).map((d) => d.saldoAcum);
  const sobraMes = fluxo6[0]?.sobra ?? 0;
  const nome = profile.data?.nome?.split(" ")[0] ?? "";

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="fade-up">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold mt-1">
          Olá{nome ? `, ${nome}` : ""} <span className="text-primary">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">Sua vida financeira em {ano}</p>
      </div>

      {/* Hero Patrimônio */}
      <div className="glass-strong p-5 lg:p-6 relative overflow-hidden fade-up">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3 w-3" /> Patrimônio total
          </div>
          <div className="mt-2 flex items-end gap-3 flex-wrap">
            <div className="font-display text-4xl lg:text-5xl font-bold">
              <Money value={patrimonio} />
            </div>
            <div className="chip bg-positive-soft text-positive mb-2">
              <TrendingUp className="h-3 w-3" /> +<Money value={sobraMes} /> este mês
            </div>
          </div>
          <div className="mt-4 h-10">
            <Sparkline values={sparkValues} className="w-full h-full" />
          </div>
          <div className="mt-3 flex gap-1 text-[10px] text-muted-foreground">
            {sparkValues.map((_, i) => <span key={i} className="flex-1 text-center">{MESES_ABREV[(hojeM + i) % 12]}</span>)}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fade-up">
        <StatCard label="Em conta" icon={Wallet} value={contaCorrente} accent="mint" />
        <StatCard label="Investimentos" icon={TrendingUp} value={totalInvest} accent="mint" />
        <StatCard label="Caixinhas" icon={PiggyBank} value={totalCaixinhas} accent="warn" />
        <StatCard label="Fixos/mês" icon={Target} value={totalMensalFixo} accent="neg" />
      </div>

      {/* Reserva de emergência */}
      <div className="glass p-5 fade-up">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Reserva de emergência</div>
            <div className="font-display text-lg font-semibold mt-0.5">
              <Money value={reservaAtual} /> <span className="text-muted-foreground text-sm">de <Money value={reservaRec} /></span>
            </div>
          </div>
          <div className="chip mint-gradient">{reservaPct.toFixed(0)}%</div>
        </div>
        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full mint-gradient transition-all duration-700" style={{ width: `${reservaPct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Meta: {profile.data?.meses_reserva_emergencia ?? 6} meses dos seus gastos fixos.
        </div>
      </div>

      {/* Próximos 6 meses */}
      <div className="fade-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Próximos 6 meses
          </h2>
          <Link to="/fluxo" className="text-xs text-primary flex items-center gap-1 font-semibold hover:underline">
            Fluxo diário <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Mobile: cards */}
        <div className="grid gap-2 lg:hidden">
          {fluxo6.map((f, i) => (
            <button key={i} onClick={() => nav({ to: "/fluxo" })}
              className="glass p-4 text-left tap-target hover:mint-glow transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{MESES_ABREV[f.m]}</div>
                  <div className="font-display text-xl font-bold mt-0.5"><Money value={f.acum} signed /></div>
                </div>
                <div className="text-right">
                  <div className={`chip ${f.status ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}>
                    {f.status ? "+" : ""}<Money value={f.sobra} /> sobra
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    +{brl(f.entrada)} · −{brl(f.fixos + f.parc)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden lg:block glass overflow-hidden">
          <table className="sheet-grid">
            <thead>
              <tr>
                <th className="sheet-th">Mês</th>
                <th className="sheet-th text-right">Entrada</th>
                <th className="sheet-th text-right">Fixos</th>
                <th className="sheet-th text-right">Parcelas</th>
                <th className="sheet-th text-right">Sobra</th>
                <th className="sheet-th text-right">Acum.</th>
                <th className="sheet-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {fluxo6.map((f, i) => (
                <tr key={i} className={i % 2 ? "sheet-row-alt" : ""}>
                  <td className="sheet-td font-semibold">{MESES_ABREV[f.m]}</td>
                  <td className="sheet-td text-right"><Money value={f.entrada} /></td>
                  <td className="sheet-td text-right text-negative">−<Money value={f.fixos} /></td>
                  <td className="sheet-td text-right text-negative">−<Money value={f.parc} /></td>
                  <td className="sheet-td text-right"><Money value={f.sobra} signed showSign /></td>
                  <td className="sheet-td text-right font-bold"><Money value={f.acum} signed /></td>
                  <td className="sheet-td text-center">
                    <span className={`chip ${f.status ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}>
                      {f.status ? "Positivo" : "Negativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fade-up">
        <QuickAction to="/fluxo" label="Fluxo diário" icon={CalendarDays} />
        <QuickAction to="/gastos" label="Gastos fixos" icon={Target} />
        <QuickAction to="/desejos" label="Desejos" icon={Sparkles} />
        <QuickAction to="/investimentos" label="Investir" icon={TrendingUp} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent: "mint" | "warn" | "neg" }) {
  const c = accent === "mint" ? "text-primary" : accent === "warn" ? "text-warning" : "text-negative";
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className={`h-3 w-3 ${c}`} /> {label}
      </div>
      <div className="font-display text-lg lg:text-xl font-bold mt-1 truncate"><Money value={value} compact /></div>
    </div>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <Link to={to} className="glass p-4 flex items-center gap-3 hover:mint-glow transition-all tap-target">
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold truncate">{label}</div>
    </Link>
  );
}
