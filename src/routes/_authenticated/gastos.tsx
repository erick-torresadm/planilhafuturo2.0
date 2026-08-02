import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Zap, ZapOff, Search, TrendingDown, Home, Heart, Gamepad2, Car, FileText, BookOpen, UtensilsCrossed, Smartphone, MoreHorizontal, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { DataView } from "@/components/DataView";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import type { GastoFixo } from "@/lib/finance";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => ({ meta: [{ title: "Gastos Fixos — Planilha" }] }),
  component: GastosPage,
});

const CATEGORIAS = ["Moradia","Saude","Lazer","Transporte","Imposto","Educacao","Alimentacao","Telefonia","Outros"];

const CAT_ICON: Record<string, typeof Home> = {
  Moradia: Home, Saude: Heart, Lazer: Gamepad2, Transporte: Car,
  Imposto: FileText, Educacao: BookOpen, Alimentacao: UtensilsCrossed,
  Telefonia: Smartphone, Outros: MoreHorizontal,
};

const TIPOS = [["P","Parcelado"],["A","Assinatura"],["C","Contrato"]] as const;
const FORMAS = ["Pix","Cartao","Debito","Boleto"];
const FREQ = ["mensal","anual"] as const;

function GastosPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("Todas");
  const [openNew, setOpenNew] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const allRows: GastoFixo[] = ((q.data ?? []) as any).slice().sort((a: any, b: any) => a.dia - b.dia);

  const rows = useMemo(() => allRows.filter((r) => {
    if (filterCat !== "Todas" && r.categoria !== filterCat) return false;
    if (search && !r.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allRows, search, filterCat]);

  const upd = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateRow("gastos_fixos", id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["gastos_fixos"] });
      const prev = qc.getQueryData(["gastos_fixos"]) as any;
      qc.setQueryData(["gastos_fixos"], (old: any[]) => (old ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { prev };
    },
    onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(["gastos_fixos"], ctx.prev); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos_fixos"] }),
  });
  const add = useMutation({
    mutationFn: (data: any) => insertRow("gastos_fixos", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gastos_fixos"] }); playSound("moeda"); toast.success("Gasto criado"); setOpenNew(false); },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("gastos_fixos", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gastos_fixos"] }); playSound("pop"); },
  });

  const totalAtivo = allRows.filter((r) => r.ativo).reduce((a, r) => a + Number(r.valor), 0);
  const qtdAtivos = allRows.filter((r) => r.ativo).length;
  const maiorGasto = allRows.filter((r) => r.ativo).reduce((max, r) => Number(r.valor) > Number(max?.valor ?? 0) ? r : max, null as GastoFixo | null);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = { Todas: allRows.length };
    for (const r of allRows) m[r.categoria] = (m[r.categoria] ?? 0) + 1;
    return m;
  }, [allRows]);

  const loading = q.isPending;

  return (
    <div className="page-container space-y-4 animate-in">
      <PageHeader
        title="Gastos Fixos"
        subtitle="Alimenta seu fluxo diário automaticamente"
        actions={
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline ml-1">Novo gasto</span>
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          label="Total ativo/mês"
          value={totalAtivo}
          icon={TrendingDown}
          hint={`${qtdAtivos} de ${allRows.length} contas`}
          tone="primary"
        />
        <KpiCard
          label="Média por conta"
          value={qtdAtivos ? totalAtivo / qtdAtivos : 0}
          hint="Ticket médio mensal"
        />
        <div className="metric-card col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Maior gasto</span>
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className="font-display text-xl font-bold mt-1 tabular-nums truncate text-primary">
            {maiorGasto ? <Money value={Number(maiorGasto.valor)} /> : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{maiorGasto?.descricao ?? "—"}</div>
        </div>
      </div>

      {/* Search + category chips */}
      <div className="rounded-xl bg-card border border-border p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição…"
            className="w-full h-10 pl-9 pr-3 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Todas", ...CATEGORIAS].map((c) => {
            const active = filterCat === c;
            const Icon = CAT_ICON[c] ?? MoreHorizontal;
            const count = catCounts[c] ?? 0;
            return (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={cn(
                  "chip transition-all",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70 hover:bg-accent",
                )}
              >
                {c !== "Todas" && <Icon className="h-3 w-3" />}
                <span>{c}</span>
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => <div key={i} className="skeleton h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <DataView
          storageKey="gastos-view"
          cards={
            rows.length === 0 ? (
              <EmptyState icon={Search} title="Nenhum gasto" description="Nenhum gasto encontrado com esse filtro." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((r) => {
                  const Icon = CAT_ICON[r.categoria] ?? MoreHorizontal;
                  return (
                    <div key={r.id} className={cn("rounded-xl bg-card border border-border p-4 transition-all hover:shadow-sm", !r.ativo && "opacity-50")}>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <input defaultValue={r.descricao}
                            onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })}
                            className="w-full bg-transparent outline-none font-semibold text-sm" />
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{r.categoria}</span><span>·</span>
                            <span>Dia {r.dia}</span><span>·</span>
                            <span>{r.forma}</span>
                          </div>
                        </div>
                        <button onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                          className={cn("h-8 w-8 rounded-lg grid place-items-center transition-colors", r.ativo ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                          {r.ativo ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <MoneyInput
                          value={Number(r.valor) || 0}
                          onCommit={(v) => v !== Number(r.valor) && upd.mutate({ id: r.id, patch: { valor: v } })}
                          size="md"
                          align="left"
                          inputClassName="text-lg font-bold text-primary"
                        />
                        <button onClick={() => setDelId(r.id)}
                          className="h-8 w-8 rounded-lg grid place-items-center text-negative/70 hover:text-negative hover:bg-negative-soft/50 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
          table={
            rows.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">Nenhum gasto encontrado.</div>
            ) : (
              <div className="rounded-xl bg-card border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="eyebrow text-left px-4 py-3 w-[160px]">Categoria</th>
                      <th className="eyebrow text-left px-4 py-3">Descrição</th>
                      <th className="eyebrow text-right px-4 py-3 w-[130px]">Valor</th>
                      <th className="eyebrow text-left px-4 py-3 w-[130px]">Tipo</th>
                      <th className="eyebrow text-left px-4 py-3 w-[90px]">Freq</th>
                      <th className="eyebrow text-center px-4 py-3 w-[60px]">Dia</th>
                      <th className="eyebrow text-left px-4 py-3 w-[100px]">Forma</th>
                      <th className="eyebrow text-center px-4 py-3 w-[70px]">Ativo</th>
                      <th className="w-10 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const Icon = CAT_ICON[r.categoria] ?? MoreHorizontal;
                      return (
                        <tr key={r.id} className={cn("border-t border-border/60 hover:bg-primary/[0.02]", !r.ativo && "opacity-50")}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <select value={r.categoria} onChange={(e) => upd.mutate({ id: r.id, patch: { categoria: e.target.value } })} className="bg-transparent outline-none text-sm">
                                {CATEGORIAS.map((c) => <option key={c} className="bg-card">{c}</option>)}
                              </select>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="w-full bg-transparent outline-none font-medium" />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <MoneyInput
                              value={Number(r.valor) || 0}
                              onCommit={(v) => v !== Number(r.valor) && upd.mutate({ id: r.id, patch: { valor: v } })}
                              size="sm" align="right" inputClassName="font-semibold" className="w-full"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <select value={r.tipo} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent outline-none text-sm">
                              {TIPOS.map(([v, l]) => <option key={v} value={v} className="bg-card">{l}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <select value={r.frequencia} onChange={(e) => upd.mutate({ id: r.id, patch: { frequencia: e.target.value } })} className="bg-transparent outline-none text-sm capitalize">
                              {FREQ.map((f) => <option key={f} value={f} className="bg-card capitalize">{f}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <select value={r.dia} onChange={(e) => upd.mutate({ id: r.id, patch: { dia: Number(e.target.value) } })} className="bg-transparent outline-none text-sm text-center">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} className="bg-card">{d}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <select value={r.forma} onChange={(e) => upd.mutate({ id: r.id, patch: { forma: e.target.value } })} className="bg-transparent outline-none text-sm">
                              {FORMAS.map((f) => <option key={f} className="bg-card">{f}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                              role="switch"
                              aria-checked={r.ativo}
                              className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", r.ativo ? "bg-primary" : "bg-muted-foreground/30")}
                            >
                              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", r.ativo ? "translate-x-4" : "translate-x-0.5")} />
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button onClick={() => setDelId(r.id)} className="text-muted-foreground/60 hover:text-negative transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-bold border-t border-border">
                      <td className="px-4 py-3 text-xs uppercase tracking-wider" colSpan={2}>Total mensal ({rows.filter((r) => r.ativo).length} ativos)</td>
                      <td className="px-4 py-3 text-right text-primary"><Money value={rows.filter((r) => r.ativo).reduce((a, r) => a + Number(r.valor), 0)} /></td>
                      <td className="px-4 py-3" colSpan={6}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          }
        />
      )}

      <NewGastoDialog open={openNew} onOpenChange={setOpenNew} onSave={(data) => add.mutate(data)} saving={add.isPending} />
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { del.mutate(delId); setDelId(null); } }}
        title="Excluir gasto?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}

function NewGastoDialog({ open, onOpenChange, onSave, saving }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (data: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    descricao: "", categoria: "Outros", valor: "", tipo: "A",
    frequencia: "mensal" as "mensal" | "anual", dia: 1, mes_anual: 1, forma: "Pix",
  });

  function reset() {
    setForm({ descricao: "", categoria: "Outros", valor: "", tipo: "A", frequencia: "mensal", dia: 1, mes_anual: 1, forma: "Pix" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo gasto fixo</DialogTitle>
          <DialogDescription>Preencha os dados para adicionar ao seu fluxo mensal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!form.descricao.trim()) return;
          onSave({
            descricao: form.descricao.trim(), categoria: form.categoria,
            valor: Number(String(form.valor).replace(",", ".")) || 0,
            tipo: form.tipo, frequencia: form.frequencia,
            dia: Number(form.dia) || 1,
            mes_anual: form.frequencia === "anual" ? Number(form.mes_anual) || 1 : null,
            forma: form.forma, ativo: true,
          });
          reset();
        }} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Descrição</Label>
            <Input id="g-desc" autoFocus value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Aluguel, Netflix…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-valor">Valor (R$)</Label>
              <Input id="g-valor" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <select value={form.frequencia} onChange={(e) => setForm({ ...form, frequencia: e.target.value as any })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize">
                {FREQ.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia do mês</Label>
              <select value={form.dia} onChange={(e) => setForm({ ...form, dia: Number(e.target.value) })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {form.frequencia === "anual" && (
            <div className="space-y-1.5">
              <Label>Mês do ano</Label>
              <select value={form.mes_anual} onChange={(e) => setForm({ ...form, mes_anual: Number(e.target.value) })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Forma</Label>
              <select value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
