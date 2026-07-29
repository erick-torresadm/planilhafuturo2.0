import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, Bell, Clock, AlertTriangle, ListTodo, CreditCard, TrendingUp, PiggyBank, Phone, Search, type LucideIcon } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { useState, useMemo } from "react";
import { Money } from "@/components/Money";
import { cn } from "@/lib/utils";
import type { GastoFixo } from "@/lib/finance";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Planilha" }] }),
  component: TarefasPage,
});

const TIPOS = ["Pagamento", "Receita", "Investir", "Economia", "Cobrar", "Verificar"];
const TIPO_ICON: Record<string, LucideIcon> = {
  Pagamento: CreditCard,
  Receita: TrendingUp,
  Investir: TrendingUp,
  Economia: PiggyBank,
  Cobrar: Phone,
  Verificar: Search,
};

function TarefasPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [filter, setFilter] = useState<"todos" | "pendente" | "feito" | "atrasado">("todos");
  const [delId, setDelId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["tarefas"], queryFn: () => selectAll("tarefas") });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });

  const add = useMutation({
    mutationFn: () => insertRow("tarefas", { data: new Date().toISOString().slice(0, 10), descricao: "Nova tarefa", tipo: "Pagamento", status: "pendente" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas"] }),
  });
  const upd = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("tarefas", id, patch),
    onSuccess: (_d: any, v: any) => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      if (v.patch.status === "feito") playSound("celebration");
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("tarefas", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas"] }),
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const rows = ((q.data ?? []) as any[]).map((r) => ({
    ...r,
    status: r.status === "pendente" && r.data && r.data < hoje ? "atrasado" : r.status,
  }));
  const counts = {
    todos: rows.length,
    pendente: rows.filter((r) => r.status === "pendente").length,
    feito: rows.filter((r) => r.status === "feito").length,
    atrasado: rows.filter((r) => r.status === "atrasado").length,
  };
  const filtrados = filter === "todos" ? rows : rows.filter((r) => r.status === filter);
  const loading = q.isPending;

  const lembretes = useMemo(() => {
    const list: { data: string; texto: string; valor: number }[] = [];
    const hojeD = new Date().getDate();
    const g = (gastos.data ?? []) as GastoFixo[];
    for (const gg of g) {
      if (!gg.ativo || gg.frequencia !== "mensal") continue;
      const diff = gg.dia - hojeD;
      if (diff >= 0 && diff <= 3) list.push({ data: `Dia ${gg.dia}`, texto: gg.descricao, valor: Number(gg.valor) });
    }
    return list.sort((a, b) => a.data.localeCompare(b.data));
  }, [gastos.data]);

  return (
    <div className="page-container space-y-4 animate-in">
      <PageHeader
        eyebrow="Tarefas"
        title="Tarefas"
        subtitle="Pagamentos e lembretes financeiros"
        actions={
          <Button onClick={() => add.mutate()}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline ml-1">Nova</span>
          </Button>
        }
      />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {(["todos", "pendente", "atrasado", "feito"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("shrink-0 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all",
              filter === f ? "bg-primary text-primary-foreground" : "rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground")}>
            {f} <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Kanban columns (lg+) */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-3">
            {(["pendente", "atrasado", "feito"] as const).map((col) => {
              const items = rows.filter((r) => r.status === col);
              const colIcon = col === "feito" ? Check : col === "atrasado" ? AlertTriangle : Clock;
              const colBorder = col === "feito" ? "border-positive/20" : col === "atrasado" ? "border-negative/20" : "border-border";
              return (
                <div key={col} className={cn("rounded-xl bg-card border-t-[3px] border-x border-b border-border/40", colBorder)}>
                  <div className="p-4 pb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold capitalize">
                      <colIcon className={cn(
                        "h-4 w-4",
                        col === "feito" ? "text-positive" : col === "atrasado" ? "text-negative" : "text-muted-foreground",
                      )} />
                      {col}
                      <span className="text-xs text-muted-foreground ml-auto">{items.length}</span>
                    </div>
                  </div>
                  <div className="p-4 pt-0 space-y-2 min-h-[120px]">
                    {items.map((r) => {
                      const Icon = TIPO_ICON[r.tipo ?? "Pagamento"] ?? Search;
                      return (
                        <div key={r.id} className="rounded-xl bg-card border border-border p-3 transition-all hover:shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Input defaultValue={r.descricao}
                                onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })}
                                className={cn("h-6 border-0 bg-transparent shadow-none focus-visible:ring-1 text-sm font-semibold px-0", col === "feito" && "line-through opacity-60")} />
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Icon className="h-3 w-3" /> <span>{r.tipo}</span>
                                {r.data && <span>· {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                              </div>
                            </div>
                            {r.valor > 0 && (
                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold text-primary tabular-nums"><Money value={Number(r.valor)} /></span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            {col !== "feito" && (
                              <button onClick={() => upd.mutate({ id: r.id, patch: { status: "feito" } })}
                                className="text-xs font-semibold text-positive hover:bg-positive-soft/50 px-2 py-1 rounded-md transition-colors">
                                <Check className="h-3 w-3 inline mr-0.5" />Concluir
                              </button>
                            )}
                            {col === "feito" && (
                              <button onClick={() => upd.mutate({ id: r.id, patch: { status: "pendente" } })}
                                className="text-xs font-semibold text-muted-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors">
                                Reabrir
                              </button>
                            )}
                            <button onClick={() => setDelId(r.id)} className="ml-auto text-negative/50 hover:text-negative">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">Nenhuma tarefa</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile list */}
          <div className="lg:hidden space-y-2">
            {filtrados.map((r) => {
              const isDone = r.status === "feito";
              const isLate = r.status === "atrasado";
              return (
                <div key={r.id} className={cn("rounded-xl bg-card border border-border p-3 flex items-center gap-3 transition-all", isDone && "opacity-50", isLate && "ring-1 ring-negative/40")}>
                  <button onClick={() => upd.mutate({ id: r.id, patch: { status: isDone ? "pendente" : "feito" } })}
                    className={cn("h-9 w-9 shrink-0 rounded-lg grid place-items-center transition-all",
                      isDone ? "bg-positive text-white" : isLate ? "bg-negative-soft text-negative" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                    {isDone ? <Check className="h-4 w-4" /> : isLate ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })}
                      className={cn("h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold text-sm px-0", isDone && "line-through")} />
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <select value={r.tipo ?? "Pagamento"} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent outline-none text-xs">
                        {TIPOS.map((t) => <option key={t} className="bg-card">{t}</option>)}
                      </select>
                      <span>·</span>
                      <input type="date" defaultValue={r.data ?? ""} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })}
                        className="bg-transparent outline-none text-muted-foreground text-xs" />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {Number(r.valor ?? 0) > 0 && (
                      <span className="text-sm font-bold text-primary tabular-nums"><Money value={Number(r.valor)} /></span>
                    )}
                  </div>
                  <button onClick={() => setDelId(r.id)} className="text-negative/70 hover:text-negative shrink-0"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
            {filtrados.length === 0 && (
              <EmptyState icon={ListTodo} title="Nenhuma tarefa" description="Crie sua primeira tarefa financeira." action={<Button onClick={() => add.mutate()}><Plus className="h-4 w-4 mr-1" />Nova tarefa</Button>} />
            )}
          </div>

          {/* Lembretes */}
          <section>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-primary" /> Próximos vencimentos
            </h2>
            {lembretes.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">Nada nos próximos 3 dias — tudo em dia!</div>
            ) : (
              <div className="space-y-2">
                {lembretes.map((l, i) => (
                  <div key={i} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3 transition-all hover:shadow-sm">
                    <div className="h-9 w-9 rounded-lg bg-warning-soft text-warning grid place-items-center shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{l.texto}</div>
                      <div className="text-xs text-muted-foreground">{l.data}</div>
                    </div>
                    <Money value={l.valor} className="font-bold text-primary tabular-nums" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { del.mutate(delId); setDelId(null); } }}
        title="Excluir tarefa?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}
