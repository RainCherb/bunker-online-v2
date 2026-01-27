-- Action Cards System Migration
-- Adds support for action cards with effects, cancellation, and target selection

-- =====================================================
-- Add new columns to games table
-- =====================================================

-- Pending action state (when a card is being activated, waiting for cancel window)
ALTER TABLE games ADD COLUMN IF NOT EXISTS pending_action JSONB DEFAULT NULL;

-- Round restrictions (cards 7, 8, 9 - restrict what cards can be revealed)
ALTER TABLE games ADD COLUMN IF NOT EXISTS round_restriction TEXT DEFAULT NULL CHECK (round_restriction IN ('biology', 'hobby', 'baggage', NULL));

-- Voting modifiers (player IDs are TEXT in this schema)
ALTER TABLE games ADD COLUMN IF NOT EXISTS double_vote_player_id TEXT DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS cannot_vote_player_id TEXT DEFAULT NULL;

-- Immunity from elimination (card 3)
ALTER TABLE games ADD COLUMN IF NOT EXISTS immunity_player_id TEXT DEFAULT NULL;

-- Linked elimination (card 19) - if linked_by player is eliminated, linked player is too
ALTER TABLE games ADD COLUMN IF NOT EXISTS linked_player_id TEXT DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS linked_by_player_id TEXT DEFAULT NULL;

-- Penalty for next round (card 1)
ALTER TABLE games ADD COLUMN IF NOT EXISTS penalty_next_round_player_id TEXT DEFAULT NULL;

-- =====================================================
-- Add new columns to players table  
-- =====================================================

-- Used action cards (array of card slot names: 'actionCard1' or 'actionCard2')
ALTER TABLE players ADD COLUMN IF NOT EXISTS used_action_cards TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Extra characteristics from action cards
ALTER TABLE players ADD COLUMN IF NOT EXISTS extra_baggage TEXT DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS extra_profession TEXT DEFAULT NULL;

-- Stolen baggage tracking
ALTER TABLE players ADD COLUMN IF NOT EXISTS stolen_baggage_from TEXT DEFAULT NULL;

-- =====================================================
-- RPC Functions for Action Cards
-- =====================================================

-- Activate an action card (start the 4-second cancel window)
CREATE OR REPLACE FUNCTION activate_action_card(
  p_game_id TEXT,
  p_player_id TEXT,
  p_card_slot TEXT, -- 'actionCard1' or 'actionCard2'
  p_card_id TEXT,
  p_card_name TEXT,
  p_card_description TEXT,
  p_effect TEXT,
  p_requires_target BOOLEAN,
  p_target_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player RECORD;
  v_game RECORD;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_pending_action JSONB;
BEGIN
  -- Verify player exists and belongs to game
  SELECT * INTO v_player FROM players WHERE id = p_player_id AND game_id = p_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Verify game exists
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check if player already used this card
  IF p_card_slot = ANY(v_player.used_action_cards) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card already used');
  END IF;
  
  -- Check if another action is pending
  IF v_game.pending_action IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Another action is pending');
  END IF;
  
  -- Check if game is in voting phase (cards cannot be used during voting)
  IF v_game.phase = 'voting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use cards during voting');
  END IF;
  
  -- Set expires_at to 4 seconds from now
  v_expires_at := NOW() + INTERVAL '4 seconds';
  
  -- Build pending action object
  v_pending_action := jsonb_build_object(
    'cardId', p_card_slot,
    'cardName', p_card_name,
    'cardDescription', p_card_description,
    'playerId', p_player_id,
    'playerName', v_player.name,
    'effect', p_effect,
    'requiresTarget', p_requires_target,
    'targetType', p_target_type,
    'targetId', NULL,
    'expiresAt', v_expires_at,
    'isCancelled', false,
    'cancelledByPlayerId', NULL
  );
  
  -- Mark card as used
  UPDATE players 
  SET used_action_cards = array_append(used_action_cards, p_card_slot)
  WHERE id = p_player_id;
  
  -- Set pending action on game
  UPDATE games 
  SET pending_action = v_pending_action
  WHERE id = p_game_id;
  
  RETURN jsonb_build_object('success', true, 'expiresAt', v_expires_at);
END;
$$;

