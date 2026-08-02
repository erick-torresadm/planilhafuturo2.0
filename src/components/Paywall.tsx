import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Lock, ArrowRight, LogOut, RefreshCcw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

/**
 * Tela exibida quando o teste grátis expirou e não há assinatura ativa.
 * Bloqueia o acesso a todos os dados até o usuário pagar.
 */
export function Paywall({ onRefresh }: { onRefresh?: () => void }) {
  const { logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      toast.error("Erro ao sair");
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <Logo size={28} />

        <div className="mx-auto h-14 w-14 rounded-2xl bg-negative/10 grid place-items-center">
          <Lock className="h-7 w-7 text-negative" />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold">Seu teste grátis acabou</h1>
          <p className="text-sm text-muted-foreground">
            Seus dados continuam salvos. Assine o PRO para voltar a usar tudo na hora.
          </p>
        </div>

        <div className="space-y-1.5">
          <Link
            to="/checkout"
            search={{ plan: "anual" }}
            className="cta-pill w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm tap-target"
          >
            Assinar agora <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={onRefresh}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Já paguei — verificar
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-negative/80 hover:text-negative transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
