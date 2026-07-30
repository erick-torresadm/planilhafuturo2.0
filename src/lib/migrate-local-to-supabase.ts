/**
 * Migration utility: localStorage → Supabase.
 * Reads all pf_* keys and fluxo_lancamentos_v1, inserts into Supabase.
 * Idempotent — tracks completion via profiles.migration_completed_at.
 */

import { supabase } from "@/integrations/supabase/client";

interface MigrateResult {
  migrated: number;
  errors: string[];
  tables: Record<string, number>;
}

const PREFIX = "pf_";

/** Get all tables that have data in localStorage */
function getLocalTables(): { table: string; rows: any[] }[] {
  if (typeof window === "undefined") return [];
  const tables: { table: string; rows: any[] }[] = [];

  // Map pf_* keys to table names
  const knownTables = [
    "profiles", "gastos_fixos", "parcelas", "desejos", "caixinhas",
    "investimentos", "tarefas", "focos_diarios", "pomodoros", "habitos", "habitos_registros",
  ];

  for (const table of knownTables) {
    try {
      const raw = localStorage.getItem(`${PREFIX}${table}`);
      if (raw) {
        const rows = JSON.parse(raw);
        if (Array.isArray(rows) && rows.length > 0) {
          tables.push({ table, rows });
        }
      }
    } catch { /* skip */ }
  }

  // Handle lancamentos (separate key)
  try {
    const raw = localStorage.getItem("fluxo_lancamentos_v1");
    if (raw) {
      const rows = JSON.parse(raw);
      if (Array.isArray(rows) && rows.length > 0) {
        tables.push({ table: "lancamentos", rows });
      }
    }
  } catch { /* skip */ }

  return tables;
}

/** Check if migration has already been completed */
export async function isMigrationComplete(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("migration_completed_at")
    .eq("id", userId)
    .single();

  return !!data?.migration_completed_at;
}

/** Count localStorage data for display */
export function getLocalStats(): { table: string; count: number }[] {
  return getLocalTables()
    .map((t) => ({ table: t.table, count: t.rows.length }))
    .sort((a, b) => b.count - a.count);
}

/** Check if there's localStorage data to migrate */
export function hasLocalData(): boolean {
  return getLocalTables().length > 0;
}

/** Migrate all localStorage data to Supabase */
export async function migrateLocalDataToSupabase(userId: string): Promise<MigrateResult> {
  const result: MigrateResult = { migrated: 0, errors: [], tables: {} };

  // Check if already migrated
  const alreadyMigrated = await isMigrationComplete(userId);
  if (alreadyMigrated) {
    result.errors.push("Dados já foram migrados anteriormente");
    return result;
  }

  const localTables = getLocalTables();

  for (const { table, rows } of localTables) {
    let count = 0;

    for (const row of rows) {
      try {
        // Check if this row already exists (by id)
        if (row.id) {
          const { data: existing } = await supabase
            .from(table)
            .select("id")
            .eq("id", row.id)
            .maybeSingle();

          if (existing) {
            count++;
            continue; // already migrated
          }
        }

        // Add user_id for non-identity tables
        const insertRow = table === "profiles"
          ? { ...row, id: userId }
          : { ...row, user_id: userId };

        // Remove fields that might conflict
        if (insertRow.created_at) delete insertRow.created_at;
        if (insertRow.updated_at) delete insertRow.updated_at;

        const { error } = await supabase.from(table).insert(insertRow);
        if (error) {
          // Skip duplicate key errors (row already exists)
          if (error.code === "23505") {
            count++;
            continue;
          }
          result.errors.push(`${table}:${row.id}: ${error.message}`);
          continue;
        }
        count++;
      } catch (err: any) {
        result.errors.push(`${table}:${row.id}: ${err.message}`);
      }
    }

    result.tables[table] = count;
    result.migrated += count;
  }

  // Mark migration as complete (even if some errors, don't re-process)
  await supabase
    .from("profiles")
    .update({
      migration_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return result;
}

/** Clear localStorage data after successful migration */
export function clearLocalData() {
  if (typeof window === "undefined") return;
  const knownTables = [
    "profiles", "gastos_fixos", "parcelas", "desejos", "caixinhas",
    "investimentos", "tarefas", "focos_diarios", "pomodoros", "habitos", "habitos_registros",
  ];
  for (const table of knownTables) {
    try { localStorage.removeItem(`${PREFIX}${table}`); } catch {}
  }
  try { localStorage.removeItem("fluxo_lancamentos_v1"); } catch {}
  try { localStorage.removeItem("pf_seeded"); } catch {}
}

/** Get total row count across all local tables */
export function getLocalTotalCount(): number {
  return getLocalTables().reduce((sum, t) => sum + t.rows.length, 0);
}
