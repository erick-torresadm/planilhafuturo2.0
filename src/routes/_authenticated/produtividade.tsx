import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSounds } from "@/hooks/useSounds";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Target, Flame, Play, Pause, RotateCcw, Check, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/produtividade")({
  head: () => ({ meta: [{ title: "Produtividade — Planilha Futuro" }] }),
  component: ProdutividadePage,
});

const today = () => new Date().toISOString().slice(0, 10);
const dayShift = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const weekDates = () => Array.from({ length: 7 }, (_, i) => dayShift(i - 3));

function ProdutividadePage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold">Produtividade</h1>
        <p className="text-sm text-muted-foreground">Foco do dia, hábitos e sessões de trabalho profundo.</p>
      </div>
      <FocosDoDia />
      <PomodoroCard />
      <Habitos />
    </div>
  );
}

/* -------------------- FOCOS DO DIA -------------------- */
function FocosDoDia() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const d = today();
  const q = useQuery({
    queryKey: ["focos", d],
    queryFn: async () => {
      const rows = await selectAll("focos_diarios");
      return rows.filter((r) => r.data === d).sort((a, b) => a.ordem - b.ordem);
    },
  });
  const add = useMutation({
    mutationFn: (texto: string) =>
      insertRow("focos_diarios", { data: d, ordem: (q.data?.length ?? 0) + 1, texto, feito: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focos"] }),
  });
  const upd = useMutation({
    mutationFn: ({ id, patch }: any) => updateRow("focos_diarios", id, patch),
    onSuccess: (_d, v: any) => {
      qc.invalidateQueries({ queryKey: ["focos"] });
      if (v.patch.feito) playSound("celebration");
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("focos_diarios", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focos"] }),
  });

  const [novo, setNovo] = useState("");
  const rows = q.data ?? [];
  const feitos = rows.filter((r) => r.feito).length;
  const canAdd = rows.length < 3;

  return (
    <section className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Foco do dia</h2>
        </div>
        <div className="text-xs text-muted-foreground">
          {feitos}/{rows.length || 3} concluídos
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Escolha no máximo 3 tarefas prioritárias. Menos é mais.</p>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className={cn("flex items-center gap-3 p-3 rounded-lg border", r.feito ? "bg-primary/5 border-primary/30" : "border-border bg-background")}>
            <button
              onClick={() => upd.mutate({ id: r.id, patch: { feito: !r.feito } })}
              className={cn("h-8 w-8 shrink-0 rounded-lg grid place-items-center", r.feito ? "mint-gradient" : "bg-black/5 text-muted-foreground")}
            >
              {r.feito ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
            </button>
            <Input
              defaultValue={r.texto}
              onBlur={(e) => e.target.value !== r.texto && upd.mutate({ id: r.id, patch: { texto: e.target.value } })}
              className={cn("h-8 border-0 bg-transparent shadow-none focus-visible:ring-1 font-medium", r.feito && "line-through opacity-60")}
            />
            <button onClick={() => del.mutate(r.id)} className="text-negative/60 hover:text-negative">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {canAdd && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (novo.trim()) {
                add.mutate(novo.trim());
                setNovo("");
              }
            }}
            className="flex gap-2"
          >
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder={`Foco #${rows.length + 1}...`} className="h-10" />
            <Button type="submit" className="mint-gradient font-semibold">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

/* -------------------- POMODORO -------------------- */
function PomodoroCard() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [duracao, setDuracao] = useState(25);
  const [segundos, setSegundos] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const [tarefa, setTarefa] = useState("");
  const intervalRef = useRef<number | null>(null);

  const logged = useQuery({
    queryKey: ["pomodoros"],
    queryFn: () => selectAll("pomodoros"),
  });

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
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [rodando, duracao, tarefa]);

  useEffect(() => {
    if (!rodando) setSegundos(duracao * 60);
  }, [duracao]);

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");
  const progresso = 1 - segundos / (duracao * 60);

  const hoje = (logged.data ?? []).filter((r) => r.data === today());
  const minutosHoje = hoje.reduce((a, r) => a + (r.duracao_min ?? 0), 0);

  return (
    <section className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Sessão de foco</h2>
        </div>
        <div className="text-xs text-muted-foreground">
          Hoje: <span className="font-bold text-foreground">{hoje.length}</span> sessões · {minutosHoje} min
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="oklch(0.82 0.19 165)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={2 * Math.PI * 45 * (1 - progresso)}
              className="transition-all"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-mono text-3xl font-bold tabular-nums">
            {mm}:{ss}
          </div>
        </div>

        <Input
          value={tarefa}
          onChange={(e) => setTarefa(e.target.value)}
          placeholder="No que vai focar?"
          className="h-10 max-w-sm text-center"
        />

        <div className="flex gap-2">
          {[15, 25, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => setDuracao(m)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold",
                duracao === m ? "mint-gradient" : "glass text-muted-foreground",
              )}
            >
              {m}min
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setRodando((r) => !r)} className="mint-gradient font-semibold min-w-32">
            {rodando ? <><Pause className="h-4 w-4 mr-1" /> Pausar</> : <><Play className="h-4 w-4 mr-1" /> Iniciar</>}
          </Button>
          <Button variant="outline" onClick={() => { setRodando(false); setSegundos(duracao * 60); }}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------------------- HÁBITOS -------------------- */
function Habitos() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const habitos = useQuery({ queryKey: ["habitos"], queryFn: () => selectAll("habitos") });
  const regs = useQuery({ queryKey: ["habitos_registros"], queryFn: () => selectAll("habitos_registros") });

  const addH = useMutation({
    mutationFn: (nome: string) => insertRow("habitos", { nome, icone: "🎯", cor: "mint", ativo: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habitos"] }),
  });
  const delH = useMutation({
    mutationFn: (id: string) => deleteRow("habitos", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitos"] });
      qc.invalidateQueries({ queryKey: ["habitos_registros"] });
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ habito_id, data, existing }: any) => {
      if (existing) return deleteRow("habitos_registros", existing.id);
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("habitos_registros" as any).insert({ habito_id, data, feito: true, user_id: u.user?.id });
      if (error) throw error;
    },
    onSuccess: (_d, v: any) => {
      qc.invalidateQueries({ queryKey: ["habitos_registros"] });
      if (!v.existing) playSound("celebration");
    },
  });

  const [novo, setNovo] = useState("");
  const semana = weekDates();
  const hoje = today();
  const rs = regs.data ?? [];

  function streak(hid: string): number {
    let s = 0;
    for (let i = 0; i < 90; i++) {
      const d = dayShift(-i);
      if (rs.some((r) => r.habito_id === hid && r.data === d && r.feito)) s++;
      else if (i > 0) break;
      else break;
    }
    // recalc properly
    s = 0;
    for (let i = 0; i < 365; i++) {
      const d = dayShift(-i);
      const has = rs.some((r) => r.habito_id === hid && r.data === d && r.feito);
      if (has) s++;
      else if (i === 0) continue; // today not done yet doesn't break streak
      else break;
    }
    return s;
  }

  return (
    <section className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Hábitos</h2>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (novo.trim()) { addH.mutate(novo.trim()); setNovo(""); } }}
        className="flex gap-2"
      >
        <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex.: Ler 20 minutos, Exercício, Meditar..." className="h-10" />
        <Button type="submit" className="mint-gradient font-semibold"><Plus className="h-4 w-4" /></Button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-medium pb-2">Hábito</th>
              {semana.map((d) => {
                const day = new Date(d + "T00:00:00");
                const isToday = d === hoje;
                return (
                  <th key={d} className={cn("text-center font-medium pb-2 px-1", isToday && "text-primary")}>
                    <div className="text-[10px] uppercase">{["D","S","T","Q","Q","S","S"][day.getDay()]}</div>
                    <div className={cn("text-xs", isToday && "font-bold")}>{day.getDate()}</div>
                  </th>
                );
              })}
              <th className="text-center font-medium pb-2 pl-2">Streak</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(habitos.data ?? []).map((h) => (
              <tr key={h.id} className="border-t border-border">
                <td className="py-2 pr-2 font-medium">{h.icone} {h.nome}</td>
                {semana.map((d) => {
                  const existing = rs.find((r) => r.habito_id === h.id && r.data === d);
                  const isFuture = d > hoje;
                  return (
                    <td key={d} className="text-center px-1 py-2">
                      <button
                        disabled={isFuture}
                        onClick={() => toggle.mutate({ habito_id: h.id, data: d, existing })}
                        className={cn(
                          "h-8 w-8 rounded-lg mx-auto grid place-items-center transition-all",
                          existing ? "mint-gradient" : "bg-black/5 hover:bg-black/10",
                          isFuture && "opacity-30 cursor-not-allowed",
                        )}
                      >
                        {existing && <Check className="h-4 w-4" />}
                      </button>
                    </td>
                  );
                })}
                <td className="text-center pl-2">
                  <div className="inline-flex items-center gap-1 font-bold text-primary">
                    <Flame className="h-3 w-3" /> {streak(h.id)}
                  </div>
                </td>
                <td>
                  <button onClick={() => confirm("Excluir?") && delH.mutate(h.id)} className="text-negative/60 hover:text-negative">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(habitos.data?.length ?? 0) === 0 && (
              <tr><td colSpan={9} className="text-center py-6 text-sm text-muted-foreground">Nenhum hábito. Comece pequeno: 1 hábito diário.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
