/**
 * Server functions for subscription management via Efí Pagamentos.
 * Includes both authenticated (post-signup) and unauthenticated (pre-signup) flows.
 */

import { createServerFn } from "@tanstack/react-start";
import { createPixCharge, checkPixStatus, createCreditCardCharge } from "./efi-service";
import { getAuthedUser } from "./server-session";

const PLANOS: Record<string, { nome: string; valor: number; dias: number }> = {
  anual: { nome: "PRO Anual", valor: 250, dias: 365 },
  vitalicio: { nome: "Vitalício", valor: 450, dias: 365 * 100 },
  planilha: { nome: "Planilha do Erick", valor: 70, dias: 0 },
  mentoria: { nome: "Mentoria com Erick", valor: 497, dias: 0 },
};

// ─── Helpers ───────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const user = await getAuthedUser();
  return user?.id ?? null;
}

async function getAdminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function upsertAssinatura(userId: string, planoNome: string) {
  const admin = await getAdminDb();
  const now = new Date().toISOString();

  // Check if an active subscription already exists - use maybeSingle instead of single
  const { data: existing } = await admin
    .from("assinaturas")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .maybeSingle();

  if (existing) {
    await admin
      .from("assinaturas")
      .update({ plano: planoNome, updated_at: now })
      .eq("id", existing.id);
  } else {
    await admin
      .from("assinaturas")
      .insert({ user_id: userId, plano: planoNome, status: "ativo", created_at: now, updated_at: now });
  }

  // Update profile
  await admin
    .from("profiles")
    .update({ plano: planoNome, trial_ends_at: null })
    .eq("id", userId);
}

/**
 * Marca a Planilha do Erick como paga para o usuário (compra avulsa,
 * NÃO cria assinatura nem libera o app — é produto separado).
 */
async function upsertCompraPlanilha(userId: string) {
  const admin = await getAdminDb();
  const existing = await admin
    .from("compras_avulsas")
    .select("id")
    .eq("user_id", userId)
    .eq("item", "planilha_erick")
    .eq("status", "pago")
    .maybeSingle();
  if (existing) return;
  await admin.from("compras_avulsas").insert({
    user_id: userId,
    item: "planilha_erick",
    valor: 70,
    status: "pago",
  });
}

/**
 * Marca a Mentoria do Erick como paga para o usuário (compra avulsa,
 * NÃO cria assinatura nem libera o app — é produto separado).
 */
async function upsertCompraMentoria(userId: string) {
  const admin = await getAdminDb();
  const existing = await admin
    .from("compras_avulsas")
    .select("id")
    .eq("user_id", userId)
    .eq("item", "mentoria")
    .eq("status", "pago")
    .maybeSingle();
  if (existing) return;
  await admin.from("compras_avulsas").insert({
    user_id: userId,
    item: "mentoria",
    valor: 497,
    status: "pago",
  });
}

// ─── Authenticated checkout (post-signup, via Config page) ──

type CheckoutResult =
  | { ok: true; txid: string; pixCopiaECola: string; qrcode: string; valor: number }
  | { ok: false; error: string };

export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: { plano: string }) => data)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const plano = PLANOS[data.plano];
    if (!plano) return { ok: false, error: "Plano inválido" };

    const userId = await getUserId();
    if (!userId) return { ok: false, error: "Não autenticado" };

    try {
      const pix = await createPixCharge(
        plano.valor,
        `Planilhafuturo ${plano.nome}`,
      );
      return {
        ok: true,
        txid: pix.txid,
        pixCopiaECola: pix.pixCopiaECola,
        qrcode: pix.qrcode,
        valor: pix.valor,
      };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao gerar Pix" };
    }
  });

type PaymentResult =
  | { paid: true; plano: string; dias: number }
  | { paid: false; error: string };

export const verifyPayment = createServerFn({ method: "POST" })
  .validator((data: { txid: string; plano: string }) => data)
  .handler(async ({ data }): Promise<PaymentResult> => {
    const plano = PLANOS[data.plano];
    if (!plano) return { paid: false, error: "Plano inválido" };

    const userId = await getUserId();
    if (!userId) return { paid: false, error: "Não autenticado" };

    try {
      const status = await checkPixStatus(data.txid);
      if (status.status !== "CONCLUIDA") {
        return { paid: false, error: "Pagamento não confirmado" };
      }

      await upsertAssinatura(userId, plano.nome);

      return { paid: true, plano: plano.nome, dias: plano.dias };
    } catch (err: any) {
      return { paid: false, error: err.message ?? "Erro ao verificar" };
    }
  });

type SubscriptionStatus =
  | { status: "ativo"; plano: string }
  | { status: "gratis"; plano: string }
  | { status: "graca"; plano: string; diasRestantes: number }
  | { status: "inativo" };

