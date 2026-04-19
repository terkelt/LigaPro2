/**
 * Loan Engine — handles loaning players out and bringing them in on loan.
 *
 * Loan out: Player stays in your squad data but is flagged as loaned.
 *   - You save salary (partially or fully)
 *   - Player gains experience at the other club
 *   - Returns at loan end date
 *
 * Loan in: AI offers players on loan to you.
 *   - You pay a portion of their salary
 *   - Player is added to your squad temporarily
 *   - Returns to parent club at loan end
 */
import { GameState } from '@/types/game';
import { LoanDeal } from '@/types/transfer';
import { Player } from '@/types/player';
import { NewsItem } from '@/types/news';

function generateId(): string {
  return 'loan-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Loan out one of your players to an AI team.
 */
export function loanOutPlayer(
  state: GameState,
  playerId: string,
  targetTeamId: string,
  endDate: string,
  salaryPercentage: number, // 0-100, how much the borrowing club pays
): GameState {
  if (!state.isTransferWindowOpen) return state;

  const player = state.players.find(p => p.id === playerId);
  if (!player || player.teamId !== state.currentTeamId) return state;
  if (player.isLoaned) return state;

  const targetTeam = state.teams.find(t => t.id === targetTeamId);
  if (!targetTeam) return state;

  const loanFee = Math.round(player.salary * (salaryPercentage / 100));

  const deal: LoanDeal = {
    id: generateId(),
    playerId,
    fromTeamId: state.currentTeamId,
    toTeamId: targetTeamId,
    startDate: state.currentDate,
    endDate,
    salaryContribution: salaryPercentage,
    loanFee: 0,
    isActive: true,
  };

  const updatedPlayers = state.players.map(p => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      isLoaned: true,
      loanedTo: targetTeamId,
      teamId: targetTeamId, // temporarily move to target team
    };
  });

  const news: NewsItem = {
    id: `loan-out-${deal.id}`,
    type: 'transfer',
    title: `Leihe: ${player.firstName} ${player.lastName} → ${targetTeam.name}`,
    content: `${player.firstName} ${player.lastName} wurde bis ${new Date(endDate).toLocaleDateString('de-DE')} an ${targetTeam.name} verliehen. Gehaltsübernahme: ${salaryPercentage}%.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    relatedPlayerId: playerId,
    importance: 'medium',
  };

  return {
    ...state,
    players: updatedPlayers,
    transfers: {
      ...state.transfers,
      loans: [...state.transfers.loans, deal],
    },
    news: [...state.news, news],
  };
}

/**
 * Loan in a player from an AI team.
 */
export function loanInPlayer(
  state: GameState,
  playerId: string,
  endDate: string,
  salaryPercentage: number,
): GameState {
  if (!state.isTransferWindowOpen) return state;

  const player = state.players.find(p => p.id === playerId);
  if (!player || player.teamId === state.currentTeamId) return state;
  if (player.isLoaned) return state;

  const fromTeam = state.teams.find(t => t.id === player.teamId);
  if (!fromTeam) return state;

  const deal: LoanDeal = {
    id: generateId(),
    playerId,
    fromTeamId: player.teamId,
    toTeamId: state.currentTeamId,
    startDate: state.currentDate,
    endDate,
    salaryContribution: salaryPercentage,
    loanFee: 0,
    isActive: true,
  };

  const updatedPlayers = state.players.map(p => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      isLoaned: true,
      loanedFrom: p.teamId,
      teamId: state.currentTeamId,
    };
  });

  const news: NewsItem = {
    id: `loan-in-${deal.id}`,
    type: 'transfer',
    title: `Leihe: ${player.firstName} ${player.lastName} ← ${fromTeam.name}`,
    content: `${player.firstName} ${player.lastName} wurde von ${fromTeam.name} bis ${new Date(endDate).toLocaleDateString('de-DE')} ausgeliehen. Gehaltsübernahme: ${salaryPercentage}%.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    relatedPlayerId: playerId,
    importance: 'medium',
  };

  return {
    ...state,
    players: updatedPlayers,
    transfers: {
      ...state.transfers,
      loans: [...state.transfers.loans, deal],
    },
    news: [...state.news, news],
  };
}

