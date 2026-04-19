/**
 * Week Events Engine — generates contextual daily events between matches.
 * Makes the week feel alive with random events, milestone news, opponent previews,
 * injury updates, and more.
 */
import { GameState } from '@/types/game';
import { NewsItem, PressConference, PressQuestion } from '@/types/news';
import { Player } from '@/types/player';
import { Match } from '@/types/match';

// ─── Helpers ───

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

function getAge(dob: string, currentDate: string): number {
  return new Date(currentDate).getFullYear() - new Date(dob).getFullYear();
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay(); // 0=Sun, 1=Mon
}

function daysUntil(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** Find the next unplayed match for the player's team */
function findNextMatch(state: GameState): { match: Match; daysAway: number } | null {
  let closest: { match: Match; daysAway: number } | null = null;

  for (const schedule of state.schedules) {
    for (const match of schedule.matches) {
      if (match.isPlayed) continue;
      if (match.homeTeamId !== state.currentTeamId && match.awayTeamId !== state.currentTeamId) continue;
      const days = daysUntil(state.currentDate, match.date);
      if (days >= 0 && (!closest || days < closest.daysAway)) {
        closest = { match, daysAway: days };
      }
    }
  }
  return closest;
}

function getTeamPosition(state: GameState): number {
  const team = state.teams.find((t) => t.id === state.currentTeamId);
  if (!team) return 10;
  const table = state.tables[team.league];
  if (!table) return 10;
  const entry = table.find((e) => e.teamId === state.currentTeamId);
  return entry?.position ?? 10;
}

function getTeamForm(state: GameState): string[] {
  const team = state.teams.find((t) => t.id === state.currentTeamId);
  if (!team) return [];
  const table = state.tables[team.league];
  if (!table) return [];
  const entry = table.find((e) => e.teamId === state.currentTeamId);
  return entry?.form ?? [];
}

// ─── Main Event Generator ───

export interface DailyEventResult {
  news: NewsItem[];
  moralChanges: { playerId: string; delta: number }[];
  interactions: GameState['interactions'];
  pressConferences: PressConference[];
}

/**
 * Generate daily events for the current game day.
 * Called from day-advance on non-match days.
 */
export function generateDailyEvents(state: GameState): DailyEventResult {
  const rng = seededRandom(state.currentDate + state.currentTeamId);
  const news: NewsItem[] = [];
  const moralChanges: { playerId: string; delta: number }[] = [];
  const interactions = [...state.interactions];
  const pressConferences: PressConference[] = [];
  const dayOfWeek = getDayOfWeek(state.currentDate);
  const myPlayers = state.players.filter((p) => p.teamId === state.currentTeamId);

  // ── 1. Gegner-Vorschau (2 Tage vor Spiel) ──
  const nextMatch = findNextMatch(state);
  if (nextMatch && nextMatch.daysAway === 2) {
    const preview = generateOpponentPreview(state, nextMatch.match);
    if (preview) news.push(preview);
  }

  // ── 2. Spieler-Meilensteine ──
  const milestones = generateMilestones(state, myPlayers);
  news.push(...milestones);

  // ── 3. Verletzungs-Updates ──
  const injuryNews = generateInjuryUpdates(state, myPlayers);
  news.push(...injuryNews);

  // ── 4. Vertragsablauf-Warnungen (monatlich, am 1.) ──
  if (state.currentDate.endsWith('-01')) {
    const contractNews = generateContractWarnings(state, myPlayers);
    news.push(...contractNews);
  }

  // ── 5. Zufällige Tagesevents (30% Chance pro Tag) ──
  if (rng() < 0.30) {
    const randomEvent = generateRandomEvent(state, myPlayers, rng);
    if (randomEvent) {
      news.push(...randomEvent.news);
      moralChanges.push(...randomEvent.moralChanges);
    }
  }

  // ── 6. Board-Nachrichten (bei schlechter Leistung) ──
  if (dayOfWeek === 1 && state.season.currentMatchday >= 5) {
    const boardNews = generateBoardMessage(state);
    if (boardNews) news.push(boardNews);
  }

  // ── 7. Fan-Stimmung nach Ergebnisserie ──
  if (dayOfWeek === 3) { // Mittwoch
    const fanNews = generateFanMood(state);
    if (fanNews) news.push(fanNews);
  }

  // ── 8. Liga-Ergebnisse anderer Spiele ──
  if (rng() < 0.20) {
    const leagueNews = generateLeagueGossip(state, rng);
    if (leagueNews) news.push(leagueNews);
  }

  // ── 9. Spielerform-Highlights (Dienstag) ──
  if (dayOfWeek === 2) {
    const formNews = generateFormHighlights(state, myPlayers);
    news.push(...formNews);
  }

  // ── 10. Fitness-Warnungen (Donnerstag) ──
  if (dayOfWeek === 4) {
    const fitnessNews = generateFitnessWarnings(state, myPlayers);
    news.push(...fitnessNews);
  }

  // ── 11. Torjäger-Update (Freitag, ab Spieltag 3) ──
  if (dayOfWeek === 5 && state.season.currentMatchday >= 3) {
    const scorerNews = generateScorerUpdate(state, myPlayers);
    if (scorerNews) news.push(scorerNews);
  }

  // ── 12. Pressekonferenz generieren (1 Tag vor Spiel) ──
  if (nextMatch && nextMatch.daysAway === 1) {
    const existingPK = state.pressConferences.find(
      (pc) => pc.date === state.currentDate && pc.type === 'pre_match'
    );
    if (!existingPK) {
      const pk = generatePreMatchPressConference(state, nextMatch.match);
      if (pk) {
        pressConferences.push(pk);
      }
    }
  }

  return { news, moralChanges, interactions, pressConferences };
}

// ─── Event Generators ───

function generateOpponentPreview(state: GameState, match: Match): NewsItem | null {
  const isHome = match.homeTeamId === state.currentTeamId;
  const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
  const opponent = state.teams.find((t) => t.id === opponentId);
  if (!opponent) return null;

  const oppTable = state.tables[opponent.league];
  const oppEntry = oppTable?.find((e) => e.teamId === opponentId);
  const oppForm = oppEntry?.form ?? [];
  const oppPos = oppEntry?.position ?? '?';

  const formStr = oppForm.length > 0
    ? oppForm.map((f) => f === 'W' ? 'S' : f === 'L' ? 'N' : 'U').join('-')
    : 'Keine Daten';

  const oppPlayers = state.players.filter((p) => p.teamId === opponentId && !p.injury);
  const topScorer = [...state.players]
    .filter((p) => p.teamId === opponentId)
    .sort((a, b) => b.stats.goals - a.stats.goals)[0];

  const venue = isHome ? 'Heimspiel' : 'Auswärtsspiel';
  const dangerPlayer = topScorer && topScorer.stats.goals > 0
    ? `Gefährlichster Spieler: ${topScorer.firstName} ${topScorer.lastName} (${topScorer.stats.goals} Tore).`
    : '';

  return {
    id: `preview-${match.id}`,
    type: 'general',
    title: `Spielvorschau: ${venue} gegen ${opponent.name}`,
    content: `Am ${match.matchday}. Spieltag erwartet uns ${opponent.name} (Platz ${oppPos}). ` +
      `Letzte Form: ${formStr}. ${oppPlayers.length} Spieler verfügbar. ${dangerPlayer}`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: opponentId,
    importance: 'medium',
  };
}

function generateMilestones(state: GameState, players: Player[]): NewsItem[] {
  const news: NewsItem[] = [];

  for (const p of players) {
    // Geburtstag
    const dob = p.dateOfBirth;
    if (dob.slice(5) === state.currentDate.slice(5)) {
      const age = getAge(dob, state.currentDate);
      news.push({
        id: `birthday-${p.id}-${state.currentDate}`,
        type: 'milestone',
        title: `Geburtstag: ${p.firstName} ${p.lastName} wird ${age}!`,
        content: `Herzlichen Glückwunsch! ${p.firstName} ${p.lastName} feiert heute seinen ${age}. Geburtstag.`,
        date: state.currentDate,
        isRead: false,
        relatedPlayerId: p.id,
        importance: 'low',
      });
    }

    // Jubiläen (50, 100, 150, 200, 250, 300 Spiele)
    const milestoneApps = [50, 100, 150, 200, 250, 300];
    if (milestoneApps.includes(p.stats.appearances)) {
      news.push({
        id: `milestone-${p.id}-${p.stats.appearances}`,
        type: 'milestone',
        title: `${p.stats.appearances} Spiele: ${p.firstName} ${p.lastName}`,
        content: `${p.firstName} ${p.lastName} hat die Marke von ${p.stats.appearances} Pflichtspielen erreicht. Eine beeindruckende Leistung!`,
        date: state.currentDate,
        isRead: false,
        relatedPlayerId: p.id,
        importance: 'medium',
      });
    }
  }

  return news;
}

function generateInjuryUpdates(state: GameState, players: Player[]): NewsItem[] {
  const news: NewsItem[] = [];

  for (const p of players) {
    if (!p.injury) continue;

    // Rückkehr morgen
    if (p.injury.daysRemaining === 1) {
      news.push({
        id: `injury-return-${p.id}-${state.currentDate}`,
        type: 'injury',
        title: `Comeback: ${p.firstName} ${p.lastName} kehrt zurück!`,
        content: `Gute Nachrichten! ${p.firstName} ${p.lastName} steht ab morgen wieder zur Verfügung.`,
        date: state.currentDate,
        isRead: false,
        relatedPlayerId: p.id,
        importance: 'medium',
      });
    }

    // Halbzeit der Verletzung
    if (p.injury.totalDays > 7 && p.injury.daysRemaining === Math.floor(p.injury.totalDays / 2)) {
      news.push({
        id: `injury-update-${p.id}-${state.currentDate}`,
        type: 'injury',
        title: `Verletzungs-Update: ${p.firstName} ${p.lastName}`,
        content: `${p.firstName} ${p.lastName} macht Fortschritte in der Reha. Noch ${p.injury.daysRemaining} Tage bis zur Rückkehr.`,
        date: state.currentDate,
        isRead: false,
        relatedPlayerId: p.id,
        importance: 'low',
      });
    }
  }

  return news;
}

function generateContractWarnings(state: GameState, players: Player[]): NewsItem[] {
  const news: NewsItem[] = [];
  const currentYear = parseInt(state.currentDate.slice(0, 4));

  for (const p of players) {
    const contractYear = parseInt(p.contractUntil.slice(0, 4));
    const monthsLeft = (contractYear - currentYear) * 12 +
      (parseInt(p.contractUntil.slice(5, 7)) - parseInt(state.currentDate.slice(5, 7)));

    if (monthsLeft <= 6 && monthsLeft > 0) {
      news.push({
        id: `contract-warn-${p.id}-${state.currentDate}`,
        type: 'contract',
        title: `Vertrag läuft aus: ${p.firstName} ${p.lastName}`,
        content: `Der Vertrag von ${p.firstName} ${p.lastName} endet am ${p.contractUntil}. ` +
          `Nur noch ${monthsLeft} Monate! Eine Verlängerung oder ein Transfer sollte in Betracht gezogen werden.`,
        date: state.currentDate,
        isRead: false,
        relatedPlayerId: p.id,
        importance: monthsLeft <= 3 ? 'high' : 'medium',
      });
    }
  }

  return news;
}

function generateRandomEvent(
  state: GameState,
  players: Player[],
  rng: () => number
): { news: NewsItem[]; moralChanges: { playerId: string; delta: number }[] } | null {
  const events = getRandomEventPool(state, players);
  if (events.length === 0) return null;

  const idx = Math.floor(rng() * events.length);
  return events[idx];
}

function getRandomEventPool(
  state: GameState,
  players: Player[]
): { news: NewsItem[]; moralChanges: { playerId: string; delta: number }[] }[] {
  const pool: { news: NewsItem[]; moralChanges: { playerId: string; delta: number }[] }[] = [];
  const healthyPlayers = players.filter((p) => !p.injury);

  if (healthyPlayers.length === 0) return pool;

  // ── Trainingsleistung (positiv) ──
  const starPlayer = healthyPlayers[Math.floor(Math.random() * healthyPlayers.length)];
  pool.push({
    news: [{
      id: `event-training-star-${state.currentDate}`,
      type: 'general',
      title: `Starke Trainingsleistung: ${starPlayer.firstName} ${starPlayer.lastName}`,
      content: `${starPlayer.firstName} ${starPlayer.lastName} zeigt sich im Training in hervorragender Verfassung und hebt das Niveau der gesamten Mannschaft.`,
      date: state.currentDate,
      isRead: false,
      relatedPlayerId: starPlayer.id,
      importance: 'low',
    }],
    moralChanges: [{ playerId: starPlayer.id, delta: 3 }],
  });

  // ── Spieler unzufrieden (wenig Einsatzzeit) ──
  const benchPlayers = healthyPlayers.filter((p) => p.stats.appearances < 3 && p.morale < 50);
  if (benchPlayers.length > 0) {
    const unhappy = benchPlayers[Math.floor(Math.random() * benchPlayers.length)];
    pool.push({
      news: [{
        id: `event-unhappy-${state.currentDate}`,
        type: 'general',
        title: `Unzufriedenheit: ${unhappy.firstName} ${unhappy.lastName}`,
        content: `${unhappy.firstName} ${unhappy.lastName} ist unzufrieden mit seiner Einsatzzeit und hat sich beim Trainerteam beschwert.`,
        date: state.currentDate,
        isRead: false,
        relatedPlayerId: unhappy.id,
        importance: 'medium',
      }],
      moralChanges: [{ playerId: unhappy.id, delta: -5 }],
    });
  }

  // ── Teamgeist hoch (nach Siegesserie) ──
  const form = getTeamForm(state);
  const recentWins = form.slice(-3).filter((f) => f === 'W').length;
  if (recentWins >= 3) {
    pool.push({
      news: [{
        id: `event-team-spirit-${state.currentDate}`,
        type: 'general',
        title: 'Teamgeist: Mannschaft in Hochstimmung!',
        content: 'Die Siegesserie wirkt sich positiv auf die Stimmung in der Kabine aus. Die gesamte Mannschaft ist hoch motiviert.',
        date: state.currentDate,
        isRead: false,
        importance: 'low',
      }],
      moralChanges: healthyPlayers.slice(0, 5).map((p) => ({ playerId: p.id, delta: 2 })),
    });
  }

  // ── Negative Stimmung (nach Niederlagenserie) ──
  const recentLosses = form.slice(-3).filter((f) => f === 'L').length;
  if (recentLosses >= 3) {
    pool.push({
      news: [{
        id: `event-low-morale-${state.currentDate}`,
        type: 'general',
        title: 'Krisenstimmung in der Kabine',
        content: 'Die Niederlagenserie hinterlässt Spuren. Einige Spieler zeigen sich verunsichert im Training.',
        date: state.currentDate,
        isRead: false,
        importance: 'medium',
      }],
      moralChanges: healthyPlayers.slice(0, 5).map((p) => ({ playerId: p.id, delta: -3 })),
    });
  }

  // ── Jugendtalent glänzt im Training ──
  const youngPlayers = healthyPlayers.filter((p) => getAge(p.dateOfBirth, state.currentDate) <= 21);
  if (youngPlayers.length > 0) {
    const talent = youngPlayers[Math.floor(Math.random() * youngPlayers.length)];
    pool.push({
      news: [{
        id: `event-youth-shine-${state.currentDate}`,
        type: 'youth',
        title: `Talent überzeugt: ${talent.firstName} ${talent.lastName}`,
        content: `Der junge ${talent.firstName} ${talent.lastName} (${getAge(talent.dateOfBirth, state.currentDate)}) hat im Training mit starken Leistungen auf sich aufmerksam gemacht.`,
        date: state.currentDate,
        isRead: false,
        relatedPlayerId: talent.id,
        importance: 'low',
      }],
      moralChanges: [{ playerId: talent.id, delta: 4 }],
    });
  }

  // ── Erfahrener Spieler als Mentor ──
  const veterans = healthyPlayers.filter((p) => getAge(p.dateOfBirth, state.currentDate) >= 30 && p.stats.appearances >= 10);
  if (veterans.length > 0 && youngPlayers.length > 0) {
    const vet = veterans[Math.floor(Math.random() * veterans.length)];
    const mentee = youngPlayers[Math.floor(Math.random() * youngPlayers.length)];
    pool.push({
      news: [{
        id: `event-mentor-${state.currentDate}`,
        type: 'general',
        title: `Mentor-Rolle: ${vet.lastName} nimmt ${mentee.lastName} unter seine Fittiche`,
        content: `Routinier ${vet.firstName} ${vet.lastName} unterstützt den jungen ${mentee.firstName} ${mentee.lastName} auf und neben dem Platz. ` +
          `Eine wertvolle Entwicklung für die Mannschaft.`,
        date: state.currentDate,
        isRead: false,
        importance: 'low',
      }],
      moralChanges: [
        { playerId: vet.id, delta: 2 },
        { playerId: mentee.id, delta: 3 },
      ],
    });
  }

  // ── Trainingsunfall (leicht) ──
  pool.push({
    news: [{
      id: `event-minor-knock-${state.currentDate}`,
      type: 'general',
      title: 'Leichter Trainingsrückschlag',
      content: 'Ein Spieler hat sich im Training einen leichten Schlag zugezogen, konnte das Training aber fortsetzen. Keine weiteren Ausfälle.',
      date: state.currentDate,
      isRead: false,
      importance: 'low',
    }],
    moralChanges: [],
  });

  // ── Gute Stimmung: Gemeinsames Teamessen ──
  pool.push({
    news: [{
      id: `event-team-dinner-${state.currentDate}`,
      type: 'general',
      title: 'Teambuilding: Gemeinsames Abendessen',
      content: 'Die Mannschaft hat sich zu einem gemeinsamen Abendessen getroffen. Die Teamchemie stimmt!',
      date: state.currentDate,
      isRead: false,
      importance: 'low',
    }],
    moralChanges: healthyPlayers.slice(0, 8).map((p) => ({ playerId: p.id, delta: 1 })),
  });

  return pool;
}

function generateBoardMessage(state: GameState): NewsItem | null {
  const team = state.teams.find((t) => t.id === state.currentTeamId);
  if (!team) return null;

  const position = getTeamPosition(state);
  const expected = team.boardExpectations.leaguePosition;
  const diff = position - expected;

  // Only generate if significantly above/below expectations
  if (diff >= 4) {
    return {
      id: `board-warning-${state.currentDate}`,
      type: 'board',
      title: 'Vorstand: Unzufriedenheit mit Tabellenplatz',
      content: `Der Vorstand zeigt sich besorgt über die aktuelle Tabellenposition (Platz ${position}). ` +
        `Die Erwartung war mindestens Platz ${expected}. Die Leistungen müssen sich dringend verbessern.`,
      date: state.currentDate,
      isRead: false,
      importance: 'high',
    };
  }

  if (diff <= -5) {
    return {
      id: `board-praise-${state.currentDate}`,
      type: 'board',
      title: 'Vorstand: Lob für starke Saison',
      content: `Der Vorstand ist begeistert von der aktuellen Tabellenposition (Platz ${position}). ` +
        `Die Mannschaft übertrifft alle Erwartungen deutlich!`,
      date: state.currentDate,
      isRead: false,
      importance: 'medium',
    };
  }

  return null;
}

function generateFanMood(state: GameState): NewsItem | null {
  const form = getTeamForm(state);
  if (form.length < 3) return null;

  const last5 = form.slice(-5);
  const wins = last5.filter((f) => f === 'W').length;
  const losses = last5.filter((f) => f === 'L').length;

  if (wins >= 4) {
    return {
      id: `fan-mood-${state.currentDate}`,
      type: 'general',
      title: 'Fans: Euphorie auf den Rängen!',
      content: 'Die fantastische Siegesserie hat die Fans in Ekstase versetzt. Im Stadion herrscht beste Stimmung, der Zuschauerschnitt steigt.',
      date: state.currentDate,
      isRead: false,
      importance: 'low',
    };
  }

  if (losses >= 4) {
    return {
      id: `fan-mood-${state.currentDate}`,
      type: 'general',
      title: 'Fans: Unmut wächst',
      content: 'Die anhaltende Negativserie sorgt für Frust bei den Anhängern. Erste Pfiffe waren im Training zu hören.',
      date: state.currentDate,
      isRead: false,
      importance: 'medium',
    };
  }

  return null;
}

function generateLeagueGossip(state: GameState, rng: () => number): NewsItem | null {
  const team = state.teams.find((t) => t.id === state.currentTeamId);
  if (!team) return null;

  const table = state.tables[team.league];
  if (!table || table.length < 3) return null;

  const leaderEntry = table[0];
  if (!leaderEntry || leaderEntry.teamId === state.currentTeamId) return null;

  // Don't generate league gossip before the season has started (no matches played)
  if (leaderEntry.played === 0 || state.season.currentMatchday < 1) return null;

  const leader = state.teams.find((t) => t.id === leaderEntry.teamId);
  if (!leader) return null;

  const templates = [
    {
      title: `${leader.name} weiterhin an der Spitze`,
      content: `${leader.name} führt die Tabelle mit ${leaderEntry.points} Punkten an. ${leaderEntry.won} Siege, ${leaderEntry.drawn} Unentschieden, ${leaderEntry.lost} Niederlagen.`,
    },
    {
      title: `Liga-Überblick: Spannende Saison`,
      content: `An der Tabellenspitze steht ${leader.name} mit ${leaderEntry.points} Punkten. Der Vorsprung beträgt ${leaderEntry.points - (table[1]?.points ?? 0)} Punkte auf den Zweiten.`,
    },
  ];

  const tmpl = templates[Math.floor(rng() * templates.length)];

  return {
    id: `league-gossip-${state.currentDate}`,
    type: 'general',
    title: tmpl.title,
    content: tmpl.content,
    date: state.currentDate,
    isRead: false,
    importance: 'low',
  };
}

// ─── Form, Fitness & Scorer Generators ───

function generateFormHighlights(state: GameState, players: Player[]): NewsItem[] {
  const news: NewsItem[] = [];
  const healthy = players.filter(p => !p.injury);
  if (healthy.length < 3) return news;

  // Best form player
  const sorted = [...healthy].sort((a, b) => b.form - a.form);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best && best.form >= 75) {
    news.push({
      id: `form-best-${state.currentDate}`,
      type: 'general',
      title: `Topform: ${best.firstName} ${best.lastName}`,
      content: `${best.firstName} ${best.lastName} (${best.position}) ist aktuell in herausragender Form (${best.form}%). ` +
        `Er zeigt im Training konstant starke Leistungen und sollte unbedingt in der Startelf stehen.`,
      date: state.currentDate,
      isRead: false,
      relatedPlayerId: best.id,
      importance: 'low',
    });
  }

  if (worst && worst.form <= 40 && worst.stats.appearances >= 3) {
    news.push({
      id: `form-worst-${state.currentDate}`,
      type: 'general',
      title: `Formtief: ${worst.firstName} ${worst.lastName}`,
      content: `${worst.firstName} ${worst.lastName} (${worst.position}) steckt in einem Formtief (${worst.form}%). ` +
        `Eine Pause auf der Bank könnte ihm guttun.`,
      date: state.currentDate,
      isRead: false,
      relatedPlayerId: worst.id,
      importance: 'medium',
    });
  }

  // High morale player
  const happiest = [...healthy].sort((a, b) => (b.morale ?? 70) - (a.morale ?? 70))[0];
  if (happiest && (happiest.morale ?? 70) >= 90) {
    news.push({
      id: `morale-high-${state.currentDate}`,
      type: 'general',
      title: `Bestens gelaunt: ${happiest.firstName} ${happiest.lastName}`,
      content: `${happiest.firstName} ${happiest.lastName} strahlt im Training und reißt seine Mitspieler mit. Moral: ${happiest.morale}%.`,
      date: state.currentDate,
      isRead: false,
      relatedPlayerId: happiest.id,
      importance: 'low',
    });
  }

  return news;
}

