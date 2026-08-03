/**
 * Notificações push para o ADMIN (dono da plataforma).
 *
 * O admin (email em ADMIN_EMAILS / fallback do dono) recebe push no celular
 * quando algo acontece: cadastro, pagamento, compra avulsa, positivo (graça)
 * e expiração. Usuário comum não assina push e não vê nada disso.
 *
 * Segurança:
 * - Toda escrita em `push_subscriptions`/`notificacoes` usa service role.
 * - `salvarPushSubscription`/`removerPushSubscription` validam o admin ANTES
 *   de tocar no banco — o client nunca decide por conta própria.
 * - O endpoint da subscription é a chave natural (PK da tabela).
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getAuthedUser } from "./server-session";

// ─── Identificação do admin ───────────────────────────────────

const FALLBACK_ADMIN = "ericktorresadm@gmail.com";

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : [FALLBACK_ADMIN];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

// ─── Banco (service role) ─────────────────────────────────────

async function getAdminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ─── VAPID ────────────────────────────────────────────────────

function getVapidKeys(): { publicKey: string; privateKey: string; subject: string } {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "mailto:ericktorresadm@gmail.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configurados");
  }
  return { publicKey, privateKey, subject };
}

// ─── Eventos: gravar + notificar ──────────────────────────────

export type EventoTipo = "cadastro" | "pagamento" | "compra" | "positivo" | "expiracao";

interface RegistrarEventoParams {
  tipo: EventoTipo;
  titulo: string;
  corpo: string;
  refUserId?: string | null;
  refEmail?: string | null;
  refPlano?: string | null;
  refValor?: number | null;
  dedupeKey: string;
}

/**
 * Grava o evento em `notificacoes` (com dedupe) e dispara push para todas as
 * subscriptions ativas. Se o evento já foi notificado (unique_violation na
 * dedupe_key), não envia nada. Best-effort: falha de rede no push não quebra
 * o fluxo de negócio.
 */
export async function registrarEvento(params: RegistrarEventoParams): Promise<void> {
  const admin = await getAdminDb();

  const { data: notif } = await admin
    .from("notificacoes")
    .insert({
      tipo: params.tipo,
      titulo: params.titulo,
      corpo: params.corpo,
      ref_user_id: params.refUserId ?? null,
      ref_email: params.refEmail ?? null,
      ref_plano: params.refPlano ?? null,
      ref_valor: params.refValor ?? null,
      dedupe_key: params.dedupeKey,
    })
    .select("id")
    .maybeSingle();

  // Já notificado → silencioso.
  if (!notif?.id) return;

  await enviarPush({ tipo: params.tipo, titulo: params.titulo, corpo: params.corpo });
}

// ─── Envio de push ────────────────────────────────────────────

interface PushPayload {
  tipo: EventoTipo;
  titulo: string;
  corpo: string;
}

/** Envia o push para todas as subscriptions salvas (admin). Remove as inválidas. */
async function enviarPush(payload: PushPayload): Promise<void> {
  const admin = await getAdminDb();

  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth");

  if (!subs || subs.length === 0) return;

  let keys: { publicKey: string; privateKey: string; subject: string };
  try {
    keys = getVapidKeys();
  } catch {
    // Sem chaves VAPID configuradas → não dá pra mandar push. Silencioso.
    return;
  }

  const webpush = await import("web-push");
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);

  const payloadJson = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payloadJson,
        )
        .catch((err: any) => {
          // 404/410 → subscription morta; 403 → chave VAPID desatualizada.
          const status = err?.statusCode;
          if (status === 404 || status === 410 || status === 403) {
            return admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
          throw err;
        }),
    ),
  );

  // Log de falhas inesperadas (não derruba o evento).
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[push] erro ao enviar:", r.reason?.message ?? r.reason);
    }
  }
}

// ─── Server fns expostas ao client ────────────────────────────

/** É o admin logado? (chamada pelo client para ativar o fluxo de push) */
export const isAdminLogado = createServerFn({ method: "GET" })
  .handler(async (): Promise<boolean> => {
    const me = await getAuthedUser();
    return isAdminEmail(me?.email ?? null);
  });

/** Chave VAPID pública — só para o admin. Não é segredo, mas evita ruído. */
export const getVapidPublicKey = createServerFn({ method: "GET" })
  .handler(async (): Promise<string> => {
    const me = await getAuthedUser();
    if (!isAdminEmail(me?.email ?? null)) return "";
    return getVapidKeys().publicKey;
  });

/** Salva (upsert) a subscription do admin logado. */
export const salvarPushSubscription = createServerFn({ method: "POST" })
  .validator((data: { endpoint: string; p256dh: string; auth: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null)) {
      return { ok: false, error: "Não autorizado" };
    }
    if (!data.endpoint || !data.p256dh || !data.auth) {
      return { ok: false, error: "Subscription incompleta" };
    }

    const admin = await getAdminDb();
    const now = new Date().toISOString();

    const { error } = await admin.from("push_subscriptions").upsert(
      { endpoint: data.endpoint, user_id: me.id, p256dh: data.p256dh, auth: data.auth, updated_at: now },
      { onConflict: "endpoint" },
    );
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  });

