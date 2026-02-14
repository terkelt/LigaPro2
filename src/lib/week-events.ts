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

  // ── 9. Pressekonferenz generieren (1 Tag vor Spiel) ──
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
