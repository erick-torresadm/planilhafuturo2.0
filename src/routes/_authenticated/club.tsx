import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { CLUB_PLANOS, videoEmbedUrl, type ContentTier } from "@/lib/club.rules";
import {
  getClubStatus,
  ativarVitalicioClube,
  cancelarRenovacaoClube,
  solicitarReembolso,
  listarPosts,
  criarPost,
  excluirPost,
  fixarPost,
  listarEventos,
  criarEvento,
  rsvpEvento,
  listarAulas,
  criarAula,
  editarAula,
  excluirAula,
  type PostRow,
  type EventoRow,
  type AulaRow,
} from "@/lib/club.functions";
import {
  Lock,
  Pin,
  PinOff,
  Trash2,
  Users,
  CalendarDays,
  Plus,
  Sparkles,
  Crown,
  PlayCircle,
  Pencil,
} from "lucide-react";

const NIVEL_LABEL: Record<ContentTier, string> = {
  free: "Grátis",
  start: "Start",
  premium: "Premium",
};

export const Route = createFileRoute("/_authenticated/club")({
  head: () => ({ meta: [{ title: "PlanilhaClub — planilhafuturo" }] }),
  component: ClubPage,
});

const TIER_LABEL = { none: "Grátis", start: "Start", premium: "Premium" } as const;

