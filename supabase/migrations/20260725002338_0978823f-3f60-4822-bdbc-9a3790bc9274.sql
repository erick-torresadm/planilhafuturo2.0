
CREATE TABLE public.focos_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL,
  ordem int NOT NULL DEFAULT 1,
  texto text NOT NULL,
  feito boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focos_diarios TO authenticated;
GRANT ALL ON public.focos_diarios TO service_role;
ALTER TABLE public.focos_diarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own focos" ON public.focos_diarios FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.habitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  icone text DEFAULT '✅',
  cor text DEFAULT 'mint',
  dias_semana int[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  meta_semanal int DEFAULT 7,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitos TO authenticated;
GRANT ALL ON public.habitos TO service_role;
ALTER TABLE public.habitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habitos" ON public.habitos FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.habitos_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habito_id uuid NOT NULL REFERENCES public.habitos(id) ON DELETE CASCADE,
  data date NOT NULL,
  feito boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habito_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitos_registros TO authenticated;
GRANT ALL ON public.habitos_registros TO service_role;
ALTER TABLE public.habitos_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habitos_registros" ON public.habitos_registros FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.pomodoros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT current_date,
  duracao_min int NOT NULL DEFAULT 25,
  tarefa text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pomodoros TO authenticated;
GRANT ALL ON public.pomodoros TO service_role;
ALTER TABLE public.pomodoros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pomodoros" ON public.pomodoros FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
