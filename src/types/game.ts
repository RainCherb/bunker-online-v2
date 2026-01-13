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
  gender: string;
  body: string;
  trait: string;
  profession: string;
  health: string;
  hobby: string;
  phobia: string;
  bigInventory: string;
  backpack: string;
  additionalInfo: string;
  specialAbility: string;
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
  severity: 'critical' | 'severe' | 'moderate';
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
  gender: 'Пол',
  body: 'Телосложение',
  trait: 'Черта характера',
  profession: 'Профессия',
  health: 'Здоровье',
  hobby: 'Хобби',
  phobia: 'Фобия',
  bigInventory: 'Крупный инвентарь',
  backpack: 'Рюкзак',
  additionalInfo: 'Доп. сведение',
  specialAbility: 'Спец. способность',
};

export const CHARACTERISTICS_ORDER: (keyof Characteristics)[] = [
  'profession',
  'gender',
  'body',
  'trait',
  'health',
  'hobby',
  'phobia',
  'bigInventory',
  'backpack',
  'additionalInfo',
  'specialAbility',
];
