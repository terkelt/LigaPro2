/**
 * Virtual League Engine
 *
 * Manages simulated 2nd divisions for countries that only have a single
 * playable top-flight league. These virtual leagues:
 *
 * 1. Are initialized at game start with realistic team pools per country
 * 2. Have their full season simulated at end-of-season (no match-by-match)
 * 3. Produce promotion candidates that get converted into real Team + Player[]
 * 4. Absorb relegated teams from the parent league (stripped from game state)
 *
 * Virtual teams are "dumb" — no AI management, no transfers, no tactics.
 * They only become full entities when promoted into a playable league.
 */

import { VirtualLeague, VirtualLeagueTeam, VirtualLeagueTableEntry } from '@/types/league';
import { Team } from '@/types/team';
import { Player } from '@/types/player';
import { generatePlayersForTeam } from './player-generator';

// ═══════════════════════════════════════════════════════
// ── Seeded RNG (deterministic per-season) ──
// ═══════════════════════════════════════════════════════

class SeededRNG {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

// ═══════════════════════════════════════════════════════
// ── Virtual team pools per country ──
// ═══════════════════════════════════════════════════════

interface VirtualTeamSeed {
  name: string;
  shortName: string;
  city: string;
  stadium: string;
  capacity: number;
  colors: { primary: string; secondary: string };
  strength: number;
  reputation: number;
}

// Real 2nd-division clubs for each country
const VIRTUAL_TEAM_POOLS: Record<string, { leagueId: string; leagueName: string; parentLeagueId: string; teams: VirtualTeamSeed[] }> = {
  England: {
    leagueId: 'virtual-championship',
    leagueName: 'EFL Championship',
    parentLeagueId: 'premier-league',
    teams: [
      { name: 'Leeds United', shortName: 'LEE', city: 'Leeds', stadium: 'Elland Road', capacity: 37890, colors: { primary: '#FFFFFF', secondary: '#1D428A' }, strength: 62, reputation: 55 },
      { name: 'Burnley FC', shortName: 'BUR', city: 'Burnley', stadium: 'Turf Moor', capacity: 21944, colors: { primary: '#6C1D45', secondary: '#99D6EA' }, strength: 60, reputation: 52 },
      { name: 'Sheffield United', shortName: 'SHU', city: 'Sheffield', stadium: 'Bramall Lane', capacity: 32050, colors: { primary: '#EE2737', secondary: '#FFFFFF' }, strength: 59, reputation: 50 },
      { name: 'Norwich City', shortName: 'NOR', city: 'Norwich', stadium: 'Carrow Road', capacity: 27244, colors: { primary: '#00A650', secondary: '#FFF200' }, strength: 57, reputation: 48 },
      { name: 'West Bromwich Albion', shortName: 'WBA', city: 'West Bromwich', stadium: 'The Hawthorns', capacity: 26688, colors: { primary: '#122F67', secondary: '#FFFFFF' }, strength: 56, reputation: 47 },
      { name: 'Middlesbrough FC', shortName: 'MID', city: 'Middlesbrough', stadium: 'Riverside Stadium', capacity: 34742, colors: { primary: '#E11B22', secondary: '#FFFFFF' }, strength: 55, reputation: 46 },
      { name: 'Coventry City', shortName: 'COV', city: 'Coventry', stadium: 'Coventry Building Society Arena', capacity: 32609, colors: { primary: '#0057B8', secondary: '#FFFFFF' }, strength: 55, reputation: 45 },
      { name: 'Sunderland AFC', shortName: 'SUN', city: 'Sunderland', stadium: 'Stadium of Light', capacity: 49000, colors: { primary: '#EB172B', secondary: '#FFFFFF' }, strength: 56, reputation: 48 },
      { name: 'Watford FC', shortName: 'WAT', city: 'Watford', stadium: 'Vicarage Road', capacity: 22220, colors: { primary: '#FBEE23', secondary: '#ED2127' }, strength: 54, reputation: 44 },
      { name: 'Stoke City', shortName: 'STO', city: 'Stoke-on-Trent', stadium: 'bet365 Stadium', capacity: 30089, colors: { primary: '#E03A3E', secondary: '#FFFFFF' }, strength: 52, reputation: 42 },
      { name: 'Swansea City', shortName: 'SWA', city: 'Swansea', stadium: 'Swansea.com Stadium', capacity: 21088, colors: { primary: '#FFFFFF', secondary: '#000000' }, strength: 51, reputation: 41 },
      { name: 'Bristol City', shortName: 'BRC', city: 'Bristol', stadium: 'Ashton Gate', capacity: 27000, colors: { primary: '#E21836', secondary: '#FFFFFF' }, strength: 51, reputation: 40 },
      { name: 'Hull City', shortName: 'HUL', city: 'Hull', stadium: 'MKM Stadium', capacity: 25586, colors: { primary: '#F5A623', secondary: '#000000' }, strength: 50, reputation: 39 },
      { name: 'Millwall FC', shortName: 'MIL', city: 'London', stadium: 'The Den', capacity: 20146, colors: { primary: '#001D5E', secondary: '#FFFFFF' }, strength: 49, reputation: 38 },
      { name: 'Preston North End', shortName: 'PNE', city: 'Preston', stadium: 'Deepdale', capacity: 23404, colors: { primary: '#FFFFFF', secondary: '#003DA5' }, strength: 48, reputation: 37 },
      { name: 'Queens Park Rangers', shortName: 'QPR', city: 'London', stadium: 'Loftus Road', capacity: 18439, colors: { primary: '#1D5BA4', secondary: '#FFFFFF' }, strength: 48, reputation: 37 },
      { name: 'Blackburn Rovers', shortName: 'BLB', city: 'Blackburn', stadium: 'Ewood Park', capacity: 31367, colors: { primary: '#009EE0', secondary: '#FFFFFF' }, strength: 50, reputation: 40 },
      { name: 'Cardiff City', shortName: 'CAR', city: 'Cardiff', stadium: 'Cardiff City Stadium', capacity: 33280, colors: { primary: '#0070B5', secondary: '#FFFFFF' }, strength: 47, reputation: 36 },
      { name: 'Plymouth Argyle', shortName: 'PLY', city: 'Plymouth', stadium: 'Home Park', capacity: 18600, colors: { primary: '#00573F', secondary: '#FFFFFF' }, strength: 46, reputation: 35 },
      { name: 'Derby County', shortName: 'DER', city: 'Derby', stadium: 'Pride Park', capacity: 33597, colors: { primary: '#FFFFFF', secondary: '#000000' }, strength: 52, reputation: 43 },
      { name: 'Portsmouth FC', shortName: 'POR', city: 'Portsmouth', stadium: 'Fratton Park', capacity: 20688, colors: { primary: '#001489', secondary: '#FFFFFF' }, strength: 47, reputation: 38 },
      { name: 'Oxford United', shortName: 'OXF', city: 'Oxford', stadium: 'Kassam Stadium', capacity: 12500, colors: { primary: '#F7E300', secondary: '#002B5C' }, strength: 44, reputation: 33 },
      { name: 'Luton Town', shortName: 'LUT', city: 'Luton', stadium: 'Kenilworth Road', capacity: 10356, colors: { primary: '#F78F1E', secondary: '#002D62' }, strength: 53, reputation: 43 },
      { name: 'Sheffield Wednesday', shortName: 'SHW', city: 'Sheffield', stadium: 'Hillsborough', capacity: 39732, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 51, reputation: 42 },
    ],
  },
  Spanien: {
    leagueId: 'virtual-segunda',
    leagueName: 'La Liga 2',
    parentLeagueId: 'la-liga',
    teams: [
      { name: 'Real Valladolid', shortName: 'VLL', city: 'Valladolid', stadium: 'José Zorrilla', capacity: 26512, colors: { primary: '#5A2D82', secondary: '#FFFFFF' }, strength: 55, reputation: 45 },
      { name: 'Elche CF', shortName: 'ELC', city: 'Elche', stadium: 'Martínez Valero', capacity: 33732, colors: { primary: '#006633', secondary: '#FFFFFF' }, strength: 50, reputation: 40 },
      { name: 'Huesca', shortName: 'HUE', city: 'Huesca', stadium: 'El Alcoraz', capacity: 7638, colors: { primary: '#1E3264', secondary: '#C8102E' }, strength: 48, reputation: 38 },
      { name: 'Real Zaragoza', shortName: 'ZAR', city: 'Zaragoza', stadium: 'La Romareda', capacity: 34596, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 53, reputation: 44 },
      { name: 'Sporting Gijón', shortName: 'SGI', city: 'Gijón', stadium: 'El Molinón', capacity: 29029, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 52, reputation: 43 },
      { name: 'Racing Santander', shortName: 'RAC', city: 'Santander', stadium: 'El Sardinero', capacity: 22222, colors: { primary: '#009639', secondary: '#FFFFFF' }, strength: 48, reputation: 37 },
      { name: 'Levante UD', shortName: 'LEV', city: 'Valencia', stadium: 'Ciutat de València', capacity: 25354, colors: { primary: '#004B87', secondary: '#C8102E' }, strength: 54, reputation: 44 },
      { name: 'Eibar', shortName: 'EIB', city: 'Eibar', stadium: 'Ipurua', capacity: 8164, colors: { primary: '#0033A0', secondary: '#C8102E' }, strength: 50, reputation: 40 },
      { name: 'Tenerife', shortName: 'TEN', city: 'Santa Cruz', stadium: 'Heliodoro Rodríguez', capacity: 22824, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 49, reputation: 39 },
      { name: 'Oviedo', shortName: 'OVI', city: 'Oviedo', stadium: 'Carlos Tartiere', capacity: 30500, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 51, reputation: 41 },
      { name: 'Albacete', shortName: 'ALB', city: 'Albacete', stadium: 'Carlos Belmonte', capacity: 17524, colors: { primary: '#FFFFFF', secondary: '#C8102E' }, strength: 46, reputation: 35 },
      { name: 'Cádiz CF', shortName: 'CAD', city: 'Cádiz', stadium: 'Nuevo Mirandilla', capacity: 20724, colors: { primary: '#FFC72C', secondary: '#003DA5' }, strength: 52, reputation: 42 },
      { name: 'Granada CF', shortName: 'GRA', city: 'Granada', stadium: 'Nuevo Los Cármenes', capacity: 19336, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 53, reputation: 43 },
      { name: 'Almería', shortName: 'ALM', city: 'Almería', stadium: 'Power Horse Stadium', capacity: 15000, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 51, reputation: 41 },
      { name: 'Deportivo La Coruña', shortName: 'DEP', city: 'A Coruña', stadium: 'Riazor', capacity: 32660, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 50, reputation: 42 },
      { name: 'Burgos CF', shortName: 'BUR', city: 'Burgos', stadium: 'El Plantío', capacity: 12200, colors: { primary: '#000000', secondary: '#FFFFFF' }, strength: 45, reputation: 34 },
      { name: 'Cartagena', shortName: 'CTG', city: 'Cartagena', stadium: 'Cartagonova', capacity: 15105, colors: { primary: '#FFFFFF', secondary: '#000000' }, strength: 46, reputation: 35 },
      { name: 'Mirandés', shortName: 'MIR', city: 'Miranda de Ebro', stadium: 'Anduva', capacity: 5762, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 44, reputation: 33 },
      { name: 'Castellón', shortName: 'CAS', city: 'Castellón', stadium: 'Nou Castalia', capacity: 15500, colors: { primary: '#000000', secondary: '#FFFFFF' }, strength: 44, reputation: 33 },
      { name: 'Eldense', shortName: 'ELD', city: 'Elda', stadium: 'Nuevo Pepico Amat', capacity: 6200, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 42, reputation: 31 },
      { name: 'Racing Ferrol', shortName: 'RFE', city: 'Ferrol', stadium: 'A Malata', capacity: 8000, colors: { primary: '#009639', secondary: '#FFFFFF' }, strength: 43, reputation: 32 },
      { name: 'Málaga CF', shortName: 'MAL', city: 'Málaga', stadium: 'La Rosaleda', capacity: 30044, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 50, reputation: 42 },
    ],
  },
  Italien: {
    leagueId: 'virtual-serie-b',
    leagueName: 'Serie B',
    parentLeagueId: 'serie-a',
    teams: [
      { name: 'US Cremonese', shortName: 'CRE', city: 'Cremona', stadium: 'Giovanni Zini', capacity: 20641, colors: { primary: '#C8102E', secondary: '#808080' }, strength: 52, reputation: 40 },
      { name: 'Palermo FC', shortName: 'PAL', city: 'Palermo', stadium: 'Renzo Barbera', capacity: 36349, colors: { primary: '#F0529C', secondary: '#000000' }, strength: 54, reputation: 44 },
      { name: 'Sampdoria', shortName: 'SAM', city: 'Genua', stadium: 'Luigi Ferraris', capacity: 36536, colors: { primary: '#0033A0', secondary: '#C8102E' }, strength: 53, reputation: 44 },
      { name: 'US Salernitana', shortName: 'SAL', city: 'Salerno', stadium: 'Arechi', capacity: 37245, colors: { primary: '#8B0000', secondary: '#FFFFFF' }, strength: 50, reputation: 40 },
      { name: 'Brescia Calcio', shortName: 'BRE', city: 'Brescia', stadium: 'Mario Rigamonti', capacity: 16308, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 50, reputation: 40 },
      { name: 'Catanzaro', shortName: 'CTZ', city: 'Catanzaro', stadium: 'Nicola Ceravolo', capacity: 19847, colors: { primary: '#FFC72C', secondary: '#C8102E' }, strength: 47, reputation: 36 },
      { name: 'Modena FC', shortName: 'MOD', city: 'Modena', stadium: 'Alberto Braglia', capacity: 21151, colors: { primary: '#FFC72C', secondary: '#0033A0' }, strength: 47, reputation: 36 },
      { name: 'Spezia Calcio', shortName: 'SPE', city: 'La Spezia', stadium: 'Alberto Picco', capacity: 11466, colors: { primary: '#FFFFFF', secondary: '#000000' }, strength: 49, reputation: 38 },
      { name: 'Reggiana', shortName: 'REG', city: 'Reggio Emilia', stadium: 'Mapei Stadium', capacity: 23717, colors: { primary: '#8B0000', secondary: '#000000' }, strength: 46, reputation: 35 },
      { name: 'Bari 1908', shortName: 'BAR', city: 'Bari', stadium: 'San Nicola', capacity: 58270, colors: { primary: '#FFFFFF', secondary: '#C8102E' }, strength: 50, reputation: 40 },
      { name: 'Pisa SC', shortName: 'PIS', city: 'Pisa', stadium: 'Arena Garibaldi', capacity: 25000, colors: { primary: '#000080', secondary: '#FFFFFF' }, strength: 49, reputation: 38 },
      { name: 'Südtirol', shortName: 'SÜD', city: 'Bozen', stadium: 'Druso', capacity: 5000, colors: { primary: '#FFFFFF', secondary: '#C8102E' }, strength: 44, reputation: 33 },
      { name: 'Cosenza Calcio', shortName: 'COS', city: 'Cosenza', stadium: 'San Vito-Gigi Marulla', capacity: 24479, colors: { primary: '#C8102E', secondary: '#0033A0' }, strength: 45, reputation: 34 },
      { name: 'Ascoli Calcio', shortName: 'ASC', city: 'Ascoli Piceno', stadium: 'Cino e Lillo Del Duca', capacity: 20000, colors: { primary: '#FFFFFF', secondary: '#000000' }, strength: 45, reputation: 34 },
      { name: 'Ternana', shortName: 'TER', city: 'Terni', stadium: 'Libero Liberati', capacity: 17460, colors: { primary: '#C8102E', secondary: '#009639' }, strength: 44, reputation: 33 },
      { name: 'Frosinone', shortName: 'FRO', city: 'Frosinone', stadium: 'Benito Stirpe', capacity: 16227, colors: { primary: '#FFC72C', secondary: '#0033A0' }, strength: 52, reputation: 42 },
      { name: 'Sassuolo', shortName: 'SAS', city: 'Sassuolo', stadium: 'Mapei Stadium', capacity: 23717, colors: { primary: '#009639', secondary: '#000000' }, strength: 55, reputation: 46 },
      { name: 'US Cittadella', shortName: 'CIT', city: 'Cittadella', stadium: 'Pier Cesare Tombolato', capacity: 7623, colors: { primary: '#8B0000', secondary: '#FFFFFF' }, strength: 46, reputation: 35 },
      { name: 'Juve Stabia', shortName: 'JST', city: 'Castellammare', stadium: 'Romeo Menti', capacity: 8000, colors: { primary: '#FFC72C', secondary: '#0033A0' }, strength: 44, reputation: 33 },
      { name: 'Mantova', shortName: 'MAN', city: 'Mantova', stadium: 'Danilo Martelli', capacity: 8000, colors: { primary: '#FFFFFF', secondary: '#C8102E' }, strength: 43, reputation: 32 },
    ],
  },
  Frankreich: {
    leagueId: 'virtual-ligue-2',
    leagueName: 'Ligue 2',
    parentLeagueId: 'ligue-1',
    teams: [
      { name: 'FC Metz', shortName: 'MET', city: 'Metz', stadium: 'Saint-Symphorien', capacity: 30000, colors: { primary: '#8B0000', secondary: '#FFFFFF' }, strength: 53, reputation: 42 },
      { name: 'SM Caen', shortName: 'CAE', city: 'Caen', stadium: "Michel d'Ornano", capacity: 21500, colors: { primary: '#0033A0', secondary: '#C8102E' }, strength: 50, reputation: 39 },
      { name: 'Paris FC', shortName: 'PFC', city: 'Paris', stadium: 'Charléty', capacity: 20000, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 49, reputation: 38 },
      { name: 'FC Lorient', shortName: 'LOR', city: 'Lorient', stadium: 'Moustoir', capacity: 18500, colors: { primary: '#F78F1E', secondary: '#000000' }, strength: 51, reputation: 40 },
      { name: 'Amiens SC', shortName: 'AMI', city: 'Amiens', stadium: 'Crédit Agricole', capacity: 12097, colors: { primary: '#FFFFFF', secondary: '#000000' }, strength: 48, reputation: 37 },
      { name: 'EA Guingamp', shortName: 'GUI', city: 'Guingamp', stadium: 'Roudourou', capacity: 18256, colors: { primary: '#C8102E', secondary: '#000000' }, strength: 47, reputation: 36 },
      { name: 'Grenoble Foot', shortName: 'GRE', city: 'Grenoble', stadium: 'Stade des Alpes', capacity: 20068, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 47, reputation: 36 },
      { name: 'AJ Ajaccio', shortName: 'AJA', city: 'Ajaccio', stadium: 'François Coty', capacity: 10660, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 45, reputation: 34 },
      { name: 'Rodez AF', shortName: 'ROD', city: 'Rodez', stadium: 'Paul Lignon', capacity: 6000, colors: { primary: '#C8102E', secondary: '#FFC72C' }, strength: 44, reputation: 33 },
      { name: 'Pau FC', shortName: 'PAU', city: 'Pau', stadium: 'Nouste Camp', capacity: 9000, colors: { primary: '#FFC72C', secondary: '#009639' }, strength: 44, reputation: 33 },
      { name: 'Laval', shortName: 'LAV', city: 'Laval', stadium: 'Francis Le Basser', capacity: 18000, colors: { primary: '#F78F1E', secondary: '#000000' }, strength: 45, reputation: 34 },
      { name: 'Bastia', shortName: 'BAS', city: 'Bastia', stadium: 'Armand Cesari', capacity: 16480, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 46, reputation: 35 },
      { name: 'Troyes AC', shortName: 'TRO', city: 'Troyes', stadium: "Stade de l'Aube", capacity: 20400, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 49, reputation: 38 },
      { name: 'Bordeaux', shortName: 'BOR', city: 'Bordeaux', stadium: 'Matmut Atlantique', capacity: 42115, colors: { primary: '#00003C', secondary: '#FFFFFF' }, strength: 52, reputation: 44 },
      { name: 'Clermont Foot', shortName: 'CLE', city: 'Clermont-Ferrand', stadium: 'Gabriel Montpied', capacity: 11980, colors: { primary: '#C8102E', secondary: '#0033A0' }, strength: 48, reputation: 37 },
      { name: 'Dunkerque', shortName: 'DUN', city: 'Dunkerque', stadium: 'Marcel Tribut', capacity: 4500, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 42, reputation: 31 },
      { name: 'Valenciennes', shortName: 'VAL', city: 'Valenciennes', stadium: 'Stade du Hainaut', capacity: 25172, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 43, reputation: 32 },
      { name: 'AC Le Mans', shortName: 'LEM', city: 'Le Mans', stadium: 'MMArena', capacity: 25064, colors: { primary: '#FFC72C', secondary: '#C8102E' }, strength: 42, reputation: 31 },
    ],
  },
  Niederlande: {
    leagueId: 'virtual-eerste-divisie',
    leagueName: 'Eerste Divisie',
    parentLeagueId: 'eredivisie',
    teams: [
      { name: 'NAC Breda', shortName: 'NAC', city: 'Breda', stadium: 'Rat Verlegh', capacity: 19000, colors: { primary: '#FFC72C', secondary: '#009639' }, strength: 50, reputation: 40 },
      { name: 'Cambuur', shortName: 'CAM', city: 'Leeuwarden', stadium: 'Cambuur Stadion', capacity: 10250, colors: { primary: '#FFC72C', secondary: '#0033A0' }, strength: 47, reputation: 37 },
      { name: 'De Graafschap', shortName: 'DGR', city: 'Doetinchem', stadium: 'De Vijverberg', capacity: 12600, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 47, reputation: 37 },
      { name: 'FC Emmen', shortName: 'EMM', city: 'Emmen', stadium: 'De Oude Meerdijk', capacity: 8600, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 46, reputation: 36 },
      { name: 'Roda JC', shortName: 'ROD', city: 'Kerkrade', stadium: 'Parkstad Limburg', capacity: 19979, colors: { primary: '#FFC72C', secondary: '#009639' }, strength: 48, reputation: 38 },
      { name: 'FC Volendam', shortName: 'VOL', city: 'Volendam', stadium: 'Kras Stadion', capacity: 7384, colors: { primary: '#F78F1E', secondary: '#009639' }, strength: 47, reputation: 37 },
      { name: 'Excelsior', shortName: 'EXC', city: 'Rotterdam', stadium: 'Van Donge & De Roo', capacity: 4400, colors: { primary: '#C8102E', secondary: '#000000' }, strength: 46, reputation: 36 },
      { name: 'ADO Den Haag', shortName: 'ADO', city: 'Den Haag', stadium: 'Cars Jeans', capacity: 15000, colors: { primary: '#009639', secondary: '#FFC72C' }, strength: 49, reputation: 39 },
      { name: 'FC Eindhoven', shortName: 'EIN', city: 'Eindhoven', stadium: 'Jan Louwers', capacity: 4600, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 44, reputation: 34 },
      { name: 'MVV Maastricht', shortName: 'MVV', city: 'Maastricht', stadium: 'De Geusselt', capacity: 10000, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 44, reputation: 34 },
      { name: 'FC Dordrecht', shortName: 'DOR', city: 'Dordrecht', stadium: 'Riwal Hoogwerkers', capacity: 4235, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 42, reputation: 32 },
      { name: 'FC Den Bosch', shortName: 'DBO', city: "'s-Hertogenbosch", stadium: 'De Vliert', capacity: 8500, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 43, reputation: 33 },
      { name: 'Almere City', shortName: 'ALM', city: 'Almere', stadium: 'Yanmar Stadion', capacity: 4900, colors: { primary: '#C8102E', secondary: '#000000' }, strength: 45, reputation: 35 },
      { name: 'Telstar', shortName: 'TEL', city: 'Velsen-Zuid', stadium: 'Rabobank IJmond', capacity: 3700, colors: { primary: '#FFFFFF', secondary: '#C8102E' }, strength: 42, reputation: 32 },
      { name: 'FC Oss', shortName: 'OSS', city: 'Oss', stadium: 'Frans Heesen', capacity: 5200, colors: { primary: '#009639', secondary: '#FFFFFF' }, strength: 41, reputation: 31 },
      { name: 'VVV-Venlo', shortName: 'VVV', city: 'Venlo', stadium: 'De Koel', capacity: 8000, colors: { primary: '#FFC72C', secondary: '#009639' }, strength: 46, reputation: 36 },
    ],
  },
  Portugal: {
    leagueId: 'virtual-liga-2',
    leagueName: 'Liga Portugal 2',
    parentLeagueId: 'primeira-liga',
    teams: [
      { name: 'Leixões SC', shortName: 'LEI', city: 'Matosinhos', stadium: 'Mar', capacity: 8000, colors: { primary: '#C8102E', secondary: '#000000' }, strength: 44, reputation: 34 },
      { name: 'Académica', shortName: 'ACA', city: 'Coimbra', stadium: 'Cidade de Coimbra', capacity: 30000, colors: { primary: '#000000', secondary: '#FFFFFF' }, strength: 46, reputation: 37 },
      { name: 'Tondela', shortName: 'TON', city: 'Tondela', stadium: 'João Cardoso', capacity: 5000, colors: { primary: '#009639', secondary: '#FFC72C' }, strength: 45, reputation: 35 },
      { name: 'Penafiel', shortName: 'PEN', city: 'Penafiel', stadium: 'Municipal 25 de Abril', capacity: 5000, colors: { primary: '#000000', secondary: '#FFFFFF' }, strength: 43, reputation: 33 },
      { name: 'Feirense', shortName: 'FEI', city: 'Santa Maria da Feira', stadium: 'Marcolino de Castro', capacity: 5680, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 44, reputation: 34 },
      { name: 'Mafra', shortName: 'MAF', city: 'Mafra', stadium: 'Municipal de Mafra', capacity: 4000, colors: { primary: '#009639', secondary: '#FFFFFF' }, strength: 42, reputation: 32 },
      { name: 'Chaves', shortName: 'CHA', city: 'Chaves', stadium: 'Municipal Eng. Manuel Branco Teixeira', capacity: 12000, colors: { primary: '#C8102E', secondary: '#FFC72C' }, strength: 47, reputation: 37 },
      { name: 'Vizela', shortName: 'VIZ', city: 'Vizela', stadium: 'FC Vizela', capacity: 6000, colors: { primary: '#808080', secondary: '#FFFFFF' }, strength: 45, reputation: 35 },
      { name: 'Paços de Ferreira', shortName: 'PAC', city: 'Paços de Ferreira', stadium: 'Capital do Móvel', capacity: 9077, colors: { primary: '#FFC72C', secondary: '#009639' }, strength: 46, reputation: 36 },
      { name: 'Marítimo', shortName: 'MAR', city: 'Funchal', stadium: 'dos Barreiros', capacity: 10600, colors: { primary: '#009639', secondary: '#C8102E' }, strength: 46, reputation: 36 },
      { name: 'Portimonense', shortName: 'PRT', city: 'Portimão', stadium: 'Municipal de Portimão', capacity: 9543, colors: { primary: '#000000', secondary: '#FFFFFF' }, strength: 47, reputation: 37 },
      { name: 'Oliveirense', shortName: 'OLI', city: 'Oliveira de Azeméis', stadium: 'Carlos Osório', capacity: 5000, colors: { primary: '#009639', secondary: '#FFFFFF' }, strength: 42, reputation: 32 },
      { name: 'Benfica B', shortName: 'BEB', city: 'Seixal', stadium: 'Benfica Campus', capacity: 3000, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 44, reputation: 34 },
      { name: 'Porto B', shortName: 'POB', city: 'Porto', stadium: 'Olival', capacity: 3000, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 44, reputation: 34 },
      { name: 'Alverca', shortName: 'ALV', city: 'Alverca', stadium: 'Municipal de Alverca', capacity: 5000, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 41, reputation: 31 },
      { name: 'Felgueiras', shortName: 'FEL', city: 'Felgueiras', stadium: 'Municipal de Felgueiras', capacity: 4000, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 40, reputation: 30 },
    ],
  },
  Belgien: {
    leagueId: 'virtual-challenger-pro',
    leagueName: 'Challenger Pro League',
    parentLeagueId: 'belgian-pro-league',
    teams: [
      { name: 'RWDM', shortName: 'RWD', city: 'Brüssel', stadium: 'Edmond Machtens', capacity: 12500, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 48, reputation: 38 },
      { name: 'Lommel SK', shortName: 'LOM', city: 'Lommel', stadium: 'Soevereinstadion', capacity: 7500, colors: { primary: '#009639', secondary: '#FFFFFF' }, strength: 45, reputation: 35 },
      { name: 'Deinze', shortName: 'DEI', city: 'Deinze', stadium: 'Burgemeester Van de Wiele', capacity: 4000, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 42, reputation: 32 },
      { name: 'Lierse', shortName: 'LIE', city: 'Lier', stadium: 'Herman Vanderpoortenstadion', capacity: 14538, colors: { primary: '#FFC72C', secondary: '#000000' }, strength: 44, reputation: 34 },
      { name: 'Waasland-Beveren', shortName: 'WBE', city: 'Beveren', stadium: 'Freethiel', capacity: 13290, colors: { primary: '#FFC72C', secondary: '#0033A0' }, strength: 45, reputation: 35 },
      { name: 'Virton', shortName: 'VIR', city: 'Virton', stadium: 'Yvan Georges', capacity: 3000, colors: { primary: '#009639', secondary: '#FFFFFF' }, strength: 40, reputation: 30 },
      { name: 'Club NXT', shortName: 'CNX', city: 'Brügge', stadium: 'Belfius Basecamp', capacity: 3000, colors: { primary: '#0033A0', secondary: '#000000' }, strength: 44, reputation: 34 },
      { name: 'RSC Anderlecht B', shortName: 'ANB', city: 'Brüssel', stadium: 'Sporting Training Center', capacity: 3000, colors: { primary: '#5A2D82', secondary: '#FFFFFF' }, strength: 43, reputation: 33 },
      { name: 'Francs Borains', shortName: 'FRB', city: 'Boussu', stadium: 'Robert Urbain', capacity: 4000, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 40, reputation: 30 },
      { name: 'Zulte Waregem', shortName: 'ZWA', city: 'Waregem', stadium: 'Regenboogstadion', capacity: 12300, colors: { primary: '#009639', secondary: '#C8102E' }, strength: 46, reputation: 36 },
      { name: 'Molenbeek', shortName: 'MOL', city: 'Brüssel', stadium: 'Edmond Machtens', capacity: 12500, colors: { primary: '#FFFFFF', secondary: '#C8102E' }, strength: 44, reputation: 34 },
      { name: 'Patro Eisden', shortName: 'PAT', city: 'Maasmechelen', stadium: 'Op de Berg', capacity: 5000, colors: { primary: '#FFC72C', secondary: '#009639' }, strength: 41, reputation: 31 },
    ],
  },
  Schottland: {
    leagueId: 'virtual-scottish-championship',
    leagueName: 'Scottish Championship',
    parentLeagueId: 'scottish-premiership',
    teams: [
      { name: 'Partick Thistle', shortName: 'PAR', city: 'Glasgow', stadium: 'Firhill', capacity: 10102, colors: { primary: '#C8102E', secondary: '#FFC72C' }, strength: 44, reputation: 34 },
      { name: 'Queen\'s Park', shortName: 'QUE', city: 'Glasgow', stadium: 'Hampden Park', capacity: 51866, colors: { primary: '#000000', secondary: '#FFFFFF' }, strength: 42, reputation: 32 },
      { name: 'Ayr United', shortName: 'AYR', city: 'Ayr', stadium: 'Somerset Park', capacity: 10185, colors: { primary: '#FFFFFF', secondary: '#000000' }, strength: 41, reputation: 31 },
      { name: 'Inverness CT', shortName: 'INV', city: 'Inverness', stadium: 'Caledonian Stadium', capacity: 7750, colors: { primary: '#0033A0', secondary: '#C8102E' }, strength: 43, reputation: 33 },
      { name: 'Raith Rovers', shortName: 'RAI', city: 'Kirkcaldy', stadium: "Stark's Park", capacity: 8867, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 42, reputation: 32 },
      { name: 'Dunfermline', shortName: 'DUN', city: 'Dunfermline', stadium: 'East End Park', capacity: 11480, colors: { primary: '#000000', secondary: '#FFFFFF' }, strength: 42, reputation: 32 },
      { name: 'Greenock Morton', shortName: 'MOR', city: 'Greenock', stadium: 'Cappielow', capacity: 11589, colors: { primary: '#0033A0', secondary: '#FFFFFF' }, strength: 40, reputation: 30 },
      { name: 'Hamilton Academical', shortName: 'HAM', city: 'Hamilton', stadium: 'New Douglas Park', capacity: 6018, colors: { primary: '#C8102E', secondary: '#FFFFFF' }, strength: 41, reputation: 31 },
      { name: 'Falkirk', shortName: 'FAL', city: 'Falkirk', stadium: 'Falkirk Stadium', capacity: 7800, colors: { primary: '#00003C', secondary: '#FFFFFF' }, strength: 43, reputation: 33 },
      { name: 'Livingston', shortName: 'LIV', city: 'Livingston', stadium: 'Tony Macaroni Arena', capacity: 10016, colors: { primary: '#FFC72C', secondary: '#000000' }, strength: 44, reputation: 34 },
    ],
  },
};

// ═══════════════════════════════════════════════════════
// ── Initialize virtual leagues at game start ──
// ═══════════════════════════════════════════════════════

export function initializeVirtualLeagues(): VirtualLeague[] {
  const virtualLeagues: VirtualLeague[] = [];

  for (const [country, pool] of Object.entries(VIRTUAL_TEAM_POOLS)) {
    const teams: VirtualLeagueTeam[] = pool.teams.map(seed => ({
      id: `virt-${pool.leagueId}-${seed.shortName.toLowerCase()}`,
      name: seed.name,
      shortName: seed.shortName,
      strength: seed.strength,
      country,
      stadiumName: seed.stadium,
      stadiumCapacity: seed.capacity,
      city: seed.city,
      colors: seed.colors,
      budget: Math.round(seed.reputation * 150_000),
      salaryBudget: Math.round(seed.reputation * 80_000),
      reputation: seed.reputation,
    }));

    virtualLeagues.push({
      id: pool.leagueId,
      name: pool.leagueName,
      country,
      parentLeagueId: pool.parentLeagueId,
      teams,
      table: [],
      promotedTeamIds: [],
      relegatedFromParent: [],
    });
  }

  return virtualLeagues;
}

// ═══════════════════════════════════════════════════════
// ── Simulate a full virtual league season ──
// ═══════════════════════════════════════════════════════

/**
 * Simulates an entire season for a virtual league.
 * Uses strength-based probability to determine match outcomes.
 * Returns the updated league with a filled table.
 */
export function simulateVirtualLeagueSeason(
  league: VirtualLeague,
  seasonSeed: number,
): VirtualLeague {
  const rng = new SeededRNG(seasonSeed + hashStr(league.id));
  const teams = league.teams;
  const n = teams.length;

  // Initialize table
  const table: Record<string, VirtualLeagueTableEntry> = {};
  for (const t of teams) {
    table[t.id] = {
      teamId: t.id,
      teamName: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  }

  // Simulate home-and-away round robin
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const home = teams[i];
      const away = teams[j];
      const { homeGoals, awayGoals } = simulateVirtualMatch(home.strength, away.strength, rng);

      table[home.id].played++;
      table[away.id].played++;
      table[home.id].goalsFor += homeGoals;
      table[home.id].goalsAgainst += awayGoals;
      table[away.id].goalsFor += awayGoals;
      table[away.id].goalsAgainst += homeGoals;

      if (homeGoals > awayGoals) {
        table[home.id].won++;
        table[home.id].points += 3;
        table[away.id].lost++;
      } else if (homeGoals < awayGoals) {
        table[away.id].won++;
        table[away.id].points += 3;
        table[home.id].lost++;
      } else {
        table[home.id].drawn++;
        table[away.id].drawn++;
        table[home.id].points += 1;
        table[away.id].points += 1;
      }
    }
  }

