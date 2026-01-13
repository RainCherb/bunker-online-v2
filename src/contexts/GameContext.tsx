import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { GameState, Player, GamePhase, VotingPhase, Characteristics } from '@/types/game';
import { 
  generateRandomCharacteristics, 
  getRandomBunker, 
  getRandomCatastrophe, 
  calculateBunkerSlots 
} from '@/data/gameData';

interface GameContextType {
  gameState: GameState | null;
  currentPlayer: Player | null;
  createGame: (hostName: string) => string;
  joinGame: (gameId: string, playerName: string) => boolean;
  startGame: () => void;
  revealCharacteristic: (playerId: string, characteristic: keyof Characteristics) => void;
  nextPhase: () => void;
  castVote: (voterId: string, targetId: string) => void;
  eliminatePlayer: (playerId: string) => void;
  skipVoting: () => void;
  setCurrentPlayerId: (playerId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const generateGameId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const generatePlayerId = () => Math.random().toString(36).substring(2, 12);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const currentPlayer = gameState?.players.find(p => p.id === currentPlayerId) || null;

  const createGame = useCallback((hostName: string): string => {
    const gameId = generateGameId();
    const playerId = generatePlayerId();
    
    const hostPlayer: Player = {
      id: playerId,
      name: hostName,
      isHost: true,
      isEliminated: false,
      characteristics: generateRandomCharacteristics(),
      revealedCharacteristics: [],
      votesAgainst: 0,
      hasVoted: false,
    };

    const newGameState: GameState = {
      id: gameId,
      phase: 'lobby',
      currentRound: 0,
      maxRounds: 7,
      currentPlayerIndex: 0,
      players: [hostPlayer],
      bunker: getRandomBunker(),
      catastrophe: getRandomCatastrophe(),
      bunkerSlots: 0,
      timeRemaining: 60,
      votingPhase: 'none',
      votes: {},
    };

    setGameState(newGameState);
    setCurrentPlayerId(playerId);
    return gameId;
  }, []);

  const joinGame = useCallback((gameId: string, playerName: string): boolean => {
    if (!gameState || gameState.id !== gameId) return false;
    if (gameState.phase !== 'lobby') return false;
    if (gameState.players.length >= 15) return false;

    const playerId = generatePlayerId();
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: false,
      isEliminated: false,
      characteristics: generateRandomCharacteristics(),
      revealedCharacteristics: [],
      votesAgainst: 0,
      hasVoted: false,
    };

    setGameState(prev => prev ? {
      ...prev,
      players: [...prev.players, newPlayer],
    } : null);
    
    setCurrentPlayerId(playerId);
    return true;
  }, [gameState]);

  const startGame = useCallback(() => {
    if (!gameState || gameState.players.length < 6) return;

    setGameState(prev => prev ? {
      ...prev,
      phase: 'introduction',
      currentRound: 1,
      bunkerSlots: calculateBunkerSlots(prev.players.length),
      players: prev.players.map(p => ({
        ...p,
        revealedCharacteristics: ['profession'], // Profession is always revealed first
      })),
    } : null);
  }, [gameState]);

  const revealCharacteristic = useCallback((playerId: string, characteristic: keyof Characteristics) => {
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(p => 
          p.id === playerId 
            ? { ...p, revealedCharacteristics: [...new Set([...p.revealedCharacteristics, characteristic])] }
            : p
        ),
      };
    });
  }, []);

  const nextPhase = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      
      const phases: GamePhase[] = ['lobby', 'introduction', 'turn', 'discussion', 'defense', 'voting', 'results', 'farewell'];
      const currentIndex = phases.indexOf(prev.phase);
      
      let nextPhase = phases[currentIndex + 1] || 'turn';
      
      // Check if game should end
      const alivePlayers = prev.players.filter(p => !p.isEliminated);
      if (alivePlayers.length <= prev.bunkerSlots) {
        nextPhase = 'gameover';
      }
      
      // Reset for new round after farewell
      if (prev.phase === 'farewell') {
        return {
          ...prev,
          phase: 'turn',
          currentRound: prev.currentRound + 1,
          currentPlayerIndex: 0,
          votes: {},
          players: prev.players.map(p => ({ ...p, votesAgainst: 0, hasVoted: false })),
        };
      }
      
      return { ...prev, phase: nextPhase };
    });
  }, []);

  const castVote = useCallback((voterId: string, targetId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const newVotes = { ...prev.votes, [voterId]: targetId };
      const updatedPlayers = prev.players.map(p => {
        if (p.id === voterId) return { ...p, hasVoted: true };
        // Count votes
        const votesAgainst = Object.values(newVotes).filter(v => v === p.id).length;
        return { ...p, votesAgainst };
      });

      return { ...prev, votes: newVotes, players: updatedPlayers };
    });
  }, []);

  const eliminatePlayer = useCallback((playerId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(p => 
          p.id === playerId ? { ...p, isEliminated: true } : p
        ),
      };
    });
  }, []);

  const skipVoting = useCallback(() => {
    if (!gameState || gameState.currentRound !== 1) return;
    nextPhase();
  }, [gameState, nextPhase]);

  return (
    <GameContext.Provider value={{
      gameState,
      currentPlayer,
      createGame,
      joinGame,
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
