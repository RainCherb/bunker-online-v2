-- =====================================================
-- ПОЛНАЯ НАСТРОЙКА SUPABASE ДЛЯ BUNKER ONLINE
-- Выполните этот скрипт в Supabase SQL Editor
-- =====================================================

-- 1. Создание таблицы games
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'lobby',
  current_round INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 7,
  current_player_index INTEGER NOT NULL DEFAULT 0,
  bunker_name TEXT NOT NULL,
  bunker_description TEXT NOT NULL,
  bunker_supplies TEXT[] NOT NULL DEFAULT '{}',
  catastrophe_name TEXT NOT NULL,
  catastrophe_description TEXT NOT NULL,
  catastrophe_survival_time TEXT NOT NULL,
  bunker_slots INTEGER NOT NULL DEFAULT 0,
  time_remaining INTEGER NOT NULL DEFAULT 60,
  voting_phase TEXT NOT NULL DEFAULT 'none',
  votes JSONB NOT NULL DEFAULT '{}',
  phase_ends_at TIMESTAMP WITH TIME ZONE,
  turn_has_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  tied_players TEXT[] DEFAULT '{}',
  is_revote BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Создание таблицы players
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  characteristics JSONB NOT NULL,
  revealed_characteristics TEXT[] NOT NULL DEFAULT '{}',
  votes_against INTEGER NOT NULL DEFAULT 0,
  has_voted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Создание таблицы profile_views
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  viewed_player_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Создание индексов
CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players(game_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_game ON public.profile_views(game_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON public.profile_views(game_id, viewed_player_id);

-- 5. Включение RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- 6. Настройка Realtime
ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- 7. Функция обновления timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS update_games_updated_at ON public.games;
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Вспомогательные функции для RLS
CREATE OR REPLACE FUNCTION public.is_player_in_game(_game_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players
    WHERE game_id = _game_id
      AND id = auth.uid()::text
  )
$$;

CREATE OR REPLACE FUNCTION public.is_game_host(_game_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players
    WHERE game_id = _game_id
      AND id = auth.uid()::text
      AND is_host = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_game_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT game_id
  FROM public.players
  WHERE id = auth.uid()::text
  LIMIT 1
$$;

-- 9. Функция голосования
CREATE OR REPLACE FUNCTION public.cast_vote_atomic(
  p_game_id text,
  p_voter_id text, 
  p_target_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_phase text;
  v_has_voted boolean;
  v_is_eliminated boolean;
  v_target_eliminated boolean;
  v_is_revote boolean;
  v_tied_players text[];
BEGIN
  IF p_voter_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Cannot vote as another player';
  END IF;

  SELECT phase, is_revote, tied_players INTO v_game_phase, v_is_revote, v_tied_players
  FROM games WHERE id = p_game_id;

  IF v_game_phase != 'voting' THEN
    RAISE EXCEPTION 'Game is not in voting phase';
  END IF;

  SELECT has_voted, is_eliminated INTO v_has_voted, v_is_eliminated
  FROM players WHERE id = p_voter_id AND game_id = p_game_id;

  IF v_is_eliminated THEN
    RAISE EXCEPTION 'Eliminated players cannot vote';
  END IF;

  IF v_has_voted THEN
    RAISE EXCEPTION 'Player has already voted';
  END IF;

  SELECT is_eliminated INTO v_target_eliminated
  FROM players WHERE id = p_target_id AND game_id = p_game_id;

  IF v_target_eliminated IS NULL THEN
    RAISE EXCEPTION 'Target player not found';
  END IF;

  IF v_target_eliminated THEN
    RAISE EXCEPTION 'Cannot vote for eliminated player';
  END IF;

  IF v_is_revote AND array_length(v_tied_players, 1) > 0 THEN
    IF NOT (p_target_id = ANY(v_tied_players)) THEN
      RAISE EXCEPTION 'In revote, can only vote for tied players';
    END IF;
  END IF;

  UPDATE games
  SET votes = votes || jsonb_build_object(p_voter_id, p_target_id)
  WHERE id = p_game_id
    AND NOT (votes ? p_voter_id);

  UPDATE players
  SET has_voted = true
  WHERE id = p_voter_id AND game_id = p_game_id;

  UPDATE players p
  SET votes_against = (
    SELECT COUNT(*)::int
    FROM jsonb_each_text((SELECT votes FROM games WHERE id = p_game_id)) as v
    WHERE v.value = p.id
  )
  WHERE p.game_id = p_game_id;

  RETURN true;
END;
$$;

-- 10. Функция обновления состояния игры
CREATE OR REPLACE FUNCTION public.update_game_state(
  p_game_id text,
  p_phase text DEFAULT NULL,
  p_current_round int DEFAULT NULL,
  p_current_player_index int DEFAULT NULL,
  p_phase_ends_at timestamptz DEFAULT NULL,
  p_turn_has_revealed boolean DEFAULT NULL,
  p_tied_players text[] DEFAULT NULL,
  p_is_revote boolean DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow any player in the game to update (for next player button)
  IF NOT public.is_player_in_game(p_game_id) THEN
    RAISE EXCEPTION 'Not a player in this game';
  END IF;

  UPDATE games
  SET 
    phase = COALESCE(p_phase, phase),
    current_round = COALESCE(p_current_round, current_round),
    current_player_index = COALESCE(p_current_player_index, current_player_index),
    phase_ends_at = CASE WHEN p_phase_ends_at IS NOT NULL THEN p_phase_ends_at ELSE phase_ends_at END,
    turn_has_revealed = COALESCE(p_turn_has_revealed, turn_has_revealed),
    tied_players = COALESCE(p_tied_players, tied_players),
    is_revote = COALESCE(p_is_revote, is_revote),
    updated_at = now()
  WHERE id = p_game_id;

  RETURN true;
END;
$$;

-- 11. Функция сброса голосов
CREATE OR REPLACE FUNCTION public.reset_votes_atomic(p_game_id text) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_game_host(p_game_id) THEN
    RAISE EXCEPTION 'Only host can reset votes';
  END IF;

  UPDATE games SET votes = '{}' WHERE id = p_game_id;
  UPDATE players SET votes_against = 0, has_voted = false WHERE game_id = p_game_id;

  RETURN true;
END;
$$;

-- 12. Функция исключения игрока
CREATE OR REPLACE FUNCTION public.eliminate_player_atomic(p_player_id text) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id text;
BEGIN
  SELECT game_id INTO v_game_id FROM players WHERE id = p_player_id;

  IF NOT public.is_game_host(v_game_id) THEN
    RAISE EXCEPTION 'Only host can eliminate players';
  END IF;

  UPDATE players SET is_eliminated = true WHERE id = p_player_id;

  RETURN true;
END;
$$;

-- 13. Функция раскрытия характеристики
CREATE OR REPLACE FUNCTION public.reveal_characteristic_atomic(
  p_player_id text,
  p_characteristic text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id text;
  v_current_revealed text[];
BEGIN
  IF p_player_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Can only reveal own characteristics';
  END IF;

  SELECT game_id, revealed_characteristics INTO v_game_id, v_current_revealed
  FROM players WHERE id = p_player_id;

  IF NOT (p_characteristic = ANY(v_current_revealed)) THEN
    UPDATE players
    SET revealed_characteristics = array_append(revealed_characteristics, p_characteristic)
    WHERE id = p_player_id;
  END IF;

  RETURN true;
END;
$$;

-- 14. Функция отметки хода
CREATE OR REPLACE FUNCTION public.mark_turn_revealed(
  p_game_id text,
  p_phase_ends_at timestamptz
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_player_in_game(p_game_id) THEN
    RAISE EXCEPTION 'Not a player in this game';
  END IF;

  UPDATE games
  SET turn_has_revealed = true, phase_ends_at = p_phase_ends_at
  WHERE id = p_game_id;

  RETURN true;
END;
$$;

-- 15. RLS политики для games
DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;
DROP POLICY IF EXISTS "Players can view their games" ON public.games;
DROP POLICY IF EXISTS "Host can update game state" ON public.games;
DROP POLICY IF EXISTS "Host can delete game" ON public.games;

CREATE POLICY "Authenticated users can create games" 
ON public.games FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Players can view their games" 
ON public.games FOR SELECT 
USING (public.is_player_in_game(id));

CREATE POLICY "Host can update game state"
ON public.games FOR UPDATE
USING (public.is_game_host(id))
WITH CHECK (public.is_game_host(id));

CREATE POLICY "Host can delete game" 
ON public.games FOR DELETE 
USING (public.is_game_host(id));

-- 16. RLS политики для players
DROP POLICY IF EXISTS "Users can create their own player" ON public.players;
DROP POLICY IF EXISTS "Players can view players in their game" ON public.players;
DROP POLICY IF EXISTS "Players can update own record" ON public.players;
DROP POLICY IF EXISTS "Host can update players in game" ON public.players;

CREATE POLICY "Users can create their own player" 
ON public.players FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid()::text);

CREATE POLICY "Players can view players in their game" 
ON public.players FOR SELECT 
USING (game_id = public.get_user_game_id());

CREATE POLICY "Players can update own record"
ON public.players FOR UPDATE
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

CREATE POLICY "Host can update players in game"
ON public.players FOR UPDATE
USING (
  game_id IN (
    SELECT game_id FROM public.players
    WHERE id = auth.uid()::text AND is_host = true
  )
);

-- 17. RLS политики для profile_views
DROP POLICY IF EXISTS "Players can record profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Players can read game profile views" ON public.profile_views;

CREATE POLICY "Players can record profile views"
ON public.profile_views FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players
    WHERE players.game_id = profile_views.game_id
    AND players.id = auth.uid()::text
  )
);

CREATE POLICY "Players can read game profile views"
ON public.profile_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players
    WHERE players.game_id = profile_views.game_id
    AND players.id = auth.uid()::text
  )
);

-- 18. Включение Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  END IF;
END $$;

-- ГОТОВО! Теперь включите Anonymous Auth в Supabase:
-- Authentication -> Providers -> Email -> Enable "Allow anonymous sign-ins"
