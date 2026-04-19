import { Player } from '@/types/player';
import {
  TrainingCampOption,
  TrainingCampLocation,
  PreseasonEvent,
  PreseasonEventType,
  FriendlyMatch,
  PreseasonState,
  TacticalFocusOption,
  TacticalFocus,
  SquadAssessment,
} from '@/types/preseason';

// ════════════════════════════════════════════════════════
//  Training Camp Options
// ════════════════════════════════════════════════════════

export const TRAINING_CAMPS: TrainingCampOption[] = [
  {
    id: 'local',
    name: 'Heimisches Trainingslager',
    country: 'Deutschland',
    description: 'Training auf dem eigenen Gelände. Günstig, aber weniger Abwechslung. Gut für eingespielte Teams.',
    cost: 150_000,
    durationDays: 10,
    effects: {
      fitnessBoost: 8,
      moraleBoost: 3,
      cohesionBoost: 5,
      injuryRisk: 3,
      youthDevelopment: 5,
    },
    specialEventChance: 25,
  },
  {
    id: 'austria',
    name: 'Trainingslager Österreich',
    country: 'Österreich',
    description: 'Klassisches Vorbereitungsziel in den Alpen. Frische Luft, gute Bedingungen und Höhentraining.',
    cost: 450_000,
    durationDays: 12,
    effects: {
      fitnessBoost: 14,
      moraleBoost: 6,
      cohesionBoost: 8,
      injuryRisk: 5,
      youthDevelopment: 8,
    },
    specialEventChance: 35,
  },
  {
    id: 'turkey',
    name: 'Trainingslager Türkei',
    country: 'Türkei',
    description: 'Belek an der türkischen Riviera. Erstklassige Anlagen, warmes Klima und viele Testspielgegner.',
    cost: 600_000,
    durationDays: 14,
    effects: {
      fitnessBoost: 12,
      moraleBoost: 8,
      cohesionBoost: 10,
      injuryRisk: 6,
      youthDevelopment: 10,
    },
    specialEventChance: 45,
  },
  {
    id: 'spain',
    name: 'Trainingslager Spanien',
    country: 'Spanien',
    description: 'Marbella oder Alicante. Perfektes Wetter, Top-Infrastruktur und internationale Testspielgegner.',
    cost: 800_000,
    durationDays: 14,
    effects: {
      fitnessBoost: 15,
      moraleBoost: 10,
      cohesionBoost: 12,
      injuryRisk: 4,
      youthDevelopment: 12,
    },
    specialEventChance: 50,
  },
  {
    id: 'usa',
    name: 'Prestige-Tour USA',
    country: 'USA',
    description: 'Marketing-Tour mit Testspielen gegen MLS-Teams. Maximale Medienpräsenz, aber anstrengend durch Jetlag.',
    cost: 1_500_000,
    durationDays: 12,
    effects: {
      fitnessBoost: 10,
      moraleBoost: 12,
      cohesionBoost: 7,
      injuryRisk: 8,
      youthDevelopment: 6,
    },
    specialEventChance: 60,
  },
];

// ════════════════════════════════════════════════════════
//  Event Templates — balanced 65% positive, 35% negative
// ════════════════════════════════════════════════════════

interface EventTemplate {
  type: PreseasonEventType;
  title: string;
  description: string;
  isPositive: boolean;
  weight: number; // higher = more likely
  effects: PreseasonEvent['effects'];
  /** If true, picks a random player */
  targetPlayer?: boolean;
  /** If true, picks a young player (U23) */
  targetYouth?: boolean;
}

