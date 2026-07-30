import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSounds } from "@/hooks/useSounds";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Target, Flame, Play, Pause, RotateCcw, Check,
  StickyNote, ArrowRight, ArrowLeft, GripVertical, FileText, Tag, Lightbulb, ListTodo,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/produtividade")({
  head: () => ({ meta: [{ title: "Produtividade — Planilha" }] }),
  component: ProdutividadePage,
});

const today = () => new Date().toISOString().slice(0, 10);
const dayShift = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const weekDates = () => Array.from({ length: 7 }, (_, i) => dayShift(i - 3));

const COLUNAS = [
  { key: "a_fazer", label: "A fazer", color: "border-t-muted-foreground" },
  { key: "fazendo", label: "Fazendo", color: "border-t-primary" },
  { key: "feito", label: "Feito", color: "border-t-positive" },
] as const;

const ETIQUETAS = [
  { value: "", label: "Sem", color: "" },
  { value: "importante", label: "Importante", color: "bg-negative-soft text-negative" },
  { value: "ideia", label: "Ideia", color: "bg-primary/10 text-primary" },
  { value: "pessoal", label: "Pessoal", color: "bg-purple-50 text-purple-600" },
  { value: "trabalho", label: "Trabalho", color: "bg-amber-50 text-amber-600" },
];

