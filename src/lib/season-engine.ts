/**
 * Season Engine — handles end-of-season logic and new season initialization.
 *
 * End of season:
 *  - Determine champions, promoted, relegated teams per league
 *  - Award prize money based on final position
 *  - Expire contracts (players become free agents)
 *  - Age all players, apply physical decline for 30+
 *  - Generate SeasonSummary for archive
 *  - Generate news for all major events
 *
 * New season:
 *  - Swap promoted/relegated teams between leagues
 *  - Reset tables, generate new schedules
 *  - Increment season counter
 *  - Trigger preseason phase
 *  - Reset player stats
 */
import { GameState } from '@/types/game';
import { initializeInternational } from './international-engine';
import { League, Season, SeasonSummary, TableEntry } from '@/types/league';
import { Team } from '@/types/team';
import { Player } from '@/types/player';
import { Match, Schedule } from '@/types/match';
import { NewsItem } from '@/types/news';
import { FinanceRecord } from '@/types/finance';
import { generateAllSchedules } from './schedule-generator';
import {
  processVirtualLeaguesEndOfSeason,
  replenishVirtualLeagues,
  initializeVirtualLeagues,
} from './virtual-league-engine';
import { processRatingChanges } from './rating-engine';
import { calcStableMarketValue } from './transfer-engine';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// ── Prize Money Tables (per league tier, by position) ──
const PRIZE_MONEY: Record<number, number[]> = {
  // Tier 1 (Bundesliga): positions 1-18
  1: [
    35_000_000, 30_000_000, 26_000_000, 22_000_000, 19_000_000,
    16_000_000, 14_000_000, 12_000_000, 10_500_000, 9_000_000,
    8_000_000, 7_000_000, 6_000_000, 5_500_000, 5_000_000,
    4_500_000, 4_000_000, 3_500_000,
  ],
  // Tier 2 (2. Bundesliga): positions 1-18
  2: [
    5_000_000, 4_200_000, 3_600_000, 3_000_000, 2_500_000,
    2_200_000, 2_000_000, 1_800_000, 1_600_000, 1_400_000,
    1_200_000, 1_100_000, 1_000_000, 900_000, 800_000,
    700_000, 600_000, 500_000,
  ],
  // Tier 3 (3. Liga): positions 1-20
  3: [
    1_500_000, 1_200_000, 1_000_000, 850_000, 750_000,
    650_000, 600_000, 550_000, 500_000, 450_000,
    400_000, 380_000, 360_000, 340_000, 320_000,
    300_000, 280_000, 260_000, 240_000, 220_000,
  ],
};

// ── Determine season results per league ──
interface LeagueSeasonResult {
  leagueId: string;
  tier: number;
  champion: string;
  promoted: string[];       // teams moving up
  relegated: string[];      // teams moving down
  playoffPromo: string[];   // teams in promotion playoff
  playoffReleg: string[];   // teams in relegation playoff
  table: TableEntry[];
}

