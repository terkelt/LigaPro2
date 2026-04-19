export type FormationType =
  | '4-4-2'
  | '4-4-2-diamond'
  | '4-3-3'
  | '4-2-3-1'
  | '4-1-4-1'
  | '3-5-2'
  | '3-4-3'
  | '5-3-2'
  | '5-4-1'
  | '4-3-2-1'
  | '4-1-2-1-2';

export type Mentality = 'ultra-defensive' | 'defensive' | 'balanced' | 'offensive' | 'ultra-offensive';
export type PressingIntensity = 'low' | 'medium' | 'high' | 'gegenpressing';
export type Tempo = 'slow' | 'normal' | 'fast';
export type PassingStyle = 'short' | 'mixed' | 'long' | 'direct';
export type Width = 'narrow' | 'normal' | 'wide';
export type DefensiveLine = 'deep' | 'normal' | 'high';

export type EffortLevel = 'conserve' | 'normal' | 'intense' | 'all_out';
export type WingPlay = 'balanced' | 'left' | 'right' | 'both';
export type MarkingStyle = 'zonal' | 'man_marking';
export type BuildupPlay = 'patient' | 'balanced' | 'quick_counter';
export type TimeWasting = 'never' | 'when_leading' | 'always';

export type PlayerRole =
  | 'spielmacher'
  | 'box_to_box'
  | 'fluegel_flitzer'
  | 'abraeumer'
  | 'zielspieler'
  | 'false_nine'
  | 'libero'
  | 'mauer'
  | 'standard';

export interface PlayerInstruction {
  playerId: string;
  role: PlayerRole;
  movement: 'stay' | 'roam';
  attackingRuns: boolean;
  markPlayerId?: string;
}

export interface AutoLineupRules {
  prioritizeFitness: boolean;
  prioritizeForm: boolean;
  preferYouth: boolean;
  preferExperience: boolean;
  avoidLowMorale: boolean;
  captainId?: string;
  excludeIds: string[];
  minCondition: number;
}

export const DEFAULT_AUTO_LINEUP_RULES: AutoLineupRules = {
  prioritizeFitness: true,
  prioritizeForm: false,
  preferYouth: false,
  preferExperience: false,
  avoidLowMorale: true,
  excludeIds: [],
  minCondition: 50,
};

export interface Tactics {
  name: string;
  formation: FormationType;
  mentality: Mentality;
  pressingIntensity: PressingIntensity;
  tempo: Tempo;
  passingStyle: PassingStyle;
  width: Width;
  defensiveLine: DefensiveLine;
  offsideTrap: boolean;
  effortLevel: EffortLevel;
  wingPlay: WingPlay;
  markingStyle: MarkingStyle;
  buildupPlay: BuildupPlay;
  timeWasting: TimeWasting;
  setPieceTaker: {
    corners: string;
    freeKicks: string;
    penalties: string;
  };
  captain: string;
  lineup: string[];           // 11 Player IDs in formation order
  substitutes: string[];      // Player IDs on bench
  playerInstructions: PlayerInstruction[];
  autoLineupRules?: AutoLineupRules;
}

export interface FormationPosition {
  label: string;
  x: number;   // 0-100 percentage on pitch
  y: number;   // 0-100 percentage on pitch
  preferredPositions: string[];
}

