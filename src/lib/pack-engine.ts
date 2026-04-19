/**
 * Pack Engine — generates, opens, and applies pack rewards.
 *
 * Packs are earned through gameplay milestones:
 *  - Weekly (every Sunday)
 *  - Matchday (after league wins)
 *  - Milestone (achievement unlocks)
 *  - Season (end of season, quality based on position)
 *  - Cup (after advancing in cup)
 */

import { GameState } from '@/types/game';
import { Pack, PackReward, PackType, PackRarity, RewardType, RARITY_INFO, CollectibleCard, CARD_EXPIRY_DAYS } from '@/types/packs';

// ── Helpers ──

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) / 4294967296);
  };
}

// ── Loot Tables ──

interface LootEntry {
  type: RewardType;
  rarity: PackRarity;
  title: string;
  description: string;
  icon: string;
  minValue: number;
  maxValue: number;
  weight: number; // relative weight within same rarity
}

const LOOT_TABLE: LootEntry[] = [
  // ── COMMON (60%) ──
  { type: 'budget', rarity: 'common', title: 'Budgetspritze', description: '+{value} € Transferbudget', icon: '💰', minValue: 30_000, maxValue: 80_000, weight: 25 },
  { type: 'morale_all', rarity: 'common', title: 'Teamgeist', description: '+{value} Moral für alle Spieler', icon: '😊', minValue: 3, maxValue: 6, weight: 20 },
  { type: 'manager_xp', rarity: 'common', title: 'Erfahrungsschub', description: '+{value} Manager-XP', icon: '📈', minValue: 15, maxValue: 30, weight: 20 },
  { type: 'condition_all', rarity: 'common', title: 'Fitness-Boost', description: '+{value} Kondition für alle', icon: '💪', minValue: 5, maxValue: 10, weight: 20 },
  { type: 'match_practice', rarity: 'common', title: 'Spielpraxis', description: '+{value} Spielpraxis für alle', icon: '🏟️', minValue: 5, maxValue: 10, weight: 15 },

  // ── UNCOMMON (25%) ──
  { type: 'budget', rarity: 'uncommon', title: 'Geldkoffer', description: '+{value} € Transferbudget', icon: '💵', minValue: 150_000, maxValue: 350_000, weight: 20 },
  { type: 'training_double', rarity: 'uncommon', title: 'Doppel-Training', description: 'Nächstes Training: doppelter XP-Ertrag', icon: '🏋️', minValue: 1, maxValue: 1, weight: 20 },
  { type: 'scout_report', rarity: 'uncommon', title: 'Scout-Bericht', description: 'Kostenloser Premium-Scout-Report', icon: '🔍', minValue: 1, maxValue: 1, weight: 15 },
  { type: 'form_boost', rarity: 'uncommon', title: 'Formhoch', description: '+{value} Form für deinen besten Spieler', icon: '🔥', minValue: 12, maxValue: 18, weight: 20 },
  { type: 'injury_heal', rarity: 'uncommon', title: 'Wunderheilung', description: 'Ein verletzter Spieler ist sofort fit', icon: '🏥', minValue: 1, maxValue: 1, weight: 15 },
  { type: 'reputation', rarity: 'uncommon', title: 'Medienpräsenz', description: '+{value} Vereinsreputation', icon: '📺', minValue: 2, maxValue: 4, weight: 10 },

  // ── RARE (12%) ──
  { type: 'budget', rarity: 'rare', title: 'Sponsorenbonus', description: '+{value} € Transferbudget', icon: '🤑', minValue: 400_000, maxValue: 800_000, weight: 20 },
  { type: 'tactic_boost', rarity: 'rare', title: 'Taktik-Genie', description: '+{value}% Teamstärke im nächsten Spiel', icon: '🧠', minValue: 4, maxValue: 7, weight: 20 },
  { type: 'youth_quality', rarity: 'rare', title: 'Talent-Garantie', description: 'Nächstes Jugendtalent: min. OVR {value}', icon: '🌱', minValue: 62, maxValue: 68, weight: 15 },
  { type: 'contract_extend', rarity: 'rare', title: 'Vertragsverlängerung', description: 'Bester Spieler verlängert automatisch um {value} Jahr(e)', icon: '📝', minValue: 1, maxValue: 2, weight: 15 },
  { type: 'morale_all', rarity: 'rare', title: 'Euphorie', description: '+{value} Moral für alle Spieler', icon: '🎉', minValue: 10, maxValue: 15, weight: 15 },
  { type: 'manager_xp', rarity: 'rare', title: 'Meisterkurs', description: '+{value} Manager-XP', icon: '🎓', minValue: 60, maxValue: 100, weight: 15 },

  // ── EPIC (3%) ──
  { type: 'budget', rarity: 'epic', title: 'Jackpot', description: '+{value} € Transferbudget', icon: '💎', minValue: 1_500_000, maxValue: 3_000_000, weight: 25 },
  { type: 'player_trait', rarity: 'epic', title: 'Spezialeigenschaft', description: 'Zufälliger Bronze-Trait für einen Spieler', icon: '⭐', minValue: 1, maxValue: 1, weight: 25 },
  { type: 'stadium_speed', rarity: 'epic', title: 'Turbo-Bau', description: 'Aktuelles Stadion-Upgrade sofort fertig', icon: '🏗️', minValue: 1, maxValue: 1, weight: 15 },
  { type: 'sponsor_premium', rarity: 'epic', title: 'Premium-Sponsor', description: 'Exklusives Sponsoren-Angebot erscheint', icon: '🤝', minValue: 1, maxValue: 1, weight: 15 },
  { type: 'reputation', rarity: 'epic', title: 'Weltruhm', description: '+{value} Vereinsreputation', icon: '🌟', minValue: 6, maxValue: 10, weight: 20 },
];