const POSITIVE_EVENTS: EventTemplate[] = [
  {
    type: 'breakout_player',
    title: 'Durchbruch im Training!',
    description: '{player} zeigt sich in herausragender Form und beeindruckt das Trainerteam.',
    isPositive: true, weight: 15,
    effects: { moraleChange: 8, xpBonus: 25, conditionChange: 5 },
    targetYouth: true,
  },
  {
    type: 'team_bonding',
    title: 'Team-Abend stärkt Zusammenhalt',
    description: 'Ein gemeinsamer Abend hat die Mannschaft enger zusammengeschweißt.',
    isPositive: true, weight: 20,
    effects: { moraleChange: 5 },
  },
  {
    type: 'tactical_insight',
    title: 'Taktik-Workshop erfolgreich',
    description: 'Die taktischen Übungen zeigen Wirkung. Das Team agiert kompakter und strukturierter.',
    isPositive: true, weight: 15,
    effects: { moraleChange: 3, conditionChange: 2 },
  },
  {
    type: 'fitness_boost',
    title: 'Fitness-Fortschritte',
    description: 'Das intensive Konditionstraining zahlt sich aus. Die Mannschaft ist in Topform.',
    isPositive: true, weight: 20,
    effects: { conditionChange: 8 },
  },
  {
    type: 'sponsor_interest',
    title: 'Sponsor-Anfrage',
    description: 'Ein lokaler Sponsor wurde auf das Trainingslager aufmerksam und bietet eine Partnerschaft an.',
    isPositive: true, weight: 10,
    effects: { budgetChange: 200_000, moraleChange: 2 },
  },
  {
    type: 'local_hero',
    title: 'Fan-Sympathie gewonnen',
    description: 'Die Mannschaft hat sich bei einem Fanfest beliebt gemacht. Die Stimmung ist ausgezeichnet.',
    isPositive: true, weight: 10,
    effects: { moraleChange: 6 },
  },
  {
    type: 'breakout_player',
    title: 'Nachwuchstalent überzeugt',
    description: '{player} hat im Training Profi-Qualitäten gezeigt und bekommt eine Chance.',
    isPositive: true, weight: 10,
    effects: { xpBonus: 40, moraleChange: 5 },
    targetYouth: true,
  },
];

const NEGATIVE_EVENTS: EventTemplate[] = [
  {
    type: 'injury',
    title: 'Trainings-Verletzung',
    description: '{player} hat sich im Training eine Muskelverletzung zugezogen.',
    isPositive: false, weight: 15,
    effects: { injuryDays: 10, moraleChange: -3 },
    targetPlayer: true,
  },
  {
    type: 'weather_disruption',
    title: 'Schlechtes Wetter stört Training',
    description: 'Starkregen hat zwei Trainingseinheiten ausfallen lassen.',
    isPositive: false, weight: 12,
    effects: { conditionChange: -3 },
  },
  {
    type: 'player_dispute',
    title: 'Spannungen in der Kabine',
    description: 'Zwei Spieler hatten eine Auseinandersetzung. Der Trainer konnte schlichten.',
    isPositive: false, weight: 8,
    effects: { moraleChange: -4 },
  },
  {
    type: 'injury',
    title: 'Leichte Blessur',
    description: '{player} hat eine leichte Prellung und pausiert vorsichtshalber einige Tage.',
    isPositive: false, weight: 10,
    effects: { injuryDays: 5, moraleChange: -1 },
    targetPlayer: true,
  },
  {
    type: 'weather_disruption',
    title: 'Hitze belastet Team',
    description: 'Extreme Temperaturen zwingen zu verkürztem Training.',
    isPositive: false, weight: 8,
    effects: { conditionChange: -2, moraleChange: -2 },
  },
];

// ════════════════════════════════════════════════════════
//  Helper RNG
// ════════════════════════════════════════════════════════

let _seed = Date.now();
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed & 0x7fffffff) / 0x7fffffff;
}

