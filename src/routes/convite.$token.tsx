import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { setActiveWorkspace } from "@/lib/workspace";
import { Loader2, CheckCircle2, XCircle, UserPlus, Crown } from "lucide-react";

const PENDING_INVITE_KEY = "planilhafuturo_pending_invite";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite de ADM — planilhafuturo" },
      { name: "description", content: "Você foi convidado para administrar um workspace na planilhafuturo." },
    ],
  }),
  component: ConvitePage,
});

function ConvitePage() {
  const { token } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [accepting, setAccepting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["convite", token],
    queryFn: async () => {
      const m = await import("@/lib/convite.functions");
      return m.buscarConvitePorToken({ data: token });
    },
  });

  function goCreateAccount() {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
    window.location.href = "/auth";
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      const m = await import("@/lib/convite.functions");
      let result = await m.aceitarConvite({ data: token });
      // Conta recém-criada pode disparar o RPC antes da sessão estar pronta.
      // Retry único (a server fn é idempotente) cobre essa corrida de auth.
      if (!result.ok && /logado|sess|session/i.test(result.error)) {
        await new Promise((r) => setTimeout(r, 1200));
        result = await m.aceitarConvite({ data: token });
      }
      if (result.ok) {
        setActiveWorkspace(result.ownerId);
        window.location.href = "/app";
      } else {
        window.alert(result.error);
        setAccepting(false);
      }
    } catch (e: any) {
      window.alert(e.message ?? "Erro ao aceitar convite");
      setAccepting(false);
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const invalid = !data || data.status !== "pendente";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <Logo size={28} />
        </div>

        {invalid ? (
          <div className="rounded-xl bg-negative-soft border border-negative/20 px-4 py-3 text-sm text-negative font-medium flex items-start gap-3">
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Convite inválido</p>
              <p className="text-muted-foreground">
                {data?.status === "aceito"
                  ? "Este convite já foi utilizado."
                  : "Este link de convite não é válido, foi revogado ou expirou. Peça um novo link para o dono da conta."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-positive-soft border border-positive/20 px-4 py-3 space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-positive shrink-0" />
                <p className="font-semibold text-sm text-positive">Você foi convidado!</p>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>{data.ownerNome}</strong> te convidou para administrar o workspace dele no
                <strong> planilhafuturo</strong>. Você poderá ver e editar os dados financeiros como ADM.
              </p>
            </div>

            {user ? (
              <div className="space-y-3">
                <Button onClick={handleAccept} disabled={accepting} className="w-full h-11 rounded-xl font-semibold">
                  {accepting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Aceitar convite
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Você está logado como <strong>{user.email}</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button onClick={goCreateAccount} className="w-full h-11 rounded-xl font-semibold">
                  Criar conta e aceitar
                </Button>
                <Button onClick={goCreateAccount} variant="outline" className="w-full h-11 rounded-xl font-semibold">
                  Já tenho conta
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Você precisa de uma conta (grátis) para aceitar o convite.
                </p>
              </div>
            )}
          </>
        )}

        {user && data?.status === "aceito" && (
          <div className="space-y-3">
            <p className="text-xs text-center text-muted-foreground">
              Este convite já foi aceito. Acesse o workspace pelo seletor no app.
            </p>
            <Button onClick={handleAccept} className="w-full h-11 rounded-xl font-semibold">
              Ir para o workspace
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/auth" className="hover:text-foreground">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
