import { GameState } from '@/types/game';
import { TableEntry } from '@/types/league';
import { Match, MatchResult } from '@/types/match';
import { simulateMatch } from './match-engine';
import { generateIncomingOffers, generateDeadlineDayOffers } from './transfer-engine';
import { applyWeeklyTraining, decayTrainingBoosts, awardXP, tryAwardTraitOnLevelUp, checkTraitFromPerformance, setTrainingGameDate } from './training-engine';
import { generateDailyEvents, generateRandomManagerEvent } from './week-events';
import { generateWeeklyMissions, awardManagerXP } from './manager-engine';
import { generateSponsorOffers, checkSponsorExpiry } from './sponsor-engine';
import { checkSeasonEnd, processSeasonEnd, startNewSeason } from './season-engine';
import { processCupMatches } from './cup-engine';
import { generateMonthlyYouth } from './youth-engine';
import { checkUpgradeCompletion } from './stadium-engine';
import { checkLoanExpiry } from './loan-engine';
import { checkAchievements } from './achievement-engine';
import { createWeeklyPack, createMatchdayPack, expireCards } from './pack-engine';
import { checkPlayerInteractions } from './player-interactions';
import { generateJobOffers, cleanupExpiredOffers } from './job-offer-engine';
import { processInternationalMatches } from './international-engine';
import { calcStaffEffects } from './staff-engine';
import { processRatingChanges } from './rating-engine';
import { ManagerProfile } from '@/types/manager';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay(); // 0=Sun, 1=Mon, ...
}

// ── Transfer Window Logic ──
// Summer: July 1 – August 31
// Winter: January 1 – January 31
function resolveTransferWindow(dateStr: string): { isOpen: boolean; type: 'summer' | 'winter' } {
  const d = new Date(dateStr);
  const month = d.getMonth(); // 0-indexed: 0=Jan, 6=Jul, 7=Aug
  const day = d.getDate();

  // Summer window: July 1 – August 31
  if (month === 6 || month === 7) {
    return { isOpen: true, type: 'summer' };
  }
  // Winter window: January 1 – January 31
  if (month === 0) {
    return { isOpen: true, type: 'winter' };
  }
  return { isOpen: false, type: month >= 6 ? 'summer' : 'winter' };
}

// ── Monthly Finance Calculation ──
// Called on the 1st of each month to calculate income/expenses
function calculateMonthlyFinances(state: GameState): GameState {
  const d = new Date(state.currentDate);
  if (d.getDate() !== 1) return state; // only on 1st of month

  const teamId = state.currentTeamId;
  const team = state.teams.find(t => t.id === teamId);
  const finances = state.finances[teamId];
  if (!team || !finances) return state;

  const month = d.toISOString().slice(0, 7); // "2025-08"

  // Already calculated this month?
  if (finances.monthlyIncome.some(m => m.month === month)) return state;

  const league = state.leagues.find(l => l.id === team.league);
  const table = state.tables[team.league] || [];
  const myEntry = table.find(e => e.teamId === teamId);
  const position = myEntry?.position ?? 10;
  const totalTeams = league?.numberOfTeams ?? 18;

  // ── INCOME ──

  // TV money: distributed monthly (total / 10 months Aug-May), position-weighted
  const tvFirst = league?.tvMoney.first ?? 70000000;
  const tvLast = league?.tvMoney.last ?? 30000000;
  const tvRange = tvFirst - tvLast;
  const positionFactor = 1 - ((position - 1) / Math.max(1, totalTeams - 1));
  const annualTV = tvLast + tvRange * positionFactor;
  const monthlyTV = Math.round(annualTV / 10);

  // Ticket income: based on home matches played this month (approximation)
  const capacity = team.stadium.capacity;
  const reputation = team.reputation;
  const baseAttendance = Math.min(capacity, Math.round(capacity * (0.5 + reputation / 200)));
  const avgTicketPrice = league?.tier === 1 ? 35 : league?.tier === 2 ? 22 : 15;
  // ~2 home matches per month
  const ticketIncome = Math.round(baseAttendance * avgTicketPrice * 2);

  // Merchandising: reputation-based
  const merchBase = league?.tier === 1 ? 500000 : league?.tier === 2 ? 150000 : 50000;
  const merchandising = Math.round(merchBase * (reputation / 100));

  // Sponsoring: sum of active sponsor payments (divided by 12)
  const sponsorIncome = state.sponsors
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + Math.round(s.amountPerSeason / 12), 0);

  // Prize money: only at season end (handled in season-end logic)
  const prizesMoney = 0;

  // ── EXPENSES ──

  // Player salaries
  const teamPlayers = state.players.filter(p => p.teamId === teamId);
  const salaries = Math.round(teamPlayers.reduce((sum, p) => sum + p.salary, 0) / 12);

  // Staff salaries (all staff belong to the player's team)
  const staffSalaries = Math.round(state.staff
    .reduce((sum, s) => sum + s.salary, 0) / 12);

  // Stadium maintenance: ~0.5% of stadium capacity * 100 per month
  const stadiumMaintenance = Math.round(capacity * 50 / 12);

  // Youth academy: based on facilities
  const youthAcademy = Math.round((team.facilities.youth * 25000));

  // B5: Calculate transfer income/expenses from completed transfers this month
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  const completedThisMonth = state.transfers.completed.filter(t =>
    t.date >= monthStart && t.date <= monthEnd
  );
  const transferIncome = completedThisMonth
    .filter(t => t.fromTeamId === teamId)
    .reduce((sum, t) => sum + t.fee, 0);
  const transferExpenses = completedThisMonth
    .filter(t => t.toTeamId === teamId)
    .reduce((sum, t) => sum + t.fee, 0);

  const income: import('@/types/finance').MonthlyFinance = {
    month,
    tvMoney: monthlyTV,
    ticketIncome,
    merchandising,
    sponsoring: sponsorIncome,
    transferIncome,
    prizesMoney,
    salaries,
    transferExpenses,
    stadiumMaintenance,
    staffSalaries,
    youthAcademy,
    bonuses: 0,
    other: 0,
  };

  const totalIncome = monthlyTV + ticketIncome + merchandising + sponsorIncome + transferIncome;
  const totalExpenses = salaries + staffSalaries + stadiumMaintenance + youthAcademy + transferExpenses;
  const netResult = totalIncome - totalExpenses;

  // B5: Dynamically boost transfer budget when net income is positive
  const transferBudgetBoost = netResult > 0 ? Math.round(netResult * 0.3) : 0;

  const updatedFinances = {
    ...finances,
    balance: finances.balance + netResult,
    transferBudget: finances.transferBudget + transferBudgetBoost,
    totalSalaryPerMonth: salaries,
    monthlyIncome: [...finances.monthlyIncome, income],
    monthlyExpenses: [...finances.monthlyExpenses, income], // same object stores both
  };

  // Generate finance news
  const newsItem: import('@/types/news').NewsItem = {
    id: `finance-${month}`,
    type: 'general',
    title: `Monatsbericht ${new Date(state.currentDate).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`,
    content: `Einnahmen: ${formatFinanceValue(totalIncome)} | Ausgaben: ${formatFinanceValue(totalExpenses)} | ${netResult >= 0 ? 'Gewinn' : 'Verlust'}: ${formatFinanceValue(Math.abs(netResult))}`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: teamId,
    importance: netResult < -1000000 ? 'high' : 'medium',
  };

  return {
    ...state,
    finances: { ...state.finances, [teamId]: updatedFinances },
    news: [...state.news, newsItem],
  };
}

function formatFinanceValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}

/**
 * Advances the game by one day.
 * - Checks for matches on the current date across all leagues
 * - Simulates all matches for that day
 * - Updates league tables
 * - Generates news for player's matches
 * - Returns the updated GameState (immutable update)
 */
export function advanceDay(state: GameState, liveMatchResult?: MatchResult): GameState {
  const currentDate = state.currentDate;
  const nextDate = addDays(currentDate, 1);

  // B2: Ensure training engine uses the game date for age calculations
  setTrainingGameDate(currentDate);

  // Expire collectible cards daily
  state = expireCards(state);

  // Reset scout cooldown on Mondays
  if (getDayOfWeek(currentDate) === 1 && state.lastScoutResetDate !== currentDate) {
    state = { ...state, scoutsThisWeek: 0, lastScoutResetDate: currentDate };
  }

  // Find all matches for today across all schedules
  const todayMatches: { scheduleIdx: number; matchIdx: number; match: Match }[] = [];

  state.schedules.forEach((schedule, scheduleIdx) => {
    schedule.matches.forEach((match, matchIdx) => {
      if (match.date === currentDate && !match.isPlayed) {
        todayMatches.push({ scheduleIdx, matchIdx, match });
      }
    });
  });

  // Calculate staff effects once per day
  const staffEffects = calcStaffEffects(state.staff ?? []);

  if (todayMatches.length === 0) {
    // No matches today: advance date + slight recovery
    // Fitness coach bonus: +conditionRecovery% extra recovery
    const condBonus = 1 + staffEffects.conditionRecovery / 100;
    let updatedPlayers = state.players.map((p) => {
      if (p.teamId !== state.currentTeamId) return p;
      return {
        ...p,
        condition: Math.min(100, p.condition + Math.round(3 * condBonus)),
        fatigue: Math.max(0, p.fatigue - Math.round(4 * condBonus)),
      };
    });

    let updatedTraining = state.training;
    const updatedNews = [...state.news];
    let updatedInteractions = [...(state.interactions ?? [])];

    // Monday = apply weekly training + decay old boosts
    if (state.training?.selectedTraining && getDayOfWeek(currentDate) === 1 && state.training.lastTrainingDate !== currentDate) {
      // Decay existing boosts first
      updatedPlayers = decayTrainingBoosts(updatedPlayers);

      // Decay matchPractice for all players (-3/week, min 10)
      // Morale regression toward baseline 60 (-2 if above, +2 if below)
      updatedPlayers = updatedPlayers.map(p => {
        const moraleDrift = p.morale > 60 ? -2 : p.morale < 60 ? 2 : 0;
        return {
          ...p,
          matchPractice: Math.max(10, (p.matchPractice ?? 50) - 3),
          morale: Math.max(10, Math.min(100, p.morale + moraleDrift)),
        };
      });

      // Apply the selected training
      const { players: trainedPlayers, injuredPlayerNames, playerSummaries } = applyWeeklyTraining(
        { ...state, players: updatedPlayers },
        state.currentTeamId,
        state.training.selectedTraining
      );
      updatedPlayers = trainedPlayers;

      // Update training record
      updatedTraining = {
        ...updatedTraining,
        lastTrainingDate: currentDate,
        weekHistory: [
          ...(updatedTraining.weekHistory ?? []).slice(-20),
          { week: currentDate, type: state.training.selectedTraining },
        ],
      };

      // Generate detailed training news
      const trainingName = state.training.selectedTraining ?? 'recovery';
      const ATTR_DE: Record<string, string> = {
        pace: 'Tempo', stamina: 'Ausdauer', strength: 'Stärke', shooting: 'Schuss',
        finishing: 'Abschluss', passing: 'Passen', crossing: 'Flanken', dribbling: 'Dribbling',
        ballControl: 'Ballkontrolle', heading: 'Kopfball', vision: 'Übersicht',
        composure: 'Gelassenheit', positioning: 'Stellungsspiel', aggression: 'Aggressivität',
        workRate: 'Laufbereitschaft', reflexes: 'Reflexe', handling: 'Fangen',
        diving: 'Hechten', kicking: 'Abschlag', oneOnOne: '1-gegen-1',
      };
      const levelUps = playerSummaries.filter(s => s.leveledUp);
      const injured = playerSummaries.filter(s => s.injured);
      const trainedCount = playerSummaries.length;
      const boostSample = playerSummaries.filter(s => s.boostedAttributes.length > 0).slice(0, 3);

      // Build detailed content
      const contentParts: string[] = [];
      contentParts.push(`${trainedCount} Spieler haben am ${trainingName.charAt(0).toUpperCase() + trainingName.slice(1)}-Training teilgenommen.`);

      if (boostSample.length > 0) {
        const boostLines = boostSample.map(s =>
          `${s.name} (${s.position}): ${s.boostedAttributes.map(a => ATTR_DE[a] ?? a).join(', ')} verbessert`
        );
        contentParts.push('Verbesserungen: ' + boostLines.join(' | '));
      }

      if (levelUps.length > 0) {
        contentParts.push(`⬆️ Level-Up: ${levelUps.map(s => `${s.name} → Lvl ${s.newLevel}`).join(', ')}`);
      }

      if (injured.length > 0) {
        contentParts.push(`🏥 Verletzt: ${injured.map(s => `${s.name} (${s.injuryDays} Tage)`).join(', ')}`);
      }

      updatedNews.push({
        id: `news-training-${currentDate}`,
        date: currentDate,
        title: `Wochentraining: ${trainingName.charAt(0).toUpperCase() + trainingName.slice(1)}`,
        content: contentParts.join('\n'),
        type: 'general',
        importance: injured.length > 0 ? 'high' : levelUps.length > 0 ? 'medium' : 'low',
        isRead: false,
      });

      // Separate news for each level-up (important milestone)
      for (const lu of levelUps) {
        updatedNews.push({
          id: `news-levelup-${lu.playerId}-${currentDate}`,
          date: currentDate,
          title: `Level-Up: ${lu.name} erreicht Level ${lu.newLevel}!`,
          content: `${lu.name} (${lu.position}) hat durch das Training Level ${lu.newLevel} erreicht. Seine Fähigkeiten haben sich verbessert!`,
          type: 'milestone',
          importance: 'medium',
          isRead: false,
          relatedPlayerId: lu.playerId,
        });
      }

      // Separate news for each training injury
      for (const inj of injured) {
        updatedNews.push({
          id: `news-training-injury-${inj.playerId}-${currentDate}`,
          date: currentDate,
          title: `Trainingsverletzung: ${inj.name}`,
          content: `${inj.name} (${inj.position}) hat sich im Training verletzt und fällt ${inj.injuryDays} Tage aus.`,
          type: 'injury',
          importance: 'high',
          isRead: false,
          relatedPlayerId: inj.playerId,
        });
      }
    }

    // ── Player Interactions (Mondays) ──
    if (getDayOfWeek(currentDate) === 1) {
      const tempState: GameState = { ...state, players: updatedPlayers, news: updatedNews };
      const newInteractions = checkPlayerInteractions(tempState);
      if (newInteractions.length > 0) {
        updatedInteractions = [...updatedInteractions, ...newInteractions];
      }
    }

    // Heal injuries (decrement daysRemaining)
    // Physiotherapist bonus: chance to heal extra day
    const physioExtraHealChance = staffEffects.injuryDurationReduction / 100;
    updatedPlayers = updatedPlayers.map((p) => {
      if (!p.injury || p.teamId !== state.currentTeamId) return p;
      let healDays = 1;
      if (physioExtraHealChance > 0 && Math.random() < physioExtraHealChance) {
        healDays = 2; // physio accelerates healing
      }
      const remaining = p.injury.daysRemaining - healDays;
      if (remaining <= 0) {
        return { ...p, injury: undefined };
      }
      return { ...p, injury: { ...p.injury, daysRemaining: remaining } };
    });

    // Generate daily events (opponent previews, milestones, random events, etc.)
    const stateForEvents: GameState = {
      ...state,
      currentDate,
      players: updatedPlayers,
      training: updatedTraining,
      news: updatedNews,
    };
    const dailyEvents = generateDailyEvents(stateForEvents);
    updatedNews.push(...dailyEvents.news);

    // Add generated press conferences
    const updatedPressConferences = [...state.pressConferences, ...dailyEvents.pressConferences];

    // Apply moral changes from events
    if (dailyEvents.moralChanges.length > 0) {
      updatedPlayers = updatedPlayers.map((p) => {
        const change = dailyEvents.moralChanges.find((c) => c.playerId === p.id);
        if (!change) return p;
        return { ...p, morale: Math.max(10, Math.min(100, p.morale + change.delta)) };
      });
    }

    // ── Manager: weekly mission refresh on Mondays ──
    let updatedManager = { ...state.manager };
    if (getDayOfWeek(currentDate) === 1) {
      const lastRefresh = new Date(updatedManager.lastMissionRefresh ?? '2000-01-01');
      const now = new Date(currentDate);
      const daysSinceRefresh = Math.floor((now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceRefresh >= 7) {
        // Keep completed but unclaimed missions, replace expired/incomplete ones
        const kept = (updatedManager.activeMissions ?? []).filter(m => m.isCompleted);
        const newMissions = generateWeeklyMissions(currentDate, updatedManager.completedMissionIds ?? []);
        updatedManager = {
          ...updatedManager,
          activeMissions: [...kept.slice(0, 1), ...newMissions].slice(0, 3),
          lastMissionRefresh: currentDate,
        };
      }
    }

    // ── Manager: mission progress — training sessions ──
    if (getDayOfWeek(currentDate) === 1 && state.training.lastTrainingDate !== currentDate) {
      updatedManager = updateMissionProgress(updatedManager, 'training_sessions', 1);
    }

    // ── Manager: no_injuries check (daily) ──
    const hasNewInjury = updatedPlayers.some(p => p.teamId === state.currentTeamId && p.injury && p.injury.daysRemaining === p.injury.totalDays);
    if (!hasNewInjury) {
      // only mark progress at end of week
      if (getDayOfWeek(currentDate) === 0) {
        const anyInjuredThisWeek = updatedPlayers.some(p => p.teamId === state.currentTeamId && p.injury && p.injury.daysRemaining >= (p.injury.totalDays ?? 0) - 6);
        if (!anyInjuredThisWeek) {
          updatedManager = updateMissionProgress(updatedManager, 'no_injuries', 1);
        }
      }
    }

    // ── Manager: morale_high check (daily) ──
    const teamMorale = updatedPlayers.filter(p => p.teamId === state.currentTeamId);
    const avgMorale = teamMorale.length > 0 ? teamMorale.reduce((s, p) => s + p.morale, 0) / teamMorale.length : 0;
    if (avgMorale >= 70 && getDayOfWeek(currentDate) === 0) {
      updatedManager = updateMissionProgress(updatedManager, 'morale_high', 1);
    }

    // Generate random manager events (10% chance per day)
    let updatedRandomEvents = [...(state.randomEvents ?? [])];
    const rndEvent = generateRandomManagerEvent({ ...state, players: updatedPlayers, news: updatedNews });
    if (rndEvent) {
      updatedRandomEvents = [...updatedRandomEvents, rndEvent];
    }

    // ── Winter break rating changes (January 15) ──
    const dateObj = new Date(currentDate);
    if (dateObj.getMonth() === 0 && dateObj.getDate() === 15) {
      const winterResult = processRatingChanges(
        updatedPlayers, state.currentTeamId, currentDate, 'winter_break', state.season.number
      );
      updatedPlayers = winterResult.updatedPlayers;
      updatedNews.push(...winterResult.news);
    }

    // Process cup and international matches BEFORE advancing the date,
    // because processCupMatches/processInternationalMatches check state.currentDate
    let preAdvanceState: GameState = {
      ...state,
      players: updatedPlayers,
      training: updatedTraining,
      news: updatedNews,
      pressConferences: updatedPressConferences,
      manager: updatedManager,
      randomEvents: updatedRandomEvents,
      interactions: updatedInteractions,
    };
    preAdvanceState = processCupMatches(preAdvanceState, liveMatchResult);
    preAdvanceState = processInternationalMatches(preAdvanceState, liveMatchResult);

    const tw = resolveTransferWindow(nextDate);
    const dayResult: GameState = {
      ...preAdvanceState,
      currentDate: nextDate,
      isTransferWindowOpen: tw.isOpen,
      transferWindowType: tw.type,
    };
    let result = calculateMonthlyFinances(dayResult);
    result = checkSponsorExpiry(result);
    result = generateSponsorOffers(result);
    result = generateMonthlyYouth(result);
    result = checkUpgradeCompletion(result);
    result = checkLoanExpiry(result);
    result = checkAchievements(result);
    result = generateJobOffers(result);
    result = cleanupExpiredOffers(result);

    // ── Weekly Pack (Sundays) ──
    if (getDayOfWeek(currentDate) === 0) {
      const weeklyPack = createWeeklyPack(currentDate);
      result = { ...result, pendingPacks: [...(result.pendingPacks ?? []), weeklyPack] };
    }

    if (result.isTransferWindowOpen) {
      result = generateIncomingOffers(result);
      result = generateDeadlineDayOffers(result);
    } else {
      // Clean up pending transfer offers when window is closed
      const pendingOffers = result.transfers.offers.filter(o => o.status === 'pending' || o.status === 'counter_offer' || o.status === 'club_agreed');
      if (pendingOffers.length > 0) {
        result = {
          ...result,
          transfers: {
            ...result.transfers,
            offers: result.transfers.offers.map(o =>
              (o.status === 'pending' || o.status === 'counter_offer' || o.status === 'club_agreed')
                ? { ...o, status: 'rejected' as const, rejectionReason: 'Transferfenster geschlossen' }
                : o
            ),
          },
        };
      }
    }

    // B6: Cap news array to prevent unbounded growth
    if (result.news.length > 300) {
      result = { ...result, news: result.news.slice(-300) };
    }

    return result;
  }

  // Simulate all matches
  const newSchedules = state.schedules.map((s) => ({ ...s, matches: [...s.matches] }));
  const newResults = [...state.results];
  const newTables = { ...state.tables };
  const newNews = [...state.news];
  let newPlayers = [...state.players];
  const newPendingPacks = [...(state.pendingPacks ?? [])];

  // Deep copy tables
  for (const key of Object.keys(newTables)) {
    newTables[key] = newTables[key].map((e) => ({ ...e }));
  }

  // ── Handle friendly matches separately (opponents are virtual) ──
  for (const { scheduleIdx, matchIdx, match } of todayMatches) {
    if (match.competition !== 'friendly') continue;
    const isPlayerMatch = match.homeTeamId === state.currentTeamId || match.awayTeamId === state.currentTeamId;
    if (!isPlayerMatch) continue;

    // Auto-simulate friendly with realistic score
    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = Math.floor(Math.random() * 3);
    const won = homeScore > awayScore;
    const lost = homeScore < awayScore;

    newSchedules[scheduleIdx].matches[matchIdx] = {
      ...match,
      isPlayed: true,
    };

    // Look up opponent name from preseason friendlies data
    const friendlyData = state.preseason?.friendlies?.find(f => f.date === match.date);
    const oppName = friendlyData?.opponentName ?? (state.teams.find(t => t.id === match.awayTeamId)?.name ?? 'Testspielgegner');

    // ── Spielpraxis: condition/fatigue + XP + stats + morale for each player ──
    const teamPlayers = newPlayers.filter(p => p.teamId === state.currentTeamId && !p.injury && !p.suspended);
    // Pick ~14 players to participate (starters + subs who get minutes)
    const participants = teamPlayers.slice(0, Math.min(14, teamPlayers.length));
    const participantIds = new Set(participants.map(p => p.id));

    // Random events: goals, assists, injuries
    const scorerIds: string[] = [];
    const assisterIds: string[] = [];
    const attackers = participants.filter(p => ['ST', 'MS', 'LA', 'RA', 'LM', 'RM', 'ZOM'].includes(p.position));
    const midfielders = participants.filter(p => ['ZM', 'ZDM', 'ZOM', 'LM', 'RM'].includes(p.position));
    for (let g = 0; g < homeScore; g++) {
      const pool = attackers.length > 0 ? attackers : participants.filter(p => p.position !== 'TW');
      if (pool.length > 0) scorerIds.push(pool[Math.floor(Math.random() * pool.length)].id);
      const assistPool = midfielders.length > 0 ? midfielders : participants.filter(p => p.position !== 'TW');
      if (assistPool.length > 0 && Math.random() > 0.3) assisterIds.push(assistPool[Math.floor(Math.random() * assistPool.length)].id);
    }

    // Injury chance: 5% per friendly (lighter than competitive)
    let injuredPlayerId: string | null = null;
    let injuryDays = 0;
    if (Math.random() < 0.05 && participants.length > 0) {
      const injCandidate = participants[Math.floor(Math.random() * participants.length)];
      injuredPlayerId = injCandidate.id;
      injuryDays = 3 + Math.floor(Math.random() * 10); // 3-12 days
    }

    newPlayers = newPlayers.map((p) => {
      if (p.teamId !== state.currentTeamId) return p;

      // Non-participants: no effect
      if (!participantIds.has(p.id)) return p;

      // Condition/fatigue (lighter than competitive match) + matchPractice boost (smaller than competitive)
      let updated = {
        ...p,
        condition: Math.max(50, p.condition - 5),
        fatigue: Math.min(100, p.fatigue + 8),
        matchPractice: Math.min(100, (p.matchPractice ?? 50) + 8),
      };

      // Friendlies do NOT count towards official player statistics
      const goals = scorerIds.filter(id => id === p.id).length;
      const assists = assisterIds.filter(id => id === p.id).length;

      // XP from friendly (reduced compared to competitive: ~60%)
      const baseXP = 6;
      const resultXP = won ? 8 : lost ? 2 : 5;
      const goalXP = goals * 8;
      const assistXP = assists * 5;
      const friendlyXP = Math.max(3, baseXP + resultXP + goalXP + assistXP);
      const prevLevel = updated.level;
      updated = awardXP(updated, friendlyXP);
      if (updated.level > prevLevel) {
        updated = tryAwardTraitOnLevelUp(updated, currentDate);
      }

      // Morale: small effect from friendly result
      const moraleDelta = won ? 3 : lost ? -2 : 1;
      updated = { ...updated, morale: Math.max(10, Math.min(100, updated.morale + moraleDelta)) };

      // Form: slight adjustment
      updated = { ...updated, form: Math.max(1, Math.min(100, updated.form + (won ? 1 : lost ? -1 : 0))) };

      // Injury
      if (p.id === injuredPlayerId) {
        updated = {
          ...updated,
          injury: { type: 'Muskelverletzung', severity: injuryDays <= 5 ? 'light' as const : 'medium' as const, daysRemaining: injuryDays, totalDays: injuryDays, rehaPhase: 1 as const },
        };
      }

      return updated;
    });

    // Build rich news
    const reportParts: string[] = [];
    reportParts.push(`Testspiel gegen ${oppName}.`);
    if (scorerIds.length > 0) {
      const scorerNames = [...new Set(scorerIds)].map(id => {
        const pl = newPlayers.find(p => p.id === id);
        const count = scorerIds.filter(sid => sid === id).length;
        return pl ? `${pl.lastName}${count > 1 ? ` (${count}x)` : ''}` : null;
      }).filter(Boolean);
      if (scorerNames.length > 0) reportParts.push(`Torschützen: ${scorerNames.join(', ')}`);
    }
    if (injuredPlayerId) {
      const injPlayer = newPlayers.find(p => p.id === injuredPlayerId);
      if (injPlayer) reportParts.push(`🏥 Verletzung: ${injPlayer.lastName} fällt ${injuryDays} Tage aus!`);
    }
    reportParts.push(`${participants.length} Spieler haben Spielpraxis gesammelt.`);

    newNews.push({
      id: `friendly-result-${match.id}`,
      type: 'result',
      title: `Testspiel: ${won ? 'Sieg' : lost ? 'Niederlage' : 'Unentschieden'} ${homeScore}:${awayScore} gegen ${oppName}`,
      content: reportParts.join('\n'),
      date: currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: injuredPlayerId ? 'high' as const : 'low' as const,
    });

    // Injury news separately
    if (injuredPlayerId) {
      const injPlayer = newPlayers.find(p => p.id === injuredPlayerId);
      if (injPlayer) {
        newNews.push({
          id: `friendly-injury-${match.id}`,
          type: 'injury',
          title: `Testspiel-Verletzung: ${injPlayer.firstName} ${injPlayer.lastName}`,
          content: `${injPlayer.firstName} ${injPlayer.lastName} hat sich im Testspiel gegen ${oppName} verletzt und fällt ${injuryDays} Tage aus.`,
          date: currentDate,
          isRead: false,
          relatedPlayerId: injuredPlayerId,
          importance: 'high' as const,
        });
      }
    }
  }

  // ── Regular (non-friendly) matches ──
  for (const { scheduleIdx, matchIdx, match } of todayMatches) {
    if (match.competition === 'friendly') continue; // already handled above
    const homeTeam = state.teams.find((t) => t.id === match.homeTeamId);
    const awayTeam = state.teams.find((t) => t.id === match.awayTeamId);

    if (!homeTeam || !awayTeam) continue;

    // Pass player's actual lineup from tactics for their team
    const isPlayerHome = match.homeTeamId === state.currentTeamId;
    const isPlayerAway = match.awayTeamId === state.currentTeamId;
    const isPlayerMatch = isPlayerHome || isPlayerAway;

    // Resolve manager skills for both teams
    const homeSkills = match.homeTeamId === state.currentTeamId
      ? state.manager.skills
      : state.aiManagers?.[match.homeTeamId]?.skills;
    const awaySkills = match.awayTeamId === state.currentTeamId
      ? state.manager.skills
      : state.aiManagers?.[match.awayTeamId]?.skills;

    // Use pre-computed live match result if available for the player's match
    let result: MatchResult;
    if (isPlayerMatch && liveMatchResult && liveMatchResult.id === match.id) {
      result = liveMatchResult;
    } else {
      const activeTactic = state.tactics[state.activeTactic ?? 'a'];
      const playerLineup = activeTactic?.lineup ?? [];
      const playerFormation = activeTactic?.formation;
      result = simulateMatch(
        match, homeTeam, awayTeam, state.players,
        isPlayerHome ? playerLineup : undefined,
        isPlayerAway ? playerLineup : undefined,
        homeSkills, awaySkills,
        isPlayerHome ? playerFormation : undefined,
        isPlayerAway ? playerFormation : undefined,
        isPlayerHome ? activeTactic : undefined,
        isPlayerAway ? activeTactic : undefined,
      );
    }

    // Update match in schedule
    newSchedules[scheduleIdx].matches[matchIdx] = {
      ...match,
      isPlayed: true,
      result,
    };

    newResults.push(result);

    // Update league table
    if (match.leagueId && newTables[match.leagueId]) {
      updateTable(newTables[match.leagueId], result.homeTeamId, result.awayTeamId, result.homeScore, result.awayScore);
    }

    // Generate news for player's team matches
    if (isPlayerMatch) {
      const playerIsHome = match.homeTeamId === state.currentTeamId;
      const playerScore = playerIsHome ? result.homeScore : result.awayScore;
      const opponentScore = playerIsHome ? result.awayScore : result.homeScore;
      const opponent = playerIsHome ? awayTeam : homeTeam;
      const won = playerScore > opponentScore;
      const lost = playerScore < opponentScore;

      // Build rich match report
      const matchRatings = playerIsHome ? result.homeRatings : result.awayRatings;
      const scorers = matchRatings.filter(r => r.goals > 0).map(r => {
        const pl = newPlayers.find(p => p.id === r.playerId);
        return pl ? `${pl.lastName}${r.goals > 1 ? ` (${r.goals}x)` : ''}` : null;
      }).filter(Boolean);
      const assisters = matchRatings.filter(r => r.assists > 0).map(r => {
        const pl = newPlayers.find(p => p.id === r.playerId);
        return pl ? `${pl.lastName}${r.assists > 1 ? ` (${r.assists}x)` : ''}` : null;
      }).filter(Boolean);
      const mom = result.manOfTheMatch ? newPlayers.find(p => p.id === result.manOfTheMatch) : null;
      const bestRating = [...matchRatings].sort((a, b) => b.rating - a.rating)[0];
      const bestPlayer = bestRating ? newPlayers.find(p => p.id === bestRating.playerId) : null;
      const playerStats = playerIsHome ? result.homeStats : result.awayStats;
      const oppStats = playerIsHome ? result.awayStats : result.homeStats;

      const reportParts: string[] = [];
      reportParts.push(`${playerIsHome ? 'Heimspiel' : 'Auswärtsspiel'} am ${match.matchday}. Spieltag.`);
      if (scorers.length > 0) reportParts.push(`Torschützen: ${scorers.join(', ')}`);
      if (assisters.length > 0) reportParts.push(`Vorlagen: ${assisters.join(', ')}`);
      if (mom) reportParts.push(`Spieler des Spiels: ${mom.firstName} ${mom.lastName}`);
      else if (bestPlayer && bestRating) reportParts.push(`Bester Spieler: ${bestPlayer.lastName} (${bestRating.rating.toFixed(1)})`);
      if (playerStats) {
        const possession = playerStats.possession ?? 50;
        reportParts.push(`Ballbesitz: ${possession}% | Schüsse: ${playerStats.shots ?? 0} (${playerStats.shotsOnTarget ?? 0} aufs Tor) | Ecken: ${playerStats.corners ?? 0}`);
      }

      newNews.push({
        id: `match-${match.id}`,
        type: 'result',
        title: won
          ? `Sieg! ${playerScore}:${opponentScore} gegen ${opponent.name}`
          : lost
          ? `Niederlage! ${playerScore}:${opponentScore} gegen ${opponent.name}`
          : `Unentschieden! ${playerScore}:${opponentScore} gegen ${opponent.name}`,
        content: reportParts.join('\n'),
        date: currentDate,
        isRead: false,
        relatedTeamId: state.currentTeamId,
        importance: won ? 'medium' : lost ? 'high' : 'low',
      });

      // Update player ratings + award match XP for player's team
      const ratings = playerIsHome ? result.homeRatings : result.awayRatings;
      newPlayers = newPlayers.map((p) => {
        const rating = ratings.find((r) => r.playerId === p.id);
        if (!rating) return p;

        // Base stat update
        let updated = {
          ...p,
          stats: {
            ...p.stats,
            appearances: p.stats.appearances + 1,
            goals: p.stats.goals + rating.goals,
            assists: p.stats.assists + rating.assists,
            cleanSheets: p.stats.cleanSheets + (opponentScore === 0 && ['TW', 'IV', 'LV', 'RV'].includes(p.position) ? 1 : 0),
            minutesPlayed: p.stats.minutesPlayed + rating.minutesPlayed,
            yellowCards: p.stats.yellowCards + (rating.yellowCard ? 1 : 0),
            redCards: p.stats.redCards + (rating.redCard ? 1 : 0),
            avgRating: p.stats.appearances > 0
              ? (p.stats.avgRating * p.stats.appearances + rating.rating) / (p.stats.appearances + 1)
              : rating.rating,
          },
          form: Math.max(1, Math.min(100, p.form + (rating.rating >= 7 ? 3 : rating.rating >= 6 ? 0 : -3))),
          condition: Math.max(40, p.condition - Math.round(4 + (rating.minutesPlayed / 90) * 4)),
          fatigue: Math.min(100, p.fatigue + Math.round(8 + (rating.minutesPlayed / 90) * 7)),
          matchPractice: Math.min(100, (p.matchPractice ?? 50) + 15),
          ratingHistory: [...p.ratingHistory, rating.rating],
          formHistory: [...p.formHistory, p.form],
        };

        // Award match XP breakdown:
        //  - Teilnahme:       10 XP (Grundbonus fürs Spielen)
        //  - Ergebnis:        Sieg +15, Unentschieden +8, Niederlage +3
        //  - Note:            (Note - 5.0) * 6 → z.B. Note 7.5 = +15 XP, Note 4.0 = -6 XP
        //  - Tore:            +12 XP pro Tor
        //  - Assists:         +7 XP pro Assist
        //  - Weiße Weste (TW/IV): +5 XP bei Zu-Null
        const resultBonus = won ? 15 : lost ? 3 : 8;
        const ratingXP = Math.round((rating.rating - 5.0) * 6);
        const goalXP = rating.goals * 12;
        const assistXP = rating.assists * 7;
        const cleanSheetXP = (!lost && opponentScore === 0 && ['TW', 'IV', 'LV', 'RV'].includes(p.position)) ? 5 : 0;
        const matchXP = Math.max(5, 10 + resultBonus + ratingXP + goalXP + assistXP + cleanSheetXP);
        const prevLevel = updated.level;
        updated = awardXP(updated, matchXP);

        // Check for trait acquisition on level-up
        if (updated.level > prevLevel) {
          updated = tryAwardTraitOnLevelUp(updated, currentDate);
        }

        // Check for trait acquisition from exceptional performance
        updated = checkTraitFromPerformance(updated, rating.rating, currentDate);

        // Morale: match result + personal performance
        const moraleFromResult = won ? 5 : lost ? -6 : 0;
        const moraleFromRating = rating.rating >= 7.5 ? 3 : rating.rating >= 6.5 ? 1 : rating.rating < 5.5 ? -3 : 0;
        updated = { ...updated, morale: Math.max(10, Math.min(100, updated.morale + moraleFromResult + moraleFromRating)) };

        return updated;
      });
    }
  }

  // ── SPERREN verarbeiten ──
  // 1. Rote Karte → Sperre (Gelb-Rot: 1 Spiel, Direkt-Rot: 2-3 Spiele)
  // 2. 5 Gelbe Karten → 1 Spiel Sperre (Zähler reset)
  // 3. Bereits gesperrte Spieler: Sperre um 1 reduzieren wenn Spieltag war
  const myTeamPlayedToday = todayMatches.some(
    (m) => m.match.homeTeamId === state.currentTeamId || m.match.awayTeamId === state.currentTeamId
  );

  newPlayers = newPlayers.map((p) => {
    if (p.teamId !== state.currentTeamId) return p;

    // Decrement suspension for already-suspended players on match days
    if (p.suspended && p.suspendedMatches > 0 && myTeamPlayedToday) {
      const remaining = p.suspendedMatches - 1;
      if (remaining <= 0) {
        return { ...p, suspended: false, suspendedMatches: 0 };
      }
      return { ...p, suspendedMatches: remaining };
    }

    // Check for new red card suspensions
    const myResult = newResults.find(
      (r) => r.homeTeamId === state.currentTeamId || r.awayTeamId === state.currentTeamId
    );
    if (!myResult) return p;

    const allRatings = [...(myResult.homeRatings ?? []), ...(myResult.awayRatings ?? [])];
    const playerRating = allRatings.find((r) => r.playerId === p.id);
    if (!playerRating) return p;

    // Red card → suspension
    if (playerRating.redCard) {
      // Check if it was yellow-red (2 yellows) or direct red
      const isYellowRed = p.stats.yellowCards > 0 && playerRating.yellowCard;
      const suspensionLength = isYellowRed ? 1 : (2 + (Math.random() < 0.3 ? 1 : 0));
      return { ...p, suspended: true, suspendedMatches: suspensionLength };
    }

    // 5 accumulated yellows → 1 match suspension
    if (p.stats.yellowCards > 0 && p.stats.yellowCards % 5 === 0 && playerRating.yellowCard) {
      return { ...p, suspended: true, suspendedMatches: 1, stats: { ...p.stats } };
    }

    return p;
  });

  // Update matchday counter
  const playerTeamLeague = state.teams.find((t) => t.id === state.currentTeamId)?.league;
  const playerMatches = todayMatches.filter(
    (m) => m.match.leagueId === playerTeamLeague &&
    (m.match.homeTeamId === state.currentTeamId || m.match.awayTeamId === state.currentTeamId)
  );

  let newSeason = { ...state.season };
  if (playerMatches.length > 0) {
    newSeason = {
      ...newSeason,
      currentMatchday: playerMatches[0].match.matchday,
    };
  }

  // ── Manager mission progress after match ──
  let updatedManager = { ...state.manager };

  if (myTeamPlayedToday) {
    const myResult = newResults.find(
      (r) => r.homeTeamId === state.currentTeamId || r.awayTeamId === state.currentTeamId
    );
    if (myResult) {
      const isHome = myResult.homeTeamId === state.currentTeamId;
      const myScore = isHome ? myResult.homeScore : myResult.awayScore;
      const oppScore = isHome ? myResult.awayScore : myResult.homeScore;
      const won = myScore > oppScore;
      const cleanSheet = oppScore === 0;

      // Update manager stats
      updatedManager = {
        ...updatedManager,
        stats: {
          ...updatedManager.stats,
          totalMatches: updatedManager.stats.totalMatches + 1,
          wins: updatedManager.stats.wins + (won ? 1 : 0),
          draws: updatedManager.stats.draws + (myScore === oppScore ? 1 : 0),
          losses: updatedManager.stats.losses + (myScore < oppScore ? 1 : 0),
          cleanSheets: updatedManager.stats.cleanSheets + (cleanSheet ? 1 : 0),
          currentWinStreak: won ? updatedManager.stats.currentWinStreak + 1 : 0,
          winStreak: won
            ? Math.max(updatedManager.stats.winStreak, updatedManager.stats.currentWinStreak + 1)
            : updatedManager.stats.winStreak,
        },
      };

      // ── Matchday Pack (after wins) ──
      if (won) {
        const goalDiff = myScore - oppScore;
        const matchdayPack = createMatchdayPack(currentDate, goalDiff);
        newPendingPacks.push(matchdayPack);
      }

      // Award base manager XP for match
      updatedManager = awardManagerXP(updatedManager, won ? 20 : myScore === oppScore ? 10 : 5);

      // Mission: win_matches
      if (won) updatedManager = updateMissionProgress(updatedManager, 'win_matches', 1);

      // Mission: clean_sheets
      if (cleanSheet) updatedManager = updateMissionProgress(updatedManager, 'clean_sheets', 1);

      // Mission: score_goals
      if (myScore > 0) updatedManager = updateMissionProgress(updatedManager, 'score_goals', myScore);

      // Mission: no_cards — check if no cards this match
      const myRatings = isHome ? myResult.homeRatings : myResult.awayRatings;
      const hasCards = myRatings?.some(r => r.yellowCard || r.redCard);
      if (!hasCards) updatedManager = updateMissionProgress(updatedManager, 'no_cards', 1);

      // Mission: high_rating_player — any player with 8.0+
      const highRating = myRatings?.some(r => r.rating >= 8.0);
      if (highRating) updatedManager = updateMissionProgress(updatedManager, 'high_rating_player', 1);

      // Mission: come_from_behind — check events for comeback
      if (won && myResult.events) {
        const goals = myResult.events.filter(e => e.type === 'goal' || e.type === 'penalty_scored');
        let wasLosing = false;
        let myGoals = 0, oppGoals = 0;
        for (const g of goals) {
          if (g.teamId === state.currentTeamId) { myGoals++; }
          else { oppGoals++; }
          if (oppGoals > myGoals) wasLosing = true;
        }
        if (wasLosing) {
          updatedManager = updateMissionProgress(updatedManager, 'come_from_behind', 1);
          updatedManager.stats = { ...updatedManager.stats, comebacks: updatedManager.stats.comebacks + 1 };
        }
      }
    }
  }

  // ── AI Manager progression after all matches ──
  let updatedAIManagers = { ...(state.aiManagers ?? {}) };
  for (const { match } of todayMatches) {
    const homeAI = match.homeTeamId !== state.currentTeamId ? updatedAIManagers[match.homeTeamId] : null;
    const awayAI = match.awayTeamId !== state.currentTeamId ? updatedAIManagers[match.awayTeamId] : null;
    const res = newResults.find(r => r.homeTeamId === match.homeTeamId && r.awayTeamId === match.awayTeamId);
    if (!res) continue;

    if (homeAI) {
      const won = res.homeScore > res.awayScore;
      const draw = res.homeScore === res.awayScore;
      let ai = { ...homeAI, stats: { ...homeAI.stats, totalMatches: homeAI.stats.totalMatches + 1 } };
      if (won) ai.stats = { ...ai.stats, wins: ai.stats.wins + 1, currentWinStreak: ai.stats.currentWinStreak + 1, winStreak: Math.max(ai.stats.winStreak, ai.stats.currentWinStreak + 1) };
      else if (draw) ai.stats = { ...ai.stats, draws: ai.stats.draws + 1, currentWinStreak: 0 };
      else ai.stats = { ...ai.stats, losses: ai.stats.losses + 1, currentWinStreak: 0 };
      if (res.awayScore === 0) ai.stats = { ...ai.stats, cleanSheets: ai.stats.cleanSheets + 1 };
      ai = awardManagerXP(ai, won ? 15 : draw ? 8 : 3);
      updatedAIManagers[match.homeTeamId] = ai;
    }
    if (awayAI) {
      const won = res.awayScore > res.homeScore;
      const draw = res.homeScore === res.awayScore;
      let ai = { ...awayAI, stats: { ...awayAI.stats, totalMatches: awayAI.stats.totalMatches + 1 } };
      if (won) ai.stats = { ...ai.stats, wins: ai.stats.wins + 1, currentWinStreak: ai.stats.currentWinStreak + 1, winStreak: Math.max(ai.stats.winStreak, ai.stats.currentWinStreak + 1) };
      else if (draw) ai.stats = { ...ai.stats, draws: ai.stats.draws + 1, currentWinStreak: 0 };
      else ai.stats = { ...ai.stats, losses: ai.stats.losses + 1, currentWinStreak: 0 };
      if (res.homeScore === 0) ai.stats = { ...ai.stats, cleanSheets: ai.stats.cleanSheets + 1 };
      ai = awardManagerXP(ai, won ? 15 : draw ? 8 : 3);
      updatedAIManagers[match.awayTeamId] = ai;
    }
  }

  const tw = resolveTransferWindow(nextDate);
  const baseResult: GameState = {
    ...state,
    currentDate: nextDate,
    season: newSeason,
    schedules: newSchedules,
    results: newResults,
    tables: newTables,
    news: newNews,
    players: newPlayers,
    manager: updatedManager,
    aiManagers: updatedAIManagers,
    isTransferWindowOpen: tw.isOpen,
    transferWindowType: tw.type,
    pendingPacks: newPendingPacks,
  };
  let finalResult = calculateMonthlyFinances(baseResult);
  finalResult = checkSponsorExpiry(finalResult);
  finalResult = generateSponsorOffers(finalResult);
  finalResult = processCupMatches(finalResult, liveMatchResult);
  finalResult = processInternationalMatches(finalResult, liveMatchResult);
  finalResult = checkUpgradeCompletion(finalResult);
  finalResult = checkLoanExpiry(finalResult);
  finalResult = checkAchievements(finalResult);
  finalResult = generateJobOffers(finalResult);
  finalResult = cleanupExpiredOffers(finalResult);
  if (finalResult.isTransferWindowOpen) {
    finalResult = generateIncomingOffers(finalResult);
    finalResult = generateDeadlineDayOffers(finalResult);
  } else {
    // Clean up pending transfer offers when window is closed
    const pendingOffers = finalResult.transfers.offers.filter(o => o.status === 'pending' || o.status === 'counter_offer' || o.status === 'club_agreed');
    if (pendingOffers.length > 0) {
      finalResult = {
        ...finalResult,
        transfers: {
          ...finalResult.transfers,
          offers: finalResult.transfers.offers.map(o =>
            (o.status === 'pending' || o.status === 'counter_offer' || o.status === 'club_agreed')
              ? { ...o, status: 'rejected' as const, rejectionReason: 'Transferfenster geschlossen' }
              : o
          ),
        },
      };
    }
  }

  // ── Season End Check ──
  // After matches are played, check if all league matches are done
  if (!finalResult.season.isFinished && checkSeasonEnd(finalResult)) {
    finalResult = processSeasonEnd(finalResult);
    finalResult = startNewSeason(finalResult);
  }

  // B6+B7: Cap news and results arrays to prevent unbounded memory growth
  if (finalResult.news.length > 300) {
    finalResult = { ...finalResult, news: finalResult.news.slice(-300) };
  }
  if (finalResult.results.length > 500) {
    finalResult = { ...finalResult, results: finalResult.results.slice(-500) };
  }

  return finalResult;
}

// ── Helper: update mission progress ──
function updateMissionProgress(manager: ManagerProfile, missionType: string, amount: number): ManagerProfile {
  const missions = manager.activeMissions ?? [];
  let changed = false;
  const updated = missions.map(m => {
    if (m.type === missionType && !m.isCompleted) {
      changed = true;
      return { ...m, progress: Math.min(m.target, m.progress + amount) };
    }
    return m;
  });
  if (!changed) return manager;
  return { ...manager, activeMissions: updated };
}

function updateTable(
  table: TableEntry[],
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number
): void {
  const homeEntry = table.find((e) => e.teamId === homeId);
  const awayEntry = table.find((e) => e.teamId === awayId);

  if (homeEntry) {
    homeEntry.played++;
    homeEntry.goalsFor += homeGoals;
    homeEntry.goalsAgainst += awayGoals;
    homeEntry.goalDifference = homeEntry.goalsFor - homeEntry.goalsAgainst;

    if (homeGoals > awayGoals) {
      homeEntry.won++;
      homeEntry.points += 3;
      homeEntry.form = [...homeEntry.form, 'W' as const].slice(-5);
    } else if (homeGoals < awayGoals) {
      homeEntry.lost++;
      homeEntry.form = [...homeEntry.form, 'L' as const].slice(-5);
    } else {
      homeEntry.drawn++;
      homeEntry.points += 1;
      homeEntry.form = [...homeEntry.form, 'D' as const].slice(-5);
    }
  }

  if (awayEntry) {
    awayEntry.played++;
    awayEntry.goalsFor += awayGoals;
    awayEntry.goalsAgainst += homeGoals;
    awayEntry.goalDifference = awayEntry.goalsFor - awayEntry.goalsAgainst;

    if (awayGoals > homeGoals) {
      awayEntry.won++;
      awayEntry.points += 3;
      awayEntry.form = [...awayEntry.form, 'W' as const].slice(-5);
    } else if (awayGoals < homeGoals) {
      awayEntry.lost++;
      awayEntry.form = [...awayEntry.form, 'L' as const].slice(-5);
    } else {
      awayEntry.drawn++;
      awayEntry.points += 1;
      awayEntry.form = [...awayEntry.form, 'D' as const].slice(-5);
    }
  }

  // Re-sort table
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // Update positions
  table.forEach((entry, idx) => {
    entry.position = idx + 1;
  });
}

/**
 * Summary of what happened while advancing multiple days.
 */
export interface AdvanceSummary {
  daysAdvanced: number;
  fromDate: string;
  toDate: string;
  /** The reason we stopped */
  stoppedFor: 'match' | 'press_conference' | 'transfer_offer' | 'week_end' | 'none';
  /** News generated during the skip */
  newNews: string[];
  /** Players that returned from injury */
  injuryReturns: string[];
  /** Players that got injured in training */
  trainingInjuries: string[];
  /** Training sessions completed */
  trainingSessions: string[];
}

/**
 * Advance to the next meaningful event.
 * Stops at: match day, press conference day, pending transfer offers.
 * Internally calls advanceDay() in a loop and collects a summary.
 */
export function advanceToNextEvent(state: GameState): { state: GameState; summary: AdvanceSummary } {
  const startDate = state.currentDate;
  const startNewsCount = state.news.length;
  let current = state;
  let daysAdvanced = 0;
  const maxDays = 60;

  const summary: AdvanceSummary = {
    daysAdvanced: 0,
    fromDate: startDate,
    toDate: startDate,
    stoppedFor: 'none',
    newNews: [],
    injuryReturns: [],
    trainingInjuries: [],
    trainingSessions: [],
  };

  while (daysAdvanced < maxDays) {
    // Before advancing: check if CURRENT date has a blocking event
    if (daysAdvanced > 0) {
      // Match today? (league schedules)
      // Matches MUST be checked BEFORE Sunday pause to avoid skipping cup/intl matches on Sundays
      const hasLeagueMatch = current.schedules.some((s) =>
        s.matches.some((m) => m.date === current.currentDate && !m.isPlayed &&
          (m.homeTeamId === current.currentTeamId || m.awayTeamId === current.currentTeamId))
      );
      if (hasLeagueMatch) {
        summary.stoppedFor = 'match';
        break;
      }

      // Cup match today?
      if (current.cupState && !current.cupState.isFinished) {
        const cupRound = current.cupState.rounds[current.cupState.currentRound];
        const hasCupMatch = cupRound?.matches.some(
          (m) => m.date === current.currentDate && !m.isPlayed &&
            (m.homeTeamId === current.currentTeamId || m.awayTeamId === current.currentTeamId)
        );
        if (hasCupMatch) {
          summary.stoppedFor = 'match';
          break;
        }
      }

      // International match today?
      if (current.internationalState && !current.internationalState.isFinished && !current.internationalState.isEliminated) {
        const intl = current.internationalState;
        const intlMatches = [...(intl.leaguePhase?.matches ?? []), ...(intl.knockoutMatches ?? [])];
        const hasIntlMatch = intlMatches.some(
          (m) => m.date === current.currentDate && !m.isPlayed &&
            (m.homeTeamId === current.currentTeamId || m.awayTeamId === current.currentTeamId)
        );
        if (hasIntlMatch) {
          summary.stoppedFor = 'match';
          break;
        }
      }

      // Press conference today (unresolved)?
      const hasPK = current.pressConferences.some(
        (pc) => pc.date === current.currentDate && !pc.isCompleted
      );
      if (hasPK) {
        summary.stoppedFor = 'press_conference';
        break;
      }

      // Pending incoming transfer offers?
      const hasPendingOffers = current.transfers.offers.some(
        (o) => o.toTeamId === current.currentTeamId && o.status === 'pending'
      );
      if (hasPendingOffers) {
        summary.stoppedFor = 'transfer_offer';
        break;
      }

      // Stop every Sunday so the user can interact with the dashboard
      // Checked AFTER matches/PK/transfers so those events on Sundays are not missed
      if (getDayOfWeek(current.currentDate) === 0) {
        summary.stoppedFor = 'week_end';
        break;
      }
    }

    // Track injury returns before advancing
    const injuredBefore = current.players
      .filter((p) => p.teamId === current.currentTeamId && p.injury)
      .map((p) => p.id);

    // Advance one day
    current = advanceDay(current);
    daysAdvanced++;

    // Track injury returns after advancing
    for (let i = 0; i < injuredBefore.length; i++) {
      const p = current.players.find((pl) => pl.id === injuredBefore[i]);
      if (p && !p.injury) {
        summary.injuryReturns.push(`${p.firstName} ${p.lastName}`);
      }
    }

    // Track training sessions (news with "Wochentraining" in title)
    const newNewsItems = current.news.slice(startNewsCount + summary.newNews.length);
    for (const n of newNewsItems) {
      summary.newNews.push(n.title);
      if (n.title.startsWith('Wochentraining:')) {
        summary.trainingSessions.push(n.title);
      }
      if (n.title.includes('verletzt') || (n.content && n.content.includes('verletzt'))) {
        summary.trainingInjuries.push(n.title);
      }
    }
  }

  summary.daysAdvanced = daysAdvanced;
  summary.toDate = current.currentDate;

  return { state: current, summary };
}
