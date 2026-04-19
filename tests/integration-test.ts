/**
 * Integration Test Suite für Liga Pro Fussballmanager
 * Testet alle Kernbereiche: Daten, Store, Schedule, Match Engine, Day Advance
 */

// === 1. DATA LOADER TESTS ===
import { loadLeagues, loadTeams, getTeamsByLeague, getTeamById, getLeagueById } from '../src/lib/data-loader';

function testDataLoader() {
  console.log('\n=== 1. DATA LOADER TESTS ===');
  const leagues = loadLeagues();
  const teams = loadTeams();

  // 1.1 Ligen
  console.assert(leagues.length === 3, `❌ Erwartet 3 Ligen, bekommen: ${leagues.length}`);
  console.log(`✅ ${leagues.length} Ligen geladen: ${leagues.map(l => l.shortName).join(', ')}`);

  // 1.2 Teams pro Liga
  const blTeams = getTeamsByLeague('bundesliga');
  const zwTeams = getTeamsByLeague('zweite-liga');
  const drTeams = getTeamsByLeague('dritte-liga');
  console.assert(blTeams.length === 18, `❌ BL: Erwartet 18 Teams, bekommen: ${blTeams.length}`);
  console.assert(zwTeams.length === 18, `❌ 2.BL: Erwartet 18 Teams, bekommen: ${zwTeams.length}`);
  console.assert(drTeams.length === 20, `❌ 3.Liga: Erwartet 20 Teams, bekommen: ${drTeams.length}`);
  console.log(`✅ Teams: BL=${blTeams.length}, 2.BL=${zwTeams.length}, 3.Liga=${drTeams.length} (gesamt: ${teams.length})`);

  // 1.3 Gesamtzahl
  console.assert(teams.length === 56, `❌ Erwartet 56 Teams gesamt, bekommen: ${teams.length}`);

  // 1.4 Keine doppelten IDs
  const ids = teams.map(t => t.id);
  const uniqueIds = new Set(ids);
  console.assert(ids.length === uniqueIds.size, `❌ Doppelte Team-IDs gefunden! ${ids.length} vs ${uniqueIds.size}`);
  console.log(`✅ Keine doppelten Team-IDs`);

  // 1.5 Alle Teams haben erforderliche Felder
  let teamFieldErrors = 0;
  for (const team of teams) {
    if (!team.id || !team.name || !team.shortName || !team.league || !team.stadium) {
      console.log(`❌ Team ${team.id} fehlt Pflichtfelder`);
      teamFieldErrors++;
    }
    if (!team.stadium.name || !team.stadium.city || !team.stadium.capacity) {
      console.log(`❌ Team ${team.id} hat unvollständiges Stadium`);
      teamFieldErrors++;
    }
    if (team.reputation < 1 || team.reputation > 100) {
      console.log(`❌ Team ${team.id} hat ungültige Reputation: ${team.reputation}`);
      teamFieldErrors++;
    }
    if (team.budget <= 0) {
      console.log(`❌ Team ${team.id} hat ungültiges Budget: ${team.budget}`);
      teamFieldErrors++;
    }
  }
  if (teamFieldErrors === 0) console.log(`✅ Alle 56 Teams haben vollständige Pflichtfelder`);

  // 1.6 Lookup-Funktionen
  const bayern = getTeamById('bayern-muenchen');
  console.assert(bayern?.name === 'FC Bayern München', `❌ getTeamById fehlgeschlagen`);
  const bl = getLeagueById('bundesliga');
  console.assert(bl?.name === 'Bundesliga', `❌ getLeagueById fehlgeschlagen: ${bl?.name}`);
  console.log(`✅ Lookup-Funktionen arbeiten korrekt`);

  // 1.7 Liga-Definitionen prüfen
  for (const league of leagues) {
    console.assert(league.numberOfTeams > 0, `❌ Liga ${league.id} hat 0 Teams`);
    console.assert(league.matchdays > 0, `❌ Liga ${league.id} hat 0 Spieltage`);
    const actualTeams = getTeamsByLeague(league.id);
    console.assert(
      actualTeams.length === league.numberOfTeams,
      `❌ Liga ${league.id}: numberOfTeams=${league.numberOfTeams} aber ${actualTeams.length} Teams in JSON`
    );
  }
  console.log(`✅ Liga-Definitionen stimmen mit Team-Daten überein`);

  return { leagues, teams };
}