/** Constantes do gate "grátis no vermelho". */
const SOBRA_MIN_POSITIVO = 250; // sobra do mês (entradas − saídas) a partir da qual fica "positivo"
const INVESTIDO_MIN_POSITIVO = 3000; // patrimônio investido a partir do qual fica "positivo"
const DIAS_GRACA = 7; // prazo para pagar após ficar positivo (segue mesmo se cair no vermelho)

/**
 * Calcula a "sobra do mês" corrente com movimentações REAIS (server-side).
 *
 * NÃO usa profiles.saldo_inicial — o usuário pode editar a própria linha
 * (RLS user_owns) e inflar o saldo inicial para escapar do gate. Sobra =
 * entradas reais − saídas reais do mês corrente.
 */
async function computaSobraMes(
  admin: any,
  userId: string,
): Promise<{ sobra: number; investido: number }> {
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const first = `${y}-${String(m0 + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m0 + 1, 0).getDate();
  const last = `${y}-${String(m0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: lancamentos }, { data: gastos }, { data: parcelas }, { data: invest }] = await Promise.all([
    admin.from("lancamentos").select("tipo, valor").eq("user_id", userId).gte("data", first).lte("data", last),
    admin.from("gastos_fixos").select("valor, frequencia, mes_anual, ativo, dia").eq("user_id", userId),
    admin.from("parcelas").select("data, valor_total, qtd_parcelas, parcela_inicial").eq("user_id", userId),
    admin.from("investimentos").select("posicao_atual").eq("user_id", userId),
  ]);

  let entradas = 0;
  let saidasDiarias = 0;
  for (const l of lancamentos ?? []) {
    const v = Number(l.valor) || 0;
    if (l.tipo === "entrada_fixa" || l.tipo === "entrada_diaria") entradas += v;
    else if (l.tipo === "saida_diaria") saidasDiarias += v;
  }

  let saidasFixas = 0;
  for (const g of gastos ?? []) {
    if (!g.ativo) continue;
    if (g.frequencia === "anual") {
      if (g.mes_anual == null || g.mes_anual - 1 !== m0) continue;
    }
    saidasFixas += Number(g.valor) || 0;
  }

  for (const p of parcelas ?? []) {
    const dt = new Date(p.data + "T00:00:00");
    const monthsAhead = (y - dt.getFullYear()) * 12 + (m0 - dt.getMonth());
    if (monthsAhead < 0) continue;
    const restantes = (p.qtd_parcelas ?? 0) - ((p.parcela_inicial ?? 1) - 1);
    if (monthsAhead >= restantes) continue;
    saidasFixas += Math.round((Number(p.valor_total) / Math.max(p.qtd_parcelas, 1)) * 100) / 100;
  }

  const investido = (invest ?? []).reduce((a: number, r: any) => a + Number(r.posicao_atual) || 0, 0);
  return { sobra: entradas - saidasDiarias - saidasFixas, investido };
}

/**
 * Status de assinatura com consciência de workspace.
 *
 * Modelo "grátis no vermelho" (substitui o trial fixo):
 * - `gratis`: tudo liberado enquanto não ficou positivo.
 * - `graca`: ficou positivo (sobra ≥ R$250 OU investido ≥ R$3.000) e está
 *   dentro do prazo de 7 dias para pagar — ainda liberado.
 * - `inativo`: ficou positivo e passaram os 7 dias sem pagar → paywall.
 * - `ativo`: pagou. Depois de pagar, NÃO volta ao grátis mesmo se ficar no vermelho.
 *
 * O prazo de 7 dias começa quando o usuário fica positivo pela primeira vez
 * (`profiles.positivo_em`, gravado via service role) e segue mesmo que o mês
 * seguinte feche negativo — não dá pra fugir deixando o saldo no vermelho.
 *
 * - Sem `forOwner`: status do próprio usuário logado (sua conta).
 * - Com `forOwner` (workspace ativo): status do DONO do workspace — o ADM
 *   convidado herda o plano do dono para os DADOS do workspace, mas NUNCA
 *   ganha plano ativo na própria conta por causa disso.
 *
 * Segurança: `forOwner` só é aceito se o chamador for membro do workspace.
 * Caso contrário retorna inativo sem revelar o plano do dono.
 */
