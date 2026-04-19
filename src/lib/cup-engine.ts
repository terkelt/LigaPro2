/**
 * National Cup Engine — generates country-specific cup competitions.
 *
 * Each country has its own national cup (DFB-Pokal, FA Cup, Copa del Rey, etc.).
 * The player only participates in the cup of the country their team belongs to.
 * Teams from other countries in the game do NOT participate in the player's cup.
 *
 * The cup uses teams from the player's country leagues + amateur fillers to reach
 * a power-of-2 bracket size (32 or 64 teams).
 */
import { GameState, CupState, CupRound } from '@/types/game';
import { Match, MatchResult } from '@/types/match';
import { Team } from '@/types/team';
import { NewsItem } from '@/types/news';
import { Player, Position, PlayerAttributes } from '@/types/player';
import { simulateMatch } from './match-engine';

function generateId(): string {
  return 'cup-' + Math.random().toString(36).substring(2, 11);
}

const AMATEUR_FIRST_NAMES = ['Max', 'Tim', 'Lukas', 'Jonas', 'Felix', 'Paul', 'Leon', 'Finn', 'Noah', 'Elias', 'Ben', 'Luca', 'David', 'Moritz', 'Jan', 'Niklas', 'Tom', 'Philipp', 'Alexander', 'Marcel'];
const AMATEUR_LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Klein', 'Schröder', 'Neumann', 'Braun', 'Zimmermann', 'Krüger', 'Hartmann'];
const AMATEUR_POSITIONS: Position[] = ['TW', 'IV', 'IV', 'LV', 'RV', 'ZDM', 'ZM', 'ZM', 'LA', 'RA', 'ST', 'TW', 'IV', 'ZM', 'ST', 'RV', 'ZOM'];