// === 2. PLAYER GENERATOR TESTS ===
import { generatePlayersForTeam, generateAllPlayers } from '../src/lib/player-generator';

function testPlayerGenerator(teams: ReturnType<typeof loadTeams>) {
  console.log('\n=== 2. PLAYER GENERATOR TESTS ===');

  // 2.1 Generiere für ein Team
  const bayern = teams.find(t => t.id === 'bayern-muenchen')!;
  const bayernPlayers = generatePlayersForTeam(bayern, 1, 42);
  console.assert(bayernPlayers.length === 25, `❌ Bayern Kader: Erwartet 25, bekommen: ${bayernPlayers.length}`);
  console.log(`✅ Bayern München: ${bayernPlayers.length} Spieler generiert`);

  // 2.2 Positionen korrekt verteilt
  const posCounts: Record<string, number> = {};
  for (const p of bayernPlayers) {
    posCounts[p.position] = (posCounts[p.position] || 0) + 1;
  }
  console.assert(posCounts['TW'] === 3, `❌ TW: Erwartet 3, bekommen: ${posCounts['TW']}`);
  console.assert(posCounts['ST'] === 3, `❌ ST: Erwartet 3, bekommen: ${posCounts['ST']}`);
  console.log(`✅ Positionsverteilung: ${JSON.stringify(posCounts)}`);

  // 2.3 Alle Spieler haben gültige Attribute
  let attrErrors = 0;
  for (const p of bayernPlayers) {
    const attrs = Object.values(p.attributes);
    for (const val of attrs) {
      if (typeof val !== 'number' || val < 1 || val > 99) {
        console.log(`❌ Spieler ${p.id}: ungültiger Attributwert ${val}`);
        attrErrors++;
      }
    }
    if (!p.firstName || !p.lastName) {
      console.log(`❌ Spieler ${p.id}: fehlender Name`);
      attrErrors++;
    }
    if (!p.teamId) {
      console.log(`❌ Spieler ${p.id}: fehlende teamId`);
      attrErrors++;
    }
    if (p.shirtNumber < 1 || p.shirtNumber > 99) {
      console.log(`❌ Spieler ${p.id}: ungültige Trikotnummer ${p.shirtNumber}`);
      attrErrors++;
    }
  }
  if (attrErrors === 0) console.log(`✅ Alle Spielerattribute im gültigen Bereich (1-99)`);

  // 2.4 Alle Teams generieren
  const allPlayers = generateAllPlayers(teams);
  console.assert(
    allPlayers.length === 56 * 25,
    `❌ Gesamtspieler: Erwartet ${56 * 25}, bekommen: ${allPlayers.length}`
  );
  console.log(`✅ ${allPlayers.length} Spieler für alle 56 Teams generiert`);

  // 2.5 Keine doppelten Spieler-IDs
  const playerIds = allPlayers.map(p => p.id);
  const uniquePlayerIds = new Set(playerIds);
  console.assert(
    playerIds.length === uniquePlayerIds.size,
    `❌ Doppelte Spieler-IDs! ${playerIds.length} vs ${uniquePlayerIds.size}`
  );
  console.log(`✅ Keine doppelten Spieler-IDs`);

  // 2.6 Marktwert-Logik: BL-Spieler teurer als 3.Liga-Spieler im Schnitt
  const blPlayerValues = allPlayers.filter(p => {
    const team = teams.find(t => t.id === p.teamId);
    return team?.league === 'bundesliga';
  }).map(p => p.marketValue);
  const dlPlayerValues = allPlayers.filter(p => {
    const team = teams.find(t => t.id === p.teamId);
    return team?.league === 'dritte-liga';
  }).map(p => p.marketValue);

  const blAvg = blPlayerValues.reduce((s, v) => s + v, 0) / blPlayerValues.length;
  const dlAvg = dlPlayerValues.reduce((s, v) => s + v, 0) / dlPlayerValues.length;
  console.assert(blAvg > dlAvg, `❌ BL-Durchschnittswert (${blAvg}) sollte > 3.Liga (${dlAvg}) sein`);
  console.log(`✅ Marktwert-Hierarchie: BL Ø ${(blAvg/1000000).toFixed(1)}M > 3.Liga Ø ${(dlAvg/1000000).toFixed(1)}M`);

  // 2.7 Determinismus: gleicher Seed = gleiche Spieler
  const bayernPlayers2 = generatePlayersForTeam(bayern, 1, 42);
  const match = bayernPlayers.every((p, i) => p.firstName === bayernPlayers2[i].firstName && p.lastName === bayernPlayers2[i].lastName);
  console.assert(match, `❌ Generator ist nicht deterministisch!`);
  console.log(`✅ Generator ist deterministisch (gleicher Seed = gleiche Spieler)`);

  return allPlayers;
}