  // Calculate goal differences and sort
  const sorted = Object.values(table)
    .map(e => ({ ...e, goalDifference: e.goalsFor - e.goalsAgainst }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

  return {
    ...league,
    table: sorted,
  };
}

/**
 * Simulate a single match between two virtual teams.
 * Strength difference determines goal expectation.
 */
function simulateVirtualMatch(
  homeStrength: number,
  awayStrength: number,
  rng: SeededRNG,
): { homeGoals: number; awayGoals: number } {
  // Home advantage: +5 effective strength
  const homeEff = homeStrength + 5;
  const awayEff = awayStrength;

  // Expected goals based on strength (scaled 0.5 - 3.0)
  const homeXG = 0.5 + (homeEff / 100) * 2.0 + rng.next() * 0.8;
  const awayXG = 0.5 + (awayEff / 100) * 2.0 + rng.next() * 0.8;

  // Poisson-like goal generation
  const homeGoals = poissonGoals(homeXG, rng);
  const awayGoals = poissonGoals(awayXG, rng);

  return { homeGoals, awayGoals };
}

function poissonGoals(lambda: number, rng: SeededRNG): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 10);
  return k - 1;
}

// ═══════════════════════════════════════════════════════
// ── Determine promotions from virtual league ──
// ═══════════════════════════════════════════════════════

