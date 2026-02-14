import {
  ManagerProfile, ManagerSkills, ManagerTrait, ManagerTraitId,
  WeeklyMission, MissionReward, MissionType,
} from '@/types/manager';

// ════════════════════════════════════════════════════════
//  Manager Trait Catalog
// ════════════════════════════════════════════════════════

interface TraitDefinition {
  id: ManagerTraitId;
  name: string;
  icon: string;
  description: string;
  effects: [string, string, string]; // tier 1/2/3 effect text
  unlockCondition: string;
}

export const MANAGER_TRAIT_CATALOG: TraitDefinition[] = [
  {
    id: 'motivator',
    name: 'Motivator',
    icon: '🔥',
    description: 'Deine Ansprachen entfalten besondere Wirkung.',
    effects: [
      'Halbzeitansprache +10% Wirkung',
      'Halbzeitansprache +20% Wirkung, Morale-Verfall -15%',
      'Halbzeitansprache +35% Wirkung, Morale-Verfall -25%, Comeback-Bonus',
    ],
    unlockCondition: '5 Siege in Folge oder 10 Missionen vom Typ "Motivation"',
  },
  {
    id: 'taktikfuchs',
    name: 'Taktikfuchs',
    icon: '🧠',
    description: 'Du erkennst taktische Schwächen blitzschnell.',
    effects: [
      'Taktische Reinrufe +5% Effekt',
      'Taktische Reinrufe +12% Effekt, schnellere Cooldowns',
      'Taktische Reinrufe +20% Effekt, -50% Cooldown, Formationsbonus',
    ],
    unlockCondition: 'Taktik-Skill ≥ 10 oder 15 Missionen abgeschlossen',
  },
  {
    id: 'jugendfluesterer',
    name: 'Jugendflüsterer',
    icon: '🌱',
    description: 'Junge Spieler entwickeln sich unter dir besonders schnell.',
    effects: [
      'U23 Spieler +10% XP',
      'U23 Spieler +20% XP, höhere Potenzialentfaltung',
      'U23 Spieler +35% XP, Potenzial +2, seltene Trait-Chance',
    ],
    unlockCondition: '3 Jugendebüts oder Jugendarbeit-Skill ≥ 10',
  },
  {
    id: 'transferhai',
    name: 'Transferhai',
    icon: '🦈',
    description: 'Du holst das Maximum aus Verhandlungen heraus.',
    effects: [
      'Transfergebühren -5%',
      'Transfergebühren -10%, bessere Gegengebote',
      'Transfergebühren -18%, Geheimtipp-Transfers freigeschaltet',
    ],
    unlockCondition: 'Verhandlung-Skill ≥ 10 oder 5 erfolgreiche Transfers',
  },
  {
    id: 'eiserner_wille',
    name: 'Eiserner Wille',
    icon: '🛡️',
    description: 'Dein Team gibt niemals auf.',
    effects: [
      'Moral sinkt 10% langsamer nach Niederlagen',
      'Moral sinkt 20% langsamer, +5% Leistung bei Rückstand',
      'Moral sinkt 30% langsamer, +10% Leistung bei Rückstand, nie unter 40 Moral',
    ],
    unlockCondition: '3 Comeback-Siege oder 5 Unentschieden nach Rückstand',
  },
  {
    id: 'publikumsliebling',
    name: 'Publikumsliebling',
    icon: '🎤',
    description: 'Die Fans lieben dich — Heimvorteil verstärkt.',
    effects: [
      'Heimbonus +3%',
      'Heimbonus +6%, bessere Stadioneinnahmen',
      'Heimbonus +10%, Stadioneinnahmen +15%, Fan-Loyalität steigt schneller',
    ],
    unlockCondition: 'Medien-Skill ≥ 8 oder 10 Heimsiege',
  },
  {
    id: 'detailverliebt',
    name: 'Detailverliebt',
    icon: '🔬',
    description: 'Du optimierst jedes Detail im Training.',
    effects: [
      'Trainingseffektivität +8%',
      'Trainingseffektivität +15%, weniger Verletzungen im Training',
      'Trainingseffektivität +25%, Fitness-Regeneration +20%',
    ],
    unlockCondition: 'Fitness-Skill ≥ 10 oder 20 Trainingseinheiten',
  },
  {
    id: 'glueckspilz',
    name: 'Glückspilz',
    icon: '🍀',
    description: 'Das Glück ist auf deiner Seite.',
    effects: [
      'Lattentreffern und knappen Entscheidungen +3% zu deinen Gunsten',
      '+5% Glück bei Pfosten/Latte, Elfmeter, VAR-Entscheidungen',
      '+8% Glück, seltene positive Zufallsevents häufiger',
    ],
    unlockCondition: 'Geheim — wird zufällig nach einem Glücksmoment vergeben',
  },
  {
    id: 'festungsbauer',
    name: 'Festungsbauer',
    icon: '🏰',
    description: 'Deine Defensive ist nahezu unüberwindbar.',
    effects: [
      'Gegnerische Torchance -3%',
      'Gegnerische Torchance -6%, seltener Elfmeter gegen dich',
      'Gegnerische Torchance -10%, Zu-Null-Bonus auf Moral',
    ],
    unlockCondition: '5 Zu-Null-Spiele oder Disziplin-Skill ≥ 12',
  },
  {
    id: 'pressing_maschine',
    name: 'Pressing-Maschine',
    icon: '⚡',
    description: 'Dein Pressing-System ist gefürchtet.',
    effects: [
      'Pressing-Effektivität +5%',
      'Pressing-Effektivität +10%, Balleroberungen +8%',
      'Pressing-Effektivität +18%, Gegner verliert schneller Kondition',
    ],
    unlockCondition: 'Taktik-Skill ≥ 8 und 60%+ Ballbesitz in 5 Spielen',
  },
  {
    id: 'talentscout',
    name: 'Talentscout',
    icon: '🔭',
    description: 'Du findest verborgene Talente.',
    effects: [
      'Scouting-Berichte +1 Detail',
      'Scouting-Berichte +2 Details, günstigere Scouting-Kosten',
      'Scouting-Berichte zeigen Potenzial, Geheimtipps verfügbar',
    ],
    unlockCondition: 'Scouting-Skill ≥ 10 oder 10 Scouting-Aufträge',
  },
  {
    id: 'comeback_koenig',
    name: 'Comeback-König',
    icon: '👑',
    description: 'Dein Team dreht aussichtslose Spiele.',
    effects: [
      '+3% Leistung ab 70. Minute bei Rückstand',
      '+6% Leistung ab 60. Minute bei Rückstand, Moral-Boost',
      '+10% Leistung ab 60. Minute, nie aufgeben-Mentalität, Clutch-Bonus',
    ],
    unlockCondition: '3 Comeback-Siege',
  },
];

