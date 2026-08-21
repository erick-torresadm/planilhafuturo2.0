import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Plus,
  Zap,
  ZapOff,
  Search,
  TrendingDown,
  Home,
  Heart,
  Gamepad2,
  Car,
  FileText,
  BookOpen,
  UtensilsCrossed,
  Smartphone,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import { Money } from "@/components/Money";
import { KpiCardV2 } from "@/components/dashboards/KpiCardV2";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import type { GastoFixo } from "@/lib/finance";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* /v2/gastos — mesmas mutations/dialogs de /gastos (CRUD identico),
   visual novo: cards agrupados por categoria em vez de lista/tabela plana. */
export const Route = createFileRoute("/_authenticated/v2/gastos")({
  head: () => ({ meta: [{ title: "Gastos Fixos — planilhafuturo v2" }] }),
  component: GastosPageV2,
});

const CATEGORIAS = [
  "Moradia",
  "Saude",
  "Lazer",
  "Transporte",
  "Imposto",
  "Educacao",
  "Alimentacao",
  "Telefonia",
  "Outros",
];
const CAT_ICON: Record<string, typeof Home> = {
  Moradia: Home,
  Saude: Heart,
  Lazer: Gamepad2,
  Transporte: Car,
  Imposto: FileText,
  Educacao: BookOpen,
  Alimentacao: UtensilsCrossed,
  Telefonia: Smartphone,
  Outros: MoreHorizontal,
};
const TIPOS = [
  ["P", "Parcelado"],
  ["A", "Assinatura"],
  ["C", "Contrato"],
] as const;
const FORMAS = ["Pix", "Cartao", "Debito", "Boleto"];
const FREQ = ["mensal", "anual"] as const;

/* Tags customizadas: categorias que o usuario digitou e nao estavam na
   lista fixa. Persistidas no navegador pra sugerir de novo depois —
   assim ele "adiciona mais coisas" sem precisar de uma tela de admin. */
const CUSTOM_TAGS_KEY = "pf_gastos_tags_v2";