/**
 * Get the number of promotion spots based on the parent league's relegation config.
 */
export function getPromotionCount(parentLeagueRelegation: { automatic: number; playoff: number }): number {
  // Automatic promotions match automatic relegations from parent
  // Playoff promotions: 50% chance each (simplified)
  return parentLeagueRelegation.automatic;
}

/**
 * Determine which virtual teams get promoted.
 * Returns the top N team IDs from the virtual league table.
 */
export function getPromotedTeamIds(league: VirtualLeague, count: number): string[] {
  if (league.table.length === 0) return [];
  return league.table.slice(0, count).map(e => e.teamId);
}

// ═══════════════════════════════════════════════════════
// ── Convert promoted virtual team → real Team + Players ──
// ═══════════════════════════════════════════════════════

/**
 * Converts a VirtualLeagueTeam into a full Team object
 * suitable for the main game state.
 */
export function convertVirtualToRealTeam(
  vTeam: VirtualLeagueTeam,
  targetLeagueId: string,
): Team {
  return {
    id: `promoted-${vTeam.id}`,
    name: vTeam.name,
    shortName: vTeam.shortName,
    league: targetLeagueId,
    founded: 1900 + Math.floor(Math.random() * 100),
    stadium: {
      name: vTeam.stadiumName,
      capacity: vTeam.stadiumCapacity,
      city: vTeam.city,
    },
    colors: vTeam.colors,
    logo: '',
    budget: vTeam.budget,
    salaryBudget: vTeam.salaryBudget,
    reputation: vTeam.reputation,
    facilities: {
      training: Math.max(3, Math.floor(vTeam.reputation / 12)),
      youth: Math.max(2, Math.floor(vTeam.reputation / 14)),
      stadium: Math.max(3, Math.floor(vTeam.reputation / 11)),
      medical: Math.max(2, Math.floor(vTeam.reputation / 13)),
    },
    fans: {
      loyalty: 50 + Math.floor(vTeam.reputation / 4),
      baseAttendance: Math.floor(vTeam.stadiumCapacity * 0.75),
      ultrasStrength: Math.max(2, Math.floor(vTeam.reputation / 12)),
    },
    boardExpectations: {
      leaguePosition: 17, // survival expected for promoted teams
      cupRound: 'runde2',
      financialGoal: 'break-even',
    },
    staff: {
      manager: `Manager ${vTeam.shortName}`,
      assistantManager: `Assistent ${vTeam.shortName}`,
      fitnessCoach: `Fitness ${vTeam.shortName}`,
      youthCoach: `Jugend ${vTeam.shortName}`,
      goalkeepingCoach: `TW-Trainer ${vTeam.shortName}`,
    },
    rivals: [],
    boardPatience: 60,
  };
}

