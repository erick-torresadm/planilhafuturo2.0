import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { DataView } from "@/components/DataView";
import type { GastoFixo } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => ({ meta: [{ title: "Gastos Fixos — Planilha" }] }),
  component: GastosPage,
});

const CATEGORIAS = ["Moradia","Saude","Lazer","Transporte","Imposto","Educacao","Alimentacao","Telefonia","Outros"];
const CAT_EMOJI: Record<string, string> = { Moradia: "🏠", Saude: "💊", Lazer: "🎮", Transporte: "🚗", Imposto: "📋", Educacao: "📚", Alimentacao: "🍽️", Telefonia: "📱", Outros: "💳" };
const TIPOS = [["P","Parcelado"],["A","Assinatura"],["C","Contrato"]] as const;
const FORMAS = ["Pix","Cartao","Debito","Boleto"];
const FREQ = ["mensal","anual"] as const;

function GastosPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const q = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const rows: GastoFixo[] = ((q.data ?? []) as any).slice().sort((a: any, b: any) => a.dia - b.dia);

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

  const totalAtivo = rows.filter((r) => r.ativo).reduce((a, r) => a + Number(r.valor), 0);
  const totalMedio = totalAtivo;
  const qtdAtivos = rows.filter((r) => r.ativo).length;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Gastos Fixos</h1>
          <p className="text-sm text-muted-foreground">Alimenta seu fluxo diário automaticamente</p>
        </div>
        <Button onClick={() => add.mutate()} className="mint-gradient font-semibold">
          <Plus className="h-4 w-4 mr-1" />Novo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-strong p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total ativo/mês</div>
          <div className="font-display text-2xl lg:text-3xl font-bold text-primary mt-1"><Money value={totalMedio} /></div>
        </div>
        <div className="glass p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ativos</div>
          <div className="font-display text-2xl lg:text-3xl font-bold mt-1">{qtdAtivos}<span className="text-sm text-muted-foreground font-normal"> de {rows.length}</span></div>
        </div>
      </div>

      <DataView
        storageKey="gastos-view"
        cards={
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className={`glass p-4 ${!r.ativo ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center text-lg shrink-0">{CAT_EMOJI[r.categoria] ?? "💳"}</div>
                  <div className="flex-1 min-w-0">
                    <Input defaultValue={r.descricao}
                      onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })}
                      className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold text-sm px-0" />
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{r.categoria}</span>
                      <span>·</span>
                      <span>Dia {r.dia}</span>
                      <span>·</span>
                      <span>{r.forma}</span>
                    </div>
                  </div>
                  <button onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                    className={`tap-target grid place-items-center rounded-lg ${r.ativo ? "text-primary" : "text-muted-foreground"}`}>
                    {r.ativo ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <Input type="number" step="0.01" defaultValue={r.valor}
                    onBlur={(e) => Number(e.target.value) !== Number(r.valor) && upd.mutate({ id: r.id, patch: { valor: Number(e.target.value) } })}
                    className="h-9 w-32 text-lg font-bold text-primary tabular-nums" />
                  <button onClick={() => confirm("Deletar?") && del.mutate(r.id)}
                    className="tap-target grid place-items-center text-negative/70 hover:text-negative">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="glass p-8 text-center text-sm text-muted-foreground sm:col-span-2">
                Nenhum gasto ainda. Toque em "Novo".
              </div>
            )}
          </div>
        }
        table={
          <div className="glass overflow-x-auto">
            <table className="sheet-grid">
              <thead>
                <tr>
                  <th className="sheet-th">Categoria</th>
                  <th className="sheet-th">Descrição</th>
                  <th className="sheet-th text-right">Valor</th>
                  <th className="sheet-th">Tipo</th>
                  <th className="sheet-th">Freq</th>
                  <th className="sheet-th text-center">Dia</th>
                  <th className="sheet-th">Forma</th>
                  <th className="sheet-th text-center">Ativo</th>
                  <th className="sheet-th"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={`${i % 2 ? "sheet-row-alt" : ""} ${!r.ativo ? "opacity-50" : ""}`}>
                    <td className="sheet-td">
                      <select value={r.categoria} onChange={(e) => upd.mutate({ id: r.id, patch: { categoria: e.target.value } })} className="bg-transparent w-full outline-none">
                        {CATEGORIAS.map((c) => <option key={c} className="bg-card">{CAT_EMOJI[c]} {c}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td">
                      <Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-1" />
                    </td>
                    <td className="sheet-td text-right">
                      <Input type="number" step="0.01" defaultValue={r.valor} onBlur={(e) => Number(e.target.value) !== Number(r.valor) && upd.mutate({ id: r.id, patch: { valor: Number(e.target.value) } })} className="h-7 w-24 ml-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-right font-semibold" />
                    </td>
                    <td className="sheet-td">
                      <select value={r.tipo} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent w-full outline-none">
                        {TIPOS.map(([v, l]) => <option key={v} value={v} className="bg-card">{l}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td">
                      <select value={r.frequencia} onChange={(e) => upd.mutate({ id: r.id, patch: { frequencia: e.target.value } })} className="bg-transparent w-full outline-none capitalize">
                        {FREQ.map((f) => <option key={f} value={f} className="bg-card capitalize">{f}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td text-center">
                      <select value={r.dia} onChange={(e) => upd.mutate({ id: r.id, patch: { dia: Number(e.target.value) } })} className="bg-transparent outline-none">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} className="bg-card">{d}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td">
                      <select value={r.forma} onChange={(e) => upd.mutate({ id: r.id, patch: { forma: e.target.value } })} className="bg-transparent w-full outline-none">
                        {FORMAS.map((f) => <option key={f} className="bg-card">{f}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td text-center">
                      <button onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                        className={`chip ${r.ativo ? "bg-positive-soft text-positive" : "bg-black/5 text-muted-foreground"}`}>
                        {r.ativo ? "ON" : "OFF"}
                      </button>
                    </td>
                    <td className="sheet-td text-center">
                      <button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative/70 hover:text-negative">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum gasto ainda.</td></tr>}
              </tbody>
              <tfoot>
                <tr className="sheet-total">
                  <td className="sheet-td" colSpan={2}>Total mensal</td>
                  <td className="sheet-td text-right text-primary"><Money value={totalAtivo} /></td>
                  <td className="sheet-td" colSpan={6}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      />
    </div>
  );
}
