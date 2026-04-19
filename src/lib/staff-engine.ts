/**
 * Staff Engine — generates available staff, handles hiring/firing.
 *
 * Staff roles and their effects:
 *  - assistant_manager: +training effectiveness, +match tactics bonus
 *  - fitness_coach: +condition recovery, -injury risk in training
 *  - goalkeeping_coach: +GK attribute growth
 *  - youth_coach: +youth talent quality, +youth generation chance
 *  - physiotherapist: -injury duration, -injury risk
 *  - scout: +scouting report quality, unlock regions
 */
import { GameState } from '@/types/game';
import { StaffMember, StaffRole, Scout, STAFF_ROLE_LABELS, SCOUT_REGION_LABELS, ScoutRegion } from '@/types/staff';
import { NewsItem } from '@/types/news';

function generateId(): string {
  return 'staff-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

const FIRST_NAMES = [
  'Thomas', 'Michael', 'Stefan', 'Andreas', 'Jürgen', 'Peter', 'Klaus',
  'Hans', 'Dieter', 'Wolfgang', 'Ralf', 'Uwe', 'Frank', 'Bernd',
  'Markus', 'Christian', 'Holger', 'Dirk', 'Olaf', 'Torsten',
];

const LAST_NAMES = [
  'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz',
  'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz',
  'Braun', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Lehmann',
];

const NATIONALITIES = ['Deutschland', 'Österreich', 'Schweiz', 'Niederlande', 'Spanien', 'Italien'];

// Salary ranges by quality (1-10) and role
function getStaffSalary(quality: number, role: StaffRole): number {
  const base: Record<StaffRole, number> = {
    assistant_manager: 80000,
    fitness_coach: 50000,
    goalkeeping_coach: 45000,
    youth_coach: 40000,
    physiotherapist: 55000,
    scout: 35000,
  };
  return Math.round(base[role] * (0.5 + quality * 0.15));
}

/**
 * Generate a random staff member for hiring.
 */
function generateStaffMember(role: StaffRole, qualityRange: [number, number]): StaffMember {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const quality = qualityRange[0] + Math.floor(Math.random() * (qualityRange[1] - qualityRange[0] + 1));
  const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];

  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + 1 + Math.floor(Math.random() * 3));

  const member: StaffMember = {
    id: generateId(),
    firstName,
    lastName,
    role,
    quality,
    salary: getStaffSalary(quality, role),
    contractUntil: contractEnd.toISOString().split('T')[0],
    nationality,
  };

  // Scouts get a region
  if (role === 'scout') {
    const regions: ScoutRegion[] = ['germany', 'europe_west', 'europe_east', 'south_america', 'africa'];
    (member as Scout).region = regions[Math.floor(Math.random() * regions.length)];
  }

  return member;
}

/**
 * Generate available staff for hiring.
 * Returns 2-3 candidates per unfilled role.
 */
export function generateAvailableStaff(state: GameState): StaffMember[] {
  const team = state.teams.find(t => t.id === state.currentTeamId);
  if (!team) return [];

  const league = state.leagues.find(l => l.id === team.league);
  const tier = league?.tier ?? 3;

  // Quality range depends on tier
  const qualityRange: [number, number] = tier === 1 ? [4, 9] : tier === 2 ? [3, 7] : [2, 6];

  const roles: StaffRole[] = ['assistant_manager', 'fitness_coach', 'goalkeeping_coach', 'youth_coach', 'physiotherapist', 'scout'];
  const available: StaffMember[] = [];

  for (const role of roles) {
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 per role
    for (let i = 0; i < count; i++) {
      available.push(generateStaffMember(role, qualityRange));
    }
  }

  return available;
}

/**
 * Hire a staff member.
 */
export function hireStaff(state: GameState, staffMember: StaffMember): GameState {
  // Check if we already have someone in this role (except scouts — can have multiple)
  if (staffMember.role !== 'scout') {
    const existing = state.staff.find(s => s.role === staffMember.role);
    if (existing) {
      // Auto-fire existing
      return {
        ...hireStaffInternal(fireStaff(state, existing.id), staffMember),
      };
    }
  }

  return hireStaffInternal(state, staffMember);
}

