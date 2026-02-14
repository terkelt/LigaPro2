import { Position, FootPreference } from '@/types/player';

/** Compact real-player seed used to generate full Player objects */
export interface RealPlayerSeed {
  fn: string;        // firstName
  ln: string;        // lastName
  pos: Position;
  nat: string;       // nationality
  dob: string;       // date of birth YYYY-MM-DD
  ovr: number;       // target overall rating (1-99)
  nr: number;        // shirt number
  foot?: 'L' | 'R' | 'B';
  h?: number;        // height cm
  w?: number;        // weight kg
  pot?: number;      // potential (if different from auto-calc)
  sec?: Position[];  // secondary positions
  /** Explicit trait assignments: [traitId, tier] tuples */
  tr?: [string, 'bronze' | 'silver' | 'gold'][];
}

export interface TeamRoster {
  teamId: string;
  players: RealPlayerSeed[];
}
