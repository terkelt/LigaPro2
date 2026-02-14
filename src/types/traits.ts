/**
 * Special Traits System
 * Players can have unique traits in Bronze, Silver, or Gold tiers.
 * Traits provide match engine boosts and increase market value.
 * They can be earned through XP progression and great performances.
 */

export type TraitTier = 'bronze' | 'silver' | 'gold';

export interface PlayerTrait {
  traitId: string;
  tier: TraitTier;
  /** Date when trait was acquired */
  acquiredDate: string;
}

export type TraitCategory = 'offensive' | 'defensive' | 'goalkeeper' | 'mental' | 'physical';

export interface TraitDefinition {
  id: string;
  name: string;
  icon: string;
  category: TraitCategory;
  description: string;
  /** Which positions can have this trait */
  eligiblePositions: string[];
  /** Match engine effect multipliers per tier */
  boost: {
    bronze: TraitBoost;
    silver: TraitBoost;
    gold: TraitBoost;
  };
  /** Market value multiplier per tier (e.g. 1.05 = +5%) */
  valueMultiplier: { bronze: number; silver: number; gold: number };
  /** Base rarity: chance of being generated at game start (0-1) */
  baseRarity: { bronze: number; silver: number; gold: number };
}

export interface TraitBoost {
  /** Flat bonus to specific match engine calculations */
  goalChance?: number;       // +% goal scoring chance
  assistChance?: number;     // +% assist/key pass chance
  saveChance?: number;       // +% save chance for GK
  tackleChance?: number;     // +% successful tackle
  headerChance?: number;     // +% heading success
  freeKickChance?: number;   // +% free kick conversion
  penaltyChance?: number;    // +% penalty conversion
  longShotChance?: number;   // +% long shot success
  crossChance?: number;      // +% crossing accuracy
  clutchFactor?: number;     // +% performance boost in last 15 min
  consistencyBonus?: number; // +flat rating bonus
  injuryResistance?: number; // -% injury chance
  staminaBoost?: number;     // +% effective stamina
  speedBoost?: number;       // +% effective pace
  moraleAura?: number;       // +morale to nearby teammates
}

// ── Complete Trait Catalog ──

