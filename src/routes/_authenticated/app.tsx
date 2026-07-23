import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Money } from "@/components/Money";
import { MESES_ABREV, brl } from "@/lib/format";
import {
  DEMO_PROFILE, DEMO_GASTOS, DEMO_PARCELAS,
  totaisPorPilar,
} from "@/lib/demoData";
import { ArrowRight, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
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
  let anual = 0;
  for (const g of DEMO_GASTOS) {
    if (!g.ativo) continue;
    if (g.frequencia === "mensal") mensal += g.valor;
    else if (g.mes_anual && g.mes_anual - 1 === m0) anual += g.valor;
  }
  return mensal + anual;
}

// Paleta de tags — igual à referência
const TAG = {
  E1: { bg: "bg-emerald-500", ring: "ring-emerald-500/25", text: "text-emerald-600", letter: "E" }, // Entradas
  S:  { bg: "bg-orange-500",  ring: "ring-orange-500/25",  text: "text-orange-600",  letter: "S" }, // Saídas
  D:  { bg: "bg-pink-500",    ring: "ring-pink-500/25",    text: "text-pink-600",    letter: "D" }, // Diários
  E2: { bg: "bg-sky-500",     ring: "ring-sky-500/25",     text: "text-sky-600",     letter: "E" }, // Economias
  C:  { bg: "bg-violet-500",  ring: "ring-violet-500/25",  text: "text-violet-600",  letter: "C" }, // Cartão
} as const;