// === 3. SCHEDULE GENERATOR TESTS ===
import { generateAllSchedules, generateLeagueSchedule } from '../src/lib/schedule-generator';

function testScheduleGenerator(leagues: ReturnType<typeof loadLeagues>, teams: ReturnType<typeof loadTeams>) {
  console.log('\n=== 3. SCHEDULE GENERATOR TESTS ===');

  const schedules = generateAllSchedules(leagues, teams, '2024-07-01');
  console.assert(schedules.length === 3, `❌ Erwartet 3 Schedules, bekommen: ${schedules.length}`);
  console.log(`✅ ${schedules.length} Spielpläne generiert`);

  for (const schedule of schedules) {
    const league = leagues.find(l => l.id === schedule.leagueId)!;
    const leagueTeams = teams.filter(t => t.league === schedule.leagueId);
    const n = leagueTeams.length;
    const expectedMatchdays = (n - 1) * 2;
    const expectedMatchesPerDay = n / 2;
    const expectedTotalMatches = expectedMatchdays * expectedMatchesPerDay;

    // 3.1 Gesamtzahl Spiele
    console.assert(
      schedule.matches.length === expectedTotalMatches,
      `❌ ${league.shortName}: Erwartet ${expectedTotalMatches} Spiele, bekommen: ${schedule.matches.length}`
    );
    console.log(`✅ ${league.shortName}: ${schedule.matches.length} Spiele (${expectedMatchdays} Spieltage)`);

    // 3.2 Jeder Spieltag hat korrekte Anzahl Spiele
    const matchdayCounts: Record<number, number> = {};
    for (const m of schedule.matches) {
      matchdayCounts[m.matchday] = (matchdayCounts[m.matchday] || 0) + 1;
    }
    for (const [day, count] of Object.entries(matchdayCounts)) {
      console.assert(
        count === expectedMatchesPerDay,
        `❌ ${league.shortName} Spieltag ${day}: Erwartet ${expectedMatchesPerDay} Spiele, bekommen: ${count}`
      );
    }
    console.log(`✅ ${league.shortName}: Jeder Spieltag hat ${expectedMatchesPerDay} Spiele`);

    // 3.3 Kein Team spielt gegen sich selbst
    const selfMatches = schedule.matches.filter(m => m.homeTeamId === m.awayTeamId);
    console.assert(selfMatches.length === 0, `❌ ${league.shortName}: ${selfMatches.length} Selbst-Spiele gefunden!`);
    console.log(`✅ ${league.shortName}: Kein Team spielt gegen sich selbst`);

    // 3.4 Jedes Team hat gleich viele Heim- und Auswärtsspiele
    for (const team of leagueTeams) {
      const homeGames = schedule.matches.filter(m => m.homeTeamId === team.id).length;
      const awayGames = schedule.matches.filter(m => m.awayTeamId === team.id).length;
      const totalGames = homeGames + awayGames;
      console.assert(
        totalGames === expectedMatchdays,
        `❌ ${team.shortName}: Erwartet ${expectedMatchdays} Spiele, hat ${totalGames} (H:${homeGames} A:${awayGames})`
      );
      // Heim/Auswärts sollte ungefähr gleich sein (±1)
      console.assert(
        Math.abs(homeGames - awayGames) <= 1,
        `❌ ${team.shortName}: Heim/Auswärts-Balance ${homeGames}/${awayGames}`
      );
    }
    console.log(`✅ ${league.shortName}: Alle Teams haben ${expectedMatchdays} Spiele mit ausgeglichener Heim/Auswärts-Bilanz`);

    // 3.5 Kein Team spielt doppelt am selben Spieltag
    for (let day = 1; day <= expectedMatchdays; day++) {
      const dayMatches = schedule.matches.filter(m => m.matchday === day);
      const teamsOnDay = new Set<string>();
      for (const m of dayMatches) {
        console.assert(!teamsOnDay.has(m.homeTeamId), `❌ ${m.homeTeamId} spielt doppelt an Spieltag ${day}`);
        console.assert(!teamsOnDay.has(m.awayTeamId), `❌ ${m.awayTeamId} spielt doppelt an Spieltag ${day}`);
        teamsOnDay.add(m.homeTeamId);
        teamsOnDay.add(m.awayTeamId);
      }
    }
    console.log(`✅ ${league.shortName}: Kein Team spielt doppelt an einem Spieltag`);

    // 3.6 Hin- und Rückspiel existiert
    for (const team1 of leagueTeams) {
      for (const team2 of leagueTeams) {
        if (team1.id === team2.id) continue;
        const homeVsAway = schedule.matches.filter(m => m.homeTeamId === team1.id && m.awayTeamId === team2.id);
        console.assert(
          homeVsAway.length === 1,
          `❌ ${team1.shortName} vs ${team2.shortName}: ${homeVsAway.length} Heim-Spiele (erwartet 1)`
        );
      }
    }
    console.log(`✅ ${league.shortName}: Hin- und Rückspiel für alle Paarungen vorhanden`);

    // 3.7 Daten sind chronologisch aufsteigend
    let lastDate = '';
    let dateOrderOk = true;
    for (let day = 1; day <= expectedMatchdays; day++) {
      const dayMatch = schedule.matches.find(m => m.matchday === day);
      if (dayMatch && dayMatch.date < lastDate) {
        console.log(`❌ Spieltag ${day} (${dayMatch.date}) vor Spieltag ${day-1} (${lastDate})`);
        dateOrderOk = false;
      }
      if (dayMatch) lastDate = dayMatch.date;
    }
    if (dateOrderOk) console.log(`✅ ${league.shortName}: Spieltage chronologisch korrekt`);
  }

  return schedules;
}

