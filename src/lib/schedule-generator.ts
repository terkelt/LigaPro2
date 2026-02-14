import { Match, Schedule } from '@/types/match';
import { League } from '@/types/league';
import { Team } from '@/types/team';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Round-robin schedule generator.
 * Creates home-and-away fixtures for a league season.
 * Uses the "circle method" for balanced scheduling.
 */
function generateRoundRobin(teamIds: string[]): string[][][] {
  const n = teamIds.length;
  const rounds: string[][][] = [];

  // If odd number of teams, add a "bye" placeholder
  const teams = [...teamIds];
  if (n % 2 !== 0) teams.push('BYE');
  const total = teams.length;
  const half = total / 2;
  const totalRounds = total - 1;

  // Fixed first team, rotate the rest
  for (let round = 0; round < totalRounds; round++) {
    const pairs: string[][] = [];
    for (let i = 0; i < half; i++) {
      const home = i === 0 ? teams[0] : teams[((round + i - 1) % (total - 1)) + 1];
      const awayIdx = ((round + (total - 1) - i - 1) % (total - 1)) + 1;
      const away = teams[awayIdx];

      if (home === 'BYE' || away === 'BYE') continue;

      // Alternate home/away for fairness
      if (round % 2 === 0) {
        pairs.push([home, away]);
      } else {
        pairs.push([away, home]);
      }
    }
    rounds.push(pairs);
  }

  return rounds;
}

function getMatchDate(
  seasonStart: string,
  matchday: number,
  leagueTier: number
): string {
  const start = new Date(seasonStart);

  // Bundesliga & 2.BL start mid-August, 3.Liga end of July
  if (leagueTier <= 2) {
    start.setMonth(7, 16); // Aug 16
  } else {
    start.setMonth(6, 26); // Jul 26
  }

  // Each matchday is roughly 1 week apart
  const matchDate = new Date(start);
  matchDate.setDate(matchDate.getDate() + (matchday - 1) * 7);

  // Winter break: Dec 23 - Jan 15 (24 days)
  const winterBreakStart = new Date(start.getFullYear(), 11, 23);
  const winterBreakEnd = new Date(start.getFullYear() + 1, 0, 17);
  const breakDurationMs = winterBreakEnd.getTime() - winterBreakStart.getTime();

  // If matchday falls on or after winter break start, shift forward by break duration
  if (matchDate >= winterBreakStart) {
    matchDate.setTime(matchDate.getTime() + breakDurationMs);
  }

  return matchDate.toISOString().split('T')[0];
}

function getMatchTime(matchday: number, matchIndex: number): string {
  // Saturday 15:30 is the main slot, some Friday evening, some Sunday
  const slots = ['15:30', '15:30', '15:30', '15:30', '18:30', '13:30', '15:30', '20:30', '17:30'];
  return slots[matchIndex % slots.length];
}

export function generateLeagueSchedule(
  league: League,
  teams: Team[],
  seasonStart: string
): Schedule {
  const leagueTeams = teams.filter((t) => t.league === league.id);
  const teamIds = leagueTeams.map((t) => t.id);

  // First half: round-robin
  const firstHalf = generateRoundRobin(teamIds);

  // Second half: reverse fixtures (swap home/away)
  const secondHalf = firstHalf.map((round) =>
    round.map(([home, away]) => [away, home])
  );

  const allRounds = [...firstHalf, ...secondHalf];
  const matches: Match[] = [];

  allRounds.forEach((round, roundIdx) => {
    const matchday = roundIdx + 1;
    const date = getMatchDate(seasonStart, matchday, league.tier);

    round.forEach((pair, pairIdx) => {
      const [homeId, awayId] = pair;
      const homeTeam = leagueTeams.find((t) => t.id === homeId);

      matches.push({
        id: generateId(),
        homeTeamId: homeId,
        awayTeamId: awayId,
        date,
        time: getMatchTime(matchday, pairIdx),
        matchday,
        competition: 'league',
        leagueId: league.id,
        venue: homeTeam?.stadium.name ?? '',
        isPlayed: false,
      });
    });
  });

  return {
    leagueId: league.id,
    season: 1,
    matches,
  };
}

export function generateAllSchedules(
  leagues: League[],
  teams: Team[],
  seasonStart: string
): Schedule[] {
  return leagues.map((league) =>
    generateLeagueSchedule(league, teams, seasonStart)
  );
}
