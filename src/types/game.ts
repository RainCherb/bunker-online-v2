export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isEliminated: boolean;
  characteristics: Characteristics;
  revealedCharacteristics: (keyof Characteristics)[];
  votesAgainst: number;
  hasVoted: boolean;
  usedActionCards: string[]; // IDs of used action cards (actionCard1, actionCard2)
  extraBaggage: string | null; // Additional baggage from card 12
  extraProfession: string | null; // Additional profession from card 13
  stolenBaggageFrom: string | null; // Player ID whose baggage was stolen
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
  // Action card state
  pendingAction: PendingAction | null;
  roundRestrictions: ('biology' | 'hobby' | 'baggage')[]; // Cards 7,8,9 restrict reveals (now array)
  doubleVotePlayerId: string | null; // Card 1,15 - player with double vote
  cannotVotePlayerId: string | null; // Card 16 - player who cannot vote
  immunityPlayerId: string | null; // Card 3 - player immune from elimination
  linkedPlayerId: string | null; // Card 19 - linked player (eliminated together)
  linkedByPlayerId: string | null; // Who activated the link
  penaltyNextRoundPlayerId: string | null; // Card 1 - gets +1 vote next round
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

// Action Card Types
export type ActionCardEffect = 
  | 'double_vote_with_penalty'  // Card 1
  | 'new_profession'            // Card 2
  | 'give_immunity'             // Card 3
  | 'new_health'                // Card 4
  | 'new_phobia'                // Card 5
  | 'restrict_biology'          // Card 7
  | 'restrict_hobby'            // Card 8
  | 'restrict_baggage'          // Card 9
  | 'shuffle_professions'       // Card 10
  | 'shuffle_baggage'           // Card 11
  | 'extra_baggage'             // Card 12
  | 'extra_profession'          // Card 13
  | 'give_double_vote'          // Card 15
  | 'block_vote'                // Card 16
  | 'steal_baggage'             // Card 17
  | 'revive_player'             // Card 18
  | 'link_elimination'          // Card 19
  | 'swap_biology'              // Card 20
  | 'cancel'                    // Cards 21, 22
  | 'set_perfect_health'        // Card 23
  | 'random_baggage'            // Card 24
  | 'force_revote'              // Card 25
  | 'remove_phobia';            // Card 26

export type ActionCardTargetType = 
  | 'none'           // No target needed
  | 'other'          // Any other player (not self)
  | 'any'            // Any player including self
  | 'eliminated'     // Eliminated players only
  | 'has_closed_biology'; // Players with unrevealed biology

export interface ActionCard {
  id: string;
  name: string;
  description: string;
  effect: ActionCardEffect;
  requiresTarget: boolean;
  targetType: ActionCardTargetType;
  isCancelCard?: boolean; // True for cards 21, 22
  onlyAfterResults?: boolean; // True for card 25
}

export interface PendingAction {
  cardId: string; // actionCard1 or actionCard2
  cardName: string;
  cardDescription: string;
  playerId: string; // Who activated
  playerName: string;
  effect: ActionCardEffect;
  requiresTarget: boolean;
  targetType: ActionCardTargetType;
  targetId: string | null; // Selected target (if applicable)
  expiresAt: Date; // When cancel window expires (4 seconds after activation)
  isCancelled: boolean;
  cancelledByPlayerId: string | null;
}

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
