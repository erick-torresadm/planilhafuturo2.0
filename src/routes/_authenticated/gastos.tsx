import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { SheetCell } from "@/components/SheetCell";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import type { GastoFixo } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => ({ meta: [{ title: "Gastos Fixos — Planilha" }] }),
  component: GastosPage,
});

const CATEGORIAS = ["Moradia","Saude","Lazer","Transporte","Imposto","Educacao","Alimentacao","Telefonia","Outros"];
const TIPOS = [["P","Parcelado"],["A","Assinatura"],["C","Contrato"]] as const;
const FORMAS = ["Pix","Cartao","Debito","Boleto"];
const FREQ = ["mensal","anual"] as const;

function GastosPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const q = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const rows: GastoFixo[] = (q.data ?? []).sort((a: any, b: any) => a.dia - b.dia) as any;

  const upd = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateRow("gastos_fixos", id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos_fixos"] }),
  });
  const add = useMutation({
    mutationFn: () => insertRow("gastos_fixos", {
      categoria: "Outros", descricao: "Novo gasto", valor: 0, tipo: "A", frequencia: "mensal",
      dia: 1, forma: "Pix", ativo: true,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gastos_fixos"] }); playSound("moeda"); toast.success("Gasto criado"); },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("gastos_fixos", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gastos_fixos"] }); playSound("pop"); },
  });

  const total = rows.filter((r) => r.ativo).reduce((a, r) => a + Number(r.valor), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Gastos Fixos</h1>
          <p className="text-sm text-muted-foreground">Lista mensal — alimenta o Fluxo Diário automaticamente</p>
        </div>
        <Button onClick={() => add.mutate()}><Plus className="w-4 h-4 mr-1" />Novo Gasto</Button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="sheet-th">Cat</th>
              <th className="sheet-th">Descrição</th>
              <th className="sheet-th text-right">Valor</th>
              <th className="sheet-th">Tipo</th>
              <th className="sheet-th">Parc</th>
              <th className="sheet-th">Freq</th>
              <th className="sheet-th">Dia</th>
              <th className="sheet-th">Forma</th>
              <th className="sheet-th">Ativo</th>
              <th className="sheet-th"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={i % 2 ? "sheet-row-alt" : ""}>
                <td className="sheet-td">
                  <select value={r.categoria} onChange={(e) => upd.mutate({ id: r.id, patch: { categoria: e.target.value } })} className="bg-transparent w-full">
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="sheet-td">
                  <Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1" />
                </td>
                <td className="sheet-td p-0">
                  <SheetCell value={Number(r.valor)} onCommit={(v) => upd.mutate({ id: r.id, patch: { valor: v } })} />
                </td>
                <td className="sheet-td">
                  <select value={r.tipo} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent w-full">
                    {TIPOS.map(([v, l]) => <option key={v} value={v}>{v} — {l}</option>)}
                  </select>
                </td>
                <td className="sheet-td text-center">
                  {r.tipo === "C" ? (
                    <Input
                      defaultValue={r.parcela_atual && r.parcela_total ? `${r.parcela_atual}/${r.parcela_total}` : ""}
                      onBlur={(e) => {
                        const m = e.target.value.match(/^(\d+)\/(\d+)$/);
                        if (m) upd.mutate({ id: r.id, patch: { parcela_atual: Number(m[1]), parcela_total: Number(m[2]) } });
                      }}
                      placeholder="3/24"
                      className="h-7 w-16 text-center border-0 shadow-none focus-visible:ring-1"
                    />
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="sheet-td">
                  <select value={r.frequencia} onChange={(e) => upd.mutate({ id: r.id, patch: { frequencia: e.target.value } })} className="bg-transparent w-full capitalize">
                    {FREQ.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </td>
                <td className="sheet-td text-center">
                  <select value={r.dia} onChange={(e) => upd.mutate({ id: r.id, patch: { dia: Number(e.target.value) } })} className="bg-transparent">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d}>{d}</option>)}
                  </select>
                </td>
                <td className="sheet-td">
                  <select value={r.forma} onChange={(e) => upd.mutate({ id: r.id, patch: { forma: e.target.value } })} className="bg-transparent w-full">
                    {FORMAS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </td>
                <td className="sheet-td text-center">
                  <button
                    onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                    className={`px-2 py-0.5 text-xs rounded font-semibold ${r.ativo ? "bg-positive text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {r.ativo ? "SIM" : "NÃO"}
                  </button>
                </td>
                <td className="sheet-td text-center">
                  <button
                    onClick={() => { if (confirm("Deletar?")) del.mutate(r.id); }}
                    className="text-negative hover:opacity-70"
                  ><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Nenhum gasto ainda. Clique em "Novo Gasto".</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="sheet-total">
              <td className="sheet-td" colSpan={2}>TOTAL MENSAL</td>
              <td className="sheet-td text-right">{brl(total)}</td>
              <td className="sheet-td" colSpan={7}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
