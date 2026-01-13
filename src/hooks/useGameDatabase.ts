import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, Player, Characteristics, BunkerDB, CatastropheDB } from '@/types/game';
import { 
  generateRandomCharacteristics, 
  getRandomBunker, 
  getRandomCatastrophe, 
  calculateBunkerSlots 
} from '@/data/gameData';

const generateGameId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const generatePlayerId = () => Math.random().toString(36).substring(2, 12);

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
  survivalTime: cat.severity === 'critical' ? 'До 1 года' : cat.severity === 'severe' ? 'До 2 лет' : 'До 5 лет',
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
});

export function useGameDatabase() {
  // Create a new game
  const createGame = useCallback(async (hostName: string): Promise<{ gameId: string; playerId: string } | null> => {
    const gameId = generateGameId();
    const playerId = generatePlayerId();
    const bunker = bunkerToDBFormat(getRandomBunker());
    const catastrophe = catastropheToDBFormat(getRandomCatastrophe());
    const characteristics = generateRandomCharacteristics();

    // Insert game
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
      });

    if (gameError) {
      console.error('Error creating game:', gameError);
      return null;
    }

    // Insert host player
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        game_id: gameId,
        name: hostName,
        is_host: true,
        is_eliminated: false,
        characteristics: characteristics as any,
        revealed_characteristics: [],
        votes_against: 0,
        has_voted: false,
      });

    if (playerError) {
      console.error('Error creating player:', playerError);
      return null;
    }

    return { gameId, playerId };
  }, []);

  // Join an existing game
  const joinGame = useCallback(async (gameId: string, playerName: string): Promise<{ playerId: string } | null> => {
    // Check if game exists and is in lobby phase
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.error('Game not found:', gameError);
      return null;
    }

    if (game.phase !== 'lobby') {
      console.error('Game already started');
      return null;
    }

    // Check player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    if (count && count >= 15) {
      console.error('Game is full');
      return null;
    }

    const playerId = generatePlayerId();
    const characteristics = generateRandomCharacteristics();

    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        game_id: gameId,
        name: playerName,
        is_host: false,
        is_eliminated: false,
        characteristics: characteristics as any,
        revealed_characteristics: [],
        votes_against: 0,
        has_voted: false,
      });

    if (playerError) {
      console.error('Error joining game:', playerError);
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

  // Start game
  const startGame = useCallback(async (gameId: string): Promise<boolean> => {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', gameId);

    if (!players || players.length < 6) {
      return false;
    }

    const bunkerSlots = calculateBunkerSlots(players.length);

    // Update game phase
    const { error: gameError } = await supabase
      .from('games')
      .update({
        phase: 'introduction',
        current_round: 1,
        bunker_slots: bunkerSlots,
      })
      .eq('id', gameId);

    if (gameError) {
      console.error('Error starting game:', gameError);
      return false;
    }

    // Reveal profession for all players
    const { error: playersError } = await supabase
      .from('players')
      .update({
        revealed_characteristics: ['profession'],
      })
      .eq('game_id', gameId);

    if (playersError) {
      console.error('Error updating players:', playersError);
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