// ── Pack Generation ──

function rollRarity(rng: () => number, guaranteedMinRarity?: PackRarity): PackRarity {
  const roll = rng();
  const rarityOrder: PackRarity[] = ['common', 'uncommon', 'rare', 'epic'];
  const minIdx = guaranteedMinRarity ? rarityOrder.indexOf(guaranteedMinRarity) : 0;

  let result: PackRarity;
  if (roll < RARITY_INFO.epic.chance) result = 'epic';
  else if (roll < RARITY_INFO.epic.chance + RARITY_INFO.rare.chance) result = 'rare';
  else if (roll < RARITY_INFO.epic.chance + RARITY_INFO.rare.chance + RARITY_INFO.uncommon.chance) result = 'uncommon';
  else result = 'common';

  const resultIdx = rarityOrder.indexOf(result);
  return resultIdx >= minIdx ? result : rarityOrder[minIdx];
}

function rollReward(rng: () => number, rarity: PackRarity): PackReward {
  const pool = LOOT_TABLE.filter(e => e.rarity === rarity);
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * totalWeight;
  let entry = pool[pool.length - 1];
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) { entry = e; break; }
  }

  const value = entry.minValue === entry.maxValue
    ? entry.minValue
    : Math.round(entry.minValue + rng() * (entry.maxValue - entry.minValue));

  // Round budget values nicely
  const roundedValue = entry.type === 'budget'
    ? (value >= 1_000_000 ? Math.round(value / 100_000) * 100_000 : Math.round(value / 10_000) * 10_000)
    : value;

  return {
    id: generateId(),
    type: entry.type,
    rarity,
    title: entry.title,
    description: entry.description.replace('{value}', roundedValue.toLocaleString('de-DE')),
    icon: entry.icon,
    value: roundedValue,
    isApplied: false,
  };
}

function generatePackRewards(
  type: PackType,
  itemCount: number,
  rng: () => number,
  guaranteedMinRarity?: PackRarity,
): PackReward[] {
  const rewards: PackReward[] = [];
  for (let i = 0; i < itemCount; i++) {
    // Last item gets the guaranteed minimum rarity (if any)
    const minRarity = (i === itemCount - 1 && guaranteedMinRarity) ? guaranteedMinRarity : undefined;
    const rarity = rollRarity(rng, minRarity);
    rewards.push(rollReward(rng, rarity));
  }
  return rewards;
}

