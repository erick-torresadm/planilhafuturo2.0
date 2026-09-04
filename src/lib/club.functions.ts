/**
 * Server functions do PlanilhaClub. Toda leitura/escrita usa service role
 * depois de validar o usuário (getAuthedUser). A RLS da migration 009 é
 * defesa em profundidade; a regra de tier aplicada aqui é a mesma.
 */
import { createServerFn } from "@tanstack/react-start";
import { getAuthedUser } from "./server-session";
import { isAdminEmail, registrarEvento } from "./push.functions";
import { upsertAssinatura } from "./assinatura.functions";
import { createPixCharge, checkPixStatus, createCreditCardCharge } from "./efi-service";
import {
  CLUB_PLANOS,
  HORAS_PENDING,
  calcularPeriodo,
  deriveTier,
  podeReembolsar,
  precisaAvisoRenovacao,
  precoPlano,
  podeVer,
  type BillingMethod,
  type ClubPlan,
  type ClubTier,
  type ContentTier,
  type MembershipSource,
  type MembershipStatus,
} from "./club.rules";

const PLANO_ASSINATURA_PREMIUM = "PlanilhaClub Premium";
const ITEM_PLANILHA = "planilha_erick";

// `club_memberships` ainda não está no types.ts gerado do Supabase (a
// migration 009 criou a tabela, mas os types não foram regenerados — fora do
// escopo desta task). Retorno `any` aqui evita erros de tipo nas queries a
// essa tabela, no mesmo espírito do `admin: any` já usado nos helpers abaixo.
async function getAdminDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type MembershipRow = {
  id: string;
  user_id: string;
  plan: ClubPlan;
  status: MembershipStatus;
  source: MembershipSource;
  billing_method: BillingMethod | null;
  gateway_txid: string | null;
  valor_pago: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_renewal: boolean;
  renewal_notice_sent_at: string | null;
  created_at: string;
};

async function listarMemberships(admin: any, userId: string): Promise<MembershipRow[]> {
  const { data } = await admin
    .from("club_memberships")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as MembershipRow[];
}

async function temPlanilhaAvulsa(admin: any, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("compras_avulsas")
    .select("id")
    .eq("user_id", userId)
    .eq("item", ITEM_PLANILHA)
    .eq("status", "pago")
    .maybeSingle();
  return !!data;
}

async function temVitalicioAtivo(admin: any, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("assinaturas")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .eq("plano", "Vitalício")
    .maybeSingle();
  return !!data;
}

export type ClubStatus = {
  tier: ClubTier;
  membership: MembershipRow | null;
  ofertas: { start: number; premium: number; upgradeAvulsa: boolean; vitalicioDisponivel: boolean };
  avisoRenovacao: boolean;
  podeReembolsar: boolean;
  isAdmin: boolean;
};

export const getClubStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClubStatus> => {
    const me = await getAuthedUser();
    const vazio: ClubStatus = {
      tier: "none",
      membership: null,
      ofertas: {
        start: CLUB_PLANOS.start.valor,
        premium: CLUB_PLANOS.premium.valor,
        upgradeAvulsa: false,
        vitalicioDisponivel: false,
      },
      avisoRenovacao: false,
      podeReembolsar: false,
      isAdmin: false,
    };
    if (!me) return vazio;

    const admin = await getAdminDb();
    const agora = new Date();
    const [ms, avulsa, vitalicio] = await Promise.all([
      listarMemberships(admin, me.id),
      temPlanilhaAvulsa(admin, me.id),
      temVitalicioAtivo(admin, me.id),
    ]);

    const tier = deriveTier(ms, agora);
    const ativa = ms.find((m) => m.status === "active") ?? null;
    const jaResgatouVitalicio = ms.some((m) => m.source === "vitalicio_included");

    return {
      tier,
      membership: ativa ?? ms[0] ?? null,
      ofertas: {
        start: precoPlano("start", avulsa).valor,
        premium: CLUB_PLANOS.premium.valor,
        upgradeAvulsa: avulsa,
        vitalicioDisponivel: vitalicio && !jaResgatouVitalicio && tier === "none",
      },
      avisoRenovacao: !!ativa && !!ativa.renewal_notice_sent_at && !ativa.cancel_renewal,
      podeReembolsar: !!ativa && podeReembolsar(ativa, agora),
      isAdmin: isAdminEmail(me.email ?? null),
    };
  },
);

/**
 * Ativa a membership `id` e aplica os efeitos do plano. Idempotente: se já
 * está `active`, não faz nada. Start → libera a planilha em compras_avulsas.
 * Premium → assinatura ativa no app (gate existente).
 */
