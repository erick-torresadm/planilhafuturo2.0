import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview, type FaseUsuario, type UsuarioAdmin } from "@/lib/admin.functions";
import { Money } from "@/components/Money";
import { KpiCardV2 } from "@/components/dashboards/KpiCardV2";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Users, Clock, XCircle, CheckCircle2, Loader2 } from "lucide-react";

/* /admin — painel só-leitura pro dono ver em que fase cada usuário
   está no funil "grátis no vermelho → paga" (mesma regra de negócio
   de getSubscriptionStatus, sem duplicar). Fora do _authenticated:
   nao passa pelo paywall (o dono nao pode ficar preso atras do
   proprio paywall). A seguranca real e no server fn (isAdminEmail). */
export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — planilhafuturo" }] }),
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  component: AdminPage,
});

const FASE_LABEL: Record<FaseUsuario, string> = {
  gratis: "Grátis (no vermelho)",
  graca: "Ficou positivo — na graça",
  inativo: "Graça expirou",
  ativo: "Pagou",
};

const FASE_TONE: Record<FaseUsuario, string> = {
  gratis: "text-muted-foreground bg-muted",
  graca: "text-warning bg-warning-soft",
  inativo: "text-negative bg-negative-soft",
  ativo: "text-positive bg-positive-soft",
};

function AdminPage() {
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });

  if (q.isPending) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <p className="text-sm text-muted-foreground">
          {(q.error as Error)?.message || "Erro ao carregar painel."}
        </p>
      </div>
    );
  }

  const { usuarios, eventos } = q.data!;
  const counts = usuarios.reduce(
    (acc, u) => {
      acc[u.fase]++;
      return acc;
    },
    { gratis: 0, graca: 0, inativo: 0, ativo: 0 } as Record<FaseUsuario, number>,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Logo size={17} />
          <span className="text-sm font-semibold text-muted-foreground">Admin</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <KpiCardV2
            label="Total de usuários"
            value={usuarios.length}
            icon={Users}
            tone="default"
          />
          <KpiCardV2
            label="Grátis (no vermelho)"
            value={counts.gratis}
            icon={Users}
            tone="default"
          />
          <KpiCardV2 label="Na graça (7 dias)" value={counts.graca} icon={Clock} tone="warning" />
          <KpiCardV2 label="Graça expirou" value={counts.inativo} icon={XCircle} tone="negative" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <KpiCardV2 label="Pagantes" value={counts.ativo} icon={CheckCircle2} tone="positive" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Usuários</h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-4 py-2.5 font-semibold text-xs text-muted-foreground">
                    Usuário
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-xs text-muted-foreground">Fase</th>
                  <th className="px-4 py-2.5 font-semibold text-xs text-muted-foreground text-right">
                    Sobra do mês
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-xs text-muted-foreground">
                    Cadastro
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Eventos recentes</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {eventos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento ainda.</p>
            )}
            {eventos.map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.corpo}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(e.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRow({ u }: { u: UsuarioAdmin }) {
  return (
    <tr className="border-t border-border/60">
      <td className="px-4 py-2.5">
        <div className="font-medium truncate max-w-[220px]">{u.nome}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{u.email}</div>
      </td>
      <td className="px-4 py-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            FASE_TONE[u.fase],
          )}
        >
          {FASE_LABEL[u.fase]}
          {u.fase === "graca" && u.diasRestantes != null && ` · ${u.diasRestantes}d`}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        {u.fase === "ativo" ? (
          <span className="text-xs text-muted-foreground">{u.plano}</span>
        ) : (
          <Money value={u.sobraMes} className="font-mono text-sm font-semibold" />
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {u.criadoEm
          ? new Date(u.criadoEm).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : "—"}
      </td>
    </tr>
  );
}