-- Cancel a pending action (only players with cancel cards can do this)
CREATE OR REPLACE FUNCTION cancel_action_card(
  p_game_id TEXT,
  p_canceller_id TEXT,
  p_cancel_card_slot TEXT -- 'actionCard1' or 'actionCard2' 
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_canceller RECORD;
  v_pending_action JSONB;
BEGIN
  -- Get game with pending action
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check if there's a pending action
  IF v_game.pending_action IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending action');
  END IF;
  
  -- Check if cancel window has expired
  IF (v_game.pending_action->>'expiresAt')::TIMESTAMP WITH TIME ZONE < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancel window expired');
  END IF;
  
  -- Verify canceller exists and hasn't used their cancel card
  SELECT * INTO v_canceller FROM players WHERE id = p_canceller_id AND game_id = p_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Check if canceller already used this card slot
  IF p_cancel_card_slot = ANY(v_canceller.used_action_cards) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancel card already used');
  END IF;
  
  -- Cannot cancel your own card
  IF (v_game.pending_action->>'playerId') = p_canceller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel your own card');
  END IF;
  
  -- Mark cancel card as used
  UPDATE players 
  SET used_action_cards = array_append(used_action_cards, p_cancel_card_slot)
  WHERE id = p_canceller_id;
  
  -- Update pending action to cancelled state
  v_pending_action := v_game.pending_action || jsonb_build_object(
    'isCancelled', true,
    'cancelledByPlayerId', p_canceller_id
  );
  
  UPDATE games 
  SET pending_action = v_pending_action
  WHERE id = p_game_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Apply an action card effect (called after cancel window expires if not cancelled)
CREATE OR REPLACE FUNCTION apply_action_card(
  p_game_id TEXT,
  p_target_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_pending_action JSONB;
  v_effect TEXT;
  v_player_id TEXT;
  v_target RECORD;
  v_player RECORD;
  v_random_value TEXT;
  v_all_professions TEXT[];
  v_all_baggage TEXT[];
  v_shuffled_professions TEXT[];
  v_shuffled_baggage TEXT[];
  v_alive_players TEXT[];
  v_i INT;
  v_temp TEXT;
  v_temp_revealed BOOLEAN;
BEGIN
  -- Get game
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  v_pending_action := v_game.pending_action;
  
  IF v_pending_action IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending action');
  END IF;
  
  -- Check if cancelled
  IF (v_pending_action->>'isCancelled')::BOOLEAN THEN
    -- Clear pending action and return
    UPDATE games SET pending_action = NULL WHERE id = p_game_id;
    RETURN jsonb_build_object('success', true, 'cancelled', true);
  END IF;
  
  v_effect := v_pending_action->>'effect';
  v_player_id := v_pending_action->>'playerId';
  
  -- Get player record
  SELECT * INTO v_player FROM players WHERE id = v_player_id;
  
  -- Get target if provided
  IF p_target_id IS NOT NULL THEN
    SELECT * INTO v_target FROM players WHERE id = p_target_id;
  END IF;
  
  -- Apply effect based on type
  CASE v_effect
    -- Card 1: Double vote with penalty
    WHEN 'double_vote_with_penalty' THEN
      UPDATE games SET 
        double_vote_player_id = v_player_id,
        penalty_next_round_player_id = v_player_id
      WHERE id = p_game_id;
    
    -- Card 2: New profession from deck
    WHEN 'new_profession' THEN
      -- Generate random profession (simplified - in practice would check for duplicates)
      v_random_value := (SELECT profession FROM (
        SELECT unnest(ARRAY['Врач-хирург', 'Программист', 'Военный офицер', 'Фермер', 'Психолог', 
          'Инженер-механик', 'Учитель', 'Шеф-повар', 'Архитектор', 'Медсестра']) AS profession
      ) t ORDER BY RANDOM() LIMIT 1);
      UPDATE players SET characteristics = characteristics || jsonb_build_object('profession', v_random_value)
      WHERE id = v_player_id;
    
    -- Card 3: Give immunity to another player
    WHEN 'give_immunity' THEN
      UPDATE games SET immunity_player_id = p_target_id WHERE id = p_game_id;
    
    -- Card 4: New health from deck
    WHEN 'new_health' THEN
      v_random_value := (SELECT health FROM (
        SELECT unnest(ARRAY['Полностью здоров', 'Идеальное здоровье (Иммунитет)', 
          'Универсальный донор', 'Высокий болевой порог', 'Сильная выносливость']) AS health
      ) t ORDER BY RANDOM() LIMIT 1);
      UPDATE players SET characteristics = characteristics || jsonb_build_object('health', v_random_value)
      WHERE id = COALESCE(p_target_id, v_player_id);
    
    -- Card 5: New phobia from deck
    WHEN 'new_phobia' THEN
      v_random_value := (SELECT phobia FROM (
        SELECT unnest(ARRAY['Клаустрофобия (боязнь замкнутых пространств)', 
          'Агорафобия (боязнь открытых пространств)', 'Социофобия (боязнь социальных взаимодействий)',
          'Никтофобия (боязнь темноты)', 'Арахнофобия (боязнь пауков)']) AS phobia
      ) t ORDER BY RANDOM() LIMIT 1);
      UPDATE players SET characteristics = characteristics || jsonb_build_object('phobia', v_random_value)
      WHERE id = COALESCE(p_target_id, v_player_id);
    
    -- Cards 7, 8, 9: Restrict card reveals for this round
    WHEN 'restrict_biology' THEN
      UPDATE games SET round_restriction = 'biology' WHERE id = p_game_id;
    WHEN 'restrict_hobby' THEN
      UPDATE games SET round_restriction = 'hobby' WHERE id = p_game_id;
    WHEN 'restrict_baggage' THEN
      UPDATE games SET round_restriction = 'baggage' WHERE id = p_game_id;
    
    -- Card 10: Shuffle all professions
    WHEN 'shuffle_professions' THEN
      -- Get alive players
      SELECT array_agg(id) INTO v_alive_players FROM players WHERE game_id = p_game_id AND NOT is_eliminated;
      -- Get all professions
      SELECT array_agg(characteristics->>'profession') INTO v_all_professions FROM players WHERE id = ANY(v_alive_players);
      -- Shuffle (simple random reassignment)
      v_shuffled_professions := v_all_professions;
      FOR v_i IN 1..array_length(v_shuffled_professions, 1) LOOP
        v_temp := v_shuffled_professions[v_i];
        v_shuffled_professions[v_i] := v_shuffled_professions[(RANDOM() * (array_length(v_shuffled_professions, 1) - 1) + 1)::INT];
        v_shuffled_professions[(RANDOM() * (array_length(v_shuffled_professions, 1) - 1) + 1)::INT] := v_temp;
      END LOOP;
      -- Reassign
      FOR v_i IN 1..array_length(v_alive_players, 1) LOOP
        UPDATE players SET characteristics = characteristics || jsonb_build_object('profession', v_shuffled_professions[v_i])
        WHERE id = v_alive_players[v_i];
      END LOOP;
    
    -- Card 11: Shuffle revealed baggage only
    WHEN 'shuffle_baggage' THEN
      -- Get players with revealed baggage
      SELECT array_agg(id), array_agg(characteristics->>'baggage') 
      INTO v_alive_players, v_all_baggage 
      FROM players 
      WHERE game_id = p_game_id AND NOT is_eliminated AND 'baggage' = ANY(revealed_characteristics);
      
      IF v_alive_players IS NOT NULL AND array_length(v_alive_players, 1) > 1 THEN
        v_shuffled_baggage := v_all_baggage;
        FOR v_i IN 1..array_length(v_shuffled_baggage, 1) LOOP
          v_temp := v_shuffled_baggage[v_i];
          v_shuffled_baggage[v_i] := v_shuffled_baggage[(RANDOM() * (array_length(v_shuffled_baggage, 1) - 1) + 1)::INT];
          v_shuffled_baggage[(RANDOM() * (array_length(v_shuffled_baggage, 1) - 1) + 1)::INT] := v_temp;
        END LOOP;
        FOR v_i IN 1..array_length(v_alive_players, 1) LOOP
          UPDATE players SET characteristics = characteristics || jsonb_build_object('baggage', v_shuffled_baggage[v_i])
          WHERE id = v_alive_players[v_i];
        END LOOP;
      END IF;
    
    -- Card 12: Extra baggage
    WHEN 'extra_baggage' THEN
      v_random_value := (SELECT baggage FROM (
        SELECT unnest(ARRAY['Охотничий нож', 'Аптечка', 'Канистра бензина', 'Веревка', 'Фонарик']) AS baggage
      ) t ORDER BY RANDOM() LIMIT 1);
      UPDATE players SET extra_baggage = v_random_value WHERE id = v_player_id;
    
    -- Card 13: Extra profession
    WHEN 'extra_profession' THEN
      v_random_value := (SELECT profession FROM (
        SELECT unnest(ARRAY['Врач-хирург', 'Программист', 'Военный офицер', 'Фермер', 'Психолог']) AS profession
      ) t ORDER BY RANDOM() LIMIT 1);
      UPDATE players SET extra_profession = v_random_value WHERE id = v_player_id;
    
    -- Card 15: Give double vote to another player
    WHEN 'give_double_vote' THEN
      UPDATE games SET double_vote_player_id = p_target_id WHERE id = p_game_id;
    
    -- Card 16: Block player's vote
    WHEN 'block_vote' THEN
      UPDATE games SET cannot_vote_player_id = p_target_id WHERE id = p_game_id;
    
    -- Card 17: Steal baggage
    WHEN 'steal_baggage' THEN
      -- Get target's baggage
      SELECT characteristics->>'baggage' INTO v_random_value FROM players WHERE id = p_target_id;
      -- Give it to the player
      UPDATE players SET 
        characteristics = characteristics || jsonb_build_object('baggage', v_random_value),
        stolen_baggage_from = p_target_id
      WHERE id = v_player_id;
      -- Remove from target
      UPDATE players SET characteristics = characteristics || jsonb_build_object('baggage', 'Украдено!')
      WHERE id = p_target_id;
    
    -- Card 18: Revive eliminated player
    WHEN 'revive_player' THEN
      UPDATE players SET is_eliminated = false WHERE id = p_target_id;
    
    -- Card 19: Link elimination
    WHEN 'link_elimination' THEN
      UPDATE games SET 
        linked_player_id = p_target_id,
        linked_by_player_id = v_player_id
      WHERE id = p_game_id;
    
    -- Card 20: Swap biology
    WHEN 'swap_biology' THEN
      -- Get both biologies
      SELECT characteristics->>'biology' INTO v_random_value FROM players WHERE id = v_player_id;
      SELECT characteristics->>'biology' INTO v_temp FROM players WHERE id = p_target_id;
      -- Swap
      UPDATE players SET characteristics = characteristics || jsonb_build_object('biology', v_temp)
      WHERE id = v_player_id;
      UPDATE players SET characteristics = characteristics || jsonb_build_object('biology', v_random_value)
      WHERE id = p_target_id;
    
    -- Cards 21, 22: Cancel (handled separately)
    WHEN 'cancel' THEN
      -- This should never be applied directly - it's used in cancel_action_card
      NULL;
    
    -- Card 23: Set perfect health
    WHEN 'set_perfect_health' THEN
      UPDATE players SET characteristics = characteristics || jsonb_build_object('health', 'Идеально здоров')
      WHERE id = p_target_id;
    
    -- Card 24: Random baggage from deck
    WHEN 'random_baggage' THEN
      v_random_value := (SELECT baggage FROM (
        SELECT unnest(ARRAY['Охотничий нож', 'Аптечка', 'Канистра бензина', 'Веревка', 'Фонарик',
          'Противогаз', 'Спальный мешок', 'Топор', 'Бинокль', 'Рация']) AS baggage
      ) t ORDER BY RANDOM() LIMIT 1);
      UPDATE players SET characteristics = characteristics || jsonb_build_object('baggage', v_random_value)
      WHERE id = v_player_id;
    
    -- Card 25: Force revote
    WHEN 'force_revote' THEN
      -- Reset votes and go back to voting phase
      UPDATE players SET has_voted = false, votes_against = 0 WHERE game_id = p_game_id;
      UPDATE games SET votes = '{}', phase = 'voting' WHERE id = p_game_id;
    
    -- Card 26: Remove phobia
    WHEN 'remove_phobia' THEN
      UPDATE players SET characteristics = characteristics || jsonb_build_object('phobia', 'Нет фобии')
      WHERE id = p_target_id;
    
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown effect: ' || v_effect);
  END CASE;
  
  -- Clear pending action
  UPDATE games SET pending_action = NULL WHERE id = p_game_id;
  
  RETURN jsonb_build_object('success', true, 'effect', v_effect);
END;
$$;

-- Clear round-specific modifiers (call at start of each round)
CREATE OR REPLACE FUNCTION clear_round_modifiers(p_game_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_penalty_player TEXT;
BEGIN
  -- Get penalty player before clearing
  SELECT penalty_next_round_player_id INTO v_penalty_player FROM games WHERE id = p_game_id;
  
  -- Apply penalty vote if exists
  IF v_penalty_player IS NOT NULL THEN
    UPDATE players SET votes_against = votes_against + 1 WHERE id = v_penalty_player;
  END IF;
  
  -- Clear all round modifiers
  UPDATE games SET
    round_restriction = NULL,
    double_vote_player_id = NULL,
    cannot_vote_player_id = NULL,
    immunity_player_id = NULL,
    linked_player_id = NULL,
    linked_by_player_id = NULL,
    penalty_next_round_player_id = NULL
  WHERE id = p_game_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_action_card TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cancel_action_card TO authenticated, anon;
GRANT EXECUTE ON FUNCTION apply_action_card TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clear_round_modifiers TO authenticated, anon;