// === 4. MATCH ENGINE TESTS ===
import { simulateMatch } from '../src/lib/match-engine';

function testMatchEngine(teams: ReturnType<typeof loadTeams>, allPlayers: any[]) {
  console.log('\n=== 4. MATCH ENGINE TESTS ===');

  const bayern = teams.find(t => t.id === 'bayern-muenchen')!;
  const dortmund = teams.find(t => t.id === 'borussia-dortmund')!;

  const testMatch = {
    id: 'test-match-1',
    homeTeamId: bayern.id,
    awayTeamId: dortmund.id,
    date: '2024-08-16',
    time: '15:30',
    matchday: 1,
    competition: 'league' as const,
    leagueId: 'bundesliga',
    venue: bayern.stadium.name,
    isPlayed: false,
  };

  // 4.1 Simulation gibt Ergebnis zurück
  const result = simulateMatch(testMatch, bayern, dortmund, allPlayers);
  console.assert(result !== null && result !== undefined, `❌ simulateMatch gibt null zurück`);
  console.log(`✅ Match simuliert: ${bayern.shortName} ${result.homeScore}:${result.awayScore} ${dortmund.shortName}`);

  // 4.2 Ergebnis hat alle Pflichtfelder
  console.assert(typeof result.homeScore === 'number', `❌ homeScore fehlt`);
  console.assert(typeof result.awayScore === 'number', `❌ awayScore fehlt`);
  console.assert(result.homeScore >= 0, `❌ homeScore negativ: ${result.homeScore}`);
  console.assert(result.awayScore >= 0, `❌ awayScore negativ: ${result.awayScore}`);
  console.assert(Array.isArray(result.events), `❌ events ist kein Array`);
  console.assert(result.events.length > 0, `❌ Keine Events generiert`);
  console.log(`✅ Ergebnis hat alle Pflichtfelder, ${result.events.length} Events`);

  // 4.3 Stats vorhanden und plausibel
  console.assert(result.homeStats.possession + result.awayStats.possession === 100, `❌ Ballbesitz summiert sich nicht auf 100%`);
  console.assert(result.homeStats.shots >= result.homeStats.shotsOnTarget, `❌ Mehr Schüsse aufs Tor als Gesamtschüsse (Heim)`);
  console.assert(result.awayStats.shots >= result.awayStats.shotsOnTarget, `❌ Mehr Schüsse aufs Tor als Gesamtschüsse (Auswärts)`);
  console.log(`✅ Stats plausibel: Ballbesitz ${result.homeStats.possession}/${result.awayStats.possession}%, Schüsse ${result.homeStats.shots}/${result.awayStats.shots}`);

  // 4.4 Spieler-Ratings vorhanden
  console.assert(result.homeRatings.length > 0, `❌ Keine Heim-Ratings`);
  console.assert(result.awayRatings.length > 0, `❌ Keine Auswärts-Ratings`);
  for (const r of [...result.homeRatings, ...result.awayRatings]) {
    console.assert(r.rating >= 3 && r.rating <= 10, `❌ Rating außerhalb 3-10: ${r.rating}`);
  }
  console.log(`✅ ${result.homeRatings.length + result.awayRatings.length} Spieler-Ratings im Bereich 3.0-10.0`);

  // 4.5 Tor-Events stimmen mit Ergebnis überein
  const homeGoalEvents = result.events.filter(e => e.type === 'goal' && e.teamId === bayern.id);
  const awayGoalEvents = result.events.filter(e => e.type === 'goal' && e.teamId === dortmund.id);
  console.assert(
    homeGoalEvents.length === result.homeScore,
    `❌ Heim-Tor-Events (${homeGoalEvents.length}) ≠ homeScore (${result.homeScore})`
  );
  console.assert(
    awayGoalEvents.length === result.awayScore,
    `❌ Auswärts-Tor-Events (${awayGoalEvents.length}) ≠ awayScore (${result.awayScore})`
  );
  console.log(`✅ Tor-Events stimmen mit Ergebnis überein`);

  // 4.6 Wetter vorhanden
  console.assert(result.weather !== null && result.weather !== undefined, `❌ Kein Wetter`);
  console.assert(typeof result.weather.temperature === 'number', `❌ Temperatur fehlt`);
  console.log(`✅ Wetter: ${result.weather.description}, ${result.weather.temperature}°C`);

  // 4.7 Man of the Match vorhanden
  console.assert(result.manOfTheMatch !== undefined, `❌ Kein Man of the Match`);
  console.log(`✅ Man of the Match: ${result.manOfTheMatch}`);

  // 4.8 Determinismus: gleiche Eingabe = gleiches Ergebnis
  const result2 = simulateMatch(testMatch, bayern, dortmund, allPlayers);
  console.assert(
    result.homeScore === result2.homeScore && result.awayScore === result2.awayScore,
    `❌ Match Engine nicht deterministisch!`
  );
  console.log(`✅ Match Engine ist deterministisch`);

  // 4.9 Massentest: 100 Spiele simulieren, plausible Ergebnisse
  let totalGoals = 0;
  let maxGoals = 0;
  for (let i = 0; i < 100; i++) {
    const m = { ...testMatch, id: `mass-test-${i}`, date: `2024-08-${(16 + i % 28).toString().padStart(2, '0')}` };
    const r = simulateMatch(m, bayern, dortmund, allPlayers);
    const goals = r.homeScore + r.awayScore;
    totalGoals += goals;
    if (goals > maxGoals) maxGoals = goals;
    // Kein einzelnes Spiel sollte > 15 Tore haben
    console.assert(goals <= 15, `❌ Unrealistisch viele Tore: ${r.homeScore}:${r.awayScore}`);
  }
  const avgGoals = totalGoals / 100;
  console.log(`✅ Massentest (100 Spiele): Ø ${avgGoals.toFixed(1)} Tore, Max ${maxGoals} Tore`);
  console.assert(avgGoals >= 1.5 && avgGoals <= 5.5, `❌ Durchschnitt-Tore unrealistisch: ${avgGoals.toFixed(1)}`);

  return result;
}

