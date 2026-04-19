/**
 * Youth Academy Engine — generates youth talents and manages promotion to first team.
 *
 * Youth players are generated monthly based on:
 *  - Youth facility level (team.facilities.youth)
 *  - Youth coach quality (staff)
 *  - League tier (higher tier = better base talent pool)
 *
 * Youth players have:
 *  - Age 15-18
 *  - Lower overall (30-65) but higher potential (55-90)
 *  - Can be promoted to first team at any time
 *  - Develop faster than senior players
 */
import { GameState } from '@/types/game';
import { Player, PlayerAttributes } from '@/types/player';
import { NewsItem } from '@/types/news';

function generateId(): string {
  return 'youth-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// ── German first/last name pools ──
const FIRST_NAMES = [
  'Luca', 'Finn', 'Noah', 'Leon', 'Elias', 'Paul', 'Ben', 'Luis', 'Jonas', 'Felix',
  'Maximilian', 'Henry', 'Moritz', 'Oscar', 'Emil', 'Theo', 'Anton', 'Jakob', 'Matteo',
  'Niklas', 'Tim', 'David', 'Julian', 'Philipp', 'Tom', 'Jan', 'Erik', 'Jannik', 'Marvin',
  'Florian', 'Kai', 'Marcel', 'Dennis', 'Kevin', 'Patrick', 'Sven', 'Marco', 'Tobias',
];

const LAST_NAMES = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
  'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann',
  'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier',
  'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Köhler', 'Herrmann', 'König',
  'Walter', 'Mayer', 'Huber', 'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz',
];

const POSITIONS: import('@/types/player').Position[] = [
  'TW', 'IV', 'IV', 'LV', 'RV', 'ZDM', 'ZM', 'ZM', 'ZOM', 'LA', 'RA', 'ST', 'ST',
];

const NATIONALITIES = [
  'Deutschland', 'Deutschland', 'Deutschland', 'Deutschland', 'Deutschland',
  'Deutschland', 'Deutschland', 'Türkei', 'Polen', 'Österreich',
];

/**
 * Generate a single youth player.
 */
function generateYouthPlayer(
  teamId: string,
  youthLevel: number,
  tier: number,
  currentDate: string,
): Player {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
  const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];

  const age = 15 + Math.floor(Math.random() * 4); // 15-18
  const birthYear = new Date(currentDate).getFullYear() - age;
  const birthMonth = 1 + Math.floor(Math.random() * 12);
  const birthDay = 1 + Math.floor(Math.random() * 28);
  const dateOfBirth = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

  // Base overall: youth level + tier influence + randomness
  // Youth level 1-10, tier 1-3
  const baseOvr = 25 + youthLevel * 2 + (4 - tier) * 3 + Math.floor(Math.random() * 15);
  const overall = Math.max(30, Math.min(65, baseOvr));

  // Potential: always higher than overall
  const potentialBase = overall + 10 + youthLevel + Math.floor(Math.random() * 20);
  const potential = Math.max(overall + 5, Math.min(95, potentialBase));

  // Generate attributes around the target overall
  const attrs = generateAttributes(position, overall);

  const foot = Math.random() < 0.7 ? 'right' : Math.random() < 0.85 ? 'left' : 'both';

  const contractEnd = new Date(currentDate);
  contractEnd.setFullYear(contractEnd.getFullYear() + 3);

  return {
    id: generateId(),
    firstName,
    lastName,
    dateOfBirth,
    nationality,
    position,
    secondaryPositions: [],
    foot,
    height: 165 + Math.floor(Math.random() * 25),
    weight: 55 + Math.floor(Math.random() * 20),
    shirtNumber: 30 + Math.floor(Math.random() * 70),
    teamId,
    contractUntil: contractEnd.toISOString().split('T')[0],
    salary: 5000 + Math.floor(Math.random() * 15000), // very low salary
    marketValue: Math.round((overall * 5000 + potential * 8000) * (Math.random() * 0.3 + 0.85)),
    potential,
    growthRate: 0.8 + Math.random() * 0.4,
    attributes: attrs,
    condition: 80 + Math.floor(Math.random() * 20),
    morale: 70 + Math.floor(Math.random() * 20),
    form: 50 + Math.floor(Math.random() * 20),
    fatigue: 0,
    matchPractice: 30,
    injury: undefined,
    suspended: false,
    suspendedMatches: 0,
    injuryProne: 5 + Math.floor(Math.random() * 15),
    isTransferListed: false,
    transferRequested: false,
    isLoaned: false,
    stats: {
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      avgRating: 0,
      minutesPlayed: 0,
      yellowCards: 0,
      redCards: 0,
    },
    formHistory: [],
    ratingHistory: [],
    traits: [],
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    trainingBoosts: [],
  };
}

