import { create } from 'zustand';
import { GameState, DEFAULT_SETTINGS, CupState } from '@/types/game';
import { ManagerProfile } from '@/types/manager';
import { Player, Position } from '@/types/player';
import { TrainingPlan, TrainingType } from '@/types/training';
import { Season, TableEntry } from '@/types/league';
import { loadLeagues, loadTeams } from '@/lib/data-loader';
import { saveGame, updateSave, autoSave, loadGame, SaveGame } from '@/lib/database';
import { generateAllPlayers, generateTraitsForLegend } from '@/lib/player-generator';
import { rollForLegendary, LegendaryPlayerTemplate } from '@/data/legendary-players';
import { generateAllSchedules } from '@/lib/schedule-generator';
import { advanceDay, advanceToNextEvent, AdvanceSummary } from '@/lib/day-advance';
import { generateAllAIManagers } from '@/lib/manager-engine';
import {
  createOffer,
  acceptCounterOffer,
  toggleTransferList,
  respondToIncomingOffer,
  counterIncomingOffer,
  calcStableMarketValue,
} from '@/lib/transfer-engine';
import { acceptSponsorOffer, declineSponsorOffer, cancelSponsor as cancelSponsorAction, negotiateSponsorOffer } from '@/lib/sponsor-engine';
import { initializeCup } from '@/lib/cup-engine';
import { initializeInternational } from '@/lib/international-engine';
import { promoteYouthPlayer, releaseYouthPlayer } from '@/lib/youth-engine';
import { hireStaff as hireStaffAction, fireStaff as fireStaffAction, generateAvailableStaff } from '@/lib/staff-engine';
import { startUpgrade as startUpgradeAction, getUpgradeOptions } from '@/lib/stadium-engine';
import { loanOutPlayer, loanInPlayer } from '@/lib/loan-engine';
import { acceptJobOffer, declineJobOffer } from '@/lib/job-offer-engine';
import { initializeVirtualLeagues } from '@/lib/virtual-league-engine';

interface GameStore {
  gameState: GameState | null;
  isLoaded: boolean;
  currentSaveId: number | null;
  lastAdvanceSummary: AdvanceSummary | null;

  // Actions
  initNewGame: (manager: ManagerProfile, teamId: string) => void;
  loadGameState: (saveId: number) => Promise<boolean>;
  saveCurrentGame: (name?: string) => Promise<void>;
  autoSaveGame: () => Promise<void>;
  advanceOneDay: (liveMatchResult?: import('@/types/match').MatchResult) => void;
  advanceToNext: () => void;
  clearSummary: () => void;

  // Tactics
  updateTactics: (key: 'a' | 'b' | 'c', partial: Partial<import('@/types/tactics').Tactics>) => void;
  setActiveTactic: (key: 'a' | 'b' | 'c') => void;
  autoFillLineup: () => void;

  // Training
  setTraining: (type: TrainingType) => void;

  // Press Conference
  answerPressQuestion: (pressConferenceId: string, questionId: string, answerIdx: number) => void;

  // Random Events
  resolveRandomEvent: (eventId: string, optionId: string) => void;

  // Transfer Actions
  makeTransferOffer: (playerId: string, fee: number, salary: number, contractYears: number, existingOfferId?: string) => { decision: string; reason: string; counterFee?: number; askingPrice?: number; playerWillingness?: number; playerSalaryDemand?: number; negotiationPhase: string };
  acceptCounterOffer: (offerId: string) => void;
  togglePlayerTransferList: (playerId: string) => void;
  respondToIncoming: (offerId: string, accept: boolean) => void;
  counterIncoming: (offerId: string, demandedFee: number) => { result: 'accepted' | 'raised' | 'rejected' | 'withdrawn'; newFee?: number };

  // Scouting
  sendScout: (opts: {
    intensity: 'quick' | 'standard' | 'deep';
    cost: number;
    position: string;
    league: string;
    minOvr: number;
    maxOvr: number;
    minAge: number;
    maxAge: number;
    foot: string;
    nationality: string;
    contractExpiring: boolean;
    traitId: string;
  }) => { found: number; cost: number };

  // Sponsor Actions
  acceptSponsor: (offerId: string) => void;
  declineSponsor: (offerId: string) => void;
  cancelSponsor: (sponsorId: string) => void;
  negotiateSponsor: (offerId: string) => 'raised' | 'unchanged' | 'withdrawn' | 'max_attempts';

  // Youth Actions
  promoteYouth: (youthPlayerId: string) => void;
  releaseYouth: (youthPlayerId: string) => void;