function hireStaffInternal(state: GameState, staffMember: StaffMember): GameState {
  const news: NewsItem = {
    id: `staff-hired-${staffMember.id}`,
    type: 'general',
    title: `Neuer ${STAFF_ROLE_LABELS[staffMember.role]}: ${staffMember.firstName} ${staffMember.lastName}`,
    content: `${staffMember.firstName} ${staffMember.lastName} wurde als ${STAFF_ROLE_LABELS[staffMember.role]} eingestellt. Qualität: ${staffMember.quality}/10.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'medium',
  };

  return {
    ...state,
    staff: [...state.staff, staffMember],
    news: [...state.news, news],
  };
}

/**
 * Fire a staff member.
 */
export function fireStaff(state: GameState, staffId: string): GameState {
  const member = state.staff.find(s => s.id === staffId);
  if (!member) return state;

  const news: NewsItem = {
    id: `staff-fired-${staffId}`,
    type: 'general',
    title: `${STAFF_ROLE_LABELS[member.role]} entlassen`,
    content: `${member.firstName} ${member.lastName} wurde als ${STAFF_ROLE_LABELS[member.role]} entlassen.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'low',
  };

  return {
    ...state,
    staff: state.staff.filter(s => s.id !== staffId),
    news: [...state.news, news],
  };
}

/**
 * Get the quality bonus for a specific staff role.
 * Returns 0 if no staff member of that role exists.
 */
export function getStaffBonus(staff: StaffMember[], role: StaffRole): number {
  const member = staff.find(s => s.role === role);
  return member ? member.quality : 0;
}

// ════════════════════════════════════════════════════════
//  Staff Effects — concrete gameplay bonuses
// ════════════════════════════════════════════════════════

export interface StaffEffects {
  // From assistant_manager
  trainingBonus: number;        // +% training effectiveness (0-15%)
  matchTacticsBonus: number;    // +% team strength in matches (0-5%)

  // From fitness_coach
  conditionRecovery: number;    // +% daily condition recovery (0-12%)
  trainingInjuryReduction: number; // -% injury risk in training (0-15%)

  // From goalkeeping_coach
  gkGrowthBonus: number;       // +% GK attribute growth (0-12%)

  // From youth_coach
  youthQualityBonus: number;   // +% youth talent quality (0-12%)
  youthGenChance: number;      // +% youth generation chance (0-10%)

  // From physiotherapist
  injuryDurationReduction: number; // -% injury duration (0-20%)
  injuryRiskReduction: number;     // -% overall injury risk (0-12%)

  // From scouts (average quality)
  scoutAccuracy: number;       // +% scouting accuracy (0-15%)
  scoutCount: number;          // number of active scouts

  // Totals for display
  totalStaffSalary: number;
  filledRoles: number;
  totalRoles: number;
}

/**
 * Calculate concrete gameplay effects from current staff.
 * Quality ranges 1-10, effects scale linearly.
 */
export function calcStaffEffects(staff: StaffMember[]): StaffEffects {
  const get = (role: StaffRole) => getStaffBonus(staff, role);

  const assistantQ = get('assistant_manager');
  const fitnessQ = get('fitness_coach');
  const gkCoachQ = get('goalkeeping_coach');
  const youthQ = get('youth_coach');
  const physioQ = get('physiotherapist');

  const scouts = staff.filter(s => s.role === 'scout');
  const avgScoutQ = scouts.length > 0
    ? scouts.reduce((sum, s) => sum + s.quality, 0) / scouts.length
    : 0;

  const filledRoles = new Set(staff.map(s => s.role)).size;

  return {
    trainingBonus: assistantQ * 1.5,
    matchTacticsBonus: assistantQ * 0.5,

    conditionRecovery: fitnessQ * 1.2,
    trainingInjuryReduction: fitnessQ * 1.5,

    gkGrowthBonus: gkCoachQ * 1.2,

    youthQualityBonus: youthQ * 1.2,
    youthGenChance: youthQ * 1.0,

    injuryDurationReduction: physioQ * 2.0,
    injuryRiskReduction: physioQ * 1.2,

    scoutAccuracy: avgScoutQ * 1.5,
    scoutCount: scouts.length,

    totalStaffSalary: staff.reduce((sum, s) => sum + s.salary, 0),
    filledRoles,
    totalRoles: 6,
  };
}