export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .validator((data: { forOwner?: string } | undefined) => data ?? {})
  .handler(async ({ data }): Promise<SubscriptionStatus> => {
    const me = await getAuthedUser();
    const meId = me?.id ?? null;
    if (!meId) return { status: "inativo" };

    // Service role com user_id explícito — o client supabase não tem sessão no servidor.
    const admin = await getAdminDb();

    // Para quem estamos calculando o plano?
    let targetId = meId;
    if (data.forOwner) {
      // Só membro do workspace pode consultar o plano do dono.
      const { data: mem } = await admin
        .from("workspace_members")
        .select("owner_id")
        .eq("owner_id", data.forOwner)
        .eq("member_id", meId)
        .maybeSingle();
      if (!mem) return { status: "inativo" }; // não é membro → não revela o plano
      targetId = data.forOwner;
    }

    // Check for active subscription
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("plano")
      .eq("user_id", targetId)
      .eq("status", "ativo")
      .maybeSingle();

    if (assinatura) {
      // Pagou → nunca volta ao grátis, mesmo se o saldo cair no vermelho.
      return { status: "ativo", plano: assinatura.plano ?? "Mensal" };
    }

    // Gate por saldo (só para quem ainda não pagou).
    const { sobra, investido } = await computaSobraMes(admin, targetId);
    const positivo = sobra >= SOBRA_MIN_POSITIVO || investido >= INVESTIDO_MIN_POSITIVO;

    const { data: prof } = await admin
      .from("profiles")
      .select("positivo_em")
      .eq("id", targetId)
      .maybeSingle();

    let positivoEm = prof?.positivo_em ? new Date(prof.positivo_em).getTime() : null;

    // Primeira vez positivo → marca o início do prazo de 7 dias (idempotente).
    if (positivo && !positivoEm) {
      const nowIso = new Date().toISOString();
      positivoEm = Date.now();
      await admin.from("profiles").update({ positivo_em: nowIso }).eq("id", targetId);
    }

    // Sem positivo_em e sem assinatura → grátis indefinido (barreira de entrada).
    if (!positivoEm) {
      return { status: "gratis", plano: "Grátis" };
    }

    // Já ficou positivo: o prazo de 7 dias vale mesmo se hoje o saldo estiver negativo.
    const gracaAte = positivoEm + DIAS_GRACA * 24 * 60 * 60 * 1000;
    const restante = Math.ceil((gracaAte - Date.now()) / (1000 * 60 * 60 * 24));
    if (restante > 0) {
      return { status: "graca", plano: "Grátis", diasRestantes: restante };
    }

    return { status: "inativo" };
  });

// ─── Workspaces do usuário (ADM convidado) ────────────────────
// Listagens via service role: o client NÃO lê profiles de terceiros pela RLS
// (evita vazar email/dados financeiros do dono para membros).

type MemberWorkspace = { ownerId: string; ownerNome: string; ownerAtivo: boolean };

/** Workspaces em que o usuário logado é membro (ADM). Só devolve id + nome do dono. */
export const getMemberWorkspaces = createServerFn({ method: "GET" })
  .handler(async (): Promise<MemberWorkspace[]> => {
    const me = await getAuthedUser();
    const meId = me?.id ?? null;
    if (!meId) return [];
    const admin = await getAdminDb();

    const { data: memberships } = await admin
      .from("workspace_members")
      .select("owner_id")
      .eq("member_id", meId);

    const ownerIds = [...new Set((memberships ?? []).map((r) => r.owner_id))];
    if (ownerIds.length === 0) return [];

    const [{ data: owners }, { data: assinaturas }] = await Promise.all([
      admin.from("profiles").select("id, nome").in("id", ownerIds),
      admin.from("assinaturas").select("user_id").eq("status", "ativo").in("user_id", ownerIds),
    ]);

    const ativos = new Set((assinaturas ?? []).map((r) => r.user_id));
    return ownerIds.map((oid) => ({
      ownerId: oid,
      ownerNome: owners?.find((o) => o.id === oid)?.nome ?? "Workspace",
      ownerAtivo: ativos.has(oid),
    }));
  });

/** Membros de um workspace que o usuário logado é DONO. Usado na seção Equipe. */
export const getWorkspaceMembers = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ member_id: string; nome: string; email: string | null }[]> => {
    const me = await getAuthedUser();
    const meId = me?.id ?? null;
    if (!meId) return [];
    const admin = await getAdminDb();

    const { data: rows } = await admin
      .from("workspace_members")
      .select("member_id")
      .eq("owner_id", meId);

    const memberIds = (rows ?? []).map((r) => r.member_id);
    if (memberIds.length === 0) return [];

    const { data: profs } = await admin
      .from("profiles")
      .select("id, nome, email")
      .in("id", memberIds);

    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({
      member_id: r.member_id,
      nome: byId.get(r.member_id)?.nome ?? "Usuário",
      email: byId.get(r.member_id)?.email ?? null,
    }));
  });

// ─── Pre-signup checkout (pay first, create account later) ──

type PreSignupCheckoutResult =
  | { ok: true; metodo: "pix"; txid: string; pixCopiaECola: string; qrcode: string; valor: number }
  | { ok: true; metodo: "cartao"; paid: boolean; charge_id: number; message?: string }
  | { ok: false; error: string };

