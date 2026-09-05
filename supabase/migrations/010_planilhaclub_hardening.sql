-- 010_planilhaclub_hardening.sql — Postgres concede EXECUTE a PUBLIC em toda
-- funcao nova por padrao, independente do GRANT explicito TO authenticated
-- ja feito na 009. Revoga de PUBLIC e fixa search_path (o advisor de
-- seguranca do Supabase apontou os dois pontos depois da 009 aplicada).

CREATE OR REPLACE FUNCTION club_tier_rank(t TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE t WHEN 'premium' THEN 2 WHEN 'start' THEN 1 ELSE 0 END;
$$;

REVOKE EXECUTE ON FUNCTION club_tier_rank(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION club_tier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION club_tier_rank(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION club_tier(UUID) TO authenticated;
