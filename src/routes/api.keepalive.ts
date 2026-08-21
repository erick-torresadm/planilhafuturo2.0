import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint de cron da Vercel — roda 1x/dia via vercel.json, so pra
 * garantir uma query real no Supabase e evitar a pausa automatica
 * por inatividade (7 dias sem uso no free tier). Independente do
 * /api/cron (que roda a logica de expiracao de assinatura).
 */
export const Route = createFileRoute("/api/keepalive")({
  loader: async () => {
    const m = await import("@/lib/keepalive.functions");
    const result = await m.rodarKeepalive();
    if (result.ok === false) {
      throw Object.assign(new Error(result.error), { statusCode: 401 });
    }
    return result;
  },
  component: () => null,
});