/**
 * Generate a full squad of players for a promoted team.
 * Uses the existing player generator with tier 1 (since they're entering a tier-1 league)
 * but with lower reputation → weaker players.
 */
export function generatePlayersForPromotedTeam(team: Team): Player[] {
  const seed = hashStr(team.id + 'promoted');
  return generatePlayersForTeam(team, 1, seed);
}

// ═══════════════════════════════════════════════════════
// ── Handle relegation: real team → virtual league ──
// ═══════════════════════════════════════════════════════

/**
 * Converts a relegated real Team into a VirtualLeagueTeam
 * and adds it to the appropriate virtual league.
 */
export function convertRealToVirtualTeam(team: Team): VirtualLeagueTeam {
  return {
    id: `virt-relegated-${team.id}`,
    name: team.name,
    shortName: team.shortName,
    strength: Math.max(35, Math.min(65, Math.round(team.reputation * 0.7))),
    country: '', // will be set by caller
    stadiumName: team.stadium.name,
    stadiumCapacity: team.stadium.capacity,
    city: team.stadium.city,
    colors: team.colors,
    budget: team.budget,
    salaryBudget: team.salaryBudget,
    reputation: Math.max(30, team.reputation - 10),
  };
}

// ═══════════════════════════════════════════════════════
// ── Main: Process end-of-season for virtual leagues ──
// ═══════════════════════════════════════════════════════