export function getTraitDefinition(id: ManagerTraitId): TraitDefinition | undefined {
  return MANAGER_TRAIT_CATALOG.find(t => t.id === id);
}

export function createManagerTrait(id: ManagerTraitId, tier: 1 | 2 | 3 = 1, date?: string): ManagerTrait | null {
  const def = getTraitDefinition(id);
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    icon: def.icon,
    description: def.description,
    tier,
    effect: def.effects[tier - 1],
    unlockedDate: date,
  };
}

// ════════════════════════════════════════════════════════
//  Weekly Mission Templates
// ════════════════════════════════════════════════════════

interface MissionTemplate {
  type: MissionType;
  title: string;
  description: string;
  icon: string;
  targetRange: [number, number]; // min-max target
  reward: (target: number) => MissionReward;
  weight: number;
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    type: 'win_matches', title: 'Siegesserie', description: 'Gewinne {target} Spiele diese Woche.',
    icon: '🏆', targetRange: [1, 2], weight: 20,
    reward: (t) => ({ xp: 30 * t, skillBoost: { skill: 'tactics', amount: 1 }, reputationBoost: 1 }),
  },
  {
    type: 'clean_sheets', title: 'Weiße Weste', description: 'Halte {target} Mal die Null.',
    icon: '🧤', targetRange: [1, 1], weight: 12,
    reward: () => ({ xp: 40, skillBoost: { skill: 'discipline', amount: 1 }, traitProgress: 'festungsbauer' }),
  },
  {
    type: 'score_goals', title: 'Torfestival', description: 'Erziele insgesamt {target} Tore.',
    icon: '⚽', targetRange: [3, 5], weight: 15,
    reward: (t) => ({ xp: 10 * t, reputationBoost: 1 }),
  },
  {
    type: 'develop_youth', title: 'Jugendförderung', description: 'Setze {target} U23-Spieler ein.',
    icon: '🌱', targetRange: [2, 3], weight: 10,
    reward: (t) => ({ xp: 20 * t, skillBoost: { skill: 'youthDev', amount: 1 }, traitProgress: 'jugendfluesterer' }),
  },
  {
    type: 'no_cards', title: 'Fair Play', description: 'Beende {target} Spiel(e) ohne Gelbe/Rote Karte.',
    icon: '🤝', targetRange: [1, 1], weight: 10,
    reward: () => ({ xp: 35, skillBoost: { skill: 'discipline', amount: 1 } }),
  },
  {
    type: 'training_sessions', title: 'Trainingsfleiß', description: 'Absolviere {target} Trainingseinheiten.',
    icon: '🏋️', targetRange: [2, 3], weight: 15,
    reward: (t) => ({ xp: 15 * t, skillBoost: { skill: 'fitness', amount: 1 }, traitProgress: 'detailverliebt' }),
  },
  {
    type: 'high_possession', title: 'Ballbesitz-König', description: 'Erreiche 55%+ Ballbesitz in {target} Spiel(en).',
    icon: '📊', targetRange: [1, 1], weight: 8,
    reward: () => ({ xp: 45, skillBoost: { skill: 'tactics', amount: 1 }, traitProgress: 'pressing_maschine' }),
  },
  {
    type: 'come_from_behind', title: 'Aufholjagd', description: 'Drehe ein Spiel nach Rückstand.',
    icon: '🔄', targetRange: [1, 1], weight: 6,
    reward: () => ({ xp: 60, skillBoost: { skill: 'motivation', amount: 2 }, traitProgress: 'comeback_koenig', reputationBoost: 2 }),
  },
  {
    type: 'use_subs', title: 'Wechselstratege', description: 'Nimm {target} Auswechslungen vor.',
    icon: '🔄', targetRange: [3, 5], weight: 12,
    reward: () => ({ xp: 25, skillBoost: { skill: 'tactics', amount: 1 } }),
  },
  {
    type: 'high_rating_player', title: 'Topstar fördern', description: 'Ein Spieler erreicht eine Note von 8.0+.',
    icon: '⭐', targetRange: [1, 1], weight: 10,
    reward: () => ({ xp: 40, reputationBoost: 1 }),
  },
  {
    type: 'budget_profit', title: 'Sparfuchs', description: 'Erziele {target}k € Einnahmenüberschuss.',
    icon: '💰', targetRange: [50, 200], weight: 5,
    reward: () => ({ xp: 35, skillBoost: { skill: 'negotiation', amount: 1 }, traitProgress: 'transferhai' }),
  },
  {
    type: 'morale_high', title: 'Gute Stimmung', description: 'Halte Team-Moral über 70 für die ganze Woche.',
    icon: '😊', targetRange: [1, 1], weight: 10,
    reward: () => ({ xp: 30, skillBoost: { skill: 'motivation', amount: 1 }, traitProgress: 'motivator' }),
  },
  {
    type: 'tactical_shout', title: 'Dirigent', description: 'Nutze {target} taktische Reinrufe in Spielen.',
    icon: '📣', targetRange: [2, 4], weight: 10,
    reward: () => ({ xp: 25, skillBoost: { skill: 'tactics', amount: 1 }, traitProgress: 'taktikfuchs' }),
  },
  {
    type: 'debut_youth', title: 'Premiere', description: 'Gib einem Jugendspieler sein Debüt.',
    icon: '🎓', targetRange: [1, 1], weight: 5,
    reward: () => ({ xp: 50, skillBoost: { skill: 'youthDev', amount: 2 }, traitProgress: 'jugendfluesterer', reputationBoost: 1 }),
  },
  {
    type: 'no_injuries', title: 'Unversehrt', description: 'Beende die Woche ohne neue Verletzungen.',
    icon: '💚', targetRange: [1, 1], weight: 8,
    reward: () => ({ xp: 30, skillBoost: { skill: 'fitness', amount: 1 } }),
  },
];

