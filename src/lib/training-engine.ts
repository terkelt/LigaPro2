/**
 * Training Engine — handles weekly training execution, XP awards, level-ups,
 * boost application/decay, and match XP rewards.
 */
import { Player, PlayerAttributes } from '@/types/player';
import { TrainingType, TrainingBoost, getTrainingDef } from '@/types/training';
import { GameState } from '@/types/game';
import { TRAIT_CATALOG, PlayerTrait, TraitTier } from '@/types/traits';

// ─── XP Constants ───

const BASE_XP_TO_LEVEL = 100;
const XP_SCALING = 1.12; // each level needs 12% more XP

export function xpForLevel(level: number): number {
  return Math.round(BASE_XP_TO_LEVEL * Math.pow(XP_SCALING, level - 1));
}

/** Age multiplier for XP gains: young players learn faster */
function ageMultiplier(age: number): number {
  if (age <= 20) return 1.8;
  if (age <= 23) return 1.4;
  if (age <= 27) return 1.0;
  if (age <= 30) return 0.7;
  if (age <= 33) return 0.5;
  return 0.3;
}

function getPlayerAge(dob: string, refDate?: string): number {
  const ref = new Date(refDate ?? _gameDate ?? '2025-07-01');
  return ref.getFullYear() - new Date(dob).getFullYear();
}

/** Module-level game date, set by applyWeeklyTraining / external callers */
let _gameDate: string | undefined;

/** Set the game date used for age calculations in the training engine */
export function setTrainingGameDate(date: string) { _gameDate = date; }

// ─── Level Up Logic ───

/**
 * Award XP to a player and process any level-ups.
 * On level-up, permanently boost 1-3 random attributes based on potential gap.
 */
export function awardXP(player: Player, rawXP: number): Player {
  const age = getPlayerAge(player.dateOfBirth);
  const xpGain = Math.round(rawXP * ageMultiplier(age));
  let p = { ...player, xp: player.xp + xpGain };

  // Process level-ups
  while (p.xp >= p.xpToNextLevel) {
    p.xp -= p.xpToNextLevel;
    p.level += 1;
    p.xpToNextLevel = xpForLevel(p.level);

    // Determine attribute boosts on level-up
    p = applyLevelUpBoosts(p);
  }

  return p;
}

/** On level-up: boost 1-3 attributes permanently, weighted by potential gap */
function applyLevelUpBoosts(player: Player): Player {
  const attrs = { ...player.attributes };
  const age = getPlayerAge(player.dateOfBirth);

  // How many attributes to boost (1-3, more if young & under potential)
  const currentOverall = quickOverall(attrs);
  const gap = player.potential - currentOverall;
  const boostCount = gap > 15 ? 3 : gap > 5 ? 2 : gap > 0 ? 1 : 0;

  if (boostCount === 0) return { ...player, attributes: attrs };

  // Pick random attributes to boost (field players vs GK)
  const pool = player.position === 'TW'
    ? ['reflexes', 'handling', 'diving', 'kicking', 'oneOnOne', 'composure', 'positioning']
    : getFieldPlayerAttrPool(player.position);

  for (let i = 0; i < boostCount; i++) {
    const attr = pool[Math.floor(Math.random() * pool.length)] as keyof PlayerAttributes;
    const current = attrs[attr];
    // Don't boost beyond 95, and boost amount decreases at higher values
    if (current < 95) {
      const boost = current > 85 ? 1 : current > 70 ? (Math.random() < 0.5 ? 1 : 2) : 2;
      (attrs as Record<string, number>)[attr] = Math.min(99, current + boost);
    }
  }

  // Older players may also lose a random attribute slightly
  if (age >= 31 && Math.random() < 0.4) {
    const physicalAttrs = ['pace', 'acceleration', 'stamina', 'jumping'] as const;
    const decayAttr = physicalAttrs[Math.floor(Math.random() * physicalAttrs.length)];
    (attrs as Record<string, number>)[decayAttr] = Math.max(20, attrs[decayAttr] - 1);
  }

  return { ...player, attributes: attrs };
}

