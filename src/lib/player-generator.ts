import { Player, Position, PlayerAttributes, FootPreference } from '@/types/player';
import { Team } from '@/types/team';
import { PlayerTrait, TRAIT_CATALOG } from '@/types/traits';
import { getRosterForTeam } from '@/data/players';
import { RealPlayerSeed } from '@/data/players/types';

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  gaussian(mean: number, stddev: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.round(Math.max(1, Math.min(99, mean + z * stddev)));
  }
}

const GERMAN_FIRST_NAMES = [
  'Alexander', 'Andreas', 'Benjamin', 'Christian', 'Daniel', 'David', 'Dennis',
  'Dominik', 'Erik', 'Fabian', 'Felix', 'Florian', 'Hendrik', 'Jan', 'Jonas',
  'Julian', 'Kevin', 'Lars', 'Leon', 'Luca', 'Lukas', 'Manuel', 'Marco',
  'Marvin', 'Matthias', 'Max', 'Maximilian', 'Michael', 'Moritz', 'Nico',
  'Niklas', 'Noah', 'Oliver', 'Patrick', 'Paul', 'Philipp', 'Robin', 'Sebastian',
  'Simon', 'Stefan', 'Thomas', 'Tim', 'Tobias', 'Tom', 'Vincent',
];

const GERMAN_LAST_NAMES = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner',
  'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter',
  'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun',
  'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Krause',
  'Meier', 'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Köhler', 'Herrmann',
  'König', 'Walter', 'Mayer', 'Huber', 'Kaiser', 'Fuchs', 'Peters',
  'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung', 'Hahn', 'Schubert',
  'Vogel', 'Friedrich', 'Keller', 'Günther', 'Frank', 'Berger', 'Winkler',
  'Roth', 'Beck', 'Lorenz', 'Baumann', 'Franke', 'Albrecht', 'Schuster',
  'Simon', 'Ludwig', 'Böhm', 'Winter', 'Kraus', 'Martin', 'Schumacher',
  'Krämer', 'Vogt', 'Stein', 'Jäger', 'Otto', 'Sommer', 'Groß',
  'Seidel', 'Heinrich', 'Brandt', 'Haas', 'Schreiber', 'Graf', 'Schulte',
  'Dietrich', 'Ziegler', 'Kuhn', 'Kühn', 'Pohl', 'Engel', 'Horn',
  'Busch', 'Bergmann', 'Thomas', 'Voigt', 'Sauer', 'Arnold', 'Wolff',
];

const INTERNATIONAL_FIRST_NAMES = [
  'Moussa', 'Amadou', 'Keita', 'Ibrahim', 'Omar', 'Youssoufa', 'Serhou',
  'Pierre', 'Antoine', 'Hugo', 'Lucas', 'Mathieu', 'Adrien', 'Baptiste',
  'Luka', 'Ivan', 'Mateo', 'Nikola', 'Dejan', 'Stefan', 'Marko',
  'Erling', 'Magnus', 'Sander', 'Anders', 'Joakim',
  'Donyell', 'Jeremiah', 'Xavi', 'Jeremie', 'Randal', 'Deniz',
  'Karim', 'Malik', 'Amine', 'Youssef', 'Achraf',
  'Takuma', 'Daichi', 'Ritsu', 'Junya',
  'Hyun-jun', 'Min-jae', 'Seung-ho',
  'Exequiel', 'Lucas', 'Matias', 'Alejandro',
];

const INTERNATIONAL_LAST_NAMES = [
  'Diallo', 'Touré', 'Konaté', 'Traoré', 'Camara', 'Diaby', 'Keita',
  'Dupont', 'Laurent', 'Moreau', 'Lefebvre', 'Girard', 'Roux',
  'Perisic', 'Kovacic', 'Rakitic', 'Modric', 'Jovic', 'Vlahovic',
  'Haaland', 'Ødegaard', 'Berge', 'Sørloth', 'Ajer',
  'Simons', 'Malen', 'Gakpo', 'Frimpong', 'Timber',
  'Dembelé', 'Mbappé', 'Griezmann', 'Pavard', 'Upamecano',
  'Asano', 'Kamada', 'Itakura', 'Doan',
  'Kim', 'Son', 'Lee', 'Hwang',
  'Palacios', 'Correa', 'Fernandez', 'Romero', 'Alvarez',
  'Amiri', 'Özcan', 'Ayhan', 'Çalhanoglu', 'Ünder',
  'Santos', 'Silva', 'Costa', 'Pereira', 'Fernandes',
];

