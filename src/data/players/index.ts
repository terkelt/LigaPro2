import { TeamRoster } from './types';
import { BUNDESLIGA_ROSTERS } from './bundesliga';
import { ZWEITE_LIGA_ROSTERS } from './zweite-liga';
import { DRITTE_LIGA_ROSTERS } from './dritte-liga';
import { PREMIER_LEAGUE_ROSTERS } from './premier-league';
import { LA_LIGA_ROSTERS } from './la-liga';
import { SERIE_A_ROSTERS } from './serie-a';
import { LIGUE_1_ROSTERS } from './ligue-1';
import { EREDIVISIE_ROSTERS } from './eredivisie';
import { PRIMEIRA_LIGA_ROSTERS } from './primeira-liga';
import { BELGIAN_PRO_LEAGUE_ROSTERS } from './belgian-pro-league';
import { SCOTTISH_PREMIERSHIP_ROSTERS } from './scottish-premiership';

/** All real player rosters indexed by teamId */
const ALL_ROSTERS: TeamRoster[] = [
  ...BUNDESLIGA_ROSTERS,
  ...ZWEITE_LIGA_ROSTERS,
  ...DRITTE_LIGA_ROSTERS,
  ...PREMIER_LEAGUE_ROSTERS,
  ...LA_LIGA_ROSTERS,
  ...SERIE_A_ROSTERS,
  ...LIGUE_1_ROSTERS,
  ...EREDIVISIE_ROSTERS,
  ...PRIMEIRA_LIGA_ROSTERS,
  ...BELGIAN_PRO_LEAGUE_ROSTERS,
  ...SCOTTISH_PREMIERSHIP_ROSTERS,
];

const ROSTER_MAP = new Map<string, TeamRoster>(
  ALL_ROSTERS.map((r) => [r.teamId, r])
);

export function getRosterForTeam(teamId: string): TeamRoster | undefined {
  return ROSTER_MAP.get(teamId);
}

export { ALL_ROSTERS };
