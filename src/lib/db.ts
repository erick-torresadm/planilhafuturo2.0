import { supabase } from "@/integrations/supabase/client";

export type Row = Record<string, any>;

export async function selectAll(table: string) {
  const { data, error } = await supabase.from(table as any).select("*");
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function upsertRow(table: string, row: Row) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  const payload = { ...row, user_id: row.user_id ?? uid };
  const { data, error } = await supabase.from(table as any).upsert(payload).select().single();
  if (error) throw error;
  return data as Row;
}

export async function insertRow(table: string, row: Row) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  const payload = { ...row, user_id: uid };
  const { data, error } = await supabase.from(table as any).insert(payload).select().single();
  if (error) throw error;
  return data as Row;
}

export async function updateRow(table: string, id: string, patch: Row) {
  const { data, error } = await supabase.from(table as any).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Row;
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  if (error) throw error;
}
