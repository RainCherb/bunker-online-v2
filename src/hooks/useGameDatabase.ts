import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, Player, Characteristics, BunkerDB, CatastropheDB } from '@/types/game';
import { 
  generateRandomCharacteristics,
  generateUniqueCharacteristicsForPlayers,
  getRandomBunker, 
  getRandomCatastrophe, 
  calculateBunkerSlots 
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
      if (import.meta.env.DEV) {
        console.error('Error creating game:', gameError);
      }
      return null;
    }

    // Insert host player with auth.uid() as ID
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
      if (import.meta.env.DEV) {
        console.error('Error creating player:', playerError);
      }
      // Try to clean up the game
      await supabase.from('games').delete().eq('id', gameId);
      return null;
    }

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
      if (import.meta.env.DEV) {
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

  // Reveal characteristic
  const revealCharacteristic = useCallback(async (playerId: string, characteristic: keyof Characteristics, currentRevealed: string[]): Promise<boolean> => {
    const newRevealed = [...new Set([...currentRevealed, characteristic])];

    const { error } = await supabase
      .from('players')
      .update({
        revealed_characteristics: newRevealed,
      })
      .eq('id', playerId);

    return !error;
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

  // Cast vote
  const castVote = useCallback(async (gameId: string, voterId: string, targetId: string, currentVotes: Record<string, string>): Promise<boolean> => {
    const newVotes = { ...currentVotes, [voterId]: targetId };

    // Update game votes
    const { error: voteError } = await supabase
      .from('games')
      .update({ votes: newVotes })
      .eq('id', gameId);

    if (voteError) return false;

    // Mark voter as voted
    const { error: voterError } = await supabase
      .from('players')
      .update({ has_voted: true })
      .eq('id', voterId);

    if (voterError) return false;

    // Update vote counts for all players
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', gameId);

    if (players) {
      for (const player of players) {
        const votesAgainst = Object.values(newVotes).filter(v => v === player.id).length;
        await supabase
          .from('players')
          .update({ votes_against: votesAgainst })
          .eq('id', player.id);
      }
    }

    return true;
  }, []);

  // Eliminate player
  const eliminatePlayer = useCallback(async (playerId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('players')
      .update({ is_eliminated: true })
      .eq('id', playerId);

    return !error;
  }, []);

  // Reset votes for new round
  const resetVotes = useCallback(async (gameId: string): Promise<boolean> => {
    const { error: gameError } = await supabase
      .from('games')
      .update({ votes: {} })
      .eq('id', gameId);

    if (gameError) return false;

    const { error: playersError } = await supabase
      .from('players')
      .update({ votes_against: 0, has_voted: false })
      .eq('game_id', gameId);

    return !playersError;
  }, []);

  return {
    createGame,
    joinGame,
    fetchGameState,
    startGame,
    revealCharacteristic,
    updateGamePhase,
    castVote,
    eliminatePlayer,
    resetVotes,
  };
}
