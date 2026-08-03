import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint de cron da Vercel — roda 1x/dia (limite do plano Hobby) via
 * vercel.json. A lógica e a autorização vivem na server fn
 * `rodarCronExpiracao` (push.functions.ts), que roda no servidor.
 */
export const Route = createFileRoute("/api/cron")({
  loader: async () => {
    const m = await import("@/lib/push.functions");
    return m.rodarCronExpiracao();
  },
  component: () => null,
});
