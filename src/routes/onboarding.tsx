import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import { Sparkles, Wallet, CreditCard, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Bem-vindo — Planilha" }] }),
  component: Onboarding,
});

const SEED_GASTOS = [
  { categoria: "Moradia", descricao: "Aluguel", valor: 1500, dia: 5, forma: "Pix" },
  { categoria: "Moradia", descricao: "Luz", valor: 120, dia: 15, forma: "Debito" },
  { categoria: "Moradia", descricao: "Água", valor: 80, dia: 10, forma: "Pix" },
  { categoria: "Moradia", descricao: "Internet", valor: 100, dia: 20, forma: "Cartao" },
  { categoria: "Saude", descricao: "Academia", valor: 100, dia: 10, forma: "Pix" },
  { categoria: "Lazer", descricao: "Streaming", valor: 60, dia: 5, forma: "Cartao" },
  { categoria: "Saude", descricao: "Seguro", valor: 89, dia: 15, forma: "Boleto" },
  { categoria: "Telefonia", descricao: "Celular", valor: 50, dia: 20, forma: "Pix" },
  { categoria: "Transporte", descricao: "Transporte", valor: 300, dia: 1, forma: "Debito" },
  { categoria: "Alimentacao", descricao: "Alimentação", valor: 500, dia: 1, forma: "Debito" },
];

function Onboarding() {
  const nav = useNavigate();
  const { playSound } = useSounds();
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [renda, setRenda] = useState<number>(7000);
  const [saldo, setSaldo] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const total = 5;

  async function next() {
    if (step === 1 && !nome.trim()) { toast.error("Digite seu nome"); return; }
    if (step === 3) {
      setLoading(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user!.id;
        await supabase.from("profiles").update({
          nome, renda_mensal: renda, saldo_inicial: saldo, onboarding_completed: true,
        }).eq("id", uid);
        const rows = SEED_GASTOS.map((g) => ({ ...g, user_id: uid, tipo: "A", frequencia: "mensal", ativo: true }));
        await supabase.from("gastos_fixos").insert(rows);
        playSound("celebration");
      } catch (e: any) { toast.error(e?.message ?? "Erro"); }
      finally { setLoading(false); }
    }
    if (step === total) { nav({ to: "/" }); return; }
    setStep(step + 1);
    playSound("pop");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <div className="w-full max-w-md glass-strong p-6 relative fade-up">
        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? "mint-gradient" : "bg-black/10"}`} />
          ))}
        </div>

        {step === 1 && (
          <StepFrame icon={Sparkles} title="Oi! Como te chamamos?" sub="Vamos personalizar sua planilha.">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="h-12 text-lg" autoFocus />
          </StepFrame>
        )}
        {step === 2 && (
          <StepFrame icon={Wallet} title={`Prazer, ${nome}!`} sub="Quanto entra e quanto você tem hoje?">
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Renda mensal (R$)</Label>
                <Input type="number" value={renda} onChange={(e) => setRenda(Number(e.target.value))} className="h-12 text-lg" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Saldo inicial (R$)</Label>
                <Input type="number" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))} className="h-12 text-lg" />
              </div>
            </div>
          </StepFrame>
        )}
        {step === 3 && (
          <StepFrame icon={CreditCard} title="Gastos fixos comuns" sub="Cadastramos 10 exemplos. Você edita depois.">
            <div className="max-h-64 overflow-y-auto glass rounded-lg divide-y divide-border">
              {SEED_GASTOS.map((g, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <div className="font-semibold">{g.descricao}</div>
                    <div className="text-[11px] text-muted-foreground">{g.categoria} · dia {g.dia}</div>
                  </div>
                  <div className="text-primary font-bold tabular-nums">R$ {g.valor.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </StepFrame>
        )}
        {step === 4 && (
          <StepFrame icon={CreditCard} title="Parcelas do cartão" sub="Você pode cadastrar depois na aba Parcelas. Importar CSV vem em breve.">
            <div className="glass p-4 text-sm text-muted-foreground">💡 Dica: adicione suas parcelas para ver o impacto real nos próximos meses.</div>
          </StepFrame>
        )}
        {step === 5 && (
          <StepFrame icon={PartyPopper} title={`Tudo pronto, ${nome}!`} sub="Sua planilha está montada. Bora visualizar o futuro.">
            <div className="text-6xl text-center py-4">🎉</div>
          </StepFrame>
        )}

        <div className="mt-6 flex justify-between items-center">
          <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Voltar</Button>
          <Button onClick={next} disabled={loading} className="mint-gradient font-semibold px-6 h-11">
            {step === total ? "Começar 🚀" : `Próximo (${step}/${total})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepFrame({ icon: Icon, title, sub, children }: { icon: any; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="fade-up">
      <div className="h-12 w-12 rounded-xl mint-gradient grid place-items-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground mb-4">{sub}</p>
      {children}
    </div>
  );
}
