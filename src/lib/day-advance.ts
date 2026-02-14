import { GameState } from '@/types/game';
import { TableEntry } from '@/types/league';
import { Match, MatchResult } from '@/types/match';
import { simulateMatch } from './match-engine';
import { generateIncomingOffers } from './transfer-engine';
import { applyWeeklyTraining, decayTrainingBoosts, awardXP, tryAwardTraitOnLevelUp, checkTraitFromPerformance } from './training-engine';
import { generateDailyEvents } from './week-events';
import { generateWeeklyMissions, awardManagerXP } from './manager-engine';
import { ManagerProfile } from '@/types/manager';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay(); // 0=Sun, 1=Mon, ...
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

  // Find all matches for today across all schedules
  const todayMatches: { scheduleIdx: number; matchIdx: number; match: Match }[] = [];

  state.schedules.forEach((schedule, scheduleIdx) => {
    schedule.matches.forEach((match, matchIdx) => {
      if (match.date === currentDate && !match.isPlayed) {
        todayMatches.push({ scheduleIdx, matchIdx, match });
      }
    });
  });

  if (todayMatches.length === 0) {
    // No matches today: advance date + slight recovery
    let updatedPlayers = state.players.map((p) => {
      if (p.teamId !== state.currentTeamId) return p;
      return {
        ...p,
        condition: Math.min(100, p.condition + 2),
        fatigue: Math.max(0, p.fatigue - 3),
      };
    });

    let updatedTraining = state.training;
    const updatedNews = [...state.news];

    // Monday = apply weekly training + decay old boosts
    if (getDayOfWeek(currentDate) === 1 && state.training.lastTrainingDate !== currentDate) {
      // Decay existing boosts first
      updatedPlayers = decayTrainingBoosts(updatedPlayers);

      // Apply the selected training
      const { players: trainedPlayers, injuredPlayerNames } = applyWeeklyTraining(
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
          ...updatedTraining.weekHistory.slice(-20),
          { week: currentDate, type: state.training.selectedTraining },
        ],
      };

      // Generate training news
      const trainingName = state.training.selectedTraining;
      updatedNews.push({
        id: `news-training-${currentDate}`,
        date: currentDate,
        title: `Wochentraining: ${trainingName.charAt(0).toUpperCase() + trainingName.slice(1)}`,
        content: injuredPlayerNames.length > 0
          ? `Das Training wurde absolviert. Leider hat sich ${injuredPlayerNames.join(', ')} dabei verletzt.`
          : 'Das Wochentraining wurde erfolgreich absolviert.',
        type: 'general',
        importance: injuredPlayerNames.length > 0 ? 'high' : 'low',
        isRead: false,
      });
    }

    // Heal injuries (decrement daysRemaining)
    updatedPlayers = updatedPlayers.map((p) => {
      if (!p.injury || p.teamId !== state.currentTeamId) return p;
      const remaining = p.injury.daysRemaining - 1;
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

    const dayResult: GameState = {
      ...state,
      currentDate: nextDate,
      players: updatedPlayers,
      training: updatedTraining,
      news: updatedNews,
      pressConferences: updatedPressConferences,
      manager: updatedManager,
    };
    return state.isTransferWindowOpen ? generateIncomingOffers(dayResult) : dayResult;
  }

  // Simulate all matches
  const newSchedules = state.schedules.map((s) => ({ ...s, matches: [...s.matches] }));
  const newResults = [...state.results];
  const newTables = { ...state.tables };
  const newNews = [...state.news];
  let newPlayers = [...state.players];

  // Deep copy tables
  for (const key of Object.keys(newTables)) {
    newTables[key] = newTables[key].map((e) => ({ ...e }));
  }

  for (const { scheduleIdx, matchIdx, match } of todayMatches) {
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

      newNews.push({
        id: `match-${match.id}`,
        type: 'result',
        title: won
          ? `Sieg! ${playerScore}:${opponentScore} gegen ${opponent.name}`
          : lost
          ? `Niederlage! ${playerScore}:${opponentScore} gegen ${opponent.name}`
          : `Unentschieden! ${playerScore}:${opponentScore} gegen ${opponent.name}`,
        content: `${playerIsHome ? 'Heimspiel' : 'Auswärtsspiel'} am ${match.matchday}. Spieltag.`,
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
            minutesPlayed: p.stats.minutesPlayed + rating.minutesPlayed,
            yellowCards: p.stats.yellowCards + (rating.yellowCard ? 1 : 0),
            redCards: p.stats.redCards + (rating.redCard ? 1 : 0),
            avgRating: p.stats.appearances > 0
              ? (p.stats.avgRating * p.stats.appearances + rating.rating) / (p.stats.appearances + 1)
              : rating.rating,
          },
          form: Math.max(1, Math.min(100, p.form + (rating.rating >= 7 ? 3 : rating.rating >= 6 ? 0 : -3))),
          condition: Math.max(40, p.condition - 8),
          fatigue: Math.min(100, p.fatigue + 15),
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
  };

  return state.isTransferWindowOpen ? generateIncomingOffers(baseResult) : baseResult;
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
  stoppedFor: 'match' | 'press_conference' | 'transfer_offer' | 'none';
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
      // Match today?
      const hasMatch = current.schedules.some((s) =>
        s.matches.some((m) => m.date === current.currentDate && !m.isPlayed &&
          (m.homeTeamId === current.currentTeamId || m.awayTeamId === current.currentTeamId))
      );
      if (hasMatch) {
        summary.stoppedFor = 'match';
        break;
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
