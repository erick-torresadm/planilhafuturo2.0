import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AppShellV2 as AppShell } from "@/components/AppShellV2";
import { Paywall } from "@/components/Paywall";
import { supabase } from "@/integrations/supabase/client";
import { getActiveWorkspace } from "@/lib/workspace";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  hasLocalData,
  getLocalStats,
  migrateLocalDataToSupabase,
  clearLocalData,
  getLocalTotalCount,
} from "@/lib/migrate-local-to-supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.user_metadata?.name ?? session.user.email?.split("@")[0] ?? "Usuário",
      },
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const loc = useLocation();
  const [showBanner, setShowBanner] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // Push de notificações: aviso de novo cadastro (todos) + assinatura de push (admin).
  // Chamado antes do gate do paywall para o cadastro disparar mesmo se o usuário
  // novo ainda não estiver ativo.
  usePushNotifications();

  // Gate de assinatura: teste grátis expirado sem pagamento → tudo travado.
  // Workspace-aware: se está vendo o workspace de outro (ADM), o plano do DONO
  // é quem vale para os dados daquele workspace — mas NUNCA ativa a própria conta.
  const sub = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const m = await import("@/lib/assinatura.functions");
      const activeWs = getActiveWorkspace();
      return m.getSubscriptionStatus({ data: activeWs ? { forOwner: activeWs } : {} });
    },
    staleTime: 60_000,
  });

  // Membro do clube com a assinatura do app vencida ainda entra em /club: o que
  // ele pagou foi o clube, não o app. Também alimenta o aviso de renovação.
  const club = useQuery({
    queryKey: ["club-status"],
    queryFn: async () => (await import("@/lib/club.functions")).getClubStatus(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (hasLocalData()) setShowBanner(true);
  }, []);

  // Catch-all: try to activate any pre-paid plans for this user's email.
  // Se veio de um checkout e pagou com outro email, usa o email do pagamento
  // (guardado em sessionStorage) — assim o plano ativa mesmo com conta diferente.
  useEffect(() => {
    if (!user.email) return;
    const tryActivate = async () => {
      try {
        const pending =
          typeof window !== "undefined"
            ? sessionStorage.getItem("planilhafuturo_pending_plan_email")
            : null;
        const m = await import("@/lib/assinatura.functions");
        const result = await m.activatePlanPostSignup({ data: { email: pending ?? user.email } });
        if (result.ok) {
          if (pending) sessionStorage.removeItem("planilhafuturo_pending_plan_email");
          toast.success(`Plano ${result.plano} ativado!`, { duration: 5000 });
        }
      } catch {
        // No pending pre-pagamento — silently ignore
      }
    };
    tryActivate();
  }, [user.email]);

  async function handleMigrate() {
    setMigrating(true);
    try {
      const result = await migrateLocalDataToSupabase(user.id);
      if (result.migrated > 0) {
        toast.success(`${result.migrated} registros importados para a nuvem!`);
        clearLocalData();
        setShowBanner(false);
      } else if (result.errors.length > 0 && result.migrated === 0) {
        toast.error("Erro ao importar dados");
      } else {
        toast.success("Nenhum dado novo para importar");
        setShowBanner(false);
      }
      if (result.errors.length > 0 && result.migrated > 0) {
        toast.warning(`${result.errors.length} erros durante a importação`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao importar");
    } finally {
      setMigrating(false);
    }
  }

  // Teste grátis expirado e sem pagamento → tudo travado, libera só após pagar.
  const noClube = loc.pathname.startsWith("/club");
  const clubMember = club.data?.tier && club.data.tier !== "none";
  // Sem o status do clube ainda não dá para saber se o paywall vale em /club —
  // espera em vez de piscar o paywall na cara de um membro.
  if (sub.isPending || (club.isPending && sub.data?.status === "inativo" && noClube)) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (sub.data?.status === "inativo" && !(noClube && clubMember)) {
    return (
      <Paywall
        onRefresh={async () => {
          // Re-tenta ativar pagamento pré-cadastro (cliente pagou e criou conta)
          try {
            const m = await import("@/lib/assinatura.functions");
            await m.activatePlanPostSignup({ data: { email: user.email } });
          } catch {}
          sub.refetch();
        }}
      />
    );
  }

  return (
    <AppShell>
      {club.data?.avisoRenovacao && !noClube && (
        <div className="mx-4 mt-4 rounded-xl bg-warning-soft border border-warning/30 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>
            Seu PlanilhaClub vence em{" "}
            {new Date(club.data.membership?.current_period_end ?? "").toLocaleDateString("pt-BR")}.
            Renove para não perder o acesso.
          </span>
          <Link
            to="/club/assinar"
            search={{ plan: club.data.membership?.plan ?? "start" }}
            className="font-semibold text-warning underline shrink-0"
          >
            Renovar
          </Link>
        </div>
      )}
      {showBanner && (
        <div className="mx-4 mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Dados locais disponíveis</p>
              <p className="text-xs text-muted-foreground truncate">
                {getLocalTotalCount()} registros em {getLocalStats().length} tabelas — importe para
                a nuvem
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handleMigrate} disabled={migrating} size="sm">
              {migrating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Importar
            </Button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <Outlet />
    </AppShell>
  );
}
