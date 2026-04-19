/**
 * Match Analysis Engine — generates post-match tactical analysis from MatchResult.
 */

import { MatchResult, PlayerMatchRating } from '@/types/match';
import { Player } from '@/types/player';

export interface MatchAnalysis {
  possessionHome: number;
  possessionAway: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  cornersHome: number;
  cornersAway: number;
  foulsHome: number;
  foulsAway: number;

  playerRatings: { id: string; name: string; position: string; rating: number; goals: number; assists: number; minutesPlayed: number; highlight: string }[];
  avgTeamRating: number;

  tacticalSummary: string[];
  strengths: string[];
  weaknesses: string[];

  managerRating: number;
  managerVerdict: string;
}

export function generateMatchAnalysis(
  result: MatchResult,
  teamId: string,
  players: Player[],
): MatchAnalysis {
  const isHome = result.homeTeamId === teamId;
  const myStats = isHome ? result.homeStats : result.awayStats;
  const oppStats = isHome ? result.awayStats : result.homeStats;
  const myRatings: PlayerMatchRating[] = isHome ? (result.homeRatings ?? []) : (result.awayRatings ?? []);
  const myScore = isHome ? result.homeScore : result.awayScore;
  const oppScore = isHome ? result.awayScore : result.homeScore;
  const won = myScore > oppScore;
  const lost = myScore < oppScore;

  const findPlayer = (id: string) => players.find(p => p.id === id);

  // Player ratings with highlights
  const playerRatings = myRatings
    .filter(r => r.minutesPlayed > 0)
    .map(r => {
      const p = findPlayer(r.playerId);
      let highlight = '';
      if (r.goals >= 2) highlight = 'Doppelpack!';
      else if (r.goals >= 1 && r.assists >= 1) highlight = 'Tor + Vorlage';
      else if (r.goals >= 1) highlight = 'Torschütze';
      else if (r.assists >= 1) highlight = 'Vorlagengeber';
      else if (r.rating >= 8.0) highlight = 'Herausragend';
      else if (r.rating >= 7.5) highlight = 'Stark';
      else if (r.rating <= 5.0) highlight = 'Schwach';
      else if (r.yellowCard) highlight = 'Gelbe Karte';
      else if (r.redCard) highlight = 'Rote Karte!';
      return {
        id: r.playerId,
        name: p ? `${p.firstName?.charAt(0)}. ${p.lastName}` : 'Unbekannt',
        position: p?.position ?? '?',
        rating: Math.round(r.rating * 10) / 10,
        goals: r.goals,
        assists: r.assists,
        minutesPlayed: r.minutesPlayed,
        highlight,
      };
    })
    .sort((a, b) => b.rating - a.rating);

  const avgTeamRating = playerRatings.length > 0
    ? Math.round((playerRatings.reduce((s, r) => s + r.rating, 0) / playerRatings.length) * 10) / 10
    : 6.0;

  // Tactical summary
  const tacticalSummary: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const possession = myStats.possession ?? 50;
  const oppPossession = oppStats.possession ?? 50;

  if (possession > 55) {
    tacticalSummary.push(`Dein Team kontrollierte das Spiel mit ${possession}% Ballbesitz.`);
    strengths.push('Starke Ballkontrolle und Spielaufbau');
  } else if (possession < 45) {
    tacticalSummary.push(`Der Gegner dominierte den Ballbesitz (${oppPossession}%).`);
    weaknesses.push('Zu wenig Ballbesitz — besseres Pressing nötig');
  } else {
    tacticalSummary.push('Ausgeglichenes Mittelfeld — beide Teams auf Augenhöhe.');
  }

  const shots = myStats.shots ?? 0;
  const shotsOnTarget = myStats.shotsOnTarget ?? 0;
  const oppShots = oppStats.shots ?? 0;

  if (shots > oppShots + 5) {
    strengths.push('Deutlich mehr Torchancen herausgespielt');
  } else if (oppShots > shots + 5) {
    weaknesses.push('Zu wenige eigene Torchancen');
  }

  if (shots > 0 && shotsOnTarget / shots < 0.3) {
    weaknesses.push('Schussgenauigkeit muss verbessert werden');
  } else if (shots > 0 && shotsOnTarget / shots > 0.5) {
    strengths.push('Hohe Abschlusseffizienz');
  }

  const fouls = myStats.fouls ?? 0;
  if (fouls > 15) {
    weaknesses.push('Zu viele Fouls — Disziplinprobleme');
  }

  if (won && oppScore === 0) {
    tacticalSummary.push('Perfekte Defensivleistung — kein Gegentor zugelassen!');
    strengths.push('Zu-Null-Spiel: Abwehr war herausragend');
  }

  if (lost && myScore === 0) {
    tacticalSummary.push('Offensiv war zu wenig da — kein eigenes Tor erzielt.');
    weaknesses.push('Kein Torerfolg — offensive Qualität fehlt');
  }

  if (won && myScore - oppScore >= 3) {
    tacticalSummary.push('Dominanter Kantersieg! Das Team war in allen Bereichen überlegen.');
  }

  if (lost && oppScore - myScore >= 3) {
    tacticalSummary.push('Deutliche Niederlage. Taktische Anpassungen sind nötig.');
  }

  // Best and worst rated
  const best = playerRatings[0];
  const worst = playerRatings[playerRatings.length - 1];
  if (best && best.rating >= 7.5) {
    tacticalSummary.push(`${best.name} war der überragende Spieler (${best.rating}).`);
  }
  if (worst && worst.rating <= 5.5 && playerRatings.length > 3) {
    weaknesses.push(`${worst.name} (${worst.rating}) hatte einen schwachen Tag`);
  }

  // Manager rating
  let managerRating = 6.0;
  if (won) managerRating += 1.0;
  if (won && oppScore === 0) managerRating += 0.5;
  if (lost) managerRating -= 1.0;
  if (possession > 55) managerRating += 0.3;
  if (shots > oppShots) managerRating += 0.2;
  managerRating = Math.min(10, Math.max(1, Math.round(managerRating * 10) / 10));

  let managerVerdict = '';
  if (managerRating >= 8) managerVerdict = 'Hervorragend! Taktisch perfekt eingestellt.';
  else if (managerRating >= 7) managerVerdict = 'Gute Leistung. Das Team war gut vorbereitet.';
  else if (managerRating >= 6) managerVerdict = 'Solide. Es gibt aber noch Verbesserungspotenzial.';
  else if (managerRating >= 5) managerVerdict = 'Durchwachsen. Taktische Anpassungen nötig.';
  else managerVerdict = 'Schwach. Die Mannschaft war nicht gut eingestellt.';

  return {
    possessionHome: isHome ? possession : oppPossession,
    possessionAway: isHome ? oppPossession : possession,
    shotsHome: isHome ? shots : oppShots,
    shotsAway: isHome ? oppShots : shots,
    shotsOnTargetHome: isHome ? shotsOnTarget : (oppStats.shotsOnTarget ?? 0),
    shotsOnTargetAway: isHome ? (oppStats.shotsOnTarget ?? 0) : shotsOnTarget,
    cornersHome: isHome ? (myStats.corners ?? 0) : (oppStats.corners ?? 0),
    cornersAway: isHome ? (oppStats.corners ?? 0) : (myStats.corners ?? 0),
    foulsHome: isHome ? fouls : (oppStats.fouls ?? 0),
    foulsAway: isHome ? (oppStats.fouls ?? 0) : fouls,
    playerRatings,
    avgTeamRating,
    tacticalSummary,
    strengths,
    weaknesses,
    managerRating,
    managerVerdict,
  };
}
