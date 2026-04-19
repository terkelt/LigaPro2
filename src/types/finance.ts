export interface FinanceRecord {
  balance: number;
  transferBudget: number;
  salaryBudget: number;
  totalSalaryPerMonth: number;
  monthlyIncome: MonthlyFinance[];
  monthlyExpenses: MonthlyFinance[];
}

export interface MonthlyFinance {
  month: string;
  tvMoney: number;
  ticketIncome: number;
  merchandising: number;
  sponsoring: number;
  transferIncome: number;
  prizesMoney: number;
  salaries: number;
  transferExpenses: number;
  stadiumMaintenance: number;
  staffSalaries: number;
  youthAcademy: number;
  bonuses: number;
  other: number;
}

export type SponsorType = 'trikot' | 'aermel' | 'bande' | 'stadion' | 'ausruester' | 'partner';

export const SPONSOR_TYPE_LABELS: Record<SponsorType, string> = {
  trikot: 'Trikotsponsor',
  aermel: 'Ärmelsponsor',
  bande: 'Bandenwerbung',
  stadion: 'Stadion-Naming',
  ausruester: 'Ausrüster',
  partner: 'Partner',
};

export const SPONSOR_TYPE_EXCLUSIVE: Record<SponsorType, boolean> = {
  trikot: true,
  aermel: true,
  bande: true,
  stadion: true,
  ausruester: true,
  partner: false,
};

export const SPONSOR_MAX_SLOTS: Record<SponsorType, number> = {
  trikot: 1,
  aermel: 1,
  bande: 2,
  stadion: 1,
  ausruester: 1,
  partner: 3,
};

export type SponsorConditionType =
  | 'min_league_position'    // Finish in top X
  | 'cup_round'              // Reach at least round X in cup
  | 'home_wins'              // Win X home games per season
  | 'avg_attendance'          // Average attendance above X%
  | 'no_relegation'           // Don't get relegated
  | 'european_qualification'  // Qualify for European competition
  | 'goals_scored'            // Score at least X goals per season
  | 'clean_sheets';           // Keep at least X clean sheets per season

export type SponsorConditionTerm = 'short' | 'medium' | 'long';

export interface SponsorCondition {
  type: SponsorConditionType;
  term: SponsorConditionTerm;
  label: string;
  target: number;
  penaltyAmount: number;
  isFailed?: boolean;
  isChecked?: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  type: SponsorType;
  amountPerSeason: number;
  contractYears: number;
  contractStart: string;
  contractEnd: string;
  bonusCL: number;
  bonusTitle: number;
  isActive: boolean;
  cancellationPenalty: number;
  conditions?: SponsorCondition[];
}

export interface SponsorOffer {
  id: string;
  sponsorName: string;
  type: SponsorType;
  amountPerSeason: number;
  contractYears: number;
  bonusCL: number;
  bonusTitle: number;
  minReputation: number;
  date: string;
  expiresDate: string;
  cancellationPenalty: number;
  conditions?: SponsorCondition[];
  // Negotiation fields
  maxNegotiateAmount: number;    // hidden ceiling the sponsor will go to
  negotiationAttempts: number;   // how many times player has negotiated (0 = initial offer)
  isWithdrawn?: boolean;         // sponsor withdrew after failed negotiation
}

export type StadiumUpgradeType = 'capacity' | 'vip' | 'shop' | 'training' | 'youth' | 'medical';

export interface StadiumUpgrade {
  id: string;
  type: StadiumUpgradeType;
  name: string;
  description: string;
  cost: number;
  buildTimeWeeks: number;
  effect: string;
  startDate?: string;
  completionDate?: string;
  isCompleted: boolean;
  isInProgress: boolean;
}