function generateAmateurPlayers(teamId: string, reputation: number): Player[] {
  const baseOvr = Math.max(25, Math.min(50, reputation * 1.5));
  return AMATEUR_POSITIONS.map((pos, i) => {
    const ovr = baseOvr + Math.floor(Math.random() * 12) - 6;
    const attr = (v: number) => Math.max(15, Math.min(70, v + Math.floor(Math.random() * 10) - 5));
    const isGK = pos === 'TW';
    const attributes: PlayerAttributes = {
      ballControl: attr(isGK ? 30 : ovr), dribbling: attr(isGK ? 25 : ovr), passing: attr(ovr),
      crossing: attr(isGK ? 25 : ovr), shooting: attr(isGK ? 25 : ovr), longShots: attr(isGK ? 20 : ovr - 5),
      finishing: attr(isGK ? 20 : ovr), freeKick: attr(ovr - 10), heading: attr(ovr),
      pace: attr(ovr), acceleration: attr(ovr), stamina: attr(ovr + 5), strength: attr(ovr),
      jumping: attr(ovr), vision: attr(ovr - 5), composure: attr(ovr - 5), aggression: attr(ovr),
      positioning: attr(ovr), workRate: attr(ovr + 5), leadership: attr(ovr - 10),
      reflexes: attr(isGK ? ovr + 5 : 20), handling: attr(isGK ? ovr + 5 : 20),
      diving: attr(isGK ? ovr + 5 : 20), kicking: attr(isGK ? ovr : 30), oneOnOne: attr(isGK ? ovr : 20),
    };
    const fn = AMATEUR_FIRST_NAMES[(i * 7 + teamId.length) % AMATEUR_FIRST_NAMES.length];
    const ln = AMATEUR_LAST_NAMES[(i * 3 + teamId.length * 2) % AMATEUR_LAST_NAMES.length];
    return {
      id: `${teamId}-p${i}`,
      firstName: fn, lastName: ln,
      dateOfBirth: `${1990 + Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
      nationality: 'Deutschland', position: pos, secondaryPositions: [],
      foot: Math.random() > 0.7 ? 'left' : 'right', height: 170 + Math.floor(Math.random() * 20),
      weight: 68 + Math.floor(Math.random() * 15), shirtNumber: i + 1, teamId,
      contractUntil: '2026-06-30', salary: 5000, marketValue: 50000,
      attributes, condition: 80, morale: 70, form: 60, fatigue: 10, matchPractice: 50, injuryProne: 20,
      suspended: false, suspendedMatches: 0, potential: ovr + 5, growthRate: 0.5,
      level: 1, xp: 0, xpToNextLevel: 100, trainingBoosts: [], traits: [],
      stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, avgRating: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0 },
      formHistory: [], ratingHistory: [],
      isLoaned: false, isTransferListed: false, transferRequested: false,
    } as Player;
  });
}

// ── National Cup Definitions ──
interface NationalCupDef {
  name: string;
  shortName: string;
  country: string;
  finalVenue: string;
  finalCity: string;
  amateurTeams: { name: string; city: string }[];
}

const NATIONAL_CUPS: Record<string, NationalCupDef> = {
  Deutschland: {
    name: 'DFB-Pokal',
    shortName: 'DFB-Pokal',
    country: 'Deutschland',
    finalVenue: 'Olympiastadion Berlin',
    finalCity: 'Berlin',
    amateurTeams: [
      { name: 'SSV Ulm 1846', city: 'Ulm' },
      { name: 'Rot-Weiss Essen', city: 'Essen' },
      { name: 'Viktoria Köln', city: 'Köln' },
      { name: 'SV Wehen Wiesbaden', city: 'Wiesbaden' },
      { name: 'Hallescher FC', city: 'Halle' },
      { name: 'SC Verl', city: 'Verl' },
      { name: 'TSV 1860 München', city: 'München' },
      { name: 'Chemnitzer FC', city: 'Chemnitz' },
      { name: 'VfB Oldenburg', city: 'Oldenburg' },
      { name: 'TuS Bersenbrück', city: 'Bersenbrück' },
    ],
  },
  England: {
    name: 'FA Cup',
    shortName: 'FA Cup',
    country: 'England',
    finalVenue: 'Wembley Stadium',
    finalCity: 'London',
    amateurTeams: [
      { name: 'Wrexham AFC', city: 'Wrexham' },
      { name: 'Stockport County', city: 'Stockport' },
      { name: 'Mansfield Town', city: 'Mansfield' },
      { name: 'Crawley Town', city: 'Crawley' },
      { name: 'Wycombe Wanderers', city: 'High Wycombe' },
      { name: 'Accrington Stanley', city: 'Accrington' },
      { name: 'Harrogate Town', city: 'Harrogate' },
      { name: 'Sutton United', city: 'London' },
      { name: 'AFC Wimbledon', city: 'London' },
      { name: 'Barrow AFC', city: 'Barrow' },
    ],
  },
  Spanien: {
    name: 'Copa del Rey',
    shortName: 'Copa del Rey',
    country: 'Spanien',
    finalVenue: 'Estadio de La Cartuja',
    finalCity: 'Sevilla',
    amateurTeams: [
      { name: 'Pontevedra CF', city: 'Pontevedra' },
      { name: 'Linares Deportivo', city: 'Linares' },
      { name: 'Cacereño', city: 'Cáceres' },
      { name: 'Arenteiro', city: 'Carballiño' },
      { name: 'Intercity CF', city: 'Alicante' },
      { name: 'Barbastro', city: 'Barbastro' },
      { name: 'Marbella FC', city: 'Marbella' },
      { name: 'Zamora CF', city: 'Zamora' },
      { name: 'Antequera CF', city: 'Antequera' },
      { name: 'Bergantiños', city: 'Carballo' },
    ],
  },
  Italien: {
    name: 'Coppa Italia',
    shortName: 'Coppa Italia',
    country: 'Italien',
    finalVenue: 'Stadio Olimpico',
    finalCity: 'Rom',
    amateurTeams: [
      { name: 'Feralpisalò', city: 'Salò' },
      { name: 'Padova', city: 'Padua' },
      { name: 'Catania SSD', city: 'Catania' },
      { name: 'Foggia', city: 'Foggia' },
      { name: 'Pescara', city: 'Pescara' },
      { name: 'Vicenza', city: 'Vicenza' },
      { name: 'Avellino', city: 'Avellino' },
      { name: 'Perugia', city: 'Perugia' },
      { name: 'Triestina', city: 'Triest' },
      { name: 'Alessandria', city: 'Alessandria' },
    ],
  },
  Frankreich: {
    name: 'Coupe de France',
    shortName: 'Coupe de France',
    country: 'Frankreich',
    finalVenue: 'Stade de France',
    finalCity: 'Paris',
    amateurTeams: [
      { name: 'US Quevilly', city: 'Quevilly' },
      { name: 'Bergerac Périgord', city: 'Bergerac' },
      { name: 'Versailles 78', city: 'Versailles' },
      { name: 'Annecy FC', city: 'Annecy' },
      { name: 'Red Star FC', city: 'Paris' },
      { name: 'US Créteil', city: 'Créteil' },
      { name: 'Bourg-en-Bresse', city: 'Bourg-en-Bresse' },
      { name: 'Sète FC', city: 'Sète' },
      { name: 'Sedan', city: 'Sedan' },
      { name: 'Cholet SO', city: 'Cholet' },
    ],
  },
  Niederlande: {
    name: 'KNVB Beker',
    shortName: 'KNVB Beker',
    country: 'Niederlande',
    finalVenue: 'De Kuip',
    finalCity: 'Rotterdam',
    amateurTeams: [
      { name: 'Katwijk', city: 'Katwijk' },
      { name: 'ODIN \'59', city: 'Heemskerk' },
      { name: 'Quick Boys', city: 'Katwijk' },
      { name: 'IJsselmeervogels', city: 'Spakenburg' },
      { name: 'Kozakken Boys', city: 'Werkendam' },
      { name: 'Staphorst', city: 'Staphorst' },
    ],
  },
  Portugal: {
    name: 'Taça de Portugal',
    shortName: 'Taça de Portugal',
    country: 'Portugal',
    finalVenue: 'Estádio Nacional',
    finalCity: 'Oeiras',
    amateurTeams: [
      { name: 'Tirsense', city: 'Santo Tirso' },
      { name: 'Lusitano FCV', city: 'Vildemoinhos' },
      { name: 'Anadia FC', city: 'Anadia' },
      { name: 'Amarante FC', city: 'Amarante' },
      { name: 'Montalegre', city: 'Montalegre' },
      { name: 'Cinfães', city: 'Cinfães' },
    ],
  },
  Belgien: {
    name: 'Beker van België',
    shortName: 'Beker van België',
    country: 'Belgien',
    finalVenue: 'Koning Boudewijnstadion',
    finalCity: 'Brüssel',
    amateurTeams: [
      { name: 'RFC Seraing', city: 'Seraing' },
      { name: 'Dessel Sport', city: 'Dessel' },
      { name: 'Rupel Boom', city: 'Boom' },
      { name: 'Mandel United', city: 'Izegem' },
    ],
  },
  Schottland: {
    name: 'Scottish Cup',
    shortName: 'Scottish Cup',
    country: 'Schottland',
    finalVenue: 'Hampden Park',
    finalCity: 'Glasgow',
    amateurTeams: [
      { name: 'Bonnyrigg Rose', city: 'Bonnyrigg' },
      { name: 'Kelty Hearts', city: 'Kelty' },
      { name: 'Spartans FC', city: 'Edinburgh' },
      { name: 'Clydebank FC', city: 'Clydebank' },
    ],
  },
};

const ROUND_NAMES = [
  '1. Runde',
  '2. Runde',
  'Achtelfinale',
  'Viertelfinale',
  'Halbfinale',
  'Finale',
];

// ── Cup round dates (approximate schedule) ──
function getCupRoundDate(seasonStartYear: number, roundIndex: number): string {
  const dates = [
    `${seasonStartYear}-08-12`,   // R1: mid-August
    `${seasonStartYear}-10-29`,   // R2: end of October
    `${seasonStartYear + 1}-01-28`, // R16: end of January
    `${seasonStartYear + 1}-02-25`, // QF: end of February
    `${seasonStartYear + 1}-04-01`, // SF: April
    `${seasonStartYear + 1}-05-17`, // Final: mid-May
  ];
  return dates[roundIndex] ?? dates[0];
}

/**
 * Get the cup name for the player's country.
 */
export function getCupName(state: GameState): string {
  const team = state.teams.find(t => t.id === state.currentTeamId);
  if (!team) return 'Pokal';
  const league = state.leagues.find(l => l.id === team.league);
  if (!league) return 'Pokal';
  const cupDef = NATIONAL_CUPS[league.country];
  return cupDef?.shortName ?? 'Pokal';
}

/**
 * Round the number of teams up to the nearest power of 2.
 */
function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Initialize the national cup for the player's country.
 * Only teams from the same country participate.
 */
export function initializeCup(state: GameState): GameState {
  const playerTeam = state.teams.find(t => t.id === state.currentTeamId);
  if (!playerTeam) return state;

  const playerLeague = state.leagues.find(l => l.id === playerTeam.league);
  if (!playerLeague) return state;

  const country = playerLeague.country;
  const cupDef = NATIONAL_CUPS[country];
  if (!cupDef) return state; // no cup defined for this country

  const seasonYear = parseInt(state.season.year.split('/')[0]);

  // Get all teams from this country
  const countryTeams = state.teams.filter(t => {
    const league = state.leagues.find(l => l.id === t.league);
    return league?.country === country;
  });

  // Add amateur placeholder teams
  const amateurTeams: Team[] = cupDef.amateurTeams.map((am, i) => ({
    id: `amateur-${country.toLowerCase()}-${i}`,
    name: am.name,
    shortName: am.name.substring(0, 3).toUpperCase(),
    league: 'amateur',
    founded: 1900,
    stadium: { name: `${am.name} Stadion`, capacity: 5000, city: am.city },
    colors: { primary: '#888888', secondary: '#CCCCCC' },
    logo: '',
    budget: 500000,
    salaryBudget: 300000,
    reputation: 20 + Math.floor(Math.random() * 15),
    facilities: { training: 3, youth: 3, stadium: 3, medical: 3 },
    fans: { loyalty: 50, baseAttendance: 3000, ultrasStrength: 3 },
    boardExpectations: { leaguePosition: 10, cupRound: 'runde1', financialGoal: 'break-even' },
    staff: { manager: '', assistantManager: '', fitnessCoach: '', youthCoach: '', goalkeepingCoach: '' },
    rivals: [],
    boardPatience: 70,
  }));

  const allCupTeams = [...countryTeams, ...amateurTeams];
  const bracketSize = nextPowerOf2(allCupTeams.length);

  // Pad to bracket size with real lower-league club names
  const PADDING_CLUBS: Record<string, { name: string; city: string }[]> = {
    Deutschland: [
      { name: 'Kickers Offenbach', city: 'Offenbach' }, { name: 'Waldhof Mannheim', city: 'Mannheim' },
      { name: 'Stuttgarter Kickers', city: 'Stuttgart' }, { name: 'Fortuna Köln', city: 'Köln' },
      { name: 'Bonner SC', city: 'Bonn' }, { name: 'Wuppertaler SV', city: 'Wuppertal' },
      { name: 'Alemannia Aachen', city: 'Aachen' }, { name: 'Rot-Weiß Oberhausen', city: 'Oberhausen' },
      { name: 'SV Meppen', city: 'Meppen' }, { name: 'VfR Aalen', city: 'Aalen' },
      { name: 'Türkgücü München', city: 'München' }, { name: 'Bayern München II', city: 'München' },
      { name: 'BVB Dortmund II', city: 'Dortmund' }, { name: 'SC Freiburg II', city: 'Freiburg' },
      { name: 'VfB Lübeck', city: 'Lübeck' }, { name: 'Carl Zeiss Jena', city: 'Jena' },
      { name: 'Hansa Rostock II', city: 'Rostock' }, { name: 'SpVgg Bayreuth', city: 'Bayreuth' },
      { name: 'TSV Havelse', city: 'Garbsen' }, { name: 'Sportfreunde Lotte', city: 'Lotte' },
      { name: 'SV Straelen', city: 'Straelen' }, { name: 'FC Homburg', city: 'Homburg' },
      { name: 'SV Elversberg II', city: 'Spiesen-Elversberg' }, { name: 'Wormatia Worms', city: 'Worms' },
      { name: 'FK Pirmasens', city: 'Pirmasens' }, { name: 'FV Illertissen', city: 'Illertissen' },
      { name: 'TSV Steinbach Haiger', city: 'Haiger' }, { name: 'FC Astoria Walldorf', city: 'Walldorf' },
      { name: 'SV Rödinghausen', city: 'Rödinghausen' }, { name: 'SC Wiedenbrück', city: 'Rheda-Wiedenbrück' },
      { name: 'Berliner AK', city: 'Berlin' }, { name: 'Tasmania Berlin', city: 'Berlin' },
    ],
    England: [
      { name: 'Bromley FC', city: 'Bromley' }, { name: 'Oldham Athletic', city: 'Oldham' },
      { name: 'Scunthorpe United', city: 'Scunthorpe' }, { name: 'Hartlepool United', city: 'Hartlepool' },
      { name: 'Rochdale AFC', city: 'Rochdale' }, { name: 'Grimsby Town', city: 'Grimsby' },
      { name: 'Swindon Town', city: 'Swindon' }, { name: 'Tranmere Rovers', city: 'Birkenhead' },
      { name: 'Crewe Alexandra', city: 'Crewe' }, { name: 'Colchester United', city: 'Colchester' },
    ],
    Spanien: [
      { name: 'Deportivo Alavés B', city: 'Vitoria' }, { name: 'Hércules CF', city: 'Alicante' },
      { name: 'Recreativo de Huelva', city: 'Huelva' }, { name: 'Córdoba CF', city: 'Córdoba' },
      { name: 'Real Unión', city: 'Irún' }, { name: 'Gimnàstic Tarragona', city: 'Tarragona' },
      { name: 'Badajoz CF', city: 'Badajoz' }, { name: 'Numancia', city: 'Soria' },
      { name: 'Rayo Majadahonda', city: 'Majadahonda' }, { name: 'Atlético Sanluqueño', city: 'Sanlúcar' },
    ],
    Italien: [
      { name: 'Pro Vercelli', city: 'Vercelli' }, { name: 'Turris', city: 'Torre del Greco' },
      { name: 'Virtus Entella', city: 'Chiavari' }, { name: 'Gubbio', city: 'Gubbio' },
      { name: 'Fidelis Andria', city: 'Andria' }, { name: 'Potenza', city: 'Potenza' },
      { name: 'Viterbese', city: 'Viterbo' }, { name: 'Fermana', city: 'Fermo' },
      { name: 'Vis Pesaro', city: 'Pesaro' }, { name: 'Imolese', city: 'Imola' },
    ],
    Frankreich: [
      { name: 'US Quevilly-Rouen', city: 'Rouen' }, { name: 'Bergerac Périgord', city: 'Bergerac' },
      { name: 'Versailles 78', city: 'Versailles' }, { name: 'Sedan', city: 'Sedan' },
      { name: 'Bourg-en-Bresse', city: 'Bourg-en-Bresse' }, { name: 'Cholet SO', city: 'Cholet' },
      { name: 'Épinal', city: 'Épinal' }, { name: 'Croissy', city: 'Croissy' },
      { name: 'Fréjus Saint-Raphaël', city: 'Fréjus' }, { name: 'Limonest', city: 'Limonest' },
    ],
  };
  const paddingPool = PADDING_CLUBS[country] ?? PADDING_CLUBS.Deutschland;
  let padIdx = 0;
  while (allCupTeams.length < bracketSize) {
    const idx = allCupTeams.length;
    const club = paddingPool[padIdx % paddingPool.length];
    padIdx++;
    allCupTeams.push({
      id: `amateur-${country.toLowerCase()}-gen-${idx}`,
      name: club.name,
      shortName: club.name.substring(0, 3).toUpperCase(),
      league: 'amateur',
      founded: 1950,
      stadium: { name: `${club.name} Stadion`, capacity: 3000, city: club.city },
      colors: { primary: '#888888', secondary: '#CCCCCC' },
      logo: '',
      budget: 300000,
      salaryBudget: 200000,
      reputation: 15 + Math.floor(Math.random() * 10),
      facilities: { training: 2, youth: 2, stadium: 2, medical: 2 },
      fans: { loyalty: 40, baseAttendance: 1500, ultrasStrength: 2 },
      boardExpectations: { leaguePosition: 15, cupRound: 'runde1', financialGoal: 'break-even' },
      staff: { manager: '', assistantManager: '', fitnessCoach: '', youthCoach: '', goalkeepingCoach: '' },
      rivals: [],
      boardPatience: 70,
    });
  }

  const cupTeams = allCupTeams.slice(0, bracketSize);

  // Seed: tier-1 teams vs lower-ranked teams in R1
  const tier1 = cupTeams.filter(t => {
    const league = state.leagues.find(l => l.id === t.league);
    return league?.tier === 1;
  });
  const rest = cupTeams.filter(t => !tier1.includes(t));

  const shuffled1 = [...tier1].sort(() => Math.random() - 0.5);
  const shuffledRest = [...rest].sort(() => Math.random() - 0.5);

  const r1Matches: Match[] = [];
  const date = getCupRoundDate(seasonYear, 0);

  // Tier1 vs rest (lower team is home = cup tradition)
  for (let i = 0; i < shuffled1.length && i < shuffledRest.length; i++) {
    r1Matches.push({
      id: generateId(),
      homeTeamId: shuffledRest[i].id,
      awayTeamId: shuffled1[i].id,
      date,
      time: '18:00',
      matchday: 0,
      competition: 'cup',
      cupRound: '1. Runde',
      venue: shuffledRest[i].stadium.name,
      isPlayed: false,
    });
  }

  // Remaining rest teams play each other
  const remainingRest = shuffledRest.slice(shuffled1.length);
  for (let i = 0; i < remainingRest.length - 1; i += 2) {
    r1Matches.push({
      id: generateId(),
      homeTeamId: remainingRest[i].id,
      awayTeamId: remainingRest[i + 1].id,
      date,
      time: '18:00',
      matchday: 0,
      competition: 'cup',
      cupRound: '1. Runde',
      venue: remainingRest[i].stadium.name,
      isPlayed: false,
    });
  }

  // Remaining tier1 teams that didn't get a rest opponent play each other
  const remainingTier1 = shuffled1.slice(shuffledRest.length);
  for (let i = 0; i < remainingTier1.length - 1; i += 2) {
    r1Matches.push({
      id: generateId(),
      homeTeamId: remainingTier1[i].id,
      awayTeamId: remainingTier1[i + 1].id,
      date,
      time: '20:30',
      matchday: 0,
      competition: 'cup',
      cupRound: '1. Runde',
      venue: remainingTier1[i].stadium.name,
      isPlayed: false,
    });
  }

  const round1: CupRound = {
    name: '1. Runde',
    matches: r1Matches,
    isCompleted: false,
  };

  const cupState: CupState = {
    rounds: [round1],
    currentRound: 0,
    isFinished: false,
  };

  // Add amateur teams to state.teams + generate players for them
  const newAmateurTeams = allCupTeams.filter(t => t.league === 'amateur');
  const existingIds = new Set(state.teams.map(t => t.id));
  const updatedTeams = [...state.teams, ...newAmateurTeams.filter(t => !existingIds.has(t.id))];

  // Generate dummy players for amateur teams that don't have any
  const existingPlayerTeamIds = new Set(state.players.map(p => p.teamId));
  let amateurPlayers: Player[] = [];
  for (const team of newAmateurTeams) {
    if (!existingPlayerTeamIds.has(team.id)) {
      amateurPlayers = [...amateurPlayers, ...generateAmateurPlayers(team.id, team.reputation)];
    }
  }

  const news: NewsItem = {
    id: 'cup-draw-r1',
    type: 'general',
    title: `${cupDef.shortName}: Auslosung 1. Runde`,
    content: `Die Auslosung für die 1. Runde des ${cupDef.name} hat stattgefunden. ${r1Matches.length} Spiele stehen an.`,
    date: state.currentDate,
    isRead: false,
    importance: 'high',
  };

  return {
    ...state,
    cupState,
    teams: updatedTeams,
    players: [...state.players, ...amateurPlayers],
    news: [...state.news, news],
  };
}

/**
 * Check if today has cup matches and simulate them.
 * Called from day-advance. Player's cup match is skipped if liveMatchResult is provided.
 */
export function processCupMatches(state: GameState, liveMatchResult?: MatchResult): GameState {
  if (state.cupState.isFinished) return state;

  const currentRound = state.cupState.rounds[state.cupState.currentRound];
  if (!currentRound) return state;

  // Find unplayed cup matches for today
  const todayCupMatches = currentRound.matches.filter(
    m => m.date === state.currentDate && !m.isPlayed
  );

  if (todayCupMatches.length === 0) return state;

  const updatedMatches = [...currentRound.matches];
  const newResults = [...state.results];
  const newNews = [...state.news];
  let newPlayers = [...state.players];

  for (const match of todayCupMatches) {
    const idx = updatedMatches.findIndex(m => m.id === match.id);
    if (idx === -1) continue;

    const homeTeam = state.teams.find(t => t.id === match.homeTeamId);
    const awayTeam = state.teams.find(t => t.id === match.awayTeamId);
    if (!homeTeam || !awayTeam) continue;

    const isPlayerMatch =
      match.homeTeamId === state.currentTeamId ||
      match.awayTeamId === state.currentTeamId;

    // Player's match: skip if no live result (will be played live via match page)
    if (isPlayerMatch && (!liveMatchResult || liveMatchResult.id !== match.id)) continue;

    let result: MatchResult;
    if (isPlayerMatch && liveMatchResult && liveMatchResult.id === match.id) {
      result = liveMatchResult;
    } else {
      // Simulate cup match for AI teams
      const homeSkills = match.homeTeamId === state.currentTeamId
        ? state.manager.skills
        : state.aiManagers?.[match.homeTeamId]?.skills;
      const awaySkills = match.awayTeamId === state.currentTeamId
        ? state.manager.skills
        : state.aiManagers?.[match.awayTeamId]?.skills;

      const isPlayerHome = match.homeTeamId === state.currentTeamId;
      const activeTactic = state.tactics[state.activeTactic ?? 'a'];
      const playerLineup = activeTactic?.lineup ?? [];
      const playerFormation = activeTactic?.formation;

      const isPlayerAway = !isPlayerHome && match.awayTeamId === state.currentTeamId;
      result = simulateMatch(
        match, homeTeam, awayTeam, state.players,
        isPlayerHome ? playerLineup : undefined,
        isPlayerAway ? playerLineup : undefined,
        homeSkills, awaySkills,
        isPlayerHome ? playerFormation : undefined,
        isPlayerAway ? playerFormation : undefined,
        isPlayerHome ? activeTactic : undefined,
        isPlayerAway ? activeTactic : undefined,
      );
    }

    updatedMatches[idx] = { ...match, isPlayed: true, result };
    newResults.push(result);

    // News for player's cup match
    if (isPlayerMatch) {
      const playerIsHome = match.homeTeamId === state.currentTeamId;
      const myScore = playerIsHome ? result.homeScore : result.awayScore;
      const oppScore = playerIsHome ? result.awayScore : result.homeScore;
      const opponent = playerIsHome ? awayTeam : homeTeam;
      const won = myScore > oppScore;
      const cupName = getCupName(state);

      newNews.push({
        id: `cup-result-${match.id}`,
        type: 'result',
        title: won
          ? `${cupName}: Sieg! ${myScore}:${oppScore} gegen ${opponent.name}`
          : `${cupName}: Aus! ${myScore}:${oppScore} gegen ${opponent.name}`,
        content: `${currentRound.name} des ${cupName}. ${won ? 'Weiter in die nächste Runde!' : 'Ausgeschieden.'}`,
        date: state.currentDate,
        isRead: false,
        relatedTeamId: state.currentTeamId,
        importance: 'high',
      });
    }
  }

  // Update the round
  const updatedRound: CupRound = {
    ...currentRound,
    matches: updatedMatches,
    isCompleted: updatedMatches.every(m => m.isPlayed),
  };

  const updatedRounds = [...state.cupState.rounds];
  updatedRounds[state.cupState.currentRound] = updatedRound;

  let updatedCupState: CupState = {
    ...state.cupState,
    rounds: updatedRounds,
  };

  // If round is complete, generate next round draw
  if (updatedRound.isCompleted) {
    updatedCupState = generateNextRound(updatedCupState, state);
  }

  // Update manager stats for player's cup match
  let updatedManager = state.manager;
  for (const match of updatedMatches) {
    if (!match.isPlayed || !match.result) continue;
    const isPlayerMatch = match.homeTeamId === state.currentTeamId || match.awayTeamId === state.currentTeamId;
    if (!isPlayerMatch) continue;
    // Only count matches that were just played today
    if (match.date !== state.currentDate) continue;
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

  return {
    ...state,
    cupState: updatedCupState,
    results: newResults,
    news: newNews,
    players: newPlayers,
    manager: updatedManager,
  };
}

/**
 * Generate the next cup round from winners of the current round.
 */
function generateNextRound(cupState: CupState, state: GameState): CupState {
  const currentRound = cupState.rounds[cupState.currentRound];
  if (!currentRound) return cupState;

  // Determine winners (handle extra time + penalties)
  const winners: string[] = [];
  for (const match of currentRound.matches) {
    if (!match.result) continue;
    const r = match.result;
    if (r.homeScore > r.awayScore) {
      winners.push(match.homeTeamId);
    } else if (r.awayScore > r.homeScore) {
      winners.push(match.awayTeamId);
    } else if (r.isPenaltyShootout && r.penaltyHome != null && r.penaltyAway != null) {
      winners.push(r.penaltyHome > r.penaltyAway ? match.homeTeamId : match.awayTeamId);
    } else {
      // Fallback: home team advances (should not happen with proper ET/penalties)
      winners.push(match.homeTeamId);
    }
  }

  // If only 1 winner left = cup is finished
  if (winners.length <= 1) {
    return {
      ...cupState,
      isFinished: true,
      winnerId: winners[0],
    };
  }

  const nextRoundIdx = cupState.currentRound + 1;
  const roundName = ROUND_NAMES[nextRoundIdx] ?? `Runde ${nextRoundIdx + 1}`;
  const seasonYear = parseInt(state.season.year.split('/')[0]);
  const date = getCupRoundDate(seasonYear, nextRoundIdx);

  // Shuffle winners and pair them
  const shuffled = [...winners].sort(() => Math.random() - 0.5);
  const nextMatches: Match[] = [];

  // Determine final venue from national cup definition
  const playerTeam = state.teams.find(t => t.id === state.currentTeamId);
  const playerLeague = playerTeam ? state.leagues.find(l => l.id === playerTeam.league) : null;
  const cupDef = playerLeague ? NATIONAL_CUPS[playerLeague.country] : null;
  const finalVenue = cupDef?.finalVenue ?? 'Nationalstadion';

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const homeTeam = state.teams.find(t => t.id === shuffled[i]);
    nextMatches.push({
      id: generateId(),
      homeTeamId: shuffled[i],
      awayTeamId: shuffled[i + 1],
      date,
      time: roundName === 'Finale' ? '20:00' : '18:00',
      matchday: 0,
      competition: 'cup',
      cupRound: roundName,
      venue: roundName === 'Finale' ? finalVenue : (homeTeam?.stadium.name ?? ''),
      isPlayed: false,
    });
  }

  const nextRound: CupRound = {
    name: roundName,
    matches: nextMatches,
    isCompleted: false,
  };

  return {
    ...cupState,
    rounds: [...cupState.rounds, nextRound],
    currentRound: nextRoundIdx,
  };
}
