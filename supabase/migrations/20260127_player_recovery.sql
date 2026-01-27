-- Create RPC function for player recovery
-- This allows a disconnected player to reclaim their character using a recovery link
-- The function uses SECURITY DEFINER to bypass RLS
-- Security: The recovery link contains the player ID (UUID) which acts as a secret token

CREATE OR REPLACE FUNCTION public.recover_player(
  p_old_player_id TEXT,
  p_game_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_data RECORD;
  v_game_phase TEXT;
  v_new_user_id TEXT;
BEGIN
  -- Get the caller's user ID
  v_new_user_id := auth.uid()::text;
  
  IF v_new_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if game exists and is not over
  SELECT phase INTO v_game_phase
  FROM public.games
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game_phase = 'gameover' THEN
    RAISE EXCEPTION 'Cannot recover player in finished game';
  END IF;

  -- Get the old player data
  SELECT * INTO v_player_data
  FROM public.players
  WHERE id = p_old_player_id
  AND game_id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found in this game';
  END IF;

  -- If the user already has this ID, nothing to do
  IF v_new_user_id = p_old_player_id THEN
    RETURN TRUE;
  END IF;

  -- Check if new user already exists in this game (as a different player)
  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE id = v_new_user_id
    AND game_id = p_game_id
  ) THEN
    RAISE EXCEPTION 'You are already in this game as a different player';
  END IF;

  -- Delete the old player record
  DELETE FROM public.players
  WHERE id = p_old_player_id
  AND game_id = p_game_id;

  -- Insert new player with same data but new ID
  INSERT INTO public.players (
    id,
    game_id,
    name,
    is_host,
    is_eliminated,
    characteristics,
    revealed_characteristics,
    votes_against,
    has_voted,
    created_at
  ) VALUES (
    v_new_user_id,
    p_game_id,
    v_player_data.name,
    v_player_data.is_host,
    v_player_data.is_eliminated,
    v_player_data.characteristics,
    v_player_data.revealed_characteristics,
    v_player_data.votes_against,
    v_player_data.has_voted,
    v_player_data.created_at  -- Preserve original join time for ordering
  );

  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.recover_player(TEXT, TEXT) TO authenticated;
