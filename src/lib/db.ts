/**
 * Database abstraction layer.
 * Currently backed by Supabase. Falls back to localStorage for migration.
 */

export {
  selectAll,
  insertRow,
  updateRow,
  deleteRow,
  getProfile,
  updateProfile,
  seedNewUserData,
} from "./supabase-db";

export type Row = Record<string, any>;
