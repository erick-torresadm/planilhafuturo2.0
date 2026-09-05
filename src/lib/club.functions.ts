/**
 * Server functions do PlanilhaClub. Toda leitura/escrita usa service role
 * depois de validar o usuário (getAuthedUser). A RLS da migration 009 é
 * defesa em profundidade; a regra de tier aplicada aqui é a mesma.
 */
import { createServerFn } from "@tanstack/react-start";
import { getAuthedUser } from "./server-session";
import { isAdminEmail, registrarEvento } from "./push.functions";
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

// types.ts já foi regenerado (migration 009 aplicada) e inclui club_memberships/
// club_posts/club_events/club_lessons/club_event_rsvps. O `any` aqui só segue o
// mesmo padrão usado em getAdminDb() de assinatura.functions.ts e push.functions.ts —
// as queries desse arquivo usam .select("*") e strings soltas, então tipar o
// client aqui não travaria nada sem tipar cada função por baixo também.
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
  const { data, error } = await admin
    .from("club_memberships")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) console.error("[club] listarMemberships", error.message);
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
      membership: ativa ?? ms.find((m) => m.status !== "pending") ?? null,
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
    .select("id, plan, current_period_end")
    .eq("user_id", m.user_id)
    .eq("status", "active")
    .maybeSingle();
  const fimAnterior = anterior?.current_period_end ? new Date(anterior.current_period_end) : null;
  const periodo = calcularPeriodo(agora, fimAnterior);

  // Compensacao: troca nao e atomica sem funcao SQL; se o claim falhar, devolve a anterior.
  let expirouAnterior = false;
  let ativa: MembershipRow | null = null;
  try {
    // Renovação: a membership antiga vira expired para o índice único liberar.
    if (anterior) {
      await admin
        .from("club_memberships")
        .update({ status: "expired", updated_at: agora.toISOString() })
        .eq("user_id", m.user_id)
        .eq("status", "active");
      expirouAnterior = true;
    }

    // Claim condicional: se outra chamada concorrente (ex.: polling duplicado de
    // "Já paguei") já ativou esta membership entre o SELECT acima e este UPDATE,
    // `.neq("status", "active")` faz o update não afetar nenhuma linha aqui —
    // evitamos rodar os efeitos colaterais (compras_avulsas / assinatura no app)
    // duas vezes para a mesma membership.
    const { data: claimed } = await admin
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
    ativa = (claimed ?? null) as MembershipRow | null;
  } catch (e) {
    console.error("[club] ativarMembership claim", id, e);
    ativa = null;
  }

  if (!ativa) {
    // Outra chamada ativou primeiro — efeitos colaterais ja rodaram (ou vao rodar) la.
    const { data: atual } = await admin
      .from("club_memberships")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    // Compensacao: so devolve a anterior se ninguem ativou a nova (senao o
    // usuario ficaria com duas memberships ativas e o indice unico estouraria).
    if (expirouAnterior && anterior?.id && atual?.status !== "active") {
      await admin
        .from("club_memberships")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", anterior.id);
    }
    return (atual ?? null) as MembershipRow | null;
  }

  // Downgrade Premium → Start na renovação: o app deixa de vir pelo clube.
  if (anterior?.plan === "premium" && m.plan !== "premium") {
    await revogarPremiumNoApp(admin, m.user_id);
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
    await garantirPremiumNoApp(admin, m.user_id);
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

/**
 * Premium do clube libera o app SEM destruir o plano que o usuário já tem.
 * Quem já é Vitalício / PRO Anual mantém a própria linha intacta (o clube não
 * renomeia plano de ninguém) — só quem não tem nada ganha uma linha própria
 * `PlanilhaClub Premium`, que é a única que `revogarPremiumNoApp` mexe depois.
 * Nunca toca em `profiles.plano` / `trial_ends_at`.
 */
async function garantirPremiumNoApp(admin: any, userId: string) {
  const agora = new Date().toISOString();
  const { data: assinaturas, error } = await admin
    .from("assinaturas")
    .select("id, plano, status")
    .eq("user_id", userId);
  if (error) console.error("[club] garantirPremiumNoApp", error.message);
  const linhas = (assinaturas ?? []) as { id: string; plano: string; status: string }[];

  // (a) Já tem o app por um plano próprio — não mexe em nada.
  if (linhas.some((a) => a.status === "ativo" && a.plano !== PLANO_ASSINATURA_PREMIUM)) return;

  // (b) Já existe a linha do clube (de um período anterior) — só reativa.
  const doClube = linhas.find((a) => a.plano === PLANO_ASSINATURA_PREMIUM);
  if (doClube) {
    await admin
      .from("assinaturas")
      .update({ status: "ativo", updated_at: agora })
      .eq("id", doClube.id);
    return;
  }

  // (c) Primeira vez: linha nova só do clube.
  await admin.from("assinaturas").insert({
    user_id: userId,
    plano: PLANO_ASSINATURA_PREMIUM,
    status: "ativo",
    created_at: agora,
    updated_at: agora,
  });
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
      // Cartão já foi cobrado: se a ativação não pegou, é conciliação manual —
      // não pode responder "pago" para um usuário que segue sem acesso.
      const ativada = nova?.id ? await ativarMembership(admin, nova.id) : null;
      if (!ativada || ativada.status !== "active") {
        await registrarEvento({
          tipo: "club_erro",
          titulo: "Cartão aprovado sem ativação",
          corpo: `${me.email ?? me.id} — ${CLUB_PLANOS[data.plan].nome} — R$ ${valor.toFixed(2)} — charge ${card.charge_id} — membership ${nova?.id ?? "?"} nao ativou. Conciliar manualmente.`,
          refUserId: me.id,
          refEmail: me.email ?? null,
          refPlano: CLUB_PLANOS[data.plan].nome,
          refValor: valor,
          dedupeKey: `club_erro_ativacao:${card.charge_id}`,
        });
        return {
          ok: false,
          error:
            "Pagamento aprovado, mas a ativação falhou. Já fomos avisados e vamos ativar manualmente.",
        };
      }
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
  const { data: ativas, error: ativasErr } = await admin
    .from("club_memberships")
    .select("*")
    .eq("status", "active");
  if (ativasErr) console.error("[club] verificarRenovacoesClube ativas", ativasErr.message);
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
  const { data: limpos, error: limposErr } = await admin
    .from("club_memberships")
    .update({ status: "expired", updated_at: agoraIso })
    .eq("status", "pending")
    .lt("created_at", limite)
    .select("id");
  if (limposErr) console.error("[club] verificarRenovacoesClube pendentes", limposErr.message);

  return { avisados, expirados, pendentesLimpos: limpos?.length ?? 0, erros };
}

// ─── Feed ────────────────────────────────────────────────────

async function tierDoUsuario(admin: any, userId: string): Promise<ClubTier> {
  return deriveTier(await listarMemberships(admin, userId), new Date());
}

async function ehAdmin(): Promise<boolean> {
  const me = await getAuthedUser();
  return !!me && isAdminEmail(me.email ?? null);
}

export type PostRow = {
  id: string;
  authorId: string;
  authorNome: string;
  channel: "public" | "closed";
  content: string;
  pinned: boolean;
  createdAt: string;
  mine: boolean;
};

export const listarPosts = createServerFn({ method: "GET" })
  .validator((data: { channel: "public" | "closed" }) => data)
  .handler(async ({ data }): Promise<{ tier: ClubTier; posts: PostRow[] }> => {
    const me = await getAuthedUser();
    if (!me) return { tier: "none", posts: [] };
    const admin = await getAdminDb();
    const tier = await tierDoUsuario(admin, me.id);
    if (data.channel === "closed" && tier === "none") return { tier, posts: [] };

    const { data: rows, error: postsErr } = await admin
      .from("club_posts")
      .select("id, author_id, channel, content, pinned, created_at")
      .eq("channel", data.channel)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (postsErr) console.error("[club] listarPosts posts", postsErr.message);
    const ids = [...new Set((rows ?? []).map((r: any) => r.author_id))];
    const { data: profs, error: profsErr } = ids.length
      ? await admin.from("profiles").select("id, nome").in("id", ids)
      : { data: [] as { id: string; nome: string | null }[], error: null };
    if (profsErr) console.error("[club] listarPosts profiles", profsErr.message);
    const nome = new Map((profs ?? []).map((p: any) => [p.id, (p.nome ?? "Membro").split(" ")[0]]));

    return {
      tier,
      posts: (rows ?? []).map((r: any) => ({
        id: r.id,
        authorId: r.author_id,
        authorNome: nome.get(r.author_id) ?? "Membro",
        channel: r.channel,
        content: r.content,
        pinned: r.pinned,
        createdAt: r.created_at,
        mine: r.author_id === me.id,
      })),
    };
  });

type Ok = { ok: true } | { ok: false; error: string };

export const criarPost = createServerFn({ method: "POST" })
  .validator((data: { channel: "public" | "closed"; content: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const content = data.content.trim();
    if (content.length < 1 || content.length > 2000)
      return { ok: false, error: "Texto entre 1 e 2000 caracteres." };
    const admin = await getAdminDb();
    if ((await tierDoUsuario(admin, me.id)) === "none")
      return { ok: false, error: "Só membros publicam." };
    const { error } = await admin
      .from("club_posts")
      .insert({ author_id: me.id, channel: data.channel, content });
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const excluirPost = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const q = admin.from("club_posts").delete().eq("id", data.id);
    const { data: apagados, error } = (await ehAdmin())
      ? await q.select("id")
      : await q.eq("author_id", me.id).select("id");
    if (error) return { ok: false, error: error.message };
    if (!apagados?.length) return { ok: false, error: "Post não encontrado ou sem permissão." };
    return { ok: true };
  });

export const fixarPost = createServerFn({ method: "POST" })
  .validator((data: { id: string; pinned: boolean }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    if (!(await ehAdmin())) return { ok: false, error: "Só o admin fixa posts." };
    const admin = await getAdminDb();
    const { error } = await admin
      .from("club_posts")
      .update({ pinned: data.pinned })
      .eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

// ─── Eventos ─────────────────────────────────────────────────

export type EventoRow = {
  id: string;
  title: string;
  type: "call" | "desafio";
  description: string | null;
  scheduledAt: string;
  tierRequired: ContentTier;
  rsvps: number;
  going: boolean;
};

export const listarEventos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ tier: ClubTier; eventos: EventoRow[] }> => {
    const me = await getAuthedUser();
    if (!me) return { tier: "none", eventos: [] };
    const admin = await getAdminDb();
    const tier = await tierDoUsuario(admin, me.id);
    const { data: todos, error: evErr } = await admin
      .from("club_events")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (evErr) console.error("[club] listarEventos", evErr.message);
    const evs = (todos ?? []).filter((e: any) => podeVer(tier, e.tier_required as ContentTier));
    const ids = (evs ?? []).map((e: any) => e.id);
    const { data: rs } = ids.length
      ? await admin.from("club_event_rsvps").select("event_id, user_id").in("event_id", ids)
      : { data: [] as { event_id: string; user_id: string }[] };
    const porEvento = new Map<string, { n: number; going: boolean }>();
    for (const r of rs ?? []) {
      const cur = porEvento.get(r.event_id) ?? { n: 0, going: false };
      cur.n++;
      if (r.user_id === me.id) cur.going = true;
      porEvento.set(r.event_id, cur);
    }
    return {
      tier,
      eventos: (evs ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        description: e.description,
        scheduledAt: e.scheduled_at,
        tierRequired: e.tier_required,
        rsvps: porEvento.get(e.id)?.n ?? 0,
        going: porEvento.get(e.id)?.going ?? false,
      })),
    };
  },
);