// ════════════════════════════════════════════════════════
//  Mission Generation
// ════════════════════════════════════════════════════════

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

export function generateWeeklyMissions(currentDate: string, existingIds: string[]): WeeklyMission[] {
  const dateSeed = currentDate.split('-').join('');
  const rng = seededRandom(parseInt(dateSeed, 10));

  // Pick 3 unique missions
  const pool = [...MISSION_TEMPLATES];
  const selected: MissionTemplate[] = [];

  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const totalWeight = pool.reduce((s, m) => s + m.weight, 0);
    let r = rng() * totalWeight;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) { idx = j; break; }
    }
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  // Calculate expiry date (7 days from now)
  const expiry = new Date(currentDate);
  expiry.setDate(expiry.getDate() + 7);
  const expiresDate = expiry.toISOString().split('T')[0];

  return selected.map((template, i) => {
    const target = template.targetRange[0] + Math.floor(rng() * (template.targetRange[1] - template.targetRange[0] + 1));
    const id = `mission-${currentDate}-${i}`;

    return {
      id,
      type: template.type,
      title: template.title,
      description: template.description.replace('{target}', String(target)),
      icon: template.icon,
      target,
      progress: 0,
      isCompleted: false,
      reward: template.reward(target),
      expiresDate,
    };
  });
}