  // Staff Actions
  hireStaff: (staff: import('@/types/staff').StaffMember) => void;
  fireStaff: (staffId: string) => void;
  getAvailableStaff: () => import('@/types/staff').StaffMember[];

  // Stadium Actions
  startStadiumUpgrade: (type: import('@/types/finance').StadiumUpgradeType) => void;
  getStadiumUpgradeOptions: () => import('@/lib/stadium-engine').UpgradeOption[];

  // Loan Actions
  loanOut: (playerId: string, targetTeamId: string, endDate: string, salaryPct: number) => void;
  loanIn: (playerId: string, endDate: string, salaryPct: number) => void;

  // Job Offer Actions
  acceptJob: (offerId: string) => void;
  declineJob: (offerId: string) => void;

  // Pack Actions
  openPack: (packId: string) => void;
  applyPack: (packId: string) => string[];
  dismissPack: (packId: string) => void;
  redeemCard: (cardId: string) => void;

  // News Actions
  markAllNewsRead: () => void;

  // Direct state setter (for preseason, etc.)
  setGameState: (state: GameState) => void;

  // Getters
  getPlayerTeam: () => import('@/types/team').Team | undefined;
  getPlayerTeamPlayers: () => Player[];
  getLeagueTable: (leagueId: string) => TableEntry[];
}

const DEFAULT_TRAINING: TrainingPlan = {
  selectedTraining: 'fitness',
  lastTrainingDate: '',
  weekHistory: [],
};

function createDefaultTactics() {
  return {
    name: 'Standard',
    formation: '4-2-3-1' as const,
    mentality: 'balanced' as const,
    pressingIntensity: 'medium' as const,
    tempo: 'normal' as const,
    passingStyle: 'mixed' as const,
    width: 'normal' as const,
    defensiveLine: 'normal' as const,
    offsideTrap: false,
    effortLevel: 'normal' as const,
    wingPlay: 'balanced' as const,
    markingStyle: 'zonal' as const,
    buildupPlay: 'balanced' as const,
    timeWasting: 'never' as const,
    setPieceTaker: { corners: '', freeKicks: '', penalties: '' },
    captain: '',
    lineup: [],
    substitutes: [],
    playerInstructions: [],
  };
}

function initializeTableForLeague(teams: import('@/types/team').Team[], leagueId: string): TableEntry[] {
  return teams
    .filter((t) => t.league === leagueId)
    .sort((a, b) => (b.reputation ?? 50) - (a.reputation ?? 50))
    .map((t, i) => ({
      position: i + 1,
      teamId: t.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    }));
}

const DEFAULT_CUP_STATE: CupState = {
  rounds: [],
  currentRound: 0,
  isFinished: false,
};