export const FORMATION_POSITIONS: Record<FormationType, FormationPosition[]> = {
  '4-4-2': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 15, y: 75, preferredPositions: ['LV'] },
    { label: 'IV', x: 38, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 62, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 85, y: 75, preferredPositions: ['RV'] },
    { label: 'LM', x: 15, y: 50, preferredPositions: ['LA', 'ZM'] },
    { label: 'ZM', x: 38, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZM', x: 62, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'RM', x: 85, y: 50, preferredPositions: ['RA', 'ZM'] },
    { label: 'ST', x: 38, y: 22, preferredPositions: ['ST'] },
    { label: 'ST', x: 62, y: 22, preferredPositions: ['ST'] },
  ],
  '4-4-2-diamond': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 15, y: 75, preferredPositions: ['LV'] },
    { label: 'IV', x: 38, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 62, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 85, y: 75, preferredPositions: ['RV'] },
    { label: 'ZDM', x: 50, y: 60, preferredPositions: ['ZDM', 'ZM'] },
    { label: 'LM', x: 30, y: 48, preferredPositions: ['ZM', 'LA'] },
    { label: 'RM', x: 70, y: 48, preferredPositions: ['ZM', 'RA'] },
    { label: 'ZOM', x: 50, y: 36, preferredPositions: ['ZOM', 'ZM'] },
    { label: 'ST', x: 38, y: 20, preferredPositions: ['ST'] },
    { label: 'ST', x: 62, y: 20, preferredPositions: ['ST'] },
  ],
  '4-3-3': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 15, y: 75, preferredPositions: ['LV'] },
    { label: 'IV', x: 38, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 62, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 85, y: 75, preferredPositions: ['RV'] },
    { label: 'ZM', x: 30, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZM', x: 50, y: 48, preferredPositions: ['ZM'] },
    { label: 'ZM', x: 70, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'LA', x: 20, y: 25, preferredPositions: ['LA', 'ST'] },
    { label: 'ST', x: 50, y: 20, preferredPositions: ['ST'] },
    { label: 'RA', x: 80, y: 25, preferredPositions: ['RA', 'ST'] },
  ],
  '4-2-3-1': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 15, y: 75, preferredPositions: ['LV'] },
    { label: 'IV', x: 38, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 62, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 85, y: 75, preferredPositions: ['RV'] },
    { label: 'ZDM', x: 38, y: 58, preferredPositions: ['ZDM', 'ZM'] },
    { label: 'ZDM', x: 62, y: 58, preferredPositions: ['ZDM', 'ZM'] },
    { label: 'LA', x: 18, y: 38, preferredPositions: ['LA', 'ZOM'] },
    { label: 'ZOM', x: 50, y: 35, preferredPositions: ['ZOM', 'ZM'] },
    { label: 'RA', x: 82, y: 38, preferredPositions: ['RA', 'ZOM'] },
    { label: 'ST', x: 50, y: 18, preferredPositions: ['ST'] },
  ],
  '4-1-4-1': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 15, y: 75, preferredPositions: ['LV'] },
    { label: 'IV', x: 38, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 62, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 85, y: 75, preferredPositions: ['RV'] },
    { label: 'ZDM', x: 50, y: 62, preferredPositions: ['ZDM'] },
    { label: 'LM', x: 15, y: 45, preferredPositions: ['LA', 'ZM'] },
    { label: 'ZM', x: 38, y: 48, preferredPositions: ['ZM'] },
    { label: 'ZM', x: 62, y: 48, preferredPositions: ['ZM'] },
    { label: 'RM', x: 85, y: 45, preferredPositions: ['RA', 'ZM'] },
    { label: 'ST', x: 50, y: 20, preferredPositions: ['ST'] },
  ],
  '3-5-2': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'IV', x: 25, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 50, y: 80, preferredPositions: ['IV'] },
    { label: 'IV', x: 75, y: 78, preferredPositions: ['IV'] },
    { label: 'LM', x: 10, y: 50, preferredPositions: ['LV', 'LA'] },
    { label: 'ZM', x: 35, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZM', x: 50, y: 48, preferredPositions: ['ZM'] },
    { label: 'ZM', x: 65, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'RM', x: 90, y: 50, preferredPositions: ['RV', 'RA'] },
    { label: 'ST', x: 38, y: 22, preferredPositions: ['ST'] },
    { label: 'ST', x: 62, y: 22, preferredPositions: ['ST'] },
  ],
  '3-4-3': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'IV', x: 25, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 50, y: 80, preferredPositions: ['IV'] },
    { label: 'IV', x: 75, y: 78, preferredPositions: ['IV'] },
    { label: 'LM', x: 15, y: 52, preferredPositions: ['LV', 'LA'] },
    { label: 'ZM', x: 38, y: 55, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZM', x: 62, y: 55, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'RM', x: 85, y: 52, preferredPositions: ['RV', 'RA'] },
    { label: 'LA', x: 20, y: 25, preferredPositions: ['LA', 'ST'] },
    { label: 'ST', x: 50, y: 20, preferredPositions: ['ST'] },
    { label: 'RA', x: 80, y: 25, preferredPositions: ['RA', 'ST'] },
  ],
  '5-3-2': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 10, y: 70, preferredPositions: ['LV'] },
    { label: 'IV', x: 30, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 50, y: 80, preferredPositions: ['IV'] },
    { label: 'IV', x: 70, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 90, y: 70, preferredPositions: ['RV'] },
    { label: 'ZM', x: 30, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZM', x: 50, y: 48, preferredPositions: ['ZM'] },
    { label: 'ZM', x: 70, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ST', x: 38, y: 22, preferredPositions: ['ST'] },
    { label: 'ST', x: 62, y: 22, preferredPositions: ['ST'] },
  ],
  '5-4-1': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 10, y: 70, preferredPositions: ['LV'] },
    { label: 'IV', x: 30, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 50, y: 80, preferredPositions: ['IV'] },
    { label: 'IV', x: 70, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 90, y: 70, preferredPositions: ['RV'] },
    { label: 'LM', x: 15, y: 48, preferredPositions: ['LA', 'ZM'] },
    { label: 'ZM', x: 38, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZM', x: 62, y: 52, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'RM', x: 85, y: 48, preferredPositions: ['RA', 'ZM'] },
    { label: 'ST', x: 50, y: 20, preferredPositions: ['ST'] },
  ],
  '4-3-2-1': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 15, y: 75, preferredPositions: ['LV'] },
    { label: 'IV', x: 38, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 62, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 85, y: 75, preferredPositions: ['RV'] },
    { label: 'ZM', x: 30, y: 55, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZM', x: 50, y: 52, preferredPositions: ['ZM'] },
    { label: 'ZM', x: 70, y: 55, preferredPositions: ['ZM', 'ZDM'] },
    { label: 'ZOM', x: 35, y: 35, preferredPositions: ['ZOM', 'LA'] },
    { label: 'ZOM', x: 65, y: 35, preferredPositions: ['ZOM', 'RA'] },
    { label: 'ST', x: 50, y: 18, preferredPositions: ['ST'] },
  ],
  '4-1-2-1-2': [
    { label: 'TW', x: 50, y: 95, preferredPositions: ['TW'] },
    { label: 'LV', x: 15, y: 75, preferredPositions: ['LV'] },
    { label: 'IV', x: 38, y: 78, preferredPositions: ['IV'] },
    { label: 'IV', x: 62, y: 78, preferredPositions: ['IV'] },
    { label: 'RV', x: 85, y: 75, preferredPositions: ['RV'] },
    { label: 'ZDM', x: 50, y: 62, preferredPositions: ['ZDM'] },
    { label: 'ZM', x: 30, y: 48, preferredPositions: ['ZM'] },
    { label: 'ZM', x: 70, y: 48, preferredPositions: ['ZM'] },
    { label: 'ZOM', x: 50, y: 35, preferredPositions: ['ZOM'] },
    { label: 'ST', x: 38, y: 20, preferredPositions: ['ST'] },
    { label: 'ST', x: 62, y: 20, preferredPositions: ['ST'] },
  ],
};

