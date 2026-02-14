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
import { FormationType, FORMATION_POSITIONS, getPositionCompatibility } from '@/types/tactics';

// ════════════════════════════════════════════════════════
//  Hilfsfunktionen
// ════════════════════════════════════════════════════════

function getPlayerTraitBoosts(player: Player): TraitBoost {
  const combined: TraitBoost = {};
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
    return base * (0.4 + 0.6 * eff);
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
    const mids = players.filter(p => MID_POS.has(p.position));
    const field = players.filter(p => p.position !== 'TW');
    const defs = players.filter(p => ['IV', 'LV', 'RV'].includes(p.position));
    const atks = players.filter(p => ATK_POS.has(p.position));
    const gk = players.find(p => p.position === 'TW');

    // 1. Mittelfeld-Qualität (Passing, Vision, Ballkontrolle) — Gewicht: 35%
    const midQual = mids.length > 0
      ? mids.reduce((s, p) => {
          const stam = Math.max(0.6, (ctx.stamina[p.id] ?? 80) / 100);
          return s + ((p.attributes.passing * 0.35 + p.attributes.vision * 0.30 + p.attributes.ballControl * 0.25 + p.attributes.composure * 0.10) * stam);
        }, 0) / mids.length
      : 45;

    // 2. Pressing-Intensität (WorkRate + Aggression) aller Feldspieler — Gewicht: 25%
    const pressing = field.length > 0
      ? field.reduce((s, p) => {
          const stam = Math.max(0.5, (ctx.stamina[p.id] ?? 80) / 100);
          return s + ((p.attributes.workRate * 0.55 + p.attributes.aggression * 0.30 + p.attributes.positioning * 0.15) * stam);
        }, 0) / field.length
      : 45;

    // 3. Spielaufbau (Verteidiger-Passing + TW-Kicking) — Gewicht: 15%
    const defPass = defs.length > 0
      ? defs.reduce((s, p) => s + p.attributes.passing * 0.6 + p.attributes.composure * 0.4, 0) / defs.length
      : 45;
    const gkBuild = gk ? gk.attributes.kicking * 0.5 + gk.attributes.handling * 0.3 + gk.attributes.composure * 0.2 : 40;
    const buildup = defPass * 0.7 + gkBuild * 0.3;

    // 4. Stamina-Effekt (Ø Kondition aller Feldspieler) — Gewicht: 15%
    const avgStam = field.length > 0
      ? field.reduce((s, p) => s + (ctx.stamina[p.id] ?? 80), 0) / field.length
      : 70;
    const staminaEffect = avgStam * 0.8 + 10; // 10-90 range

    // 5. Heimvorteil
    const homeBonus = isHome ? ctx.homeAdvantage * 0.5 : 0;

    // 6. Momentum (nach Gegentor pushst du, nach eigenem Tor lehnt man sich zurück)
    const mom = isHome ? ctx.momentum.home : ctx.momentum.away;

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
    const total = midQual * 0.35 + pressing * 0.25 + buildup * 0.15 + staminaEffect * 0.15 + homeBonus + mom * 0.10 + shoutBonus;

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

export type HalftimeTalkType = 'motivating' | 'tactical' | 'critical' | 'calm';

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
  { type: 'motivating', label: 'Motivierend', icon: '🔥', description: 'Feuer und Leidenschaft. Pusht die Mannschaft.', effect: { moraleBoost: 5, staminaBoost: 3, pressingBoost: 4 }, bestWhen: 'Rückstand' },
  { type: 'tactical', label: 'Taktisch', icon: '📋', description: 'Klare Anweisungen. Verbessert Struktur und Ballbesitz.', effect: { moraleBoost: 2, staminaBoost: 0, pressingBoost: 2 }, bestWhen: 'Unentschieden' },
  { type: 'critical', label: 'Kritisch', icon: '😤', description: 'Harte Worte. Kann motivieren oder demoralisieren.', effect: { moraleBoost: -2, staminaBoost: 0, pressingBoost: 6 }, bestWhen: 'Schlechte Leistung' },
  { type: 'calm', label: 'Ruhig', icon: '😌', description: 'Gelassen bleiben. Schont Kräfte für die 2. Halbzeit.', effect: { moraleBoost: 3, staminaBoost: 5, pressingBoost: -2 }, bestWhen: 'Führung' },
];

