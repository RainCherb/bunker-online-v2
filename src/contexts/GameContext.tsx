import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { GameState, Player, GamePhase, Characteristics, BunkerDB, CatastropheDB } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { useGameDatabase } from '@/hooks/useGameDatabase';

interface GameContextType {
  gameState: GameState | null;
  currentPlayer: Player | null;
  isLoading: boolean;
  createGame: (hostName: string) => Promise<string | null>;
  joinGame: (gameId: string, playerName: string) => Promise<boolean>;
  loadGame: (gameId: string, playerId: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  revealCharacteristic: (playerId: string, characteristic: keyof Characteristics) => Promise<void>;
  nextPhase: () => Promise<void>;
  castVote: (voterId: string, targetId: string) => Promise<void>;
  eliminatePlayer: (playerId: string) => Promise<void>;
  skipVoting: () => Promise<void>;
  setCurrentPlayerId: (playerId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Storage keys
const PLAYER_ID_KEY = 'bunker_player_id';
const GAME_ID_KEY = 'bunker_game_id';

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

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const db = useGameDatabase();

  const currentPlayer = gameState?.players.find(p => p.id === currentPlayerId) || null;

  // Save player/game IDs to localStorage
  const saveSession = useCallback((gameId: string, playerId: string) => {
    localStorage.setItem(GAME_ID_KEY, gameId);
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }, []);

  // Fetch game state from database
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

  // Setup realtime subscription
  const setupRealtimeSubscription = useCallback((gameId: string) => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async () => {
          const state = await fetchGameState(gameId);
          if (state) setGameState(state);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`,
        },
        async () => {
          const state = await fetchGameState(gameId);
          if (state) setGameState(state);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGameState]);

  // Create a new game
  const createGame = useCallback(async (hostName: string): Promise<string | null> => {
    setIsLoading(true);
    const result = await db.createGame(hostName);
    
    if (result) {
      saveSession(result.gameId, result.playerId);
      setCurrentPlayerIdState(result.playerId);
      const state = await fetchGameState(result.gameId);
      if (state) setGameState(state);
      setupRealtimeSubscription(result.gameId);
    }
    
    setIsLoading(false);
    return result?.gameId || null;
  }, [db, saveSession, fetchGameState, setupRealtimeSubscription]);

  // Join an existing game
  const joinGame = useCallback(async (gameId: string, playerName: string): Promise<boolean> => {
    setIsLoading(true);
    const result = await db.joinGame(gameId, playerName);
    
    if (result) {
      saveSession(gameId, result.playerId);
      setCurrentPlayerIdState(result.playerId);
      const state = await fetchGameState(gameId);
      if (state) setGameState(state);
      setupRealtimeSubscription(gameId);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, [db, saveSession, fetchGameState, setupRealtimeSubscription]);

  // Load existing game from session
  const loadGame = useCallback(async (gameId: string, playerId: string): Promise<boolean> => {
    setIsLoading(true);
    const state = await fetchGameState(gameId);
    
    if (state && state.players.find(p => p.id === playerId)) {
      setGameState(state);
      setCurrentPlayerIdState(playerId);
      setupRealtimeSubscription(gameId);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, [fetchGameState, setupRealtimeSubscription]);

  // Start the game
  const startGame = useCallback(async () => {
    if (!gameState || gameState.players.length < 6) return;
    await db.startGame(gameState.id);
  }, [gameState, db]);

  // Reveal a characteristic
  const revealCharacteristic = useCallback(async (playerId: string, characteristic: keyof Characteristics) => {
    const player = gameState?.players.find(p => p.id === playerId);
    if (!player) return;
    await db.revealCharacteristic(playerId, characteristic, player.revealedCharacteristics);
  }, [gameState, db]);

  // Move to next phase
  const nextPhase = useCallback(async () => {
    if (!gameState) return;

    const phases: GamePhase[] = ['lobby', 'introduction', 'turn', 'discussion', 'defense', 'voting', 'results', 'farewell'];
    const currentIndex = phases.indexOf(gameState.phase);
    let nextPhaseValue = phases[currentIndex + 1] || 'turn';

    // Check if game should end
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    if (alivePlayers.length <= gameState.bunkerSlots) {
      nextPhaseValue = 'gameover';
    }

    // Reset for new round after farewell
    if (gameState.phase === 'farewell') {
      await db.resetVotes(gameState.id);
      await db.updateGamePhase(gameState.id, {
        phase: 'turn',
        current_round: gameState.currentRound + 1,
        current_player_index: 0,
      });
    } else {
      await db.updateGamePhase(gameState.id, { phase: nextPhaseValue });
    }
  }, [gameState, db]);

  // Cast a vote
  const castVote = useCallback(async (voterId: string, targetId: string) => {
    if (!gameState) return;
    await db.castVote(gameState.id, voterId, targetId, gameState.votes);
  }, [gameState, db]);

  // Eliminate a player
  const eliminatePlayer = useCallback(async (playerId: string) => {
    await db.eliminatePlayer(playerId);
  }, [db]);

  // Skip voting (first round only)
  const skipVoting = useCallback(async () => {
    if (!gameState || gameState.currentRound !== 1) return;
    await nextPhase();
  }, [gameState, nextPhase]);

  // Set current player ID
  const setCurrentPlayerId = useCallback((playerId: string) => {
    setCurrentPlayerIdState(playerId);
    if (gameState) {
      localStorage.setItem(PLAYER_ID_KEY, playerId);
    }
  }, [gameState]);

  // Check for existing session on mount
  useEffect(() => {
    const savedGameId = localStorage.getItem(GAME_ID_KEY);
    const savedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
    
    if (savedGameId && savedPlayerId) {
      loadGame(savedGameId, savedPlayerId);
    }
  }, [loadGame]);

  return (
    <GameContext.Provider value={{
      gameState,
      currentPlayer,
      isLoading,
      createGame,
      joinGame,
      loadGame,
      startGame,
      revealCharacteristic,
      nextPhase,
      castVote,
      eliminatePlayer,
      skipVoting,
      setCurrentPlayerId,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
