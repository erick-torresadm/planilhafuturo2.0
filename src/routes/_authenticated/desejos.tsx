import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow, getProfile } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, X, Clock, Sparkles, TrendingUp, PiggyBank, Target, type LucideIcon } from "lucide-react";
import { totalGastoFixoMensal, parcelasNoMes, type GastoFixo, type Parcela } from "@/lib/finance";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/desejos")({
  head: () => ({ meta: [{ title: "Desejos — Planilha" }] }),
  component: DesejosPage,
});

const TIPOS = ["Tecnologia", "Casa", "Lazer", "Educacao", "Vestuario", "Outros"];

const CAIXA_ICONS: Record<string, LucideIcon> = {
  "🛡️": PiggyBank,
  "✈️": Target,
};

function DesejosPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const desejos = useQuery({ queryKey: ["desejos"], queryFn: () => selectAll("desejos") });
  const caixinhas = useQuery({ queryKey: ["caixinhas"], queryFn: () => selectAll("caixinhas") });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });

  const renda = Number(profile.data?.renda_mensal ?? 0);
  const fixos = totalGastoFixoMensal(((gastos.data ?? []) as GastoFixo[]));
  const parcMes = parcelasNoMes(((parcelas.data ?? []) as unknown as Parcela[]), new Date().getFullYear(), new Date().getMonth());
  const sobra = renda - fixos - parcMes;

  const loading = profile.isPending || desejos.isPending || caixinhas.isPending || gastos.isPending || parcelas.isPending;

  const [delTarget, setDelTarget] = useState<{ id: string; type: "desejo" | "caixinha" } | null>(null);

  const addDesejo = useMutation({
    mutationFn: () => insertRow("desejos", { item: "Novo item", valor: 0, tipo: "Outros", parcelado: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["desejos"] }); playSound("pop"); },
  });
  const updDesejo = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("desejos", id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["desejos"] }),
  });
  const delDesejo = useMutation({
    mutationFn: (id: string) => deleteRow("desejos", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["desejos"] }),
  });

  const addCaixinha = useMutation({
    mutationFn: () => insertRow("caixinhas", { nome: "Nova meta", meta: 1000, atual: 0, icone: "" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caixinhas"] }); playSound("star"); },
  });
  const updCaix = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("caixinhas", id, patch),
    onSuccess: (_d: any, v: any) => {
      qc.invalidateQueries({ queryKey: ["caixinhas"] });
      if (v.patch.atual !== undefined) playSound("moeda");
    },
  });
  const delCaix = useMutation({
    mutationFn: (id: string) => deleteRow("caixinhas", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caixinhas"] }); },
  });

  function doDelete() {
    if (!delTarget) return;
    if (delTarget.type === "desejo") delDesejo.mutate(delTarget.id);
    else delCaix.mutate(delTarget.id);
    setDelTarget(null);
  }

  return (
    <div className="page-container space-y-5 animate-in">
      <PageHeader
        eyebrow="Metas"
        title="Desejos & Metas"
        subtitle="O que você quer comprar e para onde seu dinheiro está indo."
      />

      {/* Sobra mensal hero */}
      <div className="metric-card p-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-foreground/[0.025] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 eyebrow mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Sobra mensal estimada
          </div>
          <div className={cn("font-display text-4xl lg:text-5xl font-bold tabular-nums", sobra >= 0 ? "text-positive" : "text-negative")}>
            <Money value={sobra} signed showSign />
          </div>
          <div className="stat-row mt-2">
            <span className="text-xs text-muted-foreground">Renda <Money value={renda} /></span>
            <span className="text-xs text-muted-foreground/40">−</span>
            <span className="text-xs text-muted-foreground">Fixos <Money value={fixos} /></span>
            <span className="text-xs text-muted-foreground/40">−</span>
            <span className="text-xs text-muted-foreground">Parcelas <Money value={parcMes} /></span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-8 w-40 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-44 w-full rounded-xl" />)}
          </div>
          <div className="skeleton h-8 w-40 rounded-lg mt-6" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-32 w-full rounded-xl" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Caixinhas */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-primary" /> Caixinhas
              </h2>
              <Button size="sm" onClick={() => addCaixinha.mutate()}>
                <Plus className="h-4 w-4 mr-1" />Nova
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {((caixinhas.data ?? []) as any[]).map((c) => {
                const pct = Number(c.meta) > 0 ? Math.min(100, (Number(c.atual) / Number(c.meta)) * 100) : 0;
                const falta = Math.max(0, Number(c.meta) - Number(c.atual));
                const done = pct >= 100;
                const r = 58;
                const circ = 2 * Math.PI * r;
                const offset = circ - (pct / 100) * circ;
                const Icon = CAIXA_ICONS[c.icone] ?? PiggyBank;
                return (
                  <div key={c.id} className={cn("rounded-xl bg-card border border-border p-5 relative overflow-hidden transition-all hover:shadow-sm", done && "ring-2 ring-positive/30")}>
                    {done && <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-positive/10 blur-2xl pointer-events-none" />}
                    <div className="flex items-start gap-3 relative">
                      <div className="relative h-16 w-16 shrink-0">
                        <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
                          <circle cx="65" cy="65" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
                          <circle cx="65" cy="65" r={r} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={circ} strokeDashoffset={offset}
                            className={done ? "text-positive" : "text-primary"} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
                        </svg>
                        <div className="absolute inset-0 grid place-items-center">
                          <Icon className={cn("h-6 w-6", done ? "text-positive" : "text-primary")} strokeWidth={1.5} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Input defaultValue={c.nome} onBlur={(e) => e.target.value !== c.nome && updCaix.mutate({ id: c.id, patch: { nome: e.target.value } })}
                          className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0" />
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Atual</span>
                            <MoneyInput value={Number(c.atual) || 0} onCommit={(v) => v !== Number(c.atual) && updCaix.mutate({ id: c.id, patch: { atual: v } })}
                              size="sm" align="right" inputClassName="font-bold text-primary text-right" />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Meta</span>
                            <MoneyInput value={Number(c.meta) || 0} onCommit={(v) => v !== Number(c.meta) && updCaix.mutate({ id: c.id, patch: { meta: v } })}
                              size="sm" align="right" />
                          </div>
                        </div>
                        <div className={cn("mt-2 text-xs flex items-center justify-between", done && "text-positive font-semibold")}>
                          {done ? (
                            <span>✦ Meta batida!</span>
                          ) : (
                            <span className="text-muted-foreground">{pct.toFixed(0)}% · faltam <Money value={falta} /></span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setDelTarget({ id: c.id, type: "caixinha" })} className="text-negative/60 hover:text-negative shrink-0 mt-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!caixinhas.data || caixinhas.data.length === 0) && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <EmptyState icon={PiggyBank} title="Nenhuma caixinha" description="Crie metas de economia para seus sonhos." action={<Button size="sm" onClick={() => addCaixinha.mutate()}><Plus className="h-4 w-4 mr-1" />Criar meta</Button>} />
                </div>
              )}
            </div>
          </section>

          {/* Wishlist */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Lista de desejos
              </h2>
              <Button size="sm" onClick={() => addDesejo.mutate()}>
                <Plus className="h-4 w-4 mr-1" />Novo
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {((desejos.data ?? []) as any[]).map((d) => {
                const valor = Number(d.valor);
                const parcela = d.parcelado && d.qtd_parcelas ? valor / d.qtd_parcelas : 0;
                let status: { text: string; kind: "go" | "wait" | "no" } = { text: "", kind: "wait" };
                if (d.parcelado) {
                  status = sobra - parcela >= 0
                    ? { text: `Pode comprar · ${parcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês`, kind: "go" }
                    : { text: "Parcela alta — rever", kind: "no" };
                } else if (sobra <= 0) status = { text: "Guardar antes", kind: "no" };
                else {
                  const meses = Math.ceil(valor / sobra);
                  status = meses <= 1 ? { text: "Pode comprar agora", kind: "go" } : { text: `${meses} meses guardando`, kind: "wait" };
                }
                const ChipIcon = status.kind === "go" ? Check : status.kind === "no" ? X : Clock;
                return (
                  <div key={d.id} className="rounded-xl bg-card border border-border p-4 transition-all hover:shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <Input defaultValue={d.item} onBlur={(e) => e.target.value !== d.item && updDesejo.mutate({ id: d.id, patch: { item: e.target.value } })}
                          className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0" />
                        <select value={d.tipo ?? "Outros"} onChange={(e) => updDesejo.mutate({ id: d.id, patch: { tipo: e.target.value } })}
                          className="bg-transparent text-xs text-muted-foreground outline-none mt-0.5">
                          {TIPOS.map((t) => <option key={t} className="bg-card">{t}</option>)}
                        </select>
                      </div>
                      <button onClick={() => setDelTarget({ id: d.id, type: "desejo" })} className="text-negative/60 hover:text-negative"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <span className="eyebrow">Valor</span>
                        <MoneyInput value={valor} onCommit={(v) => v !== valor && updDesejo.mutate({ id: d.id, patch: { valor: v } })} size="md" align="left" inputClassName="text-lg font-bold text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updDesejo.mutate({ id: d.id, patch: { parcelado: !d.parcelado } })}
                          className={cn("chip", d.parcelado ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {d.parcelado ? "Parcelado" : "À vista"}
                        </button>
                        {d.parcelado && (
                          <Input type="number" min={1} defaultValue={d.qtd_parcelas ?? 1}
                            onBlur={(e) => Number(e.target.value) !== d.qtd_parcelas && updDesejo.mutate({ id: d.id, patch: { qtd_parcelas: Number(e.target.value) } })}
                            className="h-7 w-14 text-center" />
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "mt-3 flex items-center gap-1.5 chip w-fit",
                      status.kind === "go" ? "chip-positive" :
                      status.kind === "no" ? "chip-negative" :
                      "chip-warning",
                    )}>
                      <ChipIcon className="h-3 w-3" /> {status.text}
                    </div>
                  </div>
                );
              })}
              {(!desejos.data || desejos.data.length === 0) && (
                <div className="sm:col-span-2">
                  <EmptyState icon={Sparkles} title="Nenhum desejo" description="Adicione itens que você quer comprar." />
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => { if (!o) setDelTarget(null); }}
        onConfirm={doDelete}
        title="Excluir item?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}
