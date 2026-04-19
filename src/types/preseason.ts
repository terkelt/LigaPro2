// ── Pre-Season Types ──

export type TrainingCampLocation = 'local' | 'austria' | 'turkey' | 'spain' | 'usa';

export interface TrainingCampOption {
  id: TrainingCampLocation;
  name: string;
  country: string;
  description: string;
  cost: number;
  durationDays: number;
  effects: {
    fitnessBoost: number;      // +condition for all players
    moraleBoost: number;        // +morale for all players
    cohesionBoost: number;      // team cohesion (hidden modifier)
    injuryRisk: number;         // % chance of a player getting injured
    youthDevelopment: number;   // bonus XP for U23 players
  };
  /** Unique event pool for this location */
  specialEventChance: number;   // % chance for a special event to occur
}

export type PreseasonEventType =
  | 'injury'
  | 'breakout_player'
  | 'team_bonding'
  | 'tactical_insight'
  | 'media_attention'
  | 'local_hero'
  | 'weather_disruption'
  | 'sponsor_interest'
  | 'player_dispute'
  | 'fitness_boost';

export interface PreseasonEvent {
  id: string;
  type: PreseasonEventType;
  title: string;
  description: string;
  isPositive: boolean;
  effects: {
    playerIds?: string[];         // affected players (empty = whole team)
    conditionChange?: number;
    moraleChange?: number;
    xpBonus?: number;
    injuryDays?: number;          // only for injury events
    budgetChange?: number;        // sponsor interest etc.
    attributeBoost?: { attribute: string; amount: number };
  };
}

export interface FriendlyMatch {
  id: string;
  opponentName: string;
  opponentStrength: number;      // 40-90 overall
  opponentTier: 'amateur' | 'semi_pro' | 'pro' | 'top';
  date: string;
  isPlayed: boolean;
  result?: { homeScore: number; awayScore: number };
  playerRatings?: { playerId: string; rating: number }[];
}

export type PreseasonPhase = 'camp_selection' | 'camp_running' | 'friendlies' | 'completed';

export type TacticalFocus = 'offensive' | 'defensive' | 'possession' | 'pressing' | 'balanced';

export interface TacticalFocusOption {
  id: TacticalFocus;
  name: string;
  icon: string;
  description: string;
  effects: {
    conditionBonus: number;
    moraleBonus: number;
    xpBonus: number;
    attributeCategory: string;  // which attributes get a small boost
  };
}

export interface SquadAssessment {
  avgOverall: number;
  avgAge: number;
  strengths: string[];
  weaknesses: string[];
  keyPlayer: string;           // player name
  youngTalent: string;         // player name
  positionGaps: string[];      // positions that need reinforcement
}

export interface PreseasonState {
  phase: PreseasonPhase;
  selectedCamp?: TrainingCampLocation;
  tacticalFocus?: TacticalFocus;
  campStartDate?: string;
  campEndDate?: string;
  campDay: number;               // current day within camp (0 = not started)
  friendlies: FriendlyMatch[];
  events: PreseasonEvent[];
  squadAssessment?: SquadAssessment;
  isCompleted: boolean;
}
