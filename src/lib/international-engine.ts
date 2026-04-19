/**
 * International Competition Engine — Champions League / Europa League / Conference League
 *
 * Qualification:
 *   CL:  Bundesliga Platz 1-4
 *   EL:  Bundesliga Platz 5-6 + DFB-Pokal-Sieger
 *   ECL: Bundesliga Platz 7
 *
 * Format (new 2024/25 Swiss model):
 *   - League phase: 36 teams, each plays 8 matches (4H/4A) against 8 different opponents
 *   - Single league table: Top 8 → R16, 9-24 → Playoff (single match), 25-36 → eliminated
 *   - KO: Achtelfinale → Viertelfinale → Halbfinale → Finale
 *
 * Only the player's team plays live; other matches are simulated.
 * Foreign teams are generated as virtual opponents with realistic strength.
 */
import { GameState, InternationalState, InternationalLeaguePhase } from '@/types/game';
import { Match, MatchResult } from '@/types/match';
import { TableEntry } from '@/types/league';
import { NewsItem } from '@/types/news';
import { Team } from '@/types/team';
import { simulateMatch } from './match-engine';

// ════════════════════════════════════════════════════════
//  Foreign Club Data — virtuelle Gegner aus Europa
// ════════════════════════════════════════════════════════

interface ForeignClub {
  id: string;
  name: string;
  shortName: string;
  country: string;
  strength: number; // 60-95
  tier: 'elite' | 'strong' | 'mid' | 'weak';
}

