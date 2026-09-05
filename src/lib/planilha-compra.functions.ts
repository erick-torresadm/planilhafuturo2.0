/**
 * Server functions for purchasing Planilha_do_Erick.xlsx (R$70 via Pix).
 */

import { createServerFn } from "@tanstack/react-start";
import { createPixCharge, checkPixStatus } from "./efi-service";
import { getAuthedUser } from "./server-session";
import { VALOR_PLANILHA_AVULSA as VALOR_PLANILHA } from "./club.rules";
const ITEM_PLANILHA = "planilha_erick";
const NOME_ARQUIVO = "Planilha_do_Erick.xlsx";
const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function getAdminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type CompraResult =
  | { ok: true; txid: string; pixCopiaECola: string; qrcode: string; valor: number }
  | { ok: false; error: string };

/**
 * Gera um Pix de R$70 para compra da Planilha do Erick.
 */
export const criarCompraPlanilha = createServerFn({ method: "POST" }).handler(
  async (): Promise<CompraResult> => {
    const user = await getAuthedUser();
    if (!user) return { ok: false, error: "Faça login primeiro" };

    try {
      const pix = await createPixCharge(VALOR_PLANILHA, "Planilha do Erick - planilhafuturo");

      // Registra a compra pendente (service role, com user_id explícito)
      const admin = await getAdminDb();
      await admin.from("compras_avulsas").insert({
        user_id: user.id,
        item: ITEM_PLANILHA,
        valor: VALOR_PLANILHA,
        status: "pendente",
        txid: pix.txid,
      });

      return {
        ok: true,
        txid: pix.txid,
        pixCopiaECola: pix.pixCopiaECola,
        qrcode: pix.qrcode,
        valor: VALOR_PLANILHA,
      };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao gerar Pix" };
    }
  },
);

type VerificacaoResult = { ok: true; mensagem: string } | { ok: false; error: string };

/**
 * Verifica pagamento da planilha.
 */
export const verificarCompraPlanilha = createServerFn({ method: "POST" })
  .validator((data: { txid: string }) => data)
  .handler(async ({ data }): Promise<VerificacaoResult> => {
    const user = await getAuthedUser();
    if (!user) return { ok: false, error: "Faça login primeiro" };

    try {
      const status = await checkPixStatus(data.txid);
      if (status.status !== "CONCLUIDA") {
        return { ok: false, error: "Pagamento não confirmado ainda." };
      }

      // Marca como pago
      const admin = await getAdminDb();
      await admin
        .from("compras_avulsas")
        .update({ status: "pago", updated_at: new Date().toISOString() })
        .eq("txid", data.txid)
        .eq("user_id", user.id);

      return { ok: true, mensagem: "Pagamento confirmado!" };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao verificar" };
    }
  });

type TemPlanilhaResult = { tem: boolean };

/**
 * Checa se o usuário já comprou a Planilha do Erick (paga).
 */
export const temPlanilha = createServerFn({ method: "GET" }).handler(
  async (): Promise<TemPlanilhaResult> => {
    const user = await getAuthedUser();
    if (!user) return { tem: false };

    const admin = await getAdminDb();
    const { data: compra } = await admin
      .from("compras_avulsas")
      .select("id")
      .eq("user_id", user.id)
      .eq("item", ITEM_PLANILHA)
      .eq("status", "pago")
      .maybeSingle();

    return { tem: !!compra };
  },
);

type DownloadResult =
  | { ok: true; base64: string; nome: string; tipo: string }
  | { ok: false; error: string };

/**
 * Retorna a planilha em base64 para download (após pagamento confirmado).
 */
export const baixarPlanilha = createServerFn({ method: "POST" }).handler(
  async (): Promise<DownloadResult> => {
    const user = await getAuthedUser();
    if (!user) return { ok: false, error: "Faça login primeiro" };

    // Verifica se o usuário pagou
    const admin = await getAdminDb();
    const { data: compra } = await admin
      .from("compras_avulsas")
      .select("id")
      .eq("user_id", user.id)
      .eq("item", ITEM_PLANILHA)
      .eq("status", "pago")
      .maybeSingle();

    if (!compra) return { ok: false, error: "Pagamento não confirmado." };

    try {
      // Importa o asset embutido no bundle (gerado por scripts/gen-assets.mjs).
      // Import dinâmico para NÃO mandar os ~460KB de base64 para o cliente.
      const { PLANILHA_ERICK_XLSX_B64 } = await import("@/generated/planilha-asset");
      return {
        ok: true,
        base64: PLANILHA_ERICK_XLSX_B64,
        nome: NOME_ARQUIVO,
        tipo: TIPO_XLSX,
      };
    } catch {
      return { ok: false, error: "Arquivo não encontrado no servidor." };
    }
  },
);
