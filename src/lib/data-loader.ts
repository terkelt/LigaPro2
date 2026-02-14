import { League } from '@/types/league';
import { Team } from '@/types/team';

import bundesligaLeague from '@/data/leagues/bundesliga.json';
import zweiteLigaLeague from '@/data/leagues/zweite-liga.json';
import dritteLigaLeague from '@/data/leagues/dritte-liga.json';

import bundesligaTeams from '@/data/teams/bundesliga.json';
import zweiteLigaTeams from '@/data/teams/zweite-liga.json';
import dritteLigaTeams from '@/data/teams/dritte-liga.json';

export function loadLeagues(): League[] {
  return [
    bundesligaLeague as League,
    zweiteLigaLeague as League,
    dritteLigaLeague as League,
  ];
}

export function loadTeams(): Team[] {
  return [
    ...(bundesligaTeams as Team[]),
    ...(zweiteLigaTeams as Team[]),
    ...(dritteLigaTeams as Team[]),
  ];
}

export function getTeamsByLeague(leagueId: string): Team[] {
  const allTeams = loadTeams();
  return allTeams.filter((t) => t.league === leagueId);
}

export function getTeamById(teamId: string): Team | undefined {
  return loadTeams().find((t) => t.id === teamId);
}

export function getLeagueById(leagueId: string): League | undefined {
  return loadLeagues().find((l) => l.id === leagueId);
}
