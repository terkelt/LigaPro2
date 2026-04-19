import { Player } from '@/types/player';
import { Team } from '@/types/team';
import {
  Match,
  MatchResult,
  MatchEvent,
  MatchEventType,
  MatchStats,
  PlayerMatchRating,
  Weather,
  WeatherType,
} from '@/types/match';
import { TraitBoost, getTraitBoost, getTraitDefinition } from '@/types/traits';
import { ManagerSkills } from '@/types/manager';
import { calcManagerEffects, ManagerSkillEffects } from '@/lib/manager-engine';
import { FormationType, FORMATION_POSITIONS, getPositionCompatibility, Tactics, Mentality, PressingIntensity, Tempo, PassingStyle, Width, DefensiveLine } from '@/types/tactics';
import {
  narrate, pickPlayerName, NarrationContext,
  GOAL_WITH_ASSIST, GOAL_SOLO, SAVE_NARRATIONS, MISS_NARRATIONS, POST_NARRATIONS,
  FOUL_NARRATIONS, YELLOW_NARRATIONS, RED_NARRATIONS, CORNER_NARRATIONS, OFFSIDE_NARRATIONS,
  BUILDUP_NARRATIONS, BUILDUP_EXTENDED,
  ATMOSPHERE_NARRATIONS, TENSION_CLOSE_GAME, TENSION_LEADING, TENSION_TRAILING, TENSION_DOMINANT,
  WEATHER_NARRATIONS, TACTICAL_NARRATIONS,
} from './match-commentary';

// ════════════════════════════════════════════════════════
//  Hilfsfunktionen
// ════════════════════════════════════════════════════════

function getPlayerTraitBoosts(player: Player | undefined): TraitBoost {
  const combined: TraitBoost = {};
  if (!player) return combined;
  for (const t of player.traits ?? []) {
    const boost = getTraitBoost(t.traitId, t.tier);
    if (!boost) continue;
    for (const [key, val] of Object.entries(boost)) {
      (combined as Record<string, number>)[key] = ((combined as Record<string, number>)[key] ?? 0) + (val as number);
    }
  }
  return combined;
}

const BOOST_NAMES: Record<string, string> = {
  goalChance: 'Torchance', assistChance: 'Vorlagen', saveChance: 'Parade',
  tackleChance: 'Tackling', headerChance: 'Kopfball', freeKickChance: 'Freistoß',
  penaltyChance: 'Elfmeter', longShotChance: 'Fernschuss', crossChance: 'Flanken',
  clutchFactor: 'Entscheider', consistencyBonus: 'Konstanz', injuryResistance: 'Verletzungsschutz',
  staminaBoost: 'Ausdauer+', speedBoost: 'Tempo+', moraleAura: 'Moral-Aura',
};

/** Get a short trait flavor text for display in the ticker (e.g. "🎯 Torjäger") */
function getTraitFlavorForGoal(player: Player): string {
  for (const t of player.traits ?? []) {
    const def = getTraitDefinition(t.traitId);
    const boost = getTraitBoost(t.traitId, t.tier);
    if (!def || !boost) continue;
    if ((boost.goalChance ?? 0) > 0 || (boost.longShotChance ?? 0) > 0 || (boost.headerChance ?? 0) > 0 || (boost.clutchFactor ?? 0) > 0) {
      const tier = t.tier === 'gold' ? '🥇' : t.tier === 'silver' ? '🥈' : '🥉';
      return ` [${def.icon} ${def.name} ${tier}]`;
    }
  }
  return '';
}

function getTraitFlavorForSave(player: Player): string {
  for (const t of player.traits ?? []) {
    const def = getTraitDefinition(t.traitId);
    const boost = getTraitBoost(t.traitId, t.tier);
    if (!def || !boost) continue;
    if ((boost.saveChance ?? 0) > 0 || (boost.clutchFactor ?? 0) > 0) {
      const tier = t.tier === 'gold' ? '🥇' : t.tier === 'silver' ? '🥈' : '🥉';
      return ` [${def.icon} ${def.name} ${tier}]`;
    }
  }
  return '';
}

function getTraitFlavorForAssist(player: Player): string {
  for (const t of player.traits ?? []) {
    const def = getTraitDefinition(t.traitId);
    const boost = getTraitBoost(t.traitId, t.tier);
    if (!def || !boost) continue;
    if ((boost.assistChance ?? 0) > 0 || (boost.crossChance ?? 0) > 0) {
      const tier = t.tier === 'gold' ? '🥇' : t.tier === 'silver' ? '🥈' : '🥉';
      return ` [${def.icon} ${def.name} ${tier}]`;
    }
  }
  return '';
}

function describeTraits(player: Player): string[] {
  const lines: string[] = [];
  for (const t of player.traits ?? []) {
    const def = getTraitDefinition(t.traitId);
    const boost = getTraitBoost(t.traitId, t.tier);
    if (!def || !boost) continue;
    const tier = t.tier === 'bronze' ? '🥉' : t.tier === 'silver' ? '🥈' : '🥇';
    const effects = Object.entries(boost).filter(([, v]) => v !== 0)
      .map(([k, v]) => `${BOOST_NAMES[k] ?? k} ${v > 0 ? '+' : ''}${v}`).join(', ');
    if (effects) lines.push(`${def.icon} ${def.name} ${tier}: ${effects}`);
  }
  return lines;
}

class MatchRNG {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number { this.seed = (this.seed * 16807 + 0) % 2147483647; return this.seed / 2147483647; }
  range(min: number, max: number): number { return Math.floor(this.next() * (max - min + 1)) + min; }
  chance(pct: number): boolean { return this.next() * 100 < pct; }
  getSeed(): number { return this.seed; }
}

function calcOverall(p: Player): number {
  const a = p.attributes;
  if (p.position === 'TW') return Math.round(a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1);
  if (['IV', 'LV', 'RV'].includes(p.position)) return Math.round(a.positioning * 0.2 + a.strength * 0.1 + a.heading * 0.1 + a.pace * 0.1 + a.passing * 0.1 + a.aggression * 0.1 + a.composure * 0.1 + a.stamina * 0.1 + a.workRate * 0.1);
  if (['ZDM', 'ZM'].includes(p.position)) return Math.round(a.passing * 0.2 + a.vision * 0.15 + a.stamina * 0.1 + a.positioning * 0.1 + a.ballControl * 0.1 + a.workRate * 0.1 + a.composure * 0.1 + a.shooting * 0.05 + a.strength * 0.1);
  if (p.position === 'ZOM') return Math.round(a.vision * 0.2 + a.passing * 0.15 + a.ballControl * 0.15 + a.dribbling * 0.1 + a.shooting * 0.1 + a.composure * 0.1 + a.finishing * 0.1 + a.pace * 0.1);
  if (['LA', 'RA'].includes(p.position)) return Math.round(a.pace * 0.2 + a.dribbling * 0.15 + a.crossing * 0.15 + a.acceleration * 0.1 + a.shooting * 0.1 + a.ballControl * 0.1 + a.stamina * 0.1 + a.finishing * 0.1);
  return Math.round(a.finishing * 0.25 + a.shooting * 0.15 + a.heading * 0.1 + a.positioning * 0.1 + a.composure * 0.1 + a.pace * 0.1 + a.strength * 0.1 + a.dribbling * 0.1);
}

function teamStrength(players: Player[], posEff?: Record<string, number>): number {
  if (players.length === 0) return 50;
  return players.map(p => {
    const base = calcOverall(p);
    const eff = posEff?.[p.id] ?? 1.0;
    // Stronger penalty: at eff=0.25 → 43.75% strength (was 55%)
    return base * (0.25 + 0.75 * eff);
  }).reduce((s, v) => s + v, 0) / players.length;
}

function generateWeather(rng: MatchRNG): Weather {
  const types: { type: WeatherType; weight: number; temp: [number, number]; desc: string }[] = [
    { type: 'sunny', weight: 40, temp: [18, 30], desc: 'Sonnig' },
    { type: 'rain', weight: 25, temp: [10, 20], desc: 'Regen' },
    { type: 'heavy_rain', weight: 8, temp: [8, 16], desc: 'Starkregen' },
    { type: 'cold', weight: 15, temp: [-2, 8], desc: 'Kalt' },
    { type: 'snow', weight: 5, temp: [-5, 2], desc: 'Schnee' },
    { type: 'hot', weight: 7, temp: [30, 38], desc: 'Hitze' },
  ];
  const total = types.reduce((s, t) => s + t.weight, 0);
  let r = rng.next() * total;
  for (const t of types) { r -= t.weight; if (r <= 0) return { type: t.type, temperature: rng.range(t.temp[0], t.temp[1]), description: t.desc }; }
  return { type: 'sunny', temperature: 22, description: 'Sonnig' };
}

function rd(n: number): number { return Math.round(n * 100) / 100; }

function pickLineup(allPlayers: Player[], teamId: string, lineup?: string[]): Player[] {
  const tp = allPlayers.filter((p) => p.teamId === teamId);
  if (lineup && lineup.length >= 11) {
    // Always respect the user's lineup, even if players are on unusual positions
    const l = lineup.map((id) => tp.find((p) => p.id === id)).filter(Boolean) as Player[];
    if (l.length >= 11) return l.slice(0, 11);
  }
  // Fallback only if no lineup is provided
  const gk = tp.filter((p) => p.position === 'TW').sort((a, b) => calcOverall(b) - calcOverall(a));
  const of_ = tp.filter((p) => p.position !== 'TW').sort((a, b) => calcOverall(b) - calcOverall(a));
  return [...gk.slice(0, 1), ...of_.slice(0, 10)];
}

function initStats(): MatchStats {
  return { possession: 50, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0, yellowCards: 0, redCards: 0, offsides: 0, passes: 0, passAccuracy: 0 };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h) || 1;
}

// ════════════════════════════════════════════════════════
//  Mittelfeld-Kontrolle — Wer dominiert das Spiel?
// ════════════════════════════════════════════════════════

interface PossessionBreakdown {
  homeControl: number;
  awayControl: number;
  homePct: number;
  homeComponents: { midfield: number; pressing: number; buildup: number; staminaEffect: number; homeBonus: number; momentum: number };
  awayComponents: { midfield: number; pressing: number; buildup: number; staminaEffect: number; homeBonus: number; momentum: number };
}

function calcMidfieldControl(ctx: LiveMatchContext): PossessionBreakdown {
  const MID_POS = new Set(['ZDM', 'ZM', 'ZOM']);
  const ATK_POS = new Set(['ST', 'LA', 'RA']);

  const calcSide = (players: Player[], isHome: boolean) => {
    const tac = isHome ? ctx.homeTactics : ctx.awayTactics;
    const mids = players.filter(p => MID_POS.has(p.position));
    const field = players.filter(p => p.position !== 'TW');
    const defs = players.filter(p => ['IV', 'LV', 'RV'].includes(p.position));
    const atks = players.filter(p => ATK_POS.has(p.position));
    const gk = players.find(p => p.position === 'TW');

    // 1. Mittelfeld-Qualität (Passing, Vision, Ballkontrolle) — Gewicht: 35%
    //    + Formation midfield bonus from matchup
    //    + matchPractice modifier (0.85-1.0): low practice = reduced sharpness
    const midQual = mids.length > 0
      ? mids.reduce((s, p) => {
          const stam = Math.max(0.6, (ctx.stamina[p.id] ?? 80) / 100);
          const eff = ctx.positionEffectiveness[p.id] ?? 1.0;
          const practice = 0.85 + ((p.matchPractice ?? 50) / 100) * 0.15;
          return s + ((p.attributes.passing * 0.35 + p.attributes.vision * 0.30 + p.attributes.ballControl * 0.25 + p.attributes.composure * 0.10) * stam * (0.3 + 0.7 * eff) * practice);
        }, 0) / mids.length + tac.midfieldBonus
      : 45 + tac.midfieldBonus;

    // 2. Pressing-Intensität (WorkRate + Aggression) × Taktik-Pressing-Multiplikator — Gewicht: 25%
    const rawPressing = field.length > 0
      ? field.reduce((s, p) => {
          const stam = Math.max(0.5, (ctx.stamina[p.id] ?? 80) / 100);
          return s + ((p.attributes.workRate * 0.55 + p.attributes.aggression * 0.30 + p.attributes.positioning * 0.15) * stam);
        }, 0) / field.length
      : 45;
    const pressing = rawPressing * tac.pressingMod;

    // 3. Spielaufbau (Verteidiger-Passing + TW-Kicking) × Taktik-Buildup-Mod — Gewicht: 15%
    const defPass = defs.length > 0
      ? defs.reduce((s, p) => s + p.attributes.passing * 0.6 + p.attributes.composure * 0.4, 0) / defs.length
      : 45;
    const gkBuild = gk ? gk.attributes.kicking * 0.5 + gk.attributes.handling * 0.3 + gk.attributes.composure * 0.2 : 40;
    const buildup = (defPass * 0.7 + gkBuild * 0.3) * tac.buildupMod;

    // 4. Stamina-Effekt (Ø Kondition aller Feldspieler) — Gewicht: 15%
    const avgStam = field.length > 0
      ? field.reduce((s, p) => s + (ctx.stamina[p.id] ?? 80), 0) / field.length
      : 70;
    const staminaEffect = avgStam * 0.8 + 10; // 10-90 range

    // 5. Heimvorteil
    const homeBonus = isHome ? ctx.homeAdvantage * 0.5 : 0;

    // 6. Momentum (nach Gegentor pushst du, nach eigenem Tor lehnt man sich zurück)
    const mom = isHome ? ctx.momentum.home : ctx.momentum.away;

    // 7. Mentality shift: offensive mentality pushes midfield forward → more control when attacking
    const mentalityShift = tac.attackBonus * 0.15;

    // Coaching shout & halftime effects for player's team
    let shoutBonus = 0;
    const isPlayerTeam = (isHome && ctx.homeTeam.id === ctx.playerTeamId) || (!isHome && ctx.awayTeam.id === ctx.playerTeamId);
    if (isPlayerTeam && ctx.shoutActive && ctx.currentMinute <= ctx.shoutActive.expiresAt) {
      const def = SHOUT_CATALOG.find(s => s.type === ctx.shoutActive!.type);
      if (def) {
        shoutBonus += (def.effect.pressing ?? 0) * 0.3 + (def.effect.possession ?? 0) * 0.2;
      }
    }
    if (isPlayerTeam && ctx.halftimeTalkEffect && ctx.currentMinute > 45) {
      shoutBonus += ctx.halftimeTalkEffect.pressingBoost * 0.25;
    }

    // Gesamt: gewichtete Summe
    const total = midQual * 0.35 + pressing * 0.25 + buildup * 0.15 + staminaEffect * 0.15 + homeBonus + mom * 0.10 + mentalityShift + shoutBonus;

    return {
      total,
      midfield: rd(midQual),
      pressing: rd(pressing),
      buildup: rd(buildup),
      staminaEffect: rd(staminaEffect),
      homeBonus: rd(homeBonus),
      momentum: rd(mom),
    };
  };

  const h = calcSide(ctx.homePlayers, true);
  const a = calcSide(ctx.awayPlayers, false);

  const rawTotal = h.total + a.total || 1;
  const homePct = Math.max(25, Math.min(75, (h.total / rawTotal) * 100));

  return {
    homeControl: h.total,
    awayControl: a.total,
    homePct,
    homeComponents: h,
    awayComponents: a,
  };
}

