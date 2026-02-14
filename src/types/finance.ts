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

export type SponsorType = 'main' | 'sleeve' | 'stadium' | 'partner';

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
