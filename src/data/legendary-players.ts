/**
 * Legendary Players Database — Real-world football icons in their prime.
 *
 * Each player is defined at their peak age with historically accurate attributes.
 * These are NOT randomly generated — they represent the greatest players of all time.
 *
 * Tiers:
 *   Diamond (90-95 OVR) — All-time greats
 *   Gold    (85-90 OVR) — World-class icons
 *   Silver  (80-85 OVR) — Elite era-defining players
 *   Bronze  (75-80 OVR) — Cult heroes & national legends
 */

import type { Position, FootPreference, PlayerAttributes } from '@/types/player';

export interface LegendaryPlayerTemplate {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  position: Position;
  secondaryPositions: Position[];
  foot: FootPreference;
  height: number;
  weight: number;
  primeAge: number;           // Age at which they appear
  tier: 'diamond' | 'gold' | 'silver' | 'bronze';
  attributes: PlayerAttributes;
  marketValue: number;        // In euros
  salary: number;             // Weekly salary
  bio: string;                // Short career highlight
  traitIds?: string[];        // Special trait IDs
  retired?: boolean;          // true = career ended, false/undefined = still active (shows as "Prime-Version")
}

// ════════════════════════════════════════════════════════
//  DIAMOND TIER — All-Time Greats (90-95 OVR)
// ════════════════════════════════════════════════════════

