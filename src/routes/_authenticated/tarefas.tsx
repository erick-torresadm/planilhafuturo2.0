import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, Bell, Clock, AlertTriangle } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { useState, useMemo } from "react";
import { Money } from "@/components/Money";
import { cn } from "@/lib/utils";
import type { GastoFixo } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Planilha" }] }),
  component: TarefasPage,
});

const TIPOS = ["Pagamento","Receita","Investir","Economia","Cobrar","Verificar"];
const TIPO_EMOJI: Record<string, string> = { Pagamento: "💸", Receita: "💰", Investir: "📈", Economia: "🐷", Cobrar: "📞", Verificar: "🔍" };

function TarefasPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [filter, setFilter] = useState<"todos" | "pendente" | "feito" | "atrasado">("todos");

  const q = useQuery({ queryKey: ["tarefas"], queryFn: () => selectAll("tarefas") });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });

  const add = useMutation({
    mutationFn: () => insertRow("tarefas", { data: new Date().toISOString().slice(0, 10), descricao: "Nova tarefa", tipo: "Pagamento", status: "pendente" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas"] }),
  });
  const upd = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("tarefas", id, patch),
    onSuccess: (_d, v: any) => {
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
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Pagamentos e lembretes financeiros</p>
        </div>
        <Button onClick={() => add.mutate()} className="mint-gradient font-semibold">
          <Plus className="h-4 w-4 mr-1" />Nova
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {(["todos","pendente","atrasado","feito"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("shrink-0 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider capitalize flex items-center gap-1.5 transition-all",
              filter === f ? "mint-gradient" : "glass text-muted-foreground hover:text-foreground")}>
            {f} <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {filtrados.map((r) => {
          const isDone = r.status === "feito";
          const isLate = r.status === "atrasado";
          return (
            <div key={r.id} className={cn("glass p-3 flex items-center gap-3", isDone && "opacity-50", isLate && "ring-1 ring-negative/40")}>
              <button onClick={() => upd.mutate({ id: r.id, patch: { status: isDone ? "pendente" : "feito" } })}
                className={cn("h-9 w-9 shrink-0 rounded-lg grid place-items-center transition-all",
                  isDone ? "mint-gradient" : isLate ? "bg-negative-soft text-negative" : "bg-black/5 text-muted-foreground hover:bg-black/10")}>
                {isDone ? <Check className="h-4 w-4" /> : isLate ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })}
                  className={cn("h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold text-sm px-0", isDone && "line-through")} />
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                  <select value={r.tipo ?? "Pagamento"} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent outline-none">
                    {TIPOS.map((t) => <option key={t} className="bg-card">{TIPO_EMOJI[t]} {t}</option>)}
                  </select>
                  <span>·</span>
                  <input type="date" defaultValue={r.data ?? ""} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })}
                    className="bg-transparent outline-none text-muted-foreground" />
                </div>
              </div>
              <div className="text-right shrink-0">
                <MoneyInput
                  value={Number(r.valor ?? 0)}
                  onCommit={(v) => v !== Number(r.valor ?? 0) && upd.mutate({ id: r.id, patch: { valor: v } })}
                  size="sm"
                  align="right"
                  inputClassName="font-bold text-primary"
                />
              </div>
              <button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative/70 hover:text-negative shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
        {filtrados.length === 0 && <div className="glass p-8 text-center text-sm text-muted-foreground">Sem tarefas.</div>}
      </div>

      {/* Lembretes */}
      <section>
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-primary" /> Próximos vencimentos
        </h2>
        {lembretes.length === 0 ? (
          <div className="glass p-6 text-center text-sm text-muted-foreground">Nada nos próximos 3 dias 🎉</div>
        ) : (
          <div className="space-y-2">
            {lembretes.map((l, i) => (
              <div key={i} className="glass p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-warning-soft text-warning grid place-items-center shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{l.texto}</div>
                  <div className="text-[11px] text-muted-foreground">{l.data}</div>
                </div>
                <Money value={l.valor} className="font-bold text-primary" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