export const criarEvento = createServerFn({ method: "POST" })
  .validator(
    (data: {
      title: string;
      type: "call" | "desafio";
      description?: string;
      scheduledAt: string;
      tierRequired: ContentTier;
    }) => data,
  )
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null))
      return { ok: false, error: "Só o admin cria eventos." };
    if (!data.title.trim()) return { ok: false, error: "Título obrigatório." };
    if (isNaN(new Date(data.scheduledAt).getTime())) return { ok: false, error: "Data inválida." };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_events").insert({
      title: data.title.trim(),
      type: data.type,
      description: data.description?.trim() || null,
      scheduled_at: new Date(data.scheduledAt).toISOString(),
      tier_required: data.tierRequired,
      created_by: me.id,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const rsvpEvento = createServerFn({ method: "POST" })
  .validator((data: { eventId: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const tier = await tierDoUsuario(admin, me.id);
    if (tier === "none") return { ok: false, error: "Só membros confirmam presença." };
    const { data: ev } = await admin
      .from("club_events")
      .select("id, tier_required")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!ev) return { ok: false, error: "Evento não encontrado." };
    if (!podeVer(tier, ev.tier_required as ContentTier))
      return { ok: false, error: "Esse evento é de um plano acima do seu." };
    const { data: existente } = await admin
      .from("club_event_rsvps")
      .select("event_id")
      .eq("event_id", data.eventId)
      .eq("user_id", me.id)
      .maybeSingle();
    const { error } = existente
      ? await admin
          .from("club_event_rsvps")
          .delete()
          .eq("event_id", data.eventId)
          .eq("user_id", me.id)
      : await admin.from("club_event_rsvps").insert({ event_id: data.eventId, user_id: me.id });
    return error ? { ok: false, error: error.message } : { ok: true };
  });

