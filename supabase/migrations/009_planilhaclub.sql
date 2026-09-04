-- 009_planilhaclub.sql — PlanilhaClub: memberships, feed, eventos, entitlement.

CREATE TABLE IF NOT EXISTS club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('start','premium')),
  status TEXT NOT NULL CHECK (status IN ('pending','active','canceled','expired')),
  source TEXT NOT NULL CHECK (source IN ('new','upgrade_from_avulsa','vitalicio_included')),
  billing_method TEXT CHECK (billing_method IN ('a_vista','parcelado_12x')),
  gateway_txid TEXT,
  valor_pago NUMERIC,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_renewal BOOLEAN NOT NULL DEFAULT false,
  renewal_notice_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS club_memberships_one_active
  ON club_memberships (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_club_memberships_user ON club_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_club_memberships_txid ON club_memberships(gateway_txid);

CREATE TABLE IF NOT EXISTS club_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('public','closed')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_posts_channel_created ON club_posts(channel, created_at DESC);

CREATE TABLE IF NOT EXISTS club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call','desafio')),
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  tier_required TEXT NOT NULL DEFAULT 'start' CHECK (tier_required IN ('free','start','premium')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_events_scheduled ON club_events(scheduled_at);

-- Aulas: video embed (YouTube/Vimeo) + texto, nivel minimo cumulativo.
CREATE TABLE IF NOT EXISTS club_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  tier_required TEXT NOT NULL DEFAULT 'start' CHECK (tier_required IN ('free','start','premium')),
  modulo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_lessons_modulo_ordem ON club_lessons(modulo, ordem);

-- Ordem dos niveis: none/free = 0, start = 1, premium = 2.
CREATE OR REPLACE FUNCTION club_tier_rank(t TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE t WHEN 'premium' THEN 2 WHEN 'start' THEN 1 ELSE 0 END;
$$;
GRANT EXECUTE ON FUNCTION club_tier_rank(TEXT) TO authenticated;

CREATE TABLE IF NOT EXISTS club_event_rsvps (
  event_id UUID NOT NULL REFERENCES club_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Entitlement: uma fonte só, usada por RLS e server fns.
CREATE OR REPLACE FUNCTION club_tier(uid UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT plan FROM club_memberships
      WHERE user_id = uid AND status = 'active' AND current_period_end > now()
      ORDER BY current_period_end DESC LIMIT 1),
    'none');
$$;
GRANT EXECUTE ON FUNCTION club_tier(UUID) TO authenticated;

ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_event_rsvps ENABLE ROW LEVEL SECURITY;

-- memberships: usuário lê só as próprias; escrita só service role (sem policy de insert/update).
CREATE POLICY club_memberships_read_own ON club_memberships
  FOR SELECT USING (auth.uid() = user_id);

-- posts: público para logado; fechado só membro; insert só membro; delete só o próprio.
CREATE POLICY club_posts_read ON club_posts
  FOR SELECT USING (
    channel = 'public' OR club_tier(auth.uid()) <> 'none'
  );
CREATE POLICY club_posts_insert_member ON club_posts
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND club_tier(auth.uid()) <> 'none'
  );
CREATE POLICY club_posts_delete_own ON club_posts
  FOR DELETE USING (author_id = auth.uid());

-- events e lessons: nivel do usuario >= nivel exigido. Sem escrita por usuário.
ALTER TABLE club_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY club_events_read ON club_events
  FOR SELECT USING (
    club_tier_rank(club_tier(auth.uid())) >= club_tier_rank(tier_required)
  );
CREATE POLICY club_lessons_read ON club_lessons
  FOR SELECT USING (
    published AND club_tier_rank(club_tier(auth.uid())) >= club_tier_rank(tier_required)
  );

-- rsvps: só as próprias, só em evento visível e só membro.
CREATE POLICY club_rsvps_read_own ON club_event_rsvps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY club_rsvps_insert_member ON club_event_rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND club_tier(auth.uid()) <> 'none'
    AND EXISTS (SELECT 1 FROM club_events e WHERE e.id = event_id)
  );
CREATE POLICY club_rsvps_delete_own ON club_event_rsvps
  FOR DELETE USING (auth.uid() = user_id);