const NATIONALITIES_WEIGHTED = [
  { nat: 'Deutschland', weight: 65 },
  { nat: 'Frankreich', weight: 5 },
  { nat: 'Österreich', weight: 4 },
  { nat: 'Niederlande', weight: 3 },
  { nat: 'Kroatien', weight: 2 },
  { nat: 'Serbien', weight: 2 },
  { nat: 'Türkei', weight: 2 },
  { nat: 'Japan', weight: 2 },
  { nat: 'Südkorea', weight: 1 },
  { nat: 'Schweiz', weight: 2 },
  { nat: 'Mali', weight: 1 },
  { nat: 'Guinea', weight: 1 },
  { nat: 'Senegal', weight: 1 },
  { nat: 'Brasilien', weight: 2 },
  { nat: 'Argentinien', weight: 1 },
  { nat: 'Portugal', weight: 1 },
  { nat: 'Spanien', weight: 1 },
  { nat: 'Norwegen', weight: 1 },
  { nat: 'Dänemark', weight: 1 },
  { nat: 'Polen', weight: 2 },
];

const SQUAD_TEMPLATE: { position: Position; count: number }[] = [
  { position: 'TW', count: 3 },
  { position: 'IV', count: 4 },
  { position: 'LV', count: 2 },
  { position: 'RV', count: 2 },
  { position: 'ZDM', count: 2 },
  { position: 'ZM', count: 3 },
  { position: 'ZOM', count: 2 },
  { position: 'LA', count: 2 },
  { position: 'RA', count: 2 },
  { position: 'ST', count: 3 },
];

function getBaseStrength(teamReputation: number, rng: SeededRandom): number {
  // Team reputation determines average player quality
  // BL top: rep 90-98 -> players 70-88
  // BL mid: rep 65-80 -> players 58-75
  // 2.BL: rep 45-72 -> players 48-68
  // 3.Liga: rep 40-58 -> players 35-58
  const base = teamReputation * 0.8 - 5;
  return Math.round(base + rng.gaussian(0, 5));
}

function generateAttributes(
  position: Position,
  baseStrength: number,
  rng: SeededRandom
): PlayerAttributes {
  const attr = (bonus: number) =>
    Math.max(1, Math.min(99, rng.gaussian(baseStrength + bonus, 8)));

  const isGK = position === 'TW';
  const isDef = ['IV', 'LV', 'RV'].includes(position);
  const isMid = ['ZDM', 'ZM', 'ZOM'].includes(position);
  const isAtt = ['LA', 'RA', 'ST'].includes(position);

  return {
    // Technical
    ballControl: attr(isGK ? -20 : isMid ? 5 : isAtt ? 5 : 0),
    dribbling: attr(isGK ? -25 : isAtt ? 8 : isMid ? 3 : -5),
    passing: attr(isGK ? -15 : isMid ? 8 : isDef ? 2 : 3),
    crossing: attr(isGK ? -25 : ['LA', 'RA', 'LV', 'RV'].includes(position) ? 10 : -3),
    shooting: attr(isGK ? -30 : isAtt ? 10 : isMid ? 2 : -10),
    longShots: attr(isGK ? -30 : isMid ? 5 : isAtt ? 3 : -8),
    finishing: attr(isGK ? -30 : position === 'ST' ? 12 : isAtt ? 5 : -10),
    freeKick: attr(isGK ? -20 : isMid ? 5 : 0),
    heading: attr(isGK ? -15 : position === 'IV' ? 8 : position === 'ST' ? 5 : 0),

    // Physical
    pace: attr(isGK ? -10 : ['LA', 'RA', 'LV', 'RV'].includes(position) ? 8 : position === 'ST' ? 3 : 0),
    acceleration: attr(isGK ? -10 : isAtt ? 6 : 0),
    stamina: attr(isGK ? -5 : isMid ? 5 : ['LV', 'RV'].includes(position) ? 5 : 0),
    strength: attr(isGK ? 0 : position === 'IV' ? 5 : position === 'ST' ? 3 : position === 'ZDM' ? 3 : 0),
    jumping: attr(isGK ? 3 : position === 'IV' ? 5 : position === 'ST' ? 3 : 0),

    // Mental
    vision: attr(isGK ? -10 : position === 'ZOM' ? 10 : isMid ? 5 : 0),
    composure: attr(isGK ? 5 : isAtt ? 3 : isMid ? 3 : 0),
    aggression: attr(isGK ? -5 : position === 'ZDM' ? 5 : isDef ? 3 : 0),
    positioning: attr(isGK ? -5 : isDef ? 8 : position === 'ZDM' ? 5 : position === 'ST' ? 5 : 0),
    workRate: attr(isMid ? 5 : ['LV', 'RV'].includes(position) ? 3 : 0),
    leadership: attr(position === 'IV' ? 5 : position === 'ZDM' ? 3 : 0),

    // Goalkeeper
    reflexes: attr(isGK ? 10 : -30),
    handling: attr(isGK ? 10 : -35),
    diving: attr(isGK ? 10 : -35),
    kicking: attr(isGK ? 5 : -30),
    oneOnOne: attr(isGK ? 8 : -35),
  };
}

