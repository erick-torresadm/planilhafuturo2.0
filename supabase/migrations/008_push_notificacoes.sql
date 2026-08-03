-- Push de notificações para o admin + registro de eventos.
-- Tabelas de sistema: acesso EXCLUSIVO via service role (server fns).

-- Assinaturas de Web Push (endpoint é a chave natural)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- Registro de todos os eventos da plataforma (dedupe + histórico)
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,                -- cadastro | pagamento | compra | positivo | expiracao
  titulo TEXT NOT NULL,
  corpo TEXT NOT NULL,
  ref_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ref_email TEXT,                    -- email do dono do evento (denormalizado)
  ref_plano TEXT,                    -- plano/pagamento quando aplicável
  ref_valor NUMERIC,                 -- valor quando aplicável
  dedupe_key TEXT UNIQUE,            -- garante 1 push por evento
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_created ON notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);

-- RLS habilitada e sem policy → client autenticado NÃO acessa.
-- service_role tem BYPASSRLS e é quem grava/lê (server fns).
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Só service_role mexe aqui.
REVOKE ALL ON push_subscriptions FROM anon, authenticated;
REVOKE ALL ON notificacoes FROM anon, authenticated;
GRANT ALL ON push_subscriptions TO service_role;
GRANT ALL ON notificacoes TO service_role;
