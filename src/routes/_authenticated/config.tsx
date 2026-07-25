import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { getSoundSettings, saveSoundSettings, useSounds } from "@/hooks/useSounds";
import { toast } from "sonner";
import { User, Volume2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/config")({
  head: () => ({ meta: [{ title: "Configurações — Planilha" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { playSound } = useSounds();
  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
    return data;
  }});
  const save = useMutation({
    mutationFn: async (patch: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").update(patch).eq("id", u.user!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Salvo"); },
  });

  const [sound, setSound] = useState(getSoundSettings());
  useEffect(() => saveSoundSettings(sound), [sound]);

  const p = profile.data ?? ({} as any);

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajuste seu perfil e preferências</p>
      </div>

      <section className="glass-strong p-5 space-y-4">
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

      <section className="glass-strong p-5 space-y-4">
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
          <div className="flex flex-wrap gap-2">
            {(["moeda","pop","kaching","alerta","celebration","fanfarra","star","ding","bell"] as const).map((s) => (
              <button key={s} onClick={() => playSound(s)}
                className="chip glass hover:mint-glow transition-all capitalize">{s}</button>
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
