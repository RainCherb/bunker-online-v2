-- Action Cards Fixes v2
-- 1. Change round_restriction from TEXT to TEXT[] for multiple restrictions
-- 2. Fix shuffle_professions algorithm
-- 3. Add action card slot to revealed_characteristics when used

-- =====================================================
-- Change round_restriction to array
-- =====================================================

-- First, drop the check constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_round_restriction_check;

-- Change column type from TEXT to TEXT[]
ALTER TABLE games ALTER COLUMN round_restriction TYPE TEXT[] USING 
  CASE 
    WHEN round_restriction IS NULL THEN NULL 
    ELSE ARRAY[round_restriction] 
  END;

-- Set default to empty array
ALTER TABLE games ALTER COLUMN round_restriction SET DEFAULT ARRAY[]::TEXT[];

-- =====================================================
-- Update apply_action_card function with fixes
-- =====================================================

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
  v_card_slot TEXT;
  v_target RECORD;
  v_player RECORD;
  v_random_value TEXT;
  v_all_professions TEXT[];
  v_all_baggage TEXT[];
  v_shuffled_professions TEXT[];
  v_shuffled_baggage TEXT[];
  v_alive_players TEXT[];
  v_i INT;
  v_j INT;
  v_temp TEXT;
  v_temp_revealed BOOLEAN;
  v_current_restrictions TEXT[];
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
  v_card_slot := v_pending_action->>'cardId'; -- This is actually the slot: 'actionCard1' or 'actionCard2'
  
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
    
    -- Cards 7, 8, 9: Restrict card reveals for this round (NOW APPEND TO ARRAY)
    WHEN 'restrict_biology' THEN
      v_current_restrictions := COALESCE(v_game.round_restriction, ARRAY[]::TEXT[]);
      IF NOT 'biology' = ANY(v_current_restrictions) THEN
        UPDATE games SET round_restriction = array_append(v_current_restrictions, 'biology') WHERE id = p_game_id;
      END IF;
    WHEN 'restrict_hobby' THEN
      v_current_restrictions := COALESCE(v_game.round_restriction, ARRAY[]::TEXT[]);
      IF NOT 'hobby' = ANY(v_current_restrictions) THEN
        UPDATE games SET round_restriction = array_append(v_current_restrictions, 'hobby') WHERE id = p_game_id;
      END IF;
    WHEN 'restrict_baggage' THEN
      v_current_restrictions := COALESCE(v_game.round_restriction, ARRAY[]::TEXT[]);
      IF NOT 'baggage' = ANY(v_current_restrictions) THEN
        UPDATE games SET round_restriction = array_append(v_current_restrictions, 'baggage') WHERE id = p_game_id;
      END IF;
    
    -- Card 10: Shuffle all professions (FIXED ALGORITHM - Fisher-Yates)
    WHEN 'shuffle_professions' THEN
      -- Get alive players ordered
      SELECT array_agg(id ORDER BY id) INTO v_alive_players FROM players WHERE game_id = p_game_id AND NOT is_eliminated;
      -- Get all professions in same order
      SELECT array_agg(characteristics->>'profession' ORDER BY id) INTO v_all_professions FROM players WHERE id = ANY(v_alive_players);
      
      IF v_alive_players IS NOT NULL AND array_length(v_alive_players, 1) > 1 THEN
        -- Fisher-Yates shuffle
        v_shuffled_professions := v_all_professions;
        FOR v_i IN REVERSE array_length(v_shuffled_professions, 1)..2 LOOP
          v_j := floor(random() * v_i + 1)::INT;
          v_temp := v_shuffled_professions[v_i];
          v_shuffled_professions[v_i] := v_shuffled_professions[v_j];
          v_shuffled_professions[v_j] := v_temp;
        END LOOP;
        -- Reassign
        FOR v_i IN 1..array_length(v_alive_players, 1) LOOP
          UPDATE players SET characteristics = characteristics || jsonb_build_object('profession', v_shuffled_professions[v_i])
          WHERE id = v_alive_players[v_i];
        END LOOP;
      END IF;
    
    -- Card 11: Shuffle revealed baggage only (FIXED ALGORITHM)
    WHEN 'shuffle_baggage' THEN
      -- Get players with revealed baggage ordered
      SELECT array_agg(id ORDER BY id), array_agg(characteristics->>'baggage' ORDER BY id) 
      INTO v_alive_players, v_all_baggage 
      FROM players 
      WHERE game_id = p_game_id AND NOT is_eliminated AND 'baggage' = ANY(revealed_characteristics);
      
      IF v_alive_players IS NOT NULL AND array_length(v_alive_players, 1) > 1 THEN
        -- Fisher-Yates shuffle
        v_shuffled_baggage := v_all_baggage;
        FOR v_i IN REVERSE array_length(v_shuffled_baggage, 1)..2 LOOP
          v_j := floor(random() * v_i + 1)::INT;
          v_temp := v_shuffled_baggage[v_i];
          v_shuffled_baggage[v_i] := v_shuffled_baggage[v_j];
          v_shuffled_baggage[v_j] := v_temp;
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
      -- Mark target's baggage as stolen
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
  
  -- Mark the action card as revealed for the player
  -- v_card_slot is 'actionCard1' or 'actionCard2'
  UPDATE players 
  SET revealed_characteristics = array_append(
    COALESCE(revealed_characteristics, ARRAY[]::TEXT[]), 
    v_card_slot
  )
  WHERE id = v_player_id 
    AND NOT v_card_slot = ANY(COALESCE(revealed_characteristics, ARRAY[]::TEXT[]));
  
  -- Clear pending action
  UPDATE games SET pending_action = NULL WHERE id = p_game_id;
  
  RETURN jsonb_build_object('success', true, 'effect', v_effect);
END;
$$;

-- =====================================================
-- Update clear_round_modifiers to handle array
-- =====================================================

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
  
  -- Clear all round modifiers (round_restriction is now array, set to empty)
  UPDATE games SET
    round_restriction = ARRAY[]::TEXT[],
    double_vote_player_id = NULL,
    cannot_vote_player_id = NULL,
    immunity_player_id = NULL,
    linked_player_id = NULL,
    linked_by_player_id = NULL,
    penalty_next_round_player_id = NULL
  WHERE id = p_game_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION apply_action_card TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clear_round_modifiers TO authenticated, anon;
