/**
 * Rating Engine — Auf- und Abwertungen (Anstoß-Style)
 * 
 * Triggered at three points:
 *  1. Saisonstart (season start) — young talent boost, veteran decline
 *  2. Winterpause (winter break) — based on first half performance
 *  3. Saisonende (season end) — based on full season performance
 * 
 * Affects: attributes (→ OVR), potential, traits
 */

import { Player, PlayerAttributes } from '@/types/player';
import { NewsItem } from '@/types/news';
import { calcOverall } from '@/store/selectors';
import { calcStableMarketValue } from './transfer-engine';

// ── Types ──

export interface RatingChange {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  oldOvr: number;
  newOvr: number;
  potentialChange: number;
  reason: string;
  type: 'upgrade' | 'downgrade' | 'neutral';
}

export interface RatingUpdateResult {
  changes: RatingChange[];
  updatedPlayers: Player[];
  news: NewsItem[];
}

type Phase = 'season_start' | 'winter_break' | 'season_end';

// ── Helpers ──

function getAge(dob: string, currentDate: string): number {
  return new Date(currentDate).getFullYear() - new Date(dob).getFullYear();
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

// ── Attribute Keys ──

const PHYSICAL_ATTRS: (keyof PlayerAttributes)[] = ['pace', 'stamina', 'strength', 'acceleration', 'jumping'];
const TECHNICAL_ATTRS: (keyof PlayerAttributes)[] = ['ballControl', 'dribbling', 'passing', 'shooting', 'finishing', 'crossing', 'longShots', 'freeKick'];
const MENTAL_ATTRS: (keyof PlayerAttributes)[] = ['composure', 'vision', 'positioning', 'workRate', 'leadership'];
const GK_ATTRS: (keyof PlayerAttributes)[] = ['reflexes', 'handling', 'diving', 'kicking', 'oneOnOne'];

function getAllModifiableAttrs(position: string): (keyof PlayerAttributes)[] {
  if (position === 'TW') return [...GK_ATTRS, ...PHYSICAL_ATTRS.slice(0, 3), ...MENTAL_ATTRS.slice(0, 3)];
  return [...TECHNICAL_ATTRS, ...PHYSICAL_ATTRS, ...MENTAL_ATTRS];
}

function modifyAttribute(player: Player, attr: keyof PlayerAttributes, delta: number): void {
  const val = (player.attributes[attr] as number) ?? 50;
  (player.attributes as unknown as Record<string, number>)[attr as string] = Math.max(1, Math.min(99, val + delta));
}

// ── Core Logic ──

/**
 * Process rating changes for a set of players.
 */
export function processRatingChanges(
  players: Player[],
  teamId: string,
  currentDate: string,
  phase: Phase,
  seasonYear: number,
): RatingUpdateResult {
  const rng = seededRandom(`${currentDate}-${phase}-${teamId}`);
  const teamPlayers = players.filter(p => p.teamId === teamId);
  const changes: RatingChange[] = [];
  const news: NewsItem[] = [];
  const updatedPlayers = [...players];

  for (const player of teamPlayers) {
    const age = getAge(player.dateOfBirth, currentDate);
    const oldOvr = calcOverall(player);
    const idx = updatedPlayers.findIndex(p => p.id === player.id);
    if (idx === -1) continue;

    // Clone the player for mutation
    const p = { ...updatedPlayers[idx], attributes: { ...updatedPlayers[idx].attributes } };
    let potChange = 0;
    let reason = '';

    if (phase === 'season_start') {
      // Young players (U23): potential development boost
      if (age <= 22) {
        const boost = Math.floor(rng() * 3) + 1; // 1-3 attribute points
        const attrs = getAllModifiableAttrs(p.position);
        for (let i = 0; i < boost; i++) {
          const attr = attrs[Math.floor(rng() * attrs.length)];
          modifyAttribute(p, attr, 1);
        }
        // Potential may increase for very young players
        if (age <= 20 && rng() < 0.3) {
          potChange = 1;
          p.potential = Math.min(99, p.potential + 1);
        }
        reason = 'Saisonvorbereitung: Junge Spieler entwickeln sich weiter';
      }
      // Veterans (30+): slight physical decline at season start
      else if (age >= 30) {
        const declineCount = age >= 34 ? 3 : age >= 32 ? 2 : 1;
        for (let i = 0; i < declineCount; i++) {
          const attr = PHYSICAL_ATTRS[Math.floor(rng() * PHYSICAL_ATTRS.length)];
          modifyAttribute(p, attr, -1);
        }
        // Mental attributes may improve for veterans
        if (rng() < 0.4) {
          const mentalAttr = MENTAL_ATTRS[Math.floor(rng() * MENTAL_ATTRS.length)];
          modifyAttribute(p, mentalAttr, 1);
        }
        reason = 'Saisonvorbereitung: Altersbedingter Rückgang';
      }
      // Prime age (23-29): small random adjustments
      else {
        if (rng() < 0.25) {
          const attrs = getAllModifiableAttrs(p.position);
          const attr = attrs[Math.floor(rng() * attrs.length)];
          modifyAttribute(p, attr, rng() < 0.6 ? 1 : -1);
          reason = 'Saisonvorbereitung: Leistungsanpassung';
        }
      }
    }

    if (phase === 'winter_break') {
      const stats = p.stats;
      const hasPlayed = stats.appearances >= 5;

      if (hasPlayed) {
        const avgRating = stats.avgRating || 6.0;

        // High performers get upgrades
        if (avgRating >= 7.5) {
          const boost = avgRating >= 8.0 ? 3 : 2;
          const attrs = getAllModifiableAttrs(p.position);
          for (let i = 0; i < boost; i++) {
            const attr = attrs[Math.floor(rng() * attrs.length)];
            modifyAttribute(p, attr, 1);
          }
          if (age <= 25 && rng() < 0.3) {
            potChange = 1;
            p.potential = Math.min(99, p.potential + 1);
          }
          reason = `Winterpause: Starke Hinrunde (Ø ${avgRating.toFixed(1)})`;
        }
        // Poor performers get downgrades
        else if (avgRating < 5.5) {
          const decline = avgRating < 5.0 ? 2 : 1;
          const attrs = getAllModifiableAttrs(p.position);
          for (let i = 0; i < decline; i++) {
            const attr = attrs[Math.floor(rng() * attrs.length)];
            modifyAttribute(p, attr, -1);
          }
          if (age >= 30 && rng() < 0.3) {
            potChange = -1;
            p.potential = Math.max(30, p.potential - 1);
          }
          reason = `Winterpause: Schwache Hinrunde (Ø ${avgRating.toFixed(1)})`;
        }
        // Average: small chance for adjustment
        else if (rng() < 0.2) {
          const attrs = getAllModifiableAttrs(p.position);
          const attr = attrs[Math.floor(rng() * attrs.length)];
          modifyAttribute(p, attr, rng() < 0.5 ? 1 : -1);
          reason = 'Winterpause: Leistungsanpassung';
        }
      }
      // Players who barely played
      else if (stats.appearances < 3 && rng() < 0.3) {
        const attrs = getAllModifiableAttrs(p.position);
        const attr = attrs[Math.floor(rng() * attrs.length)];
        modifyAttribute(p, attr, -1);
        reason = 'Winterpause: Mangelnde Spielpraxis';
      }
    }

    if (phase === 'season_end') {
      const stats = p.stats;
      const hasPlayed = stats.appearances >= 10;

      if (hasPlayed) {
        const avgRating = stats.avgRating || 6.0;
        const goalsPerGame = stats.appearances > 0 ? stats.goals / stats.appearances : 0;

        // Outstanding season
        if (avgRating >= 7.5 || goalsPerGame >= 0.5) {
          const boost = avgRating >= 8.0 ? 4 : 3;
          const attrs = getAllModifiableAttrs(p.position);
          for (let i = 0; i < boost; i++) {
            const attr = attrs[Math.floor(rng() * attrs.length)];
            modifyAttribute(p, attr, 1);
          }
          if (age <= 27 && rng() < 0.4) {
            potChange = rng() < 0.3 ? 2 : 1;
            p.potential = Math.min(99, p.potential + potChange);
          }
          reason = `Saisonende: Herausragende Saison (Ø ${avgRating.toFixed(1)}, ${stats.goals}T/${stats.assists}V)`;
        }
        // Disappointing season
        else if (avgRating < 5.5) {
          const decline = avgRating < 5.0 ? 3 : 2;
          const attrs = getAllModifiableAttrs(p.position);
          for (let i = 0; i < decline; i++) {
            const attr = attrs[Math.floor(rng() * attrs.length)];
            modifyAttribute(p, attr, -1);
          }
          if (age >= 28 && rng() < 0.4) {
            potChange = -1;
            p.potential = Math.max(30, p.potential - 1);
          }
          reason = `Saisonende: Enttäuschende Saison (Ø ${avgRating.toFixed(1)})`;
        }
        // Decent season — small improvements
        else if (avgRating >= 6.5 && rng() < 0.4) {
          const attrs = getAllModifiableAttrs(p.position);
          const attr = attrs[Math.floor(rng() * attrs.length)];
          modifyAttribute(p, attr, 1);
          reason = 'Saisonende: Solide Saison';
        }
      }

      // Young players who didn't play much still develop
      if (!hasPlayed && age <= 21 && rng() < 0.5) {
        const attrs = getAllModifiableAttrs(p.position);
        const attr = attrs[Math.floor(rng() * attrs.length)];
        modifyAttribute(p, attr, 1);
        reason = 'Saisonende: Natürliche Entwicklung (Jugend)';
      }

      // Old players decline regardless
      if (age >= 33) {
        const extraDecline = age >= 36 ? 3 : age >= 34 ? 2 : 1;
        for (let i = 0; i < extraDecline; i++) {
          const attr = PHYSICAL_ATTRS[Math.floor(rng() * PHYSICAL_ATTRS.length)];
          modifyAttribute(p, attr, -1);
        }
        if (!reason) reason = 'Saisonende: Altersbedingter Rückgang';
      }
    }

    // Ensure potential >= OVR
    const newOvr = calcOverall(p);
    if (p.potential < newOvr) {
      p.potential = newOvr;
    }

    // Recalculate market value after attribute changes
    if (newOvr !== oldOvr) {
      p.marketValue = calcStableMarketValue(p, currentDate);
    }

    // Record change if OVR changed
    const ovrDiff = newOvr - oldOvr;
    if (ovrDiff !== 0 || potChange !== 0) {
      updatedPlayers[idx] = p;
      changes.push({
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        position: p.position,
        age,
        oldOvr,
        newOvr,
        potentialChange: potChange,
        reason: reason || (ovrDiff > 0 ? 'Leistungssteigerung' : 'Leistungsabfall'),
        type: ovrDiff > 0 ? 'upgrade' : ovrDiff < 0 ? 'downgrade' : 'neutral',
      });
    }
  }

  // Generate summary news
  if (changes.length > 0) {
    const upgrades = changes.filter(c => c.type === 'upgrade');
    const downgrades = changes.filter(c => c.type === 'downgrade');

    const phaseLabel = phase === 'season_start' ? 'Saisonstart' : phase === 'winter_break' ? 'Winterpause' : 'Saisonende';

    const topUpgrades = upgrades
      .sort((a, b) => (b.newOvr - b.oldOvr) - (a.newOvr - a.oldOvr))
      .slice(0, 3)
      .map(c => `${c.playerName} (${c.oldOvr}→${c.newOvr})`)
      .join(', ');

    const topDowngrades = downgrades
      .sort((a, b) => (a.newOvr - a.oldOvr) - (b.newOvr - b.oldOvr))
      .slice(0, 3)
      .map(c => `${c.playerName} (${c.oldOvr}→${c.newOvr})`)
      .join(', ');

    const parts: string[] = [];
    if (upgrades.length > 0) parts.push(`${upgrades.length} Aufwertung${upgrades.length > 1 ? 'en' : ''}: ${topUpgrades}`);
    if (downgrades.length > 0) parts.push(`${downgrades.length} Abwertung${downgrades.length > 1 ? 'en' : ''}: ${topDowngrades}`);

    news.push({
      id: `rating-${phase}-${currentDate}`,
      type: 'general',
      title: `${phaseLabel}: Spielerbewertungen aktualisiert`,
      content: parts.join('\n'),
      date: currentDate,
      isRead: false,
      importance: 'high',
    });
  }

  return { changes, updatedPlayers, news };
}
