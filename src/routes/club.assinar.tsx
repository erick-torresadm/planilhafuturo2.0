import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { CheckoutForm } from "@/components/CheckoutForm";
import { CLUB_PLANOS, type ClubPlan } from "@/lib/club.rules";
import {
  getClubStatus,
  criarAssinaturaClube,
  verificarAssinaturaClube,
} from "@/lib/club.functions";
import { Check, Loader2, ArrowLeft } from "lucide-react";

/* Fora do _authenticated de propósito: quem caiu no paywall precisa
   conseguir comprar o Premium. Só sessão; preço vem do servidor. */
export const Route = createFileRoute("/club/assinar")({
  ssr: false,
  validateSearch: (s: Record<string, string | undefined>) => ({
    plan: (s.plan === "premium" ? "premium" : "start") as ClubPlan,
  }),
  head: () => ({ meta: [{ title: "Assinar o PlanilhaClub — planilhafuturo" }] }),
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  component: AssinarPage,
});

const BENEFICIOS: Record<ClubPlan, string[]> = {
  start: ["Acesso ao clube (canal fechado, calls e desafios)", "Planilha em Excel, sua pra sempre"],
  premium: [
    "Acesso ao clube (canal fechado, calls e desafios)",
    "Sistema hospedado liberado por 12 meses",
  ],
};

function AssinarPage() {
  const { plan } = Route.useSearch();
  const nav = useNavigate();
  const status = useQuery({ queryKey: ["club-status"], queryFn: () => getClubStatus() });

  if (status.isPending) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const s = status.data!;
  const valor = plan === "start" ? s.ofertas.start : s.ofertas.premium;
  const info = CLUB_PLANOS[plan];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            to="/club"
            aria-label="Voltar"
            className="h-11 w-11 -ml-2 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo size={17} />
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="eyebrow">Você está assinando</span>
          <h1 className="font-display text-2xl font-bold mt-1">{info.nome}</h1>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              R$ {valor.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-xs text-muted-foreground">/ano · {info.detalhe}</span>
          </div>
          {plan === "start" && s.ofertas.upgradeAvulsa && (
            <p className="mt-2 text-xs text-positive font-medium">
              Você já tem a planilha: paga só o clube (R$ 70 descontados).
            </p>
          )}
          <ul className="mt-3 space-y-1.5">
            {BENEFICIOS[plan].map((b) => (
              <li key={b} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-positive shrink-0" /> {b}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground/70">
            Compromisso anual. Reembolso integral em até 7 dias. Cancelar a renovação não gera
            reembolso proporcional; o acesso segue até o fim do período pago.
          </p>
        </div>

        <CheckoutForm
          valor={valor}
          descricao={info.nome}
          onPix={async () => {
            const r = await criarAssinaturaClube({ data: { plan, metodo: "pix" } });
            if (!r.ok) return r;
            if (r.metodo !== "pix") return { ok: false as const, error: "Resposta inesperada" };
            return {
              ok: true as const,
              txid: r.txid,
              pixCopiaECola: r.pixCopiaECola,
              qrcode: r.qrcode,
              valor: r.valor,
            };
          }}
          onVerificarPix={(txid) => verificarAssinaturaClube({ data: { txid } })}
          onCartao={async (p) => {
            const r = await criarAssinaturaClube({ data: { plan, metodo: "cartao", ...p } });
            if (!r.ok) return r;
            if (r.metodo !== "cartao") return { ok: false as const, error: "Resposta inesperada" };
            return { ok: true as const, paid: r.paid, message: r.message };
          }}
          onPago={() => nav({ to: "/club" })}
        />
      </div>
    </div>
  );
}
