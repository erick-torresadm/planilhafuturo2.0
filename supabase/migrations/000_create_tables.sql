-- Create all tables for planilhafuturo
-- Run this FIRST, then 001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. profiles (identity table: id = auth.uid())
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  nome TEXT,
  saldo_inicial NUMERIC DEFAULT 0,
  renda_mensal NUMERIC DEFAULT 0,
  meta_renda_fixa NUMERIC DEFAULT 0,
  meses_reserva_emergencia INTEGER DEFAULT 6,
  plano TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  migration_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. gastos_fixos
CREATE TABLE IF NOT EXISTS gastos_fixos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  tipo TEXT,
  frequencia TEXT,
  dia INTEGER DEFAULT 1,
  forma TEXT,
  ativo BOOLEAN DEFAULT true,
  parcela_atual INTEGER,
  parcela_total INTEGER,
  mes_anual INTEGER,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. parcelas
CREATE TABLE IF NOT EXISTS parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  qtd_parcelas INTEGER NOT NULL DEFAULT 1,
  parcela_inicial INTEGER DEFAULT 1,
  data TEXT NOT NULL,
  cartao TEXT,
  categoria TEXT,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. desejos
CREATE TABLE IF NOT EXISTS desejos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  valor NUMERIC,
  tipo TEXT,
  parcelado BOOLEAN DEFAULT false,
  qtd_parcelas INTEGER,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. caixinhas
CREATE TABLE IF NOT EXISTS caixinhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  meta NUMERIC,
  atual NUMERIC DEFAULT 0,
  icone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. investimentos
CREATE TABLE IF NOT EXISTS investimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  renda TEXT,
  valor_aplicado NUMERIC,
  posicao_atual NUMERIC,
  data TEXT,
  vencimento TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC,
  data TEXT,
  status TEXT DEFAULT 'pendente',
  tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. focos_diarios
CREATE TABLE IF NOT EXISTS focos_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  texto TEXT NOT NULL,
  feito BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. pomodoros
CREATE TABLE IF NOT EXISTS pomodoros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  duracao_min INTEGER DEFAULT 25,
  tarefa TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. habitos
CREATE TABLE IF NOT EXISTS habitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  icone TEXT,
  cor TEXT,
  dias_semana INTEGER[],
  meta_semanal INTEGER,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. habitos_registros
CREATE TABLE IF NOT EXISTS habitos_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habito_id UUID NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  feito BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. lancamentos
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. assinaturas
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plano TEXT,
  status TEXT DEFAULT 'ativo',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
