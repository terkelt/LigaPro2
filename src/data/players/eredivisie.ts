import { TeamRoster } from './types';

export const EREDIVISIE_ROSTERS: TeamRoster[] = [
  {
    teamId: 'ajax',
    players: [
      { fn: 'Remko', ln: 'Pasveer', pos: 'TW', nat: 'Niederlande', dob: '1983-11-08', ovr: 74, nr: 22, foot: 'R', h: 188, w: 82 },
      { fn: 'Diant', ln: 'Ramaj', pos: 'TW', nat: 'Deutschland', dob: '2001-07-19', ovr: 72, nr: 1, foot: 'R', h: 193, w: 85 },
      { fn: 'Josip', ln: 'Šutalo', pos: 'IV', nat: 'Kroatien', dob: '2000-02-28', ovr: 76, nr: 4, foot: 'R', h: 186, w: 78, pot: 83 },
      { fn: 'Ahmetcan', ln: 'Kaplan', pos: 'IV', nat: 'Türkei', dob: '2003-01-01', ovr: 73, nr: 3, foot: 'R', h: 190, w: 82, pot: 82 },
      { fn: 'Devyne', ln: 'Rensch', pos: 'RV', nat: 'Niederlande', dob: '2003-01-18', ovr: 74, nr: 2, foot: 'R', h: 178, w: 72, pot: 82 },
      { fn: 'Owen', ln: 'Wijndal', pos: 'LV', nat: 'Niederlande', dob: '1999-11-28', ovr: 75, nr: 5, foot: 'L', h: 178, w: 72 },
      { fn: 'Kenneth', ln: 'Taylor', pos: 'ZM', nat: 'Niederlande', dob: '2002-06-16', ovr: 75, nr: 8, foot: 'L', h: 183, w: 72, pot: 83 },
      { fn: 'Jordan', ln: 'Henderson', pos: 'ZM', nat: 'England', dob: '1990-06-17', ovr: 78, nr: 6, foot: 'R', h: 182, w: 74 },
      { fn: 'Steven', ln: 'Berghuis', pos: 'ZOM', nat: 'Niederlande', dob: '1991-12-19', ovr: 77, nr: 10, foot: 'L', h: 182, w: 78 },
      { fn: 'Steven', ln: 'Bergwijn', pos: 'LA', nat: 'Niederlande', dob: '1997-10-08', ovr: 78, nr: 7, foot: 'R', h: 178, w: 72 },
      { fn: 'Brian', ln: 'Brobbey', pos: 'ST', nat: 'Niederlande', dob: '2002-02-01', ovr: 76, nr: 9, foot: 'R', h: 180, w: 82, pot: 85 },
      { fn: 'Chuba', ln: 'Akpom', pos: 'ST', nat: 'England', dob: '1995-10-09', ovr: 76, nr: 11, foot: 'R', h: 185, w: 78 },
    ],
  },
  {
    teamId: 'psv',
    players: [
      { fn: 'Walter', ln: 'Benítez', pos: 'TW', nat: 'Argentinien', dob: '1993-01-19', ovr: 78, nr: 1, foot: 'R', h: 189, w: 82 },
      { fn: 'Jordan', ln: 'Teze', pos: 'IV', nat: 'Niederlande', dob: '1999-09-30', ovr: 76, nr: 4, foot: 'R', h: 182, w: 78, sec: ['RV'] },
      { fn: 'André', ln: 'Ramalho', pos: 'IV', nat: 'Brasilien', dob: '1992-02-16', ovr: 76, nr: 3, foot: 'R', h: 185, w: 82 },
      { fn: 'Olivier', ln: 'Boscagli', pos: 'IV', nat: 'Frankreich', dob: '1997-11-18', ovr: 78, nr: 5, foot: 'L', h: 183, w: 78, sec: ['LV'] },
      { fn: 'Sergiño', ln: 'Dest', pos: 'RV', nat: 'USA', dob: '2000-11-03', ovr: 76, nr: 2, foot: 'R', h: 175, w: 72 },
      { fn: 'Philipp', ln: 'Max', pos: 'LV', nat: 'Deutschland', dob: '1993-09-30', ovr: 75, nr: 22, foot: 'L', h: 180, w: 72 },
      { fn: 'Joey', ln: 'Veerman', pos: 'ZM', nat: 'Niederlande', dob: '1998-11-19', ovr: 78, nr: 6, foot: 'R', h: 183, w: 78 },
      { fn: 'Jerdy', ln: 'Schouten', pos: 'ZDM', nat: 'Niederlande', dob: '1997-01-12', ovr: 77, nr: 8, foot: 'R', h: 185, w: 78 },
      { fn: 'Xavi', ln: 'Simons', pos: 'ZOM', nat: 'Niederlande', dob: '2003-04-21', ovr: 80, nr: 10, foot: 'R', h: 179, w: 68, pot: 89 },
      { fn: 'Johan', ln: 'Bakayoko', pos: 'RA', nat: 'Belgien', dob: '2003-04-01', ovr: 77, nr: 7, foot: 'L', h: 176, w: 68, pot: 86 },
      { fn: 'Hirving', ln: 'Lozano', pos: 'LA', nat: 'Mexiko', dob: '1995-07-30', ovr: 78, nr: 11, foot: 'R', h: 175, w: 70 },
      { fn: 'Luuk', ln: 'de Jong', pos: 'ST', nat: 'Niederlande', dob: '1990-08-27', ovr: 76, nr: 9, foot: 'R', h: 188, w: 82 },
    ],
  },
  {
    teamId: 'feyenoord',
    players: [
      { fn: 'Justin', ln: 'Bijlow', pos: 'TW', nat: 'Niederlande', dob: '1998-01-22', ovr: 77, nr: 1, foot: 'R', h: 187, w: 82 },
      { fn: 'Lutsharel', ln: 'Geertruida', pos: 'RV', nat: 'Niederlande', dob: '2000-07-18', ovr: 77, nr: 2, foot: 'R', h: 182, w: 78, sec: ['IV'] },
      { fn: 'Gernot', ln: 'Trauner', pos: 'IV', nat: 'Österreich', dob: '1992-03-25', ovr: 77, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Dávid', ln: 'Hancko', pos: 'IV', nat: 'Slowakei', dob: '1997-12-13', ovr: 77, nr: 3, foot: 'L', h: 188, w: 82 },
      { fn: 'Quilindschy', ln: 'Hartman', pos: 'LV', nat: 'Niederlande', dob: '2002-10-07', ovr: 74, nr: 5, foot: 'L', h: 178, w: 72, pot: 82 },
      { fn: 'Quinten', ln: 'Timber', pos: 'ZM', nat: 'Niederlande', dob: '2001-06-17', ovr: 76, nr: 6, foot: 'R', h: 180, w: 72, pot: 83 },
      { fn: 'Mats', ln: 'Wieffer', pos: 'ZDM', nat: 'Niederlande', dob: '1999-11-16', ovr: 77, nr: 8, foot: 'R', h: 188, w: 78, pot: 84 },
      { fn: 'Orkun', ln: 'Kökçü', pos: 'ZOM', nat: 'Türkei', dob: '2000-12-29', ovr: 77, nr: 10, foot: 'R', h: 178, w: 72 },
      { fn: 'Calvin', ln: 'Stengs', pos: 'RA', nat: 'Niederlande', dob: '1998-12-18', ovr: 76, nr: 7, foot: 'L', h: 183, w: 72 },
      { fn: 'Igor', ln: 'Paixão', pos: 'LA', nat: 'Brasilien', dob: '2000-01-21', ovr: 76, nr: 11, foot: 'R', h: 175, w: 68 },
      { fn: 'Santiago', ln: 'Giménez', pos: 'ST', nat: 'Mexiko', dob: '2001-04-18', ovr: 78, nr: 9, foot: 'R', h: 179, w: 75, pot: 85 },
    ],
  },
  {
    teamId: 'az-alkmaar',
    players: [
      { fn: 'Hobie', ln: 'Verhulst', pos: 'TW', nat: 'Niederlande', dob: '1998-05-19', ovr: 74, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Pantelis', ln: 'Hatzidiakos', pos: 'IV', nat: 'Griechenland', dob: '1997-01-18', ovr: 74, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Sam', ln: 'Beukema', pos: 'IV', nat: 'Niederlande', dob: '1998-11-17', ovr: 75, nr: 3, foot: 'R', h: 191, w: 82 },
      { fn: 'Jordy', ln: 'Clasie', pos: 'ZDM', nat: 'Niederlande', dob: '1991-06-27', ovr: 74, nr: 6, foot: 'R', h: 169, w: 62 },
      { fn: 'Tijjani', ln: 'Reijnders', pos: 'ZM', nat: 'Niederlande', dob: '1998-07-29', ovr: 76, nr: 8, foot: 'R', h: 185, w: 75 },
      { fn: 'Vangelis', ln: 'Pavlidis', pos: 'ST', nat: 'Griechenland', dob: '1998-11-21', ovr: 76, nr: 9, foot: 'R', h: 183, w: 78 },
      { fn: 'Sven', ln: 'Mijnans', pos: 'LA', nat: 'Niederlande', dob: '2001-05-19', ovr: 73, nr: 7, foot: 'R', h: 178, w: 72, pot: 80 },
    ],
  },
  {
    teamId: 'fc-twente',
    players: [
      { fn: 'Lars', ln: 'Unnerstall', pos: 'TW', nat: 'Deutschland', dob: '1990-07-20', ovr: 76, nr: 1, foot: 'R', h: 196, w: 90 },
      { fn: 'Robin', ln: 'Pröpper', pos: 'IV', nat: 'Niederlande', dob: '1991-04-02', ovr: 74, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Mees', ln: 'Hilgers', pos: 'IV', nat: 'Niederlande', dob: '2001-10-04', ovr: 73, nr: 3, foot: 'R', h: 190, w: 82, pot: 80 },
      { fn: 'Michal', ln: 'Sadílek', pos: 'ZM', nat: 'Tschechien', dob: '1999-05-31', ovr: 74, nr: 6, foot: 'R', h: 183, w: 78 },
      { fn: 'Ricky', ln: 'van Wolfswinkel', pos: 'ST', nat: 'Niederlande', dob: '1989-01-27', ovr: 74, nr: 9, foot: 'R', h: 183, w: 78 },
      { fn: 'Daan', ln: 'Rots', pos: 'LA', nat: 'Niederlande', dob: '2001-12-11', ovr: 73, nr: 7, foot: 'R', h: 178, w: 72, pot: 80 },
    ],
  },
  {
    teamId: 'fc-utrecht',
    players: [
      { fn: 'Vasilis', ln: 'Barkas', pos: 'TW', nat: 'Griechenland', dob: '1994-05-30', ovr: 74, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Mike', ln: 'van der Hoorn', pos: 'IV', nat: 'Niederlande', dob: '1992-10-15', ovr: 74, nr: 4, foot: 'L', h: 192, w: 85 },
      { fn: 'Sander', ln: 'van de Streek', pos: 'ZM', nat: 'Niederlande', dob: '1993-01-23', ovr: 74, nr: 8, foot: 'R', h: 185, w: 78 },
      { fn: 'Jens', ln: 'Toornstra', pos: 'ZOM', nat: 'Niederlande', dob: '1989-04-04', ovr: 74, nr: 10, foot: 'R', h: 180, w: 72 },
      { fn: 'Anastasios', ln: 'Douvikas', pos: 'ST', nat: 'Griechenland', dob: '1999-08-02', ovr: 74, nr: 9, foot: 'R', h: 183, w: 78 },
    ],
  },
  {
    teamId: 'nac-breda',
    players: [
      { fn: 'Daniel', ln: 'Bielica', pos: 'TW', nat: 'Polen', dob: '1997-01-01', ovr: 70, nr: 1, foot: 'R', h: 190, w: 84 },
      { fn: 'Jan', ln: 'Van den Bergh', pos: 'IV', nat: 'Belgien', dob: '1995-01-01', ovr: 70, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Leo', ln: 'Sauer', pos: 'LA', nat: 'Slowakei', dob: '2004-12-26', ovr: 71, nr: 7, foot: 'R', h: 178, w: 72, pot: 80 },
      { fn: 'Elías', ln: 'Már Ómarsson', pos: 'ST', nat: 'Island', dob: '1995-01-01', ovr: 70, nr: 9, foot: 'R', h: 188, w: 82 },
    ],
  },
  {
    teamId: 'sc-heerenveen',
    players: [
      { fn: 'Andries', ln: 'Noppert', pos: 'TW', nat: 'Niederlande', dob: '1994-04-07', ovr: 74, nr: 1, foot: 'R', h: 203, w: 95 },
      { fn: 'Pawel', ln: 'Bochniewicz', pos: 'IV', nat: 'Polen', dob: '1996-01-01', ovr: 72, nr: 4, foot: 'R', h: 190, w: 82 },
      { fn: 'Thom', ln: 'van Bergen', pos: 'RA', nat: 'Niederlande', dob: '1999-01-01', ovr: 72, nr: 7, foot: 'R', h: 178, w: 72 },
      { fn: 'Amin', ln: 'Sarr', pos: 'ST', nat: 'Niederlande', dob: '2002-01-01', ovr: 72, nr: 9, foot: 'R', h: 183, w: 78, pot: 80 },
    ],
  },
  {
    teamId: 'nec-nijmegen',
    players: [
      { fn: 'Mattijs', ln: 'Branderhorst', pos: 'TW', nat: 'Niederlande', dob: '1993-06-13', ovr: 72, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Bart', ln: 'van Rooij', pos: 'RV', nat: 'Niederlande', dob: '2000-01-01', ovr: 72, nr: 2, foot: 'R', h: 178, w: 72 },
      { fn: 'Lasse', ln: 'Schöne', pos: 'ZM', nat: 'Dänemark', dob: '1986-05-27', ovr: 73, nr: 10, foot: 'L', h: 178, w: 72 },
      { fn: 'Elayis', ln: 'Tavşan', pos: 'RA', nat: 'Niederlande', dob: '2001-01-01', ovr: 72, nr: 7, foot: 'L', h: 175, w: 68, pot: 80 },
      { fn: 'Pedro', ln: 'Marques', pos: 'ST', nat: 'Portugal', dob: '1998-01-01', ovr: 72, nr: 9, foot: 'R', h: 183, w: 78 },
    ],
  },
  {
    teamId: 'go-ahead-eagles',
    players: [
      { fn: 'Jeffrey', ln: 'de Lange', pos: 'TW', nat: 'Niederlande', dob: '1994-01-01', ovr: 70, nr: 1, foot: 'R', h: 188, w: 82 },
      { fn: 'Joris', ln: 'Kramer', pos: 'IV', nat: 'Niederlande', dob: '1992-01-01', ovr: 70, nr: 4, foot: 'R', h: 190, w: 82 },
      { fn: 'Oliver', ln: 'Antman', pos: 'LA', nat: 'Schweden', dob: '2001-01-01', ovr: 70, nr: 7, foot: 'L', h: 178, w: 72, pot: 78 },
      { fn: 'Philippe', ln: 'Rommens', pos: 'ZM', nat: 'Belgien', dob: '1997-01-01', ovr: 71, nr: 8, foot: 'R', h: 180, w: 72 },
    ],
  },
  {
    teamId: 'sparta-rotterdam',
    players: [
      { fn: 'Nick', ln: 'Olij', pos: 'TW', nat: 'Niederlande', dob: '1995-01-01', ovr: 72, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Bart', ln: 'Vriends', pos: 'IV', nat: 'Niederlande', dob: '1993-01-01', ovr: 72, nr: 4, foot: 'R', h: 190, w: 82 },
      { fn: 'Tobias', ln: 'Lauritsen', pos: 'ST', nat: 'Norwegen', dob: '1997-01-01', ovr: 73, nr: 9, foot: 'R', h: 190, w: 85 },
      { fn: 'Arno', ln: 'Verschueren', pos: 'ZOM', nat: 'Belgien', dob: '1997-01-01', ovr: 72, nr: 10, foot: 'R', h: 178, w: 72 },
    ],
  },
  {
    teamId: 'fc-groningen',
    players: [
      { fn: 'Michael', ln: 'Verrips', pos: 'TW', nat: 'Niederlande', dob: '1996-01-01', ovr: 72, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Neraysho', ln: 'Kasanwirjo', pos: 'IV', nat: 'Niederlande', dob: '2001-01-01', ovr: 72, nr: 4, foot: 'R', h: 185, w: 78, pot: 80 },
      { fn: 'Leandro', ln: 'Bacuna', pos: 'ZM', nat: 'Curaçao', dob: '1991-08-21', ovr: 73, nr: 8, foot: 'R', h: 185, w: 78 },
      { fn: 'Jørgen', ln: 'Strand Larsen', pos: 'ST', nat: 'Norwegen', dob: '2000-02-06', ovr: 74, nr: 9, foot: 'R', h: 193, w: 85, pot: 82 },
    ],
  },
  {
    teamId: 'excelsior',
    players: [
      { fn: 'Alessandro', ln: 'Damen', pos: 'TW', nat: 'Niederlande', dob: '1998-01-01', ovr: 70, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Siebe', ln: 'Horemans', pos: 'IV', nat: 'Belgien', dob: '1997-01-01', ovr: 70, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Couhaib', ln: 'Driouech', pos: 'RA', nat: 'Niederlande', dob: '2002-01-01', ovr: 71, nr: 7, foot: 'L', h: 175, w: 68, pot: 78 },
      { fn: 'Thijs', ln: 'Dallinga', pos: 'ST', nat: 'Niederlande', dob: '2000-01-01', ovr: 70, nr: 9, foot: 'R', h: 190, w: 82 },
    ],
  },
  {
    teamId: 'fc-emmen',
    players: [
      { fn: 'Mickey', ln: 'van der Hart', pos: 'TW', nat: 'Niederlande', dob: '1994-01-01', ovr: 71, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Miguel', ln: 'Araujo', pos: 'IV', nat: 'Peru', dob: '1994-01-01', ovr: 71, nr: 4, foot: 'R', h: 190, w: 82 },
      { fn: 'Rui', ln: 'Mendes', pos: 'ZM', nat: 'Portugal', dob: '1998-01-01', ovr: 70, nr: 8, foot: 'R', h: 180, w: 72 },
      { fn: 'Ole', ln: 'Romeny', pos: 'ST', nat: 'Niederlande', dob: '2001-01-01', ovr: 70, nr: 9, foot: 'R', h: 183, w: 78 },
    ],
  },
  {
    teamId: 'fortuna-sittard',
    players: [
      { fn: 'Yanick', ln: 'van Osch', pos: 'TW', nat: 'Niederlande', dob: '1997-01-01', ovr: 71, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'George', ln: 'Cox', pos: 'LV', nat: 'England', dob: '1998-01-01', ovr: 71, nr: 3, foot: 'L', h: 178, w: 72 },
      { fn: 'Burak', ln: 'Yılmaz', pos: 'ST', nat: 'Türkei', dob: '1985-07-15', ovr: 73, nr: 9, foot: 'R', h: 188, w: 82 },
    ],
  },
  {
    teamId: 'heracles',
    players: [
      { fn: 'Koen', ln: 'Bucker', pos: 'TW', nat: 'Niederlande', dob: '1998-01-01', ovr: 70, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Marco', ln: 'Rente', pos: 'IV', nat: 'Niederlande', dob: '1996-01-01', ovr: 70, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Emil', ln: 'Hansson', pos: 'LA', nat: 'Schweden', dob: '1998-01-01', ovr: 71, nr: 7, foot: 'R', h: 178, w: 72 },
      { fn: 'Nikolai', ln: 'Laursen', pos: 'ST', nat: 'Dänemark', dob: '1998-01-01', ovr: 71, nr: 9, foot: 'R', h: 185, w: 78 },
    ],
  },
  {
    teamId: 'willem-ii',
    players: [
      { fn: 'Thomas', ln: 'Didillon', pos: 'TW', nat: 'Frankreich', dob: '1995-01-01', ovr: 71, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Wessel', ln: 'Dammers', pos: 'IV', nat: 'Niederlande', dob: '1995-01-01', ovr: 71, nr: 4, foot: 'R', h: 190, w: 82 },
      { fn: 'Cisse', ln: 'Sandra', pos: 'ZM', nat: 'Niederlande', dob: '2001-01-01', ovr: 71, nr: 8, foot: 'R', h: 180, w: 72 },
      { fn: 'Ché', ln: 'Nunnely', pos: 'RA', nat: 'Niederlande', dob: '1999-01-01', ovr: 71, nr: 7, foot: 'R', h: 175, w: 68 },
    ],
  },
];
