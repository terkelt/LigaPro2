/**
 * Season Review Engine — computes season review data from GameState.
 * Used to render the end-of-season "Wrapped"-style review.
 */

import { GameState } from '@/types/game';
import { Player } from '@/types/player';
import { MatchResult } from '@/types/match';

export interface SeasonReviewData {
  seasonYear: string;
  position: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  totalMatches: number;

  mvp: { name: string; position: string; goals: number; assists: number; avgRating: number } | null;
  topScorer: { name: string; goals: number; assists: number } | null;
  topAssist: { name: string; assists: number; goals: number } | null;
  bestRating: { name: string; avgRating: number; matches: number } | null;

  biggestWin: { opponent: string; score: string; date: string } | null;
  biggestLoss: { opponent: string; score: string; date: string } | null;
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  comebacks: number;

  budgetStart: number;
  budgetEnd: number;
  transferSpent: number;
  transferEarned: number;
  squadValueStart: number;
  squadValueEnd: number;

  cleanSheets: number;
}

export function computeSeasonReview(state: GameState): SeasonReviewData | null {
  const teamId = state.currentTeamId;
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return null;

  const leagueId = team.league;
  const table = state.tables[leagueId];
  const myEntry = table?.find(e => e.teamId === teamId);

  // Gather all results for the player's team
  const myResults = state.results.filter(
    r => (r.homeTeamId === teamId || r.awayTeamId === teamId) && r.competition === 'league'
  );

  if (myResults.length === 0) return null;

  // Basic stats
  let wins = 0, draws = 0, losses = 0, goalsScored = 0, goalsConceded = 0;
  let biggestWinDiff = 0, biggestLossDiff = 0;
  let biggestWin: SeasonReviewData['biggestWin'] = null;
  let biggestLoss: SeasonReviewData['biggestLoss'] = null;
  let winStreak = 0, maxWinStreak = 0, unbeatenStreak = 0, maxUnbeatenStreak = 0, comebacks = 0;

  // Player stats from results
  const playerGoals: Record<string, number> = {};
  const playerAssists: Record<string, number> = {};
  const playerRatings: Record<string, { total: number; count: number }> = {};

  let cleanSheets = 0;

  for (const r of myResults) {
    const isHome = r.homeTeamId === teamId;
    const myScore = isHome ? r.homeScore : r.awayScore;
    const oppScore = isHome ? r.awayScore : r.homeScore;
    const oppId = isHome ? r.awayTeamId : r.homeTeamId;
    const oppTeam = state.teams.find(t => t.id === oppId);
    const oppName = oppTeam?.shortName ?? oppTeam?.name ?? 'Unbekannt';
    const diff = myScore - oppScore;

    goalsScored += myScore;
    goalsConceded += oppScore;

    if (diff > 0) {
      wins++;
      winStreak++;
      unbeatenStreak++;
      if (winStreak > maxWinStreak) maxWinStreak = winStreak;
      if (unbeatenStreak > maxUnbeatenStreak) maxUnbeatenStreak = unbeatenStreak;
    } else if (diff === 0) {
      draws++;
      winStreak = 0;
      unbeatenStreak++;
      if (unbeatenStreak > maxUnbeatenStreak) maxUnbeatenStreak = unbeatenStreak;
    } else {
      losses++;
      winStreak = 0;
      unbeatenStreak = 0;
    }

    // Check for comebacks (was losing, ended up winning)
    // Simple heuristic: if opponent scored first and we won
    if (diff > 0 && oppScore > 0) comebacks++;

    if (diff > biggestWinDiff) {
      biggestWinDiff = diff;
      biggestWin = { opponent: oppName, score: `${myScore}:${oppScore}`, date: r.date };
    }
    if (diff < biggestLossDiff) {
      biggestLossDiff = diff;
      biggestLoss = { opponent: oppName, score: `${myScore}:${oppScore}`, date: r.date };
    }

    if (oppScore === 0) cleanSheets++;

    // Player stats
    const myRatings = isHome ? (r.homeRatings ?? []) : (r.awayRatings ?? []);
    for (const pr of myRatings) {
      playerGoals[pr.playerId] = (playerGoals[pr.playerId] ?? 0) + pr.goals;
      playerAssists[pr.playerId] = (playerAssists[pr.playerId] ?? 0) + pr.assists;
      if (!playerRatings[pr.playerId]) playerRatings[pr.playerId] = { total: 0, count: 0 };
      playerRatings[pr.playerId].total += pr.rating;
      playerRatings[pr.playerId].count++;
    }
  }

  const findPlayer = (id: string): Player | undefined => state.players.find(p => p.id === id);
  const playerName = (id: string) => {
    const p = findPlayer(id);
    return p ? `${p.firstName?.charAt(0)}. ${p.lastName}` : 'Unbekannt';
  };
  const playerPos = (id: string) => findPlayer(id)?.position ?? '?';

  // Top scorer
  const scorerEntries = Object.entries(playerGoals).filter(([, g]) => g > 0).sort((a, b) => b[1] - a[1]);
  const topScorer = scorerEntries[0]
    ? { name: playerName(scorerEntries[0][0]), goals: scorerEntries[0][1], assists: playerAssists[scorerEntries[0][0]] ?? 0 }
    : null;

  // Top assist
  const assistEntries = Object.entries(playerAssists).filter(([, a]) => a > 0).sort((a, b) => b[1] - a[1]);
  const topAssist = assistEntries[0]
    ? { name: playerName(assistEntries[0][0]), assists: assistEntries[0][1], goals: playerGoals[assistEntries[0][0]] ?? 0 }
    : null;

  // Best rating
  const ratingEntries = Object.entries(playerRatings).filter(([, r]) => r.count >= 5).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count));
  const bestRating = ratingEntries[0]
    ? { name: playerName(ratingEntries[0][0]), avgRating: Math.round((ratingEntries[0][1].total / ratingEntries[0][1].count) * 10) / 10, matches: ratingEntries[0][1].count }
    : null;

  // MVP: composite score = goals*3 + assists*2 + avgRating*5
  let mvpId: string | null = null;
  let mvpScore = 0;
  for (const [id] of Object.entries(playerGoals)) {
    const goals = playerGoals[id] ?? 0;
    const assists = playerAssists[id] ?? 0;
    const rating = playerRatings[id] ? playerRatings[id].total / playerRatings[id].count : 6;
    const score = goals * 3 + assists * 2 + rating * 5;
    if (score > mvpScore) { mvpScore = score; mvpId = id; }
  }
  const mvp = mvpId ? {
    name: playerName(mvpId),
    position: playerPos(mvpId),
    goals: playerGoals[mvpId] ?? 0,
    assists: playerAssists[mvpId] ?? 0,
    avgRating: playerRatings[mvpId] ? Math.round((playerRatings[mvpId].total / playerRatings[mvpId].count) * 10) / 10 : 0,
  } : null;

  // Financial data
  const fin = state.finances[teamId];
  const transferSpent = state.transfers.completed
    .filter(t => t.toTeamId === teamId)
    .reduce((s, t) => s + t.fee, 0);
  const transferEarned = state.transfers.completed
    .filter(t => t.fromTeamId === teamId)
    .reduce((s, t) => s + t.fee, 0);

  const squadValueEnd = state.players
    .filter(p => p.teamId === teamId)
    .reduce((s, p) => s + p.marketValue, 0);

  return {
    seasonYear: state.season.year,
    position: myEntry ? table!.indexOf(myEntry) + 1 : 0,
    points: myEntry?.points ?? 0,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    totalMatches: myResults.length,
    mvp,
    topScorer,
    topAssist,
    bestRating,
    biggestWin,
    biggestLoss,
    longestWinStreak: maxWinStreak,
    longestUnbeatenStreak: maxUnbeatenStreak,
    comebacks,
    budgetStart: 0,
    budgetEnd: fin?.balance ?? 0,
    transferSpent,
    transferEarned,
    squadValueStart: 0,
    squadValueEnd,
    cleanSheets,
  };
}
