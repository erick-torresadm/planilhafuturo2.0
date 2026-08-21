import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Keepalive dedicado — so pra garantir que o Supabase recebe pelo menos
 * 1 query real por dia e nunca pausa o projeto por inatividade (free
 * tier pausa apos 7 dias sem uso). Roda 1x/dia via vercel.json,
 * independente do cron de expiracao (defesa em profundidade: se aquele
 * falhar por qualquer motivo, esse ainda mantem o projeto ativo).
 */
export const rodarKeepalive = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const cronSchedule = request.headers.get("x-vercel-cron-schedule") ?? "";
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const expectedToken = process.env.CRON_TOKEN ?? "";

  const authorized =
    cronSchedule.length > 0 || (expectedToken.length > 0 && token === expectedToken);
  if (!authorized) {
    return { ok: false as const, error: "Não autorizado" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, pingedAt: new Date().toISOString() };
});