// ════════════════════════════════════════════════════════
//  LiveMatchContext — öffentlicher Typ für Live-Simulation
// ════════════════════════════════════════════════════════

export interface LiveMatchContext {
  matchId: string;
  matchDate: string;
  matchday: number;
  competition: 'league' | 'cup' | 'cl' | 'el' | 'ecl' | 'relegation' | 'friendly';
  leagueId?: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeStarterIds: string[];
  awayStarterIds: string[];
  homeScore: number;
  awayScore: number;
  homeStats: MatchStats;
  awayStats: MatchStats;
  events: MatchEvent[];
  weather: Weather;
  homeStrength: number;
  awayStrength: number;
  homeAdvantage: number;
  stamina: Record<string, number>;
  homeSubs: number;
  awaySubs: number;
  minutesPlayed: Record<string, number>;
  subEntries: Record<string, number>;
  allHomePlayers: Player[];
  allAwayPlayers: Player[];
  playerTeamId: string;
  _rngSeed: number;
  currentMinute: number;
  injuryTimeHalf1: number;
  injuryTimeHalf2: number;
  isFinished: boolean;
  isDerby: boolean;
  momentum: { home: number; away: number };
  homePossessionAccum: number;
  awayPossessionAccum: number;
  /** Coaching interventions */
  shoutActive?: { type: ShoutType; expiresAt: number };
  shoutCooldownUntil: number;
  halftimeTalkDone: boolean;
  halftimeTalkEffect?: { moraleBoost: number; staminaBoost: number; pressingBoost: number };
  /** Manager skill effects */
  homeManagerEffects: ManagerSkillEffects;
  awayManagerEffects: ManagerSkillEffects;
  /** Position effectiveness per player (1.0 = natural, <1.0 = out of position) */
  positionEffectiveness: Record<string, number>;
  /** Full tactics for each side (null for AI without explicit tactics) */
  homeTactics: TacticalModifiers;
  awayTactics: TacticalModifiers;
  /** Knockout match: must have a winner (extra time + penalties if drawn) */
  isKnockout: boolean;
  /** Extra time state */
  isExtraTime: boolean;
  injuryTimeET1: number;
  injuryTimeET2: number;
  /** Penalty shootout state */
  isPenaltyShootout: boolean;
  penaltyHome: number;
  penaltyAway: number;
  /** 2D Pitch visualization data */
  ballZone: 'home_defense' | 'home_midfield' | 'center' | 'away_midfield' | 'away_defense';
  attackingTeamId: string;
  lastEventType?: string;
}

export type ShoutType = 'more_pressing' | 'stay_calm' | 'use_wings' | 'motivate' | 'time_wasting';

export interface ShoutDefinition {
  type: ShoutType;
  label: string;
  icon: string;
  description: string;
  durationMinutes: number;
  effect: { pressing?: number; possession?: number; staminaCost?: number; moraleBoost?: number; foulRisk?: number };
}

export const SHOUT_CATALOG: ShoutDefinition[] = [
  { type: 'more_pressing', label: 'Mehr Pressing!', icon: '🔥', description: 'Höheres Pressing für 10 Min. Kostet Ausdauer.', durationMinutes: 10, effect: { pressing: 8, staminaCost: 3, foulRisk: 1.5 } },
  { type: 'stay_calm', label: 'Ruhe bewahren!', icon: '🧊', description: 'Sicherer spielen, weniger Risiko. Mehr Ballbesitz.', durationMinutes: 10, effect: { possession: 5, pressing: -3, foulRisk: -1 } },
  { type: 'use_wings', label: 'Flügel nutzen!', icon: '🌀', description: 'Mehr Flanken und Angriffe über außen.', durationMinutes: 10, effect: { pressing: 3, possession: 2 } },
  { type: 'motivate', label: 'Kommt schon!', icon: '💪', description: 'Motivationsschub. Kann bei hoher Führung nach hinten losgehen.', durationMinutes: 8, effect: { pressing: 5, moraleBoost: 3, staminaCost: 2 } },
  { type: 'time_wasting', label: 'Zeit schinden!', icon: '⏳', description: 'Ball halten, Tempo rausnehmen. Nur sinnvoll bei Führung.', durationMinutes: 10, effect: { possession: 3, pressing: -6, foulRisk: 2 } },
];

export type HalftimeTalkType = 'motivating' | 'tactical' | 'critical' | 'calm' | 'aggressive' | 'defensive' | 'individual' | 'team_spirit';

export interface HalftimeTalkDefinition {
  type: HalftimeTalkType;
  label: string;
  icon: string;
  description: string;
  effect: { moraleBoost: number; staminaBoost: number; pressingBoost: number };
  /** When this talk is most effective */
  bestWhen: string;
}

export const HALFTIME_TALKS: HalftimeTalkDefinition[] = [
  { type: 'motivating', label: 'Motivierend', icon: '🔥', description: 'Feuer und Leidenschaft! Pusht die Mannschaft über ihre Grenzen.', effect: { moraleBoost: 5, staminaBoost: 3, pressingBoost: 4 }, bestWhen: 'Rückstand' },
  { type: 'tactical', label: 'Taktisch', icon: '📋', description: 'Klare Anweisungen an der Taktiktafel. Verbessert Struktur und Ballbesitz.', effect: { moraleBoost: 2, staminaBoost: 0, pressingBoost: 2 }, bestWhen: 'Unentschieden' },
  { type: 'critical', label: 'Kritisch', icon: '😤', description: 'Harte Worte und Gardienenpredigt. Riskant — kann nach hinten losgehen.', effect: { moraleBoost: -2, staminaBoost: 0, pressingBoost: 6 }, bestWhen: 'Schlechte Leistung' },
  { type: 'calm', label: 'Ruhig', icon: '😌', description: 'Gelassen bleiben, Kräfte einteilen. Ideal bei Führung.', effect: { moraleBoost: 3, staminaBoost: 5, pressingBoost: -2 }, bestWhen: 'Führung' },
  { type: 'aggressive', label: 'Aggressiv', icon: '⚡', description: 'Volle Attacke! Maximales Pressing und Zweikampfhärte. Verbraucht viel Kraft.', effect: { moraleBoost: 1, staminaBoost: -3, pressingBoost: 8 }, bestWhen: 'Rückstand & wenig Zeit' },
  { type: 'defensive', label: 'Mauer', icon: '🧱', description: 'Hinten reinsetzen und den Vorsprung verteidigen. Weniger Offensivdrang.', effect: { moraleBoost: 1, staminaBoost: 4, pressingBoost: -4 }, bestWhen: 'Knappe Führung' },
  { type: 'individual', label: 'Einzelgespräche', icon: '🤝', description: 'Einzelne Spieler gezielt ansprechen. Stärkt das Selbstvertrauen der Schlüsselspieler.', effect: { moraleBoost: 7, staminaBoost: 1, pressingBoost: 1 }, bestWhen: 'Verunsicherte Spieler' },
  { type: 'team_spirit', label: 'Zusammenhalt', icon: '💪', description: 'An den Teamgeist appellieren. Zusammen als Einheit kämpfen.', effect: { moraleBoost: 6, staminaBoost: 2, pressingBoost: 3 }, bestWhen: 'Wichtiges Spiel' },
];

// ════════════════════════════════════════════════════════
//  createLiveMatch — Kontext für Live-Simulation erstellen
// ════════════════════════════════════════════════════════

const DEFAULT_SKILLS: ManagerSkills = { tactics: 5, motivation: 5, negotiation: 3, youthDev: 3, fitness: 4, scouting: 3, media: 2, discipline: 4 };

// ════════════════════════════════════════════════════════
//  Tactical Modifiers — Taktik-Einstellungen → Zahlenwerte
// ════════════════════════════════════════════════════════

export interface TacticalModifiers {
  // From mentality
  attackBonus: number;     // positive = more offensive
  defenseBonus: number;    // positive = more defensive
  // From pressing
  pressingMod: number;     // multiplier on pressing component
  staminaDrain: number;    // extra stamina drain per minute
  foulRiskMod: number;     // multiplier on foul chance
  // From tempo
  tempoMod: number;        // affects shot frequency
  passAccMod: number;      // affects pass accuracy
  // From passing style
  buildupMod: number;      // affects buildup component
  counterMod: number;      // chance for quick counter-attacks
  // From width
  crossingMod: number;     // affects crossing/corner chance
  centralMod: number;      // affects central play (through balls)
  // From defensive line
  offsideTrapMod: number;  // affects offside chance for opponent
  spaceBehindRisk: number; // risk of being caught on counter
  // From formation matchup (added dynamically)
  midfieldBonus: number;   // bonus to midfield control
}

const DEFAULT_TACTICS: TacticalModifiers = {
  attackBonus: 0, defenseBonus: 0,
  pressingMod: 1.0, staminaDrain: 0, foulRiskMod: 1.0,
  tempoMod: 1.0, passAccMod: 1.0,
  buildupMod: 1.0, counterMod: 0,
  crossingMod: 1.0, centralMod: 1.0,
  offsideTrapMod: 1.0, spaceBehindRisk: 0,
  midfieldBonus: 0,
};