// ════════════════════════════════════════════════════════
//  XP & Level System
// ════════════════════════════════════════════════════════

export function xpRequiredForLevel(level: number): number {
  // Gentle curve: 100, 120, 145, 175, 210, ...
  return Math.round(100 * Math.pow(1.12, level - 1));
}

export function awardManagerXP(manager: ManagerProfile, amount: number): ManagerProfile {
  let xp = manager.xp + amount;
  let level = manager.level;
  let xpToNext = manager.xpToNextLevel;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level++;
    xpToNext = xpRequiredForLevel(level + 1);
  }

  return { ...manager, xp, level, xpToNextLevel: xpToNext };
}

export function completeMission(manager: ManagerProfile, missionId: string): ManagerProfile {
  const mission = manager.activeMissions.find(m => m.id === missionId);
  if (!mission || mission.isCompleted) return manager;

  let updated = { ...manager };

  // Award XP
  updated = awardManagerXP(updated, mission.reward.xp);

  // Apply skill boost
  if (mission.reward.skillBoost) {
    const { skill, amount } = mission.reward.skillBoost;
    updated.skills = {
      ...updated.skills,
      [skill]: Math.min(20, (updated.skills[skill] ?? 1) + amount),
    };
  }

  // Reputation boost
  if (mission.reward.reputationBoost) {
    updated.reputation = Math.min(100, updated.reputation + mission.reward.reputationBoost);
  }

  // Mark mission completed
  updated.activeMissions = updated.activeMissions.map(m =>
    m.id === missionId ? { ...m, isCompleted: true } : m
  );
  updated.completedMissionIds = [...updated.completedMissionIds, missionId];
  updated.missionsCompletedTotal++;

  return updated;
}

// ════════════════════════════════════════════════════════
//  Default Manager Profile Factory
// ════════════════════════════════════════════════════════

export function createDefaultManagerSkills(): ManagerSkills {
  return {
    tactics: 5,
    motivation: 5,
    negotiation: 3,
    youthDev: 3,
    fitness: 4,
    scouting: 3,
    media: 2,
    discipline: 4,
  };
}

export function createDefaultManagerStats() {
  return {
    totalMatches: 0, wins: 0, draws: 0, losses: 0,
    titlesWon: 0, cupsWon: 0, promotions: 0, relegations: 0, seasonsManaged: 0,
    cleanSheets: 0, comebacks: 0, winStreak: 0, currentWinStreak: 0, youthDebuts: 0,
  };
}

// ════════════════════════════════════════════════════════
//  AI Manager Generator
// ════════════════════════════════════════════════════════

const AI_FIRST_NAMES = [
  'Thomas', 'Marco', 'Stefan', 'Andreas', 'Christian', 'Michael', 'Daniel', 'Patrick',
  'Markus', 'Oliver', 'Jürgen', 'Hansi', 'Niko', 'Julian', 'Florian', 'Tobias',
  'Sebastian', 'Alexander', 'Matthias', 'Peter', 'Ralf', 'Dieter', 'Uwe', 'Frank',
  'Bruno', 'Lucien', 'Adi', 'Pellegrino', 'Gerardo', 'Enrico', 'Bo', 'Ole',
  'Vincent', 'Roger', 'Domenico', 'Steffen', 'Achim', 'Heiko', 'Miroslav', 'Sascha',
];