// ─── Aulas ───────────────────────────────────────────────────

export type AulaRow = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  tierRequired: ContentTier;
  modulo: string | null;
  ordem: number;
  published: boolean;
  liberada: boolean;
};

type AulaInput = {
  title: string;
  description?: string;
  videoUrl?: string;
  tierRequired: ContentTier;
  modulo?: string;
  ordem?: number;
  published?: boolean;
};

const TIERS: ContentTier[] = ["free", "start", "premium"];

function validarAula(d: AulaInput): string | null {
  if (!d.title?.trim()) return "Título obrigatório.";
  if (!TIERS.includes(d.tierRequired)) return "Nível inválido.";
  if (d.videoUrl && !/^https?:\/\//.test(d.videoUrl.trim())) return "URL do vídeo inválida.";
  return null;
}

function aulaPayload(d: AulaInput, userId?: string) {
  return {
    title: d.title.trim(),
    description: d.description?.trim() || null,
    video_url: d.videoUrl?.trim() || null,
    tier_required: d.tierRequired,
    modulo: d.modulo?.trim() || null,
    ordem: Number.isFinite(d.ordem) ? Number(d.ordem) : 0,
    published: d.published ?? true,
    ...(userId ? { created_by: userId } : {}),
    updated_at: new Date().toISOString(),
  };
}

export const listarAulas = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ tier: ClubTier; aulas: AulaRow[] }> => {
    const me = await getAuthedUser();
    if (!me) return { tier: "none", aulas: [] };
    const admin = await getAdminDb();
    const tier = await tierDoUsuario(admin, me.id);
    const adminLogado = isAdminEmail(me.email ?? null);
    let q = admin
      .from("club_lessons")
      .select("*")
      .order("modulo", { ascending: true })
      .order("ordem", { ascending: true });
    if (!adminLogado) q = q.eq("published", true);
    const { data: rows, error } = await q;
    if (error) console.error("[club] listarAulas", error.message);
    return {
      tier,
      aulas: (rows ?? []).map((r: any) => {
        const liberada = adminLogado || podeVer(tier, r.tier_required as ContentTier);
        return {
          id: r.id,
          title: r.title,
          description: liberada ? r.description : null,
          videoUrl: liberada ? r.video_url : null,
          tierRequired: r.tier_required,
          modulo: r.modulo,
          ordem: r.ordem,
          published: r.published,
          liberada,
        };
      }),
    };
  },
);

export const criarAula = createServerFn({ method: "POST" })
  .validator((data: AulaInput) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null))
      return { ok: false, error: "Só o admin cria aulas." };
    const erro = validarAula(data);
    if (erro) return { ok: false, error: erro };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_lessons").insert(aulaPayload(data, me.id));
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const editarAula = createServerFn({ method: "POST" })
  .validator((data: AulaInput & { id: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null))
      return { ok: false, error: "Só o admin edita aulas." };
    const erro = validarAula(data);
    if (erro) return { ok: false, error: erro };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_lessons").update(aulaPayload(data)).eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const excluirAula = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null))
      return { ok: false, error: "Só o admin exclui aulas." };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_lessons").delete().eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });
