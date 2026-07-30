-- Already created by 001_initial_schema.sql DO block.
-- This is a standalone reference. If running 002 alone:
-- DROP POLICY IF EXISTS "user_owns" ON assinaturas;
-- CREATE POLICY "user_owns" ON assinaturas
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy already exists from 001 — nothing to do.
SELECT 1;
