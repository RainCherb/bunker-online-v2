import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, Player, Characteristics, BunkerDB, CatastropheDB } from '@/types/game';
import { 
  generateRandomCharacteristics,
  generateUniqueCharacteristicsForPlayers,
  getRandomBunker, 
  getRandomCatastrophe, 
  calculateBunkerSlots,
  loadCustomCardsFromSupabase
} from '@/data/gameData';
import { z } from 'zod';

// Validation schemas for input sanitization
const playerNameSchema = z.string()
  .min(1, 'Имя не может быть пустым')
  .max(50, 'Имя слишком длинное')
  .regex(/^[\p{L}\p{N}\s\-_.]+$/u, 'Имя содержит недопустимые символы');

const gameCodeSchema = z.string()
  .length(6, 'Код игры должен быть 6 символов')
  .regex(/^[A-Z0-9]{6}$/, 'Неверный формат кода игры');

// Use crypto for secure random ID generation
const generateGameId = () => {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(36)).join('').toUpperCase().slice(0, 6);
};

// Convert original Bunker to DB format
const bunkerToDBFormat = (bunker: ReturnType<typeof getRandomBunker>): BunkerDB => ({
  name: bunker.name,
  description: `${bunker.location}, ${bunker.size}, на ${bunker.stayDuration}. ${bunker.foodSupply}`,
  supplies: bunker.items,
});

// Convert original Catastrophe to DB format  
const catastropheToDBFormat = (cat: ReturnType<typeof getRandomCatastrophe>): CatastropheDB => ({
  name: cat.name,
  description: cat.description,
  survivalTime: cat.survivalCondition,
});

// Transform database row to Player type
const dbPlayerToPlayer = (row: any): Player => ({
  id: row.id,
  name: row.name,
  isHost: row.is_host,
  isEliminated: row.is_eliminated,
  characteristics: row.characteristics as Characteristics,
  revealedCharacteristics: row.revealed_characteristics || [],
  votesAgainst: row.votes_against,
  hasVoted: row.has_voted,
});

// Transform database row to GameState type
const dbGameToGameState = (gameRow: any, playerRows: any[]): GameState => ({
  id: gameRow.id,
  phase: gameRow.phase,
  currentRound: gameRow.current_round,
  maxRounds: gameRow.max_rounds,
  currentPlayerIndex: gameRow.current_player_index,
  players: playerRows.map(dbPlayerToPlayer),
  bunker: {
    name: gameRow.bunker_name,
    description: gameRow.bunker_description,
    supplies: gameRow.bunker_supplies,
  },
  catastrophe: {
    name: gameRow.catastrophe_name,
    description: gameRow.catastrophe_description,
    survivalTime: gameRow.catastrophe_survival_time,
  },
  bunkerSlots: gameRow.bunker_slots,
  timeRemaining: gameRow.time_remaining,
  votingPhase: gameRow.voting_phase,
  votes: gameRow.votes || {},
  tiedPlayers: gameRow.tied_players || [],
  isRevote: gameRow.is_revote || false,
});