function loadCustomTags(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveCustomTag(tag: string) {
  try {
    const cur = loadCustomTags();
    if (!cur.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify([...cur, tag]));
    }
  } catch {
    // localStorage indisponivel (modo privado etc) — segue sem persistir
  }
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

function GastosPageV2() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const allRows: GastoFixo[] = ((q.data ?? []) as any)
    .slice()
    .sort((a: any, b: any) => a.dia - b.dia);

  const rows = useMemo(
    () =>
      allRows.filter((r) => !search || r.descricao.toLowerCase().includes(search.toLowerCase())),
    [allRows, search],
  );

  const groups = useMemo(() => {
    const m = new Map<string, GastoFixo[]>();
    for (const r of rows) {
      const k = r.categoria || "Outros";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()].sort((a, b) => {
      const subA = a[1].filter((r) => r.ativo).reduce((s, r) => s + Number(r.valor), 0);
      const subB = b[1].filter((r) => r.ativo).reduce((s, r) => s + Number(r.valor), 0);
      return subB - subA;
    });
  }, [rows]);

  const allTags = useMemo(() => {
    const usadas = allRows.map((r) => r.categoria).filter(Boolean);
    const set = new Set<string>([...CATEGORIAS, ...usadas, ...loadCustomTags()]);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allRows]);

  const upd = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateRow("gastos_fixos", id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["gastos_fixos"] });
      const prev = qc.getQueryData(["gastos_fixos"]) as any;
      qc.setQueryData(["gastos_fixos"], (old: any[]) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["gastos_fixos"], ctx.prev);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos_fixos"] }),
  });
  const add = useMutation({
    mutationFn: (data: any) => insertRow("gastos_fixos", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos_fixos"] });
      playSound("moeda");
      toast.success("Gasto criado");
      setOpenNew(false);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRow("gastos_fixos", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos_fixos"] });
      playSound("pop");
    },
  });

  const totalAtivo = allRows.filter((r) => r.ativo).reduce((a, r) => a + Number(r.valor), 0);
  const qtdAtivos = allRows.filter((r) => r.ativo).length;
  const maiorGasto = allRows
    .filter((r) => r.ativo)
    .reduce(
      (max, r) => (Number(r.valor) > Number(max?.valor ?? 0) ? r : max),
      null as GastoFixo | null,
    );
  const loading = q.isPending;

  return (
    <div className="page-container space-y-4 animate-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Gastos Fixos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alimenta seu fluxo diário automaticamente
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Novo gasto</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
        <KpiCardV2
          label="Total ativo/mês"
          value={totalAtivo}
          icon={TrendingDown}
          hint={`${qtdAtivos} de ${allRows.length} contas`}
          tone="negative"
        />
        <KpiCardV2
          label="Média por conta"
          value={qtdAtivos ? totalAtivo / qtdAtivos : 0}
          hint="Ticket médio mensal"
          tone="negative"
        />
        <div className="rounded-2xl border border-border bg-card p-4 col-span-2 lg:col-span-1">
          <span className="eyebrow">Maior gasto</span>
          <div className="font-display text-xl font-bold mt-1 tabular-nums truncate text-negative">
            {maiorGasto ? <Money value={Number(maiorGasto.valor)} /> : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {maiorGasto?.descricao ?? "—"}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descrição…"
          className="w-full h-11 pl-9 pr-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum gasto"
          description="Nenhum gasto encontrado com esse filtro."
        />
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          {groups.map(([cat, catRows]) => {
            const Icon = CAT_ICON[cat] ?? MoreHorizontal;
            const subtotal = catRows
              .filter((r) => r.ativo)
              .reduce((s, r) => s + Number(r.valor), 0);
            return (
              <motion.div key={cat} variants={item}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-bold">{cat}</span>
                    <span className="text-xs text-muted-foreground">({catRows.length})</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-negative">
                    <Money value={subtotal} />
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {catRows.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-2xl bg-card border border-border p-4 transition-shadow hover:shadow-card",
                        !r.ativo && "opacity-50",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            defaultValue={r.descricao}
                            onBlur={(e) =>
                              e.target.value !== r.descricao &&
                              upd.mutate({ id: r.id, patch: { descricao: e.target.value } })
                            }
                            className="w-full bg-transparent outline-none font-semibold text-sm"
                          />
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>Dia {r.dia}</span>
                            <span>·</span>
                            <span>{r.forma}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => upd.mutate({ id: r.id, patch: { ativo: !r.ativo } })}
                          aria-label={r.ativo ? "Desativar gasto" : "Ativar gasto"}
                          className={cn(
                            "h-11 w-11 rounded-lg grid place-items-center transition-colors shrink-0",
                            r.ativo
                              ? "text-primary hover:bg-primary/10"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {r.ativo ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <MoneyInput
                          value={Number(r.valor) || 0}
                          onCommit={(v) =>
                            v !== Number(r.valor) && upd.mutate({ id: r.id, patch: { valor: v } })
                          }
                          size="md"
                          align="left"
                          inputClassName="text-lg font-bold text-negative"
                        />
                        <button
                          onClick={() => setDelId(r.id)}
                          aria-label={`Excluir ${r.descricao}`}
                          className="h-11 w-11 rounded-lg grid place-items-center text-negative/70 hover:text-negative hover:bg-negative-soft/50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <NewGastoDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onSave={(data) => add.mutate(data)}
        saving={add.isPending}
        tags={allTags}
      />
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => {
          if (!o) setDelId(null);
        }}
        onConfirm={() => {
          if (delId) {
            del.mutate(delId);
            setDelId(null);
          }
        }}
        title="Excluir gasto?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}

function NewGastoDialog({
  open,
  onOpenChange,
  onSave,
  saving,
  tags,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: any) => void;
  saving: boolean;
  tags: string[];
}) {
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
    setForm({
      descricao: "",
      categoria: "Outros",
      valor: "",
      tipo: "A",
      frequencia: "mensal",
      dia: 1,
      mes_anual: 1,
      forma: "Pix",
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo gasto fixo</DialogTitle>
          <DialogDescription>
            Preencha os dados para adicionar ao seu fluxo mensal.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.descricao.trim()) return;
            const categoria = form.categoria.trim() || "Outros";
            if (!CATEGORIAS.includes(categoria)) saveCustomTag(categoria);
            onSave({
              descricao: form.descricao.trim(),
              categoria,
              valor: Number(String(form.valor).replace(",", ".")) || 0,
              tipo: form.tipo,
              frequencia: form.frequencia,
              dia: Number(form.dia) || 1,
              mes_anual: form.frequencia === "anual" ? Number(form.mes_anual) || 1 : null,
              forma: form.forma,
              ativo: true,
            });
            reset();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="g-desc-v2">Descrição</Label>
            <Input
              id="g-desc-v2"
              autoFocus
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Aluguel, Netflix…"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-valor-v2">Valor (R$)</Label>
              <Input
                id="g-valor-v2"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-cat-v2">Categoria (tag)</Label>
              <Input
                id="g-cat-v2"
                list="g-cat-datalist-v2"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Escolha ou digite uma nova…"
                autoComplete="off"
              />
              <datalist id="g-cat-datalist-v2">
                {tags.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <select
                value={form.frequencia}
                onChange={(e) => setForm({ ...form, frequencia: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {FREQ.map((f) => (
                  <option key={f} value={f} className="capitalize">
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia do mês</Label>
              <select
                value={form.dia}
                onChange={(e) => setForm({ ...form, dia: Number(e.target.value) })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {form.frequencia === "anual" && (
            <div className="space-y-1.5">
              <Label>Mês do ano</Label>
              <select
                value={form.mes_anual}
                onChange={(e) => setForm({ ...form, mes_anual: Number(e.target.value) })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {[
                  "Jan",
                  "Fev",
                  "Mar",
                  "Abr",
                  "Mai",
                  "Jun",
                  "Jul",
                  "Ago",
                  "Set",
                  "Out",
                  "Nov",
                  "Dez",
                ].map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TIPOS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Forma</Label>
              <select
                value={form.forma}
                onChange={(e) => setForm({ ...form, forma: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {FORMAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