function resolveLeagueResults(league: League, table: TableEntry[]): LeagueSeasonResult {
  const sorted = [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  const champion = sorted[0]?.teamId ?? '';

  // Promotion (only for tier 2 and 3)
  const promoted: string[] = [];
  const playoffPromo: string[] = [];
  if (league.tier >= 2) {
    for (let i = 0; i < league.promotion.automatic; i++) {
      if (sorted[i]) promoted.push(sorted[i].teamId);
    }
    for (let i = league.promotion.automatic; i < league.promotion.automatic + league.promotion.playoff; i++) {
      if (sorted[i]) playoffPromo.push(sorted[i].teamId);
    }
  }

  // Relegation (only for tier 1 and 2)
  const relegated: string[] = [];
  const playoffReleg: string[] = [];
  if (league.tier <= 2) {
    const n = sorted.length;
    for (let i = 0; i < league.relegation.automatic; i++) {
      if (sorted[n - 1 - i]) relegated.push(sorted[n - 1 - i].teamId);
    }
    for (let i = league.relegation.automatic; i < league.relegation.automatic + league.relegation.playoff; i++) {
      if (sorted[n - 1 - i]) playoffReleg.push(sorted[n - 1 - i].teamId);
    }
  }

  return {
    leagueId: league.id,
    tier: league.tier,
    champion,
    promoted,
    relegated,
    playoffPromo,
    playoffReleg,
    table: sorted,
  };
}

// ── Award prize money ──
function awardPrizeMoney(
  finances: Record<string, FinanceRecord>,
  table: TableEntry[],
  tier: number,
): Record<string, FinanceRecord> {
  const prizes = PRIZE_MONEY[tier] || PRIZE_MONEY[3];
  const updated = { ...finances };

  table.forEach((entry, idx) => {
    const prize = prizes[idx] ?? prizes[prizes.length - 1];
    const existing = updated[entry.teamId];
    if (existing) {
      updated[entry.teamId] = {
        ...existing,
        balance: existing.balance + prize,
      };
    }
  });

  return updated;
}

// ── Expire contracts ──
function processContracts(players: Player[], currentDate: string, seasonEndYear: number): {
  updatedPlayers: Player[];
  expiredNames: string[];
} {
  const expiredNames: string[] = [];
  const updatedPlayers = players.map(p => {
    const contractYear = parseInt(p.contractUntil.substring(0, 4));
    if (contractYear <= seasonEndYear) {
      // Contract expired — player becomes a free agent (stays on team for now, but flagged)
      expiredNames.push(`${p.firstName} ${p.lastName}`);
      return {
        ...p,
        contractUntil: `${seasonEndYear + 1}-06-30`, // auto-extend 1 year (simplified)
        salary: Math.round(p.salary * 0.9), // slight salary reduction for auto-extension
      };
    }
    return p;
  });
  return { updatedPlayers, expiredNames };
}

// ── Age players + physical decline ──
function ageAndDecline(players: Player[], gameDate: string): Player[] {
  return players.map(p => {
    const age = new Date(gameDate).getFullYear() - new Date(p.dateOfBirth).getFullYear();

    // Physical decline for players 31+
    if (age >= 34) {
      return {
        ...p,
        attributes: {
          ...p.attributes,
          pace: Math.max(20, p.attributes.pace - 3),
          acceleration: Math.max(20, p.attributes.acceleration - 3),
          stamina: Math.max(30, p.attributes.stamina - 2),
          jumping: Math.max(20, p.attributes.jumping - 2),
          strength: Math.max(30, p.attributes.strength - 1),
        },
      };
    }
    if (age >= 31) {
      return {
        ...p,
        attributes: {
          ...p.attributes,
          pace: Math.max(25, p.attributes.pace - 1),
          acceleration: Math.max(25, p.attributes.acceleration - 1),
          stamina: Math.max(35, p.attributes.stamina - 1),
        },
      };
    }

    // Young player growth (under 23)
    if (age <= 22 && p.potential > 0) {
      const gap = p.potential - calcSimpleOverall(p);
      if (gap > 5) {
        const boost = Math.min(3, Math.floor(gap / 5));
        const attrs = { ...p.attributes };
        // Boost 2-3 random attributes
        const keys = Object.keys(attrs) as (keyof typeof attrs)[];
        for (let i = 0; i < boost; i++) {
          const key = keys[Math.floor(Math.random() * keys.length)];
          (attrs as Record<string, number>)[key] = Math.min(99, attrs[key] + 1);
        }
        return { ...p, attributes: attrs };
      }
    }

    return p;
  });
}

function calcSimpleOverall(p: Player): number {
  const a = p.attributes;
  if (p.position === 'TW') return Math.round(a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1);
  return Math.round(
    (a.pace + a.shooting + a.passing + a.dribbling + a.positioning + a.stamina + a.composure + a.ballControl) / 8
  );
}

// ── Reset player stats for new season ──
function resetPlayerStats(players: Player[]): Player[] {
  return players.map(p => ({
    ...p,
    stats: {
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      avgRating: 0,
      minutesPlayed: 0,
      yellowCards: 0,
      redCards: 0,
    },
    formHistory: [],
    ratingHistory: [],
    form: 60 + Math.floor(Math.random() * 20),
    condition: 80 + Math.floor(Math.random() * 20),
    fatigue: 0,
    matchPractice: 40,
    suspended: false,
    suspendedMatches: 0,
    injury: undefined,
    trainingBoosts: [],
  }));
}

// ── Swap promoted/relegated teams between leagues ──
function swapTeams(
  teams: Team[],
  leagues: League[],
  results: LeagueSeasonResult[],
): Team[] {
  // Build swap pairs: tier N relegated ↔ tier N+1 promoted (same country only)
  const swaps: { teamId: string; fromLeague: string; toLeague: string }[] = [];

  for (const result of results) {
    const currentLeague = leagues.find(l => l.id === result.leagueId);
    if (!currentLeague) continue;
    const country = currentLeague.country;
    const higherTierLeague = leagues.find(l => l.tier === result.tier - 1 && l.country === country);
    const lowerTierLeague = leagues.find(l => l.tier === result.tier + 1 && l.country === country);

    // Promoted teams go to higher tier
    if (higherTierLeague) {
      for (const teamId of result.promoted) {
        swaps.push({ teamId, fromLeague: result.leagueId, toLeague: higherTierLeague.id });
      }
    }

    // Relegated teams go to lower tier
    if (lowerTierLeague) {
      for (const teamId of result.relegated) {
        swaps.push({ teamId, fromLeague: result.leagueId, toLeague: lowerTierLeague.id });
      }
    }

    // Playoff teams: simplified — 50% chance of promotion/relegation
    if (higherTierLeague) {
      for (const teamId of result.playoffPromo) {
        if (Math.random() < 0.5) {
          swaps.push({ teamId, fromLeague: result.leagueId, toLeague: higherTierLeague.id });
        }
      }
    }
    if (lowerTierLeague) {
      for (const teamId of result.playoffReleg) {
        if (Math.random() < 0.5) {
          swaps.push({ teamId, fromLeague: result.leagueId, toLeague: lowerTierLeague.id });
        }
      }
    }
  }

  return teams.map(t => {
    const swap = swaps.find(s => s.teamId === t.id);
    if (swap) {
      return { ...t, league: swap.toLeague };
    }
    return t;
  });
}

// ── Generate Season Summary ──
function createSeasonSummary(
  state: GameState,
  result: LeagueSeasonResult,
  players: Player[],
): SeasonSummary {
  const leaguePlayers = players.filter(p => {
    const team = state.teams.find(t => t.id === p.teamId);
    return team?.league === result.leagueId;
  });

  const topScorer = leaguePlayers
    .filter(p => p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals)[0];

  const topAssist = leaguePlayers
    .filter(p => p.stats.assists > 0)
    .sort((a, b) => b.stats.assists - a.stats.assists)[0];

  const bestPlayer = leaguePlayers
    .filter(p => p.stats.appearances >= 10)
    .sort((a, b) => b.stats.avgRating - a.stats.avgRating)[0];

  const myEntry = result.table.find(e => e.teamId === state.currentTeamId);

  return {
    season: state.season.number,
    year: state.season.year,
    leagueId: result.leagueId,
    table: result.table,
    topScorer: topScorer
      ? { playerId: topScorer.id, goals: topScorer.stats.goals }
      : { playerId: '', goals: 0 },
    topAssist: topAssist
      ? { playerId: topAssist.id, assists: topAssist.stats.assists }
      : { playerId: '', assists: 0 },
    bestPlayer: bestPlayer
      ? { playerId: bestPlayer.id, avgRating: bestPlayer.stats.avgRating }
      : { playerId: '', avgRating: 0 },
    champions: result.champion,
    promoted: result.promoted,
    relegated: result.relegated,
    cupWinner: state.cupState.winnerId ?? '',
    playerTeamPosition: myEntry?.position ?? 0,
    playerTeamId: state.currentTeamId,
  };
}

// ═══════════════════════════════════════════════════════
// ── MAIN: Check if season should end ──
// ═══════════════════════════════════════════════════════

export function checkSeasonEnd(state: GameState): boolean {
  // Season ends when all matches in all schedules are played
  return state.schedules.every(s =>
    s.matches.every(m => m.isPlayed)
  );
}

// ═══════════════════════════════════════════════════════
// ── MAIN: Process end of season ──
// ═══════════════════════════════════════════════════════

export function processSeasonEnd(state: GameState): GameState {
  const news: NewsItem[] = [];

  // 1. Resolve all league results
  const leagueResults: LeagueSeasonResult[] = state.leagues.map(league => {
    const table = state.tables[league.id] || [];
    return resolveLeagueResults(league, table);
  });

  // 2. Generate champion/promotion/relegation news
  for (const result of leagueResults) {
    const league = state.leagues.find(l => l.id === result.leagueId);
    if (!league) continue;

    const championTeam = state.teams.find(t => t.id === result.champion);
    if (championTeam) {
      news.push({
        id: `champion-${result.leagueId}`,
        type: 'milestone',
        title: `${championTeam.name} ist ${league.name}-Meister!`,
        content: `${championTeam.name} hat die Saison ${state.season.year} als Meister der ${league.name} abgeschlossen.`,
        date: state.currentDate,
        isRead: false,
        importance: result.champion === state.currentTeamId ? 'high' : 'medium',
      });
    }

    for (const teamId of result.promoted) {
      const team = state.teams.find(t => t.id === teamId);
      if (team) {
        news.push({
          id: `promoted-${teamId}`,
          type: 'milestone',
          title: `${team.name} steigt auf!`,
          content: `${team.name} steigt in die nächsthöhere Liga auf.`,
          date: state.currentDate,
          isRead: false,
          importance: teamId === state.currentTeamId ? 'high' : 'low',
        });
      }
    }

    for (const teamId of result.relegated) {
      const team = state.teams.find(t => t.id === teamId);
      if (team) {
        news.push({
          id: `relegated-${teamId}`,
          type: 'milestone',
          title: `${team.name} steigt ab!`,
          content: `${team.name} steigt in die nächstniedrigere Liga ab.`,
          date: state.currentDate,
          isRead: false,
          importance: teamId === state.currentTeamId ? 'high' : 'low',
        });
      }
    }
  }

  // 3. Award prize money
  let updatedFinances = { ...state.finances };
  for (const result of leagueResults) {
    updatedFinances = awardPrizeMoney(updatedFinances, result.table, result.tier);
  }

  // Prize money news for player's team
  const myTeam = state.teams.find(t => t.id === state.currentTeamId);
  const myLeague = state.leagues.find(l => l.id === myTeam?.league);
  const myResult = leagueResults.find(r => r.leagueId === myTeam?.league);
  const myPosition = myResult?.table.find(e => e.teamId === state.currentTeamId)?.position ?? 10;
  const myPrize = PRIZE_MONEY[myLeague?.tier ?? 3]?.[myPosition - 1] ?? 0;
  if (myPrize > 0) {
    news.push({
      id: `prize-money-${state.currentTeamId}`,
      type: 'general',
      title: `Preisgeld: ${formatValue(myPrize)}`,
      content: `Für Platz ${myPosition} in der ${myLeague?.name ?? 'Liga'} erhält dein Team ${formatValue(myPrize)} Preisgeld.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    });
  }

  // 4. Process contracts
  const seasonEndYear = parseInt(state.season.year.split('/')[0]) + 1;
  const { updatedPlayers: contractPlayers, expiredNames } = processContracts(
    state.players, state.currentDate, seasonEndYear
  );
  if (expiredNames.length > 0) {
    news.push({
      id: `contracts-expired`,
      type: 'contract',
      title: `${expiredNames.length} Verträge verlängert`,
      content: `Folgende Spieler wurden automatisch um 1 Jahr verlängert: ${expiredNames.slice(0, 5).join(', ')}${expiredNames.length > 5 ? ` und ${expiredNames.length - 5} weitere` : ''}.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'medium',
    });
  }

  // 5. Age and decline
  const agedPlayers = ageAndDecline(contractPlayers, state.currentDate);

  // 6. Generate season summaries
  const summaries: SeasonSummary[] = leagueResults.map(result =>
    createSeasonSummary(state, result, state.players)
  );

  // 7. Update manager stats
  let updatedManager = { ...state.manager };
  if (myResult) {
    const isChampion = myResult.champion === state.currentTeamId;
    const isPromoted = myResult.promoted.includes(state.currentTeamId);
    const isRelegated = myResult.relegated.includes(state.currentTeamId);

    updatedManager = {
      ...updatedManager,
      stats: {
        ...updatedManager.stats,
        seasonsManaged: updatedManager.stats.seasonsManaged + 1,
        titlesWon: updatedManager.stats.titlesWon + (isChampion ? 1 : 0),
        promotions: updatedManager.stats.promotions + (isPromoted ? 1 : 0),
        relegations: updatedManager.stats.relegations + (isRelegated ? 1 : 0),
      },
    };
  }

  // Mark season as finished
  const finishedSeason: Season = {
    ...state.season,
    isFinished: true,
  };

  return {
    ...state,
    season: finishedSeason,
    players: agedPlayers,
    finances: updatedFinances,
    news: [...state.news, ...news],
    seasonArchive: [...state.seasonArchive, ...summaries],
    manager: updatedManager,
  };
}

// ═══════════════════════════════════════════════════════
// ── MAIN: Start new season ──
// ═══════════════════════════════════════════════════════

export function startNewSeason(state: GameState): GameState {
  // 1. Resolve league results for team swaps
  const leagueResults: LeagueSeasonResult[] = state.leagues.map(league => {
    const table = state.tables[league.id] || [];
    return resolveLeagueResults(league, table);
  });

  // 2. Swap promoted/relegated teams (German leagues: real tier swaps)
  const swappedTeams = swapTeams(state.teams, state.leagues, leagueResults);

  // 2b. Virtual league processing (non-German tier-1 leagues)
  const virtualLeagues = state.virtualLeagues ?? initializeVirtualLeagues();

  // Collect relegated team IDs per parent league (only for leagues without a real lower tier)
  const relegatedByLeague: Record<string, string[]> = {};
  for (const result of leagueResults) {
    const league = state.leagues.find(l => l.id === result.leagueId);
    if (!league) continue;
    // Only process virtual relegation for leagues that have NO real lower-tier league in same country
    const hasRealLowerTier = state.leagues.some(
      l => l.country === league.country && l.tier === league.tier + 1
    );
    if (!hasRealLowerTier && result.relegated.length > 0) {
      relegatedByLeague[league.id] = result.relegated;
    }
  }

  const virtualResult = processVirtualLeaguesEndOfSeason(
    virtualLeagues,
    state.leagues.map(l => ({ id: l.id, country: l.country, relegation: l.relegation })),
    relegatedByLeague,
    state.teams,
    state.season.number,
  );

  // Remove relegated teams (going to virtual league) from main teams/players
  let finalTeams = swappedTeams.filter(t => !virtualResult.relegatedTeamIds.includes(t.id));
  let finalPlayers = state.players.filter(p => !virtualResult.relegatedTeamIds.includes(p.teamId));

  // Add promoted teams from virtual leagues
  finalTeams = [...finalTeams, ...virtualResult.promotedTeams];
  finalPlayers = [...finalPlayers, ...virtualResult.promotedPlayers];

  // Replenish virtual leagues (fill gaps from promotions)
  const replenishedVirtual = replenishVirtualLeagues(
    virtualResult.updatedVirtualLeagues,
    state.season.number + 1,
  );

  // 2c. Season-end rating changes (before stats reset, so performance is still available)
  const endRatingResult = processRatingChanges(
    finalPlayers, state.currentTeamId, state.currentDate, 'season_end', state.season.number
  );
  const ratedPlayers = endRatingResult.updatedPlayers;

  // 3. Reset player stats
  const freshPlayers = resetPlayerStats(ratedPlayers);

  // 3b. Season-start rating changes (young talent boost, veteran decline for new season)
  const newSeasonDate = `${parseInt(state.season.year.split('/')[0]) + 1}-07-01`;
  const startRatingResult = processRatingChanges(
    freshPlayers, state.currentTeamId, newSeasonDate, 'season_start', state.season.number + 1
  );

  // 3c. Recalculate ALL player market values based on updated attributes
  const seasonStartPlayers = startRatingResult.updatedPlayers.map(p => ({
    ...p,
    marketValue: calcStableMarketValue(p, newSeasonDate),
  }));

  // 4. New season metadata
  const prevSeasonNum = state.season.number;
  const prevYear = state.season.year; // "2025/26"
  const startYear = parseInt(prevYear.split('/')[0]) + 1;
  const newYear = `${startYear}/${(startYear + 1).toString().slice(-2)}`;
  const newStartDate = `${startYear}-07-01`;

  const newSeason: Season = {
    number: prevSeasonNum + 1,
    year: newYear,
    startDate: newStartDate,
    endDate: `${startYear + 1}-06-30`,
    currentMatchday: 0,
    isFinished: false,
  };

  // 5. Initialize new tables
  const newTables: Record<string, TableEntry[]> = {};
  for (const league of state.leagues) {
    newTables[league.id] = finalTeams
      .filter(t => t.league === league.id)
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

  // 6. Generate new schedules
  const newSchedules = generateAllSchedules(state.leagues, finalTeams, newStartDate);

  // 7. Reset cup state
  const newCupState = {
    rounds: [],
    currentRound: 0,
    isFinished: false,
    winnerId: undefined,
  };

  // 8. Reset preseason
  const newPreseason = {
    phase: 'camp_selection' as const,
    campDay: 0,
    friendlies: [],
    events: [],
    isCompleted: false,
  };

  // 9. News
  const news: NewsItem[] = [{
    id: `new-season-${newSeason.number}`,
    type: 'general',
    title: `Saison ${newYear} beginnt!`,
    content: `Die neue Saison ${newYear} steht vor der Tür. Bereite dein Team in der Vorsaison vor!`,
    date: newStartDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  }];

  // Virtual league news
  for (const vNews of virtualResult.news) {
    news.push({
      id: `virtual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'milestone',
      title: vNews.title,
      content: vNews.content,
      date: newStartDate,
      isRead: false,
      importance: 'medium',
    });
  }

  let newState: GameState = {
    ...state,
    season: newSeason,
    currentDate: newStartDate,
    teams: finalTeams,
    players: seasonStartPlayers,
    schedules: newSchedules,
    results: [],
    tables: newTables,
    cupState: newCupState,
    internationalState: undefined,
    preseason: newPreseason,
    news: [...state.news, ...news, ...endRatingResult.news, ...startRatingResult.news],
    isTransferWindowOpen: true,
    transferWindowType: 'summer',
    virtualLeagues: replenishedVirtual,
    // Keep: finances, sponsors, staff, achievements, seasonArchive, manager
  };

  // Initialize international competition if player qualified (based on previous season's table)
  newState = initializeInternational(newState);

  return newState;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}