/** Remove a subscription (logout / inválida). */
export const removerPushSubscription = createServerFn({ method: "POST" })
  .validator((data: { endpoint: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null)) return { ok: false };
    if (!data.endpoint) return { ok: false };

    const admin = await getAdminDb();
    await admin.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

// ─── Cadastro (1º login do usuário novo) ──────────────────────

/**
 * Dispara o push de "novo cadastro" no PRIMEIRO login de cada usuário novo.
 * Não há callback server-side confiável no signup (é direto via supabase.auth),
 * então a checagem acontece no login. O cutoff evita notificar todos os
 * usuários que já existiam antes do deploy desta feature — só quem se cadastrou
 * depois dele gera push. Dedupe por user_id garante 1 push por pessoa.
 */
export const notificarCadastroSeNovo = createServerFn({ method: "GET" })
  .handler(async (): Promise<void> => {
    const me = await getAuthedUser();
    if (!me?.id) return;

    // Momento do deploy da feature (2026-08-03). Usuários criados ANTES → não avisa.
    const CADASTRO_CUTOFF = new Date("2026-08-03T23:00:00Z");

    const admin = await getAdminDb();
    const { data: prof } = await admin
      .from("profiles")
      .select("email, created_at")
      .eq("id", me.id)
      .maybeSingle();

    const created = prof?.created_at ? new Date(prof.created_at) : new Date(0);
    if (created < CADASTRO_CUTOFF) return;

    await registrarEvento({
      tipo: "cadastro",
      titulo: "Novo cadastro",
      corpo: `Novo usuário se cadastrou — ${prof?.email ?? me.email ?? "?"}`,
      refUserId: me.id,
      refEmail: prof?.email ?? me.email,
      dedupeKey: `cadastro:${me.id}`,
    });
  });

// ─── Expiração (cron diário) ──────────────────────────────────

const DIAS_GRACA = 7;

/**
 * Roda no cron diário: usuários que ficaram positivos (positivo_em setado),
 * sem assinatura ativa, e cuja graça de 7 dias já venceu → perdem acesso.
 * Um push único por dia agregando todos (dedupe por user_id + dia).
 */
export async function verificarExpirados(): Promise<{ expirados: number; avisados: number }> {
  const admin = await getAdminDb();
  const agora = Date.now();
  const agoraIso = new Date().toISOString();

  // Quem já pagou não expira.
  const { data: ativos } = await admin
    .from("assinaturas")
    .select("user_id")
    .eq("status", "ativo");
  const ativosSet = new Set((ativos ?? []).map((a) => a.user_id));

  // Todos com positivo_em marcado.
  const { data: profs } = await admin
    .from("profiles")
    .select("id, email, nome, positivo_em")
    .not("positivo_em", "is", null);

  const expirados = (profs ?? []).filter((p) => {
    if (ativosSet.has(p.id)) return false;
    const pos = p.positivo_em ? new Date(p.positivo_em).getTime() : null;
    if (!pos) return false;
    return pos + DIAS_GRACA * 24 * 60 * 60 * 1000 < agora;
  });

  if (expirados.length === 0) return { expirados: 0, avisados: 0 };

  const dia = agoraIso.slice(0, 10);
  const titulo = "Acesso encerrado";
  const corpo =
    expirados.length === 1
      ? `${expirados[0].nome ?? expirados[0].email ?? "Usuário"} perdeu o acesso (graça de 7 dias venceu sem pagar).`
      : `${expirados.length} usuários perderam o acesso hoje (graça venceu sem pagar).`;

  // Um único evento agregado por dia.
  const { data: notif } = await admin
    .from("notificacoes")
    .insert({
      tipo: "expiracao",
      titulo,
      corpo,
      ref_email: expirados.map((e) => e.email ?? "?").join(", "),
      dedupe_key: `expiracao:${dia}`,
    })
    .select("id")
    .maybeSingle();

  if (!notif?.id) return { expirados: expirados.length, avisados: 0 };

  await enviarPush({ tipo: "expiracao", titulo, corpo });
  return { expirados: expirados.length, avisados: 1 };
}

/**
 * Endpoint de cron (rota /api/cron) — roda 1x/dia. Detecta graça vencida e
 * dispara push agregado. A autorização acontece AQUI (server fn):
 * - Header `x-vercel-cron-schedule` (a Vercel só envia em invocação real)
 * - OU `?token=<CRON_TOKEN>` quando a env está configurada (teste manual)
 */
export type CronExpiracaoResult =
  | { ok: true; expirados: number; avisados: number }
  | { ok: false; error: string };

export const rodarCronExpiracao = createServerFn({ method: "GET" })
  .handler(async (): Promise<CronExpiracaoResult> => {
    const request = getRequest();
    const cronSchedule = request.headers.get("x-vercel-cron-schedule") ?? "";
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const expectedToken = process.env.CRON_TOKEN ?? "";

    const authorized = cronSchedule.length > 0 || (expectedToken.length > 0 && token === expectedToken);
    if (!authorized) {
      return { ok: false, error: "Não autorizado" };
    }

    const r = await verificarExpirados();
    return { ok: true, expirados: r.expirados, avisados: r.avisados };
  });
