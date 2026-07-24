import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { MESES_ABREV } from "@/lib/format";
import { useMemo, useState } from "react";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { DataView } from "@/components/DataView";
import type { Parcela } from "@/lib/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parcelas")({
  head: () => ({ meta: [{ title: "Parcelas — Planilha" }] }),
  component: ParcelasPage,
});

const CARTOES = ["Cartão 1","Cartão 2","Cartão 3","Cartão 4","Outro"];
const CATEGORIAS = ["Tecnologia","Casa","Lazer","Educacao","Saude","Vestuario","Transporte","Compras","Outros"];

function ParcelasPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [anchor] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() });
  const [openNew, setOpenNew] = useState(false);

  const q = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const rows: Parcela[] = (q.data ?? []) as any;

  const upd = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateRow("parcelas", id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parcelas"] }),
  });
  const add = useMutation({
    mutationFn: (data: any) => insertRow("parcelas", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parcelas"] }); playSound("pop"); toast.success("Parcela criada"); setOpenNew(false); },
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
  const totalGeral = rows.reduce((a, p) => a + Number(p.valor_total), 0);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold truncate">Parcelas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Compras parceladas do cartão</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="mint-gradient font-semibold shrink-0">
          <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Nova parcela</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-strong p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Compromisso total</div>
          <div className="font-display text-2xl lg:text-3xl font-bold text-primary mt-1"><Money value={totalGeral} /></div>
        </div>
        <div className="glass p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Este mês</div>
          <div className="font-display text-2xl lg:text-3xl font-bold text-negative mt-1"><Money value={totalPorMes[0]} /></div>
        </div>
      </div>

      <DataView
        storageKey="parcelas-view"
        cards={
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((r) => {
              const restantes = r.qtd_parcelas - (r.parcela_inicial - 1);
              const parcela = Number(r.valor_total) / Math.max(1, r.qtd_parcelas);
              const paga = r.parcela_inicial - 1;
              const pct = (paga / r.qtd_parcelas) * 100;
              return (
                <div key={r.id} className="glass p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center shrink-0">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0" />
                      <div className="flex gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span>{r.cartao}</span><span>·</span><span>{r.categoria}</span>
                      </div>
                    </div>
                    <button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative/70"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Parcela</div>
                      <div className="font-display text-lg font-bold text-primary"><Money value={parcela} /></div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
                      <div className="text-sm font-semibold"><Money value={Number(r.valor_total)} /></div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{paga} de {r.qtd_parcelas}</span>
                      <span>{restantes} restantes</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full mint-gradient" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && <div className="glass p-8 text-center text-sm text-muted-foreground sm:col-span-2">Nenhuma parcela.</div>}
          </div>
        }
        table={
          <div className="glass overflow-x-auto">
            <table className="sheet-grid">
              <thead>
                <tr>
                  <th className="sheet-th">Data</th>
                  <th className="sheet-th">Descrição</th>
                  <th className="sheet-th text-right">Total</th>
                  <th className="sheet-th text-center">Qtd</th>
                  <th className="sheet-th text-center">Iníc</th>
                  <th className="sheet-th text-right">Parcela</th>
                  <th className="sheet-th">Cartão</th>
                  <th className="sheet-th">Categ.</th>
                  {meses6.map((mm) => <th key={`${mm.y}-${mm.m}`} className="sheet-th text-right">{MESES_ABREV[mm.m]}</th>)}
                  <th className="sheet-th"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? "sheet-row-alt" : ""}>
                    <td className="sheet-td"><Input type="date" defaultValue={r.data} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1" /></td>
                    <td className="sheet-td"><Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1" /></td>
                    <td className="sheet-td text-right"><Input type="number" step="0.01" defaultValue={r.valor_total} onBlur={(e) => Number(e.target.value) !== Number(r.valor_total) && upd.mutate({ id: r.id, patch: { valor_total: Number(e.target.value) } })} className="h-7 w-24 ml-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-right" /></td>
                    <td className="sheet-td text-center"><Input type="number" min={1} defaultValue={r.qtd_parcelas} onBlur={(e) => Number(e.target.value) !== r.qtd_parcelas && upd.mutate({ id: r.id, patch: { qtd_parcelas: Number(e.target.value) } })} className="h-7 w-14 mx-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-center" /></td>
                    <td className="sheet-td text-center"><Input type="number" min={1} defaultValue={r.parcela_inicial} onBlur={(e) => Number(e.target.value) !== r.parcela_inicial && upd.mutate({ id: r.id, patch: { parcela_inicial: Number(e.target.value) } })} className="h-7 w-14 mx-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-center" /></td>
                    <td className="sheet-td text-right font-semibold text-primary"><Money value={Number(r.valor_total) / Math.max(1, r.qtd_parcelas)} /></td>
                    <td className="sheet-td"><select value={r.cartao ?? ""} onChange={(e) => upd.mutate({ id: r.id, patch: { cartao: e.target.value } })} className="bg-transparent w-full outline-none">{CARTOES.map((c) => <option key={c} className="bg-card">{c}</option>)}</select></td>
                    <td className="sheet-td"><select value={r.categoria ?? ""} onChange={(e) => upd.mutate({ id: r.id, patch: { categoria: e.target.value } })} className="bg-transparent w-full outline-none">{CATEGORIAS.map((c) => <option key={c} className="bg-card">{c}</option>)}</select></td>
                    {meses6.map((mm) => {
                      const v = valorNoMes(r, mm.y, mm.m);
                      return <td key={`${mm.y}-${mm.m}`} className={`sheet-td text-right ${v > 0 ? "text-negative" : "text-muted-foreground/40"}`}>{v > 0 ? <Money value={v} /> : "—"}</td>;
                    })}
                    <td className="sheet-td text-center"><button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative/70 hover:text-negative"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={14} className="p-8 text-center text-muted-foreground">Nenhuma parcela.</td></tr>}
              </tbody>
              <tfoot>
                <tr className="sheet-total">
                  <td className="sheet-td" colSpan={8}>Total por mês</td>
                  {totalPorMes.map((t, i) => <td key={i} className="sheet-td text-right text-negative"><Money value={t} /></td>)}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      />
    </div>
  );
}