export const TRAIT_CATALOG: TraitDefinition[] = [
  // ── OFFENSIVE ──
  {
    id: 'clinical_finisher',
    name: 'Torjäger',
    icon: '🎯',
    category: 'offensive',
    description: 'Eiskalt vor dem Tor. Verwandelt auch die schwierigsten Chancen.',
    eligiblePositions: ['ST', 'LA', 'RA', 'ZOM'],
    boost: {
      bronze: { goalChance: 5 },
      silver: { goalChance: 10, clutchFactor: 3 },
      gold: { goalChance: 18, clutchFactor: 8, consistencyBonus: 0.2 },
    },
    valueMultiplier: { bronze: 1.08, silver: 1.18, gold: 1.35 },
    baseRarity: { bronze: 0.12, silver: 0.04, gold: 0.008 },
  },
  {
    id: 'playmaker',
    name: 'Spielmacher',
    icon: '🧠',
    category: 'offensive',
    description: 'Sieht Räume, die andere nicht sehen. Kreiert Chancen aus dem Nichts.',
    eligiblePositions: ['ZOM', 'ZM', 'LA', 'RA'],
    boost: {
      bronze: { assistChance: 5 },
      silver: { assistChance: 10, consistencyBonus: 0.15 },
      gold: { assistChance: 18, consistencyBonus: 0.3, moraleAura: 2 },
    },
    valueMultiplier: { bronze: 1.07, silver: 1.15, gold: 1.30 },
    baseRarity: { bronze: 0.10, silver: 0.035, gold: 0.007 },
  },
  {
    id: 'speed_demon',
    name: 'Turbo',
    icon: '⚡',
    category: 'offensive',
    description: 'Unglaubliche Geschwindigkeit. Lässt jeden Verteidiger stehen.',
    eligiblePositions: ['ST', 'LA', 'RA', 'LV', 'RV'],
    boost: {
      bronze: { speedBoost: 5 },
      silver: { speedBoost: 10, goalChance: 3 },
      gold: { speedBoost: 18, goalChance: 6, staminaBoost: 5 },
    },
    valueMultiplier: { bronze: 1.06, silver: 1.12, gold: 1.25 },
    baseRarity: { bronze: 0.14, silver: 0.05, gold: 0.01 },
  },
  {
    id: 'header_king',
    name: 'Kopfballungeheuer',
    icon: '👑',
    category: 'offensive',
    description: 'Dominant in der Luft. Trifft per Kopf wie andere mit dem Fuß.',
    eligiblePositions: ['ST', 'IV', 'ZM', 'ZDM'],
    boost: {
      bronze: { headerChance: 8 },
      silver: { headerChance: 15, goalChance: 3 },
      gold: { headerChance: 25, goalChance: 6, tackleChance: 3 },
    },
    valueMultiplier: { bronze: 1.05, silver: 1.10, gold: 1.22 },
    baseRarity: { bronze: 0.10, silver: 0.04, gold: 0.008 },
  },
  {
    id: 'long_range_specialist',
    name: 'Distanzschütze',
    icon: '🚀',
    category: 'offensive',
    description: 'Gefährlich aus jeder Entfernung. Fernschüsse sind seine Spezialität.',
    eligiblePositions: ['ZM', 'ZOM', 'ZDM', 'ST'],
    boost: {
      bronze: { longShotChance: 8 },
      silver: { longShotChance: 15, freeKickChance: 5 },
      gold: { longShotChance: 25, freeKickChance: 12, goalChance: 4 },
    },
    valueMultiplier: { bronze: 1.05, silver: 1.11, gold: 1.22 },
    baseRarity: { bronze: 0.09, silver: 0.03, gold: 0.006 },
  },
  {
    id: 'dead_ball_expert',
    name: 'Standardspezialist',
    icon: '🥅',
    category: 'offensive',
    description: 'Meister der ruhenden Bälle. Freistöße und Ecken sind sein Revier.',
    eligiblePositions: ['ZM', 'ZOM', 'LA', 'RA', 'ZDM'],
    boost: {
      bronze: { freeKickChance: 10, crossChance: 3 },
      silver: { freeKickChance: 20, crossChance: 6, penaltyChance: 5 },
      gold: { freeKickChance: 35, crossChance: 10, penaltyChance: 12 },
    },
    valueMultiplier: { bronze: 1.04, silver: 1.09, gold: 1.18 },
    baseRarity: { bronze: 0.08, silver: 0.03, gold: 0.005 },
  },
  {
    id: 'cross_master',
    name: 'Flankenmeister',
    icon: '🌀',
    category: 'offensive',
    description: 'Perfekte Flanken von der Seite. Findet immer den Kopf des Stürmers.',
    eligiblePositions: ['LA', 'RA', 'LV', 'RV'],
    boost: {
      bronze: { crossChance: 8, assistChance: 3 },
      silver: { crossChance: 15, assistChance: 6 },
      gold: { crossChance: 25, assistChance: 12, consistencyBonus: 0.15 },
    },
    valueMultiplier: { bronze: 1.05, silver: 1.10, gold: 1.20 },
    baseRarity: { bronze: 0.10, silver: 0.035, gold: 0.007 },
  },

  // ── DEFENSIVE ──
  {
    id: 'rock_solid',
    name: 'Abwehrchef',
    icon: '🛡️',
    category: 'defensive',
    description: 'Unüberwindbar in der Abwehr. Organisiert die Kette und räumt alles ab.',
    eligiblePositions: ['IV', 'ZDM'],
    boost: {
      bronze: { tackleChance: 6 },
      silver: { tackleChance: 12, headerChance: 5 },
      gold: { tackleChance: 20, headerChance: 10, moraleAura: 3 },
    },
    valueMultiplier: { bronze: 1.07, silver: 1.15, gold: 1.28 },
    baseRarity: { bronze: 0.10, silver: 0.035, gold: 0.007 },
  },
  {
    id: 'interceptor',
    name: 'Ballräuber',
    icon: '🧲',
    category: 'defensive',
    description: 'Liest das Spiel perfekt. Fängt Pässe ab, bevor sie ankommen.',
    eligiblePositions: ['ZDM', 'IV', 'ZM', 'LV', 'RV'],
    boost: {
      bronze: { tackleChance: 5, assistChance: 2 },
      silver: { tackleChance: 10, assistChance: 4, consistencyBonus: 0.1 },
      gold: { tackleChance: 18, assistChance: 7, consistencyBonus: 0.2, staminaBoost: 3 },
    },
    valueMultiplier: { bronze: 1.05, silver: 1.11, gold: 1.22 },
    baseRarity: { bronze: 0.11, silver: 0.04, gold: 0.008 },
  },
  {
    id: 'marking_specialist',
    name: 'Manndeckungskünstler',
    icon: '📌',
    category: 'defensive',
    description: 'Klebt am Gegner wie ein Schatten. Lässt niemandem Raum.',
    eligiblePositions: ['IV', 'LV', 'RV', 'ZDM'],
    boost: {
      bronze: { tackleChance: 4, speedBoost: 2 },
      silver: { tackleChance: 8, speedBoost: 4 },
      gold: { tackleChance: 15, speedBoost: 8, injuryResistance: 5 },
    },
    valueMultiplier: { bronze: 1.04, silver: 1.09, gold: 1.18 },
    baseRarity: { bronze: 0.09, silver: 0.03, gold: 0.006 },
  },

  // ── GOALKEEPER ──
  {
    id: 'super_gloves',
    name: 'Super-Handschuh',
    icon: '🧤',
    category: 'goalkeeper',
    description: 'Überragende Reflexe und sichere Hände. Hält das Unhaltbare.',
    eligiblePositions: ['TW'],
    boost: {
      bronze: { saveChance: 6 },
      silver: { saveChance: 12, clutchFactor: 4 },
      gold: { saveChance: 20, clutchFactor: 10, consistencyBonus: 0.3 },
    },
    valueMultiplier: { bronze: 1.08, silver: 1.18, gold: 1.35 },
    baseRarity: { bronze: 0.12, silver: 0.04, gold: 0.008 },
  },
  {
    id: 'penalty_killer',
    name: 'Elfmetertöter',
    icon: '✋',
    category: 'goalkeeper',
    description: 'Instinkt für die richtige Ecke. Schützen fürchten ihn.',
    eligiblePositions: ['TW'],
    boost: {
      bronze: { penaltyChance: 10, saveChance: 2 },
      silver: { penaltyChance: 20, saveChance: 4 },
      gold: { penaltyChance: 35, saveChance: 8, moraleAura: 3 },
    },
    valueMultiplier: { bronze: 1.04, silver: 1.09, gold: 1.18 },
    baseRarity: { bronze: 0.08, silver: 0.03, gold: 0.005 },
  },
  {
    id: 'sweeper_keeper',
    name: 'Libero-Keeper',
    icon: '🦅',
    category: 'goalkeeper',
    description: 'Spielt weit vor dem Tor. Startet Angriffe mit präzisen Pässen.',
    eligiblePositions: ['TW'],
    boost: {
      bronze: { saveChance: 3, assistChance: 2 },
      silver: { saveChance: 6, assistChance: 4, speedBoost: 3 },
      gold: { saveChance: 10, assistChance: 8, speedBoost: 6, consistencyBonus: 0.15 },
    },
    valueMultiplier: { bronze: 1.05, silver: 1.10, gold: 1.22 },
    baseRarity: { bronze: 0.07, silver: 0.025, gold: 0.005 },
  },

  // ── MENTAL ──
  {
    id: 'captain_leader',
    name: 'Führungsspieler',
    icon: '©️',
    category: 'mental',
    description: 'Natürlicher Anführer. Hebt das Niveau der gesamten Mannschaft.',
    eligiblePositions: ['TW', 'IV', 'LV', 'RV', 'ZDM', 'ZM', 'ZOM', 'LA', 'RA', 'ST'],
    boost: {
      bronze: { moraleAura: 2, consistencyBonus: 0.1 },
      silver: { moraleAura: 4, consistencyBonus: 0.2, clutchFactor: 3 },
      gold: { moraleAura: 7, consistencyBonus: 0.3, clutchFactor: 6 },
    },
    valueMultiplier: { bronze: 1.06, silver: 1.13, gold: 1.25 },
    baseRarity: { bronze: 0.08, silver: 0.03, gold: 0.005 },
  },
  {
    id: 'clutch_performer',
    name: 'Entscheider',
    icon: '🔥',
    category: 'mental',
    description: 'Glänzt in den wichtigsten Momenten. Dreht Spiele im Alleingang.',
    eligiblePositions: ['ST', 'ZOM', 'ZM', 'LA', 'RA'],
    boost: {
      bronze: { clutchFactor: 8 },
      silver: { clutchFactor: 15, goalChance: 3 },
      gold: { clutchFactor: 25, goalChance: 6, moraleAura: 3 },
    },
    valueMultiplier: { bronze: 1.07, silver: 1.14, gold: 1.28 },
    baseRarity: { bronze: 0.07, silver: 0.025, gold: 0.004 },
  },
  {
    id: 'consistency_king',
    name: 'Mr. Zuverlässig',
    icon: '📊',
    category: 'mental',
    description: 'Liefert Woche für Woche ab. Keine Schwankungen, nur Klasse.',
    eligiblePositions: ['TW', 'IV', 'LV', 'RV', 'ZDM', 'ZM', 'ZOM', 'LA', 'RA', 'ST'],
    boost: {
      bronze: { consistencyBonus: 0.2, injuryResistance: 3 },
      silver: { consistencyBonus: 0.35, injuryResistance: 6 },
      gold: { consistencyBonus: 0.5, injuryResistance: 10, staminaBoost: 5 },
    },
    valueMultiplier: { bronze: 1.05, silver: 1.10, gold: 1.20 },
    baseRarity: { bronze: 0.10, silver: 0.04, gold: 0.007 },
  },

  // ── PHYSICAL ──
  {
    id: 'iron_man',
    name: 'Eisenmann',
    icon: '💪',
    category: 'physical',
    description: 'Unermüdlich und robust. Spielt 90 Minuten auf Volldampf.',
    eligiblePositions: ['TW', 'IV', 'LV', 'RV', 'ZDM', 'ZM', 'ZOM', 'LA', 'RA', 'ST'],
    boost: {
      bronze: { staminaBoost: 8, injuryResistance: 5 },
      silver: { staminaBoost: 15, injuryResistance: 10 },
      gold: { staminaBoost: 25, injuryResistance: 18, consistencyBonus: 0.15 },
    },
    valueMultiplier: { bronze: 1.04, silver: 1.09, gold: 1.18 },
    baseRarity: { bronze: 0.12, silver: 0.04, gold: 0.008 },
  },
  {
    id: 'power_shot',
    name: 'Kanonenschuss',
    icon: '💥',
    category: 'physical',
    description: 'Brutale Schusskraft. Der Ball fliegt wie eine Kanonenkugel.',
    eligiblePositions: ['ST', 'ZM', 'ZOM', 'ZDM', 'LA', 'RA'],
    boost: {
      bronze: { longShotChance: 5, goalChance: 3 },
      silver: { longShotChance: 10, goalChance: 5, freeKickChance: 5 },
      gold: { longShotChance: 18, goalChance: 8, freeKickChance: 10 },
    },
    valueMultiplier: { bronze: 1.05, silver: 1.10, gold: 1.22 },
    baseRarity: { bronze: 0.09, silver: 0.03, gold: 0.006 },
  },
];

// ── Helpers ──

export function getTraitDefinition(traitId: string): TraitDefinition | undefined {
  return TRAIT_CATALOG.find((t) => t.id === traitId);
}

export function getTraitBoost(traitId: string, tier: TraitTier): TraitBoost | undefined {
  const def = getTraitDefinition(traitId);
  return def?.boost[tier];
}

export const TIER_LABELS: Record<TraitTier, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
};

export const TIER_COLORS: Record<TraitTier, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
};

export const TIER_BG_COLORS: Record<TraitTier, string> = {
  bronze: 'bg-amber-600/20 border-amber-600/40',
  silver: 'bg-gray-300/20 border-gray-300/40',
  gold: 'bg-yellow-400/20 border-yellow-400/40',
};