const DIAMOND_LEGENDS: LegendaryPlayerTemplate[] = [
  {
    id: 'legend-maradona', firstName: 'Diego', lastName: 'Maradona',
    nationality: '🇦🇷', position: 'ZOM', secondaryPositions: ['ST', 'LA'],
    foot: 'left', height: 165, weight: 67, primeAge: 25, tier: 'diamond',
    attributes: {
      ballControl: 97, dribbling: 98, passing: 88, crossing: 78, shooting: 90,
      longShots: 88, finishing: 91, freeKick: 92, heading: 62,
      pace: 87, acceleration: 92, stamina: 78, strength: 72, jumping: 65,
      vision: 95, composure: 93, aggression: 75, positioning: 90, workRate: 72, leadership: 88,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 180_000_000, salary: 450_000,
    bio: 'Die Hand Gottes. WM-Sieger 1986. Der beste Dribbler aller Zeiten.',
    retired: true,
  },
  {
    id: 'legend-pele', firstName: '', lastName: 'Pelé',
    nationality: '🇧🇷', position: 'ST', secondaryPositions: ['ZOM'],
    foot: 'right', height: 173, weight: 70, primeAge: 23, tier: 'diamond',
    attributes: {
      ballControl: 95, dribbling: 94, passing: 85, crossing: 72, shooting: 95,
      longShots: 88, finishing: 97, freeKick: 82, heading: 85,
      pace: 90, acceleration: 93, stamina: 85, strength: 78, jumping: 88,
      vision: 90, composure: 95, aggression: 70, positioning: 96, workRate: 80, leadership: 92,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 200_000_000, salary: 480_000,
    bio: '3x Weltmeister. 1281 Tore. O Rei — der König des Fußballs.',
    retired: true,
  },
  {
    id: 'legend-cruyff', firstName: 'Johan', lastName: 'Cruyff',
    nationality: '🇳🇱', position: 'ST', secondaryPositions: ['ZOM', 'LA'],
    foot: 'right', height: 180, weight: 72, primeAge: 26, tier: 'diamond',
    attributes: {
      ballControl: 95, dribbling: 96, passing: 90, crossing: 80, shooting: 85,
      longShots: 82, finishing: 88, freeKick: 78, heading: 75,
      pace: 88, acceleration: 90, stamina: 82, strength: 70, jumping: 78,
      vision: 96, composure: 92, aggression: 68, positioning: 92, workRate: 85, leadership: 90,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 170_000_000, salary: 420_000,
    bio: 'Erfinder des Totalen Fußballs. 3x Ballon d\'Or. Ajax & Barcelona-Legende.',
    retired: true,
  },
  {
    id: 'legend-beckenbauer', firstName: 'Franz', lastName: 'Beckenbauer',
    nationality: '🇩🇪', position: 'IV', secondaryPositions: ['ZDM'],
    foot: 'right', height: 181, weight: 75, primeAge: 27, tier: 'diamond',
    attributes: {
      ballControl: 88, dribbling: 82, passing: 92, crossing: 78, shooting: 75,
      longShots: 78, finishing: 72, freeKick: 80, heading: 82,
      pace: 78, acceleration: 80, stamina: 85, strength: 82, jumping: 80,
      vision: 93, composure: 95, aggression: 72, positioning: 95, workRate: 88, leadership: 97,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 160_000_000, salary: 400_000,
    bio: 'Der Kaiser. Erfinder des Libero. WM-Sieger als Spieler und Trainer.',
    retired: true,
  },
  {
    id: 'legend-messi-prime', firstName: 'Lionel', lastName: 'Messi',
    nationality: '🇦🇷', position: 'RA', secondaryPositions: ['ZOM', 'ST'],
    foot: 'left', height: 170, weight: 67, primeAge: 25, tier: 'diamond',
    attributes: {
      ballControl: 98, dribbling: 97, passing: 92, crossing: 85, shooting: 93,
      longShots: 90, finishing: 96, freeKick: 94, heading: 65,
      pace: 90, acceleration: 95, stamina: 78, strength: 65, jumping: 68,
      vision: 96, composure: 95, aggression: 60, positioning: 94, workRate: 70, leadership: 82,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 220_000_000, salary: 500_000,
    bio: '8x Ballon d\'Or. WM-Sieger 2022. Der kompletteste Spieler der Geschichte. (Prime-Version)',
    retired: false,
  },
  {
    id: 'legend-ronaldo-r9', firstName: 'Ronaldo', lastName: 'Nazário',
    nationality: '🇧🇷', position: 'ST', secondaryPositions: [],
    foot: 'right', height: 183, weight: 82, primeAge: 23, tier: 'diamond',
    attributes: {
      ballControl: 93, dribbling: 95, passing: 75, crossing: 65, shooting: 95,
      longShots: 85, finishing: 98, freeKick: 72, heading: 82,
      pace: 96, acceleration: 97, stamina: 75, strength: 85, jumping: 82,
      vision: 80, composure: 92, aggression: 72, positioning: 95, workRate: 68, leadership: 72,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 200_000_000, salary: 470_000,
    bio: 'O Fenômeno. 2x WM-Sieger. Der explosivste Stürmer aller Zeiten.',
    retired: true,
  },
  {
    id: 'legend-ronaldo-cr7', firstName: 'Cristiano', lastName: 'Ronaldo',
    nationality: '🇵🇹', position: 'ST', secondaryPositions: ['LA', 'RA'],
    foot: 'right', height: 187, weight: 83, primeAge: 27, tier: 'diamond',
    attributes: {
      ballControl: 92, dribbling: 90, passing: 82, crossing: 85, shooting: 95,
      longShots: 92, finishing: 97, freeKick: 90, heading: 95,
      pace: 93, acceleration: 92, stamina: 90, strength: 88, jumping: 95,
      vision: 82, composure: 92, aggression: 78, positioning: 96, workRate: 88, leadership: 88,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 210_000_000, salary: 490_000,
    bio: '5x Ballon d\'Or. 900+ Karrieretore. Die ultimative Tormaschine. (Prime-Version)',
    retired: false,
  },
];

// ════════════════════════════════════════════════════════
//  GOLD TIER — World-Class Icons (85-90 OVR)
// ════════════════════════════════════════════════════════

const GOLD_ICONS: LegendaryPlayerTemplate[] = [
  {
    id: 'legend-zidane', firstName: 'Zinédine', lastName: 'Zidane',
    nationality: '🇫🇷', position: 'ZOM', secondaryPositions: ['ZM'],
    foot: 'right', height: 185, weight: 80, primeAge: 26, tier: 'gold',
    attributes: {
      ballControl: 95, dribbling: 90, passing: 90, crossing: 78, shooting: 85,
      longShots: 86, finishing: 82, freeKick: 80, heading: 78,
      pace: 78, acceleration: 82, stamina: 80, strength: 82, jumping: 75,
      vision: 94, composure: 95, aggression: 70, positioning: 88, workRate: 78, leadership: 88,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 130_000_000, salary: 350_000,
    bio: 'WM-Sieger 1998. 3x FIFA-Weltfußballer. Eleganz in Person.',
    retired: true,
  },
  {
    id: 'legend-ronaldinho', firstName: 'Ronaldinho', lastName: 'Gaúcho',
    nationality: '🇧🇷', position: 'ZOM', secondaryPositions: ['LA', 'ST'],
    foot: 'right', height: 181, weight: 76, primeAge: 25, tier: 'gold',
    attributes: {
      ballControl: 96, dribbling: 95, passing: 88, crossing: 82, shooting: 82,
      longShots: 85, finishing: 80, freeKick: 90, heading: 65,
      pace: 88, acceleration: 90, stamina: 72, strength: 70, jumping: 72,
      vision: 92, composure: 88, aggression: 55, positioning: 82, workRate: 62, leadership: 72,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 120_000_000, salary: 330_000,
    bio: 'Ballon d\'Or 2005. Der Magier. Standing Ovations im Bernabéu.',
    retired: true,
  },
  {
    id: 'legend-henry', firstName: 'Thierry', lastName: 'Henry',
    nationality: '🇫🇷', position: 'ST', secondaryPositions: ['LA'],
    foot: 'right', height: 188, weight: 83, primeAge: 27, tier: 'gold',
    attributes: {
      ballControl: 90, dribbling: 88, passing: 80, crossing: 78, shooting: 90,
      longShots: 82, finishing: 93, freeKick: 72, heading: 75,
      pace: 94, acceleration: 95, stamina: 82, strength: 78, jumping: 78,
      vision: 85, composure: 90, aggression: 72, positioning: 92, workRate: 80, leadership: 82,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 110_000_000, salary: 320_000,
    bio: 'Arsenals Rekordtorschütze. WM-Sieger 1998. Invincibles-Legende.',
    retired: true,
  },
  {
    id: 'legend-maldini', firstName: 'Paolo', lastName: 'Maldini',
    nationality: '🇮🇹', position: 'LV', secondaryPositions: ['IV'],
    foot: 'left', height: 186, weight: 85, primeAge: 28, tier: 'gold',
    attributes: {
      ballControl: 78, dribbling: 72, passing: 82, crossing: 80, shooting: 55,
      longShots: 52, finishing: 48, freeKick: 55, heading: 85,
      pace: 82, acceleration: 80, stamina: 88, strength: 88, jumping: 85,
      vision: 82, composure: 95, aggression: 78, positioning: 96, workRate: 90, leadership: 95,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 100_000_000, salary: 300_000,
    bio: '5x Champions-League-Sieger. 25 Jahre AC Milan. Der perfekte Verteidiger.',
    retired: true,
  },
  {
    id: 'legend-matthaus', firstName: 'Lothar', lastName: 'Matthäus',
    nationality: '🇩🇪', position: 'ZDM', secondaryPositions: ['ZM', 'IV'],
    foot: 'right', height: 174, weight: 73, primeAge: 27, tier: 'gold',
    attributes: {
      ballControl: 85, dribbling: 80, passing: 88, crossing: 75, shooting: 88,
      longShots: 90, finishing: 82, freeKick: 82, heading: 78,
      pace: 82, acceleration: 85, stamina: 90, strength: 85, jumping: 80,
      vision: 88, composure: 90, aggression: 85, positioning: 90, workRate: 92, leadership: 95,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 110_000_000, salary: 310_000,
    bio: 'FIFA-Weltfußballer 1991. WM-Sieger 1990. Deutschlands komplettester Spieler.',
    retired: true,
  },
  {
    id: 'legend-platini', firstName: 'Michel', lastName: 'Platini',
    nationality: '🇫🇷', position: 'ZOM', secondaryPositions: ['ZM'],
    foot: 'right', height: 179, weight: 72, primeAge: 27, tier: 'gold',
    attributes: {
      ballControl: 92, dribbling: 85, passing: 92, crossing: 82, shooting: 90,
      longShots: 88, finishing: 90, freeKick: 95, heading: 72,
      pace: 75, acceleration: 78, stamina: 78, strength: 70, jumping: 72,
      vision: 95, composure: 92, aggression: 65, positioning: 90, workRate: 75, leadership: 88,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 105_000_000, salary: 300_000,
    bio: '3x Ballon d\'Or in Folge. EM-Sieger 1984. Juventus-Legende.',
    retired: true,
  },
  {
    id: 'legend-gerrard', firstName: 'Steven', lastName: 'Gerrard',
    nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'ZM', secondaryPositions: ['ZOM', 'ZDM'],
    foot: 'right', height: 183, weight: 79, primeAge: 26, tier: 'gold',
    attributes: {
      ballControl: 82, dribbling: 78, passing: 88, crossing: 85, shooting: 88,
      longShots: 92, finishing: 82, freeKick: 85, heading: 78,
      pace: 80, acceleration: 82, stamina: 90, strength: 85, jumping: 80,
      vision: 85, composure: 88, aggression: 82, positioning: 85, workRate: 95, leadership: 95,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 95_000_000, salary: 280_000,
    bio: 'Wunder von Istanbul 2005. Mr. Liverpool. Einer der besten Mittelfeldspieler Englands.',
    retired: true,
  },
  {
    id: 'legend-xavi', firstName: 'Xavi', lastName: 'Hernández',
    nationality: '🇪🇸', position: 'ZM', secondaryPositions: ['ZOM'],
    foot: 'right', height: 170, weight: 68, primeAge: 28, tier: 'gold',
    attributes: {
      ballControl: 93, dribbling: 82, passing: 96, crossing: 82, shooting: 72,
      longShots: 75, finishing: 68, freeKick: 78, heading: 55,
      pace: 68, acceleration: 72, stamina: 82, strength: 62, jumping: 58,
      vision: 97, composure: 95, aggression: 55, positioning: 90, workRate: 85, leadership: 90,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 100_000_000, salary: 290_000,
    bio: 'WM-Sieger 2010. 2x EM-Sieger. Das Gehirn von Tiki-Taka.',
    retired: true,
  },
  {
    id: 'legend-iniesta', firstName: 'Andrés', lastName: 'Iniesta',
    nationality: '🇪🇸', position: 'ZM', secondaryPositions: ['ZOM', 'LA'],
    foot: 'right', height: 171, weight: 68, primeAge: 26, tier: 'gold',
    attributes: {
      ballControl: 95, dribbling: 92, passing: 93, crossing: 80, shooting: 78,
      longShots: 80, finishing: 75, freeKick: 78, heading: 55,
      pace: 78, acceleration: 82, stamina: 80, strength: 60, jumping: 58,
      vision: 95, composure: 95, aggression: 52, positioning: 88, workRate: 82, leadership: 85,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 100_000_000, salary: 290_000,
    bio: 'WM-Siegtor 2010. El Ilusionista. Einer der elegantesten Spieler aller Zeiten.',
    retired: true,
  },
  {
    id: 'legend-neymar-prime', firstName: 'Neymar', lastName: 'Jr.',
    nationality: '🇧🇷', position: 'LA', secondaryPositions: ['ZOM', 'RA'],
    foot: 'right', height: 175, weight: 68, primeAge: 25, tier: 'gold',
    attributes: {
      ballControl: 95, dribbling: 96, passing: 85, crossing: 82, shooting: 85,
      longShots: 82, finishing: 85, freeKick: 88, heading: 58,
      pace: 90, acceleration: 94, stamina: 72, strength: 58, jumping: 62,
      vision: 88, composure: 85, aggression: 55, positioning: 85, workRate: 62, leadership: 68,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 120_000_000, salary: 350_000,
    bio: 'MSN-Trident mit Messi & Suárez. CL-Sieger 2015. Brasiliens Superstar. (Prime-Version)',
    retired: false,
  },
];

// ════════════════════════════════════════════════════════
//  SILVER TIER — Elite Era-Defining Players (80-85 OVR)
// ════════════════════════════════════════════════════════

const SILVER_HEROES: LegendaryPlayerTemplate[] = [
  {
    id: 'legend-lampard', firstName: 'Frank', lastName: 'Lampard',
    nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'ZM', secondaryPositions: ['ZOM'],
    foot: 'right', height: 184, weight: 82, primeAge: 27, tier: 'silver',
    attributes: {
      ballControl: 80, dribbling: 75, passing: 85, crossing: 78, shooting: 88,
      longShots: 90, finishing: 88, freeKick: 78, heading: 78,
      pace: 72, acceleration: 74, stamina: 90, strength: 78, jumping: 75,
      vision: 85, composure: 88, aggression: 72, positioning: 88, workRate: 92, leadership: 85,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 65_000_000, salary: 220_000,
    bio: 'Chelseas Rekordtorschütze. CL-Sieger 2012. 211 Premier-League-Tore als Mittelfeldspieler.',
    retired: true,
  },
  {
    id: 'legend-scholes', firstName: 'Paul', lastName: 'Scholes',
    nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'ZM', secondaryPositions: ['ZOM'],
    foot: 'right', height: 170, weight: 72, primeAge: 28, tier: 'silver',
    attributes: {
      ballControl: 85, dribbling: 72, passing: 92, crossing: 75, shooting: 85,
      longShots: 90, finishing: 78, freeKick: 72, heading: 62,
      pace: 65, acceleration: 68, stamina: 82, strength: 68, jumping: 62,
      vision: 92, composure: 90, aggression: 72, positioning: 85, workRate: 82, leadership: 80,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 55_000_000, salary: 200_000,
    bio: 'Manchester Uniteds Passgenie. 11x Premier-League-Meister. Der stille Maestro.',
    retired: true,
  },
  {
    id: 'legend-lahm', firstName: 'Philipp', lastName: 'Lahm',
    nationality: '🇩🇪', position: 'RV', secondaryPositions: ['ZDM', 'LV'],
    foot: 'right', height: 170, weight: 66, primeAge: 28, tier: 'silver',
    attributes: {
      ballControl: 82, dribbling: 78, passing: 85, crossing: 85, shooting: 62,
      longShots: 58, finishing: 55, freeKick: 62, heading: 62,
      pace: 82, acceleration: 85, stamina: 90, strength: 68, jumping: 68,
      vision: 85, composure: 92, aggression: 65, positioning: 92, workRate: 95, leadership: 92,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 60_000_000, salary: 210_000,
    bio: 'WM-Kapitän 2014. Bayerns Führungsspieler. Der intelligenteste Außenverteidiger.',
    retired: true,
  },
  {
    id: 'legend-buffon', firstName: 'Gianluigi', lastName: 'Buffon',
    nationality: '🇮🇹', position: 'TW', secondaryPositions: [],
    foot: 'right', height: 192, weight: 92, primeAge: 27, tier: 'silver',
    attributes: {
      ballControl: 35, dribbling: 20, passing: 55, crossing: 15, shooting: 15,
      longShots: 10, finishing: 10, freeKick: 10, heading: 25,
      pace: 50, acceleration: 52, stamina: 78, strength: 82, jumping: 88,
      vision: 60, composure: 95, aggression: 55, positioning: 45, workRate: 72, leadership: 92,
      reflexes: 95, handling: 92, diving: 94, kicking: 78, oneOnOne: 90,
    },
    marketValue: 60_000_000, salary: 210_000,
    bio: 'WM-Sieger 2006. 25 Jahre Weltklasse. Der beste Torwart seiner Generation.',
    retired: true,
  },
  {
    id: 'legend-pirlo', firstName: 'Andrea', lastName: 'Pirlo',
    nationality: '🇮🇹', position: 'ZDM', secondaryPositions: ['ZM'],
    foot: 'right', height: 177, weight: 68, primeAge: 28, tier: 'silver',
    attributes: {
      ballControl: 88, dribbling: 78, passing: 95, crossing: 85, shooting: 78,
      longShots: 85, finishing: 68, freeKick: 95, heading: 55,
      pace: 62, acceleration: 65, stamina: 72, strength: 62, jumping: 58,
      vision: 96, composure: 95, aggression: 45, positioning: 82, workRate: 65, leadership: 82,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 55_000_000, salary: 200_000,
    bio: 'WM-Sieger 2006. L\'Architetto. Freistoßkünstler und Spielmacher aus der Tiefe.',
    retired: true,
  },
  {
    id: 'legend-kahn', firstName: 'Oliver', lastName: 'Kahn',
    nationality: '🇩🇪', position: 'TW', secondaryPositions: [],
    foot: 'right', height: 188, weight: 91, primeAge: 28, tier: 'silver',
    attributes: {
      ballControl: 30, dribbling: 15, passing: 50, crossing: 10, shooting: 10,
      longShots: 10, finishing: 10, freeKick: 10, heading: 25,
      pace: 48, acceleration: 50, stamina: 80, strength: 88, jumping: 85,
      vision: 55, composure: 90, aggression: 92, positioning: 42, workRate: 85, leadership: 95,
      reflexes: 94, handling: 90, diving: 92, kicking: 72, oneOnOne: 92,
    },
    marketValue: 55_000_000, salary: 200_000,
    bio: 'Der Titan. WM-Bester Spieler 2002. Bayerns Mauer. Furchteinflößende Präsenz.',
    retired: true,
  },
  {
    id: 'legend-roberto-carlos', firstName: 'Roberto', lastName: 'Carlos',
    nationality: '🇧🇷', position: 'LV', secondaryPositions: [],
    foot: 'left', height: 168, weight: 73, primeAge: 27, tier: 'silver',
    attributes: {
      ballControl: 78, dribbling: 80, passing: 78, crossing: 90, shooting: 82,
      longShots: 92, finishing: 65, freeKick: 95, heading: 58,
      pace: 92, acceleration: 94, stamina: 92, strength: 82, jumping: 75,
      vision: 75, composure: 80, aggression: 78, positioning: 78, workRate: 90, leadership: 78,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 60_000_000, salary: 210_000,
    bio: 'WM-Sieger 2002. Der Freistoß gegen Frankreich. Real Madrids Turbo-Verteidiger.',
    retired: true,
  },
  {
    id: 'legend-bergkamp', firstName: 'Dennis', lastName: 'Bergkamp',
    nationality: '🇳🇱', position: 'ZOM', secondaryPositions: ['ST'],
    foot: 'right', height: 183, weight: 79, primeAge: 28, tier: 'silver',
    attributes: {
      ballControl: 95, dribbling: 88, passing: 88, crossing: 72, shooting: 85,
      longShots: 80, finishing: 90, freeKick: 78, heading: 72,
      pace: 72, acceleration: 75, stamina: 75, strength: 72, jumping: 70,
      vision: 92, composure: 95, aggression: 55, positioning: 90, workRate: 72, leadership: 78,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 55_000_000, salary: 200_000,
    bio: 'Der Nicht-Fliegende Holländer. Arsenals Künstler. Meister der ersten Berührung.',
    retired: true,
  },
  {
    id: 'legend-rivaldo', firstName: 'Rivaldo', lastName: '',
    nationality: '🇧🇷', position: 'ZOM', secondaryPositions: ['LA', 'ST'],
    foot: 'left', height: 186, weight: 75, primeAge: 27, tier: 'silver',
    attributes: {
      ballControl: 90, dribbling: 88, passing: 82, crossing: 75, shooting: 90,
      longShots: 92, finishing: 88, freeKick: 88, heading: 75,
      pace: 80, acceleration: 82, stamina: 78, strength: 78, jumping: 78,
      vision: 88, composure: 88, aggression: 65, positioning: 85, workRate: 72, leadership: 75,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 55_000_000, salary: 200_000,
    bio: 'Ballon d\'Or 1999. WM-Sieger 2002. Barcelonas brasilianischer Zauberer.',
    retired: true,
  },
  {
    id: 'legend-neuer-prime', firstName: 'Manuel', lastName: 'Neuer',
    nationality: '🇩🇪', position: 'TW', secondaryPositions: [],
    foot: 'right', height: 193, weight: 92, primeAge: 28, tier: 'silver',
    attributes: {
      ballControl: 45, dribbling: 25, passing: 70, crossing: 15, shooting: 15,
      longShots: 10, finishing: 10, freeKick: 10, heading: 25,
      pace: 55, acceleration: 58, stamina: 82, strength: 85, jumping: 88,
      vision: 65, composure: 95, aggression: 55, positioning: 48, workRate: 78, leadership: 92,
      reflexes: 95, handling: 93, diving: 95, kicking: 88, oneOnOne: 93,
    },
    marketValue: 65_000_000, salary: 220_000,
    bio: 'WM-Sieger 2014. Revolutionierte die Torwartposition. Der Libero-Keeper. (Prime-Version)',
    retired: false,
  },
];

// ════════════════════════════════════════════════════════
//  BRONZE TIER — Cult Heroes & National Legends (75-80 OVR)
// ════════════════════════════════════════════════════════

const BRONZE_ICONS: LegendaryPlayerTemplate[] = [
  {
    id: 'legend-klose', firstName: 'Miroslav', lastName: 'Klose',
    nationality: '🇩🇪', position: 'ST', secondaryPositions: [],
    foot: 'right', height: 182, weight: 74, primeAge: 28, tier: 'bronze',
    attributes: {
      ballControl: 72, dribbling: 68, passing: 68, crossing: 58, shooting: 82,
      longShots: 65, finishing: 88, freeKick: 55, heading: 92,
      pace: 78, acceleration: 80, stamina: 85, strength: 75, jumping: 90,
      vision: 72, composure: 85, aggression: 65, positioning: 90, workRate: 88, leadership: 78,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 35_000_000, salary: 150_000,
    bio: 'WM-Rekordtorschütze (16 Tore). WM-Sieger 2014. Der Kopfballkönig.',
    retired: true,
  },
  {
    id: 'legend-ballack', firstName: 'Michael', lastName: 'Ballack',
    nationality: '🇩🇪', position: 'ZM', secondaryPositions: ['ZOM'],
    foot: 'right', height: 189, weight: 83, primeAge: 27, tier: 'bronze',
    attributes: {
      ballControl: 78, dribbling: 72, passing: 82, crossing: 75, shooting: 85,
      longShots: 88, finishing: 82, freeKick: 80, heading: 85,
      pace: 75, acceleration: 78, stamina: 85, strength: 85, jumping: 85,
      vision: 82, composure: 85, aggression: 78, positioning: 82, workRate: 88, leadership: 90,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 40_000_000, salary: 160_000,
    bio: 'Deutschlands Kapitän. Vizeweltmeister 2002. Kraftpaket im Mittelfeld.',
    retired: true,
  },
  {
    id: 'legend-schweinsteiger', firstName: 'Bastian', lastName: 'Schweinsteiger',
    nationality: '🇩🇪', position: 'ZM', secondaryPositions: ['ZDM'],
    foot: 'right', height: 183, weight: 79, primeAge: 28, tier: 'bronze',
    attributes: {
      ballControl: 80, dribbling: 75, passing: 85, crossing: 78, shooting: 78,
      longShots: 82, finishing: 72, freeKick: 75, heading: 72,
      pace: 72, acceleration: 75, stamina: 88, strength: 80, jumping: 72,
      vision: 85, composure: 88, aggression: 78, positioning: 85, workRate: 92, leadership: 92,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 38_000_000, salary: 155_000,
    bio: 'WM-Sieger 2014. Bayerns Herz. Fußball-Gott mit blutender Augenbraue im Finale.',
    retired: true,
  },
  {
    id: 'legend-totti', firstName: 'Francesco', lastName: 'Totti',
    nationality: '🇮🇹', position: 'ZOM', secondaryPositions: ['ST'],
    foot: 'right', height: 180, weight: 82, primeAge: 27, tier: 'bronze',
    attributes: {
      ballControl: 90, dribbling: 85, passing: 88, crossing: 78, shooting: 85,
      longShots: 85, finishing: 88, freeKick: 82, heading: 72,
      pace: 72, acceleration: 75, stamina: 72, strength: 75, jumping: 70,
      vision: 92, composure: 92, aggression: 65, positioning: 85, workRate: 68, leadership: 88,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 40_000_000, salary: 160_000,
    bio: 'Il Capitano. 25 Jahre AS Rom. 307 Serie-A-Tore. Roms ewiger König.',
    retired: true,
  },
  {
    id: 'legend-puyol', firstName: 'Carles', lastName: 'Puyol',
    nationality: '🇪🇸', position: 'IV', secondaryPositions: ['RV'],
    foot: 'right', height: 178, weight: 80, primeAge: 28, tier: 'bronze',
    attributes: {
      ballControl: 65, dribbling: 58, passing: 72, crossing: 62, shooting: 45,
      longShots: 42, finishing: 38, freeKick: 40, heading: 88,
      pace: 78, acceleration: 80, stamina: 90, strength: 88, jumping: 88,
      vision: 68, composure: 88, aggression: 90, positioning: 90, workRate: 95, leadership: 95,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 35_000_000, salary: 150_000,
    bio: 'WM-Sieger 2010. Barcelonas Krieger. Kopfballtor im WM-Halbfinale 2010.',
    retired: true,
  },
  {
    id: 'legend-seedorf', firstName: 'Clarence', lastName: 'Seedorf',
    nationality: '🇳🇱', position: 'ZM', secondaryPositions: ['ZOM', 'LA'],
    foot: 'right', height: 176, weight: 76, primeAge: 27, tier: 'bronze',
    attributes: {
      ballControl: 85, dribbling: 80, passing: 82, crossing: 75, shooting: 82,
      longShots: 88, finishing: 75, freeKick: 72, heading: 68,
      pace: 78, acceleration: 80, stamina: 85, strength: 82, jumping: 72,
      vision: 82, composure: 85, aggression: 72, positioning: 80, workRate: 82, leadership: 82,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 35_000_000, salary: 150_000,
    bio: '4x Champions-League-Sieger mit 3 verschiedenen Vereinen. Einzigartig.',
    retired: true,
  },
  {
    id: 'legend-drogba', firstName: 'Didier', lastName: 'Drogba',
    nationality: '🇨🇮', position: 'ST', secondaryPositions: [],
    foot: 'right', height: 189, weight: 84, primeAge: 28, tier: 'bronze',
    attributes: {
      ballControl: 78, dribbling: 75, passing: 68, crossing: 58, shooting: 85,
      longShots: 80, finishing: 88, freeKick: 72, heading: 90,
      pace: 82, acceleration: 84, stamina: 82, strength: 92, jumping: 88,
      vision: 72, composure: 88, aggression: 82, positioning: 88, workRate: 82, leadership: 88,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 38_000_000, salary: 155_000,
    bio: 'Chelseas CL-Held 2012. Der Big-Game-Player. Afrikas größter Stürmer.',
    retired: true,
  },
  {
    id: 'legend-cannavaro', firstName: 'Fabio', lastName: 'Cannavaro',
    nationality: '🇮🇹', position: 'IV', secondaryPositions: [],
    foot: 'right', height: 175, weight: 75, primeAge: 28, tier: 'bronze',
    attributes: {
      ballControl: 65, dribbling: 55, passing: 70, crossing: 55, shooting: 35,
      longShots: 30, finishing: 28, freeKick: 30, heading: 88,
      pace: 80, acceleration: 82, stamina: 85, strength: 82, jumping: 90,
      vision: 68, composure: 90, aggression: 82, positioning: 92, workRate: 88, leadership: 90,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 35_000_000, salary: 150_000,
    bio: 'Ballon d\'Or 2006. WM-Sieger 2006. Bewies, dass Verteidiger den Ballon d\'Or gewinnen können.',
    retired: true,
  },
  {
    id: 'legend-vidic', firstName: 'Nemanja', lastName: 'Vidić',
    nationality: '🇷🇸', position: 'IV', secondaryPositions: [],
    foot: 'right', height: 188, weight: 84, primeAge: 28, tier: 'bronze',
    attributes: {
      ballControl: 58, dribbling: 45, passing: 62, crossing: 42, shooting: 42,
      longShots: 38, finishing: 35, freeKick: 30, heading: 90,
      pace: 72, acceleration: 75, stamina: 85, strength: 92, jumping: 90,
      vision: 58, composure: 85, aggression: 92, positioning: 90, workRate: 90, leadership: 88,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 32_000_000, salary: 140_000,
    bio: 'Manchester Uniteds Fels. 5x Premier-League-Meister. Furchtloser Verteidiger.',
    retired: true,
  },
  {
    id: 'legend-rummenigge', firstName: 'Karl-Heinz', lastName: 'Rummenigge',
    nationality: '🇩🇪', position: 'ST', secondaryPositions: ['RA'],
    foot: 'right', height: 182, weight: 76, primeAge: 26, tier: 'bronze',
    attributes: {
      ballControl: 85, dribbling: 82, passing: 78, crossing: 72, shooting: 88,
      longShots: 82, finishing: 90, freeKick: 75, heading: 80,
      pace: 85, acceleration: 88, stamina: 82, strength: 78, jumping: 80,
      vision: 80, composure: 85, aggression: 72, positioning: 88, workRate: 82, leadership: 82,
      reflexes: 10, handling: 10, diving: 10, kicking: 10, oneOnOne: 10,
    },
    marketValue: 38_000_000, salary: 155_000,
    bio: '2x Ballon d\'Or. Bayerns Torjäger der 80er. EM-Sieger 1980.',
    retired: true,
  },
];

// ════════════════════════════════════════════════════════
//  Combined Database & Access Functions
// ════════════════════════════════════════════════════════

export const ALL_LEGENDARY_PLAYERS: LegendaryPlayerTemplate[] = [
  ...DIAMOND_LEGENDS,
  ...GOLD_ICONS,
  ...SILVER_HEROES,
  ...BRONZE_ICONS,
];

/**
 * Spawn chance per tier when a legendary spawn is triggered (1% base per search).
 * Within that 1%, the tier is selected by these weights.
 */
export const TIER_WEIGHTS: Record<LegendaryPlayerTemplate['tier'], number> = {
  diamond: 5,   // ~10% of legend spawns
  gold: 15,     // ~30%
  silver: 20,   // ~40%
  bronze: 10,   // ~20%
};

/**
 * Pick a random legendary player, weighted by tier.
 * Returns null if RNG doesn't trigger a spawn (baseChance = 0.01 = 1%).
 */
export function rollForLegendary(rng: () => number, baseChance: number = 0.01): LegendaryPlayerTemplate | null {
  if (rng() > baseChance) return null;

  // Tier selection
  const totalWeight = Object.values(TIER_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = rng() * totalWeight;
  let selectedTier: LegendaryPlayerTemplate['tier'] = 'bronze';
  for (const [tier, weight] of Object.entries(TIER_WEIGHTS) as [LegendaryPlayerTemplate['tier'], number][]) {
    roll -= weight;
    if (roll <= 0) { selectedTier = tier; break; }
  }

  // Pick a random player from that tier
  const pool = ALL_LEGENDARY_PLAYERS.filter(p => p.tier === selectedTier);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}
