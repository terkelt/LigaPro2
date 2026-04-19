import { League } from '@/types/league';
import { Team } from '@/types/team';

import bundesligaLeague from '@/data/leagues/bundesliga.json';
import zweiteLigaLeague from '@/data/leagues/zweite-liga.json';
import dritteLigaLeague from '@/data/leagues/dritte-liga.json';
import premierLeagueLeague from '@/data/leagues/premier-league.json';
import laLigaLeague from '@/data/leagues/la-liga.json';
import serieALeague from '@/data/leagues/serie-a.json';
import ligue1League from '@/data/leagues/ligue-1.json';
import eredivisieLeague from '@/data/leagues/eredivisie.json';
import primeiraLigaLeague from '@/data/leagues/primeira-liga.json';
import belgianProLeagueLeague from '@/data/leagues/belgian-pro-league.json';
import scottishPremiershipLeague from '@/data/leagues/scottish-premiership.json';

import bundesligaTeams from '@/data/teams/bundesliga.json';
import zweiteLigaTeams from '@/data/teams/zweite-liga.json';
import dritteLigaTeams from '@/data/teams/dritte-liga.json';
import premierLeagueTeams from '@/data/teams/premier-league.json';
import laLigaTeams from '@/data/teams/la-liga.json';
import serieATeams from '@/data/teams/serie-a.json';
import ligue1Teams from '@/data/teams/ligue-1.json';
import eredivisieTeams from '@/data/teams/eredivisie.json';
import primeiraLigaTeams from '@/data/teams/primeira-liga.json';
import belgianProLeagueTeams from '@/data/teams/belgian-pro-league.json';
import scottishPremiershipTeams from '@/data/teams/scottish-premiership.json';

export function loadLeagues(): League[] {
  return [
    bundesligaLeague as League,
    zweiteLigaLeague as League,
    dritteLigaLeague as League,
    premierLeagueLeague as League,
    laLigaLeague as League,
    serieALeague as League,
    ligue1League as League,
    eredivisieLeague as League,
    primeiraLigaLeague as League,
    belgianProLeagueLeague as League,
    scottishPremiershipLeague as League,
  ];
}

export function loadTeams(): Team[] {
  return [
    ...(bundesligaTeams as Team[]),
    ...(zweiteLigaTeams as Team[]),
    ...(dritteLigaTeams as Team[]),
    ...(premierLeagueTeams as Team[]),
    ...(laLigaTeams as Team[]),
    ...(serieATeams as Team[]),
    ...(ligue1Teams as Team[]),
    ...(eredivisieTeams as Team[]),
    ...(primeiraLigaTeams as Team[]),
    ...(belgianProLeagueTeams as Team[]),
    ...(scottishPremiershipTeams as Team[]),
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
