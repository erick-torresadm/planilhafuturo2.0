-- Assinaturas RLS (already enabled in 001_initial_schema.sql)
-- This migration ensures the policy exists specifically for assinaturas

-- Policy for assinaturas (same pattern as other tables)
-- Already created by the DO block in 001_initial_schema.sql, but kept here
-- as a standalone reference for clarity.

-- Allow users to see only their own subscription
CREATE POLICY IF NOT EXISTS "user_owns" ON assinaturas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