function pickNationality(rng: SeededRandom): string {
  const totalWeight = NATIONALITIES_WEIGHTED.reduce((sum, n) => sum + n.weight, 0);
  let r = rng.next() * totalWeight;
  for (const n of NATIONALITIES_WEIGHTED) {
    r -= n.weight;
    if (r <= 0) return n.nat;
  }
  return 'Deutschland';
}

function pickName(nationality: string, rng: SeededRandom): { firstName: string; lastName: string } {
  if (nationality === 'Deutschland' || nationality === 'Österreich' || nationality === 'Schweiz') {
    return {
      firstName: rng.pick(GERMAN_FIRST_NAMES),
      lastName: rng.pick(GERMAN_LAST_NAMES),
    };
  }
  return {
    firstName: rng.pick(INTERNATIONAL_FIRST_NAMES),
    lastName: rng.pick(INTERNATIONAL_LAST_NAMES),
  };
}

function generateAge(position: Position, rng: SeededRandom): number {
  // GK tend to be older, young talents exist
  const base = position === 'TW' ? rng.range(22, 34) : rng.range(18, 34);
  return base;
}

function calculateMarketValue(age: number, overall: number, leagueTier: number): number {
  let base = 0;

  if (overall >= 85) base = 40000000;
  else if (overall >= 80) base = 20000000;
  else if (overall >= 75) base = 10000000;
  else if (overall >= 70) base = 5000000;
  else if (overall >= 65) base = 2500000;
  else if (overall >= 60) base = 1200000;
  else if (overall >= 55) base = 700000;
  else if (overall >= 50) base = 400000;
  else if (overall >= 45) base = 250000;
  else if (overall >= 40) base = 150000;
  else base = 100000;

  // Age factor
  let ageFactor = 1;
  if (age <= 21) ageFactor = 1.3;
  else if (age <= 25) ageFactor = 1.2;
  else if (age <= 28) ageFactor = 1.0;
  else if (age <= 31) ageFactor = 0.7;
  else if (age <= 33) ageFactor = 0.4;
  else ageFactor = 0.25;

  // League tier factor (less aggressive penalty for lower tiers)
  const tierFactor = leagueTier === 1 ? 1.0 : leagueTier === 2 ? 0.55 : 0.35;

  return Math.max(50000, Math.round(base * ageFactor * tierFactor / 50000) * 50000);
}

function calculateSalary(marketValue: number): number {
  // Roughly 10-20% of market value per year
  return Math.round(marketValue * 0.12 / 10000) * 10000;
}

function calculateOverall(attrs: PlayerAttributes, position: Position): number {
  if (position === 'TW') {
    return Math.round(
      (attrs.reflexes * 0.25 + attrs.handling * 0.2 + attrs.diving * 0.2 +
        attrs.kicking * 0.1 + attrs.oneOnOne * 0.15 + attrs.composure * 0.1) * 1
    );
  }
  if (['IV', 'LV', 'RV'].includes(position)) {
    return Math.round(
      (attrs.positioning * 0.2 + attrs.strength * 0.1 + attrs.heading * 0.1 +
        attrs.pace * 0.1 + attrs.passing * 0.1 + attrs.aggression * 0.1 +
        attrs.composure * 0.1 + attrs.stamina * 0.1 + attrs.workRate * 0.1) * 1
    );
  }
  if (['ZDM', 'ZM'].includes(position)) {
    return Math.round(
      (attrs.passing * 0.2 + attrs.vision * 0.15 + attrs.stamina * 0.1 +
        attrs.positioning * 0.1 + attrs.ballControl * 0.1 + attrs.workRate * 0.1 +
        attrs.composure * 0.1 + attrs.shooting * 0.05 + attrs.strength * 0.1) * 1
    );
  }
  if (position === 'ZOM') {
    return Math.round(
      (attrs.vision * 0.2 + attrs.passing * 0.15 + attrs.ballControl * 0.15 +
        attrs.dribbling * 0.1 + attrs.shooting * 0.1 + attrs.composure * 0.1 +
        attrs.finishing * 0.1 + attrs.pace * 0.1) * 1
    );
  }
  if (['LA', 'RA'].includes(position)) {
    return Math.round(
      (attrs.pace * 0.2 + attrs.dribbling * 0.15 + attrs.crossing * 0.15 +
        attrs.acceleration * 0.1 + attrs.shooting * 0.1 + attrs.ballControl * 0.1 +
        attrs.stamina * 0.1 + attrs.finishing * 0.1) * 1
    );
  }
  // ST
  return Math.round(
    (attrs.finishing * 0.25 + attrs.shooting * 0.15 + attrs.heading * 0.1 +
      attrs.positioning * 0.1 + attrs.composure * 0.1 + attrs.pace * 0.1 +
      attrs.strength * 0.1 + attrs.dribbling * 0.1) * 1
  );
}

