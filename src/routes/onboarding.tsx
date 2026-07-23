import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";

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
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md bg-card border rounded-lg shadow-sm p-6">
        <Progress value={(step / total) * 100} className="mb-6 h-1.5" />

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-primary mb-1">Olá! Qual seu nome?</h2>
            <p className="text-sm text-muted-foreground mb-4">Vamos personalizar sua planilha.</p>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-primary mb-1">Qual sua renda mensal?</h2>
            <p className="text-sm text-muted-foreground mb-4">Valor médio que entra por mês.</p>
            <Label>Renda (R$)</Label>
            <Input type="number" value={renda} onChange={(e) => setRenda(Number(e.target.value))} />
            <div className="mt-4">
              <Label>Saldo inicial (o que você tem hoje na conta)</Label>
              <Input type="number" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-primary mb-1">Gastos fixos de exemplo</h2>
            <p className="text-sm text-muted-foreground mb-3">Vamos cadastrar 10 gastos comuns. Você edita depois.</p>
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="sheet-grid text-xs">
                <thead><tr><th className="sheet-th">Cat</th><th className="sheet-th">Desc</th><th className="sheet-th text-right">R$</th><th className="sheet-th">Dia</th></tr></thead>
                <tbody>
                  {SEED_GASTOS.map((g, i) => (
                    <tr key={i} className={i % 2 ? "sheet-row-alt" : ""}>
                      <td className="sheet-td">{g.categoria}</td><td className="sheet-td">{g.descricao}</td>
                      <td className="sheet-td text-right">{g.valor.toFixed(2)}</td><td className="sheet-td">{g.dia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-primary mb-1">Parcelas do cartão</h2>
            <p className="text-sm text-muted-foreground mb-4">Você pode cadastrar suas parcelas depois na aba Parcelas. Importação de CSV do Nubank/XP em breve.</p>
          </div>
        )}
        {step === 5 && (
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-bold text-primary mb-1">Pronto, {nome}!</h2>
            <p className="text-sm text-muted-foreground mb-4">Sua planilha está montada. Explore o Fluxo Diário para ver os próximos 6 meses.</p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Voltar</Button>
          <Button onClick={next} disabled={loading}>{step === total ? "Começar" : "Próximo"} ({step}/{total})</Button>
        </div>
      </div>
    </div>
  );
}
