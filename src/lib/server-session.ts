/**
 * Helper para server functions autenticadas.
 *
 * O middleware `attachSupabaseAuth` (src/integrations/supabase/auth-attacher.ts)
 * anexa `Authorization: Bearer <access_token>` no request do server fn — mas NADA
 * no lado do servidor aplica esse token à sessão do `supabase`. Por isso
 * `supabase.auth.getSession()` retorna `null` dentro de um handler (sem
 * localStorage). Esta função lê o header e valida o token via `getUser()`,
 * devolvendo o usuário autenticado (ou `null`).
 */

import { getRequest } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";

export type AuthedUser = { id: string; email?: string | null };

/** Lê o token Bearer do request e valida contra o Supabase. */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { id: data.user.id, email: data.user.email };
}
