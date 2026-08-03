import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import {
  Check, Crown, MessageCircle, FileSpreadsheet, Sparkles, ArrowRight,
  Loader2, Mail, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "5511948333534"; // 11 94833-3534

const PLAN_INFO: Record<string, { nome: string; emoji?: string }> = {
  anual: { nome: "PRO Anual" },
  vitalicio: { nome: "Vitalício" },
  planilha: { nome: "Planilha do Erick" },
  mentoria: { nome: "Mentoria com Erick" },
};

export const Route = createFileRoute("/obrigado")({
  validateSearch: (search: Record<string, string | undefined>): { plan?: string; email?: string } => ({
    plan: search.plan,
    email: search.email,
  }),
  head: () => ({
    meta: [
      { title: "Obrigado! — planilhafuturo" },
      { name: "description", content: "Pagamento confirmado. Bem-vindo à planilhafuturo!" },
    ],
  }),
  component: ObrigadoPage,
});

function ObrigadoPage() {
  const { plan, email } = Route.useSearch();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState<string | null>(null);

  const info = plan ? PLAN_INFO[plan] : null;
  const isMentoria = plan === "mentoria";
  const isPlanilha = plan === "planilha";

  // Se já está logado, tenta ativar o plano pré-pago (caso a ativação
  // ainda não tenha acontecido — ex.: pagou num aparelho e logou em outro).
  useEffect(() => {
    if (!user || !email || activated) return;
    let cancelled = false;
    setActivating(true);
    import("@/lib/assinatura.functions")
      .then((m) => m.activatePlanPostSignup({ data: { email } }))
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setActivated(result.plano);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setActivating(false); });
    return () => { cancelled = true; };
  }, [user, email, activated]);

  function whatsappLink() {
    const msg = encodeURIComponent(
      "Olá Erick! Acabei de pagar a Mentoria com Erick (R$497) e quero agendar nossa conversa.",
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }

  function handleAbrirWhatsapp() {
    window.location.href = whatsappLink();
  }

  async function copyEmail() {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    toast.success("Email copiado!");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Logo size={18} />
        </Link>
        <div className="flex-1" />
      </header>

      <div className="flex-1 w-full max-w-md mx-auto px-4 py-10">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-positive/10 grid place-items-center mx-auto">
            <Check className="h-8 w-8 text-positive" strokeWidth={3} />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-bold tracking-tight">Obrigado!</h1>
            <p className="text-sm text-muted-foreground">
              {isMentoria
                ? "Sua mentoria foi confirmada."
                : isPlanilha
                  ? "Sua planilha foi confirmada."
                  : "Seu plano foi confirmado."}
            </p>
          </div>

          {/* Email do pagamento */}
          {email && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted border border-border px-4 py-2.5 mx-auto w-fit">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-[240px]">{email}</span>
              <button onClick={copyEmail} className="text-xs text-primary font-semibold hover:underline shrink-0">
                copiar
              </button>
            </div>
          )}

          {/* Ativação (logado) */}
          {activating && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Ativando...
            </div>
          )}
          {activated && (
            <div className="rounded-xl bg-positive-soft border border-positive/20 px-4 py-3 text-sm text-positive font-medium">
              <BadgeCheck className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              {activated} ativado com sucesso!
            </div>
          )}

          {/* Conteúdo por plano */}
          <div className="rounded-xl bg-card border border-border p-5 text-left space-y-3">
            {isMentoria ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sua <strong className="text-foreground">Mentoria com Erick</strong> está garantida.
                  Agora fale direto com o Erick no WhatsApp para combinar como será a mentoria.
                </p>
                <Button onClick={handleAbrirWhatsapp} className="w-full h-12 rounded-xl font-semibold text-base bg-[#25D366] hover:bg-[#1fb857]">
                  <MessageCircle className="h-5 w-5 mr-2" /> Falar no WhatsApp
                </Button>
                <p className="text-xs text-muted-foreground/70 text-center">
                  WhatsApp: <span className="font-semibold">11 94833-3534</span>
                </p>
              </>
            ) : isPlanilha ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sua <strong className="text-foreground">Planilha do Erick</strong> está garantida.
                  Crie sua conta com o email do pagamento para baixá-la em{" "}
                  <span className="font-medium text-foreground/80">planilhafuturo.com.br/planilha</span>.
                </p>
                <Button
                  onClick={() => nav({ to: "/auth", search: { email: email ?? "", plan: "planilha" } })}
                  className="w-full h-12 rounded-xl font-semibold"
                >
                  {user ? "Ir para a planilha" : "Criar conta para baixar"} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {user && (
                  <Button variant="outline" onClick={() => nav({ to: "/planilha" })} className="w-full">
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Acessar planilha
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Seu plano <strong className="text-foreground">{info?.nome ?? "PRO"}</strong> foi confirmado.
                  Crie sua conta com o email do pagamento para ativá-lo. Usou outro email? Tudo bem — o plano
                  fica vinculado ao email do pagamento.
                </p>
                <Button
                  onClick={() => nav({ to: "/auth", search: { email: email ?? "", plan: plan ?? "" } })}
                  className="w-full h-12 rounded-xl font-semibold"
                >
                  {user ? "Ir para o app" : "Criar conta para ativar"} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {user && (
                  <Button variant="outline" onClick={() => nav({ to: "/app" })} className="w-full">
                    <Crown className="h-4 w-4 mr-2" /> Abrir o app
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Upsell da mentoria (planos e planilha) */}
          {!isMentoria && (
            <div className="rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-5 space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary grid place-items-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base leading-tight">Quer atenção especial do dono da ferramenta?</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Mentoria de 1h com o Erick para analisar seu dinheiro, organizar seus próximos 12 meses
                    e montar um plano pra sair do vermelho e multiplicar seu patrimônio.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => nav({ to: "/checkout", search: { plan: "mentoria" } })}
                className="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/80"
              >
                <Crown className="h-4 w-4 mr-2" /> Mentoria com Erick — R$ 497
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