// ════════════════════════════════════════════════════════
//  createLiveMatch — Kontext für Live-Simulation erstellen
// ════════════════════════════════════════════════════════

const DEFAULT_SKILLS: ManagerSkills = { tactics: 5, motivation: 5, negotiation: 3, youthDev: 3, fitness: 4, scouting: 3, media: 2, discipline: 4 };

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
): LiveMatchContext {
  const seed = hashStr(match.id + match.date);
  const rng = new MatchRNG(seed);

  const homePlayers = pickLineup(allPlayers, homeTeam.id, homeLineup);
  const awayPlayers = pickLineup(allPlayers, awayTeam.id, awayLineup);
  const weather = generateWeather(rng);

  const stamina: Record<string, number> = {};
  for (const p of [...homePlayers, ...awayPlayers]) {
    const base = 75 + (p.attributes.stamina ?? 70) * 0.2 - (p.fatigue ?? 0) * 0.15;
    stamina[p.id] = Math.min(100, Math.max(50, base + rng.range(-5, 5)));
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

  const homeAdv = 5 + (homeTeam.fans.ultrasStrength * 0.5) + hmEffects.homeBonus;
  const injH1 = rng.range(1, 4);
  const injH2 = rng.range(1, 6);

  const weatherNote = (weather.type === 'heavy_rain' || weather.type === 'snow')
    ? `Schlechtes Wetter (${weather.description}) — Heimteam −5%, Gastteam −8% Spielstärke.`
    : `Wetter: ${weather.description}, ${weather.temperature}°C — kein Einfluss.`;

  const kickOffLog: string[] = [
    `╔══════════════════════════════════════════════╗`,
    `║  SPIELSTART: ${homeTeam.shortName} vs ${awayTeam.shortName}`,
    `╚══════════════════════════════════════════════╝`,
    ``,
    `📊 Teamstärke (Ø Gesamtwert aller 11 Spieler):`,
    `   ${homeTeam.shortName}: ${rd(adjHome)}`,
    `   ${awayTeam.shortName}: ${rd(adjAway)}`,
    ``,
    `🏟️ Heimvorteil: +${rd(homeAdv)} (Basis 5 + Ultra-Stärke ${homeTeam.fans.ultrasStrength} × 0.5)`,
    `🌤️ ${weatherNote}`,
    `⏱️ Nachspielzeit: 1. HZ +${injH1}', 2. HZ +${injH2}'`,
  ];

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

  // ── Ausdauer verbrauchen (Manager-Fitness reduziert Drain) ──
  for (const p of [...ctx.homePlayers, ...ctx.awayPlayers]) {
    const cur = ctx.stamina[p.id] ?? 80;
    const boosts = getPlayerTraitBoosts(p);
    const isHomePl = ctx.homePlayers.includes(p);
    const mgrFitness = isHomePl ? ctx.homeManagerEffects.fitnessBonus : ctx.awayManagerEffects.fitnessBonus;
    const drain = (1.2 - (p.attributes.stamina ?? 70) * 0.005 - (boosts.staminaBoost ?? 0) * 0.01) * (1 - mgrFitness / 100);
    ctx.stamina[p.id] = Math.max(5, cur - Math.max(0.3, drain));
  }

  // ── KI-Auswechslungen (nicht Spieler-Team) ──
  const tryAISub = (isHome: boolean) => {
    const subs = isHome ? ctx.homeSubs : ctx.awaySubs;
    const team = isHome ? ctx.homeTeam : ctx.awayTeam;
    if (subs >= 3 || minute < 55 || team.id === ctx.playerTeamId) return;
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

  atkStats.passes += rng.range(3, 8);

  // ── FOUL ──
  // Foulwahrscheinlichkeit steigt mit Pressing des Gegners und Aggression
  // Manager-Disziplin reduziert Foulchance des eigenen Teams
  const defField = defPlayers.filter(p => p.position !== 'TW');
  const defAggr = defField.length > 0 ? defField.reduce((s, p) => s + p.attributes.aggression, 0) / defField.length : 50;
  const defMgrDisc = isHomeAtk ? ctx.awayManagerEffects.disciplineBonus : ctx.homeManagerEffects.disciplineBonus;
  const foulPct = (1.5 + defAggr * 0.02 + (ctx.isDerby ? 1 : 0)) * (1 - defMgrDisc / 100);
  if (rng.chance(foulPct)) {
    const fIdx = rng.range(1, defPlayers.length - 1);
    const fouler = defPlayers[fIdx];
    defStats.fouls++;
    newEvents.push({
      minute, type: 'foul', teamId: defTeam.id, playerId: fouler?.id,
      description: `Foul von ${fouler?.lastName}`,
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
          description: `Gelbe Karte für ${fouler.lastName}`,
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

  // ── ECKE (basiert auf Angriffsdruck) ──
  const atkField = atkPlayers.filter(p => p.position !== 'TW');
  const atkCross = atkField.reduce((s, p) => s + (p.attributes.crossing ?? 50), 0) / (atkField.length || 1);
  const cornerPct = 1.5 + atkCross * 0.02;
  if (rng.chance(cornerPct)) {
    atkStats.corners++;
    newEvents.push({ minute, type: 'corner', teamId: atkId, description: `Eckstoß für ${atkTeam.shortName}`,
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
  // Gutes Verteidiger-Positioning = mehr Abseitsfallen; schlechtes Stürmer-Positioning = mehr Abseits
  const offsidePct = Math.max(0.3, 1.0 + (avgDefLine - avgAtkPos) * 0.02);
  if (rng.chance(offsidePct)) {
    atkStats.offsides++;
    newEvents.push({ minute, type: 'offside', teamId: atkId, description: `Abseits bei ${atkTeam.shortName}`,
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
        return s + (p.attributes.finishing * 0.3 + p.attributes.shooting * 0.25 + p.attributes.dribbling * 0.2 + p.attributes.positioning * 0.25) * st;
      }, 0) / atkFwd.length
    : 50;
  const shotPct = 5 + atkComp.midfield * 0.04 + atkFwdQual * 0.06 + atkComp.pressing * 0.02;
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
  const shooter = pool.length > 0 ? pool[rng.range(0, pool.length - 1)] : atkPlayers[rng.range(1, atkPlayers.length - 1)];
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
  const onTargetThr = 35 + baseAcc * 0.35 + traitGoal * 0.3 + stamEff;
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
    newEvents.push({ minute, type: miss, teamId: atkId, playerId: shooter.id,
      description: miss === 'shot_post' ? `${shooter.lastName} trifft den Pfosten!` : `${shooter.lastName} schießt vorbei`, devLog: log });
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
  // Situationsschwankung: +/-8 simuliert Glück/Pech (unregelmäßige Abpraller, Wind, etc.)
  const swing = rng.range(-8, 8);
  const goalPct = 32 + baseAcc * 0.3 + traitGoal * 0.5 + stamEff - gkAbi * 0.15 * gkStamF - gkTrait * 0.4 + swing;
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
    `   ± Situation (Glück/Pech): ${swing > 0 ? '+' : ''}${swing}%`,
    `   ─────────────────────────`,
    `   Torwahrscheinlichkeit:   ${rd(goalPct)}%`,
    `   Ausführung:              ${rd(rollG)}% (je niedriger, desto besser)`,
    `   → ${isGoal ? `${rd(rollG)} < ${rd(goalPct)} → ⚽ TOR!!!` : `${rd(rollG)} ≥ ${rd(goalPct)} → 🧤 GEHALTEN!`}`,
  );

  if (!isGoal) {
    newEvents.push({ minute, type: 'shot_saved', teamId: atkId, playerId: shooter.id, secondPlayerId: gk?.id,
      description: `${gk?.lastName} hält den Schuss von ${shooter.lastName}`, devLog: log });
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

  const gDesc = assister
    ? `⚽ TOR! ${shooter.lastName} (Vorlage: ${assister.lastName}) — ${ctx.homeScore}:${ctx.awayScore}`
    : `⚽ TOR! ${shooter.lastName} — ${ctx.homeScore}:${ctx.awayScore}`;

  log.push(``, `🎉 Neuer Spielstand: ${ctx.homeScore}:${ctx.awayScore}`);
  log.push(`   📈 Momentum-Schub: ${isHomeAtk ? ctx.awayTeam.shortName : ctx.homeTeam.shortName} bekommt +8 Momentum (Gegendruck nach Gegentor).`);
  if (assister) {
    const aBst = getPlayerTraitBoosts(assister);
    log.push(``, `🅰️ Vorlagengeber: ${assister.lastName} (${assister.position}, GES ${calcOverall(assister)}, Vision ${assister.attributes.vision})`);
    log.push(`   65%-Chance auf einen Vorlagengeber bei einem Tor.`);
    if ((aBst.assistChance ?? 0) > 0) log.push(`   Trait-Bonus auf Vorlagen: +${aBst.assistChance}`);
  }

  newEvents.push({ minute, type: 'goal', teamId: atkId, playerId: shooter.id, secondPlayerId: assister?.id, description: gDesc, devLog: log });
  if (assister) newEvents.push({ minute, type: 'assist', teamId: atkId, playerId: assister.id, description: `Vorlage von ${assister.lastName}` });

  ctx._rngSeed = rng.getSeed(); ctx.events.push(...newEvents);
  checkPeriodEnd(ctx, minute, newEvents);
  return newEvents;
}

// ── Halbzeit / Abpfiff Prüfung ──

function checkPeriodEnd(ctx: LiveMatchContext, minute: number, newEvents: MatchEvent[]): void {
  if (minute === 45 + ctx.injuryTimeHalf1) {
    const ev: MatchEvent = {
      minute: 45, type: 'half_time', teamId: '',
      description: `Halbzeit! ${ctx.homeScore}:${ctx.awayScore}`,
      devLog: [
        `══════ HALBZEIT ══════`,
        `Spielstand: ${ctx.homeScore}:${ctx.awayScore}`,
        `Ballbesitz: ${ctx.homeStats.possession}% : ${ctx.awayStats.possession}%`,
        `${ctx.homeTeam.shortName}: ${ctx.homeStats.shots} Schüsse (${ctx.homeStats.shotsOnTarget} aufs Tor)`,
        `${ctx.awayTeam.shortName}: ${ctx.awayStats.shots} Schüsse (${ctx.awayStats.shotsOnTarget} aufs Tor)`,
        `Wechsel: ${ctx.homeTeam.shortName} ${ctx.homeSubs}/3, ${ctx.awayTeam.shortName} ${ctx.awaySubs}/3`,
        `Momentum: ${ctx.homeTeam.shortName} ${rd(ctx.momentum.home)}, ${ctx.awayTeam.shortName} ${rd(ctx.momentum.away)}`,
      ],
    };
    newEvents.push(ev); ctx.events.push(ev);
  }
  if (minute === 90 + ctx.injuryTimeHalf2) {
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
  }
}

// ════════════════════════════════════════════════════════
//  Spieler-Auswechslung (durch den Spieler)
// ════════════════════════════════════════════════════════

export function performPlayerSubstitution(
  ctx: LiveMatchContext, playerOutId: string, playerInId: string,
): MatchEvent | null {
  const isHome = ctx.homeTeam.id === ctx.playerTeamId;
  if ((isHome ? ctx.homeSubs : ctx.awaySubs) >= 3) return null;

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
  const lastMin = 90 + ctx.injuryTimeHalf2;

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
    isDerby: ctx.isDerby, isExtraTime: false, isPenaltyShootout: false,
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
): MatchResult {
  const ctx = createLiveMatch(match, homeTeam, awayTeam, allPlayers, '__ai__', homeLineup, awayLineup, homeManagerSkills, awayManagerSkills, homeFormation, awayFormation);
  const totalMin = 90 + ctx.injuryTimeHalf2;
  for (let i = 0; i < totalMin; i++) {
    advanceLiveMatch(ctx);
    if (ctx.isFinished) break;
  }
  return finalizeLiveMatch(ctx);
}