export function initPreseasonRng(seed: number) {
  _seed = seed;
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = seededRandom() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ════════════════════════════════════════════════════════
//  Generate Pre-Season Events
// ════════════════════════════════════════════════════════

export function generatePreseasonEvents(
  camp: TrainingCampOption,
  players: Player[],
  teamId: string,
  gameDate?: string,
): PreseasonEvent[] {
  const teamPlayers = players.filter(p => p.teamId === teamId);
  if (teamPlayers.length === 0) return [];

  const events: PreseasonEvent[] = [];
  const numEventSlots = Math.ceil(camp.durationDays / 3); // roughly 1 event per 3 days

  for (let i = 0; i < numEventSlots; i++) {
    if (seededRandom() * 100 > camp.specialEventChance) continue;

    // 65% positive, 35% negative — fun-first balance
    const isPositive = seededRandom() < 0.65;
    const pool = isPositive ? POSITIVE_EVENTS : NEGATIVE_EVENTS;
    const template = pickWeighted(pool);

    let targetPlayerIds: string[] | undefined;
    let desc = template.description;

    if (template.targetYouth) {
      const refYear = new Date(gameDate ?? '2025-07-01').getFullYear();
      const youth = teamPlayers.filter(p => {
        const age = refYear - new Date(p.dateOfBirth).getFullYear();
        return age < 23;
      });
      if (youth.length > 0) {
        const pick = youth[Math.floor(seededRandom() * youth.length)];
        targetPlayerIds = [pick.id];
        desc = desc.replace('{player}', `${pick.firstName} ${pick.lastName}`);
      }
    } else if (template.targetPlayer) {
      const fieldPlayers = teamPlayers.filter(p => p.position !== 'TW');
      if (fieldPlayers.length > 0) {
        const pick = fieldPlayers[Math.floor(seededRandom() * fieldPlayers.length)];
        targetPlayerIds = [pick.id];
        desc = desc.replace('{player}', `${pick.firstName} ${pick.lastName}`);
      }
    }

    events.push({
      id: `preseason-event-${i}-${Date.now()}`,
      type: template.type,
      title: template.title,
      description: desc,
      isPositive: template.isPositive,
      effects: {
        ...template.effects,
        playerIds: targetPlayerIds,
      },
    });
  }

  return events;
}

// ════════════════════════════════════════════════════════
//  Generate Friendly Matches
// ════════════════════════════════════════════════════════

interface FriendlyOpponent {
  name: string;
  strength: number;
  tier: FriendlyMatch['opponentTier'];
}

const FRIENDLY_OPPONENTS: FriendlyOpponent[][] = [
  // Pool 0: Amateur/Regional (very weak)
  [
    { name: 'SV Heimstetten', strength: 35, tier: 'amateur' },
    { name: 'TSV Buchbach', strength: 38, tier: 'amateur' },
    { name: 'FC Pipinsried', strength: 32, tier: 'amateur' },
    { name: 'SpVgg Bayreuth', strength: 40, tier: 'amateur' },
    { name: 'SC Verl II', strength: 36, tier: 'amateur' },
    { name: 'SV Wacker Burghausen', strength: 34, tier: 'amateur' },
  ],
  // Pool 1: Semi-Pro (medium-low)
  [
    { name: 'Austria Wien', strength: 55, tier: 'semi_pro' },
    { name: 'Red Bull Salzburg II', strength: 52, tier: 'semi_pro' },
    { name: 'NK Osijek', strength: 50, tier: 'semi_pro' },
    { name: 'Grasshopper Club Zürich', strength: 53, tier: 'semi_pro' },
    { name: 'Servette FC', strength: 54, tier: 'semi_pro' },
    { name: 'Rapid Wien II', strength: 48, tier: 'semi_pro' },
  ],
  // Pool 2: Pro (medium-strong)
  [
    { name: 'Ajax Amsterdam', strength: 72, tier: 'pro' },
    { name: 'Benfica Lissabon', strength: 75, tier: 'pro' },
    { name: 'AS Monaco', strength: 73, tier: 'pro' },
    { name: 'Olympique Lyon', strength: 70, tier: 'pro' },
    { name: 'Galatasaray Istanbul', strength: 71, tier: 'pro' },
    { name: 'Sporting Lissabon', strength: 74, tier: 'pro' },
  ],
  // Pool 3: Pro (strong)
  [
    { name: 'Sevilla FC', strength: 76, tier: 'pro' },
    { name: 'SSC Neapel', strength: 78, tier: 'pro' },
    { name: 'Tottenham Hotspur', strength: 77, tier: 'pro' },
    { name: 'Borussia Dortmund', strength: 79, tier: 'pro' },
    { name: 'AC Mailand', strength: 78, tier: 'pro' },
  ],
  // Pool 4: Top (elite — only for top teams)
  [
    { name: 'FC Barcelona', strength: 85, tier: 'top' },
    { name: 'Real Madrid', strength: 87, tier: 'top' },
    { name: 'Manchester City', strength: 86, tier: 'top' },
    { name: 'Liverpool FC', strength: 84, tier: 'top' },
    { name: 'Paris Saint-Germain', strength: 83, tier: 'top' },
  ],
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function generateFriendlySchedule(
  campEndDate: string,
  leagueStartDate: string,
): FriendlyMatch[] {
  const campEnd = new Date(campEndDate);
  const leagueStart = new Date(leagueStartDate);
  const daysAvailable = Math.floor((leagueStart.getTime() - campEnd.getTime()) / (1000 * 60 * 60 * 24));

  // Spread 5 friendlies evenly between camp end and league start
  const numFriendlies = 5;
  const gap = Math.max(2, Math.floor(daysAvailable / (numFriendlies + 1)));

  const friendlies: FriendlyMatch[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < numFriendlies; i++) {
    const date = addDays(campEndDate, gap * (i + 1));
    if (new Date(date) >= leagueStart) break;

    // Progressive difficulty: amateur → semi_pro → pro → pro → top
    const poolIdx = Math.min(i, FRIENDLY_OPPONENTS.length - 1);
    const pool = FRIENDLY_OPPONENTS[poolIdx].filter(o => !usedNames.has(o.name));
    const opp = pool.length > 0
      ? pool[Math.floor(seededRandom() * pool.length)]
      : FRIENDLY_OPPONENTS[poolIdx][Math.floor(seededRandom() * FRIENDLY_OPPONENTS[poolIdx].length)];
    usedNames.add(opp.name);

    friendlies.push({
      id: `friendly-${i + 1}`,
      opponentName: opp.name,
      opponentStrength: opp.strength,
      opponentTier: opp.tier,
      date,
      isPlayed: false,
    });
  }

  return friendlies;
}

// ════════════════════════════════════════════════════════
//  Apply Camp Effects to Players
// ════════════════════════════════════════════════════════

export function applyCampEffects(
  players: Player[],
  teamId: string,
  camp: TrainingCampOption,
  events: PreseasonEvent[],
  gameDate?: string,
): Player[] {
  return players.map(p => {
    if (p.teamId !== teamId) return p;

    let condBoost = camp.effects.fitnessBoost;
    let moraleBoost = camp.effects.moraleBoost;
    let xpBoost = 0;
    let injuryDays = 0;

    const age = new Date(gameDate ?? '2025-07-01').getFullYear() - new Date(p.dateOfBirth).getFullYear();
    if (age < 23) {
      xpBoost += camp.effects.youthDevelopment;
    }

    // Apply event effects
    for (const evt of events) {
      const affectsThisPlayer = !evt.effects.playerIds || evt.effects.playerIds.includes(p.id);
      if (!affectsThisPlayer && evt.effects.playerIds && evt.effects.playerIds.length > 0) continue;

      condBoost += evt.effects.conditionChange ?? 0;
      moraleBoost += evt.effects.moraleChange ?? 0;
      xpBoost += evt.effects.xpBonus ?? 0;

      if (evt.effects.playerIds?.includes(p.id) && evt.effects.injuryDays) {
        injuryDays = Math.max(injuryDays, evt.effects.injuryDays);
      }
    }

    // Check camp injury risk (only if not already injured by event)
    if (injuryDays === 0 && seededRandom() * 100 < camp.effects.injuryRisk) {
      injuryDays = 3 + Math.floor(seededRandom() * 7); // 3-9 days
    }

    const updated: Player = {
      ...p,
      condition: Math.max(50, Math.min(100, p.condition + condBoost)),
      morale: Math.max(30, Math.min(100, (p.morale ?? 70) + moraleBoost)),
      form: Math.max(40, Math.min(90, p.form + Math.round(moraleBoost * 0.5))),
    };

    if (xpBoost > 0) {
      updated.xp = (updated.xp ?? 0) + xpBoost;
    }

    if (injuryDays > 0 && !updated.injury) {
      updated.injury = {
        type: 'Muskelverletzung',
        severity: injuryDays > 7 ? 'medium' : 'light',
        daysRemaining: injuryDays,
        totalDays: injuryDays,
        rehaPhase: 1,
      };
    }

    return updated;
  });
}

// ════════════════════════════════════════════════════════
//  Simulate Friendly Match (simplified)
// ════════════════════════════════════════════════════════

export function simulateFriendly(
  friendly: FriendlyMatch,
  teamPlayers: Player[],
  teamStrengthOverall: number,
): FriendlyMatch {
  const diff = teamStrengthOverall - friendly.opponentStrength;
  const homeBase = 1.2 + diff * 0.03; // expected goals bias
  const awayBase = 1.0 - diff * 0.02;

  const homeScore = Math.max(0, Math.round(homeBase + (seededRandom() - 0.3) * 2.5));
  const awayScore = Math.max(0, Math.round(awayBase + (seededRandom() - 0.4) * 2.0));

  // Simple ratings for starters
  const starters = teamPlayers
    .filter(p => !p.injury && !p.suspended)
    .slice(0, 11);

  const playerRatings = starters.map(p => ({
    playerId: p.id,
    rating: Math.round((5.5 + seededRandom() * 2.5 + (homeScore > awayScore ? 0.5 : homeScore < awayScore ? -0.3 : 0.1)) * 10) / 10,
  }));

  return {
    ...friendly,
    isPlayed: true,
    result: { homeScore, awayScore },
    playerRatings,
  };
}

// ════════════════════════════════════════════════════════
//  Apply Friendly Match Effects
// ════════════════════════════════════════════════════════

export function applyFriendlyEffects(
  players: Player[],
  teamId: string,
  friendly: FriendlyMatch,
): Player[] {
  if (!friendly.result || !friendly.playerRatings) return players;

  return players.map(p => {
    if (p.teamId !== teamId) return p;
    const rating = friendly.playerRatings?.find(r => r.playerId === p.id);
    if (!rating) return p;

    // Small condition cost, small XP gain, form adjustment
    return {
      ...p,
      condition: Math.max(50, p.condition - 4),
      fatigue: Math.min(100, p.fatigue + 5),
      form: Math.max(30, Math.min(100, p.form + (rating.rating >= 7 ? 2 : rating.rating >= 6 ? 0 : -1))),
      xp: (p.xp ?? 0) + Math.round(5 + rating.rating * 1.5),
      formHistory: [...p.formHistory, p.form],
      ratingHistory: [...p.ratingHistory, rating.rating],
    };
  });
}

// ════════════════════════════════════════════════════════
//  Initialize Pre-Season State
// ════════════════════════════════════════════════════════

export function createInitialPreseasonState(): PreseasonState {
  return {
    phase: 'camp_selection',
    campDay: 0,
    friendlies: [],
    events: [],
    isCompleted: false,
  };
}

// ════════════════════════════════════════════════════════
//  Tactical Focus Options
// ════════════════════════════════════════════════════════

export const TACTICAL_FOCUS_OPTIONS: TacticalFocusOption[] = [
  {
    id: 'offensive',
    name: 'Offensiv-Fokus',
    icon: '⚔️',
    description: 'Schwerpunkt auf Angriffsspiel, Torschuss und Kombinationen. Stürmer und Offensivspieler profitieren besonders.',
    effects: { conditionBonus: 2, moraleBonus: 3, xpBonus: 10, attributeCategory: 'shooting' },
  },
  {
    id: 'defensive',
    name: 'Defensiv-Fokus',
    icon: '🛡️',
    description: 'Schwerpunkt auf Defensive, Stellungsspiel und Zweikämpfe. Verteidiger und Torwart profitieren besonders.',
    effects: { conditionBonus: 3, moraleBonus: 2, xpBonus: 10, attributeCategory: 'positioning' },
  },
  {
    id: 'possession',
    name: 'Ballbesitz-Fokus',
    icon: '🎯',
    description: 'Schwerpunkt auf Passspiel, Ballkontrolle und Spielaufbau. Mittelfeldspieler profitieren besonders.',
    effects: { conditionBonus: 2, moraleBonus: 2, xpBonus: 12, attributeCategory: 'passing' },
  },
  {
    id: 'pressing',
    name: 'Pressing-Fokus',
    icon: '⚡',
    description: 'Schwerpunkt auf Gegenpressing, Laufarbeit und Intensität. Hoher Konditionsgewinn, aber auch Verletzungsrisiko.',
    effects: { conditionBonus: 5, moraleBonus: 1, xpBonus: 8, attributeCategory: 'workRate' },
  },
  {
    id: 'balanced',
    name: 'Ausgewogen',
    icon: '⚖️',
    description: 'Gleichmäßige Vorbereitung in allen Bereichen. Keine Spezialisierung, aber solide Grundlage.',
    effects: { conditionBonus: 3, moraleBonus: 3, xpBonus: 8, attributeCategory: 'all' },
  },
];

// ════════════════════════════════════════════════════════
//  Squad Assessment Generator
// ════════════════════════════════════════════════════════

export function generateSquadAssessment(
  players: Player[],
  teamId: string,
  gameDate?: string,
): SquadAssessment {
  const teamPlayers = players.filter(p => p.teamId === teamId);
  if (teamPlayers.length === 0) {
    return {
      avgOverall: 0, avgAge: 0, strengths: [], weaknesses: [],
      keyPlayer: '-', youngTalent: '-', positionGaps: [],
    };
  }

  // Calculate overall for each player (simplified)
  const calcOvr = (p: Player): number => {
    const a = p.attributes;
    const vals = Object.values(a) as number[];
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  };

  const overalls = teamPlayers.map(p => ({ p, ovr: calcOvr(p) }));
  const avgOverall = Math.round(overalls.reduce((s, o) => s + o.ovr, 0) / overalls.length);

  const refYear = new Date(gameDate ?? '2025-07-01').getFullYear();
  const ages = teamPlayers.map(p => {
    const birth = new Date(p.dateOfBirth);
    return refYear - birth.getFullYear();
  });
  const avgAge = Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10;

  // Key player: highest overall
  const keyP = overalls.sort((a, b) => b.ovr - a.ovr)[0];
  const keyPlayer = keyP ? `${keyP.p.firstName} ${keyP.p.lastName} (${keyP.ovr})` : '-';

  // Young talent: best U23
  const youngPlayers = overalls.filter(o => {
    const age = refYear - new Date(o.p.dateOfBirth).getFullYear();
    return age < 23;
  }).sort((a, b) => b.ovr - a.ovr);
  const youngTalent = youngPlayers[0]
    ? `${youngPlayers[0].p.firstName} ${youngPlayers[0].p.lastName} (${youngPlayers[0].ovr})`
    : 'Kein U23-Spieler';

  // Position analysis
  const posCounts: Record<string, number> = {};
  for (const p of teamPlayers) {
    posCounts[p.position] = (posCounts[p.position] ?? 0) + 1;
  }

  const positionGaps: string[] = [];
  const posLabels: Record<string, string> = {
    TW: 'Torwart', IV: 'Innenverteidiger', LV: 'Linker Verteidiger', RV: 'Rechter Verteidiger',
    ZDM: 'Defensives Mittelfeld', ZM: 'Zentrales Mittelfeld', ZOM: 'Offensives Mittelfeld',
    LA: 'Linksaußen', RA: 'Rechtsaußen', ST: 'Stürmer',
  };
  const minRequired: Record<string, number> = {
    TW: 2, IV: 3, LV: 1, RV: 1, ZDM: 1, ZM: 2, ZOM: 1, LA: 1, RA: 1, ST: 2,
  };
  for (const [pos, min] of Object.entries(minRequired)) {
    if ((posCounts[pos] ?? 0) < min) {
      positionGaps.push(posLabels[pos] ?? pos);
    }
  }

  // Strengths & weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (avgOverall >= 75) strengths.push('Starker Kader insgesamt');
  else if (avgOverall < 60) weaknesses.push('Kaderqualität unterdurchschnittlich');

  if (avgAge < 25) strengths.push('Junger, entwicklungsfähiger Kader');
  else if (avgAge > 29) weaknesses.push('Überalterter Kader');

  if (youngPlayers.length >= 5) strengths.push('Gute Jugendarbeit');
  if (positionGaps.length === 0) strengths.push('Alle Positionen gut besetzt');
  if (positionGaps.length >= 3) weaknesses.push('Mehrere Positionen unterbesetzt');

  const gkCount = posCounts['TW'] ?? 0;
  if (gkCount >= 2) strengths.push('Solide Torwart-Besetzung');
  if (gkCount < 2) weaknesses.push('Nur ein Torwart im Kader');

  const stCount = posCounts['ST'] ?? 0;
  if (stCount >= 3) strengths.push('Breite Sturmbesetzung');
  if (stCount < 2) weaknesses.push('Zu wenige Stürmer');

  return {
    avgOverall,
    avgAge,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    keyPlayer,
    youngTalent,
    positionGaps,
  };
}
