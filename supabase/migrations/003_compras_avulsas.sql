-- Tabela para compras avulsas (ex: Planilha do Erick)
CREATE TABLE IF NOT EXISTS compras_avulsas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  status TEXT DEFAULT 'pendente',
  txid TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compras_avulsas ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_owns ON compras_avulsas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
