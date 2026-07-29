import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { updateProfile, insertRow } from "@/lib/db";
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
        updateProfile({ nome, renda_mensal: renda, saldo_inicial: saldo, onboarding_completed: true });
        for (const g of SEED_GASTOS) {
          insertRow("gastos_fixos", { ...g, tipo: "A" as const, frequencia: "mensal" as const, ativo: true });
        }
        playSound("celebration");
      } catch (e: any) { toast.error(e?.message ?? "Erro"); }
      finally { setLoading(false); }
    }
    if (step === total) { nav({ to: "/app" }); return; }
    setStep(step + 1);
    playSound("pop");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Steps indicator */}
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i < step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/20"}`} />
          ))}
        </div>

        {/* Step content */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center mx-auto">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Como quer ser chamado?</h1>
            <Input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="text-center h-12 text-lg" />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center mx-auto">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Qual sua renda mensal?</h1>
            <Input autoFocus type="number" value={renda} onChange={(e) => setRenda(Number(e.target.value))} className="text-center h-12 text-lg" />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center mx-auto">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Saldo atual na conta?</h1>
            <Input autoFocus type="number" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))} className="text-center h-12 text-lg" />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center mx-auto">
              <PartyPopper className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Pronto!</h1>
            <p className="text-sm text-muted-foreground">Vamos configurar seus gastos fixos.</p>
          </div>
        )}
        {step === 5 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center mx-auto">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Tudo certo!</h1>
            <p className="text-sm text-muted-foreground">Seu fluxo financeiro está pronto.</p>
          </div>
        )}

        <Button onClick={next} disabled={loading} className="w-full bg-primary text-primary-foreground font-semibold h-12 text-base">
          {loading ? "Salvando..." : step === total ? "Ver meu fluxo" : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