export interface VirtualLeagueSeasonResult {
  updatedVirtualLeagues: VirtualLeague[];
  promotedTeams: Team[];
  promotedPlayers: Player[];
  relegatedTeamIds: string[];  // IDs of teams to remove from main game
  news: { title: string; content: string }[];
}

/**
 * Process all virtual leagues at end of season:
 * 1. Simulate each virtual league season
 * 2. Determine promotions
 * 3. Handle relegated teams from parent leagues
 * 4. Convert promoted virtual teams into real teams + players
 * 5. Return everything needed to update the game state
 */
export function processVirtualLeaguesEndOfSeason(
  virtualLeagues: VirtualLeague[],
  realLeagues: { id: string; country: string; relegation: { automatic: number; playoff: number } }[],
  relegatedTeamIds: Record<string, string[]>, // parentLeagueId → relegated team IDs
  realTeams: Team[],
  seasonNumber: number,
): VirtualLeagueSeasonResult {
  const updatedVirtualLeagues: VirtualLeague[] = [];
  const promotedTeams: Team[] = [];
  const promotedPlayers: Player[] = [];
  const allRelegatedIds: string[] = [];
  const news: { title: string; content: string }[] = [];

  for (const vLeague of virtualLeagues) {
    const parentLeague = realLeagues.find(l => l.id === vLeague.parentLeagueId);
    if (!parentLeague) {
      updatedVirtualLeagues.push(vLeague);
      continue;
    }

    // 1. Add relegated teams from parent to virtual league
    const relegatedIds = relegatedTeamIds[vLeague.parentLeagueId] || [];
    let updatedTeams = [...vLeague.teams];

    for (const teamId of relegatedIds) {
      const realTeam = realTeams.find(t => t.id === teamId);
      if (realTeam) {
        const vTeam = convertRealToVirtualTeam(realTeam);
        vTeam.country = vLeague.country;
        // Remove any existing virtual team with same name to avoid duplicates
        updatedTeams = updatedTeams.filter(t => t.name !== realTeam.name);
        updatedTeams.push(vTeam);
        allRelegatedIds.push(teamId);

        news.push({
          title: `${realTeam.name} steigt ab`,
          content: `${realTeam.name} spielt nächste Saison in der ${vLeague.name}.`,
        });
      }
    }

    // 2. Simulate the virtual league season
    const simulated = simulateVirtualLeagueSeason(
      { ...vLeague, teams: updatedTeams },
      seasonNumber * 1000 + hashStr(vLeague.id),
    );

    // 3. Determine promotions
    const promoCount = getPromotionCount(parentLeague.relegation);
    const promotedIds = getPromotedTeamIds(simulated, promoCount);

    // 4. Convert promoted teams to real teams + generate players
    for (const promoId of promotedIds) {
      const vTeam = updatedTeams.find(t => t.id === promoId);
      if (!vTeam) continue;

      const realTeam = convertVirtualToRealTeam(vTeam, parentLeague.id);
      const players = generatePlayersForPromotedTeam(realTeam);
      promotedTeams.push(realTeam);
      promotedPlayers.push(...players);

      news.push({
        title: `${vTeam.name} steigt auf!`,
        content: `${vTeam.name} hat den Aufstieg in die ${parentLeague.id === 'premier-league' ? 'Premier League' : parentLeague.id} geschafft!`,
      });
    }

    // 5. Remove promoted teams from virtual league
    const remainingTeams = updatedTeams.filter(t => !promotedIds.includes(t.id));

    updatedVirtualLeagues.push({
      ...simulated,
      teams: remainingTeams,
      promotedTeamIds: promotedIds,
      relegatedFromParent: relegatedIds,
    });
  }

  return {
    updatedVirtualLeagues,
    promotedTeams,
    promotedPlayers,
    relegatedTeamIds: allRelegatedIds,
    news,
  };
}