function generateFitnessWarnings(state: GameState, players: Player[]): NewsItem[] {
  const news: NewsItem[] = [];
  const lowCondition = players.filter(p => !p.injury && p.condition < 60);

  if (lowCondition.length === 0) return news;

  // Group warning
  const names = lowCondition
    .sort((a, b) => a.condition - b.condition)
    .slice(0, 5)
    .map(p => `${p.lastName} (${p.position}, ${p.condition}%)`);

  news.push({
    id: `fitness-warn-${state.currentDate}`,
    type: 'general',
    title: `Fitness-Warnung: ${lowCondition.length} Spieler nicht bei 100%`,
    content: `Folgende Spieler haben eine niedrige Fitness und könnten im nächsten Spiel Probleme bekommen:\n${names.join('\n')}`,
    date: state.currentDate,
    isRead: false,
    importance: lowCondition.length >= 3 ? 'high' : 'medium',
  });

  return news;
}

function generateScorerUpdate(state: GameState, players: Player[]): NewsItem | null {
  const scorers = players
    .filter(p => p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals);

  if (scorers.length === 0) return null;

  const top = scorers[0];
  const topAssist = [...players]
    .filter(p => p.stats.assists > 0)
    .sort((a, b) => b.stats.assists - a.stats.assists)[0];

  const lines: string[] = [];
  lines.push(`Vereins-Torjäger: ${top.firstName} ${top.lastName} (${top.position}) — ${top.stats.goals} Tore in ${top.stats.appearances} Spielen`);

  if (scorers.length > 1) {
    const others = scorers.slice(1, 4).map(p => `${p.lastName}: ${p.stats.goals}`);
    lines.push(`Weitere Torschützen: ${others.join(', ')}`);
  }

  if (topAssist) {
    lines.push(`Bester Vorlagengeber: ${topAssist.firstName} ${topAssist.lastName} — ${topAssist.stats.assists} Assists`);
  }

  return {
    id: `scorer-update-${state.currentDate}`,
    type: 'milestone',
    title: `Torjäger-Ranking: ${top.lastName} führt mit ${top.stats.goals} Toren`,
    content: lines.join('\n'),
    date: state.currentDate,
    isRead: false,
    relatedPlayerId: top.id,
    importance: 'low',
  };
}

