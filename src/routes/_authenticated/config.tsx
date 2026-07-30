import { MoneyInput } from "@/components/MoneyInput";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/db";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { getSoundSettings, saveSoundSettings, useSounds } from "@/hooks/useSounds";
import { getApiKey, setApiKey, hasApiKey } from "@/lib/ai-service";
import { toast } from "sonner";
import { User, Volume2, Sparkles, Bot, KeyRound, Check, X, Crown, Loader2, Copy, Download, Database } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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
    mutationFn: async (patch: any) => {
      updateProfile(patch);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Salvo"); },
  });

  const [sound, setSound] = useState(getSoundSettings());
  useEffect(() => { saveSoundSettings(sound); }, [sound]);

  const [aiKey, setAiKey] = useState(getApiKey());
  const [aiKeyInput, setAiKeyInput] = useState(getApiKey());
  const [aiSaved, setAiSaved] = useState(false);

  function saveAiKey() {
    setApiKey(aiKeyInput.trim());
    setAiKey(aiKeyInput.trim());
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
    if (aiKeyInput.trim()) toast.success("API key salva");
    else toast.success("API key removida");
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
      if (result.migrated > 0) {
        clearLocalData();
        setMigrationDone(true);
        toast.success(`${result.migrated} registros importados!`);
      } else if (result.errors.length > 0) {
        toast.error("Erro ao importar");
      } else {
        toast.success("Nenhum dado novo");
        setMigrationDone(true);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao migrar");
    } finally {
      setMigrating(false);
    }
  }

  // ─── Plano / Assinatura ─────────────────────
  const [planoStatus, setPlanoStatus] = useState<{ status: string; plano?: string; diasRestantes?: number } | null>(null);
  const [pixData, setPixData] = useState<{ txid: string; pixCopiaECola: string; qrcode: string; valor: number } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    import("@/lib/assinatura.functions").then((m) => {
      m.getSubscriptionStatus().then(setPlanoStatus);
    });
  }, []);

  async function handleAssinar(plano: string) {
    setPixLoading(true);
    setPixData(null);
    try {
      const m = await import("@/lib/assinatura.functions");
      const result = await m.createCheckoutSession({ data: { plano } });
      if (result.ok) {
        setPixData(result);
      } else {
        toast.error(result.error);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar Pix");
    } finally {
      setPixLoading(false);
    }
  }

  async function handleVerificarPagamento() {
    if (!pixData) return;
    setVerifying(true);
    try {
      const m = await import("@/lib/assinatura.functions");
      const result = await m.verifyPayment({ data: { txid: pixData.txid, plano: "mensal" } });
      if (result.paid) {
        toast.success(`Assinatura ${result.plano} ativada!`);
        setPixData(null);
        setPlanoStatus({ status: "ativo", plano: result.plano });
      } else {
        toast.error(result.error);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao verificar");
    } finally {
      setVerifying(false);
    }
  }

  function copyPixCode() {
    if (pixData) {
      navigator.clipboard.writeText(pixData.pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código Pix copiado!");
    }
  }

  return (
    <div className="page-container max-w-3xl space-y-5 animate-in">
      <PageHeader
        eyebrow="Ajustes"
        title="Configurações"
        subtitle="Ajuste seu perfil e preferências"
      />

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

      {hasLocal && !migrationDone && (
        <section className="rounded-xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Importar dados locais</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Você tem dados salvos no navegador que podem ser importados para a nuvem.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {localStats.slice(0, 6).map((s) => (
              <div key={s.table} className="rounded-lg bg-muted p-3 text-center">
                <p className="text-lg font-bold tabular-nums">{s.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.table}</p>
              </div>
            ))}
          </div>
          {localStats.length > 6 && (
            <p className="text-xs text-muted-foreground text-center">
              +{localStats.length - 6} outras tabelas
            </p>
          )}
          <Button onClick={handleMigrate} disabled={migrating} className="w-full">
            {migrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            {migrating ? "Importando..." : `Importar ${getLocalTotalCount()} registros`}
          </Button>
        </section>
      )}

      {migrationResult && (
        <section className="rounded-xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-4 w-4 text-positive" />
            <h2 className="font-display font-semibold">Importação concluída</h2>
          </div>
          <p className="text-sm">
            {migrationResult.migrated} registros importados com sucesso.
          </p>
          {migrationResult.errors.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-warning mb-1">{migrationResult.errors.length} erros:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {migrationResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="truncate">{e}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Assistente IA</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Use o Gemini (gratuito) para registrar gastos por conversa e analisar suas finanças.
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">Criar API key</a>
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={aiKeyInput}
              onChange={(e) => setAiKeyInput(e.target.value)}
              placeholder="Cole sua chave Gemini aqui..."
              className="pl-9 font-mono text-xs"
              type="password"
            />
          </div>
          <Button onClick={saveAiKey} size="sm" className="shrink-0">
            {aiSaved ? <><Check className="h-3.5 w-3.5 mr-1" />Salva</> : "Salvar"}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {aiKey ? (
            <span className="chip chip-positive flex items-center gap-1"><Check className="h-3 w-3" /> Key configurada</span>
          ) : (
            <span className="chip chip-warning flex items-center gap-1"><X className="h-3 w-3" /> Sem key</span>
          )}
          <span className="text-muted-foreground">· 60 requisições/minuto grátis</span>
        </div>
      </section>

      <section className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Plano</h2>
        </div>

        {planoStatus?.status === "ativo" && (
          <div className="rounded-xl bg-positive-soft border border-positive/20 p-4 text-center">
            <Crown className="h-8 w-8 text-positive mx-auto mb-2" />
            <p className="font-semibold text-positive">Plano {planoStatus.plano}</p>
            <p className="text-xs text-muted-foreground mt-1">Assinatura ativa</p>
          </div>
        )}

        {planoStatus?.status === "trial" && (
          <div className="rounded-xl bg-warning-soft border border-warning/20 p-4 text-center">
            <p className="font-semibold">Teste gratuito</p>
            <p className="text-xs text-muted-foreground mt-1">{planoStatus.diasRestantes} dias restantes</p>
          </div>
        )}

        {planoStatus?.status === "inativo" && (
          <p className="text-xs text-muted-foreground">Sem plano ativo.</p>
        )}

        {/* Pix QR Code modal */}
        {pixData && (
          <div className="space-y-3 rounded-xl bg-muted p-4 text-center">
            <p className="text-sm font-semibold">Pague via Pix</p>
            <p className="text-xs text-muted-foreground">
              R$ {pixData.valor.toFixed(2)} — escaneie o QR Code ou copie o código
            </p>
            {pixData.qrcode && (
              <img
                src={`data:image/png;base64,${pixData.qrcode}`}
                alt="QR Code Pix"
                className="mx-auto w-48 h-48 rounded-xl"
              />
            )}
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3 text-xs font-mono">
              <span className="flex-1 truncate">{pixData.pixCopiaECola}</span>
              <button onClick={copyPixCode} className="shrink-0 text-primary hover:text-primary/80">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setPixData(null)} variant="outline" size="sm">Cancelar</Button>
              <Button onClick={handleVerificarPagamento} disabled={verifying} size="sm">
                {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Já paguei
              </Button>
            </div>
          </div>
        )}

        {/* Plan options */}
        {planoStatus?.status !== "ativo" && !pixData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "mensal", nome: "Mensal", valor: 69.90, destaque: false },
              { id: "anual", nome: "Anual", valor: 300, destaque: true, tag: "2 meses grátis" },
              { id: "vitalicio", nome: "Vitalício", valor: 800, destaque: false, tag: "Única parcela" },
            ].map((plano) => (
              <button
                key={plano.id}
                onClick={() => handleAssinar(plano.id)}
                disabled={pixLoading}
                className={`rounded-xl border-2 p-4 text-center transition-all hover:shadow-md disabled:opacity-50 ${
                  plano.destaque
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {plano.tag && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold mb-2">
                    {plano.tag}
                  </span>
                )}
                <p className="font-display text-lg font-bold">{plano.nome}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">
                  R$ {plano.valor.toFixed(0)}
                </p>
                {plano.id === "mensal" && <p className="text-[10px] text-muted-foreground mt-1">por mês</p>}
                {plano.id === "anual" && <p className="text-[10px] text-muted-foreground mt-1">R$ 25/mês</p>}
              </button>
            ))}
          </div>
        )}

        {pixLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>

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
