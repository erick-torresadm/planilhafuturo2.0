import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { totalGastoFixoMensal, parcelasNoMes, type GastoFixo, type Parcela } from "@/lib/finance";
import { MESES_ABREV } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import { useSounds } from "@/hooks/useSounds";

export const Route = createFileRoute("/_authenticated/desejos")({
  head: () => ({ meta: [{ title: "Fila de Desejos — Planilha" }] }),
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
  const hojeM = new Date().getMonth();
  const ano = new Date().getFullYear();
  const parcMes = parcelasNoMes(((parcelas.data ?? []) as unknown as Parcela[]), ano, hojeM);
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

  const fluxo6 = useMemo(() => {
    let acum = 0;
    return Array.from({ length: 6 }, (_, i) => {
      const mm = (hojeM + i) % 12;
      const yy = ano + Math.floor((hojeM + i) / 12);
      const p = parcelasNoMes(((parcelas.data ?? []) as unknown as Parcela[]), yy, mm);
      const s = renda - fixos - p;
      acum += s;
      return { m: mm, entrada: renda, fixos, parc: p, sobra: s, acum, ok: s >= 0 };
    });
  }, [parcelas.data, renda, fixos, hojeM, ano]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Fila de Desejos</h1>
        <p className="text-sm text-muted-foreground">Sobra mensal estimada: <b className={sobra >= 0 ? "text-positive" : "text-negative"}>{brl(sobra)}</b></p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-primary">Lista de Desejos</h2>
          <Button size="sm" onClick={() => addDesejo.mutate()}><Plus className="w-4 h-4 mr-1" />Novo</Button>
        </div>
        <div className="border rounded-md overflow-x-auto">
          <table className="sheet-grid">
            <thead>
              <tr>
                <th className="sheet-th">Item</th>
                <th className="sheet-th text-right">Valor</th>
                <th className="sheet-th">Tipo</th>
                <th className="sheet-th text-center">Parc?</th>
                <th className="sheet-th text-center">Qtd</th>
                <th className="sheet-th text-right">Parcela</th>
                <th className="sheet-th">Obs</th>
                <th className="sheet-th">Status</th>
                <th className="sheet-th"></th>
              </tr>
            </thead>
            <tbody>
              {((desejos.data ?? []) as any[]).map((d, i) => {
                const valor = Number(d.valor);
                const parcela = d.parcelado && d.qtd_parcelas ? valor / d.qtd_parcelas : 0;
                let status = "";
                let cls = "";
                if (d.parcelado) {
                  if (sobra - parcela >= 0) { status = `PODE COMPRAR — Parcela ${brl(parcela)}`; cls = "text-positive"; }
                  else { status = `REVER — Parcela alta`; cls = "text-negative"; }
                } else {
                  if (sobra <= 0) { status = "GUARDAR"; cls = "text-muted-foreground"; }
                  else {
                    const meses = Math.ceil(valor / sobra);
                    if (meses <= 1) { status = "PODE COMPRAR"; cls = "text-positive"; }
                    else { status = `${meses} meses para guardar`; cls = "text-amber-600"; }
                  }
                }
                return (
                  <tr key={d.id} className={i % 2 ? "sheet-row-alt" : ""}>
                    <td className="sheet-td"><Input defaultValue={d.item} onBlur={(e) => e.target.value !== d.item && updDesejo.mutate({ id: d.id, patch: { item: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1" /></td>
                    <td className="sheet-td text-right"><Input type="number" step="0.01" defaultValue={valor} onBlur={(e) => Number(e.target.value) !== valor && updDesejo.mutate({ id: d.id, patch: { valor: Number(e.target.value) } })} className="h-7 border-0 shadow-none focus-visible:ring-1 text-right" /></td>
                    <td className="sheet-td">
                      <select value={d.tipo ?? "Outros"} onChange={(e) => updDesejo.mutate({ id: d.id, patch: { tipo: e.target.value } })} className="bg-transparent w-full">
                        {TIPOS.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="sheet-td text-center">
                      <button onClick={() => updDesejo.mutate({ id: d.id, patch: { parcelado: !d.parcelado } })} className={`px-2 py-0.5 text-xs rounded ${d.parcelado ? "bg-primary text-white" : "bg-muted"}`}>{d.parcelado ? "SIM" : "NÃO"}</button>
                    </td>
                    <td className="sheet-td text-center">
                      {d.parcelado && <Input type="number" min={1} defaultValue={d.qtd_parcelas ?? 1} onBlur={(e) => Number(e.target.value) !== d.qtd_parcelas && updDesejo.mutate({ id: d.id, patch: { qtd_parcelas: Number(e.target.value) } })} className="h-7 w-14 border-0 shadow-none focus-visible:ring-1 text-center" />}
                    </td>
                    <td className="sheet-td text-right">{parcela > 0 ? brl(parcela) : "—"}</td>
                    <td className="sheet-td"><Input defaultValue={d.observacao ?? ""} onBlur={(e) => e.target.value !== (d.observacao ?? "") && updDesejo.mutate({ id: d.id, patch: { observacao: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1" /></td>
                    <td className={`sheet-td text-xs font-semibold ${cls}`}>{status}</td>
                    <td className="sheet-td text-center"><button onClick={() => confirm("Deletar?") && delDesejo.mutate(d.id)} className="text-negative"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
              {(!desejos.data || desejos.data.length === 0) && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhum desejo ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-primary mb-2">Fluxo mensal (6 meses)</h2>
        <div className="border rounded-md overflow-x-auto">
          <table className="sheet-grid">
            <thead><tr><th className="sheet-th">Mês</th><th className="sheet-th text-right">Entrada</th><th className="sheet-th text-right">Fixos</th><th className="sheet-th text-right">Parcelas</th><th className="sheet-th text-right">Sobra</th><th className="sheet-th text-right">Acum.</th><th className="sheet-th text-center">Status</th></tr></thead>
            <tbody>
              {fluxo6.map((f, i) => (
                <tr key={i} className={i % 2 ? "sheet-row-alt" : ""}>
                  <td className="sheet-td">{MESES_ABREV[f.m]}</td>
                  <td className="sheet-td text-right">{brl(f.entrada)}</td>
                  <td className="sheet-td text-right text-negative">{brl(f.fixos)}</td>
                  <td className="sheet-td text-right text-negative">{brl(f.parc)}</td>
                  <td className={`sheet-td text-right ${f.sobra >= 0 ? "text-positive" : "text-negative"}`}>{brl(f.sobra)}</td>
                  <td className={`sheet-td text-right font-bold ${f.acum >= 0 ? "text-positive" : "text-negative"}`}>{brl(f.acum)}</td>
                  <td className={`sheet-td text-center text-xs font-bold ${f.ok ? "text-positive" : "text-negative"}`}>{f.ok ? "POSITIVO" : "NEGATIVO"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-primary">Caixinhas (metas visuais)</h2>
          <Button size="sm" onClick={() => addCaixinha.mutate()}><Plus className="w-4 h-4 mr-1" />Nova Caixinha</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {((caixinhas.data ?? []) as any[]).map((c) => {
            const pct = Number(c.meta) > 0 ? Math.min(100, (Number(c.atual) / Number(c.meta)) * 100) : 0;
            const falta = Math.max(0, Number(c.meta) - Number(c.atual));
            return (
              <div key={c.id} className="border rounded-lg p-4 bg-card shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{c.icone ?? "🎯"}</span>
                    <Input defaultValue={c.nome} onBlur={(e) => e.target.value !== c.nome && updCaix.mutate({ id: c.id, patch: { nome: e.target.value } })} className="h-7 border-0 shadow-none focus-visible:ring-1 font-semibold" />
                  </div>
                  <button onClick={() => confirm("Deletar?") && delCaix.mutate(c.id)} className="text-negative opacity-60 hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="mt-3 text-sm flex justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Atual</div>
                    <Input type="number" defaultValue={c.atual} onBlur={(e) => Number(e.target.value) !== Number(c.atual) && updCaix.mutate({ id: c.id, patch: { atual: Number(e.target.value) } })} className="h-7 w-28" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Meta</div>
                    <Input type="number" defaultValue={c.meta} onBlur={(e) => Number(e.target.value) !== Number(c.meta) && updCaix.mutate({ id: c.id, patch: { meta: Number(e.target.value) } })} className="h-7 w-28 text-right" />
                  </div>
                </div>
                <Progress value={pct} className="mt-3 h-2" />
                <div className={`text-xs mt-1 ${pct >= 100 ? "text-positive font-semibold" : "text-muted-foreground"}`}>
                  {pct >= 100 ? "🎉 Meta batida!" : `Faltam ${brl(falta)}`}
                </div>
              </div>
            );
          })}
          {(!caixinhas.data || caixinhas.data.length === 0) && <div className="text-sm text-muted-foreground">Nenhuma caixinha ainda.</div>}
        </div>
      </section>
    </div>
  );
}
