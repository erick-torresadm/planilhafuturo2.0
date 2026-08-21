import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll, getProfile } from "@/lib/db";
import {
  computaMes,
  totalGastoFixoMensal,
  parcelasNoMes,
  type GastoFixo,
  type Parcela,
} from "@/lib/finance";
import { MESES_ABREV, daysInMonth } from "@/lib/format";
import { Money } from "@/components/Money";
import { useLancamentosLocal } from "@/hooks/useLancamentosLocal";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  TrendingDown,
  Zap,
  PiggyBank,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — planilhafuturo" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const today = new Date();
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const { list: lanc } = useLancamentosLocal();

  // Histórico só volta até o dia que a pessoa comecou a preencher: o
  // primeiro lançamento diário registrado, ou a criação da conta se
  // ela ainda não lançou nada.
  const start = useMemo(() => {
    const primeiroLanc = lanc.reduce<string | null>(
      (min, l) => (min === null || l.data < min ? l.data : min),
      null,
    );
    const iso = primeiroLanc ?? profile.data?.created_at;
    if (iso) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() };
    }
    return { y: today.getFullYear(), m: today.getMonth() };
  }, [lanc, profile.data?.created_at]);

  const g = (gastos.data ?? []) as GastoFixo[];
  const p = (parcelas.data ?? []) as unknown as Parcela[];
  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);
  const renda = Number(profile.data?.renda_mensal ?? 0);

  const mes = useMemo(() => {
    // Entradas/saidas do mes nao dependem do carry de saldo — so o campo
    // .saldo (nao exibido aqui) dependeria do carry acumulado dos meses
    // anteriores, que fica no /fluxo.
    const dias = computaMes(anchor.y, anchor.m, saldoInicial, g, p, lanc);
    return { y: anchor.y, m: anchor.m, dias };
  }, [anchor, saldoInicial, g, p, lanc]);

  const loading = profile.isPending || gastos.isPending || parcelas.isPending;
  const canGoBack = anchor.y > start.y || (anchor.y === start.y && anchor.m > start.m);
  const isCurrentMonth = anchor.y === today.getFullYear() && anchor.m === today.getMonth();

  const entradas = mes.dias.reduce((a, d) => a + d.entradaFixa + d.entradaDiaria, 0);
  const diariosSaida = mes.dias.reduce((a, d) => a + d.saidaDiaria, 0);
  const saidasFixas = totalGastoFixoMensal(g);
  const cartao = parcelasNoMes(p, anchor.y, anchor.m);
  const custoDeVida = saidasFixas + diariosSaida + cartao;
  const economias = Math.max(0, entradas - custoDeVida);

  const diasBase = isCurrentMonth ? Math.max(1, today.getDate()) : daysInMonth(anchor.y, anchor.m);
  const diarioMedio = diariosSaida / diasBase;
  const hojeDiario = isCurrentMonth
    ? (mes.dias.find((d) => d.dia === today.getDate())?.saidaDiaria ?? 0)
    : 0;

  const movimentacoes = [
    {
      key: "entradas",
      label: "entradas",
      value: entradas,
      icon: CheckCircle2,
      tone: "text-positive bg-positive-soft",
    },
    {
      key: "saidas",
      label: "saídas",
      value: saidasFixas,
      icon: TrendingDown,
      tone: "text-negative bg-negative-soft",
    },
    {
      key: "diarios",
      label: "diários",
      value: diariosSaida,
      icon: Zap,
      tone: "text-[#ec4899] bg-[#ec4899]/10",
    },
    {
      key: "economias",
      label: "economias",
      value: economias,
      icon: PiggyBank,
      tone: "text-positive bg-positive-soft",
    },
    {
      key: "cartao",
      label: "gastos com cartão",
      value: cartao,
      icon: CreditCard,
      tone: "text-[#7c3aed] bg-[#7c3aed]/10",
    },
  ];

  return (
    <div className="page-container space-y-6 animate-in max-w-lg mx-auto">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => {
            const d = new Date(anchor.y, anchor.m - 1, 1);
            setAnchor({ y: d.getFullYear(), m: d.getMonth() });
          }}
          aria-label="Mês anterior"
          className={cn(
            "h-11 w-11 grid place-items-center rounded-full transition-colors",
            canGoBack
              ? "text-foreground hover:bg-muted"
              : "text-muted-foreground/30 cursor-not-allowed",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-base font-bold">
          {MESES_ABREV[anchor.m].toLowerCase()}/{anchor.y}
        </h2>
        <button
          type="button"
          onClick={() => {
            const d = new Date(anchor.y, anchor.m + 1, 1);
            setAnchor({ y: d.getFullYear(), m: d.getMonth() });
          }}
          aria-label="Próximo mês"
          className="h-11 w-11 grid place-items-center rounded-full text-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">custo de vida</div>
              <div className="mt-1.5 flex items-center -space-x-1.5">
                <IconDot icon={TrendingDown} tone="bg-negative text-white" />
                <IconDot icon={Zap} tone="bg-[#ec4899] text-white" />
                <IconDot icon={CreditCard} tone="bg-[#7c3aed] text-white" />
              </div>
              <div className="mt-3 font-mono text-xl font-bold tabular-nums">
                <Money value={custoDeVida} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {renda > 0
                  ? custoDeVida <= renda
                    ? "dentro da renda"
                    : "acima da renda"
                  : "renda não cadastrada"}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">diário médio</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconDot icon={Zap} tone="bg-[#ec4899] text-white" small /> / {diasBase}
              </div>
              <div className="mt-3 font-mono text-xl font-bold tabular-nums">
                <Money value={diarioMedio} />
              </div>
              {isCurrentMonth && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <IconDot icon={Zap} tone="bg-[#ec4899]/15 text-[#ec4899]" small />
                  <Money value={hojeDiario} />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-2">
              movimentações do mês
            </div>
            <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
              {movimentacoes.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.key} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full grid place-items-center shrink-0",
                          m.tone,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm">{m.label}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      <Money value={m.value} />
                    </span>
                  </div>
                );
              })}
              <Link
                to="/fluxo"
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" /> ver todas
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IconDot({
  icon: Icon,
  tone,
  small,
}: {
  icon: typeof TrendingDown;
  tone: string;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full grid place-items-center ring-2 ring-card shrink-0",
        small ? "h-4 w-4" : "h-6 w-6",
        tone,
      )}
    >
      <Icon className={small ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />
    </span>
  );
}
