export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isEliminated: boolean;
  characteristics: Characteristics;
  revealedCharacteristics: (keyof Characteristics)[];
  votesAgainst: number;
  hasVoted: boolean;
}

export interface Characteristics {
  profession: string;
  biology: string;
  health: string;
  phobia: string;
  hobby: string;
  baggage: string;
  fact: string;
  actionCard1: string;
  actionCard2: string;
}

export interface Bunker {
  name: string;
  location: string;
  size: string;
  stayDuration: string;
  foodSupply: string;
  items: string[];
}

export interface Catastrophe {
  name: string;
  description: string;
  survivalCondition: string;
}

// Database compatible versions (for storing in DB)
export interface BunkerDB {
  name: string;
  description: string;
  supplies: string[];
}

export interface CatastropheDB {
  name: string;
  description: string;
  survivalTime: string;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  currentRound: number;
  maxRounds: number;
  currentPlayerIndex: number;
  players: Player[];
  bunker: BunkerDB;
  catastrophe: CatastropheDB;
  bunkerSlots: number;
  timeRemaining: number;
  votingPhase: VotingPhase;
  votes: Record<string, string>; // voterId -> targetId
  tiedPlayers: string[]; // Player IDs in tie for revote
  isRevote: boolean; // Whether this is a revote round
}

export type GamePhase = 
  | 'lobby'
  | 'introduction'
  | 'turn'
  | 'discussion'
  | 'defense'
  | 'voting'
  | 'results'
  | 'farewell'
  | 'gameover';

export type VotingPhase = 
  | 'none'
  | 'statements'
  | 'voting'
  | 'defense'
  | 'revote';

export const CHARACTERISTIC_NAMES: Record<keyof Characteristics, string> = {
  profession: 'Профессия',
  biology: 'Биология',
  health: 'Здоровье',
  phobia: 'Фобия',
  hobby: 'Хобби',
  baggage: 'Багаж',
  fact: 'Факт',
  actionCard1: 'Карта действий 1',
  actionCard2: 'Карта действий 2',
};

export const CHARACTERISTICS_ORDER: (keyof Characteristics)[] = [
  'profession',
  'biology',
  'health',
  'phobia',
  'hobby',
  'baggage',
  'fact',
  'actionCard1',
  'actionCard2',
];
