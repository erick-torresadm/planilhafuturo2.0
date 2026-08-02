/**
 * Server functions para o convite de ADM por link.
 *
 * - buscarConvitePorToken: valida o token do link (rota pública /convite/:token).
 * - aceitarConvite: cria a associação owner↔member usando o service_role
 *   (o convidado ainda não tem acesso via RLS — o token é a credencial).
 */

import { createServerFn } from "@tanstack/react-start";
import { getAuthedUser } from "./server-session";

async function getAdminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type ConviteStatus =
  | { status: "pendente"; ownerId: string; ownerNome: string; ownerPlano: string | null }
  | { status: "aceito" | "revogado" | "expirado" | "inexistente" };

export const buscarConvitePorToken = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<ConviteStatus> => {
    const admin = await getAdminDb();

    const { data: convite } = await admin
      .from("convites")
      .select("owner_id, status, expira_em")
      .eq("token", token)
      .maybeSingle();

    if (!convite) return { status: "inexistente" };
    if (convite.status === "aceito") return { status: "aceito" };
    if (convite.status === "revogado") return { status: "revogado" };
    if (new Date(convite.expira_em).getTime() < Date.now()) return { status: "expirado" };

    const { data: owner } = await admin
      .from("profiles")
      .select("id, nome, plano")
      .eq("id", convite.owner_id)
      .single();

    return {
      status: "pendente",
      ownerId: convite.owner_id,
      ownerNome: owner?.nome ?? "usuário",
      ownerPlano: owner?.plano ?? null,
    };
  });

type AceitarResult =
  | { ok: true; ownerId: string; ownerNome: string }
  | { ok: false; error: string };

export const aceitarConvite = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<AceitarResult> => {
    const invitee = await getAuthedUser();
    const inviteeId = invitee?.id ?? null;
    if (!inviteeId) return { ok: false, error: "Você precisa estar logado para aceitar o convite" };

    const admin = await getAdminDb();

    const { data: convite } = await admin
      .from("convites")
      .select("id, owner_id, status, expira_em, aceito_por, email")
      .eq("token", token)
      .maybeSingle();

    if (!convite) return { ok: false, error: "Convite inválido" };
    if (convite.status === "revogado") return { ok: false, error: "Este convite foi revogado" };
    if (new Date(convite.expira_em).getTime() < Date.now()) {
      return { ok: false, error: "Este convite expirou" };
    }
    if (convite.owner_id === inviteeId) {
      return { ok: false, error: "Você não pode aceitar o próprio convite" };
    }

    // Um convite já aceito não pode ser reutilizado por OUTRA conta.
    // Só o mesmo convidado (aceito_por) pode reacessar via o mesmo link.
    if (convite.status === "aceito" && convite.aceito_por !== inviteeId) {
      return { ok: false, error: "Este convite já foi utilizado por outra conta" };
    }

    // Quando o convite foi criado com um e-mail, só aceita quem tem esse e-mail.
    if (convite.email) {
      const inviteeEmail = invitee?.email?.toLowerCase();
      if (!inviteeEmail || convite.email.toLowerCase() !== inviteeEmail) {
        return { ok: false, error: "Este convite é para outro e-mail" };
      }
    }

    // Idempotente: se já é membro, apenas garante o convite marcado como aceito
    const { data: existing } = await admin
      .from("workspace_members")
      .select("owner_id, member_id")
      .eq("owner_id", convite.owner_id)
      .eq("member_id", inviteeId)
      .maybeSingle();

    if (!existing) {
      await admin.from("workspace_members").insert({
        owner_id: convite.owner_id,
        member_id: inviteeId,
        role: "admin",
      });
    }

    if (convite.status !== "aceito") {
      await admin
        .from("convites")
        .update({
          status: "aceito",
          aceito_por: inviteeId,
          aceito_em: new Date().toISOString(),
        })
        .eq("id", convite.id);
    }

    const { data: owner } = await admin
      .from("profiles")
      .select("id, nome")
      .eq("id", convite.owner_id)
      .single();

    return {
      ok: true,
      ownerId: convite.owner_id,
      ownerNome: owner?.nome ?? "usuário",
    };
  });
