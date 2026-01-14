import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { GameState, Player, GamePhase, Characteristics, BunkerDB, CatastropheDB, CHARACTERISTICS_ORDER } from '@/types/game';
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
  revealCharacteristic: (playerId: string, characteristic: keyof Characteristics) => Promise<boolean>;
  nextPhase: () => Promise<void>;
  nextPlayerTurn: () => Promise<void>;
  castVote: (voterId: string, targetId: string) => Promise<void>;
  eliminatePlayer: (playerId: string) => Promise<void>;
  processVotingResults: () => Promise<void>;
  skipVoting: () => Promise<void>;
  setCurrentPlayerId: (playerId: string) => void;
  getCurrentTurnPlayer: () => Player | null;
  clearSession: () => void;
  canRevealCharacteristic: (playerId: string, characteristic: keyof Characteristics) => boolean;
  getAvailableCharacteristics: (playerId: string) => (keyof Characteristics)[];
  autoRevealRandomCharacteristic: (playerId: string) => Promise<void>;
  hasRevealedThisTurn: (playerId: string) => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Storage keys
const PLAYER_ID_KEY = 'bunker_player_id';
const GAME_ID_KEY = 'bunker_game_id';
const REVEALED_THIS_TURN_KEY = 'bunker_revealed_this_turn';

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
  const [revealedThisTurn, setRevealedThisTurn] = useState<Set<string>>(new Set());
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
    setRevealedThisTurn(new Set());
  }, [gameState, db]);

  // Get current turn player
  const getCurrentTurnPlayer = useCallback((): Player | null => {
    if (!gameState) return null;
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    if (gameState.currentPlayerIndex >= alivePlayers.length) return null;
    return alivePlayers[gameState.currentPlayerIndex];
  }, [gameState]);

  // Check if player already revealed this turn
  const hasRevealedThisTurn = useCallback((playerId: string): boolean => {
    return revealedThisTurn.has(playerId);
  }, [revealedThisTurn]);

  // Get available characteristics for a player based on round
  const getAvailableCharacteristics = useCallback((playerId: string): (keyof Characteristics)[] => {
    const player = gameState?.players.find(p => p.id === playerId);
    if (!player || !gameState) return [];

    const revealed = player.revealedCharacteristics;
    const round = gameState.currentRound;

    // Round 1: Only profession
    if (round === 1) {
      if (revealed.includes('profession')) return [];
      return ['profession'];
    }

    // Round 2+: Any unrevealed characteristic
    return CHARACTERISTICS_ORDER.filter(c => !revealed.includes(c));
  }, [gameState]);

  // Check if can reveal a specific characteristic
  const canRevealCharacteristic = useCallback((playerId: string, characteristic: keyof Characteristics): boolean => {
    if (!gameState) return false;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Already revealed
    if (player.revealedCharacteristics.includes(characteristic)) return false;

    // Check if it's this player's turn
    const currentTurnPlayer = getCurrentTurnPlayer();
    if (currentTurnPlayer?.id !== playerId) return false;

    // Check if already revealed this turn
    if (revealedThisTurn.has(playerId)) return false;

    // Round 1: Only profession allowed
    if (gameState.currentRound === 1) {
      return characteristic === 'profession';
    }

    return true;
  }, [gameState, getCurrentTurnPlayer, revealedThisTurn]);

  // Reveal a characteristic
  const revealCharacteristic = useCallback(async (playerId: string, characteristic: keyof Characteristics): Promise<boolean> => {
    if (!canRevealCharacteristic(playerId, characteristic)) return false;

    const player = gameState?.players.find(p => p.id === playerId);
    if (!player) return false;

    const success = await db.revealCharacteristic(playerId, characteristic, player.revealedCharacteristics);
    
    if (success) {
      setRevealedThisTurn(prev => new Set(prev).add(playerId));
    }
    
    return success;
  }, [gameState, db, canRevealCharacteristic]);

  // Auto reveal a random characteristic (for timeout)
  const autoRevealRandomCharacteristic = useCallback(async (playerId: string): Promise<void> => {
    const available = getAvailableCharacteristics(playerId);
    if (available.length === 0) return;

    // Pick the first available (or random)
    const characteristic = available[0];
    await revealCharacteristic(playerId, characteristic);
  }, [getAvailableCharacteristics, revealCharacteristic]);

  // Move to next player turn
  const nextPlayerTurn = useCallback(async () => {
    if (!gameState) return;
    
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const nextIndex = gameState.currentPlayerIndex + 1;
    
    // Clear revealed this turn for new player
    setRevealedThisTurn(new Set());
    
    // If all players have had their turn
    if (nextIndex >= alivePlayers.length) {
      // Round 1: Go to discussion for 30 seconds, then next round
      if (gameState.currentRound === 1) {
        await db.updateGamePhase(gameState.id, { 
          phase: 'discussion',
          current_player_index: 0
        });
      } else {
        // Round 2+: Go to voting
        await db.updateGamePhase(gameState.id, { 
          phase: 'defense',
          current_player_index: 0
        });
      }
    } else {
      await db.updateGamePhase(gameState.id, { 
        current_player_index: nextIndex 
      });
    }
  }, [gameState, db]);

  // Move to next phase
  const nextPhase = useCallback(async () => {
    if (!gameState) return;

    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    
    // Check if game should end
    if (alivePlayers.length <= gameState.bunkerSlots) {
      await db.updateGamePhase(gameState.id, { phase: 'gameover' });
      return;
    }

    // Phase progression logic
    switch (gameState.phase) {
      case 'introduction':
        setRevealedThisTurn(new Set());
        await db.updateGamePhase(gameState.id, { 
          phase: 'turn',
          current_player_index: 0
        });
        break;
      case 'turn':
        await db.updateGamePhase(gameState.id, { phase: 'discussion' });
        break;
      case 'discussion':
        // After round 1 discussion, start round 2
        if (gameState.currentRound === 1) {
          setRevealedThisTurn(new Set());
          await db.updateGamePhase(gameState.id, { 
            phase: 'turn',
            current_round: 2,
            current_player_index: 0
          });
        } else {
          await db.updateGamePhase(gameState.id, { phase: 'defense' });
        }
        break;
      case 'defense':
        await db.updateGamePhase(gameState.id, { phase: 'voting' });
        break;
      case 'voting':
        await db.updateGamePhase(gameState.id, { phase: 'results' });
        break;
      case 'results':
        await db.updateGamePhase(gameState.id, { phase: 'farewell' });
        break;
      case 'farewell':
        // Start new round
        setRevealedThisTurn(new Set());
        await db.resetVotes(gameState.id);
        await db.updateGamePhase(gameState.id, {
          phase: 'turn',
          current_round: gameState.currentRound + 1,
          current_player_index: 0,
        });
        break;
      default:
        break;
    }
  }, [gameState, db]);

  // Process voting results
  const processVotingResults = useCallback(async () => {
    if (!gameState) return;
    
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const maxVotes = Math.max(...alivePlayers.map(p => p.votesAgainst));
    
    if (maxVotes === 0) {
      // No votes cast, skip elimination
      setRevealedThisTurn(new Set());
      await db.updateGamePhase(gameState.id, { phase: 'turn' });
      await db.resetVotes(gameState.id);
      await db.updateGamePhase(gameState.id, {
        current_round: gameState.currentRound + 1,
        current_player_index: 0,
      });
      return;
    }
    
    // Find players with max votes (could be a tie)
    const playersWithMaxVotes = alivePlayers.filter(p => p.votesAgainst === maxVotes);
    
    if (playersWithMaxVotes.length === 1) {
      await db.eliminatePlayer(playersWithMaxVotes[0].id);
      await db.updateGamePhase(gameState.id, { phase: 'farewell' });
    } else {
      // Tie - eliminate the first one
      await db.eliminatePlayer(playersWithMaxVotes[0].id);
      await db.updateGamePhase(gameState.id, { phase: 'farewell' });
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
    setRevealedThisTurn(new Set());
    await db.resetVotes(gameState.id);
    await db.updateGamePhase(gameState.id, {
      phase: 'turn',
      current_round: gameState.currentRound + 1,
      current_player_index: 0,
    });
  }, [gameState, db]);

  // Set current player ID
  const setCurrentPlayerId = useCallback((playerId: string) => {
    setCurrentPlayerIdState(playerId);
    if (gameState) {
      localStorage.setItem(PLAYER_ID_KEY, playerId);
    }
  }, [gameState]);

  // Clear game session
  const clearSession = useCallback(() => {
    localStorage.removeItem(GAME_ID_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
    localStorage.removeItem(REVEALED_THIS_TURN_KEY);
    setGameState(null);
    setCurrentPlayerIdState(null);
    setRevealedThisTurn(new Set());
  }, []);

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
      nextPlayerTurn,
      castVote,
      eliminatePlayer,
      processVotingResults,
      skipVoting,
      setCurrentPlayerId,
      getCurrentTurnPlayer,
      clearSession,
      canRevealCharacteristic,
      getAvailableCharacteristics,
      autoRevealRandomCharacteristic,
      hasRevealedThisTurn,
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
