export interface League {
  id: string;
  name: string;
  shortName: string;
  country: string;
  tier: 1 | 2 | 3;
  numberOfTeams: number;
  matchdays: number;
  promotion: { automatic: number; playoff: number };
  relegation: { automatic: number; playoff: number };
  tvMoney: { first: number; last: number };
  internationalSpots: {
    championsLeague: number;
    europaLeague: number;
    conferenceLeague: number;
  };
}

export interface TableEntry {
  position: number;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

// ── Virtual (simulated) lower leagues ──
// These represent 2nd divisions that don't exist as playable leagues.
// They are fully simulated at end-of-season to produce promotion candidates.
export interface VirtualLeagueTeam {
  id: string;           // e.g. "virt-eng-norwich"
  name: string;
  shortName: string;
  strength: number;     // 30-70 overall strength rating
  country: string;
  stadiumName: string;
  stadiumCapacity: number;
  city: string;
  colors: { primary: string; secondary: string };
  budget: number;
  salaryBudget: number;
  reputation: number;   // 30-60
}

export interface VirtualLeague {
  id: string;           // e.g. "virtual-championship"
  name: string;         // e.g. "EFL Championship"
  country: string;
  parentLeagueId: string; // the real tier-1 league this feeds into
  teams: VirtualLeagueTeam[];
  table: VirtualLeagueTableEntry[];
  promotedTeamIds: string[];   // filled at end-of-season
  relegatedFromParent: string[]; // team IDs that came down from parent
}

export interface VirtualLeagueTableEntry {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Season {
  number: number;
  year: string;
  startDate: string;
  endDate: string;
  currentMatchday: number;
  isFinished: boolean;
}

export interface SeasonSummary {
  season: number;
  year: string;
  leagueId: string;
  table: TableEntry[];
  topScorer: { playerId: string; goals: number };
  topAssist: { playerId: string; assists: number };
  bestPlayer: { playerId: string; avgRating: number };
  champions: string;
  promoted: string[];
  relegated: string[];
  cupWinner: string;
  playerTeamPosition: number;
  playerTeamId: string;
}
