import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Zap, ZapOff, Search, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { DataView } from "@/components/DataView";
import type { GastoFixo } from "@/lib/finance";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => ({ meta: [{ title: "Gastos Fixos — Planilha" }] }),
  component: GastosPage,
});

const CATEGORIAS = ["Moradia","Saude","Lazer","Transporte","Imposto","Educacao","Alimentacao","Telefonia","Outros"];
const CAT_EMOJI: Record<string, string> = { Moradia: "🏠", Saude: "💊", Lazer: "🎮", Transporte: "🚗", Imposto: "📋", Educacao: "📚", Alimentacao: "🍽️", Telefonia: "📱", Outros: "💳" };
const CAT_COLOR: Record<string, string> = {
  Moradia: "bg-emerald-100 text-emerald-900",
  Saude: "bg-rose-100 text-rose-900",
  Lazer: "bg-violet-100 text-violet-900",
  Transporte: "bg-sky-100 text-sky-900",
  Imposto: "bg-amber-100 text-amber-900",
  Educacao: "bg-indigo-100 text-indigo-900",
  Alimentacao: "bg-orange-100 text-orange-900",
  Telefonia: "bg-cyan-100 text-cyan-900",
  Outros: "bg-stone-100 text-stone-900",
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

  const q = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const allRows: GastoFixo[] = ((q.data ?? []) as any).slice().sort((a: any, b: any) => a.dia - b.dia);

  const rows = useMemo(() => allRows.filter((r) => {
    if (filterCat !== "Todas" && r.categoria !== filterCat) return false;
    if (search && !r.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allRows, search, filterCat]);

  const upd = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateRow("gastos_fixos", id, patch),
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

  // group counts by category for the chip filter
  const catCounts = useMemo(() => {
    const m: Record<string, number> = { Todas: allRows.length };
    for (const r of allRows) m[r.categoria] = (m[r.categoria] ?? 0) + 1;
    return m;
  }, [allRows]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">Gastos Fixos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Alimenta seu fluxo diário automaticamente</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="mint-gradient font-semibold shadow-sm shrink-0">
          <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Novo gasto</span>
        </Button>
      </div>

      {/* KPIs — 3 cartões */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="glass-strong p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_top_right,var(--color-primary),transparent_60%)]" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total ativo/mês</div>
            <div className="font-display text-2xl lg:text-3xl font-bold text-primary mt-1"><Money value={totalAtivo} /></div>
            <div className="text-[11px] text-muted-foreground mt-1">{qtdAtivos} de {allRows.length} contas</div>
          </div>
        </div>
        <div className="glass p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Média por conta</div>
          <div className="font-display text-2xl lg:text-3xl font-bold mt-1 tabular-nums">
            <Money value={qtdAtivos ? totalAtivo / qtdAtivos : 0} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Ticket médio mensal</div>
        </div>
        <div className="glass p-4 col-span-2 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Maior gasto
          </div>
          <div className="font-display text-xl lg:text-2xl font-bold mt-1 tabular-nums truncate">
            {maiorGasto ? <Money value={Number(maiorGasto.valor)} /> : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 truncate">{maiorGasto?.descricao ?? "—"}</div>
        </div>
      </div>

      {/* Search + category chips */}
      <div className="glass p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição…"
            className="w-full h-10 pl-9 pr-3 bg-muted/60 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Todas", ...CATEGORIAS].map((c) => {
            const active = filterCat === c;
            const count = catCounts[c] ?? 0;
            return (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`chip transition-all ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70 hover:bg-accent"}`}
              >
                {c !== "Todas" && <span>{CAT_EMOJI[c]}</span>}
                <span>{c}</span>
                <span className={`ml-1 text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <DataView
        storageKey="gastos-view"
        cards={
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className={`glass p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${!r.ativo ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg grid place-items-center text-lg shrink-0 ${CAT_COLOR[r.categoria]}`}>{CAT_EMOJI[r.categoria] ?? "💳"}</div>
                  <div className="flex-1 min-w-0">
                    <input defaultValue={r.descricao}
                      onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })}
                      className="cell-input font-semibold text-sm" />
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{r.categoria}</span><span>·</span>
                      <span>Dia {r.dia}</span><span>·</span>
                      <span>{r.forma}</span>
                    </div>
                  </div>
                  <button onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                    className={`tap-target grid place-items-center rounded-lg ${r.ativo ? "text-primary" : "text-muted-foreground"}`}>
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
                  <button onClick={() => confirm("Deletar?") && del.mutate(r.id)}
                    className="tap-target grid place-items-center text-negative/70 hover:text-negative">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="glass p-8 text-center text-sm text-muted-foreground sm:col-span-2">
                Nenhum gasto encontrado.
              </div>
            )}
          </div>
        }
        table={
          <div className="glass overflow-x-auto">
            <table className="sheet-grid">
              <thead>
                <tr>
                  <th className="sheet-th w-[160px]">Categoria</th>
                  <th className="sheet-th">Descrição</th>
                  <th className="sheet-th text-right w-[130px]">Valor</th>
                  <th className="sheet-th w-[130px]">Tipo</th>
                  <th className="sheet-th w-[110px]">Freq</th>
                  <th className="sheet-th text-center w-[70px]">Dia</th>
                  <th className="sheet-th w-[110px]">Forma</th>
                  <th className="sheet-th text-center w-[80px]">Ativo</th>
                  <th className="sheet-th sheet-th-last w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={`${i % 2 ? "sheet-row-alt" : ""} ${!r.ativo ? "opacity-50" : ""}`}>
                    <td className="sheet-td">
                      <div className="flex items-center gap-2">
                        <span className={`h-6 w-6 rounded-md grid place-items-center text-xs ${CAT_COLOR[r.categoria]}`}>{CAT_EMOJI[r.categoria]}</span>
                        <select value={r.categoria} onChange={(e) => upd.mutate({ id: r.id, patch: { categoria: e.target.value } })} className="cell-input">
                          {CATEGORIAS.map((c) => <option key={c} className="bg-card">{c}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="sheet-td">
                      <input defaultValue={r.descricao} onBlur={(e) => e.target.value !== r.descricao && upd.mutate({ id: r.id, patch: { descricao: e.target.value } })} className="cell-input font-medium" />
                    </td>
                    <td className="sheet-td text-right">
                      <MoneyInput
                        value={Number(r.valor) || 0}
                        onCommit={(v) => v !== Number(r.valor) && upd.mutate({ id: r.id, patch: { valor: v } })}
                        size="sm"
                        align="right"
                        inputClassName="font-semibold"
                        className="w-full"
                      />
                    </td>
                    <td className="sheet-td">
                      <select value={r.tipo} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="cell-input">
                        {TIPOS.map(([v, l]) => <option key={v} value={v} className="bg-card">{l}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td">
                      <select value={r.frequencia} onChange={(e) => upd.mutate({ id: r.id, patch: { frequencia: e.target.value } })} className="cell-input capitalize">
                        {FREQ.map((f) => <option key={f} value={f} className="bg-card capitalize">{f}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td text-center">
                      <select value={r.dia} onChange={(e) => upd.mutate({ id: r.id, patch: { dia: Number(e.target.value) } })} className="cell-input text-center">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} className="bg-card">{d}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td">
                      <select value={r.forma} onChange={(e) => upd.mutate({ id: r.id, patch: { forma: e.target.value } })} className="cell-input">
                        {FORMAS.map((f) => <option key={f} className="bg-card">{f}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td text-center">
                      <button
                        onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                        role="switch"
                        aria-checked={r.ativo}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.ativo ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${r.ativo ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="sheet-td sheet-td-last text-center">
                      <button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-muted-foreground/60 hover:text-negative transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum gasto encontrado.</td></tr>}
              </tbody>
              <tfoot>
                <tr className="sheet-total">
                  <td className="sheet-td" colSpan={2}>Total mensal ({rows.filter((r) => r.ativo).length} ativos)</td>
                  <td className="sheet-td text-right text-primary text-base"><Money value={rows.filter((r) => r.ativo).reduce((a, r) => a + Number(r.valor), 0)} /></td>
                  <td className="sheet-td sheet-td-last" colSpan={6}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      />

      <NewGastoDialog open={openNew} onOpenChange={setOpenNew} onSave={(data) => add.mutate(data)} saving={add.isPending} />
    </div>
  );
}

function NewGastoDialog({ open, onOpenChange, onSave, saving }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (data: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    descricao: "",
    categoria: "Outros",
    valor: "",
    tipo: "A",
    frequencia: "mensal" as "mensal" | "anual",
    dia: 1,
    mes_anual: 1,
    forma: "Pix",
  });

  function reset() {
    setForm({ descricao: "", categoria: "Outros", valor: "", tipo: "A", frequencia: "mensal", dia: 1, mes_anual: 1, forma: "Pix" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao.trim()) return;
    onSave({
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      valor: Number(String(form.valor).replace(",", ".")) || 0,
      tipo: form.tipo,
      frequencia: form.frequencia,
      dia: Number(form.dia) || 1,
      mes_anual: form.frequencia === "anual" ? Number(form.mes_anual) || 1 : null,
      forma: form.forma,
      ativo: true,
    });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo gasto fixo</DialogTitle>
          <DialogDescription>Preencha os dados para adicionar ao seu fluxo mensal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
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
                {CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
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
            <Button type="submit" disabled={saving} className="mint-gradient font-semibold">
              {saving ? "Salvando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