function DashboardPage() {
  const hoje = new Date();
  const [offset, setOffset] = useState(0);
  const mRef = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
  const y = mRef.getFullYear();
  const m0 = mRef.getMonth();
  const diasMes = new Date(y, m0 + 1, 0).getDate();

  const renda = DEMO_PROFILE.renda_mensal;
  const pilares = totaisPorPilar(DEMO_GASTOS);
  const parc = useMemo(() => parcelasNoMesRef(y, m0), [y, m0]);
  const fixos = gastosNoMes(y, m0);

  // "Movimentações do mês" (referência: 5 linhas com badge colorida)
  const entradas = renda;
  const saidas = fixos;                       // gastos fixos do mês
  const diarios = 105;                        // demo — pequenas compras diárias
  const economias = Math.max(0, renda * 0.10); // 10% ideal
  const cartao = parc;                        // compras parceladas do cartão

  const custoVida = saidas + diarios + cartao;
  const sobra = entradas - saidas - diarios - economias - cartao;
  const economizadoPct = renda ? (economias / renda) * 100 : 0;
  const diarioMedio = diarios / diasMes;

  const nome = DEMO_PROFILE.nome.split(" ")[0];
  const mesLabel = `${MESES_ABREV[m0]}/${String(y).slice(2)}`;

  return (
    <div className="p-4 lg:p-8 space-y-5 max-w-3xl mx-auto">
      {/* Header — chip do dia + navegação de mês + avatar */}
      <div className="flex items-center justify-between gap-3 fade-up">
        <div className="h-11 w-11 rounded-xl bg-white border border-border shadow-sm grid place-items-center relative">
          <CalendarDays className="h-5 w-5 text-foreground/60" />
          <span className="absolute bottom-0.5 right-1 text-[9px] font-bold tabular-nums text-foreground/80">
            {hoje.getDate()}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-3">
          <button
            onClick={() => setOffset(offset - 1)}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 text-foreground/60"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="font-display text-2xl font-bold tracking-tight tabular-nums capitalize">
            {mesLabel}
          </div>
          <button
            onClick={() => setOffset(offset + 1)}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 text-foreground/60"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="h-11 w-11 rounded-xl bg-white border border-border shadow-sm grid place-items-center text-lg">
          🤓
        </div>
      </div>

      {/* Cálculos do mês */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden fade-up">
        <div className="px-5 pt-5 pb-3 text-xs font-medium text-muted-foreground">
          Cálculos do mês
        </div>
        <div className="divide-y divide-border/70">
          {/* Performance */}
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">Performance</div>
              <div className="mt-2 flex items-center gap-1.5">
                <TagDot t={TAG.E1} /> <Minus /> <TagDot t={TAG.S} /> <Minus /> <TagDot t={TAG.D} /> <Minus /> <TagDot t={TAG.E2} /> <Minus /> <TagDot t={TAG.C} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-[15px] font-bold tabular-nums ${sobra >= 0 ? "text-foreground" : "text-negative"}`}>
                <Money value={Math.abs(sobra)} />
              </div>
              <div className={`text-[12px] ${sobra >= 0 ? "text-emerald-600" : "text-negative"}`}>
                {sobra >= 0 ? "Sobrou dinheiro" : "Ficou negativo"}
              </div>
            </div>
          </div>

          {/* Economizado */}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-[15px] font-semibold">Economizado</div>
              <div className="text-[15px] font-bold tabular-nums">{economizadoPct.toFixed(0)}%</div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className={`h-5 w-5 rounded-full ${TAG.E2.bg} text-white text-[10px] font-bold grid place-items-center shrink-0`}>E</span>
              <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden">
                <div
                  className={`h-full ${economizadoPct >= 10 ? "bg-emerald-500" : "bg-amber-400"}`}
                  style={{ width: `${Math.min(100, economizadoPct * 4)}%` }}
                />
              </div>
              <div className={`text-[12px] shrink-0 ${economizadoPct >= 10 ? "text-emerald-600" : "text-amber-600"}`}>
                {economizadoPct >= 10 ? "Ideal atingido" : "Abaixo do ideal"}
              </div>
            </div>
          </div>

          {/* Custo de vida */}
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[15px] font-semibold">Custo de vida</div>
              <div className="mt-2 flex items-center gap-1.5">
                <TagDot t={TAG.S} /> <Plus /> <TagDot t={TAG.D} /> <Plus /> <TagDot t={TAG.C} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-bold tabular-nums"><Money value={custoVida} /></div>
              <div className={`text-[12px] ${custoVida <= renda ? "text-emerald-600" : "text-negative"}`}>
                {custoVida <= renda ? "Dentro da renda" : "Acima da renda"}
              </div>
            </div>
          </div>

          {/* Diário médio */}
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[15px] font-semibold">Diário médio</div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <TagDot t={TAG.D} />
                <span className="tabular-nums">/ {diasMes}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-bold tabular-nums"><Money value={diarioMedio} /></div>
              <div className="text-[12px] text-muted-foreground tabular-nums">
                <TagDotInline t={TAG.D} /> <Money value={diarios} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Movimentações do mês */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden fade-up">
        <div className="px-5 pt-5 pb-3 text-xs font-medium text-muted-foreground">
          Movimentações do mês
        </div>
        <ul className="divide-y divide-border/70">
          <MoveRow tag={TAG.E1} label="Entradas" value={entradas} />
          <MoveRow tag={TAG.S}  label="Saídas"    value={saidas} />
          <MoveRow tag={TAG.D}  label="Diários"   value={diarios} />
          <MoveRow tag={TAG.E2} label="Economias" value={economias} />
          <MoveRow tag={TAG.C}  label="Gastos com cartão" value={cartao} />
        </ul>
      </section>

      <div className="fade-up">
        <Link
          to="/fluxo"
          className="flex items-center justify-between bg-white rounded-2xl border border-border shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
        >
          <div>
            <div className="text-[15px] font-semibold">Fluxo diário</div>
            <div className="text-[12px] text-muted-foreground">Veja o mês dia a dia como uma planilha</div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </Link>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function TagDot({ t }: { t: { bg: string; letter: string } }) {
  return (
    <span className={`h-5 w-5 rounded-full ${t.bg} text-white text-[10px] font-bold grid place-items-center`}>
      {t.letter}
    </span>
  );
}

function TagDotInline({ t }: { t: { bg: string; letter: string } }) {
  return (
    <span className={`inline-grid place-items-center align-middle h-3.5 w-3.5 rounded-full ${t.bg} text-white text-[8px] font-bold mr-0.5`}>
      {t.letter}
    </span>
  );
}

function Minus() { return <span className="text-foreground/40 text-sm font-medium">−</span>; }
function Plus()  { return <span className="text-foreground/40 text-sm font-medium">+</span>; }

function MoveRow({ tag, label, value }: { tag: { bg: string; letter: string }; label: string; value: number }) {
  return (
    <li className="px-5 py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-7 w-7 rounded-full ${tag.bg} text-white text-[12px] font-bold grid place-items-center shrink-0`}>
          {tag.letter}
        </span>
        <span className="text-[15px] font-medium truncate">{label}</span>
      </div>
      <span className="text-[15px] font-semibold tabular-nums">{brl(value)}</span>
    </li>
  );
}
