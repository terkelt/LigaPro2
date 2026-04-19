export interface Stadium {
  name: string;
  capacity: number;
  city: string;
}

export interface Facilities {
  training: number;   // 1-10
  youth: number;      // 1-10
  stadium: number;    // 1-10
  medical: number;    // 1-10
}

export interface Fans {
  loyalty: number;         // 1-100
  baseAttendance: number;
  ultrasStrength: number;  // 1-10
}

export interface BoardExpectations {
  leaguePosition: number;
  cupRound: 'runde1' | 'runde2' | 'achtelfinale' | 'viertelfinale' | 'halbfinale' | 'finale' | 'sieg';
  financialGoal: 'profit' | 'break-even' | 'invest';
}

export interface TeamStaff {
  manager: string;
  assistantManager: string;
  fitnessCoach: string;
  youthCoach: string;
  goalkeepingCoach: string;
}

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  league: string;
  founded: number;
  stadium: Stadium;
  colors: TeamColors;
  logo: string;
  budget: number;
  salaryBudget: number;
  reputation: number;        // 1-100
  facilities: Facilities;
  fans: Fans;
  boardExpectations: BoardExpectations;
  staff: TeamStaff;
  rivals: string[];          // Team IDs
  boardPatience: number;     // 1-100
}
