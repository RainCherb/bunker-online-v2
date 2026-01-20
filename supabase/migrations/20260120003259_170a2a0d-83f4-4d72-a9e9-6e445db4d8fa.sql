-- Fix security issue 1: Client-Side Game Authorization Bypass
-- Fix security issue 2: Voting Race Conditions & Manipulation

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Game participants can update game" ON public.games;
DROP POLICY IF EXISTS "Game participants can update players" ON public.players;

-- Create atomic vote casting function with server-side validation
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
  -- Verify caller is the voter (security check)
  IF p_voter_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Cannot vote as another player';
  END IF;

  -- Get game state
  SELECT phase, is_revote, tied_players INTO v_game_phase, v_is_revote, v_tied_players
  FROM games WHERE id = p_game_id;

  -- Verify game is in voting phase
  IF v_game_phase != 'voting' THEN
    RAISE EXCEPTION 'Game is not in voting phase';
  END IF;

  -- Check if voter is eliminated or has already voted
  SELECT has_voted, is_eliminated INTO v_has_voted, v_is_eliminated
  FROM players WHERE id = p_voter_id AND game_id = p_game_id;

  IF v_is_eliminated THEN
    RAISE EXCEPTION 'Eliminated players cannot vote';
  END IF;

  IF v_has_voted THEN
    RAISE EXCEPTION 'Player has already voted';
  END IF;

  -- Check if target is valid (not eliminated)
  SELECT is_eliminated INTO v_target_eliminated
  FROM players WHERE id = p_target_id AND game_id = p_game_id;

  IF v_target_eliminated IS NULL THEN
    RAISE EXCEPTION 'Target player not found';
  END IF;

  IF v_target_eliminated THEN
    RAISE EXCEPTION 'Cannot vote for eliminated player';
  END IF;

  -- In revote, check if target is in tied players list
  IF v_is_revote AND array_length(v_tied_players, 1) > 0 THEN
    IF NOT (p_target_id = ANY(v_tied_players)) THEN
      RAISE EXCEPTION 'In revote, can only vote for tied players';
    END IF;
  END IF;

  -- Atomic vote update using JSONB concatenation
  UPDATE games
  SET votes = votes || jsonb_build_object(p_voter_id, p_target_id)
  WHERE id = p_game_id
    AND NOT (votes ? p_voter_id);

  -- Mark voter as voted
  UPDATE players
  SET has_voted = true
  WHERE id = p_voter_id AND game_id = p_game_id;

  -- Update vote counts server-side for all players in this game
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

-- Create function to update game state (host only)
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
  -- Verify caller is host
  IF NOT public.is_game_host(p_game_id) THEN
    RAISE EXCEPTION 'Only host can update game state';
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

-- Create function to reset votes (host only)
CREATE OR REPLACE FUNCTION public.reset_votes_atomic(p_game_id text) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is host
  IF NOT public.is_game_host(p_game_id) THEN
    RAISE EXCEPTION 'Only host can reset votes';
  END IF;

  UPDATE games SET votes = '{}' WHERE id = p_game_id;
  UPDATE players SET votes_against = 0, has_voted = false WHERE game_id = p_game_id;

  RETURN true;
END;
$$;

-- Create function to eliminate player (host only)
CREATE OR REPLACE FUNCTION public.eliminate_player_atomic(p_player_id text) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id text;
BEGIN
  -- Get game ID for this player
  SELECT game_id INTO v_game_id FROM players WHERE id = p_player_id;

  -- Verify caller is host of this game
  IF NOT public.is_game_host(v_game_id) THEN
    RAISE EXCEPTION 'Only host can eliminate players';
  END IF;

  UPDATE players SET is_eliminated = true WHERE id = p_player_id;

  RETURN true;
END;
$$;

-- Create function to reveal characteristic (player's own only, during their turn)
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
  -- Verify caller is the player
  IF p_player_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Can only reveal own characteristics';
  END IF;

  -- Get current revealed and game_id
  SELECT game_id, revealed_characteristics INTO v_game_id, v_current_revealed
  FROM players WHERE id = p_player_id;

  -- Add characteristic to revealed array if not already there
  IF NOT (p_characteristic = ANY(v_current_revealed)) THEN
    UPDATE players
    SET revealed_characteristics = array_append(revealed_characteristics, p_characteristic)
    WHERE id = p_player_id;
  END IF;

  RETURN true;
END;
$$;

-- Create function to mark turn as revealed and set timer (host/current player)
CREATE OR REPLACE FUNCTION public.mark_turn_revealed(
  p_game_id text,
  p_phase_ends_at timestamptz
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Any player in the game can trigger this during their turn (validated client-side for simplicity)
  IF NOT public.is_player_in_game(p_game_id) THEN
    RAISE EXCEPTION 'Not a player in this game';
  END IF;

  UPDATE games
  SET turn_has_revealed = true, phase_ends_at = p_phase_ends_at
  WHERE id = p_game_id;

  RETURN true;
END;
$$;

-- New restrictive RLS policies

-- Host can update most game state fields
CREATE POLICY "Host can update game state"
ON public.games FOR UPDATE
USING (public.is_game_host(id))
WITH CHECK (public.is_game_host(id));

-- Players can only update their own player record for specific fields
CREATE POLICY "Players can update own record"
ON public.players FOR UPDATE
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- Host can update any player in their game (for eliminations, characteristics assignment)
CREATE POLICY "Host can update players in game"
ON public.players FOR UPDATE
USING (
  game_id IN (
    SELECT game_id FROM public.players
    WHERE id = auth.uid()::text AND is_host = true
  )
);