/**
 * Replenish virtual leagues that lost teams (due to promotion).
 * Generates new filler teams to maintain league size.
 */
export function replenishVirtualLeagues(
  virtualLeagues: VirtualLeague[],
  seasonNumber: number,
): VirtualLeague[] {
  return virtualLeagues.map(league => {
    const pool = Object.values(VIRTUAL_TEAM_POOLS).find(p => p.leagueId === league.id);
    if (!pool) return league;

    const targetSize = pool.teams.length;
    const currentSize = league.teams.length;

    if (currentSize >= targetSize) return league;

    // Generate filler teams
    const rng = new SeededRNG(seasonNumber * 7777 + hashStr(league.id));
    const fillerTeams: VirtualLeagueTeam[] = [];
    const existingNames = new Set(league.teams.map(t => t.name));

    // Try to pull from the original pool first
    for (const seed of pool.teams) {
      if (fillerTeams.length + currentSize >= targetSize) break;
      if (existingNames.has(seed.name)) continue;

      fillerTeams.push({
        id: `virt-${league.id}-${seed.shortName.toLowerCase()}-s${seasonNumber}`,
        name: seed.name,
        shortName: seed.shortName,
        strength: seed.strength + rng.range(-3, 3),
        country: league.country,
        stadiumName: seed.stadium,
        stadiumCapacity: seed.capacity,
        city: seed.city,
        colors: seed.colors,
        budget: Math.round(seed.reputation * 150_000),
        salaryBudget: Math.round(seed.reputation * 80_000),
        reputation: seed.reputation,
      });
    }

    // If still not enough, generate generic teams
    while (fillerTeams.length + currentSize < targetSize) {
      const idx = fillerTeams.length;
      const str = rng.range(38, 48);
      fillerTeams.push({
        id: `virt-${league.id}-gen-${idx}-s${seasonNumber}`,
        name: `FC ${league.country} ${idx + 1}`,
        shortName: `G${idx}`,
        strength: str,
        country: league.country,
        stadiumName: `Stadion ${idx + 1}`,
        stadiumCapacity: rng.range(4000, 15000),
        city: league.country,
        colors: { primary: '#808080', secondary: '#FFFFFF' },
        budget: str * 100_000,
        salaryBudget: str * 50_000,
        reputation: str - 5,
      });
    }

    return {
      ...league,
      teams: [...league.teams, ...fillerTeams],
    };
  });
}