function buildTacticalModifiers(tactics?: Tactics): TacticalModifiers {
  if (!tactics) return { ...DEFAULT_TACTICS };

  const m: TacticalModifiers = { ...DEFAULT_TACTICS };

  // ── Mentality ──
  // ultra-offensive: huge attack bonus, defense penalty, more shots, more goals conceded
  // ultra-defensive: huge defense bonus, attack penalty, fewer shots, fewer goals conceded
  const mentalityMap: Record<Mentality, { atk: number; def: number }> = {
    'ultra-defensive': { atk: -8, def: 10 },
    'defensive':       { atk: -4, def: 5 },
    'balanced':        { atk: 0,  def: 0 },
    'offensive':       { atk: 5,  def: -4 },
    'ultra-offensive': { atk: 10, def: -8 },
  };
  const ment = mentalityMap[tactics.mentality] ?? { atk: 0, def: 0 };
  m.attackBonus += ment.atk;
  m.defenseBonus += ment.def;

  // ── Pressing Intensity ──
  // Higher pressing = better ball recovery, more fouls, more stamina drain
  const pressingMap: Record<PressingIntensity, { press: number; stam: number; foul: number }> = {
    'low':            { press: 0.75, stam: -0.04, foul: 0.85 },
    'medium':         { press: 1.0,  stam: 0,     foul: 1.0 },
    'high':           { press: 1.25, stam: 0.05,  foul: 1.15 },
    'gegenpressing':  { press: 1.50, stam: 0.10,  foul: 1.30 },
  };
  const press = pressingMap[tactics.pressingIntensity] ?? { press: 1.0, stam: 0, foul: 1.0 };
  m.pressingMod = press.press;
  m.staminaDrain = press.stam;
  m.foulRiskMod = press.foul;

  // ── Tempo ──
  // Fast = more chances but less accurate, Slow = fewer but more precise
  const tempoMap: Record<Tempo, { tempo: number; acc: number }> = {
    'slow':   { tempo: 0.85, acc: 1.10 },
    'normal': { tempo: 1.0,  acc: 1.0 },
    'fast':   { tempo: 1.15, acc: 0.90 },
  };
  const tmp = tempoMap[tactics.tempo] ?? { tempo: 1.0, acc: 1.0 };
  m.tempoMod = tmp.tempo;
  m.passAccMod = tmp.acc;

  // ── Passing Style ──
  // Short = better buildup, Long = counter-attack potential, Direct = bypass midfield
  const passMap: Record<PassingStyle, { buildup: number; counter: number }> = {
    'short':  { buildup: 1.15, counter: 0 },
    'mixed':  { buildup: 1.0,  counter: 0.02 },
    'long':   { buildup: 0.80, counter: 0.06 },
    'direct': { buildup: 0.85, counter: 0.08 },
  };
  const ps = passMap[tactics.passingStyle] ?? { buildup: 1.0, counter: 0 };
  m.buildupMod = ps.buildup;
  m.counterMod = ps.counter;

  // ── Width ──
  // Wide = more crossing, Narrow = more central play
  const widthMap: Record<Width, { cross: number; central: number }> = {
    'narrow': { cross: 0.75, central: 1.20 },
    'normal': { cross: 1.0,  central: 1.0 },
    'wide':   { cross: 1.25, central: 0.80 },
  };
  const wd = widthMap[tactics.width] ?? { cross: 1.0, central: 1.0 };
  m.crossingMod = wd.cross;
  m.centralMod = wd.central;

  // ── Defensive Line ──
  // High = more offside traps but vulnerable to pace, Deep = safe but less pressing
  const defLineMap: Record<DefensiveLine, { offside: number; space: number; pressMod: number }> = {
    'deep':   { offside: 0.6,  space: 0,    pressMod: -0.10 },
    'normal': { offside: 1.0,  space: 0.03, pressMod: 0 },
    'high':   { offside: 1.5,  space: 0.08, pressMod: 0.10 },
  };
  const dl = defLineMap[tactics.defensiveLine] ?? { offside: 1.0, space: 0, pressMod: 0 };
  m.offsideTrapMod = dl.offside;
  m.spaceBehindRisk = dl.space;
  m.pressingMod *= (1 + dl.pressMod); // high line supports pressing

  // Offside trap setting amplifies the effect
  if (tactics.offsideTrap) {
    m.offsideTrapMod *= 1.3;
    m.spaceBehindRisk += 0.03;
  }

  // ── Effort Level (Einsatz) ──
  // all_out = huge stamina drain, better pressing & attack; conserve = save energy
  const effortMap: Record<string, { stam: number; press: number; atk: number; foul: number }> = {
    'conserve':  { stam: -0.06, press: -0.10, atk: -3, foul: 0.85 },
    'normal':    { stam: 0,     press: 0,     atk: 0,  foul: 1.0 },
    'intense':   { stam: 0.10,  press: 0.10,  atk: 3,  foul: 1.15 },
    'all_out':   { stam: 0.12,  press: 0.20,  atk: 5,  foul: 1.30 },
  };
  const eff = effortMap[tactics.effortLevel ?? 'normal'] ?? effortMap['normal'];
  m.staminaDrain += eff.stam;
  m.pressingMod *= (1 + eff.press);
  m.attackBonus += eff.atk;
  m.foulRiskMod *= eff.foul;

  // ── Wing Play (Flügelspiel) ──
  // left/right/both = boost crossing on specific side, balanced = neutral
  const wingMap: Record<string, { cross: number; central: number }> = {
    'balanced': { cross: 0, central: 0 },
    'left':     { cross: 0.15, central: -0.05 },
    'right':    { cross: 0.15, central: -0.05 },
    'both':     { cross: 0.25, central: -0.10 },
  };
  const wing = wingMap[tactics.wingPlay ?? 'balanced'] ?? wingMap['balanced'];
  m.crossingMod += wing.cross;
  m.centralMod += wing.central;

  // ── Marking Style ──
  // man_marking = better defense but more fouls and stamina
  if (tactics.markingStyle === 'man_marking') {
    m.defenseBonus += 4;
    m.foulRiskMod *= 1.10;
    m.staminaDrain += 0.05;
  }

  // ── Buildup Play ──
  // patient = better buildup/possession, quick_counter = counter-attacks
  const buildMap: Record<string, { buildup: number; counter: number }> = {
    'patient':       { buildup: 0.15, counter: -0.02 },
    'balanced':      { buildup: 0, counter: 0 },
    'quick_counter': { buildup: -0.10, counter: 0.05 },
  };
  const bld = buildMap[tactics.buildupPlay ?? 'balanced'] ?? buildMap['balanced'];
  m.buildupMod += bld.buildup;
  m.counterMod += bld.counter;

  // ── Time Wasting ──
  // Reduces tempo when leading, increases foul risk
  if (tactics.timeWasting === 'always') {
    m.tempoMod *= 0.85;
    m.foulRiskMod *= 1.10;
  }
  // 'when_leading' is handled dynamically during match minutes

  return m;
}

// ════════════════════════════════════════════════════════
//  Formation Matchup — Taktische Vor-/Nachteile
// ════════════════════════════════════════════════════════

interface FormationZoneBonus {
  midfield: number;
  attack: number;
  defense: number;
}

/**
 * Calculates zone advantages based on formation matchup.
 * Key principles from real football:
 * - 3-back is vulnerable to wide formations (4-3-3, 3-4-3)
 * - 5-back is strong defensively but weak in midfield
 * - 4-3-3 dominates midfield vs 4-4-2 but is exposed centrally
 * - Diamond/narrow formations struggle vs wide play
 * - More midfielders = midfield control advantage
 */
function getFormationMatchup(home: FormationType, away: FormationType): { home: FormationZoneBonus; away: FormationZoneBonus } {
  // Count players per zone from formation string
  const parseZones = (f: FormationType): { def: number; mid: number; atk: number } => {
    const parts = f.replace('-diamond', '').split('-').map(Number);
    if (parts.length === 3) return { def: parts[0], mid: parts[1], atk: parts[2] };
    if (parts.length === 4) return { def: parts[0], mid: parts[1] + parts[2], atk: parts[3] };
    if (parts.length === 5) return { def: parts[0], mid: parts[1] + parts[2] + parts[3], atk: parts[4] };
    return { def: 4, mid: 4, atk: 2 };
  };

  const h = parseZones(home);
  const a = parseZones(away);

  // Midfield numerical advantage: each extra midfielder = +2 midfield bonus
  const midDiff = h.mid - a.mid;

  // Attack vs Defense mismatch: more attackers vs fewer defenders = attack bonus
  const hAtkVsDef = h.atk - a.def; // positive = home has more attackers than away has defenders
  const aAtkVsDef = a.atk - h.def;

  // Wide vs narrow detection
  const isWide = (f: FormationType) => ['4-3-3', '3-4-3', '4-2-3-1'].includes(f);
  const isNarrow = (f: FormationType) => ['4-4-2-diamond', '4-1-2-1-2', '4-3-2-1'].includes(f);
  const is3Back = (f: FormationType) => f.startsWith('3-');
  const is5Back = (f: FormationType) => f.startsWith('5-');

  let hBonus: FormationZoneBonus = { midfield: midDiff * 2, attack: 0, defense: 0 };
  let aBonus: FormationZoneBonus = { midfield: -midDiff * 2, attack: 0, defense: 0 };

  // Attack vs defense numerical advantage (capped)
  hBonus.attack += Math.max(-4, Math.min(4, hAtkVsDef * 1.5));
  aBonus.attack += Math.max(-4, Math.min(4, aAtkVsDef * 1.5));

  // 5-back: strong defense, weak midfield/attack
  if (is5Back(home)) { hBonus.defense += 4; hBonus.midfield -= 2; hBonus.attack -= 2; }
  if (is5Back(away)) { aBonus.defense += 4; aBonus.midfield -= 2; aBonus.attack -= 2; }

  // 3-back vulnerable to wide formations
  if (is3Back(home) && isWide(away)) { hBonus.defense -= 3; aBonus.attack += 2; }
  if (is3Back(away) && isWide(home)) { aBonus.defense -= 3; hBonus.attack += 2; }

  // Narrow formations struggle vs wide play
  if (isNarrow(home) && isWide(away)) { hBonus.defense -= 2; aBonus.attack += 1; }
  if (isNarrow(away) && isWide(home)) { aBonus.defense -= 2; hBonus.attack += 1; }

  // Wide formations struggle vs packed midfield
  if (isWide(home) && h.mid < a.mid) { hBonus.midfield -= 1; }
  if (isWide(away) && a.mid < h.mid) { aBonus.midfield -= 1; }

  return { home: hBonus, away: aBonus };
}

// ════════════════════════════════════════════════════════
//  Zone-Based Team Strength — DEF / MID / ATK separat
// ════════════════════════════════════════════════════════

interface ZoneStrength {
  defense: number;
  midfield: number;
  attack: number;
  goalkeeper: number;
  overall: number;
}

function calcZoneStrength(players: Player[], posEff?: Record<string, number>): ZoneStrength {
  const DEF_POS = new Set(['IV', 'LV', 'RV']);
  const MID_POS = new Set(['ZDM', 'ZM', 'ZOM']);
  const ATK_POS = new Set(['ST', 'LA', 'RA']);

  const ratePlayer = (p: Player): number => {
    const base = calcOverall(p);
    const eff = posEff?.[p.id] ?? 1.0;
    // Stronger penalty: at eff=0.25 → 37.5% strength (was 55%)
    return base * (0.25 + 0.75 * eff);
  };

  const gk = players.filter(p => p.position === 'TW');
  const defs = players.filter(p => DEF_POS.has(p.position));
  const mids = players.filter(p => MID_POS.has(p.position));
  const atks = players.filter(p => ATK_POS.has(p.position));

  const avg = (arr: Player[]) => arr.length > 0 ? arr.reduce((s, p) => s + ratePlayer(p), 0) / arr.length : 45;

  const goalkeeper = gk.length > 0 ? ratePlayer(gk[0]) : 40;
  const defense = avg(defs);
  const midfield = avg(mids);
  const attack = avg(atks);
  const overall = (goalkeeper * 0.10 + defense * 0.25 + midfield * 0.35 + attack * 0.30);

  return { defense, midfield, attack, goalkeeper, overall };
}

