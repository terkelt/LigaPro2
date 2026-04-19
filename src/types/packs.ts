/**
 * Pack Reward System — Types
 * 
 * Packs are earned through gameplay (never purchased).
 * Each pack contains random rewards with rarity tiers.
 */

export type PackType = 'weekly' | 'matchday' | 'milestone' | 'season' | 'cup';

export type PackRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export type RewardType =
  | 'budget'           // Direct budget injection
  | 'morale_all'       // Morale boost for all players
  | 'manager_xp'       // Manager XP
  | 'condition_all'    // Condition boost for all players
  | 'form_boost'       // Form boost for 1 player
  | 'training_double'  // Double training XP for 1 week
  | 'scout_report'     // Free scout report
  | 'youth_quality'    // Next youth player guaranteed high quality
  | 'tactic_boost'     // Next match team strength bonus
  | 'contract_extend'  // Auto-extend best player contract
  | 'player_trait'     // Random bronze trait for a player
  | 'stadium_speed'    // Current stadium upgrade finishes instantly
  | 'sponsor_premium'  // Premium sponsor offer appears
  | 'match_practice'   // Match practice boost for all
  | 'injury_heal'      // Heal one injured player instantly
  | 'reputation';      // Reputation boost

export interface PackReward {
  id: string;
  type: RewardType;
  rarity: PackRarity;
  title: string;
  description: string;
  icon: string;
  /** Numeric value for the reward (e.g. budget amount, XP amount, % boost) */
  value: number;
  /** Whether this reward has been applied to the game state */
  isApplied: boolean;
}

export interface Pack {
  id: string;
  type: PackType;
  title: string;
  description: string;
  icon: string;
  /** Number of items in this pack */
  itemCount: number;
  /** The rewards contained (populated when opened) */
  rewards: PackReward[];
  /** Whether the pack has been opened */
  isOpened: boolean;
  /** Date the pack was earned */
  earnedDate: string;
  /** Reason why the pack was earned */
  reason: string;
}

export const PACK_TYPE_INFO: Record<PackType, { title: string; icon: string; color: string; bgClass: string }> = {
  weekly: {
    title: 'Wochenpack',
    icon: '📦',
    color: 'text-blue-400',
    bgClass: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  },
  matchday: {
    title: 'Spieltagspack',
    icon: '⚽',
    color: 'text-green-400',
    bgClass: 'from-green-500/20 to-green-600/10 border-green-500/30',
  },
  milestone: {
    title: 'Meilenstein-Pack',
    icon: '🏆',
    color: 'text-amber-400',
    bgClass: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  },
  season: {
    title: 'Saisonpack',
    icon: '🌟',
    color: 'text-purple-400',
    bgClass: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  },
  cup: {
    title: 'Pokalpack',
    icon: '🏅',
    color: 'text-red-400',
    bgClass: 'from-red-500/20 to-red-600/10 border-red-500/30',
  },
};

// ── Collectible Card System ──

/** Number of days before a card expires, per reward type */
export const CARD_EXPIRY_DAYS: Record<RewardType, number> = {
  budget: 14,
  morale_all: 7,
  condition_all: 7,
  match_practice: 7,
  form_boost: 7,
  training_double: 14,
  tactic_boost: 3,
  injury_heal: 21,
  contract_extend: 30,
  scout_report: 30,
  youth_quality: 60,
  player_trait: 30,
  stadium_speed: 14,
  sponsor_premium: 21,
  reputation: 14,
  manager_xp: 0, // 0 = never expires
};

export interface CollectibleCard {
  id: string;
  type: RewardType;
  rarity: PackRarity;
  title: string;
  description: string;
  icon: string;
  value: number;
  earnedDate: string;
  expiresDate: string | null; // null = never expires
  isUsed: boolean;
  isExpired: boolean;
  packType: PackType; // which pack it came from
}

export const RARITY_INFO: Record<PackRarity, { label: string; color: string; glowClass: string; chance: number }> = {
  common:   { label: 'Gewöhnlich', color: 'text-gray-400',   glowClass: 'shadow-gray-500/20',   chance: 0.60 },
  uncommon: { label: 'Ungewöhnlich', color: 'text-green-400', glowClass: 'shadow-green-500/30',  chance: 0.25 },
  rare:     { label: 'Selten',     color: 'text-blue-400',   glowClass: 'shadow-blue-500/40',   chance: 0.12 },
  epic:     { label: 'Episch',     color: 'text-purple-400', glowClass: 'shadow-purple-500/50',  chance: 0.03 },
};
