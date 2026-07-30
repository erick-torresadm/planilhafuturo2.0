/**
 * Supabase database layer — implements the same CRUD interface as local-db.ts
 * but backed by Supabase PostgreSQL with Row-Level Security.
 *
 * All functions are async. They automatically scope queries to the authenticated user.
 */

import { supabase } from "@/integrations/supabase/client";

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Usuário não autenticado");
  return userId;
}

/** Tables that use `id = auth.uid()` instead of `user_id` column */
const IDENTITY_TABLES = new Set(["profiles"]);

function isIdentityTable(table: string): boolean {
  return IDENTITY_TABLES.has(table);
}

// ─── Public API ───────────────────────────────────────────────

export async function selectAll<T = any>(table: string): Promise<T[]> {
  const userId = await getUserId();
  const column = isIdentityTable(table) ? "id" : "user_id";
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(column, userId);

  if (error) throw new Error(`Erro ao carregar ${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function insertRow<T extends Record<string, any> = any>(
  table: string,
  row: T,
): Promise<T> {
  const userId = await getUserId();
  const newRow = {
    ...row,
    id: row.id || crypto.randomUUID(),
    ...(isIdentityTable(table) ? {} : { user_id: userId }),
  } as any;

  const { data, error } = await supabase
    .from(table)
    .insert(newRow)
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar em ${table}: ${error.message}`);
  return data as T;
}

export async function updateRow<T = any>(
  table: string,
  id: string,
  patch: Partial<T>,
): Promise<T | null> {
  const userId = await getUserId();
  const column = isIdentityTable(table) ? "id" : "user_id";

  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq("id", id)
    .eq(column, userId) // extra safety: ensure user owns the row
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw new Error(`Erro ao atualizar ${table}: ${error.message}`);
  }
  return data as T;
}

export async function deleteRow(table: string, id: string): Promise<boolean> {
  const userId = await getUserId();
  const column = isIdentityTable(table) ? "id" : "user_id";

  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id)
    .eq(column, userId);

  if (error) throw new Error(`Erro ao deletar de ${table}: ${error.message}`);
  return (count ?? 0) > 0;
}

/** Get the authenticated user's profile */
export async function getProfile(): Promise<Record<string, any>> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // Profile might not exist yet (trigger hasn't run or new user)
    // Return a minimal profile so the app doesn't crash
    if (error.code === "PGRST116") {
      return { id: userId, nome: "Usuário", saldo_inicial: 0, renda_mensal: 0 };
    }
    throw new Error(`Erro ao carregar perfil: ${error.message}`);
  }
  return data ?? {};
}

/** Update the authenticated user's profile */
export async function updateProfile(patch: Record<string, any>) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw new Error(`Erro ao salvar perfil: ${error.message}`);
  return data;
}

/** Seed demo data for a new user (first time login) */
export async function seedNewUserData(userId: string) {
  // Check if user already has data
  const { count } = await supabase
    .from("gastos_fixos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return;

  const now = new Date().toISOString();

  const gastos = [
    { descricao: "Aluguel", valor: 1800, categoria: "Moradia", tipo: "C", frequencia: "mensal", dia: 5, forma: "Pix", ativo: true },
    { descricao: "Mercado mensal", valor: 600, categoria: "Alimentacao", tipo: "P", frequencia: "mensal", dia: 10, forma: "Debito", ativo: true },
    { descricao: "Internet", valor: 119.90, categoria: "Telefonia", tipo: "A", frequencia: "mensal", dia: 15, forma: "Boleto", ativo: true },
    { descricao: "Plano de saúde", valor: 349.90, categoria: "Saude", tipo: "A", frequencia: "mensal", dia: 20, forma: "Boleto", ativo: true },
    { descricao: "Gasolina", valor: 250, categoria: "Transporte", tipo: "P", frequencia: "mensal", dia: 8, forma: "Cartao", ativo: true },
    { descricao: "Streaming", valor: 49.90, categoria: "Lazer", tipo: "A", frequencia: "mensal", dia: 12, forma: "Cartao", ativo: true },
  ];

  const { error: err1 } = await supabase.from("gastos_fixos").insert(
    gastos.map((g) => ({ ...g, id: crypto.randomUUID(), user_id: userId, created_at: now })),
  );
  if (err1) console.error("seed gastos error:", err1);

  const { error: err2 } = await supabase.from("investimentos").insert([
    { id: crypto.randomUUID(), nome: "CDB 100% CDI", tipo: "CDB", renda: "100% CDI", valor_aplicado: 5000, posicao_atual: 5342.50, user_id: userId, created_at: now },
    { id: crypto.randomUUID(), nome: "Tesouro Selic", tipo: "Tesouro", renda: "Selic", valor_aplicado: 8000, posicao_atual: 8420.00, user_id: userId, created_at: now },
  ]);
  if (err2) console.error("seed investimentos error:", err2);
}
