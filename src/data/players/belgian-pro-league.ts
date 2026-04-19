import { TeamRoster } from './types';

export const BELGIAN_PRO_LEAGUE_ROSTERS: TeamRoster[] = [
  {
    teamId: 'club-brugge',
    players: [
      { fn: 'Simon', ln: 'Mignolet', pos: 'TW', nat: 'Belgien', dob: '1988-03-06', ovr: 78, nr: 22, foot: 'R', h: 193, w: 88 },
      { fn: 'Brandon', ln: 'Mechele', pos: 'IV', nat: 'Belgien', dob: '1993-01-28', ovr: 76, nr: 32, foot: 'R', h: 190, w: 82 },
      { fn: 'Joel', ln: 'Ordóñez', pos: 'IV', nat: 'Ecuador', dob: '2003-07-25', ovr: 74, nr: 4, foot: 'R', h: 185, w: 78, pot: 84 },
      { fn: 'Bjorn', ln: 'Meijer', pos: 'LV', nat: 'Niederlande', dob: '2003-01-15', ovr: 74, nr: 3, foot: 'L', h: 178, w: 72, pot: 82 },
      { fn: 'Denis', ln: 'Odoi', pos: 'RV', nat: 'Belgien', dob: '1988-05-27', ovr: 74, nr: 2, foot: 'R', h: 178, w: 72 },
      { fn: 'Hans', ln: 'Vanaken', pos: 'ZOM', nat: 'Belgien', dob: '1992-08-24', ovr: 79, nr: 20, foot: 'R', h: 189, w: 82 },
      { fn: 'Casper', ln: 'Nielsen', pos: 'ZM', nat: 'Dänemark', dob: '1994-04-29', ovr: 76, nr: 6, foot: 'R', h: 183, w: 78 },
      { fn: 'Andreas', ln: 'Skov Olsen', pos: 'RA', nat: 'Dänemark', dob: '1999-12-29', ovr: 76, nr: 7, foot: 'L', h: 187, w: 78 },
      { fn: 'Kamal', ln: 'Sowah', pos: 'LA', nat: 'Ghana', dob: '2000-01-09', ovr: 73, nr: 11, foot: 'R', h: 178, w: 72 },
      { fn: 'Igor', ln: 'Thiago', pos: 'ST', nat: 'Brasilien', dob: '1997-01-01', ovr: 74, nr: 9, foot: 'R', h: 185, w: 78 },
    ],
  },
  {
    teamId: 'anderlecht',
    players: [
      { fn: 'Kasper', ln: 'Schmeichel', pos: 'TW', nat: 'Dänemark', dob: '1986-11-05', ovr: 76, nr: 1, foot: 'R', h: 189, w: 89 },
      { fn: 'Jan', ln: 'Vertonghen', pos: 'IV', nat: 'Belgien', dob: '1987-04-24', ovr: 76, nr: 5, foot: 'L', h: 189, w: 86 },
      { fn: 'Zeno', ln: 'Debast', pos: 'IV', nat: 'Belgien', dob: '2003-10-24', ovr: 74, nr: 4, foot: 'R', h: 186, w: 78, pot: 84 },
      { fn: 'Moussa', ln: 'N\'Diaye', pos: 'LV', nat: 'Senegal', dob: '2003-01-01', ovr: 72, nr: 3, foot: 'L', h: 178, w: 72, pot: 80 },
      { fn: 'Killian', ln: 'Sardella', pos: 'RV', nat: 'Belgien', dob: '2002-03-07', ovr: 73, nr: 2, foot: 'R', h: 178, w: 72, pot: 80 },
      { fn: 'Yari', ln: 'Verschaeren', pos: 'ZOM', nat: 'Belgien', dob: '2001-07-12', ovr: 75, nr: 10, foot: 'R', h: 178, w: 68, pot: 82 },
      { fn: 'Anders', ln: 'Dreyer', pos: 'RA', nat: 'Dänemark', dob: '1998-05-02', ovr: 74, nr: 7, foot: 'L', h: 178, w: 72 },
      { fn: 'Francis', ln: 'Amuzu', pos: 'LA', nat: 'Belgien', dob: '1999-07-01', ovr: 73, nr: 11, foot: 'L', h: 180, w: 72 },
      { fn: 'Kasper', ln: 'Dolberg', pos: 'ST', nat: 'Dänemark', dob: '1997-10-06', ovr: 76, nr: 9, foot: 'R', h: 187, w: 78 },
    ],
  },
  {
    teamId: 'union-sg',
    players: [
      { fn: 'Anthony', ln: 'Moris', pos: 'TW', nat: 'Luxemburg', dob: '1990-07-29', ovr: 74, nr: 1, foot: 'R', h: 188, w: 82 },
      { fn: 'Siebe', ln: 'Van Der Heyden', pos: 'IV', nat: 'Belgien', dob: '1998-09-14', ovr: 73, nr: 4, foot: 'L', h: 186, w: 78 },
      { fn: 'Ross', ln: 'Sykes', pos: 'IV', nat: 'England', dob: '1999-01-01', ovr: 73, nr: 3, foot: 'R', h: 190, w: 82 },
      { fn: 'Lazare', ln: 'Amani', pos: 'ZM', nat: 'Elfenbeinküste', dob: '1998-01-01', ovr: 73, nr: 6, foot: 'R', h: 180, w: 72 },
      { fn: 'Cameron', ln: 'Puertas', pos: 'ZOM', nat: 'Spanien', dob: '1996-01-01', ovr: 75, nr: 10, foot: 'L', h: 178, w: 72 },
      { fn: 'Victor', ln: 'Boniface', pos: 'ST', nat: 'Nigeria', dob: '2000-12-23', ovr: 76, nr: 9, foot: 'R', h: 183, w: 78, pot: 84 },
    ],
  },
  {
    teamId: 'antwerp',
    players: [
      { fn: 'Jean', ln: 'Butez', pos: 'TW', nat: 'Frankreich', dob: '1995-06-24', ovr: 76, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Toby', ln: 'Alderweireld', pos: 'IV', nat: 'Belgien', dob: '1989-03-02', ovr: 78, nr: 2, foot: 'R', h: 187, w: 81 },
      { fn: 'William', ln: 'Pacho', pos: 'IV', nat: 'Ecuador', dob: '2001-10-16', ovr: 76, nr: 4, foot: 'L', h: 186, w: 78, pot: 84 },
      { fn: 'Radja', ln: 'Nainggolan', pos: 'ZM', nat: 'Belgien', dob: '1988-05-04', ovr: 74, nr: 44, foot: 'R', h: 175, w: 72 },
      { fn: 'Vincent', ln: 'Janssen', pos: 'ST', nat: 'Niederlande', dob: '1994-06-15', ovr: 76, nr: 9, foot: 'L', h: 183, w: 82 },
      { fn: 'Michel-Ange', ln: 'Balikwisha', pos: 'RA', nat: 'Belgien', dob: '2001-01-01', ovr: 73, nr: 7, foot: 'L', h: 175, w: 68, pot: 80 },
    ],
  },
  {
    teamId: 'gent',
    players: [
      { fn: 'Davy', ln: 'Roef', pos: 'TW', nat: 'Belgien', dob: '1994-02-06', ovr: 74, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Michael', ln: 'Ngadeu', pos: 'IV', nat: 'Kamerun', dob: '1990-11-23', ovr: 74, nr: 4, foot: 'R', h: 190, w: 82 },
      { fn: 'Julien', ln: 'De Sart', pos: 'ZDM', nat: 'Belgien', dob: '1994-12-23', ovr: 74, nr: 6, foot: 'R', h: 185, w: 78 },
      { fn: 'Hugo', ln: 'Cuypers', pos: 'ST', nat: 'Belgien', dob: '1997-04-10', ovr: 75, nr: 9, foot: 'R', h: 183, w: 78 },
      { fn: 'Tarik', ln: 'Tissoudali', pos: 'LA', nat: 'Marokko', dob: '1993-04-02', ovr: 75, nr: 10, foot: 'R', h: 178, w: 72 },
    ],
  },
  {
    teamId: 'genk',
    players: [
      { fn: 'Maarten', ln: 'Vandevoordt', pos: 'TW', nat: 'Belgien', dob: '2002-02-28', ovr: 76, nr: 1, foot: 'R', h: 188, w: 82, pot: 84 },
      { fn: 'Mark', ln: 'McKenzie', pos: 'IV', nat: 'USA', dob: '1999-02-25', ovr: 74, nr: 4, foot: 'R', h: 185, w: 78 },
      { fn: 'Carlos', ln: 'Cuesta', pos: 'IV', nat: 'Kolumbien', dob: '1999-03-15', ovr: 74, nr: 3, foot: 'R', h: 188, w: 82 },
      { fn: 'Bryan', ln: 'Heynen', pos: 'ZDM', nat: 'Belgien', dob: '1997-03-13', ovr: 75, nr: 6, foot: 'R', h: 183, w: 78 },
      { fn: 'Bilal', ln: 'El Khannouss', pos: 'ZOM', nat: 'Marokko', dob: '2004-05-10', ovr: 74, nr: 10, foot: 'R', h: 178, w: 68, pot: 85 },
      { fn: 'Tolu', ln: 'Arokodare', pos: 'ST', nat: 'Nigeria', dob: '2000-09-12', ovr: 74, nr: 9, foot: 'R', h: 193, w: 85, pot: 82 },
    ],
  },
  {
    teamId: 'standard-luettich',
    players: [
      { fn: 'Arnaud', ln: 'Bodart', pos: 'TW', nat: 'Belgien', dob: '1998-03-11', ovr: 74, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Kostas', ln: 'Laifis', pos: 'IV', nat: 'Zypern', dob: '1993-05-19', ovr: 73, nr: 4, foot: 'L', h: 186, w: 82 },
      { fn: 'Aron', ln: 'Dönnum', pos: 'LA', nat: 'Norwegen', dob: '1998-04-20', ovr: 73, nr: 7, foot: 'L', h: 178, w: 72 },
      { fn: 'Selim', ln: 'Amallah', pos: 'ZOM', nat: 'Marokko', dob: '1996-11-15', ovr: 74, nr: 10, foot: 'R', h: 183, w: 78 },
      { fn: 'Renaud', ln: 'Emond', pos: 'ST', nat: 'Belgien', dob: '1991-12-05', ovr: 73, nr: 9, foot: 'R', h: 186, w: 82 },
    ],
  },
  {
    teamId: 'charleroi',
    players: [
      { fn: 'Hervé', ln: 'Koffi', pos: 'TW', nat: 'Burkina Faso', dob: '1996-10-28', ovr: 73, nr: 1, foot: 'R', h: 188, w: 82 },
      { fn: 'Loïc', ln: 'Bessile', pos: 'IV', nat: 'Frankreich', dob: '1999-01-01', ovr: 72, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Adem', ln: 'Zorgane', pos: 'ZM', nat: 'Algerien', dob: '1999-01-01', ovr: 73, nr: 6, foot: 'R', h: 183, w: 78 },
      { fn: 'Youssouph', ln: 'Badji', pos: 'ST', nat: 'Senegal', dob: '2001-01-01', ovr: 72, nr: 9, foot: 'R', h: 185, w: 78, pot: 78 },
    ],
  },
  {
    teamId: 'mechelen',
    players: [
      { fn: 'Gaëtan', ln: 'Coucke', pos: 'TW', nat: 'Belgien', dob: '1998-01-01', ovr: 72, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Jordi', ln: 'Vanlerberghe', pos: 'IV', nat: 'Belgien', dob: '1996-01-01', ovr: 72, nr: 4, foot: 'L', h: 186, w: 78 },
      { fn: 'Nikola', ln: 'Storm', pos: 'RA', nat: 'Belgien', dob: '1994-01-01', ovr: 73, nr: 7, foot: 'R', h: 178, w: 72 },
      { fn: 'Rob', ln: 'Schoofs', pos: 'ZM', nat: 'Belgien', dob: '1993-01-01', ovr: 73, nr: 8, foot: 'R', h: 183, w: 78 },
    ],
  },
  {
    teamId: 'cercle-brugge',
    players: [
      { fn: 'Maxime', ln: 'Delanghe', pos: 'TW', nat: 'Belgien', dob: '2000-01-01', ovr: 71, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Boris', ln: 'Popović', pos: 'IV', nat: 'Serbien', dob: '1998-01-01', ovr: 72, nr: 4, foot: 'R', h: 190, w: 82 },
      { fn: 'Thibo', ln: 'Somers', pos: 'ZM', nat: 'Belgien', dob: '2001-01-01', ovr: 72, nr: 8, foot: 'R', h: 183, w: 78, pot: 80 },
      { fn: 'Kevin', ln: 'Denkey', pos: 'ST', nat: 'Togo', dob: '2000-01-01', ovr: 73, nr: 9, foot: 'R', h: 185, w: 78, pot: 80 },
    ],
  },
  {
    teamId: 'oud-heverlee',
    players: [
      { fn: 'Rafael', ln: 'Romo', pos: 'TW', nat: 'Venezuela', dob: '1990-01-01', ovr: 72, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Cenk', ln: 'Özkacar', pos: 'IV', nat: 'Türkei', dob: '2000-01-01', ovr: 71, nr: 4, foot: 'L', h: 190, w: 82 },
      { fn: 'Mathieu', ln: 'Maertens', pos: 'ZM', nat: 'Belgien', dob: '2001-01-01', ovr: 72, nr: 8, foot: 'R', h: 180, w: 72, pot: 80 },
    ],
  },
  {
    teamId: 'westerlo',
    players: [
      { fn: 'Sinan', ln: 'Bolat', pos: 'TW', nat: 'Belgien', dob: '1988-09-03', ovr: 72, nr: 1, foot: 'R', h: 188, w: 82 },
      { fn: 'Luka', ln: 'Vušković', pos: 'IV', nat: 'Kroatien', dob: '2004-01-01', ovr: 71, nr: 4, foot: 'R', h: 192, w: 82, pot: 82 },
      { fn: 'Matija', ln: 'Frigan', pos: 'ZM', nat: 'Kroatien', dob: '2001-01-01', ovr: 71, nr: 8, foot: 'R', h: 183, w: 78 },
    ],
  },
  {
    teamId: 'kortrijk',
    players: [
      { fn: 'Tom', ln: 'Vandenberghe', pos: 'TW', nat: 'Belgien', dob: '1993-01-01', ovr: 71, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Trent', ln: 'Sainsbury', pos: 'IV', nat: 'Australien', dob: '1992-01-01', ovr: 72, nr: 4, foot: 'R', h: 186, w: 78 },
      { fn: 'Habib', ln: 'Keita', pos: 'ST', nat: 'Guinea', dob: '1999-01-01', ovr: 71, nr: 9, foot: 'R', h: 183, w: 78 },
    ],
  },
  {
    teamId: 'sint-truiden',
    players: [
      { fn: 'Zion', ln: 'Suzuki', pos: 'TW', nat: 'Japan', dob: '2002-08-21', ovr: 72, nr: 1, foot: 'R', h: 190, w: 82, pot: 80 },
      { fn: 'Wolke', ln: 'Janssens', pos: 'IV', nat: 'Belgien', dob: '1998-01-01', ovr: 71, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Daichi', ln: 'Hayashi', pos: 'ZOM', nat: 'Japan', dob: '1997-01-01', ovr: 72, nr: 10, foot: 'R', h: 175, w: 68 },
    ],
  },
  {
    teamId: 'rwdm',
    players: [
      { fn: 'Anthony', ln: 'Moris', pos: 'TW', nat: 'Luxemburg', dob: '1990-07-29', ovr: 71, nr: 1, foot: 'R', h: 190, w: 82 },
      { fn: 'Florian', ln: 'Le Joncour', pos: 'IV', nat: 'Frankreich', dob: '1996-01-01', ovr: 70, nr: 4, foot: 'R', h: 188, w: 82 },
      { fn: 'Mickaël', ln: 'Biron', pos: 'ST', nat: 'Belgien', dob: '1998-01-01', ovr: 71, nr: 9, foot: 'R', h: 183, w: 78 },
    ],
  },
  {
    teamId: 'dender',
    players: [
      { fn: 'Brent', ln: 'Gabriel', pos: 'TW', nat: 'Belgien', dob: '1997-01-01', ovr: 69, nr: 1, foot: 'R', h: 188, w: 82 },
      { fn: 'Lennart', ln: 'Mertens', pos: 'IV', nat: 'Belgien', dob: '1996-01-01', ovr: 69, nr: 4, foot: 'R', h: 186, w: 78 },
      { fn: 'Kobe', ln: 'Cools', pos: 'ST', nat: 'Belgien', dob: '1999-01-01', ovr: 70, nr: 9, foot: 'R', h: 180, w: 72 },
    ],
  },
];