const AI_LAST_NAMES = [
  'Schmidt', 'Müller', 'Weber', 'Wagner', 'Fischer', 'Becker', 'Hoffmann', 'Koch',
  'Richter', 'Krause', 'Wolf', 'Schäfer', 'Lang', 'Braun', 'Hartmann', 'Brandt',
  'Kovac', 'Favre', 'Tedesco', 'Matarazzo', 'Seoane', 'Svensson', 'Reis', 'Baumgart',
  'Weinzierl', 'Labbadia', 'Funkel', 'Herrlich', 'Schuster', 'Stamm', 'Hütter',
  'Glasner', 'Streich', 'Rose', 'Nagelsmann', 'Kohfeldt', 'Beierlorzer', 'Schwarz',
];

const AI_NATIONALITIES = [
  'Deutschland', 'Deutschland', 'Deutschland', 'Deutschland', 'Deutschland',
  'Österreich', 'Schweiz', 'Niederlande', 'Kroatien', 'Italien', 'Spanien',
  'Dänemark', 'Schweden', 'Frankreich', 'Serbien', 'Türkei',
];

/**
 * Generate an AI manager profile based on team reputation.
 * Higher reputation teams get better managers.
 */
export function generateAIManager(
  teamId: string,
  teamName: string,
  teamReputation: number,
  seed: number,
): ManagerProfile {
  const rng = seededRandom(seed);

  const firstName = AI_FIRST_NAMES[Math.floor(rng() * AI_FIRST_NAMES.length)];
  const lastName = AI_LAST_NAMES[Math.floor(rng() * AI_LAST_NAMES.length)];
  const nationality = AI_NATIONALITIES[Math.floor(rng() * AI_NATIONALITIES.length)];

  // Age: 38-62, better teams tend to get more experienced (older) managers
  const baseAge = 38 + Math.floor(rng() * 15);
  const repBonus = Math.floor(teamReputation / 25);
  const age = Math.min(62, baseAge + repBonus);
  const birthYear = 2025 - age;
  const birthMonth = String(Math.floor(rng() * 12) + 1).padStart(2, '0');
  const birthDay = String(Math.floor(rng() * 28) + 1).padStart(2, '0');

  // Skills based on team reputation (1-100 → skills 2-16)
  const skillBase = Math.max(2, Math.floor(teamReputation / 8));
  const makeSkill = () => Math.max(1, Math.min(18, skillBase + Math.floor(rng() * 5) - 2));

  const skills: ManagerSkills = {
    tactics: makeSkill(),
    motivation: makeSkill(),
    negotiation: makeSkill(),
    youthDev: makeSkill(),
    fitness: makeSkill(),
    scouting: makeSkill(),
    media: makeSkill(),
    discipline: makeSkill(),
  };

  // Level based on reputation
  const level = Math.max(1, Math.min(40, Math.floor(teamReputation / 3) + Math.floor(rng() * 5) - 2));

  // Reputation correlates with team reputation
  const managerRep = Math.max(5, Math.min(95, teamReputation + Math.floor(rng() * 20) - 10));

  // Random traits for high-level managers (0-2 traits)
  const traits: ManagerTrait[] = [];
  if (level >= 10 && rng() > 0.5) {
    const traitIdx = Math.floor(rng() * MANAGER_TRAIT_CATALOG.length);
    const tier = level >= 25 ? (rng() > 0.5 ? 2 : 1) : 1;
    const t = createManagerTrait(MANAGER_TRAIT_CATALOG[traitIdx].id, tier as 1 | 2 | 3);
    if (t) traits.push(t);
  }
  if (level >= 20 && rng() > 0.6) {
    const traitIdx = Math.floor(rng() * MANAGER_TRAIT_CATALOG.length);
    const existing = traits.find(t => t.id === MANAGER_TRAIT_CATALOG[traitIdx].id);
    if (!existing) {
      const t = createManagerTrait(MANAGER_TRAIT_CATALOG[traitIdx].id, 1);
      if (t) traits.push(t);
    }
  }

  // Generate fake career stats proportional to age and level
  const seasonsManaged = Math.max(1, age - 37 + Math.floor(rng() * 3) - 1);
  const totalMatches = seasonsManaged * (28 + Math.floor(rng() * 10));
  const winRate = 0.25 + (teamReputation / 200) + rng() * 0.15;
  const wins = Math.floor(totalMatches * winRate);
  const draws = Math.floor(totalMatches * (0.2 + rng() * 0.1));
  const losses = totalMatches - wins - draws;

  return {
    firstName,
    lastName,
    dateOfBirth: `${birthYear}-${birthMonth}-${birthDay}`,
    nationality,
    avatarSeed: Math.floor(rng() * 100000),
    reputation: managerRep,
    currentTeamId: teamId,
    contractUntil: `2027-06-30`,
    salary: Math.round((30000 + teamReputation * 500 + level * 1000) / 1000) * 1000,
    level,
    xp: Math.floor(rng() * xpRequiredForLevel(level + 1)),
    xpToNextLevel: xpRequiredForLevel(level + 1),
    skills,
    traits,
    activeMissions: [],
    completedMissionIds: [],
    missionsCompletedTotal: Math.floor(rng() * level * 2),
    lastMissionRefresh: '2025-07-01',
    career: [{
      teamId,
      teamName,
      leagueId: '',
      startDate: `${2025 - Math.floor(rng() * 4) - 1}-07-01`,
      reason: 'hired' as const,
    }],
    achievements: [],
    stats: {
      totalMatches, wins, draws, losses,
      titlesWon: teamReputation > 70 ? Math.floor(rng() * 3) : 0,
      cupsWon: teamReputation > 50 ? Math.floor(rng() * 2) : 0,
      promotions: Math.floor(rng() * 2),
      relegations: 0,
      seasonsManaged,
      cleanSheets: Math.floor(wins * 0.3 + rng() * 5),
      comebacks: Math.floor(rng() * 5),
      winStreak: Math.floor(3 + rng() * (teamReputation / 15)),
      currentWinStreak: 0,
      youthDebuts: Math.floor(rng() * 8),
    },
  };
}