export function createLiveMatch(
  match: Match,
  homeTeam: Team,
  awayTeam: Team,
  allPlayers: Player[],
  playerTeamId: string,
  homeLineup?: string[],
  awayLineup?: string[],
  homeManagerSkills?: ManagerSkills,
  awayManagerSkills?: ManagerSkills,
  homeFormation?: FormationType,
  awayFormation?: FormationType,
  homeTactics?: Tactics,
  awayTactics?: Tactics,
): LiveMatchContext {
  const seed = hashStr(match.id + match.date);
  const rng = new MatchRNG(seed);

  const homePlayers = pickLineup(allPlayers, homeTeam.id, homeLineup);
  const awayPlayers = pickLineup(allPlayers, awayTeam.id, awayLineup);
  const weather = generateWeather(rng);

  const stamina: Record<string, number> = {};
  for (const p of [...homePlayers, ...awayPlayers]) {
    const base = 80 + (p.attributes.stamina ?? 70) * 0.15 - (p.fatigue ?? 0) * 0.12;
    stamina[p.id] = Math.min(100, Math.max(55, base + rng.range(-3, 3)));
  }

  // Compute position effectiveness for each player in the lineup
  const posEff: Record<string, number> = {};
  const computePosEff = (players: Player[], formation?: FormationType) => {
    if (!formation) return; // AI teams without formation → all 1.0 (default)
    const slots = FORMATION_POSITIONS[formation];
    if (!slots) return;
    players.forEach((p, i) => {
      if (i < slots.length) {
        posEff[p.id] = getPositionCompatibility(p.position, slots[i].label);
      }
    });
  };
  computePosEff(homePlayers, homeFormation);
  computePosEff(awayPlayers, awayFormation);

  const hmEffects = calcManagerEffects(homeManagerSkills ?? DEFAULT_SKILLS);
  const amEffects = calcManagerEffects(awayManagerSkills ?? DEFAULT_SKILLS);

  let adjHome = teamStrength(homePlayers, posEff) * (1 + hmEffects.tacticsBonus / 100);
  let adjAway = teamStrength(awayPlayers, posEff) * (1 + amEffects.tacticsBonus / 100);
  if (weather.type === 'heavy_rain' || weather.type === 'snow') {
    adjHome *= 0.95;
    adjAway *= 0.92;
  }

  // ── Tactical Modifiers ──
  const hTac = buildTacticalModifiers(homeTactics);
  const aTac = buildTacticalModifiers(awayTactics);

  // Apply formation matchup bonuses
  const fmHome = homeFormation ?? homeTactics?.formation;
  const fmAway = awayFormation ?? awayTactics?.formation;
  if (fmHome && fmAway) {
    const matchup = getFormationMatchup(fmHome, fmAway);
    hTac.midfieldBonus += matchup.home.midfield;
    hTac.attackBonus += matchup.home.attack;
    hTac.defenseBonus += matchup.home.defense;
    aTac.midfieldBonus += matchup.away.midfield;
    aTac.attackBonus += matchup.away.attack;
    aTac.defenseBonus += matchup.away.defense;
  }

  const homeAdv = 5 + (homeTeam.fans.ultrasStrength * 0.5) + hmEffects.homeBonus;
  const injH1 = rng.range(1, 4);
  const injH2 = rng.range(1, 6);

  const weatherNote = (weather.type === 'heavy_rain' || weather.type === 'snow')
    ? `Schlechtes Wetter (${weather.description}) — Heimteam −5%, Gastteam −8% Spielstärke.`
    : `Wetter: ${weather.description}, ${weather.temperature}°C — kein Einfluss.`;

  // Zone-based strength for logging
  const hZone = calcZoneStrength(homePlayers, posEff);
  const aZone = calcZoneStrength(awayPlayers, posEff);

  const kickOffLog: string[] = [
    `╔══════════════════════════════════════════════╗`,
    `║  SPIELSTART: ${homeTeam.shortName} vs ${awayTeam.shortName}`,
    `╚══════════════════════════════════════════════╝`,
    ``,
    `📊 Teamstärke (Ø Gesamtwert aller 11 Spieler):`,
    `   ${homeTeam.shortName}: ${rd(adjHome)} (TW ${rd(hZone.goalkeeper)} | DEF ${rd(hZone.defense)} | MID ${rd(hZone.midfield)} | ATK ${rd(hZone.attack)})`,
    `   ${awayTeam.shortName}: ${rd(adjAway)} (TW ${rd(aZone.goalkeeper)} | DEF ${rd(aZone.defense)} | MID ${rd(aZone.midfield)} | ATK ${rd(aZone.attack)})`,
    ``,
    `⚙️ Taktik ${homeTeam.shortName}: Mentalität ${homeTactics?.mentality ?? 'balanced'} | Pressing ${homeTactics?.pressingIntensity ?? 'medium'} | Tempo ${homeTactics?.tempo ?? 'normal'} | Breite ${homeTactics?.width ?? 'normal'} | Abwehrlinie ${homeTactics?.defensiveLine ?? 'normal'}`,
    `⚙️ Taktik ${awayTeam.shortName}: Mentalität ${awayTactics?.mentality ?? 'balanced'} | Pressing ${awayTactics?.pressingIntensity ?? 'medium'} | Tempo ${awayTactics?.tempo ?? 'normal'} | Breite ${awayTactics?.width ?? 'normal'} | Abwehrlinie ${awayTactics?.defensiveLine ?? 'normal'}`,
    fmHome && fmAway ? `🔄 Formations-Matchup: ${fmHome} vs ${fmAway}` : '',
    ``,
    `🏟️ Heimvorteil: +${rd(homeAdv)} (Basis 5 + Ultra-Stärke ${homeTeam.fans.ultrasStrength} × 0.5)`,
    `🌤️ ${weatherNote}`,
    `⏱️ Nachspielzeit: 1. HZ +${injH1}', 2. HZ +${injH2}'`,
  ].filter(Boolean);

  return {
    matchId: match.id, matchDate: match.date, matchday: match.matchday,
    competition: match.competition, leagueId: match.leagueId,
    homeTeam, awayTeam,
    homePlayers: [...homePlayers], awayPlayers: [...awayPlayers],
    homeStarterIds: homePlayers.map(p => p.id), awayStarterIds: awayPlayers.map(p => p.id),
    homeScore: 0, awayScore: 0,
    homeStats: initStats(), awayStats: initStats(),
    events: [{ minute: 0, type: 'kick_off', teamId: homeTeam.id, description: `Anstoß! ${homeTeam.shortName} gegen ${awayTeam.shortName}`, devLog: kickOffLog }],
    weather, homeStrength: adjHome, awayStrength: adjAway, homeAdvantage: homeAdv,
    stamina, homeSubs: 0, awaySubs: 0,
    minutesPlayed: {}, subEntries: {},
    allHomePlayers: allPlayers.filter(p => p.teamId === homeTeam.id),
    allAwayPlayers: allPlayers.filter(p => p.teamId === awayTeam.id),
    playerTeamId,
    _rngSeed: rng.getSeed(),
    currentMinute: 0, injuryTimeHalf1: injH1, injuryTimeHalf2: injH2,
    isFinished: false,
    isDerby: homeTeam.rivals.includes(awayTeam.id),
    momentum: { home: 0, away: 0 },
    homePossessionAccum: 0,
    awayPossessionAccum: 0,
    shoutCooldownUntil: 0,
    halftimeTalkDone: false,
    homeManagerEffects: hmEffects,
    awayManagerEffects: amEffects,
    positionEffectiveness: posEff,
    homeTactics: hTac,
    awayTactics: aTac,
    isKnockout: ['cup', 'cl', 'el', 'ecl'].includes(match.competition) && match.cupRound !== undefined,
    isExtraTime: false,
    injuryTimeET1: rng.range(1, 3),
    injuryTimeET2: rng.range(1, 3),
    isPenaltyShootout: false,
    penaltyHome: 0,
    penaltyAway: 0,
    ballZone: 'center',
    attackingTeamId: homeTeam.id,
    lastEventType: undefined,
  };
}

// ════════════════════════════════════════════════════════
//  advanceLiveMatch — eine Minute simulieren
// ════════════════════════════════════════════════════════