async function ativarMembership(admin: any, id: string): Promise<MembershipRow | null> {
  const { data: m } = await admin.from("club_memberships").select("*").eq("id", id).maybeSingle();
  if (!m) return null;
  if (m.status === "active") return m as MembershipRow;

  const agora = new Date();
  const { data: anterior } = await admin
    .from("club_memberships")
    .select("current_period_end")
    .eq("user_id", m.user_id)
    .eq("status", "active")
    .maybeSingle();
  const fimAnterior = anterior?.current_period_end ? new Date(anterior.current_period_end) : null;
  const periodo = calcularPeriodo(agora, fimAnterior);

  // Renovação: a membership antiga vira expired para o índice único liberar.
  if (anterior) {
    await admin
      .from("club_memberships")
      .update({ status: "expired", updated_at: agora.toISOString() })
      .eq("user_id", m.user_id)
      .eq("status", "active");
  }

  // Claim condicional: se outra chamada concorrente (ex.: polling duplicado de
  // "Já paguei") já ativou esta membership entre o SELECT acima e este UPDATE,
  // `.neq("status", "active")` faz o update não afetar nenhuma linha aqui —
  // evitamos rodar os efeitos colaterais (compras_avulsas / upsertAssinatura)
  // duas vezes para a mesma membership.
  const { data: ativa } = await admin
    .from("club_memberships")
    .update({
      status: "active",
      current_period_start: periodo.start.toISOString(),
      current_period_end: periodo.end.toISOString(),
      updated_at: agora.toISOString(),
    })
    .eq("id", id)
    .neq("status", "active")
    .select("*")
    .maybeSingle();

  if (!ativa) {
    // Outra chamada ativou primeiro — efeitos colaterais ja rodaram (ou vao rodar) la.
    const { data: atual } = await admin
      .from("club_memberships")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (atual ?? null) as MembershipRow | null;
  }

  if (m.plan === "start") {
    const jaTem = await temPlanilhaAvulsa(admin, m.user_id);
    if (!jaTem) {
      await admin.from("compras_avulsas").insert({
        user_id: m.user_id,
        item: ITEM_PLANILHA,
        valor: 0,
        status: "pago",
        txid: `club:${id}`,
      });
    }
  } else {
    await upsertAssinatura(m.user_id, PLANO_ASSINATURA_PREMIUM);
  }

  const { data: prof } = await admin
    .from("profiles")
    .select("email")
    .eq("id", m.user_id)
    .maybeSingle();
  await registrarEvento({
    tipo: "club_ativado",
    titulo: `${CLUB_PLANOS[m.plan as ClubPlan].nome} ativado`,
    corpo: `${prof?.email ?? "Usuário"} — ${m.source} — R$ ${Number(m.valor_pago ?? 0).toFixed(2)}`,
    refUserId: m.user_id,
    refEmail: prof?.email ?? null,
    refPlano: CLUB_PLANOS[m.plan as ClubPlan].nome,
    refValor: Number(m.valor_pago ?? 0),
    dedupeKey: `club_ativado:${id}`,
  });

  return (ativa ?? null) as MembershipRow | null;
}

