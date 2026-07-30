/**
 * Server functions for purchasing Planilha_do_Erick.xlsx (R$70 via Pix).
 */

import { createServerFn } from "@tanstack/react-start";
import { createPixCharge, checkPixStatus } from "./efi-service";
import { supabase } from "@/integrations/supabase/client";
import { readFile } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const readFileAsync = promisify(readFile);

const VALOR_PLANILHA = 70;
const ITEM_PLANILHA = "planilha_erick";

type CompraResult =
  | { ok: true; txid: string; pixCopiaECola: string; qrcode: string; valor: number }
  | { ok: false; error: string };

/**
 * Gera um Pix de R$70 para compra da Planilha do Erick.
 */
export const criarCompraPlanilha = createServerFn({ method: "POST" })
  .handler(async (): Promise<CompraResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Faça login primeiro" };

    try {
      const pix = await createPixCharge(
        VALOR_PLANILHA,
        "Planilha do Erick - planilhafuturo",
      );

      // Registra a compra pendente
      await supabase.from("compras_avulsas").insert({
        user_id: session.user.id,
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
  });

type VerificacaoResult =
  | { ok: true; mensagem: string }
  | { ok: false; error: string };

/**
 * Verifica pagamento da planilha e retorna o arquivo para download.
 */
export const verificarCompraPlanilha = createServerFn({ method: "POST" })
  .validator((data: { txid: string }) => data)
  .handler(async ({ data }): Promise<VerificacaoResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Faça login primeiro" };

    try {
      const status = await checkPixStatus(data.txid);
      if (status.status !== "CONCLUIDA") {
        return { ok: false, error: "Pagamento não confirmado ainda." };
      }

      // Marca como pago
      await supabase
        .from("compras_avulsas")
        .update({ status: "pago", updated_at: new Date().toISOString() })
        .eq("txid", data.txid)
        .eq("user_id", session.user.id);

      return { ok: true, mensagem: "Pagamento confirmado!" };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao verificar" };
    }
  });

type DownloadResult =
  | { ok: true; base64: string; nome: string; tipo: string }
  | { ok: false; error: string };

/**
 * Retorna a planilha em base64 para download (após pagamento confirmado).
 */
export const baixarPlanilha = createServerFn({ method: "POST" })
  .handler(async (): Promise<DownloadResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Faça login primeiro" };

    // Verifica se o usuário pagou
    const { data: compra } = await supabase
      .from("compras_avulsas")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("item", ITEM_PLANILHA)
      .eq("status", "pago")
      .maybeSingle();

    if (!compra) return { ok: false, error: "Pagamento não confirmado." };

    try {
      // Tenta ler do sistema de arquivos (desenvolvimento)
      const __dirname = fileURLToPath(new URL(".", import.meta.url));
      const filePath = join(__dirname, "..", "..", "server-assets", "Planilha_do_Erick.xlsx");
      const data = await readFileAsync(filePath);
      return {
        ok: true,
        base64: data.toString("base64"),
        nome: "Planilha_do_Erick.xlsx",
        tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch {
      // Fallback: tenta path relativo ao projeto
      try {
        const filePath2 = join(process.cwd(), "server-assets", "Planilha_do_Erick.xlsx");
        const data = await readFileAsync(filePath2);
        return {
          ok: true,
          base64: data.toString("base64"),
          nome: "Planilha_do_Erick.xlsx",
          tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      } catch (e2: any) {
        return { ok: false, error: "Arquivo não encontrado no servidor." };
      }
    }
  });