/**
 * Build a full Player object from a RealPlayerSeed.
 * Attributes are generated to match the target overall rating.
 */
function playerFromSeed(
  seed: RealPlayerSeed,
  teamId: string,
  leagueTier: number,
  index: number,
  rng: SeededRandom
): Player {
  const age = getAgeFromDob(seed.dob);
  const attributes = generateAttributes(seed.pos, seed.ovr, rng);
  // Nudge attributes so calculated overall matches target ovr
  nudgeAttributesToOverall(attributes, seed.pos, seed.ovr, rng);
  const overall = calculateOverall(attributes, seed.pos);
  const potential = seed.pot ?? Math.min(99, overall + (age < 23 ? rng.range(5, 15) : rng.range(0, 5)));
  const marketValue = calculateMarketValue(age, overall, leagueTier);
  const salary = calculateSalary(marketValue);
  const foot: FootPreference = seed.foot === 'L' ? 'left' : seed.foot === 'B' ? 'both' : 'right';

  return {
    id: `${teamId}-p${index}`,
    firstName: seed.fn,
    lastName: seed.ln,
    dateOfBirth: seed.dob,
    nationality: seed.nat,
    position: seed.pos,
    secondaryPositions: seed.sec ?? [],
    foot,
    height: seed.h ?? (seed.pos === 'TW' ? rng.range(185, 198) : rng.range(170, 192)),
    weight: seed.w ?? rng.range(68, 92),
    shirtNumber: seed.nr,
    teamId,
    contractUntil: `${2025 + rng.range(0, 4)}-06-30`,
    salary,
    marketValue,
    attributes,
    condition: rng.range(78, 100),
    morale: rng.range(65, 90),
    form: rng.range(55, 80),
    fatigue: rng.range(0, 15),
    injuryProne: rng.range(1, 7),
    suspended: false,
    suspendedMatches: 0,
    potential,
    growthRate: age < 22 ? 0.8 + rng.next() * 0.7 : 0.3 + rng.next() * 0.4,
    level: Math.max(1, Math.floor(overall / 3) + (age > 28 ? 5 : 0)),
    xp: rng.range(0, 50),
    xpToNextLevel: 100,
    trainingBoosts: [],
    traits: [],
    stats: {
      appearances: 0, goals: 0, assists: 0, cleanSheets: 0,
      avgRating: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0,
    },
    formHistory: [],
    ratingHistory: [],
    isLoaned: false,
    isTransferListed: false,
    transferRequested: false,
  };
}