export function advanceLiveMatch(ctx: LiveMatchContext): MatchEvent[] {
  if (ctx.isFinished) return [];
  ctx.currentMinute++;
  const minute = ctx.currentMinute;
  const rng = new MatchRNG(ctx._rngSeed);
  const newEvents: MatchEvent[] = [];

  // ── Momentum abklingen lassen (jede Minute -0.5, min 0) ──
  ctx.momentum.home = Math.max(0, ctx.momentum.home - 0.5);
  ctx.momentum.away = Math.max(0, ctx.momentum.away - 0.5);

  // ── Ausdauer verbrauchen (Manager-Fitness + Taktik-Pressing reduziert/erhöht Drain) ──
  for (const p of [...ctx.homePlayers, ...ctx.awayPlayers]) {
    const cur = ctx.stamina[p.id] ?? 80;
    const boosts = getPlayerTraitBoosts(p);
    const isHomePl = ctx.homePlayers.includes(p);
    const mgrFitness = isHomePl ? ctx.homeManagerEffects.fitnessBonus : ctx.awayManagerEffects.fitnessBonus;
    const tacStamDrain = isHomePl ? ctx.homeTactics.staminaDrain : ctx.awayTactics.staminaDrain;
    const baseDrain = (0.7 - (p.attributes.stamina ?? 70) * 0.004 - (boosts.staminaBoost ?? 0) * 0.01) * (1 - mgrFitness / 100);
    const drain = baseDrain + tacStamDrain; // Gegenpressing adds +0.10/min, low pressing saves -0.04/min
    ctx.stamina[p.id] = Math.max(5, cur - Math.max(0.15, drain));
  }

  // ── KI-Auswechslungen (nicht Spieler-Team) ──
  const tryAISub = (isHome: boolean) => {
    const subs = isHome ? ctx.homeSubs : ctx.awaySubs;
    const team = isHome ? ctx.homeTeam : ctx.awayTeam;
    if (subs >= 5 || minute < 55 || team.id === ctx.playerTeamId) return;
    if (!rng.chance(15)) return;

    const active = isHome ? ctx.homePlayers : ctx.awayPlayers;
    const allTeam = isHome ? ctx.allHomePlayers : ctx.allAwayPlayers;
    const activeIds = new Set(active.map(p => p.id));

    let worst: Player | null = null;
    let worstScore = Infinity;
    for (const p of active) {
      if (p.position === 'TW') continue;
      const sc = (ctx.stamina[p.id] ?? 80) + calcOverall(p) * 0.3;
      if (sc < worstScore) { worstScore = sc; worst = p; }
    }
    if (!worst) return;
    const wStam = ctx.stamina[worst.id] ?? 80;
    if (wStam > 45 && !rng.chance(5)) return;

    const bench = allTeam.filter(p => !activeIds.has(p.id) && p.position !== 'TW');
    if (bench.length === 0) return;
    const samePos = bench.filter(p => p.position === worst!.position);
    const repl = (samePos.length > 0 ? samePos : bench).sort((a, b) => calcOverall(b) - calcOverall(a))[0];
    const idx = active.findIndex(p => p.id === worst!.id);
    if (idx === -1) return;
    doSub(ctx, isHome, idx, repl, worst, minute, newEvents, rng);
  };
  tryAISub(true);
  tryAISub(false);

  // ════════════════════════════════════════════════════════════
  //  BALLBESITZ — Wer hat in dieser Minute die Kontrolle?
  //  Basiert auf Mittelfeld-Qualität, Pressing, Spielaufbau,
  //  Kondition, Heimvorteil und Momentum.
  // ════════════════════════════════════════════════════════════

  const poss = calcMidfieldControl(ctx);
  // Kleine Streuung (+/- 5%) damit nicht jede Minute identisch läuft
  const jitter = (rng.next() - 0.5) * 10;
  const effectiveHomePct = Math.max(20, Math.min(80, poss.homePct + jitter));
  const isHomeAtk = rng.next() * 100 < effectiveHomePct;

  // Ballbesitz-Statistik akkumulieren
  if (isHomeAtk) { ctx.homePossessionAccum++; } else { ctx.awayPossessionAccum++; }
  const totalPoss = ctx.homePossessionAccum + ctx.awayPossessionAccum || 1;
  ctx.homeStats.possession = Math.round((ctx.homePossessionAccum / totalPoss) * 100);
  ctx.awayStats.possession = 100 - ctx.homeStats.possession;

  const atkId = isHomeAtk ? ctx.homeTeam.id : ctx.awayTeam.id;
  const atkPlayers = isHomeAtk ? ctx.homePlayers : ctx.awayPlayers;
  const defPlayers = isHomeAtk ? ctx.awayPlayers : ctx.homePlayers;
  const atkStats = isHomeAtk ? ctx.homeStats : ctx.awayStats;
  const defStats = isHomeAtk ? ctx.awayStats : ctx.homeStats;
  const atkTeam = isHomeAtk ? ctx.homeTeam : ctx.awayTeam;
  const defTeam = isHomeAtk ? ctx.awayTeam : ctx.homeTeam;
  const atkComp = isHomeAtk ? poss.homeComponents : poss.awayComponents;

  // ── Update 2D pitch visualization data ──
  ctx.attackingTeamId = atkId;
  const zoneRoll = rng.next() * 100;
  if (isHomeAtk) {
    ctx.ballZone = zoneRoll < 20 ? 'home_midfield' : zoneRoll < 55 ? 'center' : zoneRoll < 85 ? 'away_midfield' : 'away_defense';
  } else {
    ctx.ballZone = zoneRoll < 20 ? 'away_midfield' : zoneRoll < 55 ? 'center' : zoneRoll < 85 ? 'home_midfield' : 'home_defense';
  }

  atkStats.passes += rng.range(3, 8);

  // ── Narration context for rich commentary ──
  const nCtx: NarrationContext = {
    atkTeam: atkTeam.shortName,
    defTeam: defTeam.shortName,
    score: `${ctx.homeScore}:${ctx.awayScore}`,
    minute,
    shooter: pickPlayerName(atkPlayers, ['ST', 'LA', 'RA', 'ZOM'], rng.next()),
    keeper: defPlayers.find(p => p.position === 'TW')?.lastName ?? 'Torwart',
    defender: pickPlayerName(defPlayers, ['IV', 'LV', 'RV'], rng.next()),
    midfielder: pickPlayerName(atkPlayers, ['ZM', 'ZDM', 'ZOM'], rng.next()),
    winger: pickPlayerName(atkPlayers, ['LA', 'RA', 'LM', 'RM'], rng.next()),
  };

  // ── Rich commentary system: atmosphere, tension, weather, tactics, buildup ──
  if (newEvents.length === 0) {
    const allBuildup = [...BUILDUP_NARRATIONS, ...BUILDUP_EXTENDED];
    const scoreDiff = ctx.homeScore - ctx.awayScore;
    const isAtkLeading = (isHomeAtk && scoreDiff > 0) || (!isHomeAtk && scoreDiff < 0);
    const isAtkTrailing = (isHomeAtk && scoreDiff < 0) || (!isHomeAtk && scoreDiff > 0);
    const isCloseGame = Math.abs(scoreDiff) <= 1;
    const isLateGame = minute >= 75;
    const isDominant = (isHomeAtk ? ctx.homeStats.possession : ctx.awayStats.possession) >= 65;

    // Atmosphere comments (~8% chance, more in early/late game)
    if (rng.chance(minute <= 5 || minute >= 85 ? 12 : 8)) {
      newEvents.push({ minute, type: 'tactical', teamId: '', description: narrate(ATMOSPHERE_NARRATIONS, nCtx, rng.next()) });
    }
    // Tension/drama comments based on game state (~12% in late game)
    else if (isLateGame && isCloseGame && rng.chance(15)) {
      const tensionCtx = { ...nCtx, minute: 90 - minute };
      newEvents.push({ minute, type: 'tactical', teamId: '', description: narrate(TENSION_CLOSE_GAME, tensionCtx, rng.next()) });
    }
    else if (isLateGame && isAtkTrailing && rng.chance(14)) {
      newEvents.push({ minute, type: 'tactical', teamId: atkId, description: narrate(TENSION_TRAILING, nCtx, rng.next()) });
    }
    else if (isAtkLeading && minute >= 60 && rng.chance(8)) {
      newEvents.push({ minute, type: 'tactical', teamId: atkId, description: narrate(TENSION_LEADING, nCtx, rng.next()) });
    }
    else if (isDominant && rng.chance(7)) {
      newEvents.push({ minute, type: 'tactical', teamId: atkId, description: narrate(TENSION_DOMINANT, nCtx, rng.next()) });
    }
    // Weather comments (~5%, only if bad weather)
    else if (['rain', 'heavy_rain', 'snow', 'hot', 'cold'].includes(ctx.weather.type) && rng.chance(5)) {
      newEvents.push({ minute, type: 'tactical', teamId: '', description: narrate(WEATHER_NARRATIONS, nCtx, rng.next()) });
    }
    // Tactical observations (~6%)
    else if (rng.chance(6)) {
      newEvents.push({ minute, type: 'tactical', teamId: atkId, description: narrate(TACTICAL_NARRATIONS, nCtx, rng.next()) });
    }
    // Standard buildup narration (~30%)
    else if (rng.chance(30)) {
      newEvents.push({ minute, type: 'tactical', teamId: atkId, description: narrate(allBuildup, nCtx, rng.next()) });
    }
  }

  // ── FOUL ──
  // Foulwahrscheinlichkeit steigt mit Pressing des Gegners und Aggression
  // Manager-Disziplin reduziert Foulchance des eigenen Teams
  const defField = defPlayers.filter(p => p.position !== 'TW');
  const defAggr = defField.length > 0 ? defField.reduce((s, p) => s + p.attributes.aggression, 0) / defField.length : 50;
  const defMgrDisc = isHomeAtk ? ctx.awayManagerEffects.disciplineBonus : ctx.homeManagerEffects.disciplineBonus;
  const defTac = isHomeAtk ? ctx.awayTactics : ctx.homeTactics;
  const atkTac = isHomeAtk ? ctx.homeTactics : ctx.awayTactics;
  const foulPct = (1.5 + defAggr * 0.02 + (ctx.isDerby ? 1 : 0)) * (1 - defMgrDisc / 100) * defTac.foulRiskMod;
  if (rng.chance(foulPct)) {
    const fIdx = rng.range(1, defPlayers.length - 1);
    const fouler = defPlayers[fIdx];
    defStats.fouls++;
    const fouledPlayer = atkPlayers[rng.range(1, atkPlayers.length - 1)];
    const foulNCtx = { ...nCtx, fouler: fouler?.lastName ?? '???', fouled: fouledPlayer?.lastName ?? '???' };
    newEvents.push({
      minute, type: 'foul', teamId: defTeam.id, playerId: fouler?.id,
      description: narrate(FOUL_NARRATIONS, foulNCtx, rng.next()),
      devLog: [
        `⚠️ FOUL`,
        `Foulwahrscheinlichkeit: ${rd(foulPct)}%`,
        `  Basis: 1,5% pro Minute`,
        `  + Ø Aggression der Verteidiger (${rd(defAggr)}) × 0.02 = +${rd(defAggr * 0.02)}%`,
        ctx.isDerby ? `  + Derby-Zuschlag: +1%` : '',
        `${fouler?.lastName} (${fouler?.position}) von ${defTeam.shortName} foult.`,
      ].filter(Boolean),
    });
    // Gelbe Karte: höhere Aggression = höhere Chance
    const yellowPct = 18 + (fouler?.attributes.aggression ?? 50) * 0.12;
    if (rng.chance(yellowPct) && fouler) {
      // Check if player already has a yellow in this match (= second yellow → red)
      const priorYellows = ctx.events.filter(e => e.type === 'yellow_card' && e.playerId === fouler.id).length;
      if (priorYellows >= 1) {
        // Gelb-Rot!
        defStats.yellowCards++;
        defStats.redCards++;
        newEvents.push({
          minute, type: 'yellow_card', teamId: defTeam.id, playerId: fouler.id,
          description: `Gelb-Rot für ${fouler.lastName}!`,
          devLog: [
            `🟨🟥 GELB-ROT!`,
            `${fouler.lastName} sieht die zweite Gelbe Karte und muss vom Platz!`,
          ],
        });
        newEvents.push({
          minute, type: 'red_card', teamId: defTeam.id, playerId: fouler.id,
          description: `${fouler.lastName} fliegt mit Gelb-Rot vom Platz!`,
          devLog: [`🟥 PLATZVERWEIS — Gelb-Rot für ${fouler.lastName}`],
        });
      } else {
        defStats.yellowCards++;
        newEvents.push({
          minute, type: 'yellow_card', teamId: defTeam.id, playerId: fouler.id,
          description: narrate(YELLOW_NARRATIONS, { ...nCtx, fouler: fouler.lastName }, rng.next()),
          devLog: [
            `🟨 GELBE KARTE`,
            `Gelb-Wahrscheinlichkeit: ${rd(yellowPct)}%`,
            `  Basis 18% + Aggression (${fouler.attributes.aggression}) × 0.12`,
            `${fouler.lastName} wird verwarnt.`,
          ],
        });
      }
    }
    // Direkte Rote Karte: sehr selten, nur bei hoher Aggression + brutales Foul
    if (fouler && !rng.chance(yellowPct)) {
      const redPct = 0.3 + (fouler.attributes.aggression > 80 ? 0.5 : 0) + (ctx.isDerby ? 0.3 : 0);
      if (rng.chance(redPct)) {
        defStats.redCards++;
        newEvents.push({
          minute, type: 'red_card', teamId: defTeam.id, playerId: fouler.id,
          description: `Rote Karte für ${fouler.lastName}! Direkter Platzverweis!`,
          devLog: [
            `🟥 DIREKTE ROTE KARTE!`,
            `Rot-Wahrscheinlichkeit: ${rd(redPct)}% (Basis 0,3% + Aggression-Bonus)`,
            `${fouler.lastName} fliegt vom Platz!`,
          ],
        });
      }
    }
  }

  // ── ECKE (basiert auf Angriffsdruck × Breite-Taktik) ──
  const atkField = atkPlayers.filter(p => p.position !== 'TW');
  const atkCross = atkField.reduce((s, p) => s + (p.attributes.crossing ?? 50), 0) / (atkField.length || 1);
  const cornerPct = (1.5 + atkCross * 0.02) * atkTac.crossingMod;
  if (rng.chance(cornerPct)) {
    atkStats.corners++;
    newEvents.push({ minute, type: 'corner', teamId: atkId, description: narrate(CORNER_NARRATIONS, nCtx, rng.next()),
      devLog: [
        `📐 ECKE`,
        `Eckball-Chance: ${rd(cornerPct)}% (Basis 1,5% + Ø Flanken-Wert ${rd(atkCross)} × 0.02)`,
      ] });
  }

  // ── ABSEITS (basiert auf Positionierung der Stürmer vs. Verteidiger) ──
  const atkFwd = atkPlayers.filter(p => ['ST', 'LA', 'RA'].includes(p.position));
  const defDefs = defPlayers.filter(p => ['IV', 'LV', 'RV'].includes(p.position));
  const avgAtkPos = atkFwd.length > 0 ? atkFwd.reduce((s, p) => s + p.attributes.positioning, 0) / atkFwd.length : 60;
  const avgDefLine = defDefs.length > 0 ? defDefs.reduce((s, p) => s + p.attributes.positioning, 0) / defDefs.length : 60;
  // Gutes Verteidiger-Positioning = mehr Abseitsfallen; Taktik-Abseitsfalle verstärkt
  const offsidePct = Math.max(0.3, (1.0 + (avgDefLine - avgAtkPos) * 0.02) * defTac.offsideTrapMod);
  if (rng.chance(offsidePct)) {
    atkStats.offsides++;
    newEvents.push({ minute, type: 'offside', teamId: atkId, description: narrate(OFFSIDE_NARRATIONS, { ...nCtx, shooter: pickPlayerName(atkPlayers, ['ST', 'LA', 'RA'], rng.next()) }, rng.next()),
      devLog: [
        `🚩 ABSEITS`,
        `Abseitschance: ${rd(offsidePct)}%`,
        `  Ø Positionierung Verteidiger: ${rd(avgDefLine)}`,
        `  Ø Positionierung Angreifer: ${rd(avgAtkPos)}`,
        `  Differenz (${rd(avgDefLine - avgAtkPos)}) × 0.02 = ${rd((avgDefLine - avgAtkPos) * 0.02)}%`,
        `  → Bessere Verteidiger-Positionierung = mehr Abseitsfallen.`,
      ] });
    ctx._rngSeed = rng.getSeed();
    ctx.events.push(...newEvents);
    checkPeriodEnd(ctx, minute, newEvents);
    return newEvents;
  }

  // ════════════════════════════════════════════════════════════
  //  TORSCHUSS — Entsteht eine Schusschance?
  //  Basiert auf Mittelfeld-Kontrolle + Angriffsstärke
  // ════════════════════════════════════════════════════════════

  const atkFwdQual = atkFwd.length > 0
    ? atkFwd.reduce((s, p) => {
        const st = Math.max(0.6, (ctx.stamina[p.id] ?? 80) / 100);
        const eff = ctx.positionEffectiveness[p.id] ?? 1.0;
        const practice = 0.85 + ((p.matchPractice ?? 50) / 100) * 0.15; // 0.85-1.0
        return s + (p.attributes.finishing * 0.3 + p.attributes.shooting * 0.25 + p.attributes.dribbling * 0.2 + p.attributes.positioning * 0.25) * st * (0.3 + 0.7 * eff) * practice;
      }, 0) / atkFwd.length
    : 50;
  // Space-behind-risk: high defensive line is exploitable by fast attackers
  const avgAtkPace = atkFwd.length > 0
    ? atkFwd.reduce((s, p) => s + (p.attributes.pace + p.attributes.acceleration) / 2, 0) / atkFwd.length
    : 55;
  const spaceBehind = defTac.spaceBehindRisk * Math.max(0, (avgAtkPace - 55)) * 0.04; // fast attackers (pace>55) exploit high line
  // Shot chance: base + midfield control + forward quality + pressing
  // × Tempo modifier (fast = more chances) + attack bonus from mentality
  // + counter-attack chance (long/direct passing can bypass midfield)
  // + space-behind bonus (high line vs fast attackers)
  const counterBonus = atkTac.counterMod > 0 && rng.chance(atkTac.counterMod * 100) ? 3 : 0;
  const shotPct = (5 + atkComp.midfield * 0.04 + atkFwdQual * 0.06 + atkComp.pressing * 0.02 + atkTac.attackBonus * 0.15 + counterBonus + spaceBehind) * atkTac.tempoMod;
  if (!rng.chance(shotPct)) {
    ctx._rngSeed = rng.getSeed();
    ctx.events.push(...newEvents);
    checkPeriodEnd(ctx, minute, newEvents);
    return newEvents;
  }

  // ── SCHÜTZE WÄHLEN (gewichtet nach Position und Stärke) ──
  const fwd = atkPlayers.filter(p => ['ST', 'LA', 'RA', 'ZOM'].includes(p.position));
  const mid = atkPlayers.filter(p => ['ZM', 'ZDM'].includes(p.position));
  const def = atkPlayers.filter(p => ['IV', 'LV', 'RV'].includes(p.position));
  const pool = [...fwd, ...fwd, ...fwd, ...mid, ...mid];
  if (rng.chance(8) && def.length > 0) pool.push(def[rng.range(0, def.length - 1)]);
  const shooter = pool.length > 0 ? pool[rng.range(0, pool.length - 1)] : atkPlayers.length > 1 ? atkPlayers[rng.range(1, atkPlayers.length - 1)] : atkPlayers[0];
  if (!shooter) {
    // No valid attacker found (empty lineup) — skip this minute
    ctx._rngSeed = rng.getSeed();
    ctx.events.push(...newEvents);
    checkPeriodEnd(ctx, minute, newEvents);
    return newEvents;
  }
  atkStats.shots++;

  // ── SCHUSS BERECHNEN ──
  const sBst = getPlayerTraitBoosts(shooter);
  const sStam = ctx.stamina[shooter.id] ?? 80;
  const sStamF = Math.max(0.7, sStam / 100);
  const isClutch = minute >= 75;
  const clutchB = isClutch ? (sBst.clutchFactor ?? 0) : 0;

  const shootA = shooter.attributes.shooting;
  const finishA = shooter.attributes.finishing;
  const baseAcc = (shootA + finishA) / 2;
  const traitGoal = (sBst.goalChance ?? 0) + (sBst.longShotChance ?? 0) * 0.3 + clutchB * 0.5;
  const stamEff = (sStamF - 1) * 15;
  const practicePenalty = (1 - (shooter.matchPractice ?? 50) / 100) * -3; // low practice = up to -3 accuracy
  const onTargetThr = 35 + baseAcc * 0.35 + traitGoal * 0.3 + stamEff + practicePenalty;
  const rollOT = rng.next() * 100;
  const isOnTarget = rollOT < onTargetThr;

  const hC = poss.homeComponents;
  const aC = poss.awayComponents;
  const log: string[] = [
    `═══ TORSCHUSS ═══`,
    ``,
    `👤 Schütze: ${shooter.lastName} (${shooter.position}, Gesamtwert ${calcOverall(shooter)})`,
    ``,
    `📋 SCHRITT 1 — Wer hat in dieser Minute den Ball?`,
    `   Mittelfeld-Kontrolle bestimmt, wer angreift.`,
    `   Jedes Team bekommt einen Kontroll-Score basierend auf:`,
    ``,
    `   ${ctx.homeTeam.shortName} (Heim):`,
    `     Mittelfeld-Qualität (Pass/Vision/Ballkontrolle): ${hC.midfield} × 35%`,
    `     Pressing (Einsatz/Aggression):                   ${hC.pressing} × 25%`,
    `     Spielaufbau (Verteidiger-Pass/TW):                ${hC.buildup} × 15%`,
    `     Ø Kondition:                                      ${hC.staminaEffect} × 15%`,
    `     Heimvorteil:                                     +${hC.homeBonus}`,
    `     Momentum:                                        +${hC.momentum} × 10%`,
    ``,
    `   ${ctx.awayTeam.shortName} (Gast):`,
    `     Mittelfeld-Qualität:  ${aC.midfield} × 35%`,
    `     Pressing:             ${aC.pressing} × 25%`,
    `     Spielaufbau:          ${aC.buildup} × 15%`,
    `     Ø Kondition:          ${aC.staminaEffect} × 15%`,
    `     Heimvorteil:         +${aC.homeBonus}`,
    `     Momentum:            +${aC.momentum} × 10%`,
    ``,
    `   → Kontroll-Score: ${ctx.homeTeam.shortName} ${rd(poss.homeControl)} vs ${ctx.awayTeam.shortName} ${rd(poss.awayControl)}`,
    `   → Ballbesitz-Wahrscheinlichkeit: ${ctx.homeTeam.shortName} ${rd(poss.homePct)}%`,
    `   → Streuung dieser Minute: ${rd(jitter > 0 ? jitter : jitter)}% → Effektiv: ${rd(effectiveHomePct)}%`,
    `   → ${atkTeam.shortName} gewinnt diese Minute.`,
    `   → Aktueller Ballbesitz: ${ctx.homeStats.possession}% : ${ctx.awayStats.possession}%`,
    ``,
    `📋 SCHRITT 2 — Entsteht ein Torschuss?`,
    `   Schusschance: ${rd(shotPct)}%`,
    `   = 5% Basis`,
    `   + Mittelfeld-Kontrolle (${rd(atkComp.midfield)}) × 0.04 = +${rd(atkComp.midfield * 0.04)}%`,
    `   + Ø Angriffsstärke (${rd(atkFwdQual)}) × 0.06 = +${rd(atkFwdQual * 0.06)}%`,
    `   + Pressing (${rd(atkComp.pressing)}) × 0.02 = +${rd(atkComp.pressing * 0.02)}%`,
    `   → Ja, es kommt zum Schuss.`,
    ``,
    `📋 SCHRITT 3 — Wer schießt?`,
    `   Stürmer (ST/LA/RA/ZOM) sind 3× wahrscheinlicher als Mittelfeldspieler.`,
    `   Verteidiger nur in 8% der Fälle (Kopfball, Standard).`,
    `   → Gewählt: ${shooter.lastName} (${shooter.position})`,
    ``,
    `📋 SCHRITT 4 — Ist der Schuss aufs Tor?`,
    `   Basis:          35%`,
    `   + Schuss (${shootA}) und Abschluss (${finishA})`,
    `     → Ø ${rd(baseAcc)} × 0.35 = +${rd(baseAcc * 0.35)}%`,
  ];

  const sTraits = describeTraits(shooter);
  if (sTraits.length > 0) { log.push(`   Aktive Traits:`); sTraits.forEach(t => log.push(`     ${t}`)); }
  if (traitGoal !== 0) log.push(`   + Trait-Bonus: ${rd(traitGoal)} × 0.3 = +${rd(traitGoal * 0.3)}%`);
  if (isClutch && clutchB > 0) log.push(`   ⏱️ Schlussphase (ab 75'): Entscheider-Bonus +${rd(clutchB * 0.5)}%`);
  if (stamEff !== 0) log.push(`   + Kondition: ${rd(sStam)}% → Effekt: ${rd(stamEff)}%`);

  log.push(
    `   ─────────────────────────`,
    `   Schwellenwert (Schuss aufs Tor): ${rd(onTargetThr)}%`,
    `   Ausführung: ${rd(rollOT)}% (je niedriger, desto besser)`,
    `   → ${isOnTarget ? `${rd(rollOT)} < ${rd(onTargetThr)} → ✅ AUFS TOR` : `${rd(rollOT)} ≥ ${rd(onTargetThr)} → ❌ DANEBEN`}`,
  );

  if (!isOnTarget) {
    const miss: MatchEventType = rng.chance(30) ? 'shot_post' : 'shot_missed';
    log.push(``, miss === 'shot_post' ? `Der Ball trifft den Pfosten! (30% Chance bei Fehlschuss)` : `Der Schuss geht am Tor vorbei.`);
    const shotNCtx = { ...nCtx, shooter: shooter.lastName };
    newEvents.push({ minute, type: miss, teamId: atkId, playerId: shooter.id,
      description: miss === 'shot_post' ? narrate(POST_NARRATIONS, shotNCtx, rng.next()) : narrate(MISS_NARRATIONS, shotNCtx, rng.next()), devLog: log });
    ctx._rngSeed = rng.getSeed(); ctx.events.push(...newEvents);
    checkPeriodEnd(ctx, minute, newEvents); return newEvents;
  }

  atkStats.shotsOnTarget++;

  // ════════════════════════════════════════════════════════════
  //  TORWART-DUELL — Schütze vs. Keeper
  // ════════════════════════════════════════════════════════════

  const gk = defPlayers.find(p => p.position === 'TW');
  const gkBst = gk ? getPlayerTraitBoosts(gk) : {};
  const gkAbi = gk ? (gk.attributes.reflexes + gk.attributes.diving + gk.attributes.oneOnOne) / 3 : 50;
  const gkStam = gk ? (ctx.stamina[gk.id] ?? 80) : 80;
  const gkStamF = Math.max(0.7, gkStam / 100);
  const gkTrait = (gkBst.saveChance ?? 0) + (isClutch ? (gkBst.clutchFactor ?? 0) * 0.3 : 0);
  // Defensive tactics modifier: defensive mentality makes it harder to score
  const defTacBonus = defTac.defenseBonus * 0.25; // +10 def mentality → -2.5% goal chance
  // Defender quality: average positioning+strength of defenders reduces goal chance
  const defLineQual = defDefs.length > 0
    ? defDefs.reduce((s, p) => s + (p.attributes.positioning * 0.4 + p.attributes.strength * 0.3 + p.attributes.heading * 0.15 + p.attributes.composure * 0.15), 0) / defDefs.length
    : 55;
  const defLineEffect = (defLineQual - 55) * 0.08; // above-average defenders reduce goal chance
  // Situationsschwankung: +/-8 simuliert Glück/Pech (unregelmäßige Abpraller, Wind, etc.)
  const swing = rng.range(-8, 8);
  const goalPct = 32 + baseAcc * 0.3 + traitGoal * 0.5 + stamEff - gkAbi * 0.15 * gkStamF - gkTrait * 0.4 - defTacBonus - defLineEffect + swing;
  const rollG = rng.next() * 100;
  const isGoal = rollG < goalPct;

  log.push(
    ``, `═══ TORWART-DUELL ═══`, ``,
    `🧤 Torwart: ${gk?.lastName ?? '—'} (Gesamtwert ${gk ? calcOverall(gk) : 0})`,
    `   Reflexe: ${gk?.attributes.reflexes ?? 0}, Hechten: ${gk?.attributes.diving ?? 0}, 1-gegen-1: ${gk?.attributes.oneOnOne ?? 0}`,
    `   → Ø TW-Stärke: ${rd(gkAbi)}, Kondition: ${rd(gkStam)}%`,
  );
  const gkTraits = gk ? describeTraits(gk) : [];
  if (gkTraits.length > 0) { log.push(`   Traits:`); gkTraits.forEach(t => log.push(`     ${t}`)); }

  log.push(
    ``, `📋 SCHRITT 5 — Fällt das Tor?`,
    `   Basiswert:               32%`,
    `   + Schussqualität:        ${rd(baseAcc)} × 0.3 = +${rd(baseAcc * 0.3)}%`,
    `   + Trait-Bonus Angreifer: ${rd(traitGoal)} × 0.5 = +${rd(traitGoal * 0.5)}%`,
    `   + Kondition Schütze:     ${rd(stamEff)}%`,
    `   − TW-Stärke:            ${rd(gkAbi)} × 0.15 × ${rd(gkStamF)} = −${rd(gkAbi * 0.15 * gkStamF)}%`,
    `   − TW-Trait-Bonus:       ${rd(gkTrait)} × 0.4 = −${rd(gkTrait * 0.4)}%`,
    `   − Abwehr-Taktik:         ${rd(defTac.defenseBonus)} × 0.25 = −${rd(defTacBonus)}%`,
    `   − Abwehr-Qualität:       Ø ${rd(defLineQual)} (−55) × 0.08 = −${rd(defLineEffect)}%`,
    `   ± Situation (Glück/Pech): ${swing > 0 ? '+' : ''}${swing}%`,
    `   ─────────────────────────`,
    `   Torwahrscheinlichkeit:   ${rd(goalPct)}%`,
    `   Ausführung:              ${rd(rollG)}% (je niedriger, desto besser)`,
    `   → ${isGoal ? `${rd(rollG)} < ${rd(goalPct)} → ⚽ TOR!!!` : `${rd(rollG)} ≥ ${rd(goalPct)} → 🧤 GEHALTEN!`}`,
  );

  if (!isGoal) {
    const saveFlavor = gk ? getTraitFlavorForSave(gk) : '';
    newEvents.push({ minute, type: 'shot_saved', teamId: atkId, playerId: shooter.id, secondPlayerId: gk?.id,
      description: narrate(SAVE_NARRATIONS, { ...nCtx, shooter: shooter.lastName, keeper: gk?.lastName ?? 'Torwart' }, rng.next()) + saveFlavor, devLog: log });
    ctx._rngSeed = rng.getSeed(); ctx.events.push(...newEvents);
    checkPeriodEnd(ctx, minute, newEvents); return newEvents;
  }

  // ── TOR ──
  if (isHomeAtk) ctx.homeScore++; else ctx.awayScore++;

  // Momentum: Tor erzeugt Gegendruck beim anderen Team
  if (isHomeAtk) { ctx.momentum.away += 8; ctx.momentum.home = Math.max(0, ctx.momentum.home - 3); }
  else           { ctx.momentum.home += 8; ctx.momentum.away = Math.max(0, ctx.momentum.away - 3); }

  const assisters = atkPlayers.filter(p => p.id !== shooter.id && p.position !== 'TW');
  const assister = rng.chance(65) && assisters.length > 0
    ? assisters[rng.range(0, assisters.length - 1)] : undefined;

  // Rich goal narration with updated score
  const goalNCtx = { ...nCtx, shooter: shooter.lastName, assister: assister?.lastName ?? '', score: `${ctx.homeScore}:${ctx.awayScore}` };
  const traitFlavor = getTraitFlavorForGoal(shooter);
  const assistFlavor = assister ? getTraitFlavorForAssist(assister) : '';
  const gDesc = (assister
    ? narrate(GOAL_WITH_ASSIST, goalNCtx, rng.next())
    : narrate(GOAL_SOLO, goalNCtx, rng.next())) + traitFlavor;

  log.push(``, `🎉 Neuer Spielstand: ${ctx.homeScore}:${ctx.awayScore}`);
  log.push(`   📈 Momentum-Schub: ${isHomeAtk ? ctx.awayTeam.shortName : ctx.homeTeam.shortName} bekommt +8 Momentum (Gegendruck nach Gegentor).`);
  if (assister) {
    const aBst = getPlayerTraitBoosts(assister);
    log.push(``, `🅰️ Vorlagengeber: ${assister.lastName} (${assister.position}, GES ${calcOverall(assister)}, Vision ${assister.attributes.vision})`);
    log.push(`   65%-Chance auf einen Vorlagengeber bei einem Tor.`);
    if ((aBst.assistChance ?? 0) > 0) log.push(`   Trait-Bonus auf Vorlagen: +${aBst.assistChance}`);
  }

  newEvents.push({ minute, type: 'goal', teamId: atkId, playerId: shooter.id, secondPlayerId: assister?.id, description: gDesc, devLog: log });
  if (assister) newEvents.push({ minute, type: 'assist', teamId: atkId, playerId: assister.id, description: `Vorlage von ${assister.lastName}${assistFlavor}` });

  ctx._rngSeed = rng.getSeed(); ctx.events.push(...newEvents);
  checkPeriodEnd(ctx, minute, newEvents);
  return newEvents;
}

