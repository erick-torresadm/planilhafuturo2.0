import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, TrendingUp, Wallet, PiggyBank, CircleDollarSign, Bitcoin, Landmark } from "lucide-react";
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

const TIPOS = [
  { value: "CDB", label: "CDB", icon: Landmark },
  { value: "Fundo", label: "Fundo", icon: TrendingUp },
  { value: "Tesouro", label: "Tesouro", icon: Landmark },
  { value: "Acao", label: "Ações", icon: TrendingUp },
  { value: "Cripto", label: "Cripto", icon: Bitcoin },
  { value: "Renda Fixa", label: "Renda Fixa", icon: PiggyBank },
  { value: "Outro", label: "Outro", icon: CircleDollarSign },
];

function InvestPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [delId, setDelId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["investimentos"], queryFn: () => selectAll("investimentos") });
  const rows: any[] = (q.data ?? []) as any[];

  const add = useMutation({
    mutationFn: () => insertRow("investimentos", { nome: "Novo investimento", tipo: "CDB", renda: "", valor_aplicado: 0, posicao_atual: 0, data: new Date().toISOString().slice(0, 10) }),
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

  // Allocation by type
  const porTipo = TIPOS.map((t) => {
    const ativos = rows.filter((r) => r.tipo === t.value);
    const total = ativos.reduce((a, r) => a + Number(r.posicao_atual), 0);
    return { ...t, total, count: ativos.length };
  }).filter((t) => t.count > 0);

  return (
    <div className="page-container space-y-4 animate-in">
      <PageHeader
        eyebrow="Carteira"
        title="Investimentos"
        subtitle={rows.length > 0 ? `${rows.length} ativos · ${porTipo.length} classes` : "Acompanhe seus investimentos"}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => add.mutate()} size="sm">
              <Plus className="h-4 w-4 mr-1" />Novo
            </Button>
          </div>
        }
      />

      {/* KPI row */}
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

      {/* Allocation by type */}
      {porTipo.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {porTipo.map((t) => {
            const pct = totalAtual > 0 ? (t.total / totalAtual) * 100 : 0;
            const isCrypto = t.value === "Cripto";
            return (
              <div key={t.value} className={cn(
                "chip rounded-xl border flex items-center gap-1.5 px-3 py-1.5",
                isCrypto ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-card border-border",
              )}>
                <t.icon className={cn("h-3.5 w-3.5", isCrypto ? "text-amber-500" : "text-primary")} />
                <span className="font-medium text-xs">{t.label}</span>
                <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Crypto risk summary */}
      {(() => {
        const cryptoTotal = porTipo.find((t) => t.value === "Cripto")?.total ?? 0;
        if (cryptoTotal <= 0) return null;
        const cryptoPct = (cryptoTotal / totalAtual) * 100;
        const riskLabel = cryptoPct > 30 ? "Alto risco" : cryptoPct > 10 ? "Médio risco" : "Baixo risco";
        const riskColor = cryptoPct > 30 ? "text-negative" : cryptoPct > 10 ? "text-warning" : "text-positive";
        return (
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bitcoin className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">Exposição a criptomoedas</span>
              </div>
              <span className={cn("text-xs font-bold tabular-nums", riskColor)}>{riskLabel}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(cryptoPct, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>{cryptoPct.toFixed(1)}% da carteira em crypto</span>
              <span><Money value={cryptoTotal} /></span>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <DataView
          storageKey="invest-view"
          cards={
            rows.length === 0 ? (
              <EmptyState icon={Wallet} title="Nenhum investimento" description="Adicione seus investimentos para acompanhar a carteira." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((r) => {
                  const rend = Number(r.posicao_atual) - Number(r.valor_aplicado);
                  const pct = Number(r.valor_aplicado) > 0 ? (rend / Number(r.valor_aplicado)) * 100 : 0;
                  const tipoInfo = TIPOS.find((t) => t.value === r.tipo) ?? TIPOS[6];
                  const isCrypto = r.tipo === "Cripto";
                  return (
                    <div key={r.id} className="rounded-xl bg-card border border-border overflow-hidden transition-all hover:shadow-sm">
                      {/* Header */}
                      <div className="flex items-center gap-3 p-4 pb-0">
                        <div className={cn(
                          "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                          isCrypto ? "bg-amber-50 text-amber-500" : "bg-primary/10 text-primary",
                        )}>
                          <tipoInfo.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Input
                              defaultValue={r.nome}
                              onBlur={(e) => e.target.value !== r.nome && upd.mutate({ id: r.id, patch: { nome: e.target.value } })}
                              className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0 text-sm"
                            />
                            <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {tipoInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {r.renda && <span>{r.renda}</span>}
                            {r.data && <span>· {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => setDelId(r.id)}
                          className="h-8 w-8 rounded-lg grid place-items-center text-negative/60 hover:text-negative hover:bg-negative-soft/50 transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Values - simplified row */}
                      <div className="grid grid-cols-2 gap-0 mt-3 border-t border-border/60">
                        <div className="p-3 border-r border-border/60">
                          <span className="eyebrow">Aplicado</span>
                          <MoneyInput
                            value={Number(r.valor_aplicado) || 0}
                            onCommit={(v) => v !== Number(r.valor_aplicado) && upd.mutate({ id: r.id, patch: { valor_aplicado: v } })}
                            size="sm"
                            className="w-full mt-0.5"
                          />
                        </div>
                        <div className="p-3">
                          <span className="eyebrow">Posição</span>
                          <MoneyInput
                            value={Number(r.posicao_atual) || 0}
                            onCommit={(v) => v !== Number(r.posicao_atual) && upd.mutate({ id: r.id, patch: { posicao_atual: v } })}
                            size="sm"
                            className="w-full mt-0.5"
                            inputClassName={cn(rend >= 0 ? "text-positive" : "text-negative", "font-bold")}
                          />
                        </div>
                      </div>

                      {/* Crypto extra info */}
                      {isCrypto && rendaExtra(r.renda) && (
                        <div className="px-3 pb-3 -mt-1">
                          <div className="text-[10px] text-muted-foreground/60 italic">
                            {rendaExtra(r.renda)}
                          </div>
                        </div>
                      )}

                      {/* Rendimento chip */}
                      <div className={cn("px-3 pb-3")}>
                        <div className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
                          rend >= 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
                        )}>
                          <TrendingUp className="h-3 w-3" />
                          <Money value={rend} signed showSign />
                          <span className="opacity-70">({pct.toFixed(1)}%)</span>
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
              <div className="rounded-xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">Nenhum investimento.</div>
            ) : (
              <div className="rounded-xl bg-card border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="eyebrow text-left px-4 py-3">Data</th>
                      <th className="eyebrow text-left px-4 py-3">Nome</th>
                      <th className="eyebrow text-left px-4 py-3">Tipo</th>
                      <th className="eyebrow text-left px-4 py-3">Info</th>
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
                          <td className="px-4 py-2.5"><Input type="date" defaultValue={r.data ?? ""} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0 w-28" /></td>
                          <td className="px-4 py-2.5"><Input defaultValue={r.nome} onBlur={(e) => e.target.value !== r.nome && upd.mutate({ id: r.id, patch: { nome: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0" /></td>
                          <td className="px-4 py-2.5"><select value={r.tipo ?? "CDB"} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent outline-none text-sm">{TIPOS.map((t) => <option key={t.value} className="bg-card">{t.label}</option>)}</select></td>
                          <td className="px-4 py-2.5"><Input defaultValue={r.renda ?? ""} onBlur={(e) => e.target.value !== r.renda && upd.mutate({ id: r.id, patch: { renda: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0 w-20" placeholder="Ex: 0.5 BTC" /></td>
                          <td className="px-4 py-2.5 text-right"><MoneyInput value={Number(r.valor_aplicado) || 0} onCommit={(v) => v !== Number(r.valor_aplicado) && upd.mutate({ id: r.id, patch: { valor_aplicado: v } })} size="sm" align="right" className="w-full" /></td>
                          <td className="px-4 py-2.5 text-right"><MoneyInput value={Number(r.posicao_atual) || 0} onCommit={(v) => v !== Number(r.posicao_atual) && upd.mutate({ id: r.id, patch: { posicao_atual: v } })} size="sm" align="right" className="w-full" inputClassName="font-semibold" /></td>
                          <td className={cn("px-4 py-2.5 text-right font-bold tabular-nums", rend >= 0 ? "text-positive" : "text-negative")}><Money value={rend} signed showSign /></td>
                          <td className="px-4 py-2.5"><Input type="date" defaultValue={r.vencimento ?? ""} onBlur={(e) => e.target.value !== r.vencimento && upd.mutate({ id: r.id, patch: { vencimento: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 px-0 w-28" /></td>
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

