/**
 * Server functions de segurança da conta (ex.: troca de senha).
 *
 * Usa o service role (supabaseAdmin) para trocar a senha direto no Supabase,
 * evitando depender do token de sessão do cliente — que é o que fazia a troca
 * de senha pelo cliente (`supabase.auth.updateUser`) falhar de forma silenciosa.
 */
import { createServerFn } from "@tanstack/react-start";
import { getAuthedUser } from "./server-session";

type TrocarSenhaResult = { ok: true } | { ok: false; error: string };

export const trocarSenha = createServerFn({ method: "POST" })
  .validator((data: { novaSenha: string }) => data)
  .handler(async ({ data }): Promise<TrocarSenhaResult> => {
    const user = await getAuthedUser();
    if (!user) return { ok: false, error: "Não autenticado" };

    const senha = data.novaSenha ?? "";
    if (senha.length < 6) return { ok: false, error: "A senha deve ter no mínimo 6 caracteres" };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: senha });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao trocar a senha" };
    }
  });
