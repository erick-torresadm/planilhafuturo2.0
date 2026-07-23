import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Money } from "@/components/Money";
import { MESES_ABREV, brl } from "@/lib/format";
import {
  DEMO_PROFILE, DEMO_GASTOS, DEMO_PARCELAS, DEMO_INVEST, DEMO_DESEJOS,
  totaisPorPilar,
} from "@/lib/demoData";
import {
  Shield, Sparkles, Home as HomeIcon, TrendingUp, AlertTriangle,
  CheckCircle2, ArrowRight, Wallet, PiggyBank, Calendar,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Planilha do Erick — Visão do Mês" },
      { name: "description", content: "Seu orçamento em um olhar: sobrevivência, proteção e liberdade." },
    ],
  }),
  component: DashboardPage,
});

/* ---------- utilidades locais ---------- */

function parcelasNoMesRef(y: number, m0: number) {
  let s = 0;
  const detalhe: { desc: string; valor: number; restam: number }[] = [];
  for (const p of DEMO_PARCELAS) {
    const dt = new Date(p.data + "T00:00:00");
    const monthsAhead = (y - dt.getFullYear()) * 12 + (m0 - dt.getMonth());
    if (monthsAhead < 0) continue;
    const restantes = p.qtd_parcelas - (p.parcela_inicial - 1);
    if (monthsAhead >= restantes) continue;
    const v = p.valor_total / p.qtd_parcelas;
    s += v;
    detalhe.push({ desc: p.descricao, valor: v, restam: restantes - monthsAhead });
  }
  return { total: s, detalhe };
}

function gastosNoMes(y: number, m0: number) {
  let mensal = 0;
  let anualNesse = 0;
  for (const g of DEMO_GASTOS) {
    if (!g.ativo) continue;
    if (g.frequencia === "mensal") mensal += g.valor;
    else if (g.mes_anual && g.mes_anual - 1 === m0) anualNesse += g.valor;
  }
  return mensal + anualNesse;
}

/* ---------- página ---------- */