// ── Public API: Create Packs ──

export function createWeeklyPack(date: string): Pack {
  const rng = seededRandom(`weekly-${date}`);
  return {
    id: generateId(),
    type: 'weekly',
    title: 'Wochenpack',
    description: 'Deine wöchentliche Belohnung für deine Arbeit als Manager.',
    icon: '📦',
    itemCount: 3,
    rewards: generatePackRewards('weekly', 3, rng),
    isOpened: false,
    earnedDate: date,
    reason: 'Wöchentliche Belohnung',
  };
}

export function createMatchdayPack(date: string, goalDiff: number): Pack {
  const rng = seededRandom(`matchday-${date}-${goalDiff}`);
  // More items for bigger wins
  const items = goalDiff >= 4 ? 4 : goalDiff >= 2 ? 3 : 2;
  const minRarity: PackRarity | undefined = goalDiff >= 4 ? 'uncommon' : undefined;
  return {
    id: generateId(),
    type: 'matchday',
    title: 'Spieltagspack',
    description: goalDiff >= 4 ? 'Kantersieg! Extra-Belohnung!' : 'Sieg-Belohnung nach dem Spiel.',
    icon: '⚽',
    itemCount: items,
    rewards: generatePackRewards('matchday', items, rng, minRarity),
    isOpened: false,
    earnedDate: date,
    reason: goalDiff >= 4 ? `Kantersieg (+${goalDiff} Tordifferenz)` : 'Liga-Sieg',
  };
}

export function createMilestonePack(date: string, achievementName: string): Pack {
  const rng = seededRandom(`milestone-${date}-${achievementName}`);
  return {
    id: generateId(),
    type: 'milestone',
    title: 'Meilenstein-Pack',
    description: `Belohnung für: ${achievementName}`,
    icon: '🏆',
    itemCount: 4,
    rewards: generatePackRewards('milestone', 4, rng, 'rare'),
    isOpened: false,
    earnedDate: date,
    reason: `Achievement: ${achievementName}`,
  };
}

export function createSeasonPack(date: string, position: number, tier: number): Pack {
  const rng = seededRandom(`season-${date}-${position}`);
  // Better packs for higher finishes
  const items = position <= 1 ? 6 : position <= 3 ? 5 : position <= 6 ? 5 : 4;
  const minRarity: PackRarity = position <= 1 ? 'epic' : position <= 3 ? 'rare' : position <= 10 ? 'uncommon' : 'common';
  return {
    id: generateId(),
    type: 'season',
    title: 'Saisonpack',
    description: `Saisonabschluss: Platz ${position} (${tier === 1 ? 'Bundesliga' : tier === 2 ? '2. Liga' : '3. Liga'})`,
    icon: '🌟',
    itemCount: items,
    rewards: generatePackRewards('season', items, rng, minRarity),
    isOpened: false,
    earnedDate: date,
    reason: `Saison beendet: Platz ${position}`,
  };
}

export function createCupPack(date: string, roundName: string): Pack {
  const rng = seededRandom(`cup-${date}-${roundName}`);
  return {
    id: generateId(),
    type: 'cup',
    title: 'Pokalpack',
    description: `Belohnung für das Weiterkommen: ${roundName}`,
    icon: '🏅',
    itemCount: 3,
    rewards: generatePackRewards('cup', 3, rng, 'uncommon'),
    isOpened: false,
    earnedDate: date,
    reason: `Pokal: ${roundName} überstanden`,
  };
}

// ── Convert Pack Rewards → Collectible Cards ──

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function packRewardsToCards(rewards: PackReward[], packType: PackType, earnedDate: string): CollectibleCard[] {
  return rewards.map(r => {
    const expiryDays = CARD_EXPIRY_DAYS[r.type];
    return {
      id: generateId(),
      type: r.type,
      rarity: r.rarity,
      title: r.title,
      description: r.description,
      icon: r.icon,
      value: r.value,
      earnedDate,
      expiresDate: expiryDays > 0 ? addDays(earnedDate, expiryDays) : null,
      isUsed: false,
      isExpired: false,
      packType,
    };
  });
}

// ── Expire Cards (call daily in day-advance) ──

