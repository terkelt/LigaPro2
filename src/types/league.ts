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
