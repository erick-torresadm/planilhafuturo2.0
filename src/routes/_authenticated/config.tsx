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
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Configurações</h1>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Perfil</h2>
        <div><Label>Nome</Label><Input defaultValue={p.nome ?? ""} onBlur={(e) => e.target.value !== (p.nome ?? "") && save.mutate({ nome: e.target.value })} /></div>
        <div><Label>Renda mensal</Label><Input type="number" step="0.01" defaultValue={p.renda_mensal ?? 0} onBlur={(e) => save.mutate({ renda_mensal: Number(e.target.value) })} /></div>
        <div><Label>Saldo inicial (base do Fluxo Diário)</Label><Input type="number" step="0.01" defaultValue={p.saldo_inicial ?? 0} onBlur={(e) => save.mutate({ saldo_inicial: Number(e.target.value) })} /></div>
        <div><Label>Meta renda fixa (R$/mês)</Label><Input type="number" step="0.01" defaultValue={p.meta_renda_fixa ?? 0} onBlur={(e) => save.mutate({ meta_renda_fixa: Number(e.target.value) })} /></div>
        <div><Label>Meses de reserva de emergência</Label><Input type="number" defaultValue={p.meses_reserva_emergencia ?? 6} onBlur={(e) => save.mutate({ meses_reserva_emergencia: Number(e.target.value) })} /></div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Sons de dopamina</h2>
        <div className="flex items-center justify-between">
          <Label>Ligado</Label>
          <Switch checked={sound.enabled} onCheckedChange={(v) => setSound({ ...sound, enabled: v })} />
        </div>
        <div>
          <Label>Volume: {Math.round(sound.volume * 100)}%</Label>
          <Slider value={[sound.volume * 100]} max={100} step={5} onValueChange={(v) => setSound({ ...sound, volume: v[0] / 100 })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Modo silencioso (9h-18h, fins de semana)</Label>
          <Switch checked={sound.silentDaytime} onCheckedChange={(v) => setSound({ ...sound, silentDaytime: v })} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {(["moeda","pop","kaching","alerta","celebration","fanfarra","star","ding","bell"] as const).map((s) => (
            <Button key={s} variant="outline" size="sm" onClick={() => playSound(s)}>{s}</Button>
          ))}
        </div>
      </section>
    </div>
  );
}
