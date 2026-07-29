/**
 * Database abstraction layer.
 * Currently uses localStorage for development.
 * Swap implementation for production (Supabase, Prisma, etc.)
 */

import { seedAllTables } from "./local-db";

// Seed tables once on module load
seedAllTables();

export {
  selectAll,
  insertRow,
  updateRow,
  deleteRow,
  getProfile,
  updateProfile,
} from "./local-db";

export type Row = Record<string, any>;
