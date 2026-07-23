import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { brl, MESES_ABREV } from "@/lib/format";
import { useMemo, useState } from "react";
import { useSounds } from "@/hooks/useSounds";
import type { Parcela } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/parcelas")({
  head: () => ({ meta: [{ title: "Parcelas — Planilha" }] }),
  component: ParcelasPage,
});

const CARTOES = ["Nubank","XP","Itau","Bradesco","Outro"];
const CATEGORIAS = ["Tecnologia","Casa","Lazer","Educacao","Saude","Vestuario","Transporte","Compras","Outros"];

function ParcelasPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [anchor] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() });

  const q = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const rows: Parcela[] = (q.data ?? []) as any;

  const upd = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateRow("parcelas", id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parcelas"] }),
  });
  const add = useMutation({
    mutationFn: () => insertRow("parcelas", {
      data: new Date().toISOString().slice(0, 10),
      descricao: "Nova compra", valor_total: 0, qtd_parcelas: 1, parcela_inicial: 1,
      cartao: "Nubank", categoria: "Outros",
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parcelas"] }); playSound("pop"); },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("parcelas", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parcelas"] }),
  });

  const meses6 = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(anchor.y, anchor.m + i, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }), [anchor]);

  function valorNoMes(p: Parcela, y: number, m: number) {
    const dt = new Date(p.data + "T00:00:00");
    const monthsAhead = (y - dt.getFullYear()) * 12 + (m - dt.getMonth());
    if (monthsAhead < 0) return 0;
    const restantes = p.qtd_parcelas - (p.parcela_inicial - 1);
    if (monthsAhead >= restantes) return 0;
    return (Number(p.valor_total) || 0) / (Number(p.qtd_parcelas) || 1);
  }

  const totalPorMes = meses6.map((mm) => rows.reduce((a, p) => a + valorNoMes(p, mm.y, mm.m), 0));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Parcelas</h1>
          <p className="text-sm text-muted-foreground">Compras parceladas — distribuídas automaticamente pelos meses</p>
        </div>
        <Button onClick={() => add.mutate()}><Plus className="w-4 h-4 mr-1" />Nova Parcela</Button>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="sheet-th">Data</th>
              <th className="sheet-th">Descrição</th>
              <th className="sheet-th text-right">Valor Total</th>
              <th className="sheet-th text-center">Qtd</th>
              <th className="sheet-th text-center">Iníc</th>
              <th className="sheet-th text-right">Parcela</th>
              <th className="sheet-th">Cartão</th>
              <th className="sheet-th">Categoria</th>
              <th className="sheet-th text-center">Restantes</th>
              {meses6.map((mm) => <th key={`${mm.y}-${mm.m}`} className="sheet-th text-right">{MESES_ABREV[mm.m]}</th>)}
              <th className="sheet-th"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const restantes = r.qtd_parcelas - (r.parcela_inicial - 1);
              return (
                <tr key={r.id} className={i % 2 ? "sheet-row-alt" : ""}>
                  <td className="sheet-td">
                    <Input type="date" defaultValue={r.data} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1" />
                  </td>
                  <td className="sheet-td">
                    <Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1" />
                  </td>
                  <td className="sheet-td text-right">
                    <Input type="number" step="0.01" defaultValue={r.valor_total} onBlur={(e) => Number(e.target.value) !== Number(r.valor_total) && upd.mutate({ id: r.id, patch: { valor_total: Number(e.target.value) } })} className="h-7 border-0 shadow-none focus-visible:ring-1 text-right" />
                  </td>
                  <td className="sheet-td text-center">
                    <Input type="number" min={1} max={48} defaultValue={r.qtd_parcelas} onBlur={(e) => Number(e.target.value) !== r.qtd_parcelas && upd.mutate({ id: r.id, patch: { qtd_parcelas: Number(e.target.value) } })} className="h-7 w-14 border-0 shadow-none focus-visible:ring-1 text-center" />
                  </td>
                  <td className="sheet-td text-center">
                    <Input type="number" min={1} defaultValue={r.parcela_inicial} onBlur={(e) => Number(e.target.value) !== r.parcela_inicial && upd.mutate({ id: r.id, patch: { parcela_inicial: Number(e.target.value) } })} className="h-7 w-14 border-0 shadow-none focus-visible:ring-1 text-center" />
                  </td>
                  <td className="sheet-td text-right font-medium">{brl(Number(r.valor_total) / Math.max(1, r.qtd_parcelas))}</td>
                  <td className="sheet-td">
                    <select value={r.cartao ?? ""} onChange={(e) => upd.mutate({ id: r.id, patch: { cartao: e.target.value } })} className="bg-transparent w-full">
                      {CARTOES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="sheet-td">
                    <select value={r.categoria ?? ""} onChange={(e) => upd.mutate({ id: r.id, patch: { categoria: e.target.value } })} className="bg-transparent w-full">
                      {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="sheet-td text-center">{restantes}</td>
                  {meses6.map((mm) => {
                    const v = valorNoMes(r, mm.y, mm.m);
                    return <td key={`${mm.y}-${mm.m}`} className={`sheet-td text-right ${v > 0 ? "bg-cell-out/40" : ""}`}>{v > 0 ? brl(v) : ""}</td>;
                  })}
                  <td className="sheet-td text-center">
                    <button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={15} className="p-6 text-center text-muted-foreground">Nenhuma parcela. Clique em "Nova Parcela".</td></tr>}
          </tbody>
          <tfoot>
            <tr className="sheet-total">
              <td className="sheet-td" colSpan={9}>TOTAL POR MÊS</td>
              {totalPorMes.map((t, i) => <td key={i} className="sheet-td text-right">{brl(t)}</td>)}
              <td className="sheet-td"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
