export type StaffRole = 'assistant_manager' | 'fitness_coach' | 'goalkeeping_coach' | 'youth_coach' | 'physiotherapist' | 'scout';

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  quality: number;          // 1-10
  salary: number;           // per year
  contractUntil: string;
  nationality: string;
  specialization?: string;
}

export interface Scout extends StaffMember {
  role: 'scout';
  region: ScoutRegion;
  currentAssignment?: ScoutAssignment;
}

export type ScoutRegion = 'germany' | 'europe_west' | 'europe_east' | 'south_america' | 'africa';

export interface ScoutAssignment {
  region: ScoutRegion;
  startDate: string;
  endDate: string;
  type: 'player_search' | 'opponent_analysis';
  targetTeamId?: string;
}

export interface ScoutReport {
  id: string;
  scoutId: string;
  playerId?: string;
  targetTeamId?: string;
  type: 'player' | 'opponent';
  date: string;
  quality: number;          // 1-10 (accuracy of report)

  // Player report fields
  estimatedAttributes?: Record<string, number>;
  potentialAssessment?: 'low' | 'average' | 'promising' | 'excellent' | 'world_class';
  recommendation?: 'sign_immediately' | 'monitor' | 'not_recommended';
  estimatedValue?: number;

  // Scout accuracy fields
  attributeJitter?: number;           // ±deviation for displayed attributes (0=exact)
  ovrRange?: { min: number; max: number }; // OVR range shown for Quick/Standard (undefined=exact)

  // Opponent report fields
  predictedFormation?: string;
  strengths?: string[];
  weaknesses?: string[];
  keyPlayers?: string[];
  tacticalAdvice?: string;
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  assistant_manager: 'Co-Trainer',
  fitness_coach: 'Fitness-Coach',
  goalkeeping_coach: 'Torwart-Trainer',
  youth_coach: 'Jugendtrainer',
  physiotherapist: 'Physiotherapeut',
  scout: 'Scout',
};

export const SCOUT_REGION_LABELS: Record<ScoutRegion, string> = {
  germany: 'Deutschland',
  europe_west: 'Westeuropa',
  europe_east: 'Osteuropa',
  south_america: 'Südamerika',
  africa: 'Afrika',
};
