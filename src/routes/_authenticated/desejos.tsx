import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, X, Clock } from "lucide-react";
import { totalGastoFixoMensal, parcelasNoMes, type GastoFixo, type Parcela } from "@/lib/finance";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";

export const Route = createFileRoute("/_authenticated/desejos")({
  head: () => ({ meta: [{ title: "Desejos — Planilha" }] }),
  component: DesejosPage,
});

const TIPOS = ["Tecnologia","Casa","Lazer","Educacao","Vestuario","Outros"];

function DesejosPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();

  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
    return data;
  }});
  const desejos = useQuery({ queryKey: ["desejos"], queryFn: () => selectAll("desejos") });
  const caixinhas = useQuery({ queryKey: ["caixinhas"], queryFn: () => selectAll("caixinhas") });
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });

  const renda = Number(profile.data?.renda_mensal ?? 0);
  const fixos = totalGastoFixoMensal(((gastos.data ?? []) as GastoFixo[]));
  const parcMes = parcelasNoMes(((parcelas.data ?? []) as unknown as Parcela[]), new Date().getFullYear(), new Date().getMonth());
  const sobra = renda - fixos - parcMes;

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
    mutationFn: () => insertRow("caixinhas", { nome: "Nova meta", meta: 1000, atual: 0, icone: "🎯" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caixinhas"] }); playSound("star"); },
  });
  const updCaix = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("caixinhas", id, patch),
    onSuccess: (_d, v: any) => {
      qc.invalidateQueries({ queryKey: ["caixinhas"] });
      if (v.patch.atual !== undefined) playSound("moeda");
    },
  });
  const delCaix = useMutation({
    mutationFn: (id: string) => deleteRow("caixinhas", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caixinhas"] }),
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold">Desejos & Metas</h1>
        <p className="text-sm text-muted-foreground">O que você quer comprar e para onde seu dinheiro está indo.</p>
      </div>

      <div className="glass-strong p-5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sobra mensal estimada</div>
        <div className={`font-display text-3xl lg:text-4xl font-bold mt-1 ${sobra >= 0 ? "text-positive" : "text-negative"}`}>
          <Money value={sobra} signed showSign />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Renda <Money value={renda} /> − Fixos <Money value={fixos} /> − Parcelas <Money value={parcMes} />
        </div>
      </div>

      {/* Wishlist */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Lista de desejos</h2>
          <Button size="sm" onClick={() => addDesejo.mutate()} className="mint-gradient font-semibold">
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
            const chip = status.kind === "go" ? "bg-positive-soft text-positive" : status.kind === "no" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning";
            const Icon = status.kind === "go" ? Check : status.kind === "no" ? X : Clock;

            return (
              <div key={d.id} className="glass p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Input defaultValue={d.item} onBlur={(e) => e.target.value !== d.item && updDesejo.mutate({ id: d.id, patch: { item: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0" />
                    <select value={d.tipo ?? "Outros"} onChange={(e) => updDesejo.mutate({ id: d.id, patch: { tipo: e.target.value } })} className="bg-transparent text-[11px] text-muted-foreground outline-none mt-0.5">
                      {TIPOS.map((t) => <option key={t} className="bg-card">{t}</option>)}
                    </select>
                  </div>
                  <button onClick={() => confirm("Deletar?") && delDesejo.mutate(d.id)} className="text-negative/70"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor</div>
                    <MoneyInput value={valor} onCommit={(v) => v !== valor && updDesejo.mutate({ id: d.id, patch: { valor: v } })} size="md" align="left" inputClassName="text-lg font-bold text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updDesejo.mutate({ id: d.id, patch: { parcelado: !d.parcelado } })}
                      className={`chip ${d.parcelado ? "mint-gradient" : "bg-black/5 text-muted-foreground"}`}>
                      {d.parcelado ? "Parcelado" : "À vista"}
                    </button>
                    {d.parcelado && (
                      <Input type="number" min={1} defaultValue={d.qtd_parcelas ?? 1}
                        onBlur={(e) => Number(e.target.value) !== d.qtd_parcelas && updDesejo.mutate({ id: d.id, patch: { qtd_parcelas: Number(e.target.value) } })}
                        className="h-7 w-14 text-center" />
                    )}
                  </div>
                </div>
                <div className={`mt-3 flex items-center gap-1.5 chip ${chip} w-fit`}>
                  <Icon className="h-3 w-3" /> {status.text}
                </div>
              </div>
            );
          })}
          {(!desejos.data || desejos.data.length === 0) && <div className="glass p-8 text-center text-sm text-muted-foreground sm:col-span-2">Nenhum desejo. Adicione um!</div>}
        </div>
      </section>

      {/* Caixinhas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Caixinhas</h2>
          <Button size="sm" onClick={() => addCaixinha.mutate()} className="mint-gradient font-semibold">
            <Plus className="h-4 w-4 mr-1" />Nova
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {((caixinhas.data ?? []) as any[]).map((c) => {
            const pct = Number(c.meta) > 0 ? Math.min(100, (Number(c.atual) / Number(c.meta)) * 100) : 0;
            const falta = Math.max(0, Number(c.meta) - Number(c.atual));
            const done = pct >= 100;
            return (
              <div key={c.id} className={`glass p-4 ${done ? "mint-glow" : ""}`}>
                <div className="flex items-start gap-2">
                  <div className="text-2xl h-10 w-10 grid place-items-center rounded-lg bg-primary/15">{c.icone ?? "🎯"}</div>
                  <Input defaultValue={c.nome} onBlur={(e) => e.target.value !== c.nome && updCaix.mutate({ id: c.id, patch: { nome: e.target.value } })} className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold" />
                  <button onClick={() => confirm("Deletar?") && delCaix.mutate(c.id)} className="text-negative/70"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Atual</div>
                    <MoneyInput value={Number(c.atual) || 0} onCommit={(v) => v !== Number(c.atual) && updCaix.mutate({ id: c.id, patch: { atual: v } })} size="sm" align="left" inputClassName="text-primary font-bold" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Meta</div>
                    <MoneyInput value={Number(c.meta) || 0} onCommit={(v) => v !== Number(c.meta) && updCaix.mutate({ id: c.id, patch: { meta: v } })} size="sm" align="right" />
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-black/5 overflow-hidden">
                  <div className="h-full mint-gradient transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className={`text-xs mt-2 ${done ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {done ? "🎉 Meta batida!" : <>Faltam <Money value={falta} /> · {pct.toFixed(0)}%</>}
                </div>
              </div>
            );
          })}
          {(!caixinhas.data || caixinhas.data.length === 0) && <div className="glass p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">Sem caixinhas ainda.</div>}
        </div>
      </section>
    </div>
  );
}
