import { AnimatePresence, motion } from "motion/react";
import { X, TrendingUp, TrendingDown, Wallet, Info } from "lucide-react";
import { Money } from "@/components/Money";
import type { DiaFluxo } from "@/lib/finance";
import type { CommitFn } from "@/components/FluxoMonth";

/* ─── Ações do dia ───
   Sheet que lista os lançamentos avulsos de um dia (entrada fixa
   extra, entrada diária, saída diária) com botão de remover cada um.
   Saída fixa (contas/parcelas recorrentes) aparece só como leitura —
   ela vem de /gastos e /parcelas, não é um lançamento removível aqui. */
export function DayActionsSheet({
  dia,
  mesLabel,
  onCommit,
  onClose,
}: {
  dia: DiaFluxo | null;
  mesLabel: string;
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
            className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-2xl border border-border p-5 space-y-4 safe-bottom"
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
              <span className="font-mono text-base font-bold text-primary">
                <Money value={dia.saldo} />
              </span>
            </div>

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
                            <Money value={a.valor} />
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

            {dia.saidaFixa > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Saída fixa do dia:{" "}
                  <strong className="text-foreground">
                    <Money value={dia.saidaFixa} />
                  </strong>
                  . Vem de contas recorrentes — gerencie em Gastos Fixos ou Parcelas.
                </span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