/** Premium expirado/cancelado perde o app: assinatura do clube deixa de ser ativa. */
async function revogarPremiumNoApp(admin: any, userId: string) {
  await admin
    .from("assinaturas")
    .update({ status: "expirado", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("plano", PLANO_ASSINATURA_PREMIUM)
    .eq("status", "ativo");
}

type CheckoutInput =
  | { plan: ClubPlan; metodo: "pix" }
  | {
      plan: ClubPlan;
      metodo: "cartao";
      paymentToken: string;
      customerName: string;
      customerCpf: string;
      customerPhone: string;
      installments: number;
    };

type CheckoutResult =
  | { ok: true; metodo: "pix"; txid: string; pixCopiaECola: string; qrcode: string; valor: number }
  | { ok: true; metodo: "cartao"; paid: boolean; message?: string }
  | { ok: false; error: string };

export const criarAssinaturaClube = createServerFn({ method: "POST" })
  .validator((data: CheckoutInput) => data)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    if (data.plan !== "start" && data.plan !== "premium")
      return { ok: false, error: "Plano inválido" };

    const admin = await getAdminDb();
    const ms = await listarMemberships(admin, me.id);
    const tier = deriveTier(ms, new Date());
    const ativa = ms.find((m) => m.status === "active") ?? null;
    // Só permite comprar de novo se está no aviso de renovação (7 dias) ou sem plano.
    if (tier !== "none" && ativa && !ativa.renewal_notice_sent_at) {
      return {
        ok: false,
        error: "Você já é membro. A renovação abre 7 dias antes do fim do período.",
      };
    }

    const avulsa = await temPlanilhaAvulsa(admin, me.id);
    const { valor, source } = precoPlano(data.plan, avulsa);
    const descricao = `planilhafuturo ${CLUB_PLANOS[data.plan].nome}`;

    try {
      if (data.metodo === "pix") {
        const pix = await createPixCharge(valor, descricao);
        const { error: insErr } = await admin.from("club_memberships").insert({
          user_id: me.id,
          plan: data.plan,
          status: "pending",
          source,
          billing_method: "a_vista",
          gateway_txid: pix.txid,
          valor_pago: valor,
        });
        if (insErr) {
          // Cobrança Pix ainda não paga — inofensiva se ninguém pagar. O
          // usuário só precisa tentar de novo para gerar outro Pix.
          return { ok: false, error: "Não foi possível registrar a assinatura. Tente de novo." };
        }
        return {
          ok: true,
          metodo: "pix",
          txid: pix.txid,
          pixCopiaECola: pix.pixCopiaECola,
          qrcode: pix.qrcode,
          valor,
        };
      }

      const installments = Math.min(12, Math.max(1, Number(data.installments) || 1));
      const card = await createCreditCardCharge(valor, descricao, {
        paymentToken: data.paymentToken,
        customer: {
          name: data.customerName,
          cpf: data.customerCpf,
          email: me.email ?? "",
          phone: data.customerPhone,
        },
        installments,
      });
      if (card.status !== "paid") {
        return { ok: true, metodo: "cartao", paid: false, message: card.message };
      }
      const { data: nova, error: insErr } = await admin
        .from("club_memberships")
        .insert({
          user_id: me.id,
          plan: data.plan,
          status: "pending",
          source,
          billing_method: installments > 1 ? "parcelado_12x" : "a_vista",
          gateway_txid: String(card.charge_id),
          valor_pago: valor,
        })
        .select("id")
        .maybeSingle();
      if (insErr || !nova?.id) {
        // Cartão já foi cobrado, mas não conseguimos gravar a membership —
        // precisa de conciliação manual (a cobrança não pode ficar sem registro).
        await registrarEvento({
          tipo: "club_erro",
          titulo: "Cartão aprovado sem membership",
          corpo: `${me.email ?? me.id} — ${CLUB_PLANOS[data.plan].nome} — R$ ${valor.toFixed(2)} — charge ${card.charge_id} — ${insErr?.message ?? "insert vazio"}. Conciliar manualmente.`,
          refUserId: me.id,
          refEmail: me.email ?? null,
          refPlano: CLUB_PLANOS[data.plan].nome,
          refValor: valor,
          dedupeKey: `club_erro:${card.charge_id}`,
        });
        return {
          ok: false,
          error:
            "Pagamento aprovado, mas houve um erro ao ativar. Já fomos avisados e vamos ativar manualmente — fale com o suporte se precisar.",
        };
      }
      await ativarMembership(admin, nova.id);
      return { ok: true, metodo: "cartao", paid: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao processar pagamento" };
    }
  });

export const verificarAssinaturaClube = createServerFn({ method: "POST" })
  .validator((data: { txid: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const { data: m } = await admin
      .from("club_memberships")
      .select("id, status")
      .eq("user_id", me.id)
      .eq("gateway_txid", data.txid)
      .maybeSingle();
    if (!m) return { ok: false, error: "Cobrança não encontrada" };
    if (m.status === "active") return { ok: true };
    try {
      const st = await checkPixStatus(data.txid);
      if (st.status !== "CONCLUIDA") return { ok: false, error: "Pagamento não confirmado ainda." };
      await ativarMembership(admin, m.id);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao verificar" };
    }
  });

export const ativarVitalicioClube = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    if (!(await temVitalicioAtivo(admin, me.id)))
      return { ok: false, error: "Só para quem tem o Vitalício." };
    const ms = await listarMemberships(admin, me.id);
    if (ms.some((m) => m.source === "vitalicio_included"))
      return { ok: false, error: "Você já resgatou seus 12 meses." };
    if (deriveTier(ms, new Date()) !== "none") return { ok: false, error: "Você já é membro." };

    const { data: nova } = await admin
      .from("club_memberships")
      .insert({
        user_id: me.id,
        plan: "premium",
        status: "pending",
        source: "vitalicio_included",
        valor_pago: 0,
      })
      .select("id")
      .maybeSingle();
    if (!nova?.id) return { ok: false, error: "Não foi possível ativar." };
    await ativarMembership(admin, nova.id);
    return { ok: true };
  },
);