// ─── Press Conference Generator ───

function generatePreMatchPressConference(state: GameState, match: Match): PressConference | null {
  const isHome = match.homeTeamId === state.currentTeamId;
  const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
  const opponent = state.teams.find((t) => t.id === opponentId);
  if (!opponent) return null;

  const form = getTeamForm(state);
  const position = getTeamPosition(state);
  const questions: PressQuestion[] = [];

  // Q1: Always ask about the upcoming match
  questions.push({
    id: `pk-q1-${match.id}`,
    question: `Wie schätzen Sie die Chancen gegen ${opponent.name} ein?`,
    context: 'pre_match',
    options: [
      { text: 'Wir sind klarer Favorit und wollen das auch zeigen.', tone: 'confident', moraleEffect: 5, reputationEffect: -1, fanEffect: 3, fineRisk: false },
      { text: 'Es wird ein hartes Spiel, aber wir sind bereit.', tone: 'honest', moraleEffect: 3, reputationEffect: 1, fanEffect: 1, fineRisk: false },
      { text: 'Wir müssen vor allem auf uns schauen und unsere Leistung bringen.', tone: 'defensive', moraleEffect: 1, reputationEffect: 0, fanEffect: 0, fineRisk: false },
      { text: 'Wenn wir so weiterspielen, werden wir jeden Gegner schlagen.', tone: 'provocative', moraleEffect: 7, reputationEffect: -3, fanEffect: 5, fineRisk: true },
    ],
  });

  // Q2: Context-based (form or table position)
  const recentLosses = form.slice(-3).filter((f) => f === 'L').length;
  const recentWins = form.slice(-3).filter((f) => f === 'W').length;

  if (recentLosses >= 2) {
    questions.push({
      id: `pk-q2-${match.id}`,
      question: 'Die letzten Ergebnisse waren enttäuschend. Was unternehmen Sie dagegen?',
      context: 'pre_match',
      options: [
        { text: 'Wir haben intensiv gearbeitet und werden stärker zurückkommen.', tone: 'motivating', moraleEffect: 5, reputationEffect: 2, fanEffect: 2, fineRisk: false },
        { text: 'Es läuft nicht optimal, aber Panik ist der falsche Berater.', tone: 'honest', moraleEffect: 2, reputationEffect: 1, fanEffect: 0, fineRisk: false },
        { text: 'Die Kritik ist berechtigt. Wir müssen uns deutlich steigern.', tone: 'defensive', moraleEffect: -2, reputationEffect: 3, fanEffect: -1, fineRisk: false },
        { text: 'Ich lasse mir von der Presse nicht vorschreiben, wie ich arbeite.', tone: 'provocative', moraleEffect: 3, reputationEffect: -4, fanEffect: -2, fineRisk: true },
      ],
    });
  } else if (recentWins >= 2) {
    questions.push({
      id: `pk-q2-${match.id}`,
      question: 'Die Mannschaft ist in bestechender Form. Wie hoch sind Ihre Ambitionen?',
      context: 'pre_match',
      options: [
        { text: 'Wir nehmen Spiel für Spiel, mehr nicht.', tone: 'honest', moraleEffect: 2, reputationEffect: 2, fanEffect: 1, fineRisk: false },
        { text: 'Wir greifen ganz oben an — warum nicht?', tone: 'confident', moraleEffect: 6, reputationEffect: 0, fanEffect: 5, fineRisk: false },
        { text: 'Die Jungs geben alles im Training, das sieht man auf dem Platz.', tone: 'motivating', moraleEffect: 4, reputationEffect: 1, fanEffect: 2, fineRisk: false },
        { text: 'Wir sind die beste Mannschaft der Liga, das ist Fakt.', tone: 'provocative', moraleEffect: 8, reputationEffect: -5, fanEffect: 4, fineRisk: true },
      ],
    });
  } else {
    questions.push({
      id: `pk-q2-${match.id}`,
      question: `Wie bewerten Sie den bisherigen Saisonverlauf auf Platz ${position}?`,
      context: 'pre_match',
      options: [
        { text: 'Da ist noch Luft nach oben, aber die Richtung stimmt.', tone: 'honest', moraleEffect: 2, reputationEffect: 2, fanEffect: 1, fineRisk: false },
        { text: 'Wir haben großes Potenzial und werden es bald abrufen.', tone: 'confident', moraleEffect: 4, reputationEffect: 0, fanEffect: 2, fineRisk: false },
        { text: 'Ich bin zufrieden mit der Entwicklung der Mannschaft.', tone: 'defensive', moraleEffect: 1, reputationEffect: 1, fanEffect: 0, fineRisk: false },
        { text: 'Die Mannschaft kann alles schaffen, wenn sie will.', tone: 'motivating', moraleEffect: 5, reputationEffect: 1, fanEffect: 3, fineRisk: false },
      ],
    });
  }

  // Q3: Opponent-specific or general tactical question
  const isRival = state.teams.find((t) => t.id === state.currentTeamId)?.rivals.includes(opponentId);
  if (isRival) {
    questions.push({
      id: `pk-q3-${match.id}`,
      question: `Das Derby gegen ${opponent.name} steht an. Was bedeutet dieses Spiel für Sie?`,
      context: 'pre_match',
      options: [
        { text: 'Derbys sind immer besonders — die Fans verdienen einen Sieg.', tone: 'motivating', moraleEffect: 6, reputationEffect: 1, fanEffect: 5, fineRisk: false },
        { text: 'Es sind drei Punkte, wie in jedem anderen Spiel auch.', tone: 'honest', moraleEffect: 0, reputationEffect: 2, fanEffect: -2, fineRisk: false },
        { text: 'Wir werden ihnen zeigen, wer in dieser Stadt der Boss ist.', tone: 'provocative', moraleEffect: 8, reputationEffect: -5, fanEffect: 8, fineRisk: true },
        { text: 'Ich respektiere den Gegner, aber wir wollen gewinnen.', tone: 'confident', moraleEffect: 3, reputationEffect: 2, fanEffect: 2, fineRisk: false },
      ],
    });
  } else {
    questions.push({
      id: `pk-q3-${match.id}`,
      question: 'Haben Sie taktisch etwas Besonderes für morgen geplant?',
      context: 'pre_match',
      options: [
        { text: 'Wir haben den Gegner genau analysiert und einen Plan.', tone: 'confident', moraleEffect: 3, reputationEffect: 2, fanEffect: 1, fineRisk: false },
        { text: 'Über Taktik spreche ich nicht öffentlich.', tone: 'defensive', moraleEffect: 0, reputationEffect: 0, fanEffect: -1, fineRisk: false },
        { text: 'Wir spielen unser Spiel — das hat bisher gut funktioniert.', tone: 'honest', moraleEffect: 2, reputationEffect: 1, fanEffect: 1, fineRisk: false },
        { text: 'Die Jungs brennen auf das Spiel, Taktik ist zweitrangig.', tone: 'motivating', moraleEffect: 5, reputationEffect: -1, fanEffect: 3, fineRisk: false },
      ],
    });
  }

  return {
    id: `pk-${match.id}-${state.currentDate}`,
    date: state.currentDate,
    type: 'pre_match',
    matchId: match.id,
    questions,
    answers: [],
    isCompleted: false,
  };
}

