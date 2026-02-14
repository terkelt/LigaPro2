import { TeamRoster } from './types';
import { BUNDESLIGA_ROSTERS } from './bundesliga';
import { ZWEITE_LIGA_ROSTERS } from './zweite-liga';
import { DRITTE_LIGA_ROSTERS } from './dritte-liga';

/** All real player rosters indexed by teamId */
const ALL_ROSTERS: TeamRoster[] = [
  ...BUNDESLIGA_ROSTERS,
  ...ZWEITE_LIGA_ROSTERS,
  ...DRITTE_LIGA_ROSTERS,
];

const ROSTER_MAP = new Map<string, TeamRoster>(
  ALL_ROSTERS.map((r) => [r.teamId, r])
);

export function getRosterForTeam(teamId: string): TeamRoster | undefined {
  return ROSTER_MAP.get(teamId);
}

export { ALL_ROSTERS };
