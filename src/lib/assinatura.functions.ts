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
  | { status: "trial"; plano: string; diasRestantes: number }
  | { status: "inativo" };

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .handler(async (): Promise<SubscriptionStatus> => {
    const userId = await getUserId();
    if (!userId) return { status: "inativo" };

    // Service role com user_id explícito — o client supabase não tem sessão no servidor.
    const admin = await getAdminDb();

    // Check for active subscription
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("plano")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .maybeSingle();

    if (assinatura) {
      return { status: "ativo", plano: assinatura.plano ?? "Mensal" };
    }

    // Trial calculado a partir do created_at do auth.users (não editável pelo
    // usuário). NÃO confiar em profiles.trial_ends_at/plano: a RLS "own profile"
    // permite o usuário alterar a própria linha e furar o paywall. Também evita
    // travar contas legadas com trial_ends_at NULL.
    const DIAS_TRIAL = 15;
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const created = authUser?.user?.created_at;
    if (created) {
      const endsAt = new Date(created).getTime() + DIAS_TRIAL * 24 * 60 * 60 * 1000;
      const remaining = Math.ceil((endsAt - Date.now()) / (1000 * 60 * 60 * 24));
      if (remaining > 0) {
        return { status: "trial", plano: "Grátis", diasRestantes: remaining };
      }
    } else {
      // Sem created_at (caso improvável) → não trava ninguém por engano.
      return { status: "trial", plano: "Grátis", diasRestantes: DIAS_TRIAL };
    }

    return { status: "inativo" };
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