// ════════════════════════════════════════════════════════
//  Position Compatibility System
//  Maps (playerPosition, slotLabel) → effectiveness 0.0-1.0
//  1.0 = perfect fit, 0.25 = practically useless
// ════════════════════════════════════════════════════════

import { Position } from './player';

/**
 * Slot labels used in formations. Some slots (LM, RM) don't map 1:1 to player positions.
 */
export type SlotLabel = 'TW' | 'IV' | 'LV' | 'RV' | 'ZDM' | 'ZM' | 'ZOM' | 'LA' | 'RA' | 'ST' | 'LM' | 'RM';

/**
 * Position compatibility matrix.
 * Key: playerPosition → slotLabel → effectiveness (0.0 – 1.0)
 *
 * Design principles:
 * - Same position = 1.0
 * - Same zone, adjacent role = 0.85-0.95
 * - One zone away, related role = 0.60-0.80
 * - Two zones away = 0.30-0.50
 * - Completely unrelated = 0.25
 * - GK ↔ outfield = 0.20
 */
const COMPAT: Record<Position, Record<SlotLabel, number>> = {
  TW: { TW: 1.0,  IV: 0.20, LV: 0.20, RV: 0.20, ZDM: 0.20, ZM: 0.20, ZOM: 0.20, LA: 0.20, RA: 0.20, ST: 0.20, LM: 0.20, RM: 0.20 },

  IV: { TW: 0.20, IV: 1.0,  LV: 0.70, RV: 0.70, ZDM: 0.75, ZM: 0.50, ZOM: 0.30, LA: 0.25, RA: 0.25, ST: 0.25, LM: 0.35, RM: 0.35 },
  LV: { TW: 0.20, IV: 0.65, LV: 1.0,  RV: 0.80, ZDM: 0.55, ZM: 0.55, ZOM: 0.35, LA: 0.70, RA: 0.40, ST: 0.25, LM: 0.80, RM: 0.45 },
  RV: { TW: 0.20, IV: 0.65, LV: 0.80, RV: 1.0,  ZDM: 0.55, ZM: 0.55, ZOM: 0.35, LA: 0.40, RA: 0.70, ST: 0.25, LM: 0.45, RM: 0.80 },

  ZDM:{ TW: 0.20, IV: 0.70, LV: 0.50, RV: 0.50, ZDM: 1.0,  ZM: 0.90, ZOM: 0.60, LA: 0.40, RA: 0.40, ST: 0.30, LM: 0.55, RM: 0.55 },
  ZM: { TW: 0.20, IV: 0.45, LV: 0.45, RV: 0.45, ZDM: 0.85, ZM: 1.0,  ZOM: 0.85, LA: 0.60, RA: 0.60, ST: 0.45, LM: 0.70, RM: 0.70 },
  ZOM:{ TW: 0.20, IV: 0.25, LV: 0.30, RV: 0.30, ZDM: 0.50, ZM: 0.85, ZOM: 1.0,  LA: 0.80, RA: 0.80, ST: 0.75, LM: 0.65, RM: 0.65 },

  LA: { TW: 0.20, IV: 0.25, LV: 0.50, RV: 0.30, ZDM: 0.30, ZM: 0.55, ZOM: 0.75, LA: 1.0,  RA: 0.85, ST: 0.80, LM: 0.85, RM: 0.55 },
  RA: { TW: 0.20, IV: 0.25, LV: 0.30, RV: 0.50, ZDM: 0.30, ZM: 0.55, ZOM: 0.75, LA: 0.85, RA: 1.0,  ST: 0.80, LM: 0.55, RM: 0.85 },
  ST: { TW: 0.20, IV: 0.25, LV: 0.25, RV: 0.25, ZDM: 0.30, ZM: 0.45, ZOM: 0.70, LA: 0.75, RA: 0.75, ST: 1.0,  LM: 0.45, RM: 0.45 },
};

