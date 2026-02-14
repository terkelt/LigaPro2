import { Player } from './player';
import { Team } from './team';
import { League, Season, SeasonSummary, TableEntry } from './league';
import { Match, MatchResult, Schedule } from './match';
import { Tactics } from './tactics';
import { TransferOffer, Transfer, LoanDeal, TransferListing, TransferRumor } from './transfer';
import { FinanceRecord, Sponsor, StadiumUpgrade, SponsorOffer } from './finance';
import { TrainingPlan } from './training';
import { StaffMember, ScoutReport } from './staff';
import { ManagerProfile, Achievement, JobOffer } from './manager';
import { NewsItem, PressConference } from './news';
import { PreseasonState } from './preseason';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type MatchSpeed = 'instant' | 'fast' | 'normal' | 'detailed';
export type MatchDisplay = 'result-only' | 'ticker' | 'detailed-2d';
export type SimulationSpeed = 'slow' | 'normal' | 'fast';

export interface GameSettings {
  matchSpeed: MatchSpeed;
  difficulty: Difficulty;
  matchDisplay: MatchDisplay;
  simulationSpeed: SimulationSpeed;
  sound: boolean;
  language: 'de';
  autosave: boolean;
  autosaveInterval: 1 | 3 | 5;
  currency: 'EUR';
  confirmDialogs: boolean;
}

export interface CupState {
  rounds: CupRound[];
  currentRound: number;
  isFinished: boolean;
  winnerId?: string;
}

export interface CupRound {
  name: string;
  matches: Match[];
  isCompleted: boolean;
}

export interface InternationalState {
  competition: 'cl' | 'el' | 'ecl';
  groups?: InternationalGroup[];
  knockoutMatches?: Match[];
  currentPhase: 'group' | 'r16' | 'quarter' | 'semi' | 'final';
  isEliminated: boolean;
  isFinished: boolean;
}

export interface InternationalGroup {
  name: string;
  teams: { teamId: string; teamName: string; strength: number }[];
  matches: Match[];
  table: TableEntry[];
}

export interface PendingInteraction {
  id: string;
  playerId: string;
  type: 'complaint' | 'salary_demand' | 'transfer_request' | 'playing_time' | 'contract_worry' | 'friend_sold';
  message: string;
  options: InteractionOption[];
  date: string;
  isResolved: boolean;
  promise?: PlayerPromise;
}

export interface InteractionOption {
  text: string;
  moraleEffect: number;
  promise?: PlayerPromise;
}

export interface PlayerPromise {
  type: 'playing_time' | 'salary_increase' | 'new_signing' | 'improved_role';
  description: string;
  deadline: string;
  isFulfilled: boolean;
}

export interface GameState {
  manager: ManagerProfile;
  currentTeamId: string;
  currentDate: string;
  season: Season;
  settings: GameSettings;
  leagues: League[];
  teams: Team[];
  players: Player[];
  schedules: Schedule[];
  results: MatchResult[];
  tables: Record<string, TableEntry[]>;
  tactics: { a: Tactics; b: Tactics; c: Tactics };
  activeTactic: 'a' | 'b' | 'c';
  transfers: {
    offers: TransferOffer[];
    completed: Transfer[];
    listings: TransferListing[];
    loans: LoanDeal[];
    rumors: TransferRumor[];
  };
  finances: Record<string, FinanceRecord>;
  sponsors: Sponsor[];
  sponsorOffers: SponsorOffer[];
  stadiumUpgrades: StadiumUpgrade[];
  training: TrainingPlan;
  youthPlayers: Player[];
  staff: StaffMember[];
  scoutReports: ScoutReport[];
  news: NewsItem[];
  achievements: Achievement[];
  seasonArchive: SeasonSummary[];
  interactions: PendingInteraction[];
  promises: PlayerPromise[];
  cupState: CupState;
  internationalState?: InternationalState;
  jobOffers: JobOffer[];
  pressConferences: PressConference[];
  isTransferWindowOpen: boolean;
  transferWindowType?: 'summer' | 'winter';
  preseason?: PreseasonState;
  aiManagers: Record<string, ManagerProfile>;
}

export const DEFAULT_SETTINGS: GameSettings = {
  matchSpeed: 'normal',
  difficulty: 'normal',
  matchDisplay: 'detailed-2d',
  simulationSpeed: 'normal',
  sound: true,
  language: 'de',
  autosave: true,
  autosaveInterval: 3,
  currency: 'EUR',
  confirmDialogs: true,
};