// ── Halbzeit / Abpfiff Prüfung ──

function checkPeriodEnd(ctx: LiveMatchContext, minute: number, newEvents: MatchEvent[]): void {
  // ── Regular half-time (45') ──
  if (minute === 45 + ctx.injuryTimeHalf1 && !ctx.isExtraTime) {
    const ev: MatchEvent = {
      minute: 45, type: 'half_time', teamId: '',
      description: `Halbzeit! ${ctx.homeScore}:${ctx.awayScore}`,
      devLog: [
        `══════ HALBZEIT ══════`,
        `Spielstand: ${ctx.homeScore}:${ctx.awayScore}`,
        `Ballbesitz: ${ctx.homeStats.possession}% : ${ctx.awayStats.possession}%`,
        `${ctx.homeTeam.shortName}: ${ctx.homeStats.shots} Schüsse (${ctx.homeStats.shotsOnTarget} aufs Tor)`,
        `${ctx.awayTeam.shortName}: ${ctx.awayStats.shots} Schüsse (${ctx.awayStats.shotsOnTarget} aufs Tor)`,
        `Wechsel: ${ctx.homeTeam.shortName} ${ctx.homeSubs}/5, ${ctx.awayTeam.shortName} ${ctx.awaySubs}/5`,
        `Momentum: ${ctx.homeTeam.shortName} ${rd(ctx.momentum.home)}, ${ctx.awayTeam.shortName} ${rd(ctx.momentum.away)}`,
      ],
    };
    newEvents.push(ev); ctx.events.push(ev);
  }

  // ── Regular full-time (90') ──
  if (minute === 90 + ctx.injuryTimeHalf2 && !ctx.isExtraTime) {
    const isDraw = ctx.homeScore === ctx.awayScore;

    if (isDraw && ctx.isKnockout) {
      // Knockout match drawn → extra time!
      ctx.isExtraTime = true;
      const ev: MatchEvent = {
        minute: 90, type: 'extra_time_start', teamId: '',
        description: `Unentschieden nach 90 Minuten! Es geht in die Verlängerung!`,
        devLog: [
          `══════ VERLÄNGERUNG ══════`,
          `Spielstand nach 90': ${ctx.homeScore}:${ctx.awayScore}`,
          `2 × 15 Minuten Verlängerung`,
        ],
      };
      newEvents.push(ev); ctx.events.push(ev);
      // Don't finish — game continues
      return;
    }

    // Normal end (league, or knockout with a winner)
    ctx.isFinished = true;
    const ev: MatchEvent = {
      minute: 90, type: 'full_time', teamId: '',
      description: `Abpfiff! Endstand: ${ctx.homeScore}:${ctx.awayScore}`,
      devLog: [
        `══════ ABPFIFF ══════`,
        `Endstand: ${ctx.homeScore}:${ctx.awayScore}`,
        `Ballbesitz: ${ctx.homeStats.possession}% : ${ctx.awayStats.possession}%`,
        `Torschüsse: ${ctx.homeStats.shots} : ${ctx.awayStats.shots}`,
        `Aufs Tor: ${ctx.homeStats.shotsOnTarget} : ${ctx.awayStats.shotsOnTarget}`,
        `Ecken: ${ctx.homeStats.corners} : ${ctx.awayStats.corners}`,
        `Fouls: ${ctx.homeStats.fouls} : ${ctx.awayStats.fouls}`,
      ],
    };
    newEvents.push(ev); ctx.events.push(ev);
    return;
  }

  // ── Extra time half-time (105') ──
  if (ctx.isExtraTime && minute === 105 + ctx.injuryTimeET1) {
    const ev: MatchEvent = {
      minute: 105, type: 'half_time', teamId: '',
      description: `Halbzeit der Verlängerung! ${ctx.homeScore}:${ctx.awayScore}`,
      devLog: [`══════ HALBZEIT VERLÄNGERUNG ══════`, `Spielstand: ${ctx.homeScore}:${ctx.awayScore}`],
    };
    newEvents.push(ev); ctx.events.push(ev);
  }

  // ── Extra time full-time (120') ──
  if (ctx.isExtraTime && minute === 120 + ctx.injuryTimeET2) {
    const isDraw = ctx.homeScore === ctx.awayScore;

    if (isDraw) {
      // Still drawn → penalty shootout!
      ctx.isPenaltyShootout = true;
      const ev: MatchEvent = {
        minute: 120, type: 'extra_time_end', teamId: '',
        description: `Verlängerung vorbei! ${ctx.homeScore}:${ctx.awayScore} — Es geht ins Elfmeterschießen!`,
        devLog: [`══════ ELFMETERSCHIESSEN ══════`],
      };
      newEvents.push(ev); ctx.events.push(ev);

      // Simulate penalty shootout immediately
      const penResult = simulatePenaltyShootout(ctx);
      ctx.penaltyHome = penResult.homeGoals;
      ctx.penaltyAway = penResult.awayGoals;
      for (const pev of penResult.events) {
        newEvents.push(pev);
        ctx.events.push(pev);
      }

      ctx.isFinished = true;
      const finalEv: MatchEvent = {
        minute: 120, type: 'full_time', teamId: '',
        description: `Endstand: ${ctx.homeScore}:${ctx.awayScore} (${penResult.homeGoals}:${penResult.awayGoals} i.E.)`,
        devLog: [
          `══════ ABPFIFF ══════`,
          `Endstand nach Elfmeterschießen: ${ctx.homeScore}:${ctx.awayScore} (${penResult.homeGoals}:${penResult.awayGoals} i.E.)`,
          `Sieger: ${penResult.homeGoals > penResult.awayGoals ? ctx.homeTeam.shortName : ctx.awayTeam.shortName}`,
        ],
      };
      newEvents.push(finalEv); ctx.events.push(finalEv);
    } else {
      // Extra time produced a winner
      ctx.isFinished = true;
      const ev: MatchEvent = {
        minute: 120, type: 'full_time', teamId: '',
        description: `Abpfiff nach Verlängerung! Endstand: ${ctx.homeScore}:${ctx.awayScore}`,
        devLog: [
          `══════ ABPFIFF NACH VERLÄNGERUNG ══════`,
          `Endstand: ${ctx.homeScore}:${ctx.awayScore}`,
        ],
      };
      newEvents.push(ev); ctx.events.push(ev);
    }
  }
}