export function useGameDatabase() {
  // Create a new game - now requires userId from anonymous auth
  const createGame = useCallback(async (hostName: string, userId: string): Promise<{ gameId: string; playerId: string } | null> => {
    // Validate input
    const nameResult = playerNameSchema.safeParse(hostName);
    if (!nameResult.success) {
      if (import.meta.env.DEV) {
        console.error('Invalid player name:', nameResult.error.message);
      }
      return null;
    }
    const validatedName = nameResult.data;

    const gameId = generateGameId();
    const playerId = userId; // Use auth.uid() as player ID for RLS
    const bunker = bunkerToDBFormat(getRandomBunker());
    const catastrophe = catastropheToDBFormat(getRandomCatastrophe());
    const characteristics = generateRandomCharacteristics();

    // Insert game first
    if (import.meta.env.DEV) console.log('[DB] Inserting game:', gameId);
    const { error: gameError } = await supabase
      .from('games')
      .insert({
        id: gameId,
        phase: 'lobby',
        current_round: 0,
        max_rounds: 7,
        current_player_index: 0,
        bunker_name: bunker.name,
        bunker_description: bunker.description,
        bunker_supplies: bunker.supplies,
        catastrophe_name: catastrophe.name,
        catastrophe_description: catastrophe.description,
        catastrophe_survival_time: catastrophe.survivalTime,
        bunker_slots: 0,
        time_remaining: 60,
        voting_phase: 'none',
        votes: {},
        phase_ends_at: null,
        turn_has_revealed: false,
      });

    if (gameError) {
      if (import.meta.env.DEV) console.error('[DB] Error creating game:', gameError.message, gameError.code);
      return null;
    }
    if (import.meta.env.DEV) console.log('[DB] Game created successfully');

    // Insert host player with auth.uid() as ID
    if (import.meta.env.DEV) console.log('[DB] Inserting player:', playerId);
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        game_id: gameId,
        name: validatedName,
        is_host: true,
        is_eliminated: false,
        characteristics: characteristics as any,
        revealed_characteristics: [],
        votes_against: 0,
        has_voted: false,
      });

    if (playerError) {
      if (import.meta.env.DEV) console.error('[DB] Error creating player:', playerError.message, playerError.code);
      // Try to clean up the game
      await supabase.from('games').delete().eq('id', gameId);
      return null;
    }
    if (import.meta.env.DEV) console.log('[DB] Player created successfully');

    return { gameId, playerId };
  }, []);

  // Join an existing game - now requires userId from anonymous auth
  const joinGame = useCallback(async (gameId: string, playerName: string, userId: string): Promise<{ playerId: string } | null> => {
    // Validate inputs
    const nameResult = playerNameSchema.safeParse(playerName);
    if (!nameResult.success) {
      if (import.meta.env.DEV) {
        console.error('Invalid player name:', nameResult.error.message);
      }
      return null;
    }
    const validatedName = nameResult.data;

    const codeResult = gameCodeSchema.safeParse(gameId);
    if (!codeResult.success) {
      if (import.meta.env.DEV) {
        console.error('Invalid game code:', codeResult.error.message);
      }
      return null;
    }
    const validatedGameId = codeResult.data;

    const playerId = userId; // Use auth.uid() as player ID for RLS
    
    // Check if player already exists in this game (rejoin scenario)
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, game_id')
      .eq('id', playerId)
      .eq('game_id', validatedGameId)
      .single();

    if (existingPlayer) {
      // Player already in this game - allow rejoin
      if (import.meta.env.DEV) console.log('[JoinGame] Player already in game, allowing rejoin');
      return { playerId };
    }
    
    // First, create the player so we can access the game via RLS
    const characteristics = generateRandomCharacteristics();

    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        game_id: validatedGameId,
        name: validatedName,
        is_host: false,
        is_eliminated: false,
        characteristics: characteristics as any,
        revealed_characteristics: [],
        votes_against: 0,
        has_voted: false,
      });

    if (playerError) {
      // Check if it's a unique constraint error (player exists in another game)
      if (playerError.code === '23505') {
        if (import.meta.env.DEV) {
          console.error('Player already exists in another game');
        }
      } else if (import.meta.env.DEV) {
        console.error('Error joining game:', playerError);
      }
      return null;
    }

    // Now verify the game exists and is in lobby phase
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', validatedGameId)
      .single();

    if (gameError || !game) {
      if (import.meta.env.DEV) {
        console.error('Game not found:', gameError);
      }
      // Clean up the player we just created
      await supabase.from('players').delete().eq('id', playerId);
      return null;
    }

    if (game.phase !== 'lobby') {
      if (import.meta.env.DEV) {
        console.error('Game already started');
      }
      // Clean up the player we just created
      await supabase.from('players').delete().eq('id', playerId);
      return null;
    }

    // Check player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', validatedGameId);

    if (count && count > 15) {
      if (import.meta.env.DEV) {
        console.error('Game is full');
      }
      // Clean up the player we just created
      await supabase.from('players').delete().eq('id', playerId);
      return null;
    }

    return { playerId };
  }, []);

  // Fetch game state
  const fetchGameState = useCallback(async (gameId: string): Promise<GameState | null> => {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return null;
    }

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (playersError) {
      return null;
    }

    return dbGameToGameState(game, players || []);
  }, []);

  // Start game - now generates unique characteristics for all players
  const startGame = useCallback(async (gameId: string): Promise<boolean> => {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (!players || players.length < 6) {
      return false;
    }

    const bunkerSlots = calculateBunkerSlots(players.length);

    // Load custom cards from Supabase before generating characteristics
    await loadCustomCardsFromSupabase();

    // Generate unique characteristics for all players
    const allCharacteristics = generateUniqueCharacteristicsForPlayers(players.length);

    // Update each player with their unique characteristics
    for (let i = 0; i < players.length; i++) {
      const { error: playerUpdateError } = await supabase
        .from('players')
        .update({
          characteristics: allCharacteristics[i] as any,
          revealed_characteristics: [],
        })
        .eq('id', players[i].id);

      if (playerUpdateError) {
        if (import.meta.env.DEV) {
          console.error('Error updating player characteristics:', playerUpdateError);
        }
        return false;
      }
    }

    // Update game phase
    const { error: gameError } = await supabase
      .from('games')
      .update({
        phase: 'introduction',
        current_round: 1,
        bunker_slots: bunkerSlots,
        phase_ends_at: null,
        turn_has_revealed: false,
      })
      .eq('id', gameId);

    if (gameError) {
      if (import.meta.env.DEV) {
        console.error('Error starting game:', gameError);
      }
      return false;
    }

    return true;
  }, []);

  // Reveal characteristic using atomic server-side function
  const revealCharacteristic = useCallback(async (playerId: string, characteristic: keyof Characteristics, _currentRevealed: string[]): Promise<boolean> => {
    const { error } = await supabase.rpc('reveal_characteristic_atomic', {
      p_player_id: playerId,
      p_characteristic: characteristic
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error revealing characteristic:', error);
      }
      return false;
    }

    return true;
  }, []);

  // Update game phase
  const updateGamePhase = useCallback(async (gameId: string, updates: Partial<{
    phase: string;
    current_round: number;
    current_player_index: number;
    votes: Record<string, string>;
    phase_ends_at: string | null;
    turn_has_revealed: boolean;
    tied_players: string[];
    is_revote: boolean;
  }>): Promise<boolean> => {
    const { error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId);

    return !error;
  }, []);

  // Cast vote using atomic server-side function
  const castVote = useCallback(async (gameId: string, voterId: string, targetId: string, _currentVotes: Record<string, string>): Promise<boolean> => {
    const { error } = await supabase.rpc('cast_vote_atomic', {
      p_game_id: gameId,
      p_voter_id: voterId,
      p_target_id: targetId
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error casting vote:', error);
      }
      return false;
    }

    return true;
  }, []);

  // Eliminate player using atomic server-side function (host only)
  const eliminatePlayer = useCallback(async (playerId: string): Promise<boolean> => {
    const { error } = await supabase.rpc('eliminate_player_atomic', {
      p_player_id: playerId
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error eliminating player:', error);
      }
      return false;
    }

    return true;
  }, []);

  // Reset votes using atomic server-side function (host only)
  const resetVotes = useCallback(async (gameId: string): Promise<boolean> => {
    const { error } = await supabase.rpc('reset_votes_atomic', {
      p_game_id: gameId
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting votes:', error);
      }
      return false;
    }

    return true;
  }, []);

  // Restart game with same players but new characteristics
  const restartGame = useCallback(async (gameId: string): Promise<boolean> => {
    if (import.meta.env.DEV) {
      console.log('[DB] Restarting game:', gameId);
    }
    
    // Get all players in this game
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (playersError || !players || players.length < 2) {
      if (import.meta.env.DEV) {
        console.error('[DB] Error fetching players for restart:', playersError);
      }
      return false;
    }

    const bunkerSlots = calculateBunkerSlots(players.length);

    // Load custom cards from Supabase
    await loadCustomCardsFromSupabase();

    // Generate new unique characteristics for all players
    const allCharacteristics = generateUniqueCharacteristicsForPlayers(players.length);

    // Generate new bunker and catastrophe
    const bunker = bunkerToDBFormat(getRandomBunker());
    const catastrophe = catastropheToDBFormat(getRandomCatastrophe());

    // Reset all players with new characteristics in parallel
    const playerUpdates = players.map((player, i) =>
      supabase
        .from('players')
        .update({
          characteristics: allCharacteristics[i] as any,
          revealed_characteristics: [],
          is_eliminated: false,
          votes_against: 0,
          has_voted: false,
          // Reset action card fields
          used_action_cards: [],
          extra_baggage: null,
          extra_profession: null,
          stolen_baggage_from: null,
        })
        .eq('id', player.id)
    );

    const playerResults = await Promise.all(playerUpdates);
    const playerError = playerResults.find(r => r.error);
    if (playerError?.error) {
      if (import.meta.env.DEV) {
        console.error('[DB] Error updating player for restart:', playerError.error);
      }
      return false;
    }

    // Reset game state to introduction
    const { error: gameError } = await supabase
      .from('games')
      .update({
        phase: 'introduction',
        current_round: 1,
        current_player_index: 0,
        bunker_slots: bunkerSlots,
        bunker_name: bunker.name,
        bunker_description: bunker.description,
        bunker_supplies: bunker.supplies,
        catastrophe_name: catastrophe.name,
        catastrophe_description: catastrophe.description,
        catastrophe_survival_time: catastrophe.survivalTime,
        votes: {},
        voting_phase: 'none',
        phase_ends_at: null,
        turn_has_revealed: false,
        tied_players: [],
        is_revote: false,
        // Reset action card fields
        pending_action: null,
        round_restriction: null,
        double_vote_player_id: null,
        cannot_vote_player_id: null,
        immunity_player_id: null,
        linked_player_id: null,
        linked_by_player_id: null,
        penalty_next_round_player_id: null,
      })
      .eq('id', gameId);

    if (gameError) {
      if (import.meta.env.DEV) {
        console.error('[DB] Error resetting game state:', gameError);
      }
      return false;
    }

    // Clear profile views for this game
    await supabase
      .from('profile_views')
      .delete()
      .eq('game_id', gameId);

    if (import.meta.env.DEV) {
      console.log('[DB] Game restarted successfully');
    }
    return true;
  }, []);

  return {
    createGame,
    joinGame,
    fetchGameState,
    startGame,
    restartGame,
    revealCharacteristic,
    updateGamePhase,
    castVote,
    eliminatePlayer,
    resetVotes,
  };
}