function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ClubPage() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["club-status"], queryFn: () => getClubStatus() });
  const s = status.data;
  const tier = s?.tier ?? "none";
  const isMember = tier !== "none";
  const invalidateStatus = () => qc.invalidateQueries({ queryKey: ["club-status"] });

  const ativarVitalicio = useMutation({
    mutationFn: () => ativarVitalicioClube(),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("12 meses de clube ativados!");
        invalidateStatus();
      } else toast.error(r.error);
    },
  });
  const cancelar = useMutation({
    mutationFn: () => cancelarRenovacaoClube(),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("Renovação cancelada. Seu acesso segue até o fim do período.");
        invalidateStatus();
      } else toast.error(r.error);
    },
  });
  const reembolso = useMutation({
    mutationFn: () => solicitarReembolso(),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("Reembolso solicitado. Você receberá o estorno em breve.");
        invalidateStatus();
      } else toast.error(r.error);
    },
  });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReembolso, setConfirmReembolso] = useState(false);

  const fim = s?.membership?.current_period_end
    ? new Date(s.membership.current_period_end).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="page-container space-y-4 animate-in">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow">PlanilhaClub</span>
            <h1 className="font-display text-2xl font-bold mt-0.5 flex items-center gap-2">
              Comunidade
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  isMember ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground",
                )}
              >
                {isMember && <Crown className="h-3 w-3" />} {TIER_LABEL[tier]}
              </span>
            </h1>
            {isMember && fim && (
              <p className="text-xs text-muted-foreground mt-1">
                Acesso até {fim}
                {s?.membership?.cancel_renewal ? " · renovação cancelada" : ""}
              </p>
            )}
          </div>
          {s?.isAdmin && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-1">
              ADMIN
            </span>
          )}
        </div>

        {s?.avisoRenovacao && (
          <div className="rounded-xl bg-warning-soft border border-warning/30 px-4 py-3 text-sm">
            Seu clube vence em {fim}. Renove para não perder o acesso.
            <Link
              to="/club/assinar"
              search={{ plan: s.membership?.plan ?? "start" }}
              className="ml-2 font-semibold text-warning underline"
            >
              Renovar
            </Link>
          </div>
        )}

        {!isMember && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(["start", "premium"] as const).map((p) => (
              <Link
                key={p}
                to="/club/assinar"
                search={{ plan: p }}
                className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
              >
                <div className="font-semibold">{CLUB_PLANOS[p].nome}</div>
                <div className="text-2xl font-bold tabular-nums mt-1">
                  R${" "}
                  {(p === "start"
                    ? (s?.ofertas.start ?? CLUB_PLANOS.start.valor)
                    : (s?.ofertas.premium ?? CLUB_PLANOS.premium.valor)
                  )
                    .toFixed(2)
                    .replace(".", ",")}
                  <span className="text-xs text-muted-foreground font-normal"> /ano</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {p === "start" ? "Clube + planilha em Excel" : "Clube + sistema hospedado"}
                </div>
              </Link>
            ))}
            {s?.ofertas.vitalicioDisponivel && (
              <Button
                onClick={() => ativarVitalicio.mutate()}
                disabled={ativarVitalicio.isPending}
                className="sm:col-span-2 h-12 rounded-xl"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Ativar meus 12 meses de clube (Vitalício)
              </Button>
            )}
          </div>
        )}

        {isMember && (
          <div className="flex flex-wrap gap-2 text-xs">
            {s?.podeReembolsar && (
              <button onClick={() => setConfirmReembolso(true)} className="text-negative underline">
                Pedir reembolso (7 dias)
              </button>
            )}
            {!s?.membership?.cancel_renewal && s?.membership?.source !== "vitalicio_included" && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="text-muted-foreground underline"
              >
                Cancelar renovação
              </button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="aulas">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aulas">
            <PlayCircle className="h-4 w-4 mr-1.5" /> Aulas
          </TabsTrigger>
          <TabsTrigger value="feed">
            <Users className="h-4 w-4 mr-1.5" /> Feed
          </TabsTrigger>
          <TabsTrigger value="eventos">
            <CalendarDays className="h-4 w-4 mr-1.5" /> Eventos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="aulas">
          <Aulas isAdmin={!!s?.isAdmin} />
        </TabsContent>
        <TabsContent value="feed">
          <Feed isMember={isMember} isAdmin={!!s?.isAdmin} />
        </TabsContent>
        <TabsContent value="eventos">
          <Eventos isMember={isMember} isAdmin={!!s?.isAdmin} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        onConfirm={() => cancelar.mutate()}
        title="Cancelar a renovação?"
        description="Sem reembolso proporcional. Seu acesso continua até o fim do período já pago."
        confirmLabel="Cancelar renovação"
        variant="destructive"
      />
      <ConfirmDialog
        open={confirmReembolso}
        onOpenChange={setConfirmReembolso}
        onConfirm={() => reembolso.mutate()}
        title="Pedir reembolso integral?"
        description="Você perde o acesso ao clube agora. O estorno é feito na forma de pagamento original."
        confirmLabel="Pedir reembolso"
        variant="destructive"
      />
    </div>
  );
}

function Feed({ isMember, isAdmin }: { isMember: boolean; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<"public" | "closed">("public");
  const [texto, setTexto] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const posts = useQuery({
    queryKey: ["club-posts", channel],
    queryFn: () => listarPosts({ data: { channel } }),
    refetchInterval: 30_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["club-posts"] });
  const publicar = useMutation({
    mutationFn: () => criarPost({ data: { channel, content: texto } }),
    onSuccess: (r) => {
      if (r.ok) {
        setTexto("");
        invalidate();
      } else toast.error(r.error);
    },
  });
  const excluir = useMutation({
    mutationFn: (id: string) => excluirPost({ data: { id } }),
    onSuccess: invalidate,
  });
  const fixar = useMutation({
    mutationFn: (p: { id: string; pinned: boolean }) => fixarPost({ data: p }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-3 mt-3">
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {(["public", "closed"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={cn(
              "h-9 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
              channel === c
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c === "closed" && !isMember && <Lock className="h-3.5 w-3.5" />}{" "}
            {c === "public" ? "Público" : "Fechado"}
          </button>
        ))}
      </div>

      {channel === "closed" && !isMember ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Canal fechado é só pra membros.{" "}
          <Link
            to="/club/assinar"
            search={{ plan: "start" }}
            className="text-primary font-semibold underline"
          >
            Assinar o clube
          </Link>
        </div>
      ) : (
        <>
          {isMember ? (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, 2000))}
                rows={3}
                placeholder={
                  channel === "public" ? "Compartilhe com todo mundo…" : "Só membros veem isso…"
                }
                className="w-full resize-none bg-transparent outline-none text-sm p-1"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {texto.length}/2000
                </span>
                <Button
                  size="sm"
                  onClick={() => publicar.mutate()}
                  disabled={!texto.trim() || publicar.isPending}
                >
                  Publicar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-1">
              Você está só lendo.{" "}
              <Link
                to="/club/assinar"
                search={{ plan: "start" }}
                className="text-primary font-semibold underline"
              >
                Vire membro
              </Link>{" "}
              pra participar.
            </p>
          )}

          {posts.isPending && <div className="skeleton h-24 rounded-2xl" />}
          {posts.data?.posts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum post ainda.</p>
          )}
          {posts.data?.posts.map((p: PostRow) => (
            <article
              key={p.id}
              className={cn(
                "rounded-2xl border bg-card p-4",
                p.pinned ? "border-primary/40" : "border-border",
              )}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{p.authorNome}</strong> ·{" "}
                  {tempoRelativo(p.createdAt)}
                  {p.pinned && " · fixado"}
                </span>
                <span className="flex items-center gap-1">
                  {isAdmin && (
                    <button
                      onClick={() => fixar.mutate({ id: p.id, pinned: !p.pinned })}
                      aria-label={p.pinned ? "Desafixar" : "Fixar"}
                      className="h-11 w-11 -m-2 grid place-items-center hover:text-primary"
                    >
                      {p.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                  )}
                  {(isAdmin || p.mine) && (
                    <button
                      onClick={() => setDelId(p.id)}
                      aria-label="Excluir post"
                      className="h-11 w-11 -m-2 grid place-items-center hover:text-negative"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap break-words">{p.content}</p>
            </article>
          ))}
        </>
      )}

      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => {
          if (!o) setDelId(null);
        }}
        onConfirm={() => {
          if (delId) {
            excluir.mutate(delId);
            setDelId(null);
          }
        }}
        title="Excluir post?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}

function Eventos({ isMember, isAdmin }: { isMember: boolean; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "call" as "call" | "desafio",
    description: "",
    scheduledAt: "",
    tierRequired: "start" as ContentTier,
  });
  const eventos = useQuery({
    queryKey: ["club-eventos"],
    queryFn: () => listarEventos(),
    refetchInterval: 60_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["club-eventos"] });
  const criar = useMutation({
    mutationFn: () => criarEvento({ data: form }),
    onSuccess: (r) => {
      if (r.ok) {
        setNovo(false);
        setForm({
          title: "",
          type: "call",
          description: "",
          scheduledAt: "",
          tierRequired: "start",
        });
        invalidate();
      } else toast.error(r.error);
    },
  });
  const rsvp = useMutation({
    mutationFn: (eventId: string) => rsvpEvento({ data: { eventId } }),
    onSuccess: (r) => {
      if (r.ok) invalidate();
      else toast.error(r.error);
    },
  });

  const agora = Date.now();
  const proximos = (eventos.data?.eventos ?? []).filter(
    (e) => new Date(e.scheduledAt).getTime() >= agora,
  );
  const passados = (eventos.data?.eventos ?? [])
    .filter((e) => new Date(e.scheduledAt).getTime() < agora)
    .reverse();

  const Card = ({ e, passado }: { e: EventoRow; passado?: boolean }) => (
    <div className={cn("rounded-2xl border border-border bg-card p-4", passado && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-semibold",
                e.type === "call" ? "bg-primary/10 text-primary" : "bg-warning-soft text-warning",
              )}
            >
              {e.type === "call" ? "Call" : "Desafio"}
            </span>
            {e.tierRequired !== "free" && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> {NIVEL_LABEL[e.tierRequired]}+
              </span>
            )}
          </div>
          <h3 className="font-semibold mt-1.5">{e.title}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(e.scheduledAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {e.rsvps} confirmado{e.rsvps === 1 ? "" : "s"}
          </p>
          {e.description && <p className="text-sm mt-2 whitespace-pre-wrap">{e.description}</p>}
        </div>
        {isMember && !passado && (
          <Button
            size="sm"
            variant={e.going ? "default" : "outline"}
            onClick={() => rsvp.mutate(e.id)}
            disabled={rsvp.isPending}
          >
            {e.going ? "Vou" : "Confirmar"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 mt-3">
      {isAdmin && (
        <Button onClick={() => setNovo(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo evento
        </Button>
      )}
      {eventos.isPending && <div className="skeleton h-24 rounded-2xl" />}
      {proximos.length === 0 && !eventos.isPending && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento agendado.</p>
      )}
      {proximos.map((e) => (
        <Card key={e.id} e={e} />
      ))}
      {passados.length > 0 && (
        <details className="pt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Passados ({passados.length})
          </summary>
          <div className="space-y-2 mt-2">
            {passados.map((e) => (
              <Card key={e.id} e={e} passado />
            ))}
          </div>
        </details>
      )}

      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo evento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              criar.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Título</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-type">Tipo</Label>
                <select
                  id="ev-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "call" | "desafio" })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="call">Call</option>
                  <option value="desafio">Desafio</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-tier">Quem vê</Label>
                <select
                  id="ev-tier"
                  value={form.tierRequired}
                  onChange={(e) =>
                    setForm({ ...form, tierRequired: e.target.value as ContentTier })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="free">Grátis (todo mundo)</option>
                  <option value="start">Start e Premium</option>
                  <option value="premium">Só Premium</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-when">Data e hora</Label>
              <Input
                id="ev-when"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">Descrição</Label>
              <textarea
                id="ev-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNovo(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? "Salvando…" : "Criar evento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type AulaForm = {
  title: string;
  description: string;
  videoUrl: string;
  tierRequired: ContentTier;
  modulo: string;
  ordem: number;
  published: boolean;
};
const AULA_VAZIA: AulaForm = {
  title: "",
  description: "",
  videoUrl: "",
  tierRequired: "start",
  modulo: "",
  ordem: 0,
  published: true,
};

function Aulas({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const aulas = useQuery({ queryKey: ["club-aulas"], queryFn: () => listarAulas() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["club-aulas"] });
  const [editando, setEditando] = useState<{ id: string | null; form: AulaForm } | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: () => {
      if (!editando) return Promise.resolve({ ok: false as const, error: "Nada a salvar" });
      const d = {
        ...editando.form,
        description: editando.form.description || undefined,
        videoUrl: editando.form.videoUrl || undefined,
        modulo: editando.form.modulo || undefined,
      };
      return editando.id ? editarAula({ data: { id: editando.id, ...d } }) : criarAula({ data: d });
    },
    onSuccess: (r) => {
      if (r.ok) {
        setEditando(null);
        invalidate();
      } else toast.error(r.error);
    },
  });
  const excluir = useMutation({
    mutationFn: (id: string) => excluirAula({ data: { id } }),
    onSuccess: invalidate,
  });

  const porModulo = new Map<string, AulaRow[]>();
  for (const a of aulas.data?.aulas ?? []) {
    const k = a.modulo ?? "Geral";
    porModulo.set(k, [...(porModulo.get(k) ?? []), a]);
  }

  return (
    <div className="space-y-4 mt-3">
      {isAdmin && (
        <Button size="sm" onClick={() => setEditando({ id: null, form: AULA_VAZIA })}>
          <Plus className="h-4 w-4 mr-1" /> Nova aula
        </Button>
      )}
      {aulas.isPending && <div className="skeleton h-24 rounded-2xl" />}
      {!aulas.isPending && porModulo.size === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma aula publicada ainda.
        </p>
      )}

      {[...porModulo.entries()].map(([modulo, lista]) => (
        <section key={modulo} className="space-y-2">
          <h3 className="eyebrow">{modulo}</h3>
          {lista.map((a) => {
            const embed = videoEmbedUrl(a.videoUrl);
            const open = aberta === a.id;
            return (
              <article
                key={a.id}
                className={cn(
                  "rounded-2xl border border-border bg-card overflow-hidden",
                  !a.published && "opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={() => a.liberada && setAberta(open ? null : a.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                      a.liberada ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {a.liberada ? <PlayCircle className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{a.title}</h4>
                      <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                        {NIVEL_LABEL[a.tierRequired]}
                        {a.tierRequired !== "free" ? "+" : ""}
                      </span>
                      {!a.published && (
                        <span className="text-[10px] rounded-full px-2 py-0.5 bg-warning-soft text-warning">
                          rascunho
                        </span>
                      )}
                    </div>
                    {!a.liberada && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Aula do plano {NIVEL_LABEL[a.tierRequired]}.{" "}
                        <Link
                          to="/club/assinar"
                          search={{ plan: a.tierRequired === "premium" ? "premium" : "start" }}
                          className="text-primary font-semibold underline"
                        >
                          Assinar
                        </Link>
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <span
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setEditando({
                            id: a.id,
                            form: {
                              title: a.title,
                              description: a.description ?? "",
                              videoUrl: a.videoUrl ?? "",
                              tierRequired: a.tierRequired,
                              modulo: a.modulo ?? "",
                              ordem: a.ordem,
                              published: a.published,
                            },
                          })
                        }
                        aria-label="Editar aula"
                        className="h-11 w-11 -m-2 grid place-items-center text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDelId(a.id)}
                        aria-label="Excluir aula"
                        className="h-11 w-11 -m-2 grid place-items-center text-muted-foreground hover:text-negative"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </button>
                {open && a.liberada && (
                  <div className="px-4 pb-4 space-y-3">
                    {embed ? (
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                        <iframe
                          src={embed}
                          title={a.title}
                          className="h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : a.videoUrl ? (
                      <a
                        href={a.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary underline"
                      >
                        Abrir vídeo
                      </a>
                    ) : null}
                    {a.description && (
                      <p className="text-sm whitespace-pre-wrap">{a.description}</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}

      <Dialog
        open={!!editando}
        onOpenChange={(o) => {
          if (!o) setEditando(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando?.id ? "Editar aula" : "Nova aula"}</DialogTitle>
          </DialogHeader>
          {editando && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                salvar.mutate();
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="au-title">Título</Label>
                <Input
                  id="au-title"
                  value={editando.form.title}
                  onChange={(e) =>
                    setEditando({ ...editando, form: { ...editando.form, title: e.target.value } })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="au-video">URL do vídeo (YouTube não listado ou Vimeo)</Label>
                <Input
                  id="au-video"
                  type="url"
                  value={editando.form.videoUrl}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      form: { ...editando.form, videoUrl: e.target.value },
                    })
                  }
                  placeholder="https://youtu.be/…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="au-tier">Nível mínimo</Label>
                  <select
                    id="au-tier"
                    value={editando.form.tierRequired}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        form: { ...editando.form, tierRequired: e.target.value as ContentTier },
                      })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="free">Grátis</option>
                    <option value="start">Start</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="au-ordem">Ordem</Label>
                  <Input
                    id="au-ordem"
                    type="number"
                    value={editando.form.ordem}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        form: { ...editando.form, ordem: Number(e.target.value) || 0 },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="au-modulo">Módulo</Label>
                <Input
                  id="au-modulo"
                  value={editando.form.modulo}
                  onChange={(e) =>
                    setEditando({ ...editando, form: { ...editando.form, modulo: e.target.value } })
                  }
                  placeholder="Ex: Investimentos, Cripto, Mentalidade"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="au-desc">Descrição</Label>
                <textarea
                  id="au-desc"
                  value={editando.form.description}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      form: { ...editando.form, description: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editando.form.published}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      form: { ...editando.form, published: e.target.checked },
                    })
                  }
                />{" "}
                Publicada
              </label>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending ? "Salvando…" : "Salvar aula"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => {
          if (!o) setDelId(null);
        }}
        onConfirm={() => {
          if (delId) {
            excluir.mutate(delId);
            setDelId(null);
          }
        }}
        title="Excluir aula?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}