// ════════════════════════════════════════════════════════
//  Penalty Shootout Simulation
// ════════════════════════════════════════════════════════

interface PenaltyShootoutResult {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
}

function simulatePenaltyShootout(ctx: LiveMatchContext): PenaltyShootoutResult {
  const rng = new MatchRNG(ctx._rngSeed + 9999);
  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;

  // Pick penalty takers (best composure/finishing first)
  const pickTakers = (players: Player[]): Player[] => {
    return [...players].sort((a, b) => {
      const aScore = (a.attributes.composure ?? 60) + (a.attributes.finishing ?? 60) + (a.attributes.freeKick ?? 50);
      const bScore = (b.attributes.composure ?? 60) + (b.attributes.finishing ?? 60) + (b.attributes.freeKick ?? 50);
      return bScore - aScore;
    }).slice(0, 5);
  };

  const homeTakers = pickTakers(ctx.homePlayers.filter(p => p.position !== 'TW'));
  const awayTakers = pickTakers(ctx.awayPlayers.filter(p => p.position !== 'TW'));
  const homeGK = ctx.homePlayers.find(p => p.position === 'TW');
  const awayGK = ctx.awayPlayers.find(p => p.position === 'TW');

  // Best-of-5 rounds
  for (let round = 0; round < 5; round++) {
    // Home shoots
    const hTaker = homeTakers[round % homeTakers.length];
    const hScoreChance = 0.72 + (hTaker.attributes.composure ?? 60) * 0.001 + (hTaker.attributes.finishing ?? 60) * 0.001;
    const hSaveChance = awayGK ? (awayGK.attributes.reflexes ?? 60) * 0.002 + (awayGK.attributes.diving ?? 60) * 0.001 : 0;
    const hScored = rng.next() < (hScoreChance - hSaveChance);

    if (hScored) {
      homeGoals++;
      events.push({
        minute: 120, type: 'penalty_scored', teamId: ctx.homeTeam.id,
        playerId: hTaker.id,
        description: `⚽ ${hTaker.lastName} verwandelt! (${homeGoals}:${awayGoals} i.E.)`,
      });
    } else {
      const saved = rng.next() < 0.5;
      events.push({
        minute: 120, type: saved ? 'penalty_saved' : 'penalty_missed', teamId: ctx.homeTeam.id,
        playerId: hTaker.id, secondPlayerId: awayGK?.id,
        description: saved
          ? `🧤 ${awayGK?.lastName ?? 'Torwart'} hält! ${hTaker.lastName} gescheitert. (${homeGoals}:${awayGoals} i.E.)`
          : `❌ ${hTaker.lastName} verschießt! (${homeGoals}:${awayGoals} i.E.)`,
      });
    }

    // Away shoots
    const aTaker = awayTakers[round % awayTakers.length];
    const aScoreChance = 0.72 + (aTaker.attributes.composure ?? 60) * 0.001 + (aTaker.attributes.finishing ?? 60) * 0.001;
    const aSaveChance = homeGK ? (homeGK.attributes.reflexes ?? 60) * 0.002 + (homeGK.attributes.diving ?? 60) * 0.001 : 0;
    const aScored = rng.next() < (aScoreChance - aSaveChance);

    if (aScored) {
      awayGoals++;
      events.push({
        minute: 120, type: 'penalty_scored', teamId: ctx.awayTeam.id,
        playerId: aTaker.id,
        description: `⚽ ${aTaker.lastName} verwandelt! (${homeGoals}:${awayGoals} i.E.)`,
      });
    } else {
      const saved = rng.next() < 0.5;
      events.push({
        minute: 120, type: saved ? 'penalty_saved' : 'penalty_missed', teamId: ctx.awayTeam.id,
        playerId: aTaker.id, secondPlayerId: homeGK?.id,
        description: saved
          ? `🧤 ${homeGK?.lastName ?? 'Torwart'} hält! ${aTaker.lastName} gescheitert. (${homeGoals}:${awayGoals} i.E.)`
          : `❌ ${aTaker.lastName} verschießt! (${homeGoals}:${awayGoals} i.E.)`,
      });
    }

    // Early termination: if one side can't catch up
    const remainingRounds = 4 - round;
    if (homeGoals - awayGoals > remainingRounds) break; // home wins
    if (awayGoals - homeGoals > remainingRounds) break; // away wins
  }

  // Sudden death if still tied after 5 rounds
  let sdRound = 0;
  while (homeGoals === awayGoals && sdRound < 10) {
    sdRound++;
    const hIdx = (4 + sdRound) % homeTakers.length;
    const aIdx = (4 + sdRound) % awayTakers.length;
    const hT = homeTakers[hIdx];
    const aT = awayTakers[aIdx];

    const hScored = rng.next() < 0.70;
    if (hScored) homeGoals++;
    events.push({
      minute: 120, type: hScored ? 'penalty_scored' : 'penalty_missed',
      teamId: ctx.homeTeam.id, playerId: hT.id,
      description: hScored
        ? `⚽ ${hT.lastName} verwandelt! (${homeGoals}:${awayGoals} i.E.)`
        : `❌ ${hT.lastName} verschießt! (${homeGoals}:${awayGoals} i.E.)`,
    });

    const aScored = rng.next() < 0.70;
    if (aScored) awayGoals++;
    events.push({
      minute: 120, type: aScored ? 'penalty_scored' : 'penalty_missed',
      teamId: ctx.awayTeam.id, playerId: aT.id,
      description: aScored
        ? `⚽ ${aT.lastName} verwandelt! (${homeGoals}:${awayGoals} i.E.)`
        : `❌ ${aT.lastName} verschießt! (${homeGoals}:${awayGoals} i.E.)`,
    });

    // After both shoot in sudden death, check if one leads
    if (homeGoals !== awayGoals) break;
  }

  // Absolute fallback: if still tied after 10 sudden death rounds, coin flip
  if (homeGoals === awayGoals) {
    if (rng.next() > 0.5) homeGoals++;
    else awayGoals++;
  }

  events.push({
    minute: 120, type: 'penalty_shootout', teamId: homeGoals > awayGoals ? ctx.homeTeam.id : ctx.awayTeam.id,
    description: `Elfmeterschießen beendet! ${homeGoals}:${awayGoals} — ${homeGoals > awayGoals ? ctx.homeTeam.shortName : ctx.awayTeam.shortName} gewinnt!`,
  });

  return { homeGoals, awayGoals, events };
}

// ════════════════════════════════════════════════════════
//  Spieler-Auswechslung (durch den Spieler)
// ════════════════════════════════════════════════════════

export function performPlayerSubstitution(
  ctx: LiveMatchContext, playerOutId: string, playerInId: string,
): MatchEvent | null {
  const isHome = ctx.homeTeam.id === ctx.playerTeamId;
  if ((isHome ? ctx.homeSubs : ctx.awaySubs) >= 5) return null;

  const active = isHome ? ctx.homePlayers : ctx.awayPlayers;
  const outIdx = active.findIndex(p => p.id === playerOutId);
  if (outIdx === -1) return null;
  const out = active[outIdx];

  const playerIn = (isHome ? ctx.allHomePlayers : ctx.allAwayPlayers).find(p => p.id === playerInId);
  if (!playerIn) return null;

  const rng = new MatchRNG(ctx._rngSeed);
  const evts: MatchEvent[] = [];
  doSub(ctx, isHome, outIdx, playerIn, out, ctx.currentMinute, evts, rng);
  ctx._rngSeed = rng.getSeed();
  return evts[0] ?? null;
}