function generateAttributes(position: string, targetOvr: number): PlayerAttributes {
  const base = Math.max(20, targetOvr - 10);
  const variance = () => base + Math.floor(Math.random() * 20) - 5;
  const clamp = (v: number) => Math.max(15, Math.min(85, v));

  const attrs: PlayerAttributes = {
    pace: clamp(variance()),
    shooting: clamp(variance()),
    passing: clamp(variance()),
    dribbling: clamp(variance()),
    heading: clamp(variance()),
    positioning: clamp(variance()),
    vision: clamp(variance()),
    crossing: clamp(variance()),
    finishing: clamp(variance()),
    longShots: clamp(variance()),
    ballControl: clamp(variance()),
    acceleration: clamp(variance()),
    stamina: clamp(variance()),
    strength: clamp(variance() - 5), // youth = weaker
    jumping: clamp(variance()),
    aggression: clamp(variance()),
    composure: clamp(variance() - 3), // youth = less composed
    workRate: clamp(variance()),
    freeKick: clamp(variance()),
    leadership: clamp(variance() - 5),
    // GK
    reflexes: clamp(position === 'TW' ? variance() + 10 : variance() - 20),
    handling: clamp(position === 'TW' ? variance() + 10 : variance() - 20),
    diving: clamp(position === 'TW' ? variance() + 10 : variance() - 20),
    kicking: clamp(position === 'TW' ? variance() : variance() - 15),
    oneOnOne: clamp(position === 'TW' ? variance() + 5 : variance() - 20),
  };

  return attrs;
}

/**
 * Monthly youth talent generation.
 * Called from day-advance on the 1st of each month.
 */
export function generateMonthlyYouth(state: GameState): GameState {
  const d = new Date(state.currentDate);
  if (d.getDate() !== 1) return state;

  const teamId = state.currentTeamId;
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return state;

  const league = state.leagues.find(l => l.id === team.league);
  const tier = league?.tier ?? 3;
  const youthLevel = team.facilities.youth;

  // Check if already generated this month
  const monthKey = d.toISOString().slice(0, 7);
  const alreadyGenerated = state.youthPlayers.some(p => {
    // Simple check: if we have a youth player created this month
    return p.id.includes(monthKey.replace('-', ''));
  });

  // Generate 0-2 youth players per month
  // Higher youth level = higher chance
  const chance = 0.2 + youthLevel * 0.06; // 26% at level 1, 80% at level 10
  const count = Math.random() < chance ? (Math.random() < 0.3 ? 2 : 1) : 0;

  if (count === 0) return state;

  const newYouth: Player[] = [];
  const newsItems: NewsItem[] = [];

  for (let i = 0; i < count; i++) {
    const player = generateYouthPlayer(teamId, youthLevel, tier, state.currentDate);
    newYouth.push(player);

    newsItems.push({
      id: `youth-talent-${player.id}`,
      type: 'youth',
      title: `Jugendtalent entdeckt: ${player.firstName} ${player.lastName}`,
      content: `Die Jugendakademie hat ein neues Talent hervorgebracht: ${player.firstName} ${player.lastName} (${player.position}, ${new Date(state.currentDate).getFullYear() - new Date(player.dateOfBirth).getFullYear()} Jahre). Potential: ${player.potential >= 80 ? 'Herausragend' : player.potential >= 70 ? 'Sehr gut' : player.potential >= 60 ? 'Gut' : 'Durchschnittlich'}.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: teamId,
      relatedPlayerId: player.id,
      importance: player.potential >= 75 ? 'high' : 'medium',
    });
  }

  return {
    ...state,
    youthPlayers: [...state.youthPlayers, ...newYouth],
    news: [...state.news, ...newsItems],
  };
}

/**
 * Promote a youth player to the first team.
 */
export function promoteYouthPlayer(state: GameState, youthPlayerId: string): GameState {
  const youth = state.youthPlayers.find(p => p.id === youthPlayerId);
  if (!youth) return state;

  // Move from youthPlayers to players
  const updatedYouth = state.youthPlayers.filter(p => p.id !== youthPlayerId);
  const promotedPlayer: Player = {
    ...youth,
    shirtNumber: findAvailableNumber(state.players, state.currentTeamId),
  };

  const news: NewsItem = {
    id: `youth-promoted-${youth.id}`,
    type: 'youth',
    title: `Beförderung: ${youth.firstName} ${youth.lastName}`,
    content: `${youth.firstName} ${youth.lastName} wurde aus der Jugendakademie in den Profikader befördert.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    relatedPlayerId: youth.id,
    importance: 'medium',
  };

  return {
    ...state,
    players: [...state.players, promotedPlayer],
    youthPlayers: updatedYouth,
    news: [...state.news, news],
  };
}

/**
 * Release a youth player (remove from academy).
 */
export function releaseYouthPlayer(state: GameState, youthPlayerId: string): GameState {
  return {
    ...state,
    youthPlayers: state.youthPlayers.filter(p => p.id !== youthPlayerId),
  };
}

function findAvailableNumber(players: Player[], teamId: string): number {
  const taken = new Set(players.filter(p => p.teamId === teamId).map(p => p.shirtNumber));
  for (let n = 30; n <= 99; n++) {
    if (!taken.has(n)) return n;
  }
  return 99;
}