const FOREIGN_CLUBS: ForeignClub[] = [
  // Elite (CL pot 1) — 12 clubs
  { id: 'int-real-madrid', name: 'Real Madrid', shortName: 'RMA', country: '🇪🇸', strength: 93, tier: 'elite' },
  { id: 'int-man-city', name: 'Manchester City', shortName: 'MCI', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 92, tier: 'elite' },
  { id: 'int-barcelona', name: 'FC Barcelona', shortName: 'BAR', country: '🇪🇸', strength: 90, tier: 'elite' },
  { id: 'int-psg', name: 'Paris Saint-Germain', shortName: 'PSG', country: '🇫🇷', strength: 89, tier: 'elite' },
  { id: 'int-inter', name: 'Inter Mailand', shortName: 'INT', country: '🇮🇹', strength: 88, tier: 'elite' },
  { id: 'int-liverpool', name: 'FC Liverpool', shortName: 'LIV', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 89, tier: 'elite' },
  { id: 'int-arsenal', name: 'FC Arsenal', shortName: 'ARS', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 88, tier: 'elite' },
  { id: 'int-chelsea', name: 'FC Chelsea', shortName: 'CHE', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 86, tier: 'elite' },
  { id: 'int-man-utd', name: 'Manchester United', shortName: 'MUN', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 85, tier: 'elite' },
  { id: 'int-tottenham', name: 'Tottenham Hotspur', shortName: 'TOT', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 84, tier: 'elite' },
  { id: 'int-aston-villa', name: 'Aston Villa', shortName: 'AVL', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 80, tier: 'elite' },
  { id: 'int-newcastle', name: 'Newcastle United', shortName: 'NEW', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 81, tier: 'elite' },
  // Strong (CL pot 2-3) — 14 clubs
  { id: 'int-atletico', name: 'Atlético Madrid', shortName: 'ATM', country: '🇪🇸', strength: 85, tier: 'strong' },
  { id: 'int-juventus', name: 'Juventus Turin', shortName: 'JUV', country: '🇮🇹', strength: 84, tier: 'strong' },
  { id: 'int-ac-milan', name: 'AC Mailand', shortName: 'ACM', country: '🇮🇹', strength: 84, tier: 'strong' },
  { id: 'int-napoli', name: 'SSC Neapel', shortName: 'NAP', country: '🇮🇹', strength: 83, tier: 'strong' },
  { id: 'int-benfica', name: 'Benfica Lissabon', shortName: 'BEN', country: '🇵🇹', strength: 82, tier: 'strong' },
  { id: 'int-porto', name: 'FC Porto', shortName: 'POR', country: '🇵🇹', strength: 81, tier: 'strong' },
  { id: 'int-ajax', name: 'Ajax Amsterdam', shortName: 'AJA', country: '🇳🇱', strength: 80, tier: 'strong' },
  { id: 'int-celtic', name: 'Celtic Glasgow', shortName: 'CEL', country: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', strength: 76, tier: 'strong' },
  { id: 'int-psv', name: 'PSV Eindhoven', shortName: 'PSV', country: '🇳🇱', strength: 78, tier: 'strong' },
  { id: 'int-real-sociedad', name: 'Real Sociedad', shortName: 'RSO', country: '🇪🇸', strength: 79, tier: 'strong' },
  { id: 'int-atalanta', name: 'Atalanta Bergamo', shortName: 'ATA', country: '🇮🇹', strength: 80, tier: 'strong' },
  { id: 'int-monaco', name: 'AS Monaco', shortName: 'MON', country: '🇫🇷', strength: 78, tier: 'strong' },
  { id: 'int-lille', name: 'OSC Lille', shortName: 'LIL', country: '🇫🇷', strength: 77, tier: 'strong' },
  { id: 'int-braga', name: 'SC Braga', shortName: 'BRA', country: '🇵🇹', strength: 76, tier: 'strong' },
  // Mid (EL level) — 16 clubs
  { id: 'int-sevilla', name: 'FC Sevilla', shortName: 'SEV', country: '🇪🇸', strength: 79, tier: 'mid' },
  { id: 'int-roma', name: 'AS Rom', shortName: 'ROM', country: '🇮🇹', strength: 79, tier: 'mid' },
  { id: 'int-lazio', name: 'Lazio Rom', shortName: 'LAZ', country: '🇮🇹', strength: 78, tier: 'mid' },
  { id: 'int-lyon', name: 'Olympique Lyon', shortName: 'OL', country: '🇫🇷', strength: 77, tier: 'mid' },
  { id: 'int-marseille', name: 'Olympique Marseille', shortName: 'OM', country: '🇫🇷', strength: 77, tier: 'mid' },
  { id: 'int-sporting', name: 'Sporting Lissabon', shortName: 'SCP', country: '🇵🇹', strength: 78, tier: 'mid' },
  { id: 'int-feyenoord', name: 'Feyenoord Rotterdam', shortName: 'FEY', country: '🇳🇱', strength: 76, tier: 'mid' },
  { id: 'int-villarreal', name: 'FC Villarreal', shortName: 'VIL', country: '🇪🇸', strength: 77, tier: 'mid' },
  { id: 'int-west-ham', name: 'West Ham United', shortName: 'WHU', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 76, tier: 'mid' },
  { id: 'int-brighton', name: 'Brighton & Hove', shortName: 'BHA', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 75, tier: 'mid' },
  { id: 'int-betis', name: 'Real Betis', shortName: 'BET', country: '🇪🇸', strength: 76, tier: 'mid' },
  { id: 'int-fiorentina', name: 'AC Florenz', shortName: 'FIO', country: '🇮🇹', strength: 76, tier: 'mid' },
  { id: 'int-anderlecht', name: 'RSC Anderlecht', shortName: 'AND', country: '🇧🇪', strength: 73, tier: 'mid' },
  { id: 'int-az', name: 'AZ Alkmaar', shortName: 'AZA', country: '🇳🇱', strength: 74, tier: 'mid' },
  { id: 'int-nice', name: 'OGC Nizza', shortName: 'NIC', country: '🇫🇷', strength: 74, tier: 'mid' },
  { id: 'int-wolves', name: 'Wolverhampton', shortName: 'WOL', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 74, tier: 'mid' },
  // Weak (ECL level) — 18 clubs
  { id: 'int-brugge', name: 'Club Brügge', shortName: 'BRU', country: '🇧🇪', strength: 74, tier: 'weak' },
  { id: 'int-salzburg', name: 'RB Salzburg', shortName: 'SAL', country: '🇦🇹', strength: 74, tier: 'weak' },
  { id: 'int-copenhagen', name: 'FC Kopenhagen', shortName: 'FCK', country: '🇩🇰', strength: 72, tier: 'weak' },
  { id: 'int-galatasaray', name: 'Galatasaray', shortName: 'GAL', country: '🇹🇷', strength: 75, tier: 'weak' },
  { id: 'int-fenerbahce', name: 'Fenerbahçe', shortName: 'FEN', country: '🇹🇷', strength: 74, tier: 'weak' },
  { id: 'int-olympiacos', name: 'Olympiakos Piräus', shortName: 'OLY', country: '🇬🇷', strength: 72, tier: 'weak' },
  { id: 'int-shakhtar', name: 'Schachtar Donezk', shortName: 'SHA', country: '🇺🇦', strength: 73, tier: 'weak' },
  { id: 'int-dinamo-zagreb', name: 'Dinamo Zagreb', shortName: 'DZA', country: '🇭🇷', strength: 70, tier: 'weak' },
  { id: 'int-red-star', name: 'Roter Stern Belgrad', shortName: 'RSB', country: '🇷🇸', strength: 70, tier: 'weak' },
  { id: 'int-young-boys', name: 'Young Boys Bern', shortName: 'YBB', country: '🇨🇭', strength: 71, tier: 'weak' },
  { id: 'int-slavia', name: 'Slavia Prag', shortName: 'SLA', country: '🇨🇿', strength: 71, tier: 'weak' },
  { id: 'int-rangers', name: 'Rangers Glasgow', shortName: 'RAN', country: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', strength: 73, tier: 'weak' },
  { id: 'int-rapid-wien', name: 'Rapid Wien', shortName: 'RAP', country: '🇦🇹', strength: 68, tier: 'weak' },
  { id: 'int-malmo', name: 'Malmö FF', shortName: 'MAL', country: '🇸🇪', strength: 69, tier: 'weak' },
  { id: 'int-ferencvaros', name: 'Ferencváros', shortName: 'FTC', country: '🇭🇺', strength: 68, tier: 'weak' },
  { id: 'int-paok', name: 'PAOK Thessaloniki', shortName: 'PAO', country: '🇬🇷', strength: 70, tier: 'weak' },
  { id: 'int-besiktas', name: 'Beşiktaş', shortName: 'BJK', country: '🇹🇷', strength: 73, tier: 'weak' },
  { id: 'int-sparta-prag', name: 'Sparta Prag', shortName: 'SPA', country: '🇨🇿', strength: 70, tier: 'weak' },
];

function genId(): string {
  return 'intl-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ════════════════════════════════════════════════════════
//  Qualification — Wer qualifiziert sich?
// ════════════════════════════════════════════════════════

interface QualifiedTeam {
  teamId: string;
  teamName: string;
  strength: number;
  isPlayer: boolean;
}

/**
 * Determine which German teams qualify for international competitions.
 * Called at season start based on previous season's Bundesliga table.
 */
export function getQualifiedTeams(state: GameState): {
  cl: QualifiedTeam[];
  el: QualifiedTeam[];
  ecl: QualifiedTeam[];
} {
  // Find Bundesliga (tier 1)
  const bundesliga = state.leagues.find(l => l.tier === 1);
  if (!bundesliga) return { cl: [], el: [], ecl: [] };

  const table = state.tables[bundesliga.id] ?? [];
  if (table.length === 0) return { cl: [], el: [], ecl: [] };

  const toQualified = (entry: TableEntry): QualifiedTeam => {
    const team = state.teams.find(t => t.id === entry.teamId);
    return {
      teamId: entry.teamId,
      teamName: team?.name ?? entry.teamId,
      strength: team?.reputation ?? 70,
      isPlayer: entry.teamId === state.currentTeamId,
    };
  };

  // CL: Platz 1-4
  const cl = table.slice(0, 4).map(toQualified);
  // EL: Platz 5-6 (+ DFB-Pokal-Sieger, but simplified)
  const el = table.slice(4, 6).map(toQualified);
  // ECL: Platz 7
  const ecl = table.slice(6, 7).map(toQualified);

  return { cl, el, ecl };
}

// ════════════════════════════════════════════════════════
//  League Phase Draw (Swiss Model)
// ════════════════════════════════════════════════════════

type TeamEntry = { teamId: string; teamName: string; strength: number };

/**
 * Draw the league phase: 36 teams, each plays 8 matches (4H/4A).
 * Opponents assigned from 4 seeding pots (2 per pot).
 */
function drawLeaguePhase(
  germanTeams: QualifiedTeam[],
  competition: 'cl' | 'el' | 'ecl',
  seed: number,
): InternationalLeaguePhase {
  const tierFilter: Record<string, ForeignClub['tier'][]> = {
    cl: ['elite', 'strong', 'mid'],
    el: ['strong', 'mid', 'weak'],
    ecl: ['mid', 'weak'],
  };
  const tiers = tierFilter[competition] ?? ['mid', 'weak'];
  const pool = shuffle(FOREIGN_CLUBS.filter(c => tiers.includes(c.tier)), seed);

  // Build 36-team field: German teams + foreign teams
  const allTeams: TeamEntry[] = [
    ...germanTeams.map(t => ({ teamId: t.teamId, teamName: t.teamName, strength: t.strength })),
    ...pool.slice(0, 36 - germanTeams.length).map(c => ({ teamId: c.id, teamName: c.name, strength: c.strength })),
  ];

  // Sort by strength for pot seeding
  const sorted = [...allTeams].sort((a, b) => b.strength - a.strength);
  const pot1 = sorted.slice(0, 9);
  const pot2 = sorted.slice(9, 18);
  const pot3 = sorted.slice(18, 27);
  const pot4 = sorted.slice(27, 36);
  const pots = [pot1, pot2, pot3, pot4];

  // For each team, assign 8 opponents: 2 from each pot (1 home, 1 away)
  const matches: Match[] = [];
  const teamOpponents: Record<string, Set<string>> = {};
  for (const t of allTeams) teamOpponents[t.teamId] = new Set();

  let s = seed + 42;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };

  for (const team of allTeams) {
    const myPotIdx = pots.findIndex(p => p.some(t => t.teamId === team.teamId));
    const needed = 8 - teamOpponents[team.teamId].size;
    if (needed <= 0) continue;

    for (const pot of pots) {
      // Pick up to 2 opponents from each pot
      const candidates = shuffle(
        pot.filter(t => t.teamId !== team.teamId && !teamOpponents[team.teamId].has(t.teamId) && teamOpponents[t.teamId].size < 8),
        Math.floor(rng() * 100000),
      );
      let picked = 0;
      for (const opp of candidates) {
        if (picked >= 2) break;
        if (teamOpponents[team.teamId].size >= 8) break;
        if (teamOpponents[opp.teamId].size >= 8) continue;
        if (teamOpponents[team.teamId].has(opp.teamId)) continue;

        teamOpponents[team.teamId].add(opp.teamId);
        teamOpponents[opp.teamId].add(team.teamId);

        // Alternate home/away
        const isHome = picked % 2 === 0;
        matches.push({
          id: genId(),
          homeTeamId: isHome ? team.teamId : opp.teamId,
          awayTeamId: isHome ? opp.teamId : team.teamId,
          date: '',
          time: '21:00',
          matchday: 0,
          competition,
          venue: isHome ? team.teamName : opp.teamName,
          isPlayed: false,
        });
        picked++;
      }
    }
  }

  // Assign matchdays (8 matchdays, distribute evenly)
  // Sort matches and assign each team's matches across 8 matchdays
  const teamMatchCount: Record<string, number> = {};
  for (const m of matches) {
    const md = Math.max(
      (teamMatchCount[m.homeTeamId] ?? 0),
      (teamMatchCount[m.awayTeamId] ?? 0),
    ) + 1;
    m.matchday = Math.min(md, 8);
    teamMatchCount[m.homeTeamId] = (teamMatchCount[m.homeTeamId] ?? 0) + 1;
    teamMatchCount[m.awayTeamId] = (teamMatchCount[m.awayTeamId] ?? 0) + 1;
  }

  // Initialize table
  const table: TableEntry[] = allTeams.map((t, i) => ({
    position: i + 1, teamId: t.teamId,
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [],
  }));

  return { teams: allTeams, matches, table };
}

// ════════════════════════════════════════════════════════
//  Initialize International Competition
// ════════════════════════════════════════════════════════

export function initializeInternational(state: GameState): GameState {
  const qualified = getQualifiedTeams(state);

  let playerComp: 'cl' | 'el' | 'ecl' | null = null;
  let teams: QualifiedTeam[] = [];

  if (qualified.cl.some(t => t.isPlayer)) {
    playerComp = 'cl';
    teams = qualified.cl;
  } else if (qualified.el.some(t => t.isPlayer)) {
    playerComp = 'el';
    teams = qualified.el;
  } else if (qualified.ecl.some(t => t.isPlayer)) {
    playerComp = 'ecl';
    teams = qualified.ecl;
  }

  if (!playerComp) {
    return { ...state, internationalState: undefined };
  }

  // Use Date.now() + random for truly unique draws each new game
  const seed = hashDate(state.currentDate) + state.season.number + Math.floor(Math.random() * 1_000_000);
  const leaguePhase = drawLeaguePhase(teams, playerComp, seed);

  // Schedule league phase dates (8 matchdays: Sep-Jan)
  const seasonYear = parseInt(state.season.year.split('/')[0]);
  const lpDates = [
    `${seasonYear}-09-17`, `${seasonYear}-10-01`, `${seasonYear}-10-22`,
    `${seasonYear}-11-05`, `${seasonYear}-11-26`, `${seasonYear}-12-10`,
    `${seasonYear + 1}-01-21`, `${seasonYear + 1}-01-29`,
  ];

  for (const m of leaguePhase.matches) {
    const md = Math.max(1, Math.min(8, m.matchday));
    m.date = lpDates[md - 1] ?? lpDates[0];
  }

  const intlState: InternationalState = {
    competition: playerComp,
    leaguePhase,
    knockoutMatches: [],
    currentPhase: 'league',
    isEliminated: false,
    isFinished: false,
  };

  const playerTeam = state.teams.find(t => t.id === state.currentTeamId);
  // Find player's 8 opponents
  const playerOpponents = leaguePhase.matches
    .filter(m => m.homeTeamId === state.currentTeamId || m.awayTeamId === state.currentTeamId)
    .map(m => m.homeTeamId === state.currentTeamId ? m.awayTeamId : m.homeTeamId)
    .map(id => leaguePhase.teams.find(t => t.teamId === id)?.teamName ?? id);

  const news: NewsItem[] = [{
    id: `intl-draw-${playerComp}`,
    type: 'milestone',
    title: `${getCompName(playerComp)}-Auslosung!`,
    content: `${playerTeam?.name ?? 'Dein Team'} spielt in der Ligaphase gegen: ${playerOpponents.slice(0, 8).join(', ')}. ${leaguePhase.teams.length} Teams kämpfen um den Einzug in die K.O.-Runde.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  }];

  // Add foreign clubs as virtual Team objects so match page can find them
  const existingTeamIds = new Set(state.teams.map(t => t.id));
  const foreignTeamsToAdd: Team[] = [];
  const foreignPlayersList: Player[] = [];

  for (const entry of leaguePhase.teams) {
    if (existingTeamIds.has(entry.teamId)) continue;
    const fc = FOREIGN_CLUBS.find(c => c.id === entry.teamId);
    if (!fc) continue;

    // Country flag → color mapping for visual variety
    const colorMap: Record<string, { primary: string; secondary: string }> = {
      '🇪🇸': { primary: '#c8102e', secondary: '#f4d03f' },
      '🏴󠁧󠁢󠁥󠁮󠁧󠁿': { primary: '#1d428a', secondary: '#ffffff' },
      '🇫🇷': { primary: '#002395', secondary: '#ffffff' },
      '🇮🇹': { primary: '#009246', secondary: '#ffffff' },
      '🇵🇹': { primary: '#006600', secondary: '#ff0000' },
      '🇳🇱': { primary: '#ff6600', secondary: '#ffffff' },
      '🇧🇪': { primary: '#ed2939', secondary: '#fae042' },
      '🏴󠁧󠁢󠁳󠁣󠁴󠁿': { primary: '#003399', secondary: '#ffffff' },
      '🇦🇹': { primary: '#ed2939', secondary: '#ffffff' },
      '🇩🇰': { primary: '#c60c30', secondary: '#ffffff' },
      '🇹🇷': { primary: '#e30a17', secondary: '#ffffff' },
      '🇬🇷': { primary: '#0d5eaf', secondary: '#ffffff' },
      '🇺🇦': { primary: '#005bbb', secondary: '#ffd500' },
      '🇭🇷': { primary: '#ff0000', secondary: '#ffffff' },
      '🇷🇸': { primary: '#c6363c', secondary: '#ffffff' },
      '🇨🇭': { primary: '#ff0000', secondary: '#ffffff' },
      '🇨🇿': { primary: '#11457e', secondary: '#d7141a' },
      '🇸🇪': { primary: '#006aa7', secondary: '#fecc02' },
      '🇭🇺': { primary: '#477050', secondary: '#ffffff' },
    };
    const colors = colorMap[fc.country] ?? { primary: '#333333', secondary: '#cccccc' };

    foreignTeamsToAdd.push({
      id: fc.id,
      name: fc.name,
      shortName: fc.shortName,
      league: 'international',
      founded: 1900,
      stadium: { name: `${fc.name} Stadium`, capacity: 50000, city: fc.name },
      colors,
      logo: '',
      budget: 100_000_000,
      salaryBudget: 50_000_000,
      reputation: fc.strength,
      facilities: { training: 8, youth: 8, stadium: 8, medical: 8 },
      fans: { loyalty: 80, baseAttendance: 40000, ultrasStrength: 7 },
      boardExpectations: { leaguePosition: 1, cupRound: 'finale', financialGoal: 'profit' },
      staff: { manager: '', assistantManager: '', fitnessCoach: '', youthCoach: '', goalkeepingCoach: '' },
      rivals: [],
      boardPatience: 80,
    });

    // Generate dummy players for the foreign team
    const positions: import('@/types/player').Position[] = ['TW', 'IV', 'IV', 'LV', 'RV', 'ZDM', 'ZM', 'ZOM', 'LA', 'RA', 'ST', 'TW', 'IV', 'ZM', 'ST', 'RV', 'ZOM'];
    const baseOvr = Math.max(55, fc.strength * 0.85);
    for (let pi = 0; pi < positions.length; pi++) {
      const pos = positions[pi];
      const ovr = baseOvr + Math.floor(Math.random() * 12) - 4;
      const isGK = pos === 'TW';
      const attr = (v: number) => Math.max(20, Math.min(95, v + Math.floor(Math.random() * 10) - 5));
      foreignPlayersList.push({
        id: `${fc.id}-p${pi}`,
        firstName: `Player`, lastName: `${fc.shortName}${pi + 1}`,
        dateOfBirth: `${1992 + Math.floor(Math.random() * 8)}-06-15`,
        nationality: fc.country, position: pos, secondaryPositions: [],
        foot: Math.random() > 0.7 ? 'left' : 'right', height: 175 + Math.floor(Math.random() * 15),
        weight: 72 + Math.floor(Math.random() * 12), shirtNumber: pi + 1, teamId: fc.id,
        contractUntil: '2028-06-30', salary: 500000, marketValue: 5_000_000,
        attributes: {
          ballControl: attr(isGK ? 40 : ovr), dribbling: attr(isGK ? 35 : ovr), passing: attr(ovr),
          crossing: attr(isGK ? 30 : ovr), shooting: attr(isGK ? 30 : ovr), longShots: attr(isGK ? 25 : ovr - 5),
          finishing: attr(isGK ? 25 : ovr), freeKick: attr(ovr - 10), heading: attr(ovr),
          pace: attr(ovr), acceleration: attr(ovr), stamina: attr(ovr + 5), strength: attr(ovr),
          jumping: attr(ovr), vision: attr(ovr - 5), composure: attr(ovr), aggression: attr(ovr),
          positioning: attr(ovr), workRate: attr(ovr + 5), leadership: attr(ovr - 10),
          reflexes: attr(isGK ? ovr + 10 : 25), handling: attr(isGK ? ovr + 10 : 25),
          diving: attr(isGK ? ovr + 10 : 25), kicking: attr(isGK ? ovr : 35), oneOnOne: attr(isGK ? ovr + 5 : 25),
        },
        condition: 85, morale: 75, form: 70, fatigue: 5, matchPractice: 60, injuryProne: 15,
        suspended: false, suspendedMatches: 0, potential: ovr + 5, growthRate: 0.3,
        level: 1, xp: 0, xpToNextLevel: 100, trainingBoosts: [], traits: [],
        stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, avgRating: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0 },
        formHistory: [], ratingHistory: [],
        isLoaned: false, isTransferListed: false, transferRequested: false,
      } as Player);
    }
  }

  return {
    ...state,
    internationalState: intlState,
    teams: [...state.teams, ...foreignTeamsToAdd],
    players: [...state.players, ...foreignPlayersList],
    news: [...state.news, ...news],
  };
}

// ════════════════════════════════════════════════════════
//  Process International Matches — called from day-advance
// ════════════════════════════════════════════════════════

export function processInternationalMatches(state: GameState, liveMatchResult?: MatchResult): GameState {
  const intl = state.internationalState;
  if (!intl || intl.isFinished || intl.isEliminated) return state;

  if (intl.currentPhase === 'league') {
    return processLeaguePhase(state, liveMatchResult);
  }
  return processKnockout(state, liveMatchResult);
}

function processLeaguePhase(state: GameState, liveMatchResult?: MatchResult): GameState {
  const intl = state.internationalState!;
  const lp = intl.leaguePhase;
  if (!lp) return state;

  let changed = false;
  const updatedMatches = lp.matches.map(match => {
    if (match.isPlayed || match.date !== state.currentDate) return match;
    const isPlayerMatch = match.homeTeamId === state.currentTeamId || match.awayTeamId === state.currentTeamId;
    // Player's match: use live result if provided, otherwise skip (will be played live)
    if (isPlayerMatch && (!liveMatchResult || liveMatchResult.id !== match.id)) return match;
    const result = isPlayerMatch && liveMatchResult ? liveMatchResult : simulateInternationalMatch(state, match);
    changed = true;
    return { ...match, isPlayed: true, result };
  });

  if (!changed) return state;

  // Recalculate table
  const updatedTable = recalcLeagueTable(lp.teams, updatedMatches);
  const updatedLP: InternationalLeaguePhase = { ...lp, matches: updatedMatches, table: updatedTable };

  const news: NewsItem[] = [];

  // News for player's matches today
  for (const match of updatedMatches) {
    if (match.date !== state.currentDate || !match.isPlayed || !match.result) continue;
    const isPlayerMatch = match.homeTeamId === state.currentTeamId || match.awayTeamId === state.currentTeamId;
    if (!isPlayerMatch) continue;

    const r = match.result;
    const isHome = match.homeTeamId === state.currentTeamId;
    const myScore = isHome ? r.homeScore : r.awayScore;
    const oppScore = isHome ? r.awayScore : r.homeScore;
    const oppName = getTeamName(state, isHome ? match.awayTeamId : match.homeTeamId);
    const resultText = myScore > oppScore ? 'Sieg' : myScore < oppScore ? 'Niederlage' : 'Unentschieden';
    const pos = updatedTable.findIndex(t => t.teamId === state.currentTeamId) + 1;

    news.push({
      id: `intl-match-${match.id}`,
      type: 'general',
      title: `${getCompName(intl.competition)}: ${resultText} gegen ${oppName}`,
      content: `${isHome ? 'Heim' : 'Auswärts'}: ${myScore}:${oppScore}. Aktueller Tabellenplatz: ${pos}/${updatedTable.length}.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'medium',
    });
  }

  // Check if league phase is complete
  const allPlayed = updatedMatches.every(m => m.isPlayed);
  let newIntl: InternationalState = { ...intl, leaguePhase: updatedLP };

  if (allPlayed) {
    const playerPos = updatedTable.findIndex(t => t.teamId === state.currentTeamId);

    if (playerPos < 8) {
      // Top 8: auto-qualify for R16
      const koMatches = generateLeaguePhaseKnockout(updatedTable, state, 'r16');
      newIntl = { ...newIntl, currentPhase: 'r16', knockoutMatches: koMatches };
      news.push({
        id: `intl-lp-top8`,
        type: 'milestone',
        title: `Direkt im Achtelfinale!`,
        content: `Platz ${playerPos + 1} in der Ligaphase! Dein Team qualifiziert sich direkt für das Achtelfinale der ${getCompName(intl.competition)}.`,
        date: state.currentDate,
        isRead: false,
        relatedTeamId: state.currentTeamId,
        importance: 'high',
      });
    } else if (playerPos < 24) {
      // 9-24: playoff round
      const playoffMatches = generatePlayoffRound(updatedTable, state);
      newIntl = { ...newIntl, currentPhase: 'playoff', knockoutMatches: playoffMatches };
      news.push({
        id: `intl-lp-playoff`,
        type: 'milestone',
        title: `Playoff-Runde!`,
        content: `Platz ${playerPos + 1} in der Ligaphase. Dein Team muss in die Playoff-Runde der ${getCompName(intl.competition)}.`,
        date: state.currentDate,
        isRead: false,
        relatedTeamId: state.currentTeamId,
        importance: 'high',
      });
    } else {
      // 25-36: eliminated
      newIntl = { ...newIntl, isEliminated: true, isFinished: true };
      news.push({
        id: `intl-lp-eliminated`,
        type: 'milestone',
        title: `Aus in der Ligaphase`,
        content: `Platz ${playerPos + 1} — Dein Team ist in der Ligaphase der ${getCompName(intl.competition)} ausgeschieden.`,
        date: state.currentDate,
        isRead: false,
        relatedTeamId: state.currentTeamId,
        importance: 'high',
      });
    }
  }

  // Update manager stats for player's international match
  let updatedManager = state.manager;
  for (const match of updatedMatches) {
    if (!match.isPlayed || !match.result || match.date !== state.currentDate) continue;
    const isPlayerMatch = match.homeTeamId === state.currentTeamId || match.awayTeamId === state.currentTeamId;
    if (!isPlayerMatch) continue;
    const r = match.result;
    const isHome = match.homeTeamId === state.currentTeamId;
    const myScore = isHome ? r.homeScore : r.awayScore;
    const oppScore = isHome ? r.awayScore : r.homeScore;
    const won = myScore > oppScore;
    const cleanSheet = oppScore === 0;
    updatedManager = {
      ...updatedManager,
      stats: {
        ...updatedManager.stats,
        totalMatches: updatedManager.stats.totalMatches + 1,
        wins: updatedManager.stats.wins + (won ? 1 : 0),
        draws: updatedManager.stats.draws + (myScore === oppScore ? 1 : 0),
        losses: updatedManager.stats.losses + (myScore < oppScore ? 1 : 0),
        cleanSheets: updatedManager.stats.cleanSheets + (cleanSheet ? 1 : 0),
        currentWinStreak: won ? updatedManager.stats.currentWinStreak + 1 : 0,
        winStreak: won
          ? Math.max(updatedManager.stats.winStreak, updatedManager.stats.currentWinStreak + 1)
          : updatedManager.stats.winStreak,
      },
    };
  }

  return { ...state, internationalState: newIntl, news: [...state.news, ...news], manager: updatedManager };
}

function processKnockout(state: GameState, liveMatchResult?: MatchResult): GameState {
  const intl = state.internationalState!;
  const koMatches = intl.knockoutMatches ?? [];
  if (koMatches.length === 0) return state;

  let changed = false;
  const updatedKO = koMatches.map(match => {
    if (match.isPlayed || match.date !== state.currentDate) return match;
    const isPlayerMatch = match.homeTeamId === state.currentTeamId || match.awayTeamId === state.currentTeamId;
    // Player's match: use live result if provided, otherwise skip (will be played live)
    if (isPlayerMatch && (!liveMatchResult || liveMatchResult.id !== match.id)) return match;
    const result = isPlayerMatch && liveMatchResult ? liveMatchResult : simulateInternationalMatch(state, match);
    changed = true;
    return { ...match, isPlayed: true, result };
  });

  if (!changed) return state;

  const news: NewsItem[] = [];
  const playerMatches = updatedKO.filter(m =>
    m.isPlayed && m.date === state.currentDate &&
    (m.homeTeamId === state.currentTeamId || m.awayTeamId === state.currentTeamId)
  );

  for (const match of playerMatches) {
    if (!match.result) continue;
    const r = match.result;
    const isHome = match.homeTeamId === state.currentTeamId;
    const myScore = isHome ? r.homeScore : r.awayScore;
    const oppScore = isHome ? r.awayScore : r.homeScore;
    const oppName = getTeamName(state, isHome ? match.awayTeamId : match.homeTeamId);
    const resultText = myScore > oppScore ? 'Sieg' : myScore < oppScore ? 'Niederlage' : 'Unentschieden';

    news.push({
      id: `intl-ko-${match.id}`,
      type: 'general',
      title: `${getCompName(intl.competition)} ${getPhaseName(intl.currentPhase)}: ${resultText}`,
      content: `${myScore}:${oppScore} gegen ${oppName}.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    });
  }

  const phaseMatches = updatedKO.filter(m => m.cupRound === intl.currentPhase);
  const allPhasePlayed = phaseMatches.every(m => m.isPlayed);
  let newIntl: InternationalState = { ...intl, knockoutMatches: updatedKO };

  if (allPhasePlayed && phaseMatches.length > 0) {
    const playerMatch = phaseMatches.find(m =>
      m.homeTeamId === state.currentTeamId || m.awayTeamId === state.currentTeamId
    );

    if (playerMatch?.result) {
      const r = playerMatch.result;
      const isHome = playerMatch.homeTeamId === state.currentTeamId;
      const myScore = isHome ? r.homeScore : r.awayScore;
      const oppScore = isHome ? r.awayScore : r.homeScore;
      const won = myScore > oppScore;

      if (!won) {
        newIntl = { ...newIntl, isEliminated: true, isFinished: true };
        news.push({
          id: `intl-ko-eliminated`,
          type: 'milestone',
          title: `Aus in der ${getCompName(intl.competition)}!`,
          content: `Dein Team ist im ${getPhaseName(intl.currentPhase)} ausgeschieden.`,
          date: state.currentDate,
          isRead: false,
          relatedTeamId: state.currentTeamId,
          importance: 'high',
        });
      } else {
        const nextPhase = getNextPhase(intl.currentPhase);
        if (!nextPhase) {
          newIntl = { ...newIntl, isFinished: true };
          news.push({
            id: `intl-winner`,
            type: 'milestone',
            title: `${getCompName(intl.competition)}-SIEGER! 🏆`,
            content: `Unglaublich! Dein Team hat die ${getCompName(intl.competition)} gewonnen!`,
            date: state.currentDate,
            isRead: false,
            relatedTeamId: state.currentTeamId,
            importance: 'high',
          });
        } else {
          const nextMatches = generateNextKnockoutRound(updatedKO, intl.currentPhase, nextPhase, state);
          newIntl = { ...newIntl, currentPhase: nextPhase, knockoutMatches: [...updatedKO, ...nextMatches] };
          news.push({
            id: `intl-advance-${nextPhase}`,
            type: 'milestone',
            title: `Weiter! ${getPhaseName(nextPhase)} erreicht!`,
            content: `Dein Team steht im ${getPhaseName(nextPhase)} der ${getCompName(intl.competition)}!`,
            date: state.currentDate,
            isRead: false,
            relatedTeamId: state.currentTeamId,
            importance: 'high',
          });
        }
      }
    }
  }

  // Update manager stats for player's knockout match
  let updatedManager = state.manager;
  for (const match of playerMatches) {
    if (!match.result) continue;
    const r = match.result;
    const isHome = match.homeTeamId === state.currentTeamId;
    const myScore = isHome ? r.homeScore : r.awayScore;
    const oppScore = isHome ? r.awayScore : r.homeScore;
    const won = myScore > oppScore;
    const cleanSheet = oppScore === 0;
    updatedManager = {
      ...updatedManager,
      stats: {
        ...updatedManager.stats,
        totalMatches: updatedManager.stats.totalMatches + 1,
        wins: updatedManager.stats.wins + (won ? 1 : 0),
        draws: updatedManager.stats.draws + (myScore === oppScore ? 1 : 0),
        losses: updatedManager.stats.losses + (myScore < oppScore ? 1 : 0),
        cleanSheets: updatedManager.stats.cleanSheets + (cleanSheet ? 1 : 0),
        currentWinStreak: won ? updatedManager.stats.currentWinStreak + 1 : 0,
        winStreak: won
          ? Math.max(updatedManager.stats.winStreak, updatedManager.stats.currentWinStreak + 1)
          : updatedManager.stats.winStreak,
      },
    };
  }

  return { ...state, internationalState: newIntl, news: [...state.news, ...news], manager: updatedManager };
}

// ════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════

import { Player } from '@/types/player';

function simulateInternationalMatch(state: GameState, match: Match): MatchResult {
  const homeTeam = state.teams.find(t => t.id === match.homeTeamId);
  const awayTeam = state.teams.find(t => t.id === match.awayTeamId);
  const foreignClub = FOREIGN_CLUBS.find(c => c.id === match.homeTeamId || c.id === match.awayTeamId);

  if (homeTeam && awayTeam) {
    const activeTactic = state.tactics[state.activeTactic ?? 'a'];
    const isPlayerHome = match.homeTeamId === state.currentTeamId;
    const isPlayerAway = match.awayTeamId === state.currentTeamId;
    return simulateMatch(
      match, homeTeam, awayTeam, state.players,
      isPlayerHome ? activeTactic?.lineup : undefined,
      isPlayerAway ? activeTactic?.lineup : undefined,
      isPlayerHome ? state.manager.skills : undefined,
      isPlayerAway ? state.manager.skills : undefined,
      isPlayerHome ? activeTactic?.formation : undefined,
      isPlayerAway ? activeTactic?.formation : undefined,
      isPlayerHome ? activeTactic : undefined,
      isPlayerAway ? activeTactic : undefined,
    );
  }

  const isHomeForeign = !homeTeam;
  const realTeam = homeTeam ?? awayTeam;
  const fc = foreignClub ?? FOREIGN_CLUBS[0];

  if (realTeam) {
    const isPlayerTeam = realTeam.id === state.currentTeamId;
    const realStrength = isPlayerTeam
      ? calcTeamAvgOverall(state.players.filter(p => p.teamId === realTeam.id))
      : realTeam.reputation * 0.9;
    return generateStrengthBasedResult(match, realStrength, fc.strength, isHomeForeign);
  }

  const homeStr = FOREIGN_CLUBS.find(c => c.id === match.homeTeamId)?.strength ?? 70;
  const awayStr = FOREIGN_CLUBS.find(c => c.id === match.awayTeamId)?.strength ?? 70;
  return generateStrengthBasedResult(match, homeStr, awayStr, false);
}

function generateStrengthBasedResult(
  match: Match, homeStr: number, awayStr: number, isHomeForeign: boolean,
): MatchResult {
  const seed = hashStr(match.id + match.date);
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const rngRange = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

  const homeAdv = isHomeForeign ? 0 : 3;
  const diff = (homeStr + homeAdv - awayStr) / 10;
  const homeExpected = Math.max(0.3, 1.3 + diff * 0.3 + rng() * 0.8);
  const awayExpected = Math.max(0.3, 1.3 - diff * 0.3 + rng() * 0.8);
  const homeScore = Math.max(0, Math.round(homeExpected + (rng() - 0.5) * 1.5));
  const awayScore = Math.max(0, Math.round(awayExpected + (rng() - 0.5) * 1.5));
  const homePoss = Math.round(45 + diff * 3 + (rng() - 0.5) * 10);

  return {
    id: match.id,
    homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId,
    homeScore, awayScore, date: match.date,
    matchday: match.matchday, competition: match.competition, leagueId: match.leagueId,
    weather: { type: 'sunny', temperature: 18, description: 'Sonnig' },
    events: [],
    homeStats: {
      possession: homePoss, shots: rngRange(8, 18), shotsOnTarget: rngRange(3, 8),
      corners: rngRange(2, 8), fouls: rngRange(8, 16), yellowCards: rngRange(0, 3),
      redCards: 0, offsides: rngRange(1, 4), passes: rngRange(300, 600), passAccuracy: rngRange(72, 92),
    },
    awayStats: {
      possession: 100 - homePoss, shots: rngRange(6, 16), shotsOnTarget: rngRange(2, 7),
      corners: rngRange(1, 7), fouls: rngRange(8, 16), yellowCards: rngRange(0, 3),
      redCards: 0, offsides: rngRange(1, 4), passes: rngRange(280, 550), passAccuracy: rngRange(70, 90),
    },
    homeRatings: [], awayRatings: [],
    isDerby: false, isExtraTime: false, isPenaltyShootout: false,
  };
}

function calcTeamAvgOverall(players: Player[]): number {
  if (players.length === 0) return 60;
  const sorted = [...players].sort((a, b) => {
    const aOvr = (a.attributes.pace + a.attributes.shooting + a.attributes.passing + a.attributes.dribbling + a.attributes.positioning + a.attributes.composure) / 6;
    const bOvr = (b.attributes.pace + b.attributes.shooting + b.attributes.passing + b.attributes.dribbling + b.attributes.positioning + b.attributes.composure) / 6;
    return bOvr - aOvr;
  });
  const top11 = sorted.slice(0, 11);
  return top11.reduce((s, p) => {
    return s + (p.attributes.pace + p.attributes.shooting + p.attributes.passing + p.attributes.dribbling + p.attributes.positioning + p.attributes.composure) / 6;
  }, 0) / top11.length;
}

function recalcLeagueTable(teams: TeamEntry[], matches: Match[]): TableEntry[] {
  const table: Record<string, TableEntry> = {};
  for (const t of teams) {
    table[t.teamId] = {
      position: 0, teamId: t.teamId,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [],
    };
  }

  for (const m of matches) {
    if (!m.isPlayed || !m.result) continue;
    const h = table[m.homeTeamId];
    const a = table[m.awayTeamId];
    if (!h || !a) continue;

    h.played++; a.played++;
    h.goalsFor += m.result.homeScore; h.goalsAgainst += m.result.awayScore;
    a.goalsFor += m.result.awayScore; a.goalsAgainst += m.result.homeScore;

    if (m.result.homeScore > m.result.awayScore) {
      h.won++; h.points += 3; a.lost++;
      h.form.push('W'); a.form.push('L');
    } else if (m.result.homeScore < m.result.awayScore) {
      a.won++; a.points += 3; h.lost++;
      h.form.push('L'); a.form.push('W');
    } else {
      h.drawn++; a.drawn++; h.points++; a.points++;
      h.form.push('D'); a.form.push('D');
    }
    h.goalDifference = h.goalsFor - h.goalsAgainst;
    a.goalDifference = a.goalsFor - a.goalsAgainst;
  }

  const sorted = Object.values(table).sort((a, b) =>
    b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
  );
  sorted.forEach((e, i) => e.position = i + 1);
  return sorted;
}

/**
 * Generate playoff round: 9th-16th vs 17th-24th (single match).
 */
function generatePlayoffRound(table: TableEntry[], state: GameState): Match[] {
  const seasonYear = parseInt(state.season.year.split('/')[0]);
  const playoffDates = [`${seasonYear + 1}-02-11`, `${seasonYear + 1}-02-12`];
  const matches: Match[] = [];

  // 9th vs 24th, 10th vs 23rd, etc.
  for (let i = 0; i < 8; i++) {
    const high = table[8 + i]; // 9th-16th
    const low = table[23 - i]; // 24th-17th
    if (!high || !low) continue;
    matches.push({
      id: genId(),
      homeTeamId: high.teamId,
      awayTeamId: low.teamId,
      date: playoffDates[i % playoffDates.length],
      time: '21:00',
      matchday: 1,
      competition: state.internationalState!.competition,
      cupRound: 'playoff',
      venue: getTeamName(state, high.teamId),
      isPlayed: false,
    });
  }
  return matches;
}

/**
 * Generate R16 draw from league phase: top 8 + 8 playoff winners.
 */
function generateLeaguePhaseKnockout(table: TableEntry[], state: GameState, phase: string): Match[] {
  const seasonYear = parseInt(state.season.year.split('/')[0]);
  const r16Dates = [
    `${seasonYear + 1}-03-04`, `${seasonYear + 1}-03-05`,
    `${seasonYear + 1}-03-11`, `${seasonYear + 1}-03-12`,
  ];

  // Top 8 are seeded; they'll face playoff winners later.
  // For now, pair top 8 against each other: 1st vs 8th, 2nd vs 7th, etc.
  const matches: Match[] = [];
  for (let i = 0; i < 4; i++) {
    const high = table[i];
    const low = table[7 - i];
    if (!high || !low) continue;
    matches.push({
      id: genId(),
      homeTeamId: high.teamId,
      awayTeamId: low.teamId,
      date: r16Dates[i % r16Dates.length],
      time: '21:00',
      matchday: 1,
      competition: state.internationalState!.competition,
      cupRound: phase,
      venue: getTeamName(state, high.teamId),
      isPlayed: false,
    });
  }
  return matches;
}

function generateNextKnockoutRound(
  prevMatches: Match[], prevPhase: string, nextPhase: string, state: GameState,
): Match[] {
  const phaseMatches = prevMatches.filter(m => m.cupRound === prevPhase && m.isPlayed);
  const advancers: string[] = [];

  for (const m of phaseMatches) {
    if (!m.result) continue;
    const r = m.result;
    if (r.homeScore > r.awayScore) {
      advancers.push(m.homeTeamId);
    } else if (r.awayScore > r.homeScore) {
      advancers.push(m.awayTeamId);
    } else if (r.isPenaltyShootout && r.penaltyHome != null && r.penaltyAway != null) {
      advancers.push(r.penaltyHome > r.penaltyAway ? m.homeTeamId : m.awayTeamId);
    } else {
      advancers.push(m.homeTeamId); // fallback
    }
  }

  const seasonYear = parseInt(state.season.year.split('/')[0]);
  const phaseDates: Record<string, string[]> = {
    r16: [`${seasonYear + 1}-03-04`, `${seasonYear + 1}-03-05`, `${seasonYear + 1}-03-11`, `${seasonYear + 1}-03-12`],
    quarter: [`${seasonYear + 1}-04-08`, `${seasonYear + 1}-04-09`],
    semi: [`${seasonYear + 1}-04-29`, `${seasonYear + 1}-04-30`],
    final: [`${seasonYear + 1}-05-31`],
  };
  const dates = phaseDates[nextPhase] ?? [`${seasonYear + 1}-05-15`];

  const matches: Match[] = [];
  for (let i = 0; i < advancers.length - 1; i += 2) {
    matches.push({
      id: genId(),
      homeTeamId: advancers[i],
      awayTeamId: advancers[i + 1],
      date: dates[Math.floor(i / 2) % dates.length],
      time: '21:00',
      matchday: 1,
      competition: state.internationalState!.competition,
      cupRound: nextPhase,
      venue: getTeamName(state, advancers[i]),
      isPlayed: false,
    });
  }
  return matches;
}

function getNextPhase(phase: string): InternationalState['currentPhase'] | null {
  const order: InternationalState['currentPhase'][] = ['league', 'playoff', 'r16', 'quarter', 'semi', 'final'];
  const idx = order.indexOf(phase as InternationalState['currentPhase']);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

function getCompName(comp: string): string {
  const names: Record<string, string> = { cl: 'Champions League', el: 'Europa League', ecl: 'Conference League' };
  return names[comp] ?? comp;
}

function getPhaseName(phase: string): string {
  const names: Record<string, string> = {
    league: 'Ligaphase', playoff: 'Playoff', r16: 'Achtelfinale',
    quarter: 'Viertelfinale', semi: 'Halbfinale', final: 'Finale',
  };
  return names[phase] ?? phase;
}

function getTeamName(state: GameState, teamId: string): string {
  const team = state.teams.find(t => t.id === teamId);
  if (team) return team.name;
  const fc = FOREIGN_CLUBS.find(c => c.id === teamId);
  if (fc) return fc.name;
  return teamId;
}

function hashDate(d: string): number {
  let h = 0;
  for (let i = 0; i < d.length; i++) { h = ((h << 5) - h) + d.charCodeAt(i); h |= 0; }
  return Math.abs(h) || 1;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h) || 1;
}

export function getForeignClubs(): ForeignClub[] {
  return FOREIGN_CLUBS;
}