export const cancelarRenovacaoClube = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const { data } = await admin
      .from("club_memberships")
      .update({ cancel_renewal: true, updated_at: new Date().toISOString() })
      .eq("user_id", me.id)
      .eq("status", "active")
      .select("id");
    if (!data?.length) return { ok: false, error: "Nenhuma assinatura ativa." };
    return { ok: true };
  },
);

export const solicitarReembolso = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const agora = new Date();
    const ms = await listarMemberships(admin, me.id);
    const ativa = ms.find((m) => m.status === "active");
    if (!ativa || !podeReembolsar(ativa, agora)) {
      return { ok: false, error: "Reembolso só nos 7 primeiros dias de uma assinatura paga." };
    }
    await admin
      .from("club_memberships")
      .update({ status: "canceled", cancel_renewal: true, updated_at: agora.toISOString() })
      .eq("id", ativa.id);
    if (ativa.plan === "premium") await revogarPremiumNoApp(admin, me.id);

    await registrarEvento({
      tipo: "club_reembolso",
      titulo: "Reembolso solicitado (7 dias)",
      corpo: `${me.email ?? "Usuário"} — ${CLUB_PLANOS[ativa.plan].nome} — R$ ${Number(ativa.valor_pago ?? 0).toFixed(2)} via ${ativa.billing_method ?? "?"} — txid ${ativa.gateway_txid ?? "?"}. Estornar manualmente na Efí.`,
      refUserId: me.id,
      refEmail: me.email ?? null,
      refPlano: CLUB_PLANOS[ativa.plan].nome,
      refValor: Number(ativa.valor_pago ?? 0),
      dedupeKey: `club_reembolso:${ativa.id}`,
    });
    return { ok: true };
  },
);

/**
 * Passo diário do clube (chamado por rodarCronExpiracao via import dinâmico
 * para não criar ciclo push.functions ↔ club.functions):
 * 1) aviso prévio 7 dias antes do fim; 2) expira períodos vencidos
 *    (Premium perde o app); 3) limpa Pix pendente com mais de 24h.
 */
export async function verificarRenovacoesClube(): Promise<{
  avisados: number;
  expirados: number;
  pendentesLimpos: number;
  erros: number;
}> {
  const admin = await getAdminDb();
  const agora = new Date();
  const agoraIso = agora.toISOString();
  const { data: ativas } = await admin.from("club_memberships").select("*").eq("status", "active");
  let avisados = 0;
  let expirados = 0;
  let erros = 0;

  for (const m of (ativas ?? []) as MembershipRow[]) {
    try {
      const { data: prof } = await admin
        .from("profiles")
        .select("email")
        .eq("id", m.user_id)
        .maybeSingle();
      const email = prof?.email ?? "Usuário";

      if (m.current_period_end && new Date(m.current_period_end) <= agora) {
        await admin
          .from("club_memberships")
          .update({ status: "expired", updated_at: agoraIso })
          .eq("id", m.id);
        if (m.plan === "premium") await revogarPremiumNoApp(admin, m.user_id);
        await registrarEvento({
          tipo: "club_expirado",
          titulo: "Clube expirou",
          corpo: `${email} — ${CLUB_PLANOS[m.plan].nome} venceu sem renovar.`,
          refUserId: m.user_id,
          refEmail: email,
          dedupeKey: `club_expirado:${m.id}`,
        });
        expirados++;
        continue;
      }

      if (precisaAvisoRenovacao(m, agora)) {
        await admin
          .from("club_memberships")
          .update({ renewal_notice_sent_at: agoraIso, updated_at: agoraIso })
          .eq("id", m.id);
        await registrarEvento({
          tipo: "club_renovacao_aviso",
          titulo: "Renovação do clube em 7 dias",
          corpo: `${email} — ${CLUB_PLANOS[m.plan].nome} vence em ${new Date(m.current_period_end!).toLocaleDateString("pt-BR")}.`,
          refUserId: m.user_id,
          refEmail: email,
          dedupeKey: `club_renovacao_aviso:${m.id}`,
        });
        avisados++;
      }
    } catch (e) {
      erros++;
      console.error("[club cron] membership", m.id, e);
    }
  }

  const limite = new Date(agora.getTime() - HORAS_PENDING * 60 * 60 * 1000).toISOString();
  const { data: limpos } = await admin
    .from("club_memberships")
    .update({ status: "expired", updated_at: agoraIso })
    .eq("status", "pending")
    .lt("created_at", limite)
    .select("id");

  return { avisados, expirados, pendentesLimpos: limpos?.length ?? 0, erros };
}