function DashboardPage() {
  const hoje = new Date();
  const [offset, setOffset] = useState(0); // meses à frente/atrás do atual
  const mRef = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
  const y = mRef.getFullYear();
  const m0 = mRef.getMonth();

  const renda = DEMO_PROFILE.renda_mensal;
  const pilares = totaisPorPilar(DEMO_GASTOS);
  const parcMes = useMemo(() => parcelasNoMesRef(y, m0), [y, m0]);
  const fixosMes = gastosNoMes(y, m0);
  const totalCompromissos = fixosMes + parcMes.total;
  const sobra = renda - totalCompromissos;
  const pctComprometido = Math.min(100, (totalCompromissos / renda) * 100);

  // Projeção 6 meses (mês atual + 5)
  const proj = useMemo(() => {
    let acum = 0;
    return Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const yy = dt.getFullYear(); const mm = dt.getMonth();
      const p = parcelasNoMesRef(yy, mm).total;
      const f = gastosNoMes(yy, mm);
      const s = renda - f - p;
      acum += s;
      return { y: yy, m: mm, fixos: f, parc: p, sobra: s, acum };
    });
  }, []);

  const totalInvest = DEMO_INVEST.reduce((a, i) => a + i.posicao_atual, 0);
  const reservaMeta = pilares.S * DEMO_PROFILE.meses_reserva_emergencia;
  const reservaAtual = totalInvest; // usa investimentos como proxy (CDBs líquidos)
  const reservaPct = Math.min(100, (reservaAtual / reservaMeta) * 100);

  // Regra do Breno: liberdade não pode passar de 30% da renda
  const pctS = (pilares.S / renda) * 100;
  const pctL = (pilares.L / renda) * 100;
  const alertLiberdade = pctL > 30;
  const alertSobrev = pctS > 55;
  const alertSobra = sobra < 0;

  const nome = DEMO_PROFILE.nome.split(" ")[0];
  const mesNome = MESES_ABREV[m0];

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3 fade-up">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mt-1">
            Olá, {nome} <span className="text-primary">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground">Seu orçamento em um olhar — método Breno</p>
        </div>
        <MonthPicker offset={offset} setOffset={setOffset} label={`${mesNome}/${String(y).slice(2)}`} />
      </div>

      {/* HERO — o mês em um olhar */}
      <div className="glass-strong p-5 lg:p-6 relative overflow-hidden fade-up">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-3 gap-6">
          {/* Coluna 1: renda x comprometido */}
          <div className="lg:col-span-2">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3 w-3" /> Renda de {mesNome}
            </div>
            <div className="font-display text-4xl lg:text-5xl font-bold mt-1"><Money value={renda} /></div>

            {/* Barra empilhada */}
            <div className="mt-5">
              <div className="h-4 rounded-full bg-white/5 overflow-hidden flex">
                <div className="h-full bg-[oklch(0.72_0.15_20)]" style={{ width: `${(pilares.S / renda) * 100}%` }} title={`Sobrevivência ${brl(pilares.S)}`} />
                <div className="h-full bg-[oklch(0.78_0.15_240)]" style={{ width: `${(pilares.P / renda) * 100}%` }} title={`Proteção ${brl(pilares.P)}`} />
                <div className="h-full bg-[oklch(0.82_0.17_80)]" style={{ width: `${(pilares.L / renda) * 100}%` }} title={`Liberdade ${brl(pilares.L)}`} />
                <div className="h-full bg-[oklch(0.62_0.18_320)]" style={{ width: `${Math.min(100 - pctComprometido + parcMes.total / renda * 100, (parcMes.total / renda) * 100)}%` }} title={`Parcelas ${brl(parcMes.total)}`} />
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <LegendDot color="oklch(0.72 0.15 20)"  label="Sobrevivência" value={pilares.S} />
                <LegendDot color="oklch(0.78 0.15 240)" label="Proteção"      value={pilares.P} />
                <LegendDot color="oklch(0.82 0.17 80)"  label="Liberdade"     value={pilares.L} />
                <LegendDot color="oklch(0.62 0.18 320)" label="Parcelas"      value={parcMes.total} />
              </div>
            </div>
          </div>

          {/* Coluna 2: sobra */}
          <div className="lg:border-l lg:border-white/10 lg:pl-6 flex flex-col justify-center">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Sobra do mês</div>
            <div className={`font-display text-4xl font-bold mt-1 ${sobra >= 0 ? "text-positive" : "text-negative"}`}>
              <Money value={sobra} signed showSign />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {pctComprometido.toFixed(0)}% da renda comprometida
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full ${sobra >= 0 ? "mint-gradient" : "bg-negative"}`}
                   style={{ width: `${pctComprometido}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ALERTAS — Regras do Breno */}
      {(alertLiberdade || alertSobrev || alertSobra) && (
        <div className="grid gap-2 fade-up">
          {alertSobra && (
            <AlertRow color="negative"
              text={`Você está gastando mais do que ganha em ${mesNome}. Corte ${brl(Math.abs(sobra))} de compromissos.`} />
          )}
          {alertSobrev && (
            <AlertRow color="warning"
              text={`Sobrevivência em ${pctS.toFixed(0)}% da renda. Ideal: manter abaixo de 55%.`} />
          )}
          {alertLiberdade && (
            <AlertRow color="warning"
              text={`Liberdade em ${pctL.toFixed(0)}% da renda. Regra do Breno: máx 30%.`} />
          )}
        </div>
      )}

      {/* 3 PILARES — cartões */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 fade-up">
        <PilarCard
          icon={HomeIcon} title="Sobrevivência" hint="Moradia, saúde, transporte"
          value={pilares.S} renda={renda} ideal={55}
          color="oklch(0.72 0.15 20)"
        />
        <PilarCard
          icon={Shield} title="Proteção" hint="Reserva e investimentos base"
          value={pilares.P} renda={renda} ideal={15}
          color="oklch(0.78 0.15 240)"
        />
        <PilarCard
          icon={Sparkles} title="Liberdade" hint="Lazer, hobbies, desejos"
          value={pilares.L} renda={renda} ideal={30}
          color="oklch(0.82 0.17 80)"
        />
      </div>

      {/* Projeção 6 meses */}
      <div className="fade-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Próximos 6 meses
          </h2>
          <Link to="/fluxo" className="text-xs text-primary flex items-center gap-1 font-semibold hover:underline">
            Ver fluxo diário <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Barras horizontais empilhadas — visão semestre */}
        <div className="glass p-4 space-y-2.5">
          {proj.map((f, i) => {
            const total = f.fixos + f.parc + Math.max(0, f.sobra);
            const wF = (f.fixos / renda) * 100;
            const wP = (f.parc / renda) * 100;
            const wS = Math.max(0, (f.sobra / renda) * 100);
            const wN = f.sobra < 0 ? (Math.abs(f.sobra) / renda) * 100 : 0;
            return (
              <div key={i} className="grid grid-cols-[52px_1fr_110px] gap-3 items-center">
                <div className="text-xs font-semibold text-muted-foreground">
                  {MESES_ABREV[f.m]}<span className="opacity-50">/{String(f.y).slice(2)}</span>
                </div>
                <div className="h-6 rounded-md bg-white/5 overflow-hidden flex text-[10px] font-semibold">
                  <div style={{ width: `${wF}%` }} className="bg-[oklch(0.72_0.15_20)] flex items-center justify-center text-black/80 truncate" title={`Fixos ${brl(f.fixos)}`}>
                    {wF > 12 ? brl(f.fixos).replace("R$", "").trim() : ""}
                  </div>
                  <div style={{ width: `${wP}%` }} className="bg-[oklch(0.62_0.18_320)] flex items-center justify-center text-black/80 truncate" title={`Parcelas ${brl(f.parc)}`}>
                    {wP > 12 ? brl(f.parc).replace("R$", "").trim() : ""}
                  </div>
                  <div style={{ width: `${wS}%` }} className="mint-gradient flex items-center justify-center text-black/80 truncate" title={`Sobra ${brl(f.sobra)}`}>
                    {wS > 12 ? `+${brl(f.sobra).replace("R$", "").trim()}` : ""}
                  </div>
                  {wN > 0 && (
                    <div style={{ width: `${wN}%` }} className="bg-negative flex items-center justify-center text-white truncate">
                      −{brl(Math.abs(f.sobra)).replace("R$", "").trim()}
                    </div>
                  )}
                </div>
                <div className={`text-right text-xs font-bold ${f.acum >= 0 ? "text-positive" : "text-negative"}`}>
                  <Money value={f.acum} signed />
                </div>
              </div>
            );
          })}
          <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Barras: fixos • parcelas • sobra</span>
            <span>Total acumulado à direita</span>
          </div>
        </div>
      </div>

      {/* PARCELAS e RESERVA lado a lado */}
      <div className="grid lg:grid-cols-2 gap-4 fade-up">
        {/* Parcelas do mês */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Parcelas em {mesNome}
              </div>
              <div className="font-display text-xl font-bold mt-0.5">
                <Money value={parcMes.total} /> <span className="text-muted-foreground text-sm">/ mês</span>
              </div>
            </div>
            <Link to="/parcelas" className="chip bg-white/5 text-primary tap-target">
              <ArrowRight className="h-3 w-3" /> Todas
            </Link>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-auto">
            {parcMes.detalhe.slice(0, 6).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                <div className="min-w-0 flex-1 truncate">{d.desc}</div>
                <div className="text-[11px] text-muted-foreground shrink-0 mr-3">{d.restam}x restam</div>
                <div className="font-semibold shrink-0"><Money value={d.valor} /></div>
              </div>
            ))}
            {parcMes.detalhe.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">Sem parcelas neste mês 🎉</div>
            )}
          </div>
        </div>

        {/* Reserva */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <PiggyBank className="h-3 w-3" /> Reserva de emergência
              </div>
              <div className="font-display text-xl font-bold mt-0.5">
                <Money value={reservaAtual} />{" "}
                <span className="text-muted-foreground text-sm">de <Money value={reservaMeta} /></span>
              </div>
            </div>
            <div className="chip mint-gradient">{reservaPct.toFixed(0)}%</div>
          </div>
          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full mint-gradient transition-all duration-700" style={{ width: `${reservaPct}%` }} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Meta: {DEMO_PROFILE.meses_reserva_emergencia} meses de sobrevivência ({brl(pilares.S)}/mês).
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat icon={TrendingUp} label="Investimentos" value={totalInvest} />
            <MiniStat icon={Sparkles} label="Desejos" value={DEMO_DESEJOS.reduce((a, d) => a + d.valor, 0)} muted />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- componentes locais ---------- */

function MonthPicker({ offset, setOffset, label }: { offset: number; setOffset: (n: number) => void; label: string }) {
  return (
    <div className="glass inline-flex items-center rounded-lg overflow-hidden">
      <button className="tap-target px-3 hover:bg-white/5" onClick={() => setOffset(offset - 1)} aria-label="Mês anterior">‹</button>
      <div className="px-3 text-sm font-semibold uppercase tracking-wider">{label}</div>
      <button className="tap-target px-3 hover:bg-white/5" onClick={() => setOffset(offset + 1)} aria-label="Próximo mês">›</button>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="ml-auto font-semibold"><Money value={value} compact /></span>
    </div>
  );
}

function AlertRow({ color, text }: { color: "negative" | "warning"; text: string }) {
  const bg = color === "negative" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning";
  return (
    <div className={`glass p-3 flex items-center gap-3 text-sm ${bg}`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function PilarCard({
  icon: Icon, title, hint, value, renda, ideal, color,
}: {
  icon: any; title: string; hint: string; value: number; renda: number; ideal: number; color: string;
}) {
  const pct = (value / renda) * 100;
  const ok = pct <= ideal;
  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${color} / 0.2`, backgroundColor: `color-mix(in oklab, ${color} 25%, transparent)` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{hint}</div>
          </div>
        </div>
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-positive" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-2xl font-bold"><Money value={value} /></div>
        <div className={`text-xs font-semibold ${ok ? "text-positive" : "text-warning"}`}>{pct.toFixed(0)}%</div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden relative">
        <div className="h-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
        {/* Marca do ideal */}
        <div className="absolute top-0 h-full w-px bg-white/40" style={{ left: `${ideal}%` }} title={`Ideal ${ideal}%`} />
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">Ideal ≤ {ideal}% da renda</div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, muted }: { icon: any; label: string; value: number; muted?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`font-display text-base font-bold mt-0.5 ${muted ? "text-muted-foreground" : ""}`}>
        <Money value={value} compact />
      </div>
    </div>
  );
}
