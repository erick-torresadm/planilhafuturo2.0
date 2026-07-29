import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, TrendingUp, Wallet, PiggyBank, CircleDollarSign } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { DataView } from "@/components/DataView";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investimentos")({
  head: () => ({ meta: [{ title: "Investimentos — Planilha" }] }),
  component: InvestPage,
});

const TIPOS = ["Fundo", "CDB", "Tesouro", "Acao", "Cripto", "Outro"];

function InvestPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [delId, setDelId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["investimentos"], queryFn: () => selectAll("investimentos") });
  const rows: any[] = (q.data ?? []) as any[];

  const add = useMutation({
    mutationFn: () => insertRow("investimentos", { nome: "Novo investimento", tipo: "CDB", renda: "100% CDI", valor_aplicado: 0, posicao_atual: 0, data: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investimentos"] }); playSound("moeda"); },
  });
  const upd = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("investimentos", id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investimentos"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("investimentos", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investimentos"] }),
  });

  const totalAplicado = rows.reduce((a, r) => a + Number(r.valor_aplicado), 0);
  const totalAtual = rows.reduce((a, r) => a + Number(r.posicao_atual), 0);
  const rendTotal = totalAtual - totalAplicado;
  const pctRend = totalAplicado > 0 ? (rendTotal / totalAplicado) * 100 : 0;
  const loading = q.isPending;

  return (
    <div className="page-container space-y-4 animate-in">
      <PageHeader
        eyebrow="Carteira"
        title="Investimentos"
        subtitle="Sua carteira em tempo real"
        actions={
          <Button onClick={() => add.mutate()}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline ml-1">Novo</span>
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total aplicado" value={totalAplicado} icon={Wallet} tone="primary" />
        <KpiCard label="Posição atual" value={totalAtual} icon={PiggyBank} tone="default" />
        <KpiCard
          label="Rendimento"
          value={rendTotal}
          icon={CircleDollarSign}
          tone={rendTotal >= 0 ? "positive" : "negative"}
          delta={{ pct: pctRend }}
        />
      </div>

      {/* Posição hero */}
      <div className="metric-card p-5">
        <span className="eyebrow">Patrimônio</span>
        <div className="font-display text-3xl lg:text-4xl font-bold text-foreground mt-1 tabular-nums">
          <Money value={totalAtual} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="chip chip-ghost">Aplicado <Money value={totalAplicado} /></span>
          <span className={cn("chip", rendTotal >= 0 ? "chip-positive" : "chip-negative")}>
            <TrendingUp className="h-3 w-3" /> <Money value={rendTotal} signed showSign /> ({pctRend.toFixed(2)}%)
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        <DataView
          storageKey="invest-view"
          cards={
            rows.length === 0 ? (
              <EmptyState icon={Wallet} title="Nenhum investimento" description="Adicione seus investimentos para acompanhar o rendimento da carteira." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((r) => {
                  const rend = Number(r.posicao_atual) - Number(r.valor_aplicado);
                  const pct = Number(r.valor_aplicado) > 0 ? (rend / Number(r.valor_aplicado)) * 100 : 0;
                  return (
                    <div key={r.id} className="rounded-xl bg-card border border-border p-4 transition-all hover:shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input defaultValue={r.nome} onBlur={(e) => e.target.value !== r.nome && upd.mutate({ id: r.id, patch: { nome: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0" />
                          <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{r.tipo}</span><span>·</span><span>{r.renda}</span>
                          </div>
                        </div>
                        <button onClick={() => setDelId(r.id)} className="h-8 w-8 rounded-lg grid place-items-center text-negative/70 hover:text-negative hover:bg-negative-soft/50 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <span className="eyebrow">Aplicado</span>
                          <MoneyInput value={Number(r.valor_aplicado) || 0} onCommit={(v) => v !== Number(r.valor_aplicado) && upd.mutate({ id: r.id, patch: { valor_aplicado: v } })} size="sm" className="w-full mt-0.5" />
                        </div>
                        <div>
                          <span className="eyebrow">Posição</span>
                          <MoneyInput value={Number(r.posicao_atual) || 0} onCommit={(v) => v !== Number(r.posicao_atual) && upd.mutate({ id: r.id, patch: { posicao_atual: v } })} size="sm" className="w-full mt-0.5" inputClassName="text-primary font-bold" />
                        </div>
                      </div>
                      <div className={cn("mt-2 chip w-fit", rend >= 0 ? "chip-positive" : "chip-negative")}>
                        <TrendingUp className="h-3 w-3" /> <Money value={rend} signed showSign /> ({pct.toFixed(2)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
          table={
            rows.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">Nenhum investimento.</div>
            ) : (
              <div className="rounded-xl bg-card border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="eyebrow text-left px-4 py-3">Data</th>
                      <th className="eyebrow text-left px-4 py-3">Nome</th>
                      <th className="eyebrow text-left px-4 py-3">Tipo</th>
                      <th className="eyebrow text-left px-4 py-3">Renda</th>
                      <th className="eyebrow text-right px-4 py-3">Aplicado</th>
                      <th className="eyebrow text-right px-4 py-3">Posição</th>
                      <th className="eyebrow text-right px-4 py-3">Rend.</th>
                      <th className="eyebrow text-left px-4 py-3">Venc.</th>
                      <th className="w-10 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const rend = Number(r.posicao_atual) - Number(r.valor_aplicado);
                      return (
                        <tr key={r.id} className="border-t border-border/60 hover:bg-primary/[0.02]">
                          <td className="px-4 py-2.5"><Input type="date" defaultValue={r.data ?? ""} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0" /></td>
                          <td className="px-4 py-2.5"><Input defaultValue={r.nome} onBlur={(e) => e.target.value !== r.nome && upd.mutate({ id: r.id, patch: { nome: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0" /></td>
                          <td className="px-4 py-2.5"><select value={r.tipo ?? "CDB"} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent outline-none text-sm">{TIPOS.map((t) => <option key={t} className="bg-card">{t}</option>)}</select></td>
                          <td className="px-4 py-2.5"><Input defaultValue={r.renda ?? ""} onBlur={(e) => e.target.value !== r.renda && upd.mutate({ id: r.id, patch: { renda: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0" /></td>
                          <td className="px-4 py-2.5 text-right"><MoneyInput value={Number(r.valor_aplicado) || 0} onCommit={(v) => v !== Number(r.valor_aplicado) && upd.mutate({ id: r.id, patch: { valor_aplicado: v } })} size="sm" align="right" className="w-full" /></td>
                          <td className="px-4 py-2.5 text-right"><MoneyInput value={Number(r.posicao_atual) || 0} onCommit={(v) => v !== Number(r.posicao_atual) && upd.mutate({ id: r.id, patch: { posicao_atual: v } })} size="sm" align="right" className="w-full" inputClassName="font-semibold" /></td>
                          <td className={cn("px-4 py-2.5 text-right font-bold", rend >= 0 ? "text-positive" : "text-negative")}><Money value={rend} signed showSign /></td>
                          <td className="px-4 py-2.5"><Input type="date" defaultValue={r.vencimento ?? ""} onBlur={(e) => e.target.value !== r.vencimento && upd.mutate({ id: r.id, patch: { vencimento: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0" /></td>
                          <td className="px-2 py-2.5 text-center"><button onClick={() => setDelId(r.id)} className="text-negative/70 hover:text-negative"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        />
      )}

      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { del.mutate(delId); setDelId(null); } }}
        title="Excluir investimento?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}