export function expireCards(state: GameState): GameState {
  const cards = state.cardInventory ?? [];
  if (cards.length === 0) return state;

  const today = state.currentDate;
  let changed = false;
  const updated = cards.map(c => {
    if (c.isUsed || c.isExpired) return c;
    if (c.expiresDate && c.expiresDate <= today) {
      changed = true;
      return { ...c, isExpired: true };
    }
    return c;
  });

  return changed ? { ...state, cardInventory: updated } : state;
}

// ── Redeem a single card ──

export function redeemCard(state: GameState, cardId: string): GameState {
  const cards = state.cardInventory ?? [];
  const cardIdx = cards.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return state;

  const card = cards[cardIdx];
  if (card.isUsed || card.isExpired) return state;

  // Apply the card effect (reuses same logic as applyPackRewards)
  let result = { ...state };
  const teamId = state.currentTeamId;

  switch (card.type) {
    case 'budget': {
      const fin = result.finances[teamId];
      if (fin) {
        result = {
          ...result,
          finances: {
            ...result.finances,
            [teamId]: { ...fin, balance: fin.balance + card.value, transferBudget: fin.transferBudget + card.value },
          },
        };
      }
      break;
    }
    case 'morale_all': {
      result = {
        ...result,
        players: result.players.map(p =>
          p.teamId === teamId ? { ...p, morale: Math.min(100, p.morale + card.value) } : p
        ),
      };
      break;
    }
    case 'manager_xp': {
      let mgr = { ...result.manager };
      mgr.xp = (mgr.xp ?? 0) + card.value;
      while (mgr.xp >= mgr.xpToNextLevel) {
        mgr.xp -= mgr.xpToNextLevel;
        mgr.level += 1;
        mgr.xpToNextLevel = Math.round(mgr.xpToNextLevel * 1.2);
      }
      result = { ...result, manager: mgr };
      break;
    }
    case 'condition_all': {
      result = {
        ...result,
        players: result.players.map(p =>
          p.teamId === teamId ? { ...p, condition: Math.min(100, p.condition + card.value) } : p
        ),
      };
      break;
    }
    case 'match_practice': {
      result = {
        ...result,
        players: result.players.map(p =>
          p.teamId === teamId ? { ...p, matchPractice: Math.min(100, (p.matchPractice ?? 50) + card.value) } : p
        ),
      };
      break;
    }
    case 'form_boost': {
      const teamPlayers = result.players.filter(p => p.teamId === teamId && !p.injury);
      if (teamPlayers.length > 0) {
        const best = teamPlayers.reduce((a, b) => (a.form < b.form ? a : b));
        result = {
          ...result,
          players: result.players.map(p =>
            p.id === best.id ? { ...p, form: Math.min(100, p.form + card.value) } : p
          ),
        };
      }
      break;
    }
    case 'injury_heal': {
      const injured = result.players.filter(p => p.teamId === teamId && p.injury);
      if (injured.length > 0) {
        const target = injured[0];
        result = {
          ...result,
          players: result.players.map(p =>
            p.id === target.id ? { ...p, injury: undefined, condition: 70 } : p
          ),
        };
      }
      break;
    }
    case 'reputation': {
      result = {
        ...result,
        teams: result.teams.map(t =>
          t.id === teamId ? { ...t, reputation: Math.min(100, (t.reputation ?? 50) + card.value) } : t
        ),
      };
      break;
    }
    case 'training_double': {
      result = { ...result, training: { ...result.training, doubleXpNextWeek: true } };
      break;
    }
    case 'tactic_boost': {
      result = { ...result, packTacticBoost: card.value };
      break;
    }
    case 'contract_extend': {
      const bestPlayer = result.players
        .filter(p => p.teamId === teamId && !p.isLoaned)
        .sort((a, b) => b.marketValue - a.marketValue)[0];
      if (bestPlayer) {
        const currentEnd = new Date(bestPlayer.contractUntil);
        currentEnd.setFullYear(currentEnd.getFullYear() + card.value);
        result = {
          ...result,
          players: result.players.map(p =>
            p.id === bestPlayer.id
              ? { ...p, contractUntil: currentEnd.toISOString().split('T')[0] }
              : p
          ),
        };
      }
      break;
    }
    case 'stadium_speed': {
      const activeUpgrade = result.stadiumUpgrades.find(u => !u.isCompleted);
      if (activeUpgrade) {
        result = {
          ...result,
          stadiumUpgrades: result.stadiumUpgrades.map(u =>
            u.id === activeUpgrade.id ? { ...u, isCompleted: true, completionDate: state.currentDate } : u
          ),
        };
      }
      break;
    }
    case 'player_trait': {
      const eligible = result.players.filter(p =>
        p.teamId === teamId && (p.traits ?? []).length < 4 && !p.injury
      );
      if (eligible.length > 0) {
        const { TRAIT_CATALOG } = require('@/types/traits');
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        const posCatalog = TRAIT_CATALOG.filter((t: { eligiblePositions: string[] }) =>
          t.eligiblePositions.includes(target.position)
        );
        const existingIds = new Set((target.traits ?? []).map((t: { traitId: string }) => t.traitId));
        const available = posCatalog.filter((t: { id: string }) => !existingIds.has(t.id));
        if (available.length > 0) {
          const trait = available[Math.floor(Math.random() * available.length)];
          result = {
            ...result,
            players: result.players.map(p =>
              p.id === target.id
                ? { ...p, traits: [...(p.traits ?? []), { traitId: trait.id, tier: 'bronze' as const, acquiredDate: state.currentDate }] }
                : p
            ),
          };
        }
      }
      break;
    }
    case 'scout_report':
    case 'youth_quality':
    case 'sponsor_premium':
      break;
  }

  // Mark card as used
  const updatedCards = (result.cardInventory ?? []).map(c =>
    c.id === cardId ? { ...c, isUsed: true } : c
  );

  return { ...result, cardInventory: updatedCards };
}