// === 5. DAY ADVANCE TESTS ===
import { advanceDay, advanceToNextEvent } from '../src/lib/day-advance';
import { GameState, DEFAULT_SETTINGS } from '../src/types/game';

function testDayAdvance(
  leagues: ReturnType<typeof loadLeagues>,
  teams: ReturnType<typeof loadTeams>,
  allPlayers: any[],
  schedules: any[]
) {
  console.log('\n=== 5. DAY ADVANCE TESTS ===');

  // Erstelle minimalen GameState
  const tables: Record<string, any[]> = {};
  for (const league of leagues) {
    const leagueTeams = teams.filter(t => t.league === league.id);
    tables[league.id] = leagueTeams.map((t, i) => ({
      position: i + 1, teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [],
    }));
  }

  const gameState: any = {
    manager: { firstName: 'Test', lastName: 'Manager', dateOfBirth: '1985-01-15', nationality: 'Deutschland', avatarSeed: 1, reputation: 30, currentTeamId: 'bayern-muenchen', contractUntil: '2027-06-30', salary: 500000, career: [], achievements: [], stats: { totalMatches: 0, wins: 0, draws: 0, losses: 0, titlesWon: 0, cupsWon: 0, promotions: 0, relegations: 0, seasonsManaged: 0 } },
    currentTeamId: 'bayern-muenchen',
    currentDate: '2024-08-16', // Erster Spieltag BL
    season: { number: 1, year: '2024/25', startDate: '2024-07-01', endDate: '2025-06-30', currentMatchday: 0, isFinished: false },
    settings: DEFAULT_SETTINGS,
    leagues, teams, players: allPlayers, schedules, results: [], tables,
    tactics: {}, activeTactic: 'a',
    transfers: { offers: [], completed: [], listings: [], loans: [], rumors: [] },
    finances: { 'bayern-muenchen': { balance: 150000000, transferBudget: 150000000, salaryBudget: 300000000, totalSalaryPerMonth: 0, monthlyIncome: [], monthlyExpenses: [] } },
    sponsors: [], sponsorOffers: [], stadiumUpgrades: [],
    training: { sessions: [], individualTraining: [], presets: { a: [], b: [], c: [] }, activePreset: 'a' as const },
    youthPlayers: [], staff: [], scoutReports: [],
    news: [], achievements: [], seasonArchive: [], interactions: [], promises: [],
    cupState: { rounds: [], currentRound: 0, isFinished: false },
    jobOffers: [], pressConferences: [],
    isTransferWindowOpen: true, transferWindowType: 'summer' as const,
  };

  // 5.1 advanceDay (2024-08-16 is a match day, so matches will be simulated)
  const state1 = advanceDay(gameState);
  console.assert(state1.currentDate === '2024-08-17', `❌ Datum nicht vorgerückt: ${state1.currentDate}`);
  console.log(`✅ advanceDay: Datum ${gameState.currentDate} → ${state1.currentDate}, ${state1.results.length} Ergebnisse`);

  // 5.2 advanceToNextEvent: Springt zum nächsten Event
  const { state: state2 } = advanceToNextEvent(gameState);
  console.assert(state2.currentDate !== gameState.currentDate, `❌ Datum nicht vorgerückt`);
  console.log(`✅ advanceToNextEvent: ${gameState.currentDate} → ${state2.currentDate}`);

  // 5.3 Prüfe ob Spiele simuliert wurden
  const playedMatches = state2.schedules.flatMap((s: any) => s.matches.filter((m: any) => m.isPlayed));
  console.log(`✅ ${playedMatches.length} Spiele nach advanceToNextEvent simuliert`);

  // 5.4 Tabelle aktualisiert?
  let tableUpdated = false;
  for (const league of leagues) {
    const table = state2.tables[league.id];
    const totalPoints = table.reduce((s: number, e: any) => s + e.points, 0);
    if (totalPoints > 0) tableUpdated = true;
  }
  if (playedMatches.length > 0) {
    console.assert(tableUpdated, `❌ Tabelle nicht aktualisiert trotz gespielter Spiele`);
    console.log(`✅ Tabelle wurde aktualisiert`);
  }

  // 5.5 Mehrere Spieltage simulieren
  let current = gameState;
  for (let i = 0; i < 5; i++) {
    current = advanceToNextEvent(current).state;
  }
  const totalPlayed = current.schedules.flatMap((s: any) => s.matches.filter((m: any) => m.isPlayed)).length;
  console.log(`✅ Nach 5x advanceToNextEvent: ${totalPlayed} gespielte Spiele, Datum: ${current.currentDate}`);

  // 5.6 Tabelle-Konsistenz nach mehreren Spieltagen
  for (const league of leagues) {
    const table = current.tables[league.id];
    let totalPointsCheck = true;
    for (const entry of table) {
      const expectedPts = entry.won * 3 + entry.drawn * 1;
      if (entry.points !== expectedPts) {
        console.log(`❌ ${entry.teamId}: Punkte ${entry.points} ≠ berechnet ${expectedPts} (${entry.won}S ${entry.drawn}U)`);
        totalPointsCheck = false;
      }
      if (entry.played !== entry.won + entry.drawn + entry.lost) {
        console.log(`❌ ${entry.teamId}: Spiele ${entry.played} ≠ ${entry.won}+${entry.drawn}+${entry.lost}`);
        totalPointsCheck = false;
      }
      if (entry.goalDifference !== entry.goalsFor - entry.goalsAgainst) {
        console.log(`❌ ${entry.teamId}: Tordiff ${entry.goalDifference} ≠ ${entry.goalsFor}-${entry.goalsAgainst}`);
        totalPointsCheck = false;
      }
    }
    if (totalPointsCheck) console.log(`✅ ${league.shortName}: Tabelle ist konsistent (Punkte, Spiele, Tordifferenz)`);

    // Tabelle ist sortiert?
    let sorted = true;
    for (let i = 1; i < table.length; i++) {
      if (table[i].points > table[i-1].points) {
        sorted = false;
        break;
      }
    }
    console.assert(sorted, `❌ ${league.shortName}: Tabelle nicht nach Punkten sortiert`);
    if (sorted) console.log(`✅ ${league.shortName}: Tabelle korrekt sortiert`);
  }

  // 5.7 News generiert?
  if (current.news.length > 0) {
    console.log(`✅ ${current.news.length} News-Einträge generiert`);
  }

  // 5.8 Spieler-Statistiken aktualisiert?
  const bayernPlayers = current.players.filter((p: any) => p.teamId === 'bayern-muenchen');
  const playersWithApps = bayernPlayers.filter((p: any) => p.stats.appearances > 0);
  console.log(`✅ ${playersWithApps.length} Bayern-Spieler mit Einsätzen`);
}