function ProdutividadePage() {
  return (
    <div className="page-container space-y-5 animate-in">
      <PageHeader
        eyebrow="Foco"
        title="Produtividade"
        subtitle="Foco do dia, hábitos, notas e sessões de trabalho profundo."
      />

      {/* Top row: Foco do dia + Pomodoro side by side on desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FocosDoDia />
        <PomodoroCard />
      </div>

      <Habitos />
      <NotesKanban />
    </div>
  );
}

/* Focos do Dia */
function FocosDoDia() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const d = today();
  const [delId, setDelId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["focos", d],
    queryFn: async () => {
      const rows = await selectAll("focos_diarios");
      return (rows as any[]).filter((r: any) => r.data === d).sort((a: any, b: any) => a.ordem - b.ordem);
    },
  });
  const add = useMutation({
    mutationFn: (texto: string) =>
      insertRow("focos_diarios", { data: d, ordem: (q.data?.length ?? 0) + 1, texto, feito: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focos"] }),
  });
  const upd = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("focos_diarios", id, patch),
    onSuccess: (_d: any, v: any) => {
      qc.invalidateQueries({ queryKey: ["focos"] });
      if (v.patch.feito) playSound("celebration");
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("focos_diarios", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focos"] }),
  });

  const [novo, setNovo] = useState("");
  const rows = (q.data ?? []) as any[];
  const feitos = rows.filter((r) => r.feito).length;
  const canAdd = rows.length < 3;

  return (
    <section className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Foco do dia</h2>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {feitos}/{rows.length || 3} ✓
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">Máximo 3 prioridades. Menos é mais.</p>

      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.id} className={cn("flex items-center gap-2 p-2.5 rounded-lg border", r.feito ? "bg-primary/5 border-primary/30" : "border-border bg-background")}>
            <button
              onClick={() => upd.mutate({ id: r.id, patch: { feito: !r.feito } })}
              className={cn("h-7 w-7 shrink-0 rounded-lg grid place-items-center", r.feito ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
            >
              {r.feito ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
            </button>
            <Input
              defaultValue={r.texto}
              onBlur={(e) => e.target.value !== r.texto && upd.mutate({ id: r.id, patch: { texto: e.target.value } })}
              className={cn("h-7 border-0 bg-transparent shadow-none focus-visible:ring-1 text-sm font-medium", r.feito && "line-through opacity-60")}
            />
            <button onClick={() => setDelId(r.id)} className="text-negative/60 hover:text-negative shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {canAdd && (
          <form onSubmit={(e) => { e.preventDefault(); if (novo.trim()) { add.mutate(novo.trim()); setNovo(""); } }} className="flex gap-2">
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder={`Foco #${rows.length + 1}...`} className="h-9 text-sm" />
            <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /></Button>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { del.mutate(delId); setDelId(null); } }}
        title="Excluir foco?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" variant="destructive"
      />
    </section>
  );
}

/* Pomodoro */
function PomodoroCard() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [duracao, setDuracao] = useState(25);
  const [segundos, setSegundos] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const [tarefa, setTarefa] = useState("");
  const intervalRef = useRef<number | null>(null);

  const logged = useQuery({ queryKey: ["pomodoros"], queryFn: () => selectAll("pomodoros") });
  const log = useMutation({
    mutationFn: (payload: any) => insertRow("pomodoros", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pomodoros"] }),
  });

  useEffect(() => {
    if (!rodando) return;
    intervalRef.current = window.setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          setRodando(false);
          playSound("celebration");
          log.mutate({ data: today(), duracao_min: duracao, tarefa: tarefa || null });
          return duracao * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [rodando, duracao, tarefa]);

  useEffect(() => { if (!rodando) setSegundos(duracao * 60); }, [duracao]);

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");
  const progresso = 1 - segundos / (duracao * 60);
  const hoje = ((logged.data ?? []) as any[]).filter((r) => r.data === today());
  const minutosHoje = hoje.reduce((a, r) => a + (r.duracao_min ?? 0), 0);

  return (
    <section className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Sessão de foco</h2>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {minutosHoje} min hoje
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - progresso)}
              className="text-primary transition-all duration-500" />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-mono text-2xl font-bold tabular-nums">
            {mm}:{ss}
          </div>
        </div>

        <Input value={tarefa} onChange={(e) => setTarefa(e.target.value)} placeholder="No que vai focar?" className="h-9 max-w-xs text-center text-sm" />

        <div className="flex gap-1.5">
          {[15, 25, 45, 60].map((m) => (
            <button key={m} onClick={() => setDuracao(m)}
              className={cn("px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all",
                duracao === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {m}min
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setRodando((r) => !r)} className="min-w-28 h-9 text-sm">
            {rodando ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pausar</> : <><Play className="h-3.5 w-3.5 mr-1" /> Iniciar</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRodando(false); setSegundos(duracao * 60); }}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* Hábitos */
function Habitos() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [delId, setDelId] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const semana = weekDates();
  const hj = today();

  const habitos = useQuery({ queryKey: ["habitos"], queryFn: () => selectAll("habitos") });
  const regs = useQuery({ queryKey: ["habitos_registros"], queryFn: () => selectAll("habitos_registros") });
  const rs = (regs.data ?? []) as any[];

  const addH = useMutation({
    mutationFn: (nome: string) => insertRow("habitos", { nome, icone: "", ativo: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habitos"] }),
  });
  const delH = useMutation({
    mutationFn: (id: string) => deleteRow("habitos", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["habitos"] }); qc.invalidateQueries({ queryKey: ["habitos_registros"] }); },
  });
  const toggle = useMutation({
    mutationFn: async ({ habito_id, data, existing }: any) => {
      if (existing) { deleteRow("habitos_registros", existing.id); return; }
      insertRow("habitos_registros", { habito_id, data, feito: true });
    },
    onSuccess: (_d: any, v: any) => { qc.invalidateQueries({ queryKey: ["habitos_registros"] }); if (!v.existing) playSound("celebration"); },
  });

  function streak(hid: string): number {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = dayShift(-i);
      const has = rs.some((r) => r.habito_id === hid && r.data === d && r.feito);
      if (has) s++;
      else if (i === 0) continue;
      else break;
    }
    return s;
  }

  return (
    <section className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-semibold">Hábitos</h2>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (novo.trim()) { addH.mutate(novo.trim()); setNovo(""); } }} className="flex gap-2">
        <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex.: Ler 20 min, Exercício..." className="h-9 text-sm" />
        <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /></Button>
      </form>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-muted-foreground">
              <th className="text-left font-medium pb-1.5">Hábito</th>
              {semana.map((d) => {
                const day = new Date(d + "T00:00:00");
                const isToday = d === hj;
                return (
                  <th key={d} className={cn("text-center font-medium pb-1.5 px-1", isToday && "text-primary")}>
                    <div className="uppercase">{"D S T Q Q S S".split(" ")[day.getDay()]}</div>
                    <div className={cn("text-[10px]", isToday && "font-bold")}>{day.getDate()}</div>
                  </th>
                );
              })}
              <th className="text-center font-medium pb-1.5 pl-2">🔥</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(habitos.data ?? []).map((h: any) => (
              <tr key={h.id} className="border-t border-border">
                <td className="py-1.5 pr-2">
                  <span className="text-xs font-medium">{h.nome}</span>
                </td>
                {semana.map((d) => {
                  const existing = rs.find((r) => r.habito_id === h.id && r.data === d);
                  const isFuture = d > hj;
                  return (
                    <td key={d} className="text-center px-1 py-1.5">
                      <button disabled={isFuture}
                        onClick={() => toggle.mutate({ habito_id: h.id, data: d, existing })}
                        className={cn("h-7 w-7 rounded-lg mx-auto grid place-items-center transition-all",
                          existing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                          isFuture && "opacity-30 cursor-not-allowed")}>
                        {existing && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  );
                })}
                <td className="text-center pl-2">
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-primary tabular-nums">
                    {streak(h.id)}
                  </span>
                </td>
                <td>
                  <button onClick={() => setDelId(h.id)} className="text-negative/60 hover:text-negative">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!delId} onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { delH.mutate(delId); setDelId(null); } }}
        title="Excluir hábito?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" variant="destructive"
      />
    </section>
  );
}

/* Notes / Kanban */
function NotesKanban() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [delId, setDelId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [novoTitulo, setNovoTitulo] = useState("");

  const q = useQuery({
    queryKey: ["notas"],
    queryFn: () => selectAll("notas"),
  });
  const notas = ((q.data ?? []) as any[]).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const add = useMutation({
    mutationFn: (coluna: string) => insertRow("notas", {
      titulo: novoTitulo || "Nova nota",
      conteudo: "",
      coluna,
      ordem: notas.filter((n) => n.coluna === coluna).length + 1,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notas"] }); playSound("pop"); setAddingTo(null); setNovoTitulo(""); },
  });
  const upd = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("notas", id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("notas", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notas"] }); playSound("pop"); },
  });
  const mover = (id: string, para: string) => upd.mutate({ id, patch: { coluna: para } });

  return (
    <section className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Notas / Kanban</h2>
          <span className="text-[10px] text-muted-foreground">{notas.length} cartões</span>
        </div>
      </div>

      {/* Kanban columns - horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory lg:grid lg:grid-cols-3">
        {COLUNAS.map((col) => {
          const cards = notas.filter((n) => n.coluna === col.key);
          return (
            <div key={col.key} className={cn(
              "flex flex-col min-w-[260px] lg:min-w-0 snap-start rounded-lg border-t-[3px] border-x border-b border-border/60",
              col.key === "a_fazer" && "border-t-muted-foreground/40",
              col.key === "fazendo" && "border-t-primary",
              col.key === "feito" && "border-t-positive",
            )}>
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold">{col.label}</h3>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">{cards.length}</span>
                </div>
                <button
                  onClick={() => setAddingTo(col.key)}
                  className="h-6 w-6 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[100px]">
                {cards.map((nota) => {
                  const etiqueta = ETIQUETAS.find((e) => e.value === nota.etiqueta);
                  const colIndex = COLUNAS.findIndex((c) => c.key === col.key);
                  return (
                    <div key={nota.id} className="rounded-lg bg-card border border-border/80 p-3 space-y-2 transition-all hover:shadow-sm group">
                      {/* Title row */}
                      <div className="flex items-start gap-1">
                        <Input
                          defaultValue={nota.titulo}
                          onBlur={(e) => e.target.value !== nota.titulo && upd.mutate({ id: nota.id, patch: { titulo: e.target.value } })}
                          className="h-6 border-0 bg-transparent shadow-none focus-visible:ring-1 text-xs font-semibold px-0"
                        />
                        <button onClick={() => setDelId(nota.id)} className="opacity-0 group-hover:opacity-100 text-negative/50 hover:text-negative transition-all shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Content */}
                      <textarea
                        defaultValue={nota.conteudo ?? ""}
                        onBlur={(e) => e.target.value !== (nota.conteudo ?? "") && upd.mutate({ id: nota.id, patch: { conteudo: e.target.value } })}
                        placeholder="Escreva..."
                        rows={2}
                        className="w-full text-[11px] text-muted-foreground bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground/30"
                      />

                      {/* Etiqueta + move buttons */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {/* Etiqueta selector */}
                          <select
                            value={nota.etiqueta ?? ""}
                            onChange={(e) => upd.mutate({ id: nota.id, patch: { etiqueta: e.target.value } })}
                            className="text-[10px] bg-transparent outline-none rounded px-1 py-0.5 hover:bg-muted transition-colors"
                          >
                            {ETIQUETAS.map((e) => (
                              <option key={e.value} value={e.value} className="bg-card">{e.label || "Sem etiqueta"}</option>
                            ))}
                          </select>
                        </div>

                        {/* Move buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {colIndex > 0 && (
                            <button onClick={() => mover(nota.id, COLUNAS[colIndex - 1].key)}
                              className="h-6 w-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title={`Mover para "${COLUNAS[colIndex - 1].label}"`}>
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                          )}
                          {colIndex < COLUNAS.length - 1 && (
                            <button onClick={() => mover(nota.id, COLUNAS[colIndex + 1].key)}
                              className="h-6 w-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title={`Mover para "${COLUNAS[colIndex + 1].label}"`}>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {cards.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-muted-foreground/50">
                    {col.key === "a_fazer" ? "Adicione cards à coluna" :
                     col.key === "fazendo" ? "Mova cards para cá" :
                     "Cards concluídos aparecem aqui"}
                  </div>
                )}
              </div>

              {/* Inline add form */}
              {addingTo === col.key && (
                <div className="p-2 border-t border-border/40">
                  <form onSubmit={(e) => { e.preventDefault(); add.mutate(col.key); }} className="flex gap-1">
                    <Input
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                      placeholder="Título da nota..."
                      className="h-8 text-xs"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-8"><Plus className="h-3.5 w-3.5" /></Button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!delId} onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { del.mutate(delId); setDelId(null); } }}
        title="Excluir nota?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" variant="destructive"
      />
    </section>
  );
}
