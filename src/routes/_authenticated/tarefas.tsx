import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, Bell } from "lucide-react";
import { brl } from "@/lib/format";
import { useSounds } from "@/hooks/useSounds";
import { useState, useMemo } from "react";
import type { GastoFixo } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Planilha" }] }),
  component: TarefasPage,
});

const TIPOS = ["Pagamento","Receita","Investir","Economia","Cobrar","Verificar"];

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

  const filtrados = filter === "todos" ? rows : rows.filter((r) => r.status === filter);

  // Lembretes automáticos: gastos fixos com dia próximo
  const lembretes = useMemo(() => {
    const list: { data: string; texto: string }[] = [];
    const hojeD = new Date().getDate();
    const g = (gastos.data ?? []) as GastoFixo[];
    for (const gg of g) {
      if (!gg.ativo || gg.frequencia !== "mensal") continue;
      const diff = gg.dia - hojeD;
      if (diff >= 0 && diff <= 3) {
        list.push({ data: `Dia ${gg.dia}`, texto: `${gg.descricao} — ${brl(Number(gg.valor))}` });
      }
    }
    return list.sort((a, b) => a.data.localeCompare(b.data));
  }, [gastos.data]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Tarefas &amp; Lembretes</h1>
          <p className="text-sm text-muted-foreground">Organize seus pagamentos e ações financeiras</p>
        </div>
        <Button onClick={() => add.mutate()}><Plus className="w-4 h-4 mr-1" />Nova Tarefa</Button>
      </div>

      <section>
        <div className="flex gap-2 mb-2">
          {(["todos","pendente","feito","atrasado"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f}</button>
          ))}
        </div>
        <div className="border rounded-md overflow-x-auto">
          <table className="sheet-grid">
            <thead><tr><th className="sheet-th">Data</th><th className="sheet-th">Descrição</th><th className="sheet-th">Tipo</th><th className="sheet-th text-right">Valor</th><th className="sheet-th">Status</th><th className="sheet-th"></th></tr></thead>
            <tbody>
              {filtrados.map((r, i) => (
                <tr key={r.id} className={`${i % 2 ? "sheet-row-alt" : ""} ${r.status === "atrasado" ? "bg-negative-soft" : ""} ${r.status === "feito" ? "opacity-60 line-through" : ""}`}>
                  <td className="sheet-td"><Input type="date" defaultValue={r.data ?? ""} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1" /></td>
                  <td className="sheet-td"><Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1" /></td>
                  <td className="sheet-td"><select value={r.tipo ?? "Pagamento"} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent w-full">{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></td>
                  <td className="sheet-td text-right"><Input type="number" step="0.01" defaultValue={r.valor ?? 0} onBlur={(e) => Number(e.target.value) !== Number(r.valor ?? 0) && upd.mutate({ id: r.id, patch: { valor: Number(e.target.value) } })} className="h-7 border-0 shadow-none focus-visible:ring-1 text-right" /></td>
                  <td className="sheet-td">
                    <button
                      onClick={() => upd.mutate({ id: r.id, patch: { status: r.status === "feito" ? "pendente" : "feito" } })}
                      className={`px-2 py-0.5 text-xs rounded font-semibold inline-flex items-center gap-1 ${r.status === "feito" ? "bg-positive text-white" : r.status === "atrasado" ? "bg-negative text-white" : "bg-muted"}`}
                    >
                      {r.status === "feito" && <Check className="w-3 h-3" />}
                      {r.status}
                    </button>
                  </td>
                  <td className="sheet-td text-center"><button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sem tarefas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-primary mb-2">Lembretes automáticos</h2>
        <div className="space-y-2">
          {lembretes.length === 0 && <div className="text-sm text-muted-foreground">Nenhum vencimento nos próximos 3 dias.</div>}
          {lembretes.map((l, i) => (
            <div key={i} className="flex items-center gap-3 border rounded-md p-3 bg-card">
              <Bell className="w-4 h-4 text-primary" />
              <div className="text-sm"><b>{l.data}</b> — {l.texto}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
