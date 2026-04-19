/**
 * Job Offer Engine — generates job offers from other clubs for the manager.
 *
 * Offers are generated based on:
 *  - Manager reputation/level
 *  - Current team performance
 *
 * Accepting a job offer switches the player's team.
 * Expired offers are simply filtered by expiresDate.
 */
import { GameState } from '@/types/game';
import { JobOffer } from '@/types/manager';
import { NewsItem } from '@/types/news';

function generateId(): string {
  return 'job-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function isOfferActive(o: JobOffer, currentDate: string): boolean {
  return o.expiresDate > currentDate;
}

/**
 * Generate job offers periodically. Called from day-advance.
 */
export function generateJobOffers(state: GameState): GameState {
  const d = new Date(state.currentDate);
  if (d.getDate() !== 1) return state;

  const activeOffers = state.jobOffers.filter(o => isOfferActive(o, state.currentDate));
  if (activeOffers.length >= 3) return state;

  const manager = state.manager;
  const managerLevel = manager.level ?? 1;

  const chance = 0.05 + managerLevel * 0.03;
  if (Math.random() > chance) return state;

  const candidateTeams = state.teams.filter(t => {
    if (t.id === state.currentTeamId) return false;
    if (t.id.startsWith('amateur')) return false;
    return true;
  });

  if (candidateTeams.length === 0) return state;

  const team = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];
  const league = state.leagues.find(l => l.id === team.league);

  const baseSalary = league?.tier === 1 ? 2_000_000 : league?.tier === 2 ? 800_000 : 300_000;
  const salary = Math.round(baseSalary * (0.7 + managerLevel * 0.1) * (0.85 + Math.random() * 0.3));
  const contractYears = 2 + Math.floor(Math.random() * 2);

  const expiresDate = new Date(state.currentDate);
  expiresDate.setDate(expiresDate.getDate() + 14);

  const offer: JobOffer = {
    id: generateId(),
    teamId: team.id,
    teamName: team.name,
    leagueId: league?.id ?? '',
    salary,
    contractYears,
    budget: team.budget,
    expectations: league?.tier === 1 ? 'Top 8' : league?.tier === 2 ? 'Aufstieg' : 'Klassenerhalt',
    date: state.currentDate,
    expiresDate: expiresDate.toISOString().split('T')[0],
  };

  const news: NewsItem = {
    id: `job-offer-${offer.id}`,
    type: 'general',
    title: `Jobangebot: ${team.name}`,
    content: `${team.name} (${league?.name ?? '?'}) bietet dir einen ${contractYears}-Jahres-Vertrag mit ${fmtVal(salary)}/Jahr an. Budget: ${fmtVal(team.budget)}.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  };

  return {
    ...state,
    jobOffers: [...state.jobOffers, offer],
    news: [...state.news, news],
  };
}

/**
 * Accept a job offer — switch the manager's team.
 */
export function acceptJobOffer(state: GameState, offerId: string): GameState {
  const offer = state.jobOffers.find(o => o.id === offerId);
  if (!offer || !isOfferActive(offer, state.currentDate)) return state;

  const newTeam = state.teams.find(t => t.id === offer.teamId);
  if (!newTeam) return state;

  const contractEnd = new Date(state.currentDate);
  contractEnd.setFullYear(contractEnd.getFullYear() + offer.contractYears);

  const oldTeamId = state.currentTeamId;
  const oldTeam = state.teams.find(t => t.id === oldTeamId);
  const oldLeague = state.leagues.find(l => l.id === oldTeam?.league);

  const updatedManager = {
    ...state.manager,
    currentTeamId: offer.teamId,
    salary: offer.salary,
    contractUntil: contractEnd.toISOString().split('T')[0],
    career: [
      ...state.manager.career,
      {
        teamId: oldTeamId,
        teamName: oldTeam?.name ?? '',
        leagueId: oldLeague?.id ?? '',
        startDate: state.manager.contractUntil, // approximate
        endDate: state.currentDate,
        reason: 'resigned' as const,
      },
    ],
  };

  // Remove accepted offer, expire all others
  const updatedOffers = state.jobOffers.filter(o => o.id !== offerId);

  const news: NewsItem[] = [
    {
      id: `job-accepted-${offerId}`,
      type: 'milestone',
      title: `Vereinswechsel: ${newTeam.name}!`,
      content: `Du hast das Angebot von ${newTeam.name} angenommen. Neuer Vertrag: ${offer.contractYears} Jahre, ${fmtVal(offer.salary)}/Jahr.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: offer.teamId,
      importance: 'high',
    },
  ];

  return {
    ...state,
    currentTeamId: offer.teamId,
    manager: updatedManager,
    jobOffers: updatedOffers,
    news: [...state.news, ...news],
  };
}

/**
 * Decline a job offer — remove it.
 */
export function declineJobOffer(state: GameState, offerId: string): GameState {
  return {
    ...state,
    jobOffers: state.jobOffers.filter(o => o.id !== offerId),
  };
}

/**
 * Clean up expired job offers. Called from day-advance.
 */
export function cleanupExpiredOffers(state: GameState): GameState {
  const before = state.jobOffers.length;
  const filtered = state.jobOffers.filter(o => isOfferActive(o, state.currentDate));
  if (filtered.length === before) return state;
  return { ...state, jobOffers: filtered };
}

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}