function getAgeFromDob(dob: string): number {
  const birth = new Date(dob);
  const ref = new Date('2025-07-01');
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Iteratively adjust attributes so that calculateOverall matches target.
 */
function nudgeAttributesToOverall(
  attrs: PlayerAttributes,
  position: Position,
  targetOvr: number,
  rng: SeededRandom
): void {
  const keys = Object.keys(attrs) as (keyof PlayerAttributes)[];
  for (let iter = 0; iter < 15; iter++) {
    const current = calculateOverall(attrs, position);
    const diff = targetOvr - current;
    if (Math.abs(diff) <= 1) break;
    // nudge all attributes proportionally
    const nudge = Math.sign(diff) * Math.max(1, Math.abs(diff));
    for (const k of keys) {
      attrs[k] = Math.max(1, Math.min(99, attrs[k] + Math.round(nudge * 0.4 + rng.next() * 0.4)));
    }
  }
}

export function generatePlayersForTeam(team: Team, leagueTier: number, baseSeed: number): Player[] {
  const rng = new SeededRandom(baseSeed + hashCode(team.id));

  // Check for real player data first
  const roster = getRosterForTeam(team.id);
  if (roster) {
    return roster.players.map((seed, i) =>
      playerFromSeed(seed, team.id, leagueTier, i, rng)
    );
  }

  // Fallback: generate random players (legacy path)
  const players: Player[] = [];
  let shirtNum = 1;

  for (const slot of SQUAD_TEMPLATE) {
    for (let i = 0; i < slot.count; i++) {
      const nationality = pickNationality(rng);
      const { firstName, lastName } = pickName(nationality, rng);
      const age = generateAge(slot.position, rng);

      const isStarter = i === 0 || (i === 1 && slot.count >= 3);
      const strengthBoost = isStarter ? rng.range(3, 8) : rng.range(-5, 2);
      const baseStr = getBaseStrength(team.reputation, rng) + strengthBoost;

      const attributes = generateAttributes(slot.position, Math.max(25, Math.min(92, baseStr)), rng);
      const overall = calculateOverall(attributes, slot.position);
      const potential = Math.min(99, overall + (age < 23 ? rng.range(5, 20) : rng.range(0, 5)));
      const marketValue = calculateMarketValue(age, overall, leagueTier);
      const salary = calculateSalary(marketValue);

      const foot: FootPreference = rng.next() < 0.7 ? 'right' : rng.next() < 0.5 ? 'left' : 'both';

      const playerId = `${team.id}-${slot.position.toLowerCase()}-${i + 1}`;
      const birthYear = 2025 - age;

      players.push({
        id: playerId,
        firstName,
        lastName,
        dateOfBirth: `${birthYear}-${String(rng.range(1, 12)).padStart(2, '0')}-${String(rng.range(1, 28)).padStart(2, '0')}`,
        nationality,
        position: slot.position,
        secondaryPositions: [],
        foot,
        height: slot.position === 'TW' ? rng.range(185, 198) : slot.position === 'IV' ? rng.range(180, 195) : rng.range(170, 192),
        weight: rng.range(68, 92),
        shirtNumber: shirtNum,
        teamId: team.id,
        contractUntil: `${2025 + rng.range(0, 4)}-06-30`,
        salary,
        marketValue,
        attributes,
        condition: rng.range(75, 100),
        morale: rng.range(60, 90),
        form: rng.range(50, 80),
        fatigue: rng.range(0, 20),
        injuryProne: rng.range(1, 7),
        suspended: false,
        suspendedMatches: 0,
        potential,
        growthRate: age < 22 ? 0.8 + rng.next() * 0.7 : 0.3 + rng.next() * 0.4,
        level: Math.max(1, Math.floor(overall / 3) + (age > 28 ? 5 : 0)),
        xp: rng.range(0, 50),
        xpToNextLevel: 100,
        trainingBoosts: [],
        traits: [],
        stats: {
          appearances: 0, goals: 0, assists: 0, cleanSheets: 0,
          avgRating: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0,
        },
        formHistory: [],
        ratingHistory: [],
        isLoaned: false,
        isTransferListed: false,
        transferRequested: false,
      });

      shirtNum++;
    }
  }

  return players;
}

/** Trait-Score: how well a player's attributes match a given trait */
interface TraitScore { traitId: string; score: number; }

function scoreTraitForPlayer(traitId: string, a: PlayerAttributes, pos: Position): number {
  switch (traitId) {
    case 'clinical_finisher': return (a.finishing * 0.45 + a.shooting * 0.3 + a.composure * 0.25);
    case 'playmaker':         return (a.vision * 0.4 + a.passing * 0.35 + a.ballControl * 0.25);
    case 'speed_demon':       return (a.pace * 0.5 + a.acceleration * 0.35 + a.stamina * 0.15);
    case 'header_king':       return (a.heading * 0.5 + a.jumping * 0.3 + a.strength * 0.2);
    case 'long_range_specialist': return (a.longShots * 0.45 + a.shooting * 0.3 + a.freeKick * 0.25);
    case 'dead_ball_expert':  return (a.freeKick * 0.5 + a.crossing * 0.25 + a.passing * 0.25);
    case 'cross_master':      return (a.crossing * 0.5 + a.passing * 0.25 + a.vision * 0.25);
    case 'rock_solid':        return (a.positioning * 0.3 + a.strength * 0.25 + a.heading * 0.2 + a.aggression * 0.15 + a.composure * 0.1);
    case 'interceptor':       return (a.positioning * 0.35 + a.workRate * 0.25 + a.vision * 0.2 + a.pace * 0.2);
    case 'marking_specialist': return (a.positioning * 0.35 + a.pace * 0.25 + a.aggression * 0.2 + a.stamina * 0.2);
    case 'super_gloves':      return (a.reflexes * 0.3 + a.handling * 0.25 + a.diving * 0.25 + a.oneOnOne * 0.2);
    case 'penalty_killer':    return (a.reflexes * 0.35 + a.oneOnOne * 0.35 + a.composure * 0.3);
    case 'sweeper_keeper':    return (a.kicking * 0.35 + a.passing * 0.25 + a.pace * 0.2 + a.composure * 0.2);
    case 'captain_leader':    return (a.leadership * 0.4 + a.composure * 0.3 + a.workRate * 0.3);
    case 'clutch_performer':  return (a.composure * 0.4 + a.finishing * 0.3 + a.vision * 0.3);
    case 'consistency_king':  return (a.composure * 0.3 + a.workRate * 0.3 + a.stamina * 0.2 + a.positioning * 0.2);
    case 'iron_man':          return (a.stamina * 0.4 + a.strength * 0.3 + a.workRate * 0.3);
    case 'power_shot':        return (a.shooting * 0.4 + a.longShots * 0.35 + a.strength * 0.25);
    default: return 0;
  }
}

function tierFromScore(score: number): 'bronze' | 'silver' | 'gold' {
  if (score >= 85) return 'gold';
  if (score >= 75) return 'silver';
  return 'bronze';
}

/**
 * Deterministic trait assignment based on player attributes.
 * Analyzes each eligible trait, scores it against the player's attributes,
 * and awards traits whose score exceeds a threshold.
 */
function generateTraitsForPlayer(player: Player, explicitTraits?: [string, 'bronze' | 'silver' | 'gold'][]): PlayerTrait[] {
  // If explicit traits from seed data, use those
  if (explicitTraits && explicitTraits.length > 0) {
    return explicitTraits.map(([traitId, tier]) => ({
      traitId, tier, acquiredDate: '2025-07-01',
    }));
  }

  const overall = calculateOverall(player.attributes, player.position);
  const eligible = TRAIT_CATALOG.filter((t) => t.eligiblePositions.includes(player.position));
  if (eligible.length === 0) return [];

  // Score each eligible trait against the player's attributes
  const scored: TraitScore[] = eligible.map((t) => ({
    traitId: t.id,
    score: scoreTraitForPlayer(t.id, player.attributes, player.position),
  })).sort((a, b) => b.score - a.score);

  // Thresholds: higher OVR players qualify for more traits
  const minScore = overall >= 80 ? 65 : overall >= 70 ? 70 : overall >= 60 ? 75 : 80;
  const maxTraits = overall >= 85 ? 3 : overall >= 75 ? 2 : 1;

  const traits: PlayerTrait[] = [];
  for (const s of scored) {
    if (traits.length >= maxTraits) break;
    if (s.score < minScore) break;
    traits.push({
      traitId: s.traitId,
      tier: tierFromScore(s.score),
      acquiredDate: '2025-07-01',
    });
  }

  return traits;
}

export function generateAllPlayers(teams: Team[]): Player[] {
  const allPlayers: Player[] = [];
  const SEED = 42;

  for (const team of teams) {
    const tier = team.league === 'bundesliga' ? 1 : team.league === 'zweite-liga' ? 2 : 3;
    const teamPlayers = generatePlayersForTeam(team, tier, SEED);
    allPlayers.push(...teamPlayers);
  }

  // Assign traits deterministically based on attributes (+ explicit seed data)
  for (const team of teams) {
    const roster = getRosterForTeam(team.id);
    const teamPlayers = allPlayers.filter((p) => p.teamId === team.id);

    for (let i = 0; i < teamPlayers.length; i++) {
      const player = teamPlayers[i];
      const seedTraits = roster?.players[i]?.tr;
      player.traits = generateTraitsForPlayer(player, seedTraits);

      // Apply trait value multiplier to market value
      if (player.traits.length > 0) {
        let multiplier = 1;
        for (const t of player.traits) {
          const def = TRAIT_CATALOG.find((d) => d.id === t.traitId);
          if (def) multiplier *= def.valueMultiplier[t.tier];
        }
        player.marketValue = Math.round(player.marketValue * multiplier);
      }
    }
  }

  return allPlayers;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