/**
 * Generate AI managers for all teams (excluding player's team).
 */
export function generateAllAIManagers(
  teams: { id: string; name: string; reputation: number }[],
  playerTeamId: string,
): Record<string, ManagerProfile> {
  const managers: Record<string, ManagerProfile> = {};
  for (const team of teams) {
    if (team.id === playerTeamId) continue;
    const seed = hashString(team.id + 'manager2025');
    managers[team.id] = generateAIManager(team.id, team.name, team.reputation, seed);
  }
  return managers;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h) || 1;
}

// ════════════════════════════════════════════════════════
//  Manager Skill Effects on Gameplay
//  Returns numeric bonuses used by match-engine, training, etc.
// ════════════════════════════════════════════════════════

export interface ManagerSkillEffects {
  // Match Engine
  tacticsBonus: number;         // +% team strength from formation optimization
  disciplineBonus: number;      // -% foul & card chance
  fitnessBonus: number;         // -% stamina drain, -% injury risk
  motivationBonus: number;      // +% halftime talk & shout effectiveness, morale recovery
  homeBonus: number;            // +% home advantage (from media/publicity)

  // Training & Development
  trainingEfficiency: number;   // +% weekly training effect
  youthDevBonus: number;        // +% youth XP and development
  injuryReduction: number;      // -% training injury risk

  // Transfers & Economy
  negotiationDiscount: number;  // -% transfer fee
  scoutingAccuracy: number;     // +% scouting report detail
  reputationGain: number;       // +% reputation gain from wins
}

/**
 * Calculate gameplay effects from manager skills.
 * Skills range 1-20; effects scale linearly.
 */
export function calcManagerEffects(skills: ManagerSkills): ManagerSkillEffects {
  return {
    // Match: tactics 1-20 → +0.5% to +10% team strength
    tacticsBonus: skills.tactics * 0.5,
    // Discipline 1-20 → -1% to -20% foul chance
    disciplineBonus: skills.discipline * 1.0,
    // Fitness 1-20 → -0.5% to -10% stamina drain
    fitnessBonus: skills.fitness * 0.5,
    // Motivation 1-20 → +2% to +40% shout/halftime effectiveness
    motivationBonus: skills.motivation * 2.0,
    // Media 1-20 → +0.3% to +6% home advantage
    homeBonus: skills.media * 0.3,

    // Training: fitness 1-20 → +1% to +20% training efficiency
    trainingEfficiency: skills.fitness * 0.5 + skills.tactics * 0.5,
    // Youth dev 1-20 → +2% to +40%
    youthDevBonus: skills.youthDev * 2.0,
    // Fitness → less training injuries
    injuryReduction: skills.fitness * 1.5,

    // Transfer: negotiation 1-20 → -0.5% to -10% fees
    negotiationDiscount: skills.negotiation * 0.5,
    // Scouting 1-20 → +5% to +100% accuracy
    scoutingAccuracy: skills.scouting * 5.0,
    // Media → reputation gains
    reputationGain: skills.media * 1.5,
  };
}
