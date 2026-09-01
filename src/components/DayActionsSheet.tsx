import { AnimatePresence, motion } from "motion/react";
import { X, TrendingUp, TrendingDown, Wallet, Info, Receipt, CreditCard } from "lucide-react";
import { Money } from "@/components/Money";
import type { DiaFluxo, ItemFixoDia } from "@/lib/finance";
import type { CommitFn } from "@/components/FluxoMonth";

export type AcumuladoMes = {
  saldoInicioMes: number;
  entradas: number;
  saidasFixas: number;
  saidasDiarias: number;
  itens: (ItemFixoDia & { vezes: number })[];
};

/* ─── Ações do dia ───
   Sheet que lista os lançamentos avulsos de um dia (entrada fixa
   extra, entrada diária, saída diária) com botão de remover cada um,
   e explica o saldo: o acumulado do mês até o dia clicado, com cada
   fixo/parcela que pesou. Saída fixa é leitura — vem de /gastos e
   /parcelas, não é removível aqui. */
export function DayActionsSheet({
  dia,
  mesLabel,
  acumulado,
  onCommit,
  onClose,
}: {
  dia: DiaFluxo | null;
  mesLabel: string;
  acumulado?: AcumuladoMes | null;
  onCommit: CommitFn;
  onClose: () => void;
}) {
  const open = !!dia;
  const acoes = dia
    ? [
        {
          tipo: "entrada_fixa",
          label: "Entrada avulsa",
          valor: dia.entradaFixa,
          icon: TrendingUp,
          tone: "positive" as const,
        },
        {
          tipo: "entrada_diaria",
          label: "Entrada do dia",
          valor: dia.entradaDiaria,
          icon: TrendingUp,
          tone: "positive" as const,
        },
        {
          tipo: "saida_diaria",
          label: "Saída do dia",
          valor: dia.saidaDiaria,
          icon: TrendingDown,
          tone: "negative" as const,
        },
      ].filter((a) => a.valor > 0)
    : [];

  return (
    <AnimatePresence>
      {open && dia && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-2xl border border-border p-5 space-y-4 safe-bottom max-h-[85dvh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Ações do dia</span>
                <h3 className="font-display text-lg font-bold mt-0.5">
                  Dia {dia.dia}, {mesLabel}
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="h-11 w-11 -m-2.5 rounded-full grid place-items-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
              <span className="text-sm font-semibold text-primary flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Saldo do dia
              </span>
              <span className={dia.saldo < 0 ? "font-mono text-base font-bold text-negative" : "font-mono text-base font-bold text-positive"}>
                <Money value={dia.saldo} signed={false} />
              </span>
            </div>

            {/* Como chegou nesse número — acumulado do mês até o dia */}
            {acumulado && (
              <div className="rounded-xl border border-border px-3.5 py-3 space-y-1.5">
                <span className="eyebrow">Como chegou nesse número</span>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo no início do mês</span>
                  <span className="font-mono font-semibold">
                    <Money value={acumulado.saldoInicioMes} signed={false} />
                  </span>
                </div>
                {acumulado.entradas > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">+ Entradas até dia {dia.dia}</span>
                    <span className="font-mono font-semibold text-positive">
                      <Money value={acumulado.entradas} signed={false} />
                    </span>
                  </div>
                )}
                {acumulado.saidasFixas > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">− Contas e parcelas até dia {dia.dia}</span>
                    <span className="font-mono font-semibold text-negative">
                      <Money value={acumulado.saidasFixas} signed={false} />
                    </span>
                  </div>
                )}
                {acumulado.saidasDiarias > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">− Gastos lançados até dia {dia.dia}</span>
                    <span className="font-mono font-semibold text-negative">
                      <Money value={acumulado.saidasDiarias} signed={false} />
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-1.5 flex items-center justify-between text-sm font-bold">
                  <span>= Saldo do dia {dia.dia}</span>
                  <span className={dia.saldo < 0 ? "font-mono text-negative" : "font-mono text-positive"}>
                    <Money value={dia.saldo} signed={false} />
                  </span>
                </div>
              </div>
            )}

            {acoes.length === 0 && dia.saidaFixa === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma ação lançada nesse dia ainda.
              </p>
            )}

            {acoes.length > 0 && (
              <div className="space-y-2">
                {acoes.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div
                      key={a.tipo}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={
                            a.tone === "positive"
                              ? "h-8 w-8 rounded-lg bg-positive-soft text-positive grid place-items-center shrink-0"
                              : "h-8 w-8 rounded-lg bg-negative-soft text-negative grid place-items-center shrink-0"
                          }
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{a.label}</div>
                          <div
                            className={
                              a.tone === "positive"
                                ? "font-mono text-sm font-bold text-positive"
                                : "font-mono text-sm font-bold text-negative"
                            }
                          >
                            <Money value={a.valor} signed={false} />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onCommit(dia.data, a.tipo, 0, a.valor)}
                        aria-label={`Excluir ${a.label}`}
                        className="h-11 w-11 rounded-lg grid place-items-center text-negative/70 hover:text-negative hover:bg-negative-soft/50 transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {acumulado && acumulado.itens.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="eyebrow">O que pesou até dia {dia.dia}</span>
                  <span className="font-mono text-sm font-bold text-negative">
                    <Money value={acumulado.saidasFixas} signed={false} />
                  </span>
                </div>
                <div className="rounded-xl border border-border divide-y divide-border max-h-56 overflow-y-auto overscroll-contain">
                  {acumulado.itens.map((it, i) => {
                    const Icon = it.origem === "parcela" ? CreditCard : Receipt;
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-negative-soft text-negative grid place-items-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{it.descricao}</div>
                            {it.detalhe && (
                              <div className="text-xs text-muted-foreground truncate">
                                {it.origem === "parcela" ? `Parcela ${it.detalhe}` : it.detalhe}
                                {it.vezes > 1 ? ` · ${it.vezes}x` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-negative shrink-0">
                          <Money value={it.valor} signed={false} />
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Vêm de contas recorrentes — gerencie em Gastos Fixos ou Parcelas.</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