/**
 * Get effectiveness multiplier for a player at a given formation slot.
 * Returns 0.0-1.0 where 1.0 = perfect position match.
 */
export function getPositionCompatibility(playerPosition: Position, slotLabel: string): number {
  const slot = slotLabel as SlotLabel;
  return COMPAT[playerPosition]?.[slot] ?? 0.40;
}

/**
 * Get a human-readable rating of how well a player fits a slot.
 */
export function getPositionFitLabel(compat: number): { label: string; color: string; icon: string } {
  if (compat >= 0.95) return { label: 'Stammposition', color: 'text-green-400', icon: '✓' };
  if (compat >= 0.80) return { label: 'Gut geeignet', color: 'text-emerald-400', icon: '○' };
  if (compat >= 0.65) return { label: 'Einsetzbar', color: 'text-yellow-400', icon: '△' };
  if (compat >= 0.50) return { label: 'Notlösung', color: 'text-orange-400', icon: '▽' };
  if (compat >= 0.30) return { label: 'Fehl am Platz', color: 'text-red-400', icon: '✗' };
  return { label: 'Unspielbar', color: 'text-red-500', icon: '✗✗' };
}

/**
 * Calculates the effective overall rating of a player when playing out of position.
 * The penalty is: effectiveOvr = baseOvr * (0.4 + 0.6 * compat)
 * At compat=1.0 → 100% strength, at compat=0.25 → 55% strength
 */
export function calcEffectiveOverall(baseOverall: number, compat: number): number {
  return Math.round(baseOverall * (0.4 + 0.6 * compat));
}

export const FORMATION_LABELS: Record<FormationType, string> = {
  '4-4-2': '4-4-2',
  '4-4-2-diamond': '4-4-2 Raute',
  '4-3-3': '4-3-3',
  '4-2-3-1': '4-2-3-1',
  '4-1-4-1': '4-1-4-1',
  '3-5-2': '3-5-2',
  '3-4-3': '3-4-3',
  '5-3-2': '5-3-2',
  '5-4-1': '5-4-1',
  '4-3-2-1': '4-3-2-1',
  '4-1-2-1-2': '4-1-2-1-2',
};
