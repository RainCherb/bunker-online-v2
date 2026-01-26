import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { GameState, Player, GamePhase, Characteristics, BunkerDB, CatastropheDB, CHARACTERISTICS_ORDER } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { useGameDatabase } from '@/hooks/useGameDatabase';
import { useAuth } from '@/hooks/useAuth';

interface GameContextType {
  gameState: GameState | null;
  currentPlayer: Player | null;
  isLoading: boolean;
  isAuthLoading: boolean;
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
  hasRevealedThisTurn: () => boolean;
  phaseEndsAt: Date | null;
  turnHasRevealed: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Storage key for game ID only (player ID comes from auth now)
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
  tiedPlayers: gameRow.tied_players || [],
  isRevote: gameRow.is_revote || false,
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phaseEndsAt, setPhaseEndsAt] = useState<Date | null>(null);
  const [turnHasRevealed, setTurnHasRevealed] = useState(false);
  const db = useGameDatabase();
  const { userId, ensureAuthenticated, isLoading: isAuthLoading, signOut } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentPlayer = gameState?.players.find(p => p.id === currentPlayerId) || null;

  // Save game ID to localStorage (player ID comes from auth now)
  const saveSession = useCallback((gameId: string) => {
    localStorage.setItem(GAME_ID_KEY, gameId);
  }, []);

  // Fetch game state from database
  const fetchGameState = useCallback(async (gameId: string): Promise<{ state: GameState; phaseEndsAt: Date | null; turnHasRevealed: boolean } | null> => {
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

    const state = dbGameToGameState(game, players || []);
    const endsAt = game.phase_ends_at ? new Date(game.phase_ends_at) : null;
    const revealed = game.turn_has_revealed || false;
    
    return { state, phaseEndsAt: endsAt, turnHasRevealed: revealed };
  }, []);

  // Setup realtime subscription with polling fallback
  const setupRealtimeSubscription = useCallback((gameId: string) => {
    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let lastUpdateTime = Date.now();
    
    const refreshState = async () => {
      const result = await fetchGameState(gameId);
      if (result) {
        setGameState(result.state);
        setPhaseEndsAt(result.phaseEndsAt);
        setTurnHasRevealed(result.turnHasRevealed);
        lastUpdateTime = Date.now();
      }
    };
    
    const channel = supabase
      .channel(`game-realtime-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          console.log('[Realtime] Game update received:', payload.eventType);
          await refreshState();
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
        async (payload) => {
          console.log('[Realtime] Players update received:', payload.eventType);
          await refreshState();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    channelRef.current = channel;

    // Polling fallback - check every 500ms for faster response
    pollingIntervalRef.current = setInterval(async () => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;
      // If no update in 600ms, poll manually
      if (timeSinceLastUpdate > 600) {
        await refreshState();
      }
    }, 500);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchGameState]);

  // Create a new game
  const createGame = useCallback(async (hostName: string): Promise<string | null> => {
    setIsLoading(true);
    
    try {
      // Ensure user is authenticated (anonymous auth)
      console.log('[CreateGame] Starting authentication...');
      const user = await ensureAuthenticated();
      if (!user) {
        console.error('[CreateGame] Failed to authenticate - no user returned');
        setIsLoading(false);
        return null;
      }
      console.log('[CreateGame] Authenticated as:', user.id);
      
      console.log('[CreateGame] Creating game for:', hostName);
      const result = await db.createGame(hostName, user.id);
      
      if (result) {
        console.log('[CreateGame] Game created:', result.gameId);
        saveSession(result.gameId);
        setCurrentPlayerIdState(result.playerId);
        const fetchResult = await fetchGameState(result.gameId);
        if (fetchResult) {
          setGameState(fetchResult.state);
          setPhaseEndsAt(fetchResult.phaseEndsAt);
          setTurnHasRevealed(fetchResult.turnHasRevealed);
        }
        setupRealtimeSubscription(result.gameId);
      } else {
        console.error('[CreateGame] db.createGame returned null');
      }
      
      setIsLoading(false);
      return result?.gameId || null;
    } catch (error) {
      console.error('[CreateGame] Exception:', error);
      setIsLoading(false);
      return null;
    }
  }, [db, saveSession, fetchGameState, setupRealtimeSubscription, ensureAuthenticated]);

  // Join an existing game
  const joinGame = useCallback(async (gameId: string, playerName: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Ensure user is authenticated (anonymous auth)
    const user = await ensureAuthenticated();
    if (!user) {
      console.error('[JoinGame] Failed to authenticate');
      setIsLoading(false);
      return false;
    }
    
    const result = await db.joinGame(gameId, playerName, user.id);
    
    if (result) {
      saveSession(gameId);
      setCurrentPlayerIdState(result.playerId);
      const fetchResult = await fetchGameState(gameId);
      if (fetchResult) {
        setGameState(fetchResult.state);
        setPhaseEndsAt(fetchResult.phaseEndsAt);
        setTurnHasRevealed(fetchResult.turnHasRevealed);
      }
      setupRealtimeSubscription(gameId);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, [db, saveSession, fetchGameState, setupRealtimeSubscription, ensureAuthenticated]);

  // Load existing game from session - uses auth.uid() as player ID
  const loadGame = useCallback(async (gameId: string, playerId: string): Promise<boolean> => {
    setIsLoading(true);
    const result = await fetchGameState(gameId);
    
    // Check if game exists and is not game over
    if (!result) {
      localStorage.removeItem(GAME_ID_KEY);
      setIsLoading(false);
      return false;
    }
    
    // If game is over, clear session
    if (result.state.phase === 'gameover') {
      localStorage.removeItem(GAME_ID_KEY);
      setIsLoading(false);
      return false;
    }
    
    if (result.state.players.find(p => p.id === playerId)) {
      setGameState(result.state);
      setPhaseEndsAt(result.phaseEndsAt);
      setTurnHasRevealed(result.turnHasRevealed);
      setCurrentPlayerIdState(playerId);
      setupRealtimeSubscription(gameId);
      setIsLoading(false);
      return true;
    }
    
    // Player not found in game
    localStorage.removeItem(GAME_ID_KEY);
    setIsLoading(false);
    return false;
  }, [fetchGameState, setupRealtimeSubscription]);

  // Start the game
  const startGame = useCallback(async () => {
    if (!gameState || gameState.players.length < 6) return;
    await db.startGame(gameState.id);
  }, [gameState, db]);

  // Get current turn player
  const getCurrentTurnPlayer = useCallback((): Player | null => {
    if (!gameState) return null;
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    if (gameState.currentPlayerIndex >= alivePlayers.length) return null;
    return alivePlayers[gameState.currentPlayerIndex];
  }, [gameState]);

  // Check if current turn player has revealed this turn (from DB state)
  const hasRevealedThisTurn = useCallback((): boolean => {
    return turnHasRevealed;
  }, [turnHasRevealed]);

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
    if (turnHasRevealed) return false;

    // Round 1: Only profession allowed
    if (gameState.currentRound === 1) {
      return characteristic === 'profession';
    }

    return true;
  }, [gameState, getCurrentTurnPlayer, turnHasRevealed]);

  // Reveal a characteristic
  const revealCharacteristic = useCallback(async (playerId: string, characteristic: keyof Characteristics): Promise<boolean> => {
    if (!canRevealCharacteristic(playerId, characteristic)) return false;
    if (!gameState) return false;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    const success = await db.revealCharacteristic(playerId, characteristic, player.revealedCharacteristics);
    
    if (success) {
      // Mark that this turn has revealed and set new timer (5 minutes after reveal)
      const newEndsAt = new Date(Date.now() + 5 * 60 * 1000);
      console.log('[Reveal] Card revealed, setting 5 min timer');
      
      // Use atomic function to update turn state
      await supabase.rpc('mark_turn_revealed', {
        p_game_id: gameState.id,
        p_phase_ends_at: newEndsAt.toISOString()
      });
    }
    
    return success;
  }, [gameState, db, canRevealCharacteristic]);

  // Auto reveal a random characteristic (for timeout)
  const autoRevealRandomCharacteristic = useCallback(async (playerId: string): Promise<void> => {
    if (!gameState) return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const available = getAvailableCharacteristics(playerId);
    if (available.length === 0) {
      console.log('[AutoReveal] No available characteristics');
      return;
    }

    // Pick a random available characteristic
    const randomIndex = Math.floor(Math.random() * available.length);
    const characteristic = available[randomIndex];
    console.log('[AutoReveal] Auto-revealing:', characteristic, 'for player:', player.name);
    
    // Directly update DB to avoid canReveal checks since this is auto-reveal
    await db.revealCharacteristic(playerId, characteristic, player.revealedCharacteristics);
    
    // Set 5 minute timer after auto-reveal using atomic function
    const newEndsAt = new Date(Date.now() + 5 * 60 * 1000);
    await supabase.rpc('mark_turn_revealed', {
      p_game_id: gameState.id,
      p_phase_ends_at: newEndsAt.toISOString()
    });
  }, [gameState, getAvailableCharacteristics, db]);

  // Move to next player turn - uses RPC to allow any player in game to advance
  const nextPlayerTurn = useCallback(async () => {
    if (!gameState) return;
    
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const nextIndex = gameState.currentPlayerIndex + 1;
    
    // Calculate new phase_ends_at (60 seconds for next player to reveal)
    const newEndsAt = new Date(Date.now() + 60 * 1000).toISOString();
    
    console.log('[NextTurn] Moving to next player, nextIndex:', nextIndex, 'total alive:', alivePlayers.length);
    
    // If all players have had their turn
    if (nextIndex >= alivePlayers.length) {
      // Round 1: Go to discussion for 30 seconds, then next round
      if (gameState.currentRound === 1) {
        const discussionEndsAt = new Date(Date.now() + 30 * 1000).toISOString();
        console.log('[NextTurn] All players done in round 1, going to discussion');
        await supabase.rpc('update_game_state', { 
          p_game_id: gameState.id,
          p_phase: 'discussion',
          p_current_player_index: 0,
          p_phase_ends_at: discussionEndsAt,
          p_turn_has_revealed: false
        });
      } else {
        // Round 2+: Go to voting
        console.log('[NextTurn] All players done in round', gameState.currentRound, ', going to defense');
        await supabase.rpc('update_game_state', { 
          p_game_id: gameState.id,
          p_phase: 'defense',
          p_current_player_index: 0,
          p_turn_has_revealed: false
        });
      }
    } else {
      console.log('[NextTurn] Moving to player index:', nextIndex);
      await supabase.rpc('update_game_state', { 
        p_game_id: gameState.id,
        p_current_player_index: nextIndex,
        p_phase_ends_at: newEndsAt,
        p_turn_has_revealed: false
      });
    }
  }, [gameState]);

  // Move to next phase
  const nextPhase = useCallback(async () => {
    if (!gameState) {
      console.log('[nextPhase] No gameState, returning');
      return;
    }

    console.log('[nextPhase] Current phase:', gameState.phase);
    
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    
    // Check if game should end
    if (alivePlayers.length <= gameState.bunkerSlots) {
      console.log('[nextPhase] Game over condition met');
      await db.updateGamePhase(gameState.id, { phase: 'gameover', phase_ends_at: null });
      return;
    }

    // Phase progression logic
    switch (gameState.phase) {
      case 'introduction':
        // Start first turn with timer
        const turnEndsAt = new Date(Date.now() + 60 * 1000).toISOString();
        await db.updateGamePhase(gameState.id, { 
          phase: 'turn',
          current_player_index: 0,
          phase_ends_at: turnEndsAt,
          turn_has_revealed: false
        });
        break;
      case 'turn':
        await db.updateGamePhase(gameState.id, { phase: 'discussion', phase_ends_at: null, turn_has_revealed: false });
        break;
      case 'discussion':
        // After round 1 discussion, start round 2
        if (gameState.currentRound === 1) {
          const round2EndsAt = new Date(Date.now() + 60 * 1000).toISOString();
          await db.updateGamePhase(gameState.id, { 
            phase: 'turn',
            current_round: 2,
            current_player_index: 0,
            phase_ends_at: round2EndsAt,
            turn_has_revealed: false
          });
        } else {
          await db.updateGamePhase(gameState.id, { phase: 'defense', phase_ends_at: null, turn_has_revealed: false });
        }
        break;
      case 'defense':
        await db.updateGamePhase(gameState.id, { phase: 'voting', phase_ends_at: null });
        break;
      case 'voting':
        console.log('[nextPhase] Voting -> Results');
        await db.updateGamePhase(gameState.id, { phase: 'results', phase_ends_at: null });
        console.log('[nextPhase] Phase updated to results');
        break;
      case 'results':
        await db.updateGamePhase(gameState.id, { phase: 'farewell', phase_ends_at: null });
        break;
      case 'farewell':
        // Start new round
        const nextRoundEndsAt = new Date(Date.now() + 60 * 1000).toISOString();
        await db.resetVotes(gameState.id);
        await db.updateGamePhase(gameState.id, {
          phase: 'turn',
          current_round: gameState.currentRound + 1,
          current_player_index: 0,
          phase_ends_at: nextRoundEndsAt,
          turn_has_revealed: false
        });
        break;
      default:
        break;
    }
  }, [gameState, db]);

  // Process voting results - handles ties with revote
  const processVotingResults = useCallback(async () => {
    if (!gameState) return;
    
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const maxVotes = Math.max(...alivePlayers.map(p => p.votesAgainst));
    
    if (maxVotes === 0) {
      // No votes cast, skip elimination - single atomic update
      const newEndsAt = new Date(Date.now() + 60 * 1000).toISOString();
      await db.resetVotes(gameState.id);
      await db.updateGamePhase(gameState.id, { 
        phase: 'turn', 
        phase_ends_at: newEndsAt, 
        turn_has_revealed: false,
        tied_players: [],
        is_revote: false,
        current_round: gameState.currentRound + 1,
        current_player_index: 0,
      });
      return;
    }
    
    // Find players with max votes (could be a tie)
    const playersWithMaxVotes = alivePlayers.filter(p => p.votesAgainst === maxVotes);
    
    if (playersWithMaxVotes.length === 1) {
      // Clear winner - eliminate and proceed
      await db.eliminatePlayer(playersWithMaxVotes[0].id);
      await db.updateGamePhase(gameState.id, { 
        phase: 'farewell', 
        phase_ends_at: null,
        tied_players: [],
        is_revote: false
      });
    } else {
      // TIE! Check if this is already a revote - if so, eliminate all tied players
      if (gameState.isRevote) {
        // Second tie - eliminate ALL tied players
        console.log('[Voting] Second tie detected, eliminating all tied players:', playersWithMaxVotes.map(p => p.name));
        for (const tiedPlayer of playersWithMaxVotes) {
          await db.eliminatePlayer(tiedPlayer.id);
        }
        await db.updateGamePhase(gameState.id, { 
          phase: 'farewell', 
          phase_ends_at: null,
          tied_players: [],
          is_revote: false
        });
      } else {
        // First tie - Start 3-minute discussion and then revote only among tied players
        const tiedPlayerIds = playersWithMaxVotes.map(p => p.id);
        const discussionEndsAt = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3 minutes
        
        // Reset votes and set up for revote
        await db.resetVotes(gameState.id);
        await db.updateGamePhase(gameState.id, { 
          phase: 'defense', 
          phase_ends_at: discussionEndsAt,
          tied_players: tiedPlayerIds,
          is_revote: true
        });
      }
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
    const newEndsAt = new Date(Date.now() + 60 * 1000).toISOString();
    await db.resetVotes(gameState.id);
    await db.updateGamePhase(gameState.id, {
      phase: 'turn',
      current_round: gameState.currentRound + 1,
      current_player_index: 0,
      phase_ends_at: newEndsAt,
      turn_has_revealed: false
    });
  }, [gameState, db]);

  // Set current player ID (no longer saves to localStorage - uses auth)
  const setCurrentPlayerId = useCallback((playerId: string) => {
    setCurrentPlayerIdState(playerId);
  }, []);

  // Clear game session
  const clearSession = useCallback(async () => {
    localStorage.removeItem(GAME_ID_KEY);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setGameState(null);
    setCurrentPlayerIdState(null);
    setPhaseEndsAt(null);
    setTurnHasRevealed(false);
    // Sign out to get a new anonymous user for next game
    await signOut();
  }, [signOut]);

  // Check for existing session on mount - now uses auth.uid()
  useEffect(() => {
    const restoreSession = async () => {
      const savedGameId = localStorage.getItem(GAME_ID_KEY);
      
      if (savedGameId && userId) {
        // Use auth.uid() as player ID
        loadGame(savedGameId, userId);
      }
    };
    
    if (!isAuthLoading && userId) {
      restoreSession();
    }
  }, [loadGame, userId, isAuthLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      currentPlayer,
      isLoading,
      isAuthLoading,
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
      phaseEndsAt,
      turnHasRevealed,
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
