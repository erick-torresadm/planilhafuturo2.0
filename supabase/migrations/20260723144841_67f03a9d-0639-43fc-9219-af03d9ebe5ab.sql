
-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  renda_mensal NUMERIC(14,2) DEFAULT 0,
  saldo_inicial NUMERIC(14,2) DEFAULT 0,
  meta_renda_fixa NUMERIC(14,2) DEFAULT 0,
  meses_reserva_emergencia INT DEFAULT 6,
  plano TEXT DEFAULT 'trial',
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '15 days'),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================
-- GASTOS FIXOS
-- =========================
CREATE TABLE public.gastos_fixos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  tipo TEXT DEFAULT 'A',            -- P=Parcelado, A=Assinatura, C=Contrato
  frequencia TEXT DEFAULT 'mensal', -- mensal | anual
  parcela_atual INT,
  parcela_total INT,
  dia INT NOT NULL DEFAULT 1 CHECK (dia BETWEEN 1 AND 31),
  mes_anual INT CHECK (mes_anual BETWEEN 1 AND 12), -- só p/ frequencia=anual
  forma TEXT DEFAULT 'Pix',
  ativo BOOLEAN DEFAULT true,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX gastos_fixos_user_dia_idx ON public.gastos_fixos(user_id, dia);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos_fixos TO authenticated;
GRANT ALL ON public.gastos_fixos TO service_role;
ALTER TABLE public.gastos_fixos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gastos_fixos" ON public.gastos_fixos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- LANCAMENTOS
-- =========================
CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,   -- entrada_fixa | entrada_diaria | saida_diaria
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX lancamentos_user_data_idx ON public.lancamentos(user_id, data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lancamentos" ON public.lancamentos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- PARCELAS
-- =========================
CREATE TABLE public.parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  qtd_parcelas INT NOT NULL DEFAULT 1,
  parcela_inicial INT DEFAULT 1,
  cartao TEXT,
  categoria TEXT,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX parcelas_user_data_idx ON public.parcelas(user_id, data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas TO authenticated;
GRANT ALL ON public.parcelas TO service_role;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own parcelas" ON public.parcelas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- INVESTIMENTOS
-- =========================
CREATE TABLE public.investimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  renda TEXT,
  valor_aplicado NUMERIC(14,2) DEFAULT 0,
  posicao_atual NUMERIC(14,2) DEFAULT 0,
  data DATE,
  vencimento DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investimentos TO authenticated;
GRANT ALL ON public.investimentos TO service_role;
ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own investimentos" ON public.investimentos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- DESEJOS
-- =========================
CREATE TABLE public.desejos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  valor NUMERIC(14,2) DEFAULT 0,
  tipo TEXT,
  parcelado BOOLEAN DEFAULT false,
  qtd_parcelas INT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.desejos TO authenticated;
GRANT ALL ON public.desejos TO service_role;
ALTER TABLE public.desejos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own desejos" ON public.desejos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- TAREFAS
-- =========================
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE,
  descricao TEXT NOT NULL,
  tipo TEXT,
  valor NUMERIC(14,2),
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tarefas" ON public.tarefas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- CAIXINHAS
-- =========================
CREATE TABLE public.caixinhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  meta NUMERIC(14,2) DEFAULT 0,
  atual NUMERIC(14,2) DEFAULT 0,
  icone TEXT DEFAULT '🎯',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixinhas TO authenticated;
GRANT ALL ON public.caixinhas TO service_role;
ALTER TABLE public.caixinhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own caixinhas" ON public.caixinhas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- ASSINATURAS
-- =========================
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assinaturas" ON public.assinaturas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','gastos_fixos','lancamentos','parcelas','investimentos','desejos','tarefas','caixinhas','assinaturas']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- =========================
-- auto-create profile on signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
