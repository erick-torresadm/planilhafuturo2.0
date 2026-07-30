-- Pre-signup payments table
-- Stores payments made before account creation
-- Activated when user signs up with the same email

CREATE TABLE IF NOT EXISTS pre_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  plano TEXT NOT NULL,
  txid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  pagamento_metodo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pre_pagamentos_email ON pre_pagamentos(email);
CREATE INDEX IF NOT EXISTS idx_pre_pagamentos_txid ON pre_pagamentos(txid);

GRANT SELECT, INSERT, UPDATE ON pre_pagamentos TO authenticated;
GRANT ALL ON pre_pagamentos TO service_role;
ALTER TABLE pre_pagamentos ENABLE ROW LEVEL SECURITY;

-- Only allow users to read their own pre-pagamentos (by email or user_id)
CREATE POLICY "read_own_pre_pagamentos" ON pre_pagamentos
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    user_id = auth.uid()
  );
CREATE POLICY "insert_own_pre_pagamentos" ON pre_pagamentos
  FOR INSERT WITH CHECK (true); -- anyone can start a payment
