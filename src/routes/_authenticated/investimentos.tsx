import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, TrendingUp, Sparkles } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { DataView } from "@/components/DataView";

export const Route = createFileRoute("/_authenticated/investimentos")({
  head: () => ({ meta: [{ title: "Investimentos — Planilha" }] }),
  component: InvestPage,
});

const TIPOS = ["Fundo","CDB","Tesouro","Acao","Cripto","Outro"];

function InvestPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
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
  const rendDia = totalAplicado * (0.1375 / 365);
  const pctRend = totalAplicado > 0 ? (rendTotal / totalAplicado) * 100 : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Investimentos</h1>
          <p className="text-sm text-muted-foreground">Sua carteira em tempo real</p>
        </div>
        <Button onClick={() => add.mutate()} className="mint-gradient font-semibold">
          <Plus className="h-4 w-4 mr-1" />Novo
        </Button>
      </div>

      {/* Hero */}
      <div className="glass-strong p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Posição atual</div>
          <div className="font-display text-4xl lg:text-5xl font-bold text-primary mt-1"><Money value={totalAtual} /></div>
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="chip bg-white/5">Aplicado <Money value={totalAplicado} /></div>
            <div className={`chip ${rendTotal >= 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}>
              <TrendingUp className="h-3 w-3" /> <Money value={rendTotal} signed showSign /> ({pctRend.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {rendDia > 0 && (
        <div className="glass p-4 flex items-center gap-3 mint-glow">
          <div className="h-10 w-10 rounded-lg mint-gradient grid place-items-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">Hoje rendeu ~<Money value={rendDia} className="text-primary" /></div>
            <div className="text-[11px] text-muted-foreground">Estimativa 100% CDI (13,75% a.a.)</div>
          </div>
        </div>
      )}

      <DataView
        storageKey="invest-view"
        cards={
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((r) => {
              const rend = Number(r.posicao_atual) - Number(r.valor_aplicado);
              const pct = Number(r.valor_aplicado) > 0 ? (rend / Number(r.valor_aplicado)) * 100 : 0;
              return (
                <div key={r.id} className="glass p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <Input defaultValue={r.nome} onBlur={(e) => e.target.value !== r.nome && upd.mutate({ id: r.id, patch: { nome: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 font-semibold px-0" />
                      <div className="flex gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>{r.tipo}</span><span>·</span><span>{r.renda}</span>
                      </div>
                    </div>
                    <button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative/70"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Aplicado</div>
                      <Input type="number" step="0.01" defaultValue={r.valor_aplicado} onBlur={(e) => Number(e.target.value) !== Number(r.valor_aplicado) && upd.mutate({ id: r.id, patch: { valor_aplicado: Number(e.target.value) } })} className="h-8" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Posição</div>
                      <Input type="number" step="0.01" defaultValue={r.posicao_atual} onBlur={(e) => Number(e.target.value) !== Number(r.posicao_atual) && upd.mutate({ id: r.id, patch: { posicao_atual: Number(e.target.value) } })} className="h-8 text-primary font-bold" />
                    </div>
                  </div>
                  <div className={`mt-2 chip ${rend >= 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"} w-fit`}>
                    <TrendingUp className="h-3 w-3" /> <Money value={rend} signed showSign /> ({pct.toFixed(2)}%)
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && <div className="glass p-8 text-center text-sm text-muted-foreground sm:col-span-2">Nenhum investimento.</div>}
          </div>
        }
        table={
          <div className="glass overflow-x-auto">
            <table className="sheet-grid">
              <thead>
                <tr>
                  <th className="sheet-th">Data</th>
                  <th className="sheet-th">Nome</th>
                  <th className="sheet-th">Tipo</th>
                  <th className="sheet-th">Renda</th>
                  <th className="sheet-th text-right">Aplicado</th>
                  <th className="sheet-th text-right">Posição</th>
                  <th className="sheet-th text-right">Rend.</th>
                  <th className="sheet-th">Venc.</th>
                  <th className="sheet-th"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rend = Number(r.posicao_atual) - Number(r.valor_aplicado);
                  return (
                    <tr key={r.id} className={i % 2 ? "sheet-row-alt" : ""}>
                      <td className="sheet-td"><Input type="date" defaultValue={r.data ?? ""} onBlur={(e) => e.target.value !== r.data && upd.mutate({ id: r.id, patch: { data: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1" /></td>
                      <td className="sheet-td"><Input defaultValue={r.nome} onBlur={(e) => e.target.value !== r.nome && upd.mutate({ id: r.id, patch: { nome: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1" /></td>
                      <td className="sheet-td"><select value={r.tipo ?? "CDB"} onChange={(e) => upd.mutate({ id: r.id, patch: { tipo: e.target.value } })} className="bg-transparent w-full outline-none">{TIPOS.map((t) => <option key={t} className="bg-card">{t}</option>)}</select></td>
                      <td className="sheet-td"><Input defaultValue={r.renda ?? ""} onBlur={(e) => e.target.value !== r.renda && upd.mutate({ id: r.id, patch: { renda: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1" /></td>
                      <td className="sheet-td text-right"><Input type="number" step="0.01" defaultValue={r.valor_aplicado} onBlur={(e) => Number(e.target.value) !== Number(r.valor_aplicado) && upd.mutate({ id: r.id, patch: { valor_aplicado: Number(e.target.value) } })} className="h-7 w-24 ml-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-right" /></td>
                      <td className="sheet-td text-right"><Input type="number" step="0.01" defaultValue={r.posicao_atual} onBlur={(e) => Number(e.target.value) !== Number(r.posicao_atual) && upd.mutate({ id: r.id, patch: { posicao_atual: Number(e.target.value) } })} className="h-7 w-24 ml-auto border-0 bg-transparent shadow-none focus-visible:ring-1 text-right font-semibold" /></td>
                      <td className={`sheet-td text-right font-bold ${rend >= 0 ? "text-positive" : "text-negative"}`}><Money value={rend} signed showSign /></td>
                      <td className="sheet-td"><Input type="date" defaultValue={r.vencimento ?? ""} onBlur={(e) => e.target.value !== r.vencimento && upd.mutate({ id: r.id, patch: { vencimento: e.target.value } })} className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-1" /></td>
                      <td className="sheet-td text-center"><button onClick={() => confirm("Deletar?") && del.mutate(r.id)} className="text-negative/70 hover:text-negative"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum investimento.</td></tr>}
              </tbody>
            </table>
          </div>
        }
      />
    </div>
  );
}
