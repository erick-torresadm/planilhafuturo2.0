import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Money } from "@/components/Money";
import { MESES_ABREV, brl } from "@/lib/format";
import {
  DEMO_PROFILE, DEMO_GASTOS, DEMO_PARCELAS,
  totaisPorPilar,
} from "@/lib/demoData";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Planilha — Visão do mês" },
      { name: "description", content: "Seu mês em um olhar: renda, compromissos e sobra." },
    ],
  }),
  component: DashboardPage,
});

function parcelasNoMesRef(y: number, m0: number) {
  let s = 0;
  for (const p of DEMO_PARCELAS) {
    const dt = new Date(p.data + "T00:00:00");
    const monthsAhead = (y - dt.getFullYear()) * 12 + (m0 - dt.getMonth());
    if (monthsAhead < 0) continue;
    const restantes = p.qtd_parcelas - (p.parcela_inicial - 1);
    if (monthsAhead >= restantes) continue;
    s += p.valor_total / p.qtd_parcelas;
  }
  return s;
}

function gastosNoMes(_y: number, m0: number) {
  let mensal = 0;
  let anualNesse = 0;
  for (const g of DEMO_GASTOS) {
    if (!g.ativo) continue;
    if (g.frequencia === "mensal") mensal += g.valor;
    else if (g.mes_anual && g.mes_anual - 1 === m0) anualNesse += g.valor;
  }
  return mensal + anualNesse;
}

function DashboardPage() {
  const hoje = new Date();
  const [offset, setOffset] = useState(0);
  const mRef = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
  const y = mRef.getFullYear();
  const m0 = mRef.getMonth();

  const renda = DEMO_PROFILE.renda_mensal;
  const pilares = totaisPorPilar(DEMO_GASTOS);
  const parc = useMemo(() => parcelasNoMesRef(y, m0), [y, m0]);
  const fixos = gastosNoMes(y, m0);
  const compromissos = fixos + parc;
  const sobra = renda - compromissos;
  const pctComprometido = Math.min(100, (compromissos / renda) * 100);

  const proj = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const yy = dt.getFullYear(); const mm = dt.getMonth();
      const s = renda - gastosNoMes(yy, mm) - parcelasNoMesRef(yy, mm);
      return { y: yy, m: mm, sobra: s };
    });
  }, [renda]);

  const nome = DEMO_PROFILE.nome.split(" ")[0];
  const mesNome = MESES_ABREV[m0];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header — sóbrio */}
      <div className="flex items-center justify-between gap-3 fade-up">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight truncate">
            Olá, {nome}
          </h1>
          <p className="text-sm text-muted-foreground">Seu mês em um olhar</p>
        </div>
        <MonthPicker offset={offset} setOffset={setOffset} label={`${mesNome} · ${y}`} />
      </div>

      {/* Card principal — o essencial */}
      <div className="glass-strong p-6 lg:p-8 fade-up">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Sobra em {mesNome}
        </div>
        <div className={`mt-2 text-4xl lg:text-5xl font-semibold tracking-tight tabular-nums ${sobra >= 0 ? "text-foreground" : "text-negative"}`}>
          <Money value={sobra} signed showSign />
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          de <span className="text-foreground/80"><Money value={renda} /></span> de renda
        </div>

        {/* Barra simples: comprometido vs livre */}
        <div className="mt-6">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={sobra >= 0 ? "h-full bg-primary/80" : "h-full bg-negative"}
              style={{ width: `${pctComprometido}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{pctComprometido.toFixed(0)}% comprometido</span>
            <span><Money value={compromissos} /> em compromissos</span>
          </div>
        </div>

        {/* 3 números essenciais */}
        <div className="mt-6 grid grid-cols-3 gap-px bg-white/5 rounded-lg overflow-hidden">
          <MiniStat label="Gastos fixos" value={fixos} />
          <MiniStat label="Parcelas" value={parc} />
          <MiniStat label="Livre" value={sobra} accent={sobra < 0 ? "neg" : "pos"} />
        </div>
      </div>

      {/* Pilares — mínimo, sem cores */}
      <div className="fade-up">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
          Divisão por pilar
        </div>
        <div className="glass divide-y divide-border">
          <PilarRow label="Sobrevivência" hint="Moradia, saúde, transporte" value={pilares.S} renda={renda} ideal={55} />
          <PilarRow label="Proteção"      hint="Reserva e investimentos"    value={pilares.P} renda={renda} ideal={15} />
          <PilarRow label="Liberdade"     hint="Lazer, desejos"             value={pilares.L} renda={renda} ideal={30} />
        </div>
      </div>

      {/* Projeção 6 meses — enxuta */}
      <div className="fade-up">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Próximos 6 meses
          </div>
          <Link to="/fluxo" className="text-xs text-primary flex items-center gap-1 font-medium hover:underline">
            Ver fluxo diário <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="glass p-4">
          <ProjChart data={proj} renda={renda} />
        </div>
      </div>
    </div>
  );
}

function MonthPicker({ offset, setOffset, label }: { offset: number; setOffset: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border overflow-hidden shrink-0">
      <button className="h-9 w-9 grid place-items-center hover:bg-white/5" onClick={() => setOffset(offset - 1)} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="px-3 text-xs font-medium tabular-nums">{label}</div>
      <button className="h-9 w-9 grid place-items-center hover:bg-white/5" onClick={() => setOffset(offset + 1)} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: "pos" | "neg" }) {
  const color = accent === "neg" ? "text-negative" : accent === "pos" ? "text-primary" : "text-foreground";
  return (
    <div className="bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold tabular-nums ${color}`}>
        <Money value={value} />
      </div>
    </div>
  );
}

function PilarRow({ label, hint, value, renda, ideal }: { label: string; hint: string; value: number; renda: number; ideal: number }) {
  const pct = (value / renda) * 100;
  const ok = pct <= ideal;
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{hint}</div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden relative">
          <div className="h-full bg-foreground/70" style={{ width: `${Math.min(100, pct)}%` }} />
          <div className="absolute top-0 h-full w-px bg-muted-foreground/60" style={{ left: `${ideal}%` }} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold tabular-nums"><Money value={value} /></div>
        <div className={`text-[10px] tabular-nums ${ok ? "text-muted-foreground" : "text-negative"}`}>
          {pct.toFixed(0)}% · ideal {ideal}%
        </div>
      </div>
    </div>
  );
}

function ProjChart({ data, renda }: { data: { y: number; m: number; sobra: number }[]; renda: number }) {
  const max = Math.max(renda * 0.5, ...data.map((d) => Math.abs(d.sobra)));
  return (
    <div className="space-y-2">
      {data.map((f, i) => {
        const pct = (Math.abs(f.sobra) / max) * 100;
        const pos = f.sobra >= 0;
        return (
          <div key={i} className="grid grid-cols-[60px_1fr_100px] items-center gap-3">
            <div className="text-xs text-muted-foreground tabular-nums">
              {MESES_ABREV[f.m]}<span className="opacity-50">/{String(f.y).slice(2)}</span>
            </div>
            <div className="h-6 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              <div
                className={`absolute top-1 bottom-1 rounded-sm ${pos ? "bg-primary/70" : "bg-negative/80"}`}
                style={pos
                  ? { left: "50%", width: `${pct / 2}%` }
                  : { right: "50%", width: `${pct / 2}%` }}
              />
            </div>
            <div className={`text-right text-xs font-medium tabular-nums ${pos ? "text-foreground" : "text-negative"}`}>
              <Money value={f.sobra} signed showSign />
            </div>
          </div>
        );
      })}
    </div>
  );
}
