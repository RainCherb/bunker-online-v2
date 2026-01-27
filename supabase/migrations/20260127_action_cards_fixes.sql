-- Fix action cards issues:
-- 1. Double vote not being counted in cast_vote_atomic
-- 2. Linked elimination (card 19) not handled in eliminate_player_atomic

-- Update cast_vote_atomic to handle double vote
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
  v_double_vote_player_id text;
  v_cannot_vote_player_id text;
  v_immunity_player_id text;
BEGIN
  -- Verify caller is the voter (security check)
  IF p_voter_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Cannot vote as another player';
  END IF;

  -- Get game state including action card modifiers
  SELECT phase, is_revote, tied_players, double_vote_player_id, cannot_vote_player_id, immunity_player_id 
  INTO v_game_phase, v_is_revote, v_tied_players, v_double_vote_player_id, v_cannot_vote_player_id, v_immunity_player_id
  FROM games WHERE id = p_game_id;

  -- Verify game is in voting phase
  IF v_game_phase != 'voting' THEN
    RAISE EXCEPTION 'Game is not in voting phase';
  END IF;

  -- Check if voter is blocked from voting (card 16)
  IF v_cannot_vote_player_id = p_voter_id THEN
    RAISE EXCEPTION 'Player vote is blocked this round';
  END IF;

  -- Check if target has immunity (card 3)
  IF v_immunity_player_id = p_target_id THEN
    RAISE EXCEPTION 'Target player has immunity this round';
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
  -- Accounting for double vote modifier
  UPDATE players p
  SET votes_against = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN v.key = v_double_vote_player_id THEN 2  -- Double vote
        ELSE 1
      END
    ), 0)::int
    FROM jsonb_each_text((SELECT votes FROM games WHERE id = p_game_id)) as v
    WHERE v.value = p.id
  )
  WHERE p.game_id = p_game_id;

  RETURN true;
END;
$$;

-- Update eliminate_player_atomic to handle linked elimination (card 19)
CREATE OR REPLACE FUNCTION public.eliminate_player_atomic(p_player_id text) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id text;
  v_linked_player_id text;
  v_linked_by_player_id text;
BEGIN
  -- Get game ID for this player
  SELECT game_id INTO v_game_id FROM players WHERE id = p_player_id;

  -- Verify caller is host of this game
  IF NOT public.is_game_host(v_game_id) THEN
    RAISE EXCEPTION 'Only host can eliminate players';
  END IF;

  -- Check for linked elimination (card 19)
  SELECT linked_player_id, linked_by_player_id 
  INTO v_linked_player_id, v_linked_by_player_id
  FROM games WHERE id = v_game_id;

  -- Eliminate the main player
  UPDATE players SET is_eliminated = true WHERE id = p_player_id;

  -- If this player was linked BY someone, and that someone is being eliminated,
  -- also eliminate the linked player
  IF v_linked_by_player_id = p_player_id AND v_linked_player_id IS NOT NULL THEN
    UPDATE players SET is_eliminated = true WHERE id = v_linked_player_id;
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permissions (in case they were lost)
GRANT EXECUTE ON FUNCTION cast_vote_atomic TO authenticated, anon;
GRANT EXECUTE ON FUNCTION eliminate_player_atomic TO authenticated, anon;
