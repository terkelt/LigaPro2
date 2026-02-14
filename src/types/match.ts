export type WeatherType = 'sunny' | 'rain' | 'heavy_rain' | 'snow' | 'hot' | 'cold';

export interface Weather {
  type: WeatherType;
  temperature: number;
  description: string;
}

export type MatchEventType =
  | 'goal'
  | 'assist'
  | 'shot_saved'
  | 'shot_missed'
  | 'shot_blocked'
  | 'shot_post'
  | 'foul'
  | 'yellow_card'
  | 'red_card'
  | 'second_yellow'
  | 'substitution'
  | 'injury'
  | 'penalty_scored'
  | 'penalty_missed'
  | 'penalty_saved'
  | 'free_kick_goal'
  | 'corner'
  | 'offside'
  | 'kick_off'
  | 'half_time'
  | 'full_time'
  | 'extra_time_start'
  | 'extra_time_end'
  | 'penalty_shootout'
  | 'tactical';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  teamId: string;
  playerId?: string;
  secondPlayerId?: string;
  description: string;
  devLog?: string[];
}

export interface MatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  offsides: number;
  passes: number;
  passAccuracy: number;
}

export interface PlayerMatchRating {
  playerId: string;
  rating: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  yellowCard: boolean;
  redCard: boolean;
}

export interface MatchResult {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  date: string;
  matchday: number;
  competition: 'league' | 'cup' | 'cl' | 'el' | 'ecl' | 'relegation' | 'friendly';
  leagueId?: string;
  weather: Weather;
  events: MatchEvent[];
  homeStats: MatchStats;
  awayStats: MatchStats;
  homeRatings: PlayerMatchRating[];
  awayRatings: PlayerMatchRating[];
  manOfTheMatch?: string;
  isDerby: boolean;
  isExtraTime: boolean;
  isPenaltyShootout: boolean;
  penaltyHome?: number;
  penaltyAway?: number;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  matchday: number;
  competition: 'league' | 'cup' | 'cl' | 'el' | 'ecl' | 'relegation' | 'friendly';
  leagueId?: string;
  cupRound?: string;
  venue: string;
  isPlayed: boolean;
  result?: MatchResult;
}

export interface Schedule {
  leagueId: string;
  season: number;
  matches: Match[];
}
