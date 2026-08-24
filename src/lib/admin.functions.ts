/**
 * Server functions do painel /admin — visão só-leitura de em que fase cada
 * usuário está no funil "grátis no vermelho → paga". Tudo aqui exige
 * isAdminEmail(); nenhum dado sai sem essa checagem.
 */
import { createServerFn } from "@tanstack/react-start";
import { getAuthedUser } from "./server-session";
import { isAdminEmail } from "./push.functions";
import {
  computaSobraMes,
  SOBRA_MIN_POSITIVO,
  INVESTIDO_MIN_POSITIVO,
  DIAS_GRACA,
} from "./assinatura.functions";

async function getAdminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type FaseUsuario = "gratis" | "graca" | "inativo" | "ativo";

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  criadoEm: string | null;
  fase: FaseUsuario;
  plano: string | null;
  sobraMes: number;
  investido: number;
  positivo: boolean;
  positivoEm: string | null;
  diasRestantes: number | null;
};

export type AdminOverview = {
  usuarios: UsuarioAdmin[];
  eventos: {
    id: string;
    tipo: string;
    titulo: string;
    corpo: string;
    refEmail: string | null;
    createdAt: string;
  }[];
};

async function assertAdmin() {
  const me = await getAuthedUser();
  if (!me?.email || !isAdminEmail(me.email)) {
    throw new Error("Não autorizado");
  }
}

/** Ordem de urgência: quem tá na graça (prestes a virar paywall) primeiro. */
const ORDEM_FASE: Record<FaseUsuario, number> = { graca: 0, gratis: 1, inativo: 2, ativo: 3 };

export const getAdminOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOverview> => {
    await assertAdmin();
    const admin = await getAdminDb();

    const [{ data: profiles }, { data: assinaturasAtivas }, { data: notifs }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, nome, email, created_at, positivo_em")
        .order("created_at", { ascending: false }),
      admin.from("assinaturas").select("user_id, plano").eq("status", "ativo"),
      admin
        .from("notificacoes")
        .select("id, tipo, titulo, corpo, ref_email, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const planoPorUsuario = new Map(
      (assinaturasAtivas ?? []).map((a: any) => [a.user_id, a.plano]),
    );

    const usuarios: UsuarioAdmin[] = await Promise.all(
      (profiles ?? []).map(async (p: any) => {
        const planoAtivo = planoPorUsuario.get(p.id);
        if (planoAtivo) {
          return {
            id: p.id,
            nome: p.nome ?? "—",
            email: p.email ?? "—",
            criadoEm: p.created_at,
            fase: "ativo" as const,
            plano: planoAtivo ?? "Mensal",
            sobraMes: 0,
            investido: 0,
            positivo: true,
            positivoEm: p.positivo_em,
            diasRestantes: null,
          };
        }

        const { sobra, investido } = await computaSobraMes(admin, p.id);
        const positivo = sobra >= SOBRA_MIN_POSITIVO || investido >= INVESTIDO_MIN_POSITIVO;
        const positivoEm = p.positivo_em ? new Date(p.positivo_em).getTime() : null;

        let fase: FaseUsuario = "gratis";
        let diasRestantes: number | null = null;
        if (positivoEm) {
          const gracaAte = positivoEm + DIAS_GRACA * 24 * 60 * 60 * 1000;
          const restante = Math.ceil((gracaAte - Date.now()) / (1000 * 60 * 60 * 24));
          if (restante > 0) {
            fase = "graca";
            diasRestantes = restante;
          } else {
            fase = "inativo";
          }
        }

        return {
          id: p.id,
          nome: p.nome ?? "—",
          email: p.email ?? "—",
          criadoEm: p.created_at,
          fase,
          plano: null,
          sobraMes: sobra,
          investido,
          positivo,
          positivoEm: p.positivo_em,
          diasRestantes,
        };
      }),
    );

    usuarios.sort((a, b) => {
      const f = ORDEM_FASE[a.fase] - ORDEM_FASE[b.fase];
      if (f !== 0) return f;
      if (a.fase === "graca") return (a.diasRestantes ?? 99) - (b.diasRestantes ?? 99);
      return (b.criadoEm ?? "").localeCompare(a.criadoEm ?? "");
    });

    const eventos = (notifs ?? []).map((n: any) => ({
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      corpo: n.corpo,
      refEmail: n.ref_email,
      createdAt: n.created_at,
    }));

    return { usuarios, eventos };
  },
);