/**
 * Check for expired loans and return players. Called from day-advance.
 */
export function checkLoanExpiry(state: GameState): GameState {
  const activeLoans = state.transfers.loans.filter(l => l.isActive);
  if (activeLoans.length === 0) return state;

  let changed = false;
  const expiredLoans: LoanDeal[] = [];
  const updatedLoans = state.transfers.loans.map(l => {
    if (!l.isActive) return l;
    if (l.endDate <= state.currentDate) {
      changed = true;
      expiredLoans.push(l);
      return { ...l, isActive: false };
    }
    return l;
  });

  if (!changed) return state;

  // Return players to their original teams
  const news: NewsItem[] = [];
  const updatedPlayers = state.players.map(p => {
    const expiredLoan = expiredLoans.find(l => l.playerId === p.id);
    if (!expiredLoan) return p;

    const originalTeamId = expiredLoan.fromTeamId;
    const originalTeam = state.teams.find(t => t.id === originalTeamId);

    news.push({
      id: `loan-return-${expiredLoan.id}`,
      type: 'transfer',
      title: `Leihe beendet: ${p.firstName} ${p.lastName}`,
      content: `${p.firstName} ${p.lastName} kehrt von der Leihe zurück zu ${originalTeam?.name ?? 'seinem Verein'}.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      relatedPlayerId: p.id,
      importance: 'medium',
    });

    return {
      ...p,
      teamId: originalTeamId,
      isLoaned: false,
      loanedFrom: undefined,
      loanedTo: undefined,
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    transfers: { ...state.transfers, loans: updatedLoans },
    news: [...state.news, ...news],
  };
}

/**
 * Generate AI loan offers for the player's team.
 * Called periodically during transfer windows.
 */
export function generateLoanOffers(state: GameState): GameState {
  if (!state.isTransferWindowOpen) return state;

  const d = new Date(state.currentDate);
  // Only check on certain days
  if (d.getDate() % 5 !== 0) return state;

  const myTeam = state.teams.find(t => t.id === state.currentTeamId);
  if (!myTeam) return state;

  // Find players from other teams that could be loaned
  const loanCandidates = state.players.filter(p => {
    if (p.teamId === state.currentTeamId) return false;
    if (p.isLoaned) return false;
    if (p.isTransferListed) return false;
    // Young players or squad players are more likely to be available
    const age = new Date(state.currentDate).getFullYear() - new Date(p.dateOfBirth).getFullYear();
    return age <= 23 || Math.random() < 0.1;
  });

  if (loanCandidates.length === 0) return state;

  // Pick 0-2 random candidates
  const count = Math.random() < 0.3 ? (Math.random() < 0.5 ? 2 : 1) : 0;
  if (count === 0) return state;

  const shuffled = [...loanCandidates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  const seasonEnd = state.season.endDate ?? `${parseInt(state.season.year.split('/')[0]) + 1}-06-30`;

  const news: NewsItem[] = selected.map(p => {
    const fromTeam = state.teams.find(t => t.id === p.teamId);
    return {
      id: `loan-offer-${p.id}-${Date.now()}`,
      type: 'transfer' as const,
      title: `Leihangebot: ${p.firstName} ${p.lastName}`,
      content: `${fromTeam?.name ?? 'Ein Verein'} bietet ${p.firstName} ${p.lastName} (${p.position}, OVR ~${Math.round((p.attributes.pace + p.attributes.shooting + p.attributes.passing + p.attributes.dribbling) / 4)}) zur Leihe an. Gehalt: ${fmtVal(p.salary)}/Jahr.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      relatedPlayerId: p.id,
      importance: 'low' as const,
    };
  });

  return {
    ...state,
    news: [...state.news, ...news],
  };
}

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}