function doSub(
  ctx: LiveMatchContext, isHome: boolean, outIdx: number,
  playerIn: Player, playerOut: Player, minute: number,
  evts: MatchEvent[], rng: MatchRNG,
): void {
  const team = isHome ? ctx.homeTeam : ctx.awayTeam;
  const active = isHome ? ctx.homePlayers : ctx.awayPlayers;
  const subN = isHome ? ctx.homeSubs : ctx.awaySubs;
  const outStam = ctx.stamina[playerOut.id] ?? 80;
  const freshStam = 85 + rng.range(0, 10);

  const startMin = ctx.subEntries[playerOut.id] ?? 0;
  ctx.minutesPlayed[playerOut.id] = (ctx.minutesPlayed[playerOut.id] ?? 0) + (minute - startMin);

  active[outIdx] = playerIn;
  ctx.stamina[playerIn.id] = freshStam;
  ctx.subEntries[playerIn.id] = minute;
  if (isHome) { ctx.homeSubs++; ctx.homeStrength = teamStrength(ctx.homePlayers); }
  else { ctx.awaySubs++; ctx.awayStrength = teamStrength(ctx.awayPlayers); }

  const reason = playerOut.id !== ctx.playerTeamId
    ? (outStam < 40 ? 'Stark ermüdet' : outStam < 55 ? 'Nachlassende Kondition' : 'Taktisch')
    : 'Vom Spieler gewählt';

  const ev: MatchEvent = {
    minute, type: 'substitution', teamId: team.id,
    playerId: playerIn.id, secondPlayerId: playerOut.id,
    description: `🔄 ${playerIn.lastName} kommt für ${playerOut.lastName}`,
    devLog: [
      `═══ AUSWECHSLUNG ${subN + 1}/3 (${team.shortName}) ═══`,
      ``,
      `⬅️ RAUS: ${playerOut.lastName} (${playerOut.position}, GES ${calcOverall(playerOut)})`,
      `   Kondition: ${rd(outStam)}% — Grund: ${reason}`,
      ``,
      `➡️ REIN: ${playerIn.lastName} (${playerIn.position}, GES ${calcOverall(playerIn)})`,
      `   Frische Kondition: ${rd(freshStam)}%`,
      ``,
      `📊 Neue Teamstärke ${team.shortName}: ${rd(isHome ? ctx.homeStrength : ctx.awayStrength)}`,
    ],
  };
  evts.push(ev); ctx.events.push(ev);
}

// ════════════════════════════════════════════════════════
//  Coaching Interventions — Reinrufe & Halbzeitansprache
// ════════════════════════════════════════════════════════

export function applyShout(ctx: LiveMatchContext, shoutType: ShoutType): MatchEvent | null {
  if (ctx.currentMinute < ctx.shoutCooldownUntil) return null;
  if (ctx.isFinished) return null;

  const def = SHOUT_CATALOG.find(s => s.type === shoutType);
  if (!def) return null;

  const isHome = ctx.homeTeam.id === ctx.playerTeamId;

  // Apply stamina cost to player's team
  if (def.effect.staminaCost) {
    const players = isHome ? ctx.homePlayers : ctx.awayPlayers;
    for (const p of players) {
      if (p.position !== 'TW') {
        ctx.stamina[p.id] = Math.max(30, (ctx.stamina[p.id] ?? 70) - def.effect.staminaCost);
      }
    }
  }

  // Set active shout
  ctx.shoutActive = { type: shoutType, expiresAt: ctx.currentMinute + def.durationMinutes };
  ctx.shoutCooldownUntil = ctx.currentMinute + def.durationMinutes + 5; // 5 min cooldown after

  // Apply momentum effect from motivation
  if (def.effect.moraleBoost) {
    if (isHome) ctx.momentum.home += def.effect.moraleBoost;
    else ctx.momentum.away += def.effect.moraleBoost;
  }

  // Check if "motivate" backfires when leading big
  const playerScore = isHome ? ctx.homeScore : ctx.awayScore;
  const opponentScore = isHome ? ctx.awayScore : ctx.homeScore;
  const leadBy = playerScore - opponentScore;
  let backfire = false;
  if (shoutType === 'motivate' && leadBy >= 3) {
    // Motivation backfires when leading big
    if (isHome) ctx.momentum.home -= 5;
    else ctx.momentum.away -= 5;
    backfire = true;
  }

  const ev: MatchEvent = {
    minute: ctx.currentMinute,
    type: 'tactical' as MatchEvent['type'],
    teamId: ctx.playerTeamId,
    description: backfire
      ? `${def.icon} ${def.label} — Die Spieler reagieren genervt bei ${leadBy}:0 Führung!`
      : `${def.icon} ${def.label} — ${def.description}`,
    devLog: [
      `📣 TRAINER-REINRUF: ${def.label}`,
      `Effekt: Pressing ${def.effect.pressing ? (def.effect.pressing > 0 ? '+' : '') + def.effect.pressing : '—'}, Ballbesitz ${def.effect.possession ? (def.effect.possession > 0 ? '+' : '') + def.effect.possession : '—'}`,
      def.effect.staminaCost ? `Ausdauer-Kosten: -${def.effect.staminaCost}% für alle Feldspieler` : '',
      backfire ? `⚠️ RÜCKSCHLAG: Spieler reagieren negativ bei hoher Führung!` : '',
      `Aktiv bis Minute ${ctx.currentMinute + def.durationMinutes}`,
    ].filter(Boolean),
  };
  ctx.events.push(ev);
  return ev;
}

export function applyHalftimeTalk(ctx: LiveMatchContext, talkType: HalftimeTalkType): MatchEvent | null {
  if (ctx.halftimeTalkDone) return null;
  if (ctx.currentMinute < 45) return null;

  const def = HALFTIME_TALKS.find(t => t.type === talkType);
  if (!def) return null;

  ctx.halftimeTalkDone = true;
  ctx.halftimeTalkEffect = def.effect;

  const isHome = ctx.homeTeam.id === ctx.playerTeamId;

  // Apply stamina boost to player's team
  if (def.effect.staminaBoost) {
    const players = isHome ? ctx.homePlayers : ctx.awayPlayers;
    for (const p of players) {
      ctx.stamina[p.id] = Math.min(100, (ctx.stamina[p.id] ?? 70) + def.effect.staminaBoost);
    }
  }

  // Apply momentum from morale
  if (isHome) ctx.momentum.home += def.effect.moraleBoost;
  else ctx.momentum.away += def.effect.moraleBoost;

  // Critical talk: chance to backfire or inspire
  let extraText = '';
  if (talkType === 'critical') {
    const rng = new MatchRNG(ctx._rngSeed + ctx.currentMinute);
    if (rng.chance(40)) {
      // Inspires the team
      if (isHome) ctx.momentum.home += 5;
      else ctx.momentum.away += 5;
      extraText = ' Die Mannschaft reagiert positiv und ist heiß auf die 2. Halbzeit!';
    } else {
      // Some players demoralized
      if (isHome) ctx.momentum.home -= 3;
      else ctx.momentum.away -= 3;
      extraText = ' Einige Spieler wirken verunsichert.';
    }
  }

  const ev: MatchEvent = {
    minute: 45,
    type: 'tactical' as MatchEvent['type'],
    teamId: ctx.playerTeamId,
    description: `${def.icon} Halbzeitansprache: ${def.label}${extraText}`,
    devLog: [
      `📢 HALBZEITANSPRACHE: ${def.label}`,
      `Moral: ${def.effect.moraleBoost > 0 ? '+' : ''}${def.effect.moraleBoost}`,
      `Ausdauer: ${def.effect.staminaBoost > 0 ? '+' : ''}${def.effect.staminaBoost}%`,
      `Pressing-Boost: ${def.effect.pressingBoost > 0 ? '+' : ''}${def.effect.pressingBoost}`,
      extraText ? `→ ${extraText.trim()}` : '',
    ].filter(Boolean),
  };
  ctx.events.push(ev);
  return ev;
}

// ════════════════════════════════════════════════════════
//  finalizeLiveMatch — MatchResult erzeugen
// ════════════════════════════════════════════════════════

export function finalizeLiveMatch(ctx: LiveMatchContext): MatchResult {
  const rng = new MatchRNG(ctx._rngSeed);
  const lastMin = ctx.isExtraTime ? 120 + ctx.injuryTimeET2 : 90 + ctx.injuryTimeHalf2;

  for (const p of [...ctx.homePlayers, ...ctx.awayPlayers]) {
    const start = ctx.subEntries[p.id] ?? 0;
    ctx.minutesPlayed[p.id] = (ctx.minutesPlayed[p.id] ?? 0) + (lastMin - start);
  }

  // Passgenauigkeit berechnen (Ballbesitz wird live per Mittelfeld-Kontrolle akkumuliert)
  ctx.homeStats.passAccuracy = Math.round(70 + (ctx.homeStrength - 50) * 0.3 + rng.range(-5, 5));
  ctx.awayStats.passAccuracy = Math.round(70 + (ctx.awayStrength - 50) * 0.3 + rng.range(-5, 5));

  const homeWin = ctx.homeScore > ctx.awayScore;
  const isDraw = ctx.homeScore === ctx.awayScore;

  const rateTeam = (active: Player[], all: Player[], starterIds: string[], teamId: string, won: boolean): PlayerMatchRating[] => {
    const participantIds = new Set([...active.map(p => p.id), ...starterIds, ...Object.keys(ctx.minutesPlayed).filter(id => all.some(p => p.id === id))]);
    const rated = all.filter(p => participantIds.has(p.id));
    return rated.map(p => {
      const bst = getPlayerTraitBoosts(p);
      let r = 6.0 + rng.next() * 1.5;
      if (won) r += 0.3; if (isDraw) r += 0.1;
      r += bst.consistencyBonus ?? 0;
      const goals = ctx.events.filter(e => e.type === 'goal' && e.playerId === p.id && e.teamId === teamId).length;
      const assists = ctx.events.filter(e => e.type === 'assist' && e.playerId === p.id && e.teamId === teamId).length;
      const yellows = ctx.events.filter(e => e.type === 'yellow_card' && e.playerId === p.id).length;
      const reds = ctx.events.filter(e => e.type === 'red_card' && e.playerId === p.id).length;
      r += goals * 0.8 + assists * 0.4 - yellows * 0.3 - reds * 1.5;
      return {
        playerId: p.id,
        rating: Math.round(Math.min(10, Math.max(3, r)) * 10) / 10,
        goals, assists,
        minutesPlayed: ctx.minutesPlayed[p.id] ?? 0,
        yellowCard: yellows > 0, redCard: reds > 0,
      };
    });
  };

  const hR = rateTeam(ctx.homePlayers, ctx.allHomePlayers, ctx.homeStarterIds, ctx.homeTeam.id, homeWin);
  const aR = rateTeam(ctx.awayPlayers, ctx.allAwayPlayers, ctx.awayStarterIds, ctx.awayTeam.id, ctx.awayScore > ctx.homeScore);
  const allR = [...hR, ...aR];
  const motm = allR.reduce((best, r) => r.rating > best.rating ? r : best, allR[0]);

  return {
    id: ctx.matchId, homeTeamId: ctx.homeTeam.id, awayTeamId: ctx.awayTeam.id,
    homeScore: ctx.homeScore, awayScore: ctx.awayScore,
    date: ctx.matchDate, matchday: ctx.matchday, competition: ctx.competition, leagueId: ctx.leagueId,
    weather: ctx.weather, events: ctx.events,
    homeStats: ctx.homeStats, awayStats: ctx.awayStats,
    homeRatings: hR, awayRatings: aR,
    manOfTheMatch: motm?.playerId,
    isDerby: ctx.isDerby,
    isExtraTime: ctx.isExtraTime,
    isPenaltyShootout: ctx.isPenaltyShootout,
    penaltyHome: ctx.isPenaltyShootout ? ctx.penaltyHome : undefined,
    penaltyAway: ctx.isPenaltyShootout ? ctx.penaltyAway : undefined,
  };
}

// ════════════════════════════════════════════════════════
//  simulateMatch — KI-vs-KI Spiele (unveränderte API)
// ════════════════════════════════════════════════════════

export function simulateMatch(
  match: Match, homeTeam: Team, awayTeam: Team,
  allPlayers: Player[], homeLineup?: string[], awayLineup?: string[],
  homeManagerSkills?: ManagerSkills, awayManagerSkills?: ManagerSkills,
  homeFormation?: FormationType, awayFormation?: FormationType,
  homeTactics?: Tactics, awayTactics?: Tactics,
): MatchResult {
  const ctx = createLiveMatch(match, homeTeam, awayTeam, allPlayers, '__ai__', homeLineup, awayLineup, homeManagerSkills, awayManagerSkills, homeFormation, awayFormation, homeTactics, awayTactics);
  // Max minutes: 120 + ET injury time (knockout) or 90 + injury time (league)
  const maxMin = ctx.isKnockout ? 130 : 90 + ctx.injuryTimeHalf2 + 5;
  for (let i = 0; i < maxMin; i++) {
    advanceLiveMatch(ctx);
    if (ctx.isFinished) break;
  }
  return finalizeLiveMatch(ctx);
}
