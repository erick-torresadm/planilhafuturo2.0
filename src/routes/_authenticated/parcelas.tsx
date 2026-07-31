import { MoneyInput } from "@/components/MoneyInput";
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
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { DataView } from "@/components/DataView";
import { valorParcelaNoMes, type Parcela } from "@/lib/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [delId, setDelId] = useState<string | null>(null);

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

  const meses12 = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(anchor.y, anchor.m + i, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }), [anchor]);

  const totalPorMes = meses12.map((mm) => rows.reduce((a, p) => a + valorParcelaNoMes(p, mm.y, mm.m), 0));
  const totalGeral = rows.reduce((a, p) => a + Number(p.valor_total), 0);
  const loading = q.isPending;

  return (
    <div className="page-container space-y-4 animate-in">
      <PageHeader
        title="Parcelas"
        subtitle="Compras parceladas do cartão"
        actions={
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline ml-1">Nova parcela</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Compromisso total" value={totalGeral} icon={CreditCard} tone="primary" />
        <KpiCard label="Este mês" value={totalPorMes[0]} tone="negative" hint="em parcelas" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        <DataView
          storageKey="parcelas-view"
          cards={
            rows.length === 0 ? (
              <EmptyState icon={CreditCard} title="Nenhuma parcela" description="Adicione compras parceladas para distribuir no fluxo." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((r) => {
                  const restantes = r.qtd_parcelas - (r.parcela_inicial - 1);
                  const parcela = Number(r.valor_total) / Math.max(1, r.qtd_parcelas);
                  const paga = r.parcela_inicial - 1;
                  const pct = (paga / r.qtd_parcelas) * 100;
                  return (
                    <div key={r.id} className="rounded-xl bg-card border border-border p-4 transition-all hover:shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0" />
                          <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{r.cartao}</span><span>·</span><span>{r.categoria}</span>
                          </div>
                        </div>
                        <button onClick={() => setDelId(r.id)} className="h-8 w-8 rounded-lg grid place-items-center text-negative/70 hover:text-negative hover:bg-negative-soft/50 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <span className="eyebrow">Parcela</span>
                          <div className="font-display text-lg font-bold text-negative mt-0.5"><Money value={parcela} signed={false} /></div>
                        </div>
                        <div className="text-right">
                          <span className="eyebrow">Total</span>
                          <div className="text-sm font-semibold text-negative mt-0.5"><Money value={Number(r.valor_total)} signed={false} /></div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{paga} de {r.qtd_parcelas}</span>
                          <span>{restantes} restantes</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
          table={
            rows.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">Nenhuma parcela.</div>
            ) : (
              <div className="rounded-xl bg-card border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="eyebrow text-left px-4 py-3">Data</th>
                      <th className="eyebrow text-left px-4 py-3">Descrição</th>
                      <th className="eyebrow text-right px-4 py-3">Total</th>
                      <th className="eyebrow text-center px-4 py-3">Qtd</th>
                      <th className="eyebrow text-center px-4 py-3">Iníc</th>
                      <th className="eyebrow text-right px-4 py-3">Parcela</th>
                      <th className="eyebrow text-left px-4 py-3">Cartão</th>
                      <th className="eyebrow text-left px-4 py-3">Categ.</th>
                      {meses12.map((mm) => <th key={`${mm.y}-${mm.m}`} className="eyebrow text-right px-2 py-3">{MESES_ABREV[mm.m]}</th>)}
                      <th className="w-10 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id} className="border-t border-border/60 hover:bg-primary/[0.02]">
                        <td className="px-4 py-2.5"><Input type="date" defaultValue={r.data} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0" /></td>
                        <td className="px-4 py-2.5"><Input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0" /></td>
                        <td className="px-4 py-2.5 text-right"><MoneyInput value={Number(r.valor_total) || 0} onCommit={(v) => v !== Number(r.valor_total) && upd.mutate({ id: r.id, patch: { valor_total: v } })} size="sm" align="right" className="w-full" /></td>
                        <td className="px-4 py-2.5 text-center"><Input type="number" min={1} defaultValue={r.qtd_parcelas} onBlur={(e) => Number(e.target.value) !== r.qtd_parcelas && upd.mutate({ id: r.id, patch: { qtd_parcelas: Number(e.target.value) } })} className="h-7 w-14 mx-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-center" /></td>
                        <td className="px-4 py-2.5 text-center"><Input type="number" min={1} defaultValue={r.parcela_inicial} onBlur={(e) => Number(e.target.value) !== r.parcela_inicial && upd.mutate({ id: r.id, patch: { parcela_inicial: Number(e.target.value) } })} className="h-7 w-14 mx-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-center" /></td>
                        <td className="px-4 py-2.5 text-right font-semibold text-primary"><Money value={Number(r.valor_total) / Math.max(1, r.qtd_parcelas)} /></td>
                        <td className="px-4 py-2.5"><select value={r.cartao ?? ""} onChange={(e) => upd.mutate({ id: r.id, patch: { cartao: e.target.value } })} className="bg-transparent outline-none text-sm">{CARTOES.map((c) => <option key={c} className="bg-card">{c}</option>)}</select></td>
                        <td className="px-4 py-2.5"><select value={r.categoria ?? ""} onChange={(e) => upd.mutate({ id: r.id, patch: { categoria: e.target.value } })} className="bg-transparent outline-none text-sm">{CATEGORIAS.map((c) => <option key={c} className="bg-card">{c}</option>)}</select></td>
                        {meses12.map((mm) => {
                          const v = valorParcelaNoMes(r, mm.y, mm.m);
                          return <td key={`${mm.y}-${mm.m}`} className={cn("px-2 py-2.5 text-right text-sm", v > 0 ? "text-negative" : "text-muted-foreground/40")}>{v > 0 ? <Money value={v} signed={false} /> : "—"}</td>;
                        })}
                        <td className="px-2 py-2.5 text-center"><button onClick={() => setDelId(r.id)} className="text-negative/70 hover:text-negative"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-bold border-t border-border">
                      <td className="px-4 py-3 text-xs uppercase tracking-wider" colSpan={8}>Total por mês</td>
                      {totalPorMes.map((t, i) => <td key={i} className="px-2 py-3 text-right text-negative"><Money value={t} signed={false} /></td>)}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          }
        />
      )}

      <NewParcelaDialog open={openNew} onOpenChange={setOpenNew} onSave={(data) => add.mutate(data)} saving={add.isPending} />
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { del.mutate(delId); setDelId(null); } }}
        title="Excluir parcela?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}

function NewParcelaDialog({ open, onOpenChange, onSave, saving }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (data: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    descricao: "", data: new Date().toISOString().slice(0, 10),
    valor_total: "", qtd_parcelas: 1, parcela_inicial: 1,
    cartao: "Cartão 1", categoria: "Outros",
  });

  function reset() {
    setForm({ descricao: "", data: new Date().toISOString().slice(0, 10), valor_total: "", qtd_parcelas: 1, parcela_inicial: 1, cartao: "Cartão 1", categoria: "Outros" });
  }

  const valorParcela = (Number(String(form.valor_total).replace(",", ".")) || 0) / Math.max(1, Number(form.qtd_parcelas));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova parcela</DialogTitle>
          <DialogDescription>Cadastre uma compra parcelada para distribuir no fluxo dos próximos meses.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!form.descricao.trim()) return;
          onSave({
            descricao: form.descricao.trim(), data: form.data,
            valor_total: Number(String(form.valor_total).replace(",", ".")) || 0,
            qtd_parcelas: Number(form.qtd_parcelas) || 1,
            parcela_inicial: Number(form.parcela_inicial) || 1,
            cartao: form.cartao, categoria: form.categoria,
          });
          reset();
        }} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Descrição</Label>
            <Input id="p-desc" autoFocus value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Notebook, Sofá…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-data">Data da compra</Label>
              <Input id="p-data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-total">Valor total (R$)</Label>
              <Input id="p-total" inputMode="decimal" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} placeholder="0,00" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Qtd. parcelas</Label>
              <Input type="number" min={1} value={form.qtd_parcelas} onChange={(e) => setForm({ ...form, qtd_parcelas: Number(e.target.value) })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Parcela inicial</Label>
              <Input type="number" min={1} value={form.parcela_inicial} onChange={(e) => setForm({ ...form, parcela_inicial: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cartão</Label>
              <select value={form.cartao} onChange={(e) => setForm({ ...form, cartao: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CARTOES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {valorParcela > 0 && (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Cada parcela: </span>
              <b className="text-negative tabular-nums"><Money value={valorParcela} signed={false} /></b>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