function getFieldPlayerAttrPool(position: string): string[] {
  const base = ['composure', 'workRate', 'stamina'];
  if (['IV', 'LV', 'RV'].includes(position)) {
    return [...base, 'positioning', 'strength', 'heading', 'pace', 'aggression', 'passing'];
  }
  if (['ZDM', 'ZM'].includes(position)) {
    return [...base, 'passing', 'vision', 'positioning', 'ballControl', 'shooting', 'strength'];
  }
  if (position === 'ZOM') {
    return [...base, 'vision', 'passing', 'ballControl', 'dribbling', 'shooting', 'finishing'];
  }
  if (['LA', 'RA'].includes(position)) {
    return [...base, 'pace', 'dribbling', 'crossing', 'acceleration', 'shooting', 'ballControl'];
  }
  // ST
  return [...base, 'finishing', 'shooting', 'heading', 'positioning', 'pace', 'composure'];
}

function quickOverall(a: PlayerAttributes): number {
  const vals = Object.values(a).filter((v) => typeof v === 'number');
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ─── Weekly Training ───

/**
 * Apply the selected weekly training to all players of a team.
 * Returns updated players array and a news summary.
 */
export interface TrainingPlayerSummary {
  playerId: string;
  name: string;
  position: string;
  xpGained: number;
  leveledUp: boolean;
  newLevel?: number;
  boostedAttributes: string[];
  injured: boolean;
  injuryDays?: number;
}

/** Position relevance for each training type (0.0-1.0) — determines boost strength & probability */
const TRAINING_POSITION_RELEVANCE: Record<TrainingType, Record<string, number>> = {
  fitness:    { TW: 0.5, IV: 0.9, LV: 1.0, RV: 1.0, ZDM: 0.9, ZM: 0.8, ZOM: 0.6, LA: 0.9, RA: 0.9, ST: 0.5 },
  technique:  { TW: 0.2, IV: 0.4, LV: 0.5, RV: 0.5, ZDM: 0.6, ZM: 0.9, ZOM: 1.0, LA: 0.9, RA: 0.9, ST: 0.7 },
  tactics:    { TW: 0.5, IV: 0.9, LV: 0.7, RV: 0.7, ZDM: 1.0, ZM: 0.9, ZOM: 0.7, LA: 0.5, RA: 0.5, ST: 0.4 },
  shooting:   { TW: 0.0, IV: 0.2, LV: 0.2, RV: 0.2, ZDM: 0.3, ZM: 0.5, ZOM: 0.8, LA: 0.7, RA: 0.7, ST: 1.0 },
  defense:    { TW: 0.3, IV: 1.0, LV: 0.9, RV: 0.9, ZDM: 0.8, ZM: 0.5, ZOM: 0.2, LA: 0.2, RA: 0.2, ST: 0.1 },
  goalkeeper: { TW: 1.0, IV: 0.0, LV: 0.0, RV: 0.0, ZDM: 0.0, ZM: 0.0, ZOM: 0.0, LA: 0.0, RA: 0.0, ST: 0.0 },
  intensive:  { TW: 0.4, IV: 0.8, LV: 0.9, RV: 0.9, ZDM: 0.8, ZM: 0.8, ZOM: 0.7, LA: 0.9, RA: 0.9, ST: 0.7 },
  recovery:   { TW: 1.0, IV: 1.0, LV: 1.0, RV: 1.0, ZDM: 1.0, ZM: 1.0, ZOM: 1.0, LA: 1.0, RA: 1.0, ST: 1.0 },
};

export function applyWeeklyTraining(
  state: GameState,
  teamId: string,
  trainingType: TrainingType
): { players: Player[]; injuredPlayerNames: string[]; playerSummaries: TrainingPlayerSummary[] } {
  const def = getTrainingDef(trainingType);
  const injuredPlayerNames: string[] = [];
  const playerSummaries: TrainingPlayerSummary[] = [];

  const players = state.players.map((p) => {
    if (p.teamId !== teamId) return p;
    if (p.injury) return p; // injured players don't train

    let updated = { ...p };
    const isGK = p.position === 'TW';
    const boostedAttributes: string[] = [];
    const oldLevel = p.level;

    // Position relevance: determines how much this training type benefits this position
    const relevance = TRAINING_POSITION_RELEVANCE[trainingType]?.[p.position] ?? 0.5;

    // Apply positive effects — position-specific: relevance affects both probability and boost value
    if ((!def.gkOnly || isGK) && relevance > 0) {
      for (const eff of def.positiveEffects) {
        // GK-specific attrs only affect GKs
        const isGKAttr = ['reflexes', 'handling', 'diving', 'kicking', 'oneOnOne'].includes(eff.attribute);
        if (isGKAttr && !isGK) continue;
        if (!isGKAttr && isGK && def.gkOnly) continue;

        // Probability-based: not every player gets every boost
        // High relevance (1.0) = 85% chance, low relevance (0.2) = 17%
        if (Math.random() > relevance * 0.85) continue;

        // Boost value scaled by relevance: full value at 1.0, half at 0.5, etc.
        const scaledValue = Math.max(1, Math.round(eff.value * (0.5 + relevance * 0.5)));

        // Duration: 2-3 weeks (not always 4), slightly longer for high relevance
        const duration = relevance >= 0.8 ? 3 : 2;

        const boost: TrainingBoost = {
          attribute: eff.attribute,
          value: scaledValue,
          weeksRemaining: duration,
        };
        updated.trainingBoosts = [...updated.trainingBoosts, boost];
        if (scaledValue > 0) boostedAttributes.push(eff.attribute);
      }

      // Apply negative effects (always applied but scaled down for low relevance)
      for (const eff of def.negativeEffects) {
        const isGKAttr = ['reflexes', 'handling', 'diving', 'kicking', 'oneOnOne'].includes(eff.attribute);
        if (isGKAttr && !isGK) continue;

        // Negative effects are less likely for highly relevant positions
        if (Math.random() < relevance * 0.3) continue; // 30% skip chance at max relevance

        const boost: TrainingBoost = {
          attribute: eff.attribute,
          value: eff.value, // negative
          weeksRemaining: 2,
        };
        updated.trainingBoosts = [...updated.trainingBoosts, boost];
      }
    }

    // Award XP — scaled by relevance (full relevant position gets full XP, others get 60-100%)
    const xpScale = 0.6 + relevance * 0.4;
    updated = awardXP(updated, Math.round(def.xpReward * xpScale));

    // Condition cost
    updated.condition = Math.max(10, Math.min(100, updated.condition - def.conditionCost));

    // Morale effect
    updated.morale = Math.max(10, Math.min(100, updated.morale + def.moraleEffect));

    // Injury risk (slightly higher for irrelevant training — players doing unfamiliar exercises)
    const adjustedRisk = def.injuryRiskPercent * (1 + (1 - relevance) * 0.3);
    let wasInjured = false;
    let injDays = 0;
    if (adjustedRisk > 0 && Math.random() * 100 < adjustedRisk) {
      const daysOut = Math.floor(Math.random() * 14) + 3;
      updated.injury = {
        type: 'Trainings\u00ADverletzung',
        severity: daysOut > 10 ? 'medium' : 'light',
        daysRemaining: daysOut,
        totalDays: daysOut,
        rehaPhase: 1,
      };
      injuredPlayerNames.push(`${p.firstName} ${p.lastName}`);
      wasInjured = true;
      injDays = daysOut;
    }

    // Track summary
    playerSummaries.push({
      playerId: p.id,
      name: `${p.firstName} ${p.lastName}`,
      position: p.position,
      xpGained: Math.round(def.xpReward * xpScale),
      leveledUp: updated.level > oldLevel,
      newLevel: updated.level > oldLevel ? updated.level : undefined,
      boostedAttributes,
      injured: wasInjured,
      injuryDays: wasInjured ? injDays : undefined,
    });

    return updated;
  });

  return { players, injuredPlayerNames, playerSummaries };
}

// ─── Boost Decay (called weekly) ───

/** Decrement weeksRemaining on all boosts, remove expired ones */
export function decayTrainingBoosts(players: Player[]): Player[] {
  return players.map((p) => {
    if (p.trainingBoosts.length === 0) return p;
    const boosts = p.trainingBoosts
      .map((b) => ({ ...b, weeksRemaining: b.weeksRemaining - 1 }))
      .filter((b) => b.weeksRemaining > 0);
    return { ...p, trainingBoosts: boosts };
  });
}

/** Get effective attribute value including training boosts */
export function getEffectiveAttribute(player: Player, attr: keyof PlayerAttributes): number {
  const base = player.attributes[attr];
  const boostSum = player.trainingBoosts
    .filter((b) => b.attribute === attr)
    .reduce((sum, b) => sum + b.value, 0);
  return Math.max(1, Math.min(99, base + boostSum));
}

// ─── Match XP ───

/** Award XP to players after a match based on performance */
export function awardMatchXP(players: Player[], teamId: string, playerRatings: Record<string, number>): Player[] {
  return players.map((p) => {
    if (p.teamId !== teamId) return p;
    const rating = playerRatings[p.id];
    if (!rating) return p; // didn't play

    // Base: 20 XP for playing, +5 per rating point above 6.0
    const baseXP = 20 + Math.max(0, Math.round((rating - 6.0) * 5));
    return awardXP(p, baseXP);
  });
}

/** Award bonus XP for goals and assists */
export function awardGoalAssistXP(players: Player[], scorerId?: string, assistId?: string): Player[] {
  return players.map((p) => {
    if (p.id === scorerId) return awardXP(p, 10);
    if (p.id === assistId) return awardXP(p, 5);
    return p;
  });
}

// ─── Trait Acquisition ───

/**
 * Attempt to award a new trait on level-up.
 * Chance increases with level: ~5% at level 5, ~12% at level 15, ~20% at level 25+.
 * Can also upgrade an existing bronze→silver or silver→gold.
 */
export function tryAwardTraitOnLevelUp(player: Player, currentDate: string): Player {
  const chance = Math.min(0.25, 0.02 + player.level * 0.008);
  if (Math.random() > chance) return player;

  return rollNewTrait(player, currentDate, 'levelup');
}

/**
 * Check if an exceptional match performance earns a trait.
 * Rating >= 8.5: small chance. Rating >= 9.0: decent chance. 10.0: guaranteed.
 */
export function checkTraitFromPerformance(player: Player, matchRating: number, currentDate: string): Player {
  if (matchRating < 8.5) return player;
  const chance = matchRating >= 10 ? 1.0 : matchRating >= 9.5 ? 0.25 : matchRating >= 9.0 ? 0.12 : 0.05;
  if (Math.random() > chance) return player;

  return rollNewTrait(player, currentDate, 'performance');
}

function rollNewTrait(player: Player, currentDate: string, _source: string): Player {
  const eligible = TRAIT_CATALOG.filter((t) => t.eligiblePositions.includes(player.position));
  if (eligible.length === 0) return player;

  const existingIds = new Set((player.traits ?? []).map((t) => t.traitId));

  // 30% chance to upgrade an existing trait instead of getting a new one
  const existingUpgradeable = (player.traits ?? []).filter((t) => t.tier !== 'gold');
  if (existingUpgradeable.length > 0 && Math.random() < 0.30) {
    const toUpgrade = existingUpgradeable[Math.floor(Math.random() * existingUpgradeable.length)];
    const newTier: TraitTier = toUpgrade.tier === 'bronze' ? 'silver' : 'gold';
    const newTraits = (player.traits ?? []).map((t) =>
      t.traitId === toUpgrade.traitId ? { ...t, tier: newTier, acquiredDate: currentDate } : t
    );
    return { ...player, traits: newTraits };
  }

  // Pick a new trait the player doesn't have yet
  const available = eligible.filter((t) => !existingIds.has(t.id));
  if (available.length === 0) return player; // already has all eligible traits

  // Max 4 traits per player
  if ((player.traits ?? []).length >= 4) return player;

  const trait = available[Math.floor(Math.random() * available.length)];

  // Tier roll: mostly bronze, occasionally silver
  const tierRoll = Math.random();
  const tier: TraitTier = tierRoll < 0.05 ? 'gold' : tierRoll < 0.25 ? 'silver' : 'bronze';

  const newTrait: PlayerTrait = { traitId: trait.id, tier, acquiredDate: currentDate };
  return { ...player, traits: [...(player.traits ?? []), newTrait] };
}
