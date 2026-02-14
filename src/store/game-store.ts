import { create } from 'zustand';
import { GameState, DEFAULT_SETTINGS, CupState } from '@/types/game';
import { ManagerProfile } from '@/types/manager';
import { Player } from '@/types/player';
import { TrainingPlan, TrainingType } from '@/types/training';
import { Season, TableEntry } from '@/types/league';
import { loadLeagues, loadTeams } from '@/lib/data-loader';
import { saveGame, updateSave, autoSave, loadGame, SaveGame } from '@/lib/database';
import { generateAllPlayers } from '@/lib/player-generator';
import { generateAllSchedules } from '@/lib/schedule-generator';
import { advanceDay, advanceToNextEvent, AdvanceSummary } from '@/lib/day-advance';
import { generateAllAIManagers } from '@/lib/manager-engine';
import {
  createOffer,
  acceptCounterOffer,
  toggleTransferList,
  respondToIncomingOffer,
} from '@/lib/transfer-engine';

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

  // Transfer Actions
  makeTransferOffer: (playerId: string, fee: number, salary: number, contractYears: number) => { decision: string; reason: string; counterFee?: number };
  acceptCounterOffer: (offerId: string) => void;
  togglePlayerTransferList: (playerId: string) => void;
  respondToIncoming: (offerId: string, accept: boolean) => void;

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
    };

    set({ gameState, isLoaded: true, currentSaveId: null });
  },

  loadGameState: async (saveId) => {
    const save: SaveGame | undefined = await loadGame(saveId);
    if (!save) return false;

    // Backfill aiManagers for saves created before this feature existed
    const loaded = save.gameState;
    if (!loaded.aiManagers) {
      loaded.aiManagers = generateAllAIManagers(loaded.teams, loaded.currentTeamId);
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

  makeTransferOffer: (playerId, fee, salary, contractYears) => {
    const { gameState } = get();
    if (!gameState) return { decision: 'rejected', reason: 'Kein Spielstand' };
    const { newState, evaluation } = createOffer(gameState, playerId, fee, salary, contractYears);
    set({ gameState: newState });
    return { decision: evaluation.decision, reason: evaluation.reason, counterFee: evaluation.counterFee };
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
    if (answer) {
      // Apply morale effect to all team players
      updatedPlayers = gameState.players.map((p) => {
        if (p.teamId !== gameState.currentTeamId) return p;
        return {
          ...p,
          morale: Math.max(10, Math.min(100, p.morale + answer.moraleEffect)),
        };
      });
    }

    set({
      gameState: {
        ...gameState,
        pressConferences: updatedPCs,
        players: updatedPlayers,
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

    const { intensity, cost, position, league, minOvr, maxOvr, minAge, maxAge, foot, nationality, contractExpiring, traitId } = opts;

    // Deduct cost from transfer budget
    const finances = gameState.finances[gameState.currentTeamId];
    if (!finances || finances.transferBudget < cost) return { found: 0, cost: 0 };

    const calcOvr = (p: Player) => {
      const a = p.attributes;
      if (p.position === 'TW') return Math.round(a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1);
      if (['IV', 'LV', 'RV'].includes(p.position)) return Math.round(a.positioning * 0.2 + a.strength * 0.15 + a.heading * 0.1 + a.pace * 0.1 + a.passing * 0.1 + a.aggression * 0.1 + a.composure * 0.1 + a.stamina * 0.1 + a.workRate * 0.05);
      return Math.round(a.passing * 0.12 + a.shooting * 0.12 + a.dribbling * 0.1 + a.pace * 0.1 + a.stamina * 0.1 + a.composure * 0.1 + a.vision * 0.1 + a.ballControl * 0.1 + a.finishing * 0.08 + a.strength * 0.08);
    };
    const pAge = (dob: string) => new Date(gameState.currentDate).getFullYear() - new Date(dob).getFullYear();

    // Apply all filters
    let candidates = gameState.players.filter((p) => p.teamId !== gameState.currentTeamId);
    if (position !== 'all') candidates = candidates.filter((p) => p.position === position);
    if (league !== 'all') {
      const teamIds = new Set(gameState.teams.filter((t) => t.league === league).map((t) => t.id));
      candidates = candidates.filter((p) => teamIds.has(p.teamId));
    }
    if (minOvr > 1) candidates = candidates.filter((p) => calcOvr(p) >= minOvr);
    if (maxOvr < 99) candidates = candidates.filter((p) => calcOvr(p) <= maxOvr);
    if (minAge > 15) candidates = candidates.filter((p) => pAge(p.dateOfBirth) >= minAge);
    if (maxAge < 45) candidates = candidates.filter((p) => pAge(p.dateOfBirth) <= maxAge);
    if (foot !== 'all') candidates = candidates.filter((p) => p.foot === foot);
    if (nationality !== 'all') candidates = candidates.filter((p) => p.nationality === nationality);
    if (contractExpiring) {
      const yr = parseInt(gameState.currentDate.substring(0, 4));
      candidates = candidates.filter((p) => parseInt(p.contractUntil.substring(0, 4)) <= yr + 1);
    }
    if (traitId !== 'all') candidates = candidates.filter((p) => (p.traits ?? []).some((t) => t.traitId === traitId));

    // Intensity determines how many players found + report quality
    const maxResults = intensity === 'deep' ? 20 : intensity === 'standard' ? 10 : 5;
    const qualityRange = intensity === 'deep' ? [7, 10] : intensity === 'standard' ? [5, 8] : [3, 6];

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const found = shuffled.slice(0, Math.min(maxResults, candidates.length));

    const existingIds = new Set(gameState.scoutReports.map((r) => r.playerId));
    const newReports = found
      .filter((p) => !existingIds.has(p.id))
      .map((p) => {
        const ovr = calcOvr(p);
        const q = qualityRange[0] + Math.floor(Math.random() * (qualityRange[1] - qualityRange[0] + 1));
        // Report accuracy: lower quality = larger error in estimated value
        const errorFactor = 1 + (10 - q) * 0.04 * (Math.random() > 0.5 ? 1 : -1);
        return {
          id: `scout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${p.id}`,
          scoutId: 'default',
          playerId: p.id,
          type: 'player' as const,
          date: gameState.currentDate,
          quality: q,
          recommendation: (ovr >= 75 ? 'sign_immediately' : ovr >= 65 ? 'monitor' : 'not_recommended') as 'sign_immediately' | 'monitor' | 'not_recommended',
          estimatedValue: Math.round(p.marketValue * errorFactor),
          potentialAssessment: (p.potential >= 85 ? 'world_class' : p.potential >= 75 ? 'excellent' : p.potential >= 65 ? 'promising' : 'average') as 'low' | 'average' | 'promising' | 'excellent' | 'world_class',
        };
      });

    const updatedFinances = {
      ...gameState.finances,
      [gameState.currentTeamId]: {
        ...finances,
        transferBudget: finances.transferBudget - cost,
      },
    };

    set({
      gameState: {
        ...gameState,
        scoutReports: [...gameState.scoutReports, ...newReports],
        finances: updatedFinances,
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