export const useGameStore = create<GameStore>()((set, get) => ({
  gameState: null,
  isLoaded: false,
  currentSaveId: null,
  lastAdvanceSummary: null,

  initNewGame: (manager, teamId) => {
    const leagues = loadLeagues();
    const teams = loadTeams();

    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    const season: Season = {
      number: 1,
      year: '2025/26',
      startDate: '2025-07-01',
      endDate: '2026-06-30',
      currentMatchday: 0,
      isFinished: false,
    };

    const tables: Record<string, TableEntry[]> = {};
    for (const league of leagues) {
      tables[league.id] = initializeTableForLeague(teams, league.id);
    }

    const defaultTactics = createDefaultTactics();

    const allPlayers = generateAllPlayers(teams);
    const teamSalaryTotal = allPlayers
      .filter((p) => p.teamId === teamId)
      .reduce((sum, p) => sum + p.salary, 0);

    const finances: Record<string, import('@/types/finance').FinanceRecord> = {
      [teamId]: {
        balance: team.budget,
        transferBudget: team.budget,
        salaryBudget: team.salaryBudget,
        totalSalaryPerMonth: Math.round(teamSalaryTotal / 12),
        monthlyIncome: [],
        monthlyExpenses: [],
      },
    };

    const gameState: GameState = {
      manager: { ...manager, currentTeamId: teamId },
      currentTeamId: teamId,
      currentDate: '2025-07-01',
      season,
      settings: DEFAULT_SETTINGS,
      leagues,
      teams,
      players: allPlayers,
      schedules: generateAllSchedules(leagues, teams, '2025-07-01'),
      results: [],
      tables,
      tactics: { a: defaultTactics, b: { ...defaultTactics, name: 'Offensiv' }, c: { ...defaultTactics, name: 'Defensiv' } },
      activeTactic: 'a',
      transfers: {
        offers: [],
        completed: [],
        listings: [],
        loans: [],
        rumors: [],
      },
      finances,
      sponsors: [],
      sponsorOffers: [],
      stadiumUpgrades: [],
      training: DEFAULT_TRAINING,
      youthPlayers: [],
      staff: [],
      scoutReports: [],
      news: [
        {
          id: 'welcome-1',
          type: 'general',
          title: `Willkommen bei ${team.name}!`,
          content: `Du hast die Leitung von ${team.name} übernommen. Die Saison 2025/26 steht vor der Tür. Viel Erfolg!`,
          date: '2025-07-01',
          isRead: false,
          relatedTeamId: teamId,
          importance: 'high',
        },
      ],
      achievements: [],
      seasonArchive: [],
      interactions: [],
      promises: [],
      cupState: DEFAULT_CUP_STATE,
      jobOffers: [],
      pressConferences: [],
      randomEvents: [],
      isTransferWindowOpen: true,
      transferWindowType: 'summer',
      preseason: {
        phase: 'camp_selection',
        campDay: 0,
        friendlies: [],
        events: [],
        isCompleted: false,
      },
      aiManagers: generateAllAIManagers(teams, teamId),
      virtualLeagues: initializeVirtualLeagues(),
    };

    // Initialize national cup draw
    const withCup = initializeCup(gameState);
    // Initialize international competition (based on reputation-sorted initial table)
    const withIntl = initializeInternational(withCup);

    set({ gameState: withIntl, isLoaded: true, currentSaveId: null });
  },

  loadGameState: async (saveId) => {
    const save: SaveGame | undefined = await loadGame(saveId);
    if (!save) return false;

    // Backfill aiManagers for saves created before this feature existed
    const loaded = save.gameState;
    if (!loaded.aiManagers) {
      loaded.aiManagers = generateAllAIManagers(loaded.teams, loaded.currentTeamId);
    }
    // Backfill virtualLeagues for saves created before this feature existed
    if (!loaded.virtualLeagues) {
      loaded.virtualLeagues = initializeVirtualLeagues();
    }

    set({
      gameState: loaded,
      isLoaded: true,
      currentSaveId: save.id ?? null,
    });
    return true;
  },

  saveCurrentGame: async (name) => {
    const { gameState, currentSaveId } = get();
    if (!gameState) return;

    if (currentSaveId) {
      // Update existing save
      await updateSave(currentSaveId, gameState);
    } else {
      // Create new save
      const team = gameState.teams.find((t) => t.id === gameState.currentTeamId);
      const saveName = name ?? `${team?.name ?? 'Spielstand'} – Saison ${gameState.season.number}`;
      const newId = await saveGame(saveName, gameState, false);
      set({ currentSaveId: newId });
    }
  },

  autoSaveGame: async () => {
    const { gameState } = get();
    if (!gameState) return;
    await autoSave(gameState);
  },

  setGameState: (state) => {
    set({ gameState: state });
  },

  advanceOneDay: (liveMatchResult?) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: advanceDay(gameState, liveMatchResult) });
  },

  advanceToNext: () => {
    const { gameState } = get();
    if (!gameState) return;
    const { state: newState, summary } = advanceToNextEvent(gameState);
    set({ gameState: newState, lastAdvanceSummary: summary });
  },

  clearSummary: () => {
    set({ lastAdvanceSummary: null });
  },

  makeTransferOffer: (playerId, fee, salary, contractYears, existingOfferId?) => {
    const { gameState } = get();
    if (!gameState) return { decision: 'rejected', reason: 'Kein Spielstand', negotiationPhase: 'club' as const };
    const { newState, evaluation } = createOffer(gameState, playerId, fee, salary, contractYears, existingOfferId);
    set({ gameState: newState });
    return evaluation;
  },

  acceptCounterOffer: (offerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: acceptCounterOffer(gameState, offerId) });
  },

  togglePlayerTransferList: (playerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: toggleTransferList(gameState, playerId) });
  },

  respondToIncoming: (offerId, accept) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: respondToIncomingOffer(gameState, offerId, accept) });
  },

  counterIncoming: (offerId, demandedFee) => {
    const { gameState } = get();
    if (!gameState) return { result: 'rejected' as const };
    const { state: newState, result, newFee } = counterIncomingOffer(gameState, offerId, demandedFee);
    set({ gameState: newState });
    return { result, newFee };
  },

  acceptSponsor: (offerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: acceptSponsorOffer(gameState, offerId) });
  },

  declineSponsor: (offerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: declineSponsorOffer(gameState, offerId) });
  },

  cancelSponsor: (sponsorId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: cancelSponsorAction(gameState, sponsorId) });
  },

  negotiateSponsor: (offerId) => {
    const { gameState } = get();
    if (!gameState) return 'unchanged';
    const { state: newState, result } = negotiateSponsorOffer(gameState, offerId);
    set({ gameState: newState });
    return result;
  },

  promoteYouth: (youthPlayerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: promoteYouthPlayer(gameState, youthPlayerId) });
  },

  releaseYouth: (youthPlayerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: releaseYouthPlayer(gameState, youthPlayerId) });
  },

  hireStaff: (staff) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: hireStaffAction(gameState, staff) });
  },

  fireStaff: (staffId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: fireStaffAction(gameState, staffId) });
  },

  getAvailableStaff: () => {
    const { gameState } = get();
    if (!gameState) return [];
    return generateAvailableStaff(gameState);
  },

  startStadiumUpgrade: (type) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: startUpgradeAction(gameState, type) });
  },

  getStadiumUpgradeOptions: () => {
    const { gameState } = get();
    if (!gameState) return [];
    return getUpgradeOptions(gameState);
  },

  loanOut: (playerId, targetTeamId, endDate, salaryPct) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: loanOutPlayer(gameState, playerId, targetTeamId, endDate, salaryPct) });
  },

  loanIn: (playerId, endDate, salaryPct) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: loanInPlayer(gameState, playerId, endDate, salaryPct) });
  },

  acceptJob: (offerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: acceptJobOffer(gameState, offerId) });
  },

  declineJob: (offerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: declineJobOffer(gameState, offerId) });
  },

  openPack: (packId: string) => {
    const { gameState } = get();
    if (!gameState) return;
    const packs = (gameState.pendingPacks ?? []).map(p =>
      p.id === packId ? { ...p, isOpened: true } : p
    );
    set({ gameState: { ...gameState, pendingPacks: packs } });
  },

  applyPack: (packId: string): string[] => {
    const { gameState } = get();
    if (!gameState) return [];
    // Convert pack rewards to collectible cards in inventory
    const { packRewardsToCards } = require('@/lib/pack-engine');
    const pack = (gameState.pendingPacks ?? []).find(p => p.id === packId);
    if (!pack || !pack.isOpened) return [];
    const newCards = packRewardsToCards(pack.rewards, pack.type, pack.earnedDate);
    const cardIds = newCards.map((c: import('@/types/packs').CollectibleCard) => c.id);
    const existingCards = gameState.cardInventory ?? [];
    // Mark pack rewards as applied (so PackOpener shows "collected")
    const updatedPacks = (gameState.pendingPacks ?? []).map(p =>
      p.id === packId
        ? { ...p, rewards: p.rewards.map((r: import('@/types/packs').PackReward) => ({ ...r, isApplied: true })) }
        : p
    );
    set({ gameState: { ...gameState, cardInventory: [...existingCards, ...newCards], pendingPacks: updatedPacks } });
    return cardIds;
  },

  dismissPack: (packId: string) => {
    const { gameState } = get();
    if (!gameState) return;
    const packs = (gameState.pendingPacks ?? []).filter(p => p.id !== packId);
    set({ gameState: { ...gameState, pendingPacks: packs } });
  },

  redeemCard: (cardId: string) => {
    const { gameState } = get();
    if (!gameState) return;
    const { redeemCard: doRedeem } = require('@/lib/pack-engine');
    const updated = doRedeem(gameState, cardId);
    set({ gameState: updated });
  },

  markAllNewsRead: () => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        news: gameState.news.map(n => n.isRead ? n : { ...n, isRead: true }),
      },
    });
  },

  answerPressQuestion: (pressConferenceId, questionId, answerIdx) => {
    const { gameState } = get();
    if (!gameState) return;

    const updatedPCs = gameState.pressConferences.map((pc) => {
      if (pc.id !== pressConferenceId) return pc;
      const newAnswers = [...pc.answers, { questionId, answerId: answerIdx }];
      const allAnswered = newAnswers.length >= pc.questions.length;
      return { ...pc, answers: newAnswers, isCompleted: allAnswered };
    });

    // Apply morale effects from the answer
    const pc = gameState.pressConferences.find((p) => p.id === pressConferenceId);
    const question = pc?.questions.find((q) => q.id === questionId);
    const answer = question?.options[answerIdx];

    let updatedPlayers = gameState.players;
    let updatedTeams = gameState.teams;
    let updatedNews = [...gameState.news];
    if (answer) {
      // Apply morale effect to all team players
      updatedPlayers = gameState.players.map((p) => {
        if (p.teamId !== gameState.currentTeamId) return p;
        return {
          ...p,
          morale: Math.max(10, Math.min(100, p.morale + answer.moraleEffect)),
        };
      });

      // Apply fan effect (attendance boost/penalty via fans.loyalty)
      if (answer.fanEffect && answer.fanEffect !== 0) {
        updatedTeams = gameState.teams.map((t) => {
          if (t.id !== gameState.currentTeamId) return t;
          return {
            ...t,
            fans: {
              ...t.fans,
              loyalty: Math.max(10, Math.min(100, t.fans.loyalty + answer.fanEffect)),
            },
          };
        });
      }

      // Apply reputation effect
      if (answer.reputationEffect && answer.reputationEffect !== 0) {
        updatedTeams = updatedTeams.map((t) => {
          if (t.id !== gameState.currentTeamId) return t;
          return {
            ...t,
            reputation: Math.max(1, Math.min(100, (t.reputation ?? 50) + answer.reputationEffect)),
          };
        });
      }

      // Generate news about PK result
      const toneLabels: Record<string, string> = {
        confident: 'selbstbewusst', honest: 'ehrlich', defensive: 'zurückhaltend',
        provocative: 'provokant', motivating: 'motivierend',
      };
      const toneLabel = toneLabels[answer.tone] ?? answer.tone;
      const effects: string[] = [];
      if (answer.moraleEffect > 3) effects.push('Moral der Mannschaft steigt deutlich');
      else if (answer.moraleEffect > 0) effects.push('Moral leicht verbessert');
      else if (answer.moraleEffect < 0) effects.push('Moral sinkt');
      if (answer.fanEffect > 3) effects.push('Fans begeistert');
      else if (answer.fanEffect < 0) effects.push('Fans enttäuscht');
      if (answer.reputationEffect > 1) effects.push('Ansehen gestiegen');
      else if (answer.reputationEffect < -2) effects.push('Ansehen gesunken');
      if (answer.fineRisk) effects.push('⚠️ Mögliche Geldstrafe vom Verband');

      updatedNews.push({
        id: `pk-result-${pressConferenceId}-${questionId}`,
        type: 'press' as const,
        title: `PK: ${toneLabel}e Antwort`,
        content: effects.length > 0 ? effects.join(' | ') : 'Keine besonderen Auswirkungen.',
        date: gameState.currentDate,
        isRead: false,
        relatedTeamId: gameState.currentTeamId,
        importance: (Math.abs(answer.moraleEffect) > 5 || answer.fineRisk) ? 'high' as const : 'low' as const,
      });
    }

    set({
      gameState: {
        ...gameState,
        pressConferences: updatedPCs,
        players: updatedPlayers,
        teams: updatedTeams,
        news: updatedNews,
      },
    });
  },

  resolveRandomEvent: (eventId, optionId) => {
    const { gameState } = get();
    if (!gameState) return;

    const event = (gameState.randomEvents ?? []).find(e => e.id === eventId);
    if (!event || event.isResolved) return;

    const option = event.options.find(o => o.id === optionId);
    if (!option) return;

    // Mark event as resolved
    const updatedEvents = (gameState.randomEvents ?? []).map(e =>
      e.id === eventId ? { ...e, isResolved: true, chosenOptionId: optionId } : e
    );

    // Apply effects
    let updatedPlayers = gameState.players;
    let updatedTeams = gameState.teams;
    let updatedFinances = { ...gameState.finances };

    // Morale effect on all team players
    if (option.effects.moraleAll) {
      updatedPlayers = updatedPlayers.map(p => {
        if (p.teamId !== gameState.currentTeamId) return p;
        return { ...p, morale: Math.max(10, Math.min(100, p.morale + option.effects.moraleAll!)) };
      });
    }

    // Fan loyalty effect
    if (option.effects.fanLoyalty) {
      updatedTeams = updatedTeams.map(t => {
        if (t.id !== gameState.currentTeamId) return t;
        return { ...t, fans: { ...t.fans, loyalty: Math.max(10, Math.min(100, t.fans.loyalty + option.effects.fanLoyalty!)) } };
      });
    }

    // Reputation effect
    if (option.effects.reputation) {
      updatedTeams = updatedTeams.map(t => {
        if (t.id !== gameState.currentTeamId) return t;
        return { ...t, reputation: Math.max(1, Math.min(100, (t.reputation ?? 50) + option.effects.reputation!)) };
      });
    }

    // Attendance modifier → convert to fan loyalty change (loyalty drives attendance)
    if (option.effects.attendanceModifier && option.effects.attendanceModifier !== 1) {
      const loyaltyDelta = Math.round((option.effects.attendanceModifier - 1) * 50); // 0.85 → -7.5, 1.1 → +5
      updatedTeams = updatedTeams.map(t => {
        if (t.id !== gameState.currentTeamId) return t;
        return { ...t, fans: { ...t.fans, loyalty: Math.max(10, Math.min(100, t.fans.loyalty + loyaltyDelta)) } };
      });
    }

    // Budget change
    if (option.effects.budgetChange) {
      const teamFinances = updatedFinances[gameState.currentTeamId];
      if (teamFinances) {
        updatedFinances = {
          ...updatedFinances,
          [gameState.currentTeamId]: {
            ...teamFinances,
            balance: teamFinances.balance + option.effects.budgetChange,
          },
        };
      }
    }

    // Generate news about the decision
    const updatedNews = [...gameState.news, {
      id: `rnd-result-${eventId}`,
      type: 'general' as const,
      title: `${event.icon} ${event.title}`,
      content: `Entscheidung: ${option.text}`,
      date: gameState.currentDate,
      isRead: false,
      relatedTeamId: gameState.currentTeamId,
      importance: 'medium' as const,
    }];

    set({
      gameState: {
        ...gameState,
        randomEvents: updatedEvents,
        players: updatedPlayers,
        teams: updatedTeams,
        finances: updatedFinances,
        news: updatedNews,
      },
    });
  },

  setTraining: (type) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        training: { ...gameState.training, selectedTraining: type },
      },
    });
  },

  updateTactics: (key, partial) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        tactics: {
          ...gameState.tactics,
          [key]: { ...gameState.tactics[key], ...partial },
        },
      },
    });
  },

  setActiveTactic: (key) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: { ...gameState, activeTactic: key } });
  },

  autoFillLineup: () => {
    const { gameState } = get();
    if (!gameState) return;
    const ovr = (p: Player) => {
      const a = p.attributes;
      if (p.position === 'TW') return a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1;
      if (['IV', 'LV', 'RV'].includes(p.position)) return a.positioning * 0.2 + a.strength * 0.15 + a.heading * 0.1 + a.pace * 0.1 + a.passing * 0.1 + a.aggression * 0.1 + a.composure * 0.1 + a.stamina * 0.1 + a.workRate * 0.05;
      return a.passing * 0.12 + a.shooting * 0.12 + a.dribbling * 0.1 + a.pace * 0.1 + a.stamina * 0.1 + a.composure * 0.1 + a.vision * 0.1 + a.ballControl * 0.1 + a.finishing * 0.08 + a.strength * 0.08;
    };
    const teamPlayers = gameState.players.filter(
      (p) => p.teamId === gameState.currentTeamId && !p.injury
    );
    const gk = teamPlayers
      .filter((p) => p.position === 'TW')
      .sort((a, b) => ovr(b) - ovr(a));
    const outfield = teamPlayers
      .filter((p) => p.position !== 'TW')
      .sort((a, b) => ovr(b) - ovr(a));
    const autoLineup = [...gk.slice(0, 1), ...outfield.slice(0, 10)].map((p) => p.id);
    const key = gameState.activeTactic ?? 'a';
    set({
      gameState: {
        ...gameState,
        tactics: {
          ...gameState.tactics,
          [key]: { ...gameState.tactics[key], lineup: autoLineup },
        },
      },
    });
  },

  sendScout: (opts) => {
    const { gameState } = get();
    if (!gameState) return { found: 0, cost: 0 };

    const { intensity, cost, position, minOvr, maxOvr, minAge, maxAge, foot, nationality, traitId } = opts;

    // Deduct cost from transfer budget
    const finances = gameState.finances[gameState.currentTeamId];
    if (!finances || finances.transferBudget < cost) return { found: 0, cost: 0 };

    // Scout cooldown: max 2 searches per week, reset on Mondays
    const today = gameState.currentDate;
    const dayOfWeek = new Date(today).getDay(); // 0=Sun, 1=Mon
    const scoutsUsed = gameState.scoutsThisWeek ?? 0;
    const lastReset = gameState.lastScoutResetDate ?? '';
    const needsReset = dayOfWeek === 1 && lastReset !== today;
    const currentScouts = needsReset ? 0 : scoutsUsed;
    if (currentScouts >= 2) return { found: 0, cost: 0 };

    // Intensity determines how many players found + report quality
    const maxResults = intensity === 'deep' ? 12 : intensity === 'standard' ? 6 : 3;
    const qualityRange = intensity === 'deep' ? [7, 10] : intensity === 'standard' ? [5, 8] : [3, 6];

    // OVR cap by team reputation — prevents low-rep teams from finding world-class players
    const myTeam = gameState.teams.find(t => t.id === gameState.currentTeamId);
    const teamRep = myTeam?.reputation ?? 50;
    const ovrCap = Math.round(teamRep * 0.9 + 15) + (intensity === 'deep' ? 5 : 0);

    const calcOvr = (p: Player) => {
      const a = p.attributes;
      if (p.position === 'TW') return Math.round(a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1);
      if (['IV', 'LV', 'RV'].includes(p.position)) return Math.round(a.positioning * 0.2 + a.strength * 0.15 + a.heading * 0.1 + a.pace * 0.1 + a.passing * 0.1 + a.aggression * 0.1 + a.composure * 0.1 + a.stamina * 0.1 + a.workRate * 0.05);
      return Math.round(a.passing * 0.12 + a.shooting * 0.12 + a.dribbling * 0.1 + a.pace * 0.1 + a.stamina * 0.1 + a.composure * 0.1 + a.vision * 0.1 + a.ballControl * 0.1 + a.finishing * 0.08 + a.strength * 0.08);
    };

    const getAge = (dob: string) => {
      const b = new Date(dob); const r = new Date(gameState.currentDate);
      let a = r.getFullYear() - b.getFullYear();
      if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) a--;
      return a;
    };

    // Search REAL players from other teams (not the player's team, not loaned, not amateur)
    const amateurTeamIds = new Set(gameState.teams.filter(t => t.league === 'amateur').map(t => t.id));
    let candidates = gameState.players.filter(p => {
      if (p.teamId === gameState.currentTeamId) return false;
      if (!p.teamId || amateurTeamIds.has(p.teamId)) return false;
      if (p.isLoaned) return false;
      const ovr = calcOvr(p);
      const age = getAge(p.dateOfBirth);
      if (position && position !== 'all' && p.position !== position) return false;
      if (ovr > ovrCap) return false;
      if (minOvr && ovr < minOvr) return false;
      if (maxOvr && ovr > maxOvr) return false;
      if (minAge && age < minAge) return false;
      if (maxAge && age > maxAge) return false;
      if (foot && foot !== 'all' && p.foot !== foot) return false;
      if (nationality && nationality !== 'all' && p.nationality !== nationality) return false;
      if (traitId && traitId !== 'all' && !p.traits?.some(t => t.traitId === traitId)) return false;
      return true;
    });

    // Shuffle and limit to maxResults (different results each search)
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    let _sh = seed;
    const rngShuffle = () => { _sh = (_sh * 16807 + 0) % 2147483647; return _sh / 2147483647; };
    candidates = candidates.sort(() => rngShuffle() - 0.5).slice(0, maxResults);

    // 1% chance per search to spawn a real legendary icon
    let _s = seed + 7;
    const rng = () => { _s = (_s * 16807 + 0) % 2147483647; return (_s & 0x7fffffff) / 0x7fffffff; };
    const legendTemplate = rollForLegendary(rng, 0.02);
    let legendPlayer: Player | null = null;

    if (legendTemplate) {
      const alreadyExists = gameState.players.some(p => p.id === legendTemplate.id);
      if (!alreadyExists) {
        const birthYear = new Date(gameState.currentDate).getFullYear() - legendTemplate.primeAge;
        legendPlayer = {
          id: legendTemplate.id,
          firstName: legendTemplate.firstName,
          lastName: legendTemplate.lastName,
          dateOfBirth: `${birthYear}-06-15`,
          nationality: legendTemplate.nationality,
          position: legendTemplate.position,
          secondaryPositions: legendTemplate.secondaryPositions,
          foot: legendTemplate.foot,
          height: legendTemplate.height,
          weight: legendTemplate.weight,
          shirtNumber: 10,
          teamId: '',
          contractUntil: '',
          salary: legendTemplate.salary,
          marketValue: legendTemplate.marketValue,
          attributes: legendTemplate.attributes,
          condition: 95, morale: 90, form: 85, fatigue: 0, matchPractice: 70, injuryProne: 5,
          suspended: false, suspendedMatches: 0,
          potential: legendTemplate.tier === 'diamond' ? 97 : legendTemplate.tier === 'gold' ? 92 : legendTemplate.tier === 'silver' ? 87 : 82,
          growthRate: 0.2,
          level: legendTemplate.tier === 'diamond' ? 50 : legendTemplate.tier === 'gold' ? 40 : legendTemplate.tier === 'silver' ? 30 : 20,
          xp: 0, xpToNextLevel: 1000, trainingBoosts: [], traits: [], // traits assigned below
          stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, avgRating: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0 },
          formHistory: [], ratingHistory: [],
          isLoaned: false, isTransferListed: true, transferRequested: false,
          isIcon: legendTemplate.retired !== false,
          isLegend: legendTemplate.retired !== false && (legendTemplate.tier === 'diamond' || legendTemplate.tier === 'gold'),
          legendReason: legendTemplate.retired === false ? `Prime-Version: ${legendTemplate.bio}` : legendTemplate.bio,
          legendaryTier: legendTemplate.tier,
          legendaryBio: legendTemplate.bio,
        };
        // Assign legendary traits — legends should be the best in the game
        legendPlayer.traits = generateTraitsForLegend(legendPlayer, legendTemplate.tier);
      }
    }

    // Combine: legend (if spawned) + real players from other teams
    const found: Player[] = legendPlayer ? [legendPlayer, ...candidates] : candidates;

    // Create scout reports with stable market values
    const newReports = found.map((p) => {
      const ovr = calcOvr(p);
      const q = qualityRange[0] + Math.floor(Math.random() * (qualityRange[1] - qualityRange[0] + 1));
      const stableValue = calcStableMarketValue(p, gameState.currentDate);

      // Attribute jitter: Quick ±8, Standard ±4, Deep exact
      // This makes low-quality reports less precise
      const jitter = intensity === 'deep' ? 0 : intensity === 'standard' ? 4 : 8;

      // Determine strengths and weaknesses from attributes
      const a = p.attributes;
      const attrEntries = Object.entries(a).filter(([, v]) => typeof v === 'number') as [string, number][];
      const sorted = [...attrEntries].sort((x, y) => y[1] - x[1]);
      const strengths = sorted.slice(0, 3).map(([k]) => k);
      const weaknesses = sorted.slice(-3).map(([k]) => k);

      // Recommendation based on OVR + age + potential
      const age = getAge(p.dateOfBirth);
      let rec: 'sign_immediately' | 'monitor' | 'not_recommended' = 'monitor';
      if (ovr >= 75 || (ovr >= 68 && age <= 22 && (p.potential ?? ovr) >= 78)) rec = 'sign_immediately';
      else if (ovr < 60 && (p.potential ?? ovr) < 70) rec = 'not_recommended';

      // OVR display: Quick/Standard show range, Deep shows exact
      const ovrRange = intensity === 'deep' ? undefined : { min: Math.max(1, ovr - (intensity === 'standard' ? 3 : 5)), max: Math.min(99, ovr + (intensity === 'standard' ? 4 : 7)) };

      return {
        id: `scout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${p.id}`,
        scoutId: 'default',
        playerId: p.id,
        type: 'player' as const,
        date: gameState.currentDate,
        quality: q,
        recommendation: rec,
        estimatedValue: stableValue,
        potentialAssessment: (p.potential >= 85 ? 'world_class' : p.potential >= 75 ? 'excellent' : p.potential >= 65 ? 'promising' : 'average') as 'low' | 'average' | 'promising' | 'excellent' | 'world_class',
        strengths,
        weaknesses,
        attributeJitter: jitter,
        ovrRange,
      };
    });

    const updatedFinances = {
      ...gameState.finances,
      [gameState.currentTeamId]: {
        ...finances,
        transferBudget: finances.transferBudget - cost,
      },
    };

    // Replace previous scout results with new ones (fresh each search)
    // Only add the legendary player if spawned (real players already exist in state)
    const updatedPlayers = legendPlayer
      ? [...gameState.players, legendPlayer]
      : gameState.players;

    // D12: Store the filter fingerprint so we can detect duplicate searches
    const filterFingerprint = JSON.stringify({
      intensity, position: position ?? 'all',
      minOvr: minOvr ?? '', maxOvr: maxOvr ?? '',
      minAge: minAge ?? '', maxAge: maxAge ?? '',
      foot: foot ?? 'all', nationality: nationality ?? 'all',
      traitId: traitId ?? 'all',
    });

    set({
      gameState: {
        ...gameState,
        scoutReports: newReports,
        players: updatedPlayers,
        finances: updatedFinances,
        lastScoutFilter: filterFingerprint,
        scoutsThisWeek: (needsReset ? 0 : (gameState.scoutsThisWeek ?? 0)) + 1,
        lastScoutResetDate: needsReset ? today : (gameState.lastScoutResetDate ?? today),
      },
    });

    return { found: newReports.length, cost };
  },

  getPlayerTeam: () => {
    const { gameState } = get();
    if (!gameState) return undefined;
    return gameState.teams.find((t) => t.id === gameState.currentTeamId);
  },

  getPlayerTeamPlayers: () => {
    const { gameState } = get();
    if (!gameState) return [];
    return gameState.players.filter((p) => p.teamId === gameState.currentTeamId);
  },

  getLeagueTable: (leagueId) => {
    const { gameState } = get();
    if (!gameState) return [];
    return gameState.tables[leagueId] ?? [];
  },
}));