// ─── Random Manager Events (with splash screen + decisions) ───

import { RandomEvent, RandomEventOption } from '@/types/game';

const RANDOM_EVENT_POOL: Omit<RandomEvent, 'id' | 'date' | 'isResolved' | 'chosenOptionId'>[] = [
  {
    title: 'Rockkonzert in der Stadt',
    description: 'Ein großes Rockkonzert findet am Spieltag-Wochenende in der Stadt statt. Viele Fans könnten stattdessen zum Konzert gehen.',
    icon: '🎸',
    category: 'city',
    options: [
      { id: 'ignore', text: 'Ignorieren — die echten Fans kommen trotzdem', effects: { attendanceModifier: 0.85 } },
      { id: 'promo', text: 'Sonderaktion: Vergünstigte Tickets anbieten (-50.000€)', effects: { budgetChange: -50000, attendanceModifier: 0.95, fanLoyalty: 3 } },
      { id: 'collab', text: 'Kooperation mit dem Veranstalter: Halftime-Show', effects: { budgetChange: -20000, attendanceModifier: 1.05, fanLoyalty: 5, reputation: 2 } },
    ],
  },
  {
    title: 'Anonyme Großspende',
    description: 'Ein anonymer Spender bietet dem Verein 500.000€ an — allerdings unter der Bedingung, dass der Verein einen umstrittenen Sponsor akzeptiert.',
    icon: '💰',
    category: 'sponsor',
    options: [
      { id: 'accept', text: 'Spende annehmen — Geld ist Geld', effects: { budgetChange: 500000, fanLoyalty: -8, reputation: -3 } },
      { id: 'reject', text: 'Ablehnen — unsere Werte sind wichtiger', effects: { fanLoyalty: 5, reputation: 3, moraleAll: 3 } },
      { id: 'negotiate', text: 'Verhandeln: Spende ohne Sponsor-Bedingung (200.000€)', effects: { budgetChange: 200000, fanLoyalty: 2, reputation: 1 } },
    ],
  },
  {
    title: 'Fan-Protest vor dem Stadion',
    description: 'Eine Gruppe von Ultras protestiert gegen die aktuelle sportliche Leitung. Sie drohen mit einem Boykott des nächsten Heimspiels.',
    icon: '📢',
    category: 'fan',
    options: [
      { id: 'dialog', text: 'Dialog suchen — Treffen mit den Fanvertretern', effects: { fanLoyalty: 4, moraleAll: -2, attendanceModifier: 0.95 } },
      { id: 'ignore', text: 'Ignorieren — wir lassen uns nicht erpressen', effects: { fanLoyalty: -6, attendanceModifier: 0.8, reputation: 1 } },
      { id: 'concede', text: 'Zugeständnisse machen — günstigere Dauerkarten', effects: { budgetChange: -80000, fanLoyalty: 8, attendanceModifier: 1.1 } },
    ],
  },
  {
    title: 'Medienskandal',
    description: 'Ein Boulevardblatt veröffentlicht Gerüchte über interne Streitigkeiten in der Kabine. Die Mannschaft ist verunsichert.',
    icon: '📰',
    category: 'media',
    options: [
      { id: 'deny', text: 'Öffentlich dementieren — alles Unsinn', effects: { moraleAll: 2, reputation: -1 } },
      { id: 'address', text: 'Mannschaftssitzung einberufen — Luft reinigen', effects: { moraleAll: 5, reputation: 1 } },
      { id: 'sue', text: 'Rechtliche Schritte einleiten (-30.000€)', effects: { budgetChange: -30000, moraleAll: 3, reputation: 3 } },
    ],
  },
  {
    title: 'Jugendturnier-Einladung',
    description: 'Euer Verein wird zu einem prestigeträchtigen Jugendturnier eingeladen. Die Teilnahme kostet 40.000€, könnte aber Talente anlocken.',
    icon: '🏆',
    category: 'internal',
    options: [
      { id: 'participate', text: 'Teilnehmen — Investition in die Zukunft', effects: { budgetChange: -40000, reputation: 4, fanLoyalty: 2 } },
      { id: 'decline', text: 'Absagen — das Budget ist knapp', effects: { reputation: -3, fanLoyalty: -2, moraleAll: -1 } },
    ],
  },
  {
    title: 'Unwetterwarnung',
    description: 'Für das Wochenende ist ein schweres Unwetter angekündigt. Das Spielfeld könnte beschädigt werden.',
    icon: '⛈️',
    category: 'weather',
    options: [
      { id: 'prepare', text: 'Rasen schützen lassen (-25.000€)', effects: { budgetChange: -25000, moraleAll: 2, fanLoyalty: 2 } },
      { id: 'risk', text: 'Abwarten — vielleicht zieht es vorbei', effects: { attendanceModifier: 0.75, moraleAll: -2 } },
      { id: 'indoor', text: 'Training in die Halle verlegen', effects: { moraleAll: -3, fanLoyalty: -1 } },
    ],
  },
  {
    title: 'Sponsoren-Gala',
    description: 'Ein potenzieller Großsponsor lädt zu einer exklusiven Gala ein. Deine Anwesenheit könnte einen lukrativen Deal einbringen.',
    icon: '🥂',
    category: 'sponsor',
    options: [
      { id: 'attend', text: 'Hingehen — Networking ist wichtig', effects: { budgetChange: 150000, reputation: 2, moraleAll: -1 } },
      { id: 'skip', text: 'Absagen — ich konzentriere mich aufs Team', effects: { moraleAll: 3, reputation: -1 } },
      { id: 'send_captain', text: 'Kapitän als Vertreter schicken', effects: { budgetChange: 75000, reputation: 1, moraleAll: -2 } },
    ],
  },
  {
    title: 'Charity-Anfrage',
    description: 'Eine lokale Kinderhilfsorganisation bittet um ein Benefizspiel. Es würde einen Trainingstag kosten.',
    icon: '❤️',
    category: 'city',
    options: [
      { id: 'accept', text: 'Zusagen — soziales Engagement ist wichtig', effects: { fanLoyalty: 6, reputation: 5, moraleAll: 4 } },
      { id: 'decline', text: 'Leider keine Zeit — der Spielplan ist zu eng', effects: { reputation: -2, fanLoyalty: -2 } },
      { id: 'donate', text: 'Kein Spiel, aber 30.000€ Spende', effects: { budgetChange: -30000, reputation: 3, fanLoyalty: 3 } },
    ],
  },
  {
    title: 'Spieler in der Presse',
    description: 'Ein Spieler hat in einem Interview kritische Aussagen über die Taktik gemacht. Die Medien greifen es groß auf.',
    icon: '🎤',
    category: 'media',
    options: [
      { id: 'fine', text: 'Geldstrafe für den Spieler — Disziplin muss sein', effects: { moraleAll: -3, reputation: 2 } },
      { id: 'talk', text: 'Vier-Augen-Gespräch — intern klären', effects: { moraleAll: 1, reputation: 1 } },
      { id: 'public', text: 'Öffentlich Stellung beziehen — Kritik ist willkommen', effects: { moraleAll: 2, fanLoyalty: 2, reputation: -1 } },
    ],
  },
  {
    title: 'Stadion-Renovierung nötig',
    description: 'Die Sicherheitsbehörde hat Mängel an den Flutlichtmasten festgestellt. Eine Reparatur ist dringend erforderlich.',
    icon: '🔧',
    category: 'internal',
    options: [
      { id: 'full', text: 'Komplettrenovierung (-120.000€) — langfristig sicher', effects: { budgetChange: -120000, fanLoyalty: 3, reputation: 2 } },
      { id: 'minimal', text: 'Minimalreparatur (-40.000€) — reicht erstmal', effects: { budgetChange: -40000, fanLoyalty: -1, attendanceModifier: 0.95 } },
      { id: 'delay', text: 'Aufschieben — nächsten Monat kümmern wir uns drum', effects: { fanLoyalty: -3, reputation: -2, attendanceModifier: 0.9 } },
    ],
  },
];

/**
 * Generate a random manager event (with splash screen + decisions).
 * Called ~10% chance per day from day-advance.
 */
export function generateRandomManagerEvent(state: GameState): RandomEvent | null {
  const rng = seededRandom(state.currentDate + 'rnd-event');
  // 10% chance per day, but not on match days or before season starts
  if (rng() > 0.10) return null;
  if (state.season.currentMatchday < 1) return null;

  // Don't generate if there's already an unresolved event
  if (state.randomEvents?.some(e => !e.isResolved)) return null;

  const idx = Math.floor(rng() * RANDOM_EVENT_POOL.length);
  const template = RANDOM_EVENT_POOL[idx];

  return {
    ...template,
    id: `rnd-${state.currentDate}-${idx}`,
    date: state.currentDate,
    isResolved: false,
  };
}
