export type TransferStatus = 'pending' | 'accepted' | 'rejected' | 'counter_offer' | 'completed' | 'cancelled' | 'player_rejected' | 'club_agreed';

export type NegotiationPhase = 'club' | 'player' | 'done';

export interface TransferBonus {
  type: 'appearances' | 'goals' | 'league_position' | 'promotion' | 'no_relegation';
  threshold: number;
  amount: number;
  description: string;
}

export interface TransferOffer {
  id: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  fee: number;
  bonuses: TransferBonus[];
  sellOnPercentage: number;
  offeredSalary: number;
  offeredContractYears: number;
  status: TransferStatus;
  date: string;
  isPlayerSide: boolean;
  counterFee?: number;
  expiresDate: string;
  /** Multi-round negotiation tracking */
  negotiationPhase: NegotiationPhase;
  negotiationRound: number;
  clubAskingPrice?: number;
  playerSalaryDemand?: number;
  playerWillingness?: number;  // 0-100, how willing the player is to join
  rejectionReason?: string;
}

export interface ContractOffer {
  playerId: string;
  teamId: string;
  salary: number;
  contractYears: number;
  releaseClause?: number;
  signingBonus: number;
  bonuses: {
    matchWin: number;
    goalScored: number;
    cleanSheet: number;
    leagueTitle: number;
    cupWin: number;
  };
  status: TransferStatus;
}

export interface LoanDeal {
  id: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  loanFee: number;
  salaryContribution: number;
  buyOption?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Transfer {
  id: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  fee: number;
  bonuses: TransferBonus[];
  sellOnPercentage: number;
  date: string;
  type: 'transfer' | 'free' | 'loan' | 'loan_return' | 'youth_promotion';
}

export interface TransferListing {
  playerId: string;
  teamId: string;
  askingPrice: number;
  listedDate: string;
  isLoanAvailable: boolean;
}

export interface TransferRumor {
  id: string;
  playerId: string;
  interestedTeamId: string;
  currentTeamId: string;
  likelihood: 'low' | 'medium' | 'high';
  date: string;
  resolved: boolean;
}
