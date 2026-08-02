import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/db";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { getSoundSettings, saveSoundSettings, useSounds } from "@/hooks/useSounds";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Volume2, Sparkles, Check, Crown, Loader2, Copy, Download, Database, FileSpreadsheet, ShieldCheck, Zap, Infinity, ChevronRight, Users, Link2, UserPlus, Trash2, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Money } from "@/components/Money";
import { cn } from "@/lib/utils";
import { hasLocalData, getLocalStats, migrateLocalDataToSupabase, clearLocalData, getLocalTotalCount } from "@/lib/migrate-local-to-supabase";

export const Route = createFileRoute("/_authenticated/config")({
  head: () => ({ meta: [{ title: "Configurações — Planilha" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const save = useMutation({
    mutationFn: async (patch: any) => { await updateProfile(patch); },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["profile"] });
      const prev = qc.getQueryData(["profile"]);
      qc.setQueryData(["profile"], (old: any) => (old ? { ...old, ...patch } : old));
      return { prev };
    },
    onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(["profile"], ctx.prev); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Salvo"); },
  });

  const [sound, setSound] = useState(getSoundSettings());
  useEffect(() => { saveSoundSettings(sound); }, [sound]);

  // ─── Troca de senha ────────
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  async function trocarSenha() {
    if (novaSenha.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres"); return; }
    if (novaSenha !== confirmarSenha) { toast.error("As senhas não conferem"); return; }
    setTrocandoSenha(true);
    try {
      const m = await import("@/lib/seguranca.functions");
      const r = await m.trocarSenha({ data: { novaSenha } });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Senha atualizada!");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (e: any) { toast.error(e.message ?? "Erro ao trocar a senha"); }
    finally { setTrocandoSenha(false); }
  }

  const p = profile.data ?? ({} as any);

  // ─── Migração localStorage → Supabase ────────
  const [migrating, setMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ migrated: number; errors: string[] } | null>(null);
  const localStats = getLocalStats();
  const hasLocal = hasLocalData();

  async function handleMigrate() {
    setMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateLocalDataToSupabase(profile.data?.id ?? "");
      setMigrationResult(result);
      if (result.migrated > 0) { clearLocalData(); setMigrationDone(true); toast.success(`${result.migrated} registros importados!`); }
      else if (result.errors.length > 0) { toast.error("Erro ao importar"); }
      else { toast.success("Nenhum dado novo"); setMigrationDone(true); }
    } catch (e: any) { toast.error(e.message ?? "Erro ao migrar"); }
    finally { setMigrating(false); }
  }

  return (
    <div className="page-container max-w-3xl space-y-5 animate-in">
      <PageHeader
        eyebrow="Ajustes"
        title="Configurações"
        subtitle="Ajuste seu perfil e preferências"
      />

      {/* ─── PLANO / ASSINATURA (REDESIGNED) ─── */}
      <PlanSection />

      {/* ─── EQUIPE / ADM ─── */}
      <EquipeSection />

      {/* ─── PERFIL ─── */}
      <section className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Perfil</h2>
        </div>
        <Field label="Nome"><Input defaultValue={p.nome ?? ""} onBlur={(e) => e.target.value !== (p.nome ?? "") && save.mutate({ nome: e.target.value })} /></Field>
        <Field label="Renda mensal"><MoneyInput value={Number(p.renda_mensal) || 0} onCommit={(v) => save.mutate({ renda_mensal: v })} align="left" size="md" /></Field>
        <Field label="Saldo inicial (base do Fluxo Diário)"><MoneyInput value={Number(p.saldo_inicial) || 0} onCommit={(v) => save.mutate({ saldo_inicial: v })} align="left" size="md" /></Field>
        <Field label="Meta renda fixa (por mês)"><MoneyInput value={Number(p.meta_renda_fixa) || 0} onCommit={(v) => save.mutate({ meta_renda_fixa: v })} align="left" size="md" /></Field>
        <Field label="Meses de reserva de emergência"><Input type="number" defaultValue={p.meses_reserva_emergencia ?? 6} onBlur={(e) => save.mutate({ meses_reserva_emergencia: Number(e.target.value) })} /></Field>
      </section>

      {/* ─── SEGURANÇA / TROCA DE SENHA ─── */}
      <section className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Segurança</h2>
        </div>
        <Field label="Nova senha">
          <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" />
        </Field>
        <Field label="Confirmar nova senha">
          <Input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Repita a nova senha" autoComplete="new-password" />
        </Field>
        <Button onClick={trocarSenha} disabled={trocandoSenha || !novaSenha} className="w-full">
          {trocandoSenha ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
          {trocandoSenha ? "Salvando..." : "Trocar senha"}
        </Button>
        <p className="text-xs text-muted-foreground -mt-2">Depois de trocar, use a nova senha para entrar na próxima vez.</p>
      </section>

      {hasLocal && !migrationDone && (
        <section className="rounded-xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Importar dados locais</h2>
          </div>
          <p className="text-xs text-muted-foreground">Você tem dados salvos no navegador que podem ser importados para a nuvem.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {localStats.slice(0, 6).map((s) => (
              <div key={s.table} className="rounded-lg bg-muted p-3 text-center">
                <p className="text-lg font-bold tabular-nums">{s.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.table}</p>
              </div>
            ))}
          </div>
          {localStats.length > 6 && (<p className="text-xs text-muted-foreground text-center">+{localStats.length - 6} outras tabelas</p>)}
          <Button onClick={handleMigrate} disabled={migrating} className="w-full">
            {migrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            {migrating ? "Importando..." : `Importar ${getLocalTotalCount()} registros`}
          </Button>
        </section>
      )}

      {migrationResult && (
        <section className="rounded-xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1"><Check className="h-4 w-4 text-positive" /><h2 className="font-display font-semibold">Importação concluída</h2></div>
          <p className="text-sm">{migrationResult.migrated} registros importados com sucesso.</p>
          {migrationResult.errors.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-warning mb-1">{migrationResult.errors.length} erros:</p>
              <ul className="list-disc list-inside space-y-0.5">{migrationResult.errors.slice(0, 5).map((e, i) => (<li key={i} className="truncate">{e}</li>))}</ul>
            </div>
          )}
        </section>
      )}


      {/* ─── Sons ─── */}
      <section className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Sons</h2>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Sons de dopamina</Label>
          <Switch checked={sound.enabled} onCheckedChange={(v) => setSound({ ...sound, enabled: v })} />
        </div>
        <div>
          <div className="flex justify-between mb-2"><Label className="text-sm">Volume</Label><span className="text-xs text-muted-foreground">{Math.round(sound.volume * 100)}%</span></div>
          <Slider value={[sound.volume * 100]} max={100} step={5} onValueChange={(v) => setSound({ ...sound, volume: v[0] / 100 })} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Modo silencioso (dia útil)</Label>
          <Switch checked={sound.silentDaytime} onCheckedChange={(v) => setSound({ ...sound, silentDaytime: v })} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Testar sons</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {(["moeda", "pop", "kaching", "alerta", "celebration", "fanfarra", "star", "ding", "bell"] as const).map((s) => (
              <button key={s} onClick={() => playSound(s)}
                className="chip rounded-xl bg-card border border-border hover:bg-muted transition-all capitalize justify-center">{s}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Planilha do Erick ─── */}
      <ErickPlanilhaSection />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ─── EQUIPE / ADM ─── */
type ConviteRow = {
  id: string;
  email: string | null;
  status: "pendente" | "aceito" | "revogado";
  token: string;
  criado_em: string;
  expira_em: string;
};

function EquipeSection() {
  const qc = useQueryClient();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const sessionId = useQuery({
    queryKey: ["session_id"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id ?? null;
    },
    staleTime: Infinity,
    retry: false,
  });

  const invites = useQuery({
    queryKey: ["convites"],
    queryFn: async (): Promise<ConviteRow[]> => {
      const { data } = await supabase
        .from("convites")
        .select("id, email, status, token, criado_em, expira_em")
        .order("criado_em", { ascending: false });
      return data ?? [];
    },
    enabled: !!sessionId.data,
    retry: false,
  });

  const members = useQuery({
    queryKey: ["workspace_members"],
    queryFn: async (): Promise<{ member_id: string; nome: string }[]> => {
      const { data: rows } = await supabase
        .from("workspace_members")
        .select("member_id");
      const memberIds = (rows ?? []).map((r) => r.member_id);
      if (memberIds.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", memberIds);
      const nameById = new Map((profs ?? []).map((p) => [p.id, p.nome || p.email]));
      return (rows ?? []).map((r) => ({ member_id: r.member_id, nome: nameById.get(r.member_id) ?? "Usuário" }));
    },
    enabled: !!sessionId.data,
    retry: false,
  });

  async function generate() {
    const { data: { session } } = await supabase.auth.getSession();
    const ownerId = session?.user?.id;
    if (!ownerId) return;
    setGenerating(true);
    const token = crypto.randomUUID().replace(/-/g, "");
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("convites")
      .insert({ owner_id: ownerId, token, expira_em: expira })
      .select("token")
      .single();
    setGenerating(false);
    if (error) { toast.error(error.message); return; }
    setLink(`${window.location.origin}/convite/${data.token}`);
    qc.invalidateQueries({ queryKey: ["convites"] });
    toast.success("Link de convite gerado!");
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function revoke(id: string) {
    const { error } = await supabase
      .from("convites")
      .update({ status: "revogado" })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["convites"] });
    toast.success("Convite revogado");
  }

  async function removeMember(memberId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const ownerId = session?.user?.id;
    if (!ownerId) return;
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("owner_id", ownerId)
      .eq("member_id", memberId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["workspace_members"] });
    toast.success("ADM removido do workspace");
  }

  return (
    <section className="rounded-xl bg-card border border-border p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold">Equipe · ADM</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Convide outra pessoa para administrar o seu workspace. O convidado cria a própria conta
        e alterna para o seu workspace no app.
      </p>

      {/* Gerar link */}
      <div className="space-y-2">
        <Button onClick={generate} disabled={generating} className="w-full">
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
          {generating ? "Gerando..." : "Gerar link de convite"}
        </Button>
        {link && (
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Envie este link para o ADM (válido por 7 dias):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded-md bg-card border border-border px-2 py-1.5 text-[11px]">{link}</code>
              <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-positive" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Membros atuais */}
      {members.data && members.data.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Membros administradores</p>
          {members.data.map((m) => (
            <div key={m.member_id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                  <UserPlus className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm truncate">{m.nome}</span>
              </div>
              <button
                onClick={() => removeMember(m.member_id)}
                className="text-muted-foreground hover:text-negative transition-colors shrink-0"
                title="Remover ADM"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Convites pendentes */}
      {invites.data && invites.data.filter((c) => c.status === "pendente").length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Convites pendentes</p>
          {invites.data.filter((c) => c.status === "pendente").map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm truncate">{c.email ?? "Link compartilhado"}</p>
                <p className="text-[10px] text-muted-foreground">expira em {new Date(c.expira_em).toLocaleDateString("pt-BR")}</p>
              </div>
              <button
                onClick={() => revoke(c.id)}
                className="text-muted-foreground hover:text-negative transition-colors shrink-0"
                title="Revogar convite"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── PLANO SECTION (REDESIGNED) ─── */
function PlanSection() {
  const nav = useNavigate();
  const [planoStatus, setPlanoStatus] = useState<{ status: string; plano?: string; diasRestantes?: number } | null>(null);

  useEffect(() => {
    import("@/lib/assinatura.functions").then((m) => {
      m.getSubscriptionStatus().then(setPlanoStatus);
    });
  }, []);

  const isActive = planoStatus?.status === "ativo";
  const isTrial = planoStatus?.status === "trial";
  const isInactive = planoStatus?.status === "inativo";
  const planoNome = planoStatus?.plano ?? "";

  const PLANOS = [
    {
      id: "anual" as const, nome: "PRO Anual", valor: 250, detalhe: "R$ 21/mês",
      features: ["Todas as funcionalidades", "Suporte prioritário", "Atualizações mensais", "Exportação de dados"],
      tag: "Mais popular",
    },
    {
      id: "vitalicio" as const, nome: "Vitalício", valor: 450, detalhe: "Única parcela",
      features: ["Tudo do PRO Anual", "Pagamento único", "Acesso vitalício", "Todas as atualizações futuras", "Call de 30 min com o Erick para analisar seu projeto"],
      tag: "Melhor custo-benefício",
    },
  ];

  return (
    <section className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Plano</h2>
        </div>
      </div>

      {/* ── Current plan hero ── */}
      <div className="px-5 pt-4">
        {isActive && (
          <div className="rounded-xl bg-gradient-to-br from-positive-soft to-positive-soft/50 border border-positive/20 p-5 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-positive/5 blur-3xl pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-positive text-white grid place-items-center shrink-0 shadow-sm">
                <Crown className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-xl font-bold text-positive">{planoNome}</h3>
                  <span className="chip bg-positive/15 text-positive text-[10px]">Ativo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Plano liberado com todos os recursos.
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <span className="flex items-center gap-1 text-positive/80"><ShieldCheck className="h-3 w-3" /> Acesso completo</span>
                  <span className="flex items-center gap-1 text-positive/80"><Zap className="h-3 w-3" /> Sem limites</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isTrial && (
          <div className="rounded-xl bg-gradient-to-br from-warning-soft to-warning-soft/30 border border-warning/20 p-5">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-warning/15 text-warning grid place-items-center shrink-0">
                <Crown className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-lg font-bold">Plano {planoStatus?.plano ?? "Grátis"}</h3>
                  <span className="chip bg-warning/15 text-warning text-[10px]">Teste de 7 dias</span>
                </div>
                <p className="text-sm font-bold text-warning tabular-nums mt-0.5">{planoStatus?.diasRestantes} dias restantes</p>
                <p className="text-xs text-muted-foreground mt-1">Aproveite todos os recursos. Escolha um plano abaixo para continuar usando após o trial.</p>
              </div>
            </div>
          </div>
        )}

        {isInactive && (
          <div className="rounded-xl bg-gradient-to-br from-muted to-muted/50 border border-border p-5">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted-foreground/10 text-muted-foreground grid place-items-center shrink-0">
                <Crown className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold">Nenhum plano ativo</h3>
                <p className="text-xs text-muted-foreground mt-1">Escolha um plano abaixo para desbloquear todos os recursos.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Planos disponíveis ── */}
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isActive ? "Outros planos" : "Escolha seu plano"}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANOS.map((plano) => {
            const isCurrentPlan = isActive && planoNome.toLowerCase().includes(plano.id);
            return (
              <div
                key={plano.id}
                className={cn(
                  "rounded-xl border-2 p-5 transition-all hover:shadow-md relative",
                  isCurrentPlan
                    ? "border-positive bg-positive-soft/30 ring-1 ring-positive/20"
                    : "border-border hover:border-primary/40",
                )}
              >
                {plano.tag && !isCurrentPlan && (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-sm">
                    {plano.tag}
                  </span>
                )}
                {isCurrentPlan && (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-positive text-white text-[10px] font-semibold shadow-sm flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" /> Plano atual
                  </span>
                )}

                <div className={cn("flex items-center gap-2", (plano.tag || isCurrentPlan) && "mt-2")}>
                  <h4 className="font-display text-base font-bold">{plano.nome}</h4>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold tabular-nums">R$ {plano.valor}</span>
                  <span className="text-xs text-muted-foreground ml-1">{plano.detalhe}</span>
                </div>

                {/* Features */}
                <ul className="mt-3 space-y-1.5">
                  {plano.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-positive shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {!isCurrentPlan && (
                  <Button
                    onClick={() => nav({ to: "/checkout", search: { plan: plano.id } })}
                    className="w-full mt-4 h-10 text-sm font-semibold"
                    variant={isActive ? "outline" : "default"}
                  >
                    {isActive ? "Fazer upgrade" : "Assinar agora"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── PLANILHA DO ERICK ─── */
function ErickPlanilhaSection() {
  const nav = useNavigate();
  return (
    <section className="rounded-xl bg-card border border-border p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold">Planilha do Erick</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Versão oficial da planilha em Excel (.xlsx) — R$ 70 <strong>pra sempre</strong> seu.
        Mesma planilha que o Erick usa, sem marca d'água, sem assinatura.
      </p>
      <Button onClick={() => nav({ to: "/planilha" })} className="w-full">
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Comprar planilha
      </Button>
      <p className="text-xs text-muted-foreground -mt-2">
        Você vai para a página de compra para finalizar o pagamento.
      </p>
    </section>
  );
}