// ── Apply Rewards to GameState (LEGACY — kept for backward compat) ──

export function applyPackRewards(state: GameState, packId: string): GameState {
  const packs: Pack[] = state.pendingPacks ?? [];
  const packIdx = packs.findIndex((p: Pack) => p.id === packId);
  if (packIdx === -1) return state;

  const pack = packs[packIdx];
  if (!pack.isOpened) return state;

  let result = { ...state };
  const teamId = state.currentTeamId;

  for (const reward of pack.rewards) {
    if (reward.isApplied) continue;

    switch (reward.type) {
      case 'budget': {
        const fin = result.finances[teamId];
        if (fin) {
          result = {
            ...result,
            finances: {
              ...result.finances,
              [teamId]: { ...fin, balance: fin.balance + reward.value, transferBudget: fin.transferBudget + reward.value },
            },
          };
        }
        break;
      }
      case 'morale_all': {
        result = {
          ...result,
          players: result.players.map(p =>
            p.teamId === teamId ? { ...p, morale: Math.min(100, p.morale + reward.value) } : p
          ),
        };
        break;
      }
      case 'manager_xp': {
        let mgr = { ...result.manager };
        mgr.xp = (mgr.xp ?? 0) + reward.value;
        while (mgr.xp >= mgr.xpToNextLevel) {
          mgr.xp -= mgr.xpToNextLevel;
          mgr.level += 1;
          mgr.xpToNextLevel = Math.round(mgr.xpToNextLevel * 1.2);
        }
        result = { ...result, manager: mgr };
        break;
      }
      case 'condition_all': {
        result = {
          ...result,
          players: result.players.map(p =>
            p.teamId === teamId ? { ...p, condition: Math.min(100, p.condition + reward.value) } : p
          ),
        };
        break;
      }
      case 'match_practice': {
        result = {
          ...result,
          players: result.players.map(p =>
            p.teamId === teamId ? { ...p, matchPractice: Math.min(100, (p.matchPractice ?? 50) + reward.value) } : p
          ),
        };
        break;
      }
      case 'form_boost': {
        // Boost best player by OVR
        const teamPlayers = result.players.filter(p => p.teamId === teamId && !p.injury);
        if (teamPlayers.length > 0) {
          const best = teamPlayers.reduce((a, b) => (a.form < b.form ? a : b));
          result = {
            ...result,
            players: result.players.map(p =>
              p.id === best.id ? { ...p, form: Math.min(100, p.form + reward.value) } : p
            ),
          };
        }
        break;
      }
      case 'injury_heal': {
        const injured = result.players.filter(p => p.teamId === teamId && p.injury);
        if (injured.length > 0) {
          const target = injured[0]; // Heal first injured player
          result = {
            ...result,
            players: result.players.map(p =>
              p.id === target.id ? { ...p, injury: undefined, condition: 70 } : p
            ),
          };
        }
        break;
      }
      case 'reputation': {
        const team = result.teams.find(t => t.id === teamId);
        if (team) {
          result = {
            ...result,
            teams: result.teams.map(t =>
              t.id === teamId ? { ...t, reputation: Math.min(100, (t.reputation ?? 50) + reward.value) } : t
            ),
          };
        }
        break;
      }
      case 'training_double': {
        // Mark in training plan for next training
        result = {
          ...result,
          training: { ...result.training, doubleXpNextWeek: true },
        };
        break;
      }
      case 'tactic_boost': {
        // Store as a temporary boost
        result = {
          ...result,
          packTacticBoost: reward.value,
        };
        break;
      }
      case 'contract_extend': {
        // Extend best player's contract
        const bestPlayer = result.players
          .filter(p => p.teamId === teamId && !p.isLoaned)
          .sort((a, b) => b.marketValue - a.marketValue)[0];
        if (bestPlayer) {
          const currentEnd = new Date(bestPlayer.contractUntil);
          currentEnd.setFullYear(currentEnd.getFullYear() + reward.value);
          result = {
            ...result,
            players: result.players.map(p =>
              p.id === bestPlayer.id
                ? { ...p, contractUntil: currentEnd.toISOString().split('T')[0] }
                : p
            ),
          };
        }
        break;
      }
      case 'stadium_speed': {
        // Complete current stadium upgrade instantly
        const activeUpgrade = result.stadiumUpgrades.find(u => !u.isCompleted);
        if (activeUpgrade) {
          result = {
            ...result,
            stadiumUpgrades: result.stadiumUpgrades.map(u =>
              u.id === activeUpgrade.id ? { ...u, isCompleted: true, completionDate: state.currentDate } : u
            ),
          };
        }
        break;
      }
      case 'player_trait': {
        // Award random bronze trait to a random player without max traits
        const eligible = result.players.filter(p =>
          p.teamId === teamId && (p.traits ?? []).length < 4 && !p.injury
        );
        if (eligible.length > 0) {
          const { TRAIT_CATALOG } = require('@/types/traits');
          const target = eligible[Math.floor(Math.random() * eligible.length)];
          const posCatalog = TRAIT_CATALOG.filter((t: { eligiblePositions: string[] }) =>
            t.eligiblePositions.includes(target.position)
          );
          const existingIds = new Set((target.traits ?? []).map((t: { traitId: string }) => t.traitId));
          const available = posCatalog.filter((t: { id: string }) => !existingIds.has(t.id));
          if (available.length > 0) {
            const trait = available[Math.floor(Math.random() * available.length)];
            result = {
              ...result,
              players: result.players.map(p =>
                p.id === target.id
                  ? { ...p, traits: [...(p.traits ?? []), { traitId: trait.id, tier: 'bronze' as const, acquiredDate: state.currentDate }] }
                  : p
              ),
            };
          }
        }
        break;
      }
      // scout_report, youth_quality, sponsor_premium: these set flags checked elsewhere
      case 'scout_report':
      case 'youth_quality':
      case 'sponsor_premium':
        // These are passive — the flag is the reward itself
        break;
    }
  }

  // Mark all rewards as applied
  const updatedPacks: Pack[] = (result.pendingPacks ?? []).map((p: Pack) =>
    p.id === packId
      ? { ...p, rewards: p.rewards.map((r: PackReward) => ({ ...r, isApplied: true })) }
      : p
  );

  return { ...result, pendingPacks: updatedPacks };
}