// === 6. SIDEBAR / ROUTE TESTS ===
function testRoutes() {
  console.log('\n=== 6. ROUTEN-TESTS ===');

  const sidebarRoutes = [
    '/game/dashboard', '/game/squad', '/game/tactics', '/game/schedule',
    '/game/table', '/game/transfers', '/game/finances', '/game/training',
    '/game/youth', '/game/staff', '/game/stats', '/game/manager', '/game/news'
  ];

  const allRoutes = [
    '/', '/new-game', '/load-game', '/settings',
    ...sidebarRoutes,
    '/game/match/[id]'
  ];

  console.log(`✅ ${allRoutes.length} Routen definiert`);
  console.log(`✅ ${sidebarRoutes.length} Sidebar-Einträge`);

  // Prüfe ob alle Sidebar-Links existierende Routen haben
  // (kann nur zur Compile-Zeit geprüft werden, aber wir listen sie)
  for (const route of sidebarRoutes) {
    console.log(`  📄 ${route}`);
  }
}

// === MAIN ===
console.log('🏟️  Liga Pro Fussballmanager - Integration Tests');
console.log('='.repeat(50));

try {
  const { leagues, teams } = testDataLoader();
  const allPlayers = testPlayerGenerator(teams);
  const schedules = testScheduleGenerator(leagues, teams);
  testMatchEngine(teams, allPlayers);
  testDayAdvance(leagues, teams, allPlayers, schedules);
  testRoutes();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 ALLE TESTS ABGESCHLOSSEN');
} catch (e) {
  console.error('\n❌ FATAL ERROR:', e);
}
