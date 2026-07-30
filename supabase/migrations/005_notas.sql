-- Notes / Kanban board table
-- Columns: a_fazer, fazendo, feito (default)
CREATE TABLE IF NOT EXISTS notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  coluna TEXT NOT NULL DEFAULT 'a_fazer',
  ordem INTEGER DEFAULT 0,
  etiqueta TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_own_select" ON notas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notas_own_insert" ON notas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notas_own_update" ON notas
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notas_own_delete" ON notas
  FOR DELETE USING (auth.uid() = user_id);
