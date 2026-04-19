import { TrainingBoost } from './training';
import { PlayerTrait } from './traits';

export type Position = 'TW' | 'IV' | 'LV' | 'RV' | 'ZDM' | 'ZM' | 'ZOM' | 'LA' | 'RA' | 'ST';

export type PositionCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

export type FootPreference = 'left' | 'right' | 'both';

export interface PlayerAttributes {
  // Technisch
  ballControl: number;
  dribbling: number;
  passing: number;
  crossing: number;
  shooting: number;
  longShots: number;
  finishing: number;
  freeKick: number;
  heading: number;

  // Physisch
  pace: number;
  acceleration: number;
  stamina: number;
  strength: number;
  jumping: number;

  // Mental
  vision: number;
  composure: number;
  aggression: number;
  positioning: number;
  workRate: number;
  leadership: number;

  // Torwart
  reflexes: number;
  handling: number;
  diving: number;
  kicking: number;
  oneOnOne: number;
}

export interface Injury {
  type: string;
  severity: 'light' | 'medium' | 'heavy' | 'critical';
  daysRemaining: number;
  totalDays: number;
  rehaPhase: 1 | 2 | 3 | 4;
}

export interface PlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  avgRating: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  position: Position;
  secondaryPositions: Position[];
  foot: FootPreference;
  height: number;
  weight: number;
  shirtNumber: number;
  teamId: string;
  contractUntil: string;
  salary: number;
  marketValue: number;
  releaseClause?: number;

  attributes: PlayerAttributes;

  // Dynamic values
  condition: number;
  morale: number;
  form: number;
  fatigue: number;
  matchPractice: number; // 0-100: match fitness/sharpness, decays when not playing
  injuryProne: number;
  injury?: Injury;
  suspended: boolean;
  suspendedMatches: number;

  // Development
  potential: number;
  growthRate: number;

  // XP System
  level: number;
  xp: number;
  xpToNextLevel: number;
  trainingBoosts: TrainingBoost[];

  // Special Traits
  traits: PlayerTrait[];

  // Season stats
  stats: PlayerStats;

  // History
  formHistory: number[];
  ratingHistory: number[];

  // Loan
  isLoaned: boolean;
  loanedFrom?: string;
  loanedTo?: string;

  // Transfer
  isTransferListed: boolean;
  transferRequested: boolean;

  // Legend / Icon status
  isLegend?: boolean;          // Club legend — long service + high performance
  isIcon?: boolean;            // World-class icon — top-tier reputation
  legendReason?: string;       // e.g. "Vereinslegende", "Weltklasse-Ikone"
  legendaryTier?: 'diamond' | 'gold' | 'silver' | 'bronze';  // Tier for real-world icons
  legendaryBio?: string;       // Short career highlight text
}

export const POSITION_CATEGORIES: Record<Position, PositionCategory> = {
  TW: 'goalkeeper',
  IV: 'defender',
  LV: 'defender',
  RV: 'defender',
  ZDM: 'midfielder',
  ZM: 'midfielder',
  ZOM: 'midfielder',
  LA: 'forward',
  RA: 'forward',
  ST: 'forward',
};

export const POSITION_LABELS: Record<Position, string> = {
  TW: 'Torwart',
  IV: 'Innenverteidiger',
  LV: 'Linker Verteidiger',
  RV: 'Rechter Verteidiger',
  ZDM: 'Zentrales Defensives Mittelfeld',
  ZM: 'Zentrales Mittelfeld',
  ZOM: 'Zentrales Offensives Mittelfeld',
  LA: 'Linksaußen',
  RA: 'Rechtsaußen',
  ST: 'Stürmer',
};
