// Transfermarkt CDN Logo-URLs für alle Vereine
// Quelle: tmssl.akamaized.net (nur für privaten Gebrauch)

const TM_CDN = 'https://tmssl.akamaized.net/images/wappen/head';

export const TEAM_LOGO_URLS: Record<string, string> = {
  // ── Bundesliga ──
  'bayern-muenchen':      `${TM_CDN}/27.png`,
  'bayer-leverkusen':     `${TM_CDN}/15.png`,
  'vfb-stuttgart':        `${TM_CDN}/79.png`,
  'borussia-dortmund':    `${TM_CDN}/16.png`,
  'rb-leipzig':           `${TM_CDN}/23826.png`,
  'eintracht-frankfurt':  `${TM_CDN}/24.png`,
  'sc-freiburg':          `${TM_CDN}/60.png`,
  'tsg-hoffenheim':       `${TM_CDN}/533.png`,
  'fc-heidenheim':        `${TM_CDN}/2036.png`,
  'werder-bremen':        `${TM_CDN}/86.png`,
  'vfl-wolfsburg':        `${TM_CDN}/82.png`,
  'fc-augsburg':          `${TM_CDN}/167.png`,
  'gladbach':             `${TM_CDN}/18.png`,
  'union-berlin':         `${TM_CDN}/89.png`,
  'vfl-bochum':           `${TM_CDN}/80.png`,
  'mainz-05':             `${TM_CDN}/39.png`,
  'st-pauli':             `${TM_CDN}/35.png`,
  'holstein-kiel':        `${TM_CDN}/2861.png`,

  // ── 2. Bundesliga ──
  'fc-koeln':             `${TM_CDN}/3.png`,
  'hertha-bsc':           `${TM_CDN}/44.png`,
  'hamburger-sv':         `${TM_CDN}/41.png`,
  'fortuna-duesseldorf':  `${TM_CDN}/38.png`,
  'sc-paderborn':         `${TM_CDN}/127.png`,
  'karlsruher-sc':        `${TM_CDN}/76.png`,
  'hannover-96':          `${TM_CDN}/42.png`,
  'greuther-fuerth':      `${TM_CDN}/88.png`,
  'schalke-04':           `${TM_CDN}/33.png`,
  'kaiserslautern':       `${TM_CDN}/34.png`,
  'nuernberg':            `${TM_CDN}/4.png`,
  'darmstadt-98':         `${TM_CDN}/105.png`,
  'ssv-ulm':              `${TM_CDN}/2221.png`,
  'preussen-muenster':    `${TM_CDN}/225.png`,
  'braunschweig':         `${TM_CDN}/81.png`,
  'sv-elversberg':        `${TM_CDN}/471.png`,
  'jahn-regensburg':      `${TM_CDN}/109.png`,
  'magdeburg':            `${TM_CDN}/31.png`,

  // ── 3. Liga ──
  'dynamo-dresden':       `${TM_CDN}/68.png`,
  'arminia-bielefeld':    `${TM_CDN}/10.png`,
  'sv-sandhausen':        `${TM_CDN}/295.png`,
  'fc-ingolstadt':        `${TM_CDN}/2416.png`,
  'erzgebirge-aue':       `${TM_CDN}/40.png`,
  'rw-essen':             `${TM_CDN}/43.png`,
  'hansa-rostock':        `${TM_CDN}/32.png`,
  'alemannia-aachen':     `${TM_CDN}/83.png`,
  'vfb-luebeck':          `${TM_CDN}/126.png`,
  'viktoria-koeln':       `${TM_CDN}/3416.png`,
  'bvb-ii':               `${TM_CDN}/16.png`,
  'sc-verl':              `${TM_CDN}/7353.png`,
  '1860-muenchen':        `${TM_CDN}/72.png`,
  'waldhof-mannheim':     `${TM_CDN}/74.png`,
  'vfl-osnabrueck':       `${TM_CDN}/84.png`,
  'unterhaching':         `${TM_CDN}/73.png`,
  'wehen-wiesbaden':      `${TM_CDN}/293.png`,
  'energie-cottbus':      `${TM_CDN}/90.png`,
  'stuttgarter-kickers':  `${TM_CDN}/75.png`,
  'msv-duisburg':         `${TM_CDN}/36.png`,
};

export function getTeamLogoUrl(teamId: string): string | null {
  return TEAM_LOGO_URLS[teamId] ?? null;
}