export const createPreSignupCheckout = createServerFn({ method: "POST" })
  .validator((data: {
    email: string;
    plano: string;
    metodo: "pix" | "cartao";
    paymentToken?: string;
    customerName?: string;
    customerCpf?: string;
    customerPhone?: string;
    billing?: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
      zipcode: string;
    };
    installments?: number;
  }) => data)
  .handler(async ({ data }): Promise<PreSignupCheckoutResult> => {
    const plano = PLANOS[data.plano];
    if (!plano) return { ok: false, error: "Plano inválido" };
    if (!data.email) return { ok: false, error: "Email é obrigatório" };

    const admin = await getAdminDb();

    try {
      if (data.metodo === "pix") {
        const pix = await createPixCharge(plano.valor, `Planilhafuturo ${plano.nome}`);

        // Store pre-payment
        await admin.from("pre_pagamentos").insert({
          email: data.email,
          plano: plano.nome,
          txid: pix.txid,
          status: "pendente",
          valor: pix.valor,
          pagamento_metodo: "pix",
        });

        return {
          ok: true,
          metodo: "pix",
          txid: pix.txid,
          pixCopiaECola: pix.pixCopiaECola,
          qrcode: pix.qrcode,
          valor: pix.valor,
        };
      } else {
        // Credit card — card was tokenized in the browser by Efí's
        // payment-token-efi lib; only the payment_token reaches this server.
        if (!data.paymentToken) return { ok: false, error: "Token do cartão não gerado. Tente novamente." };

        const cardResult = await createCreditCardCharge(
          plano.valor,
          `Planilhafuturo ${plano.nome}`,
          {
            paymentToken: data.paymentToken,
            customer: {
              name: data.customerName ?? "Cliente",
              cpf: data.customerCpf ?? "",
              email: data.email,
              phone: data.customerPhone,
            },
            billing: data.billing,
            installments: data.installments,
          },
        );

        const paid = cardResult.status === "paid";
        const status = paid ? "pago" : "pendente";

        await admin.from("pre_pagamentos").insert({
          email: data.email,
          plano: plano.nome,
          status,
          valor: plano.valor,
          pagamento_metodo: "cartao",
          paid_at: paid ? new Date().toISOString() : null,
        });

        return {
          ok: true,
          metodo: "cartao",
          paid,
          charge_id: cardResult.charge_id,
          message: cardResult.message,
        };
      }
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao processar pagamento" };
    }
  });

type PreSignupVerifyResult =
  | { paid: true }
  | { paid: false; error: string };

export const verifyPreSignupPayment = createServerFn({ method: "POST" })
  .validator((data: { email: string; txid: string }) => data)
  .handler(async ({ data }): Promise<PreSignupVerifyResult> => {
    try {
      const pixStatus = await checkPixStatus(data.txid);
      if (pixStatus.status !== "CONCLUIDA") {
        return { paid: false, error: "Pagamento não confirmado" };
      }

      const admin = await getAdminDb();
      await admin
        .from("pre_pagamentos")
        .update({ status: "pago", paid_at: new Date().toISOString() })
        .eq("txid", data.txid)
        .eq("email", data.email);

      return { paid: true };
    } catch (err: any) {
      return { paid: false, error: err.message ?? "Erro ao verificar pagamento" };
    }
  });

type ActivateResult =
  | { ok: true; plano: string }
  | { ok: false; error: string };

/**
 * Called after user signs up to activate a pre-paid plan.
 * Matches by email.
 */
export const activatePlanPostSignup = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<ActivateResult> => {
    const userId = await getUserId();
    if (!userId) return { ok: false, error: "Não autenticado" };

    const admin = await getAdminDb();
    const userEmail = data.email;

    // Find matching paid pre_pagamento that hasn't been activated
    const { data: pre } = await admin
      .from("pre_pagamentos")
      .select("*")
      .eq("email", userEmail)
      .eq("status", "pago")
      .is("activated_at", null)
      .maybeSingle();

    if (!pre) return { ok: false, error: "Nenhum pagamento pendente encontrado para este email" };

    if (pre.plano === "Planilha do Erick") {
      await upsertCompraPlanilha(userId);
    } else if (pre.plano === "Mentoria com Erick") {
      await upsertCompraMentoria(userId);
    } else {
      await upsertAssinatura(userId, pre.plano);
    }

    // Mark pre_pagamento as activated
    await admin
      .from("pre_pagamentos")
      .update({ activated_at: new Date().toISOString(), status: "ativado", user_id: userId })
      .eq("id", pre.id);

    return { ok: true, plano: pre.plano };
  });
