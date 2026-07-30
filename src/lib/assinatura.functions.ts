/**
 * Server functions for subscription management via Efí Pagamentos.
 */

import { createServerFn } from "@tanstack/react-start";
import { createPixCharge, checkPixStatus } from "./efi-service";
import { supabase } from "@/integrations/supabase/client";

const PLANOS: Record<string, { nome: string; valor: number; dias: number }> = {
  anual: { nome: "PRO Anual", valor: 250, dias: 365 },
  vitalicio: { nome: "Vitalício", valor: 450, dias: 365 * 100 },
};

type CheckoutResult =
  | { ok: true; txid: string; pixCopiaECola: string; qrcode: string; valor: number }
  | { ok: false; error: string };

export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: { plano: string }) => data)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const plano = PLANOS[data.plano];
    if (!plano) return { ok: false, error: "Plano inválido" };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Não autenticado" };

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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { paid: false, error: "Não autenticado" };

    try {
      const status = await checkPixStatus(data.txid);
      if (status.status !== "CONCLUIDA") {
        return { paid: false, error: "Pagamento não confirmado" };
      }

      // Update assinatura and profile
      const userId = session.user.id;
      const now = new Date();

      await supabase.from("assinaturas").upsert({
        user_id: userId,
        plano: plano.nome,
        status: "ativo",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      await supabase
        .from("profiles")
        .update({
          plano: plano.nome,
          trial_ends_at: null,
        })
        .eq("id", userId);

      return { paid: true, plano: plano.nome, dias: plano.dias };
    } catch (err: any) {
      return { paid: false, error: err.message ?? "Erro ao verificar" };
    }
  });

type SubscriptionStatus =
  | { status: "ativo"; plano: string }
  | { status: "trial"; diasRestantes: number }
  | { status: "inativo" };

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .handler(async (): Promise<SubscriptionStatus> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { status: "inativo" };

    const userId = session.user.id;

    // Check for active subscription
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .single();

    if (assinatura) {
      return { status: "ativo", plano: assinatura.plano ?? "Mensal" };
    }

    // Check trial
    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_ends_at, plano")
      .eq("id", userId)
      .single();

    if (profile?.trial_ends_at) {
      const remaining = Math.ceil(
        (new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (remaining > 0) {
        return { status: "trial", diasRestantes: remaining };
      }
    }

    return { status: "inativo" };
  });
