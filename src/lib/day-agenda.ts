/**
 * Day Agenda — computes what's happening today and what the player needs to do.
 * This is a pure derived value computed from GameState, not stored in state.
 */
import { GameState } from '@/types/game';
import { Match } from '@/types/match';

export type AgendaItemType =
  | 'match'
  | 'training'
  | 'press_conference'
  | 'injury_return'
  | 'contract_warning'
  | 'board_message'
  | 'transfer_offer'
  | 'news_event'
  | 'rest_day';

export interface AgendaItem {
  id: string;
  type: AgendaItemType;
  title: string;
  description: string;
  icon: string;
  /** Must the player interact before advancing? */
  requiresAction: boolean;
  /** Has the player already handled this item? */
  isResolved: boolean;
  /** Priority for ordering */
  priority: number;
  /** Optional link to navigate to */
  link?: string;
  /** Optional extra data */
  meta?: Record<string, unknown>;
}

export interface DayAgenda {
  date: string;
  dayName: string;
  items: AgendaItem[];
  canAdvance: boolean;
  isMatchDay: boolean;
  /** The week's upcoming match (if any) */
  weekMatch: { match: Match; daysAway: number; opponentName: string; opponentId: string; isHome: boolean } | null;
}

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function getDayName(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr).getDay()];
}

function daysUntil(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

export function computeDayAgenda(state: GameState): DayAgenda {
  const { currentDate, currentTeamId } = state;
  const items: AgendaItem[] = [];
  const dayOfWeek = getDayOfWeek(currentDate);

  // ── Find today's match (league + cup) ──
  let todayMatch: Match | null = null;
  for (const schedule of state.schedules) {
    for (const match of schedule.matches) {
      if (match.date !== currentDate || match.isPlayed) continue;
      if (match.homeTeamId !== currentTeamId && match.awayTeamId !== currentTeamId) continue;
      todayMatch = match;
      break;
    }
    if (todayMatch) break;
  }
  // Also check cup matches
  if (!todayMatch && state.cupState && !state.cupState.isFinished) {
    const cupRound = state.cupState.rounds[state.cupState.currentRound];
    if (cupRound) {
      for (const match of cupRound.matches) {
        if (match.date !== currentDate || match.isPlayed) continue;
        if (match.homeTeamId !== currentTeamId && match.awayTeamId !== currentTeamId) continue;
        todayMatch = match;
        break;
      }
    }
  }
  // Also check international matches (league phase + knockout)
  if (!todayMatch && state.internationalState && !state.internationalState.isFinished && !state.internationalState.isEliminated) {
    const intl = state.internationalState;
    const intlMatches = [...(intl.leaguePhase?.matches ?? []), ...(intl.knockoutMatches ?? [])];
    for (const match of intlMatches) {
      if (match.date !== currentDate || match.isPlayed) continue;
      if (match.homeTeamId !== currentTeamId && match.awayTeamId !== currentTeamId) continue;
      todayMatch = match as Match;
      break;
    }
  }

  const isMatchDay = !!todayMatch;

  // ── Find the week's upcoming match (league + cup) ──
  let weekMatch: DayAgenda['weekMatch'] = null;
  let closestDays = 999;
  const allMatchSources: Match[][] = state.schedules.map(s => s.matches);
  // Include cup matches
  if (state.cupState && !state.cupState.isFinished) {
    const cupRound = state.cupState.rounds[state.cupState.currentRound];
    if (cupRound) allMatchSources.push(cupRound.matches);
  }
  // Include international matches
  if (state.internationalState && !state.internationalState.isFinished && !state.internationalState.isEliminated) {
    const intl = state.internationalState;
    const intlAll = [...(intl.leaguePhase?.matches ?? []), ...(intl.knockoutMatches ?? [])] as Match[];
    allMatchSources.push(intlAll);
  }
  for (const matches of allMatchSources) {
    for (const match of matches) {
      if (match.isPlayed) continue;
      if (match.homeTeamId !== currentTeamId && match.awayTeamId !== currentTeamId) continue;
      const days = daysUntil(currentDate, match.date);
      if (days >= 0 && days < closestDays) {
        closestDays = days;
        const isHome = match.homeTeamId === currentTeamId;
        const oppId = isHome ? match.awayTeamId : match.homeTeamId;
        const opp = state.teams.find((t) => t.id === oppId);
        // For friendly matches, look up opponent name from preseason data
        let oppName = opp?.name ?? 'Unbekannt';
        if (!opp && match.competition === 'friendly' && state.preseason?.friendlies) {
          const friendlyData = state.preseason.friendlies.find(f => f.date === match.date);
          if (friendlyData) oppName = friendlyData.opponentName;
        }
        weekMatch = {
          match,
          daysAway: days,
          opponentName: oppName,
          opponentId: oppId,
          isHome,
        };
      }
    }
  }

  // ── 1. Match Day ──
  if (todayMatch && weekMatch) {
    const isFriendly = todayMatch.competition === 'friendly';
    items.push({
      id: 'match-today',
      type: 'match',
      title: isFriendly
        ? `⚽ Testspiel: vs. ${weekMatch.opponentName}`
        : `⚽ Spieltag: ${weekMatch.isHome ? 'Heim' : 'Auswärts'} vs. ${weekMatch.opponentName}`,
      description: isFriendly
        ? `Testspiel — Anstoß ${todayMatch.time ?? '15:30'} Uhr. Wird beim Tagesfortschritt simuliert.`
        : `${todayMatch.matchday}. Spieltag — Anstoß ${todayMatch.time ?? '15:30'} Uhr`,
      icon: '⚽',
      requiresAction: false,
      isResolved: false,
      priority: 0,
      link: isFriendly ? undefined : `/game/match/${todayMatch.id}`,
      meta: { matchId: todayMatch.id },
    });
  }

  // ── 2. Training Day (Monday) ──
  if (dayOfWeek === 1 && !isMatchDay) {
    const trainingName = state.training.selectedTraining;
    const alreadyTrained = state.training.lastTrainingDate === currentDate;
    items.push({
      id: 'training-weekly',
      type: 'training',
      title: `🏋️ Wochentraining: ${trainingName.charAt(0).toUpperCase() + trainingName.slice(1)}`,
      description: alreadyTrained
        ? 'Training wurde bereits absolviert.'
        : 'Das Wochentraining steht an. Du kannst die Trainingseinheit noch anpassen.',
      icon: '🏋️',
      requiresAction: false,
      isResolved: alreadyTrained,
      priority: 1,
      link: '/game/training',
    });
  }

  // ── 3. Press Conference (1 day before match) ──
  if (weekMatch && weekMatch.daysAway === 1 && !isMatchDay) {
    const pendingPK = state.pressConferences.find(
      (pc) => pc.date === currentDate && !pc.isCompleted
    );
    if (pendingPK) {
      items.push({
        id: 'press-conference',
        type: 'press_conference',
        title: `🎙️ Pressekonferenz vor dem Spiel`,
        description: `Die Presse hat Fragen zum morgigen Spiel gegen ${weekMatch.opponentName}.`,
        icon: '🎙️',
        requiresAction: false,
        isResolved: false,
        priority: 2,
        meta: { pressConferenceId: pendingPK.id },
      });
    }
  }

  // ── 4. Pending transfer offers ──
  const pendingOffers = state.transfers.offers.filter(
    (o) => o.toTeamId === currentTeamId && o.status === 'pending'
  );
  if (pendingOffers.length > 0) {
    items.push({
      id: 'transfer-offers',
      type: 'transfer_offer',
      title: `📨 ${pendingOffers.length} Transferanfrage${pendingOffers.length > 1 ? 'n' : ''}`,
      description: 'Es liegen Angebote für deine Spieler vor.',
      icon: '📨',
      requiresAction: false,
      isResolved: false,
      priority: 3,
      link: '/game/transfers',
    });
  }

  // ── 5. Injury returns today ──
  const returningPlayers = state.players.filter(
    (p) => p.teamId === currentTeamId && p.injury && p.injury.daysRemaining <= 1
  );
  for (const p of returningPlayers) {
    items.push({
      id: `injury-return-${p.id}`,
      type: 'injury_return',
      title: `🏥 ${p.firstName} ${p.lastName} ist zurück!`,
      description: `${p.firstName} ${p.lastName} steht ab heute wieder zur Verfügung.`,
      icon: '🏥',
      requiresAction: false,
      isResolved: true,
      priority: 5,
    });
  }

  // ── 6. Today's news (from this date) ──
  const todayNews = state.news.filter((n) => n.date === currentDate && !n.isRead);
  for (const n of todayNews.slice(0, 3)) {
    items.push({
      id: `news-${n.id}`,
      type: 'news_event',
      title: n.title,
      description: n.content,
      icon: n.type === 'board' ? '📋' : n.type === 'injury' ? '🏥' : n.type === 'milestone' ? '🏆' : n.type === 'youth' ? '🌟' : '📰',
      requiresAction: false,
      isResolved: true,
      priority: 6,
    });
  }

  // ── 7. Transfer window status ──
  if (state.isTransferWindowOpen) {
    const d = new Date(currentDate);
    const month = d.getMonth();
    const day = d.getDate();
    const isSummer = month === 6 || month === 7;
    const deadlineDate = isSummer ? `${d.getFullYear()}-08-31` : `${d.getFullYear()}-01-31`;
    const daysToDeadline = daysUntil(currentDate, deadlineDate);
    const isDeadline = daysToDeadline === 0;

    if (isDeadline) {
      items.push({
        id: 'deadline-day',
        type: 'transfer_offer',
        title: '🚨 DEADLINE DAY! Transferfenster schließt heute!',
        description: 'Letzte Chance für Transfers! Erwarte Last-Minute-Angebote.',
        icon: '🚨',
        requiresAction: false,
        isResolved: false,
        priority: 1,
        link: '/game/transfers',
      });
    } else if (daysToDeadline <= 7 && daysToDeadline > 0) {
      items.push({
        id: 'transfer-window-closing',
        type: 'transfer_offer',
        title: `⏰ Transferfenster schließt in ${daysToDeadline} Tag${daysToDeadline > 1 ? 'en' : ''}`,
        description: `${isSummer ? 'Sommer' : 'Winter'}-Transferfenster endet am ${new Date(deadlineDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}.`,
        icon: '⏰',
        requiresAction: false,
        isResolved: true,
        priority: 4,
        link: '/game/transfers',
      });
    }
  }

  // ── 8. Rest day (if nothing else) ──
  if (items.length === 0) {
    const dayActivities = [
      { day: 2, title: '⚽ Taktik-Training', desc: 'Die Mannschaft arbeitet an taktischen Abläufen.' },
      { day: 3, title: '🏃 Konditionstraining', desc: 'Laufeinheiten und Fitness stehen auf dem Programm.' },
      { day: 4, title: '⚽ Spielform-Training', desc: 'Trainingsspiel in voller Mannschaftsstärke.' },
      { day: 5, title: '🧘 Regeneration & Abschlusstraining', desc: 'Lockeres Training, Fokus auf Erholung.' },
      { day: 0, title: '🛋️ Freier Tag', desc: 'Die Mannschaft hat heute frei.' },
    ];
    const activity = dayActivities.find((a) => a.day === dayOfWeek) ?? {
      title: '⚽ Normaler Trainingstag', desc: 'Reguläres Training auf dem Vereinsgelände.',
    };
    items.push({
      id: 'rest-day',
      type: 'rest_day',
      title: activity.title,
      description: activity.desc,
      icon: '⚽',
      requiresAction: false,
      isResolved: true,
      priority: 10,
    });
  }

  // Sort by priority
  items.sort((a, b) => a.priority - b.priority);

  // Can advance only if all required-action items are resolved
  const canAdvance = items.every((i) => !i.requiresAction || i.isResolved);

  return {
    date: currentDate,
    dayName: getDayName(currentDate),
    items,
    canAdvance,
    isMatchDay,
    weekMatch,
  };
}

/**
 * Compute the week calendar for displaying Mo-So with events.
 */
export interface WeekDay {
  date: string;
  dayShort: string;
  dayNum: string;
  isToday: boolean;
  isPast: boolean;
  hasMatch: boolean;
  hasTraining: boolean;
  hasPressConference: boolean;
  matchOpponent?: string;
}

export function computeWeekCalendar(state: GameState): WeekDay[] {
  const today = new Date(state.currentDate);
  const dayOfWeek = today.getDay(); // 0=Sun
  // Calculate Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const days: WeekDay[] = [];
  const SHORT_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === state.currentDate;
    const isPast = d < today && !isToday;

    // Check for match (league + cup)
    let hasMatch = false;
    let matchOpponent: string | undefined;
    const calMatchSources: Match[][] = state.schedules.map(s => s.matches);
    if (state.cupState && !state.cupState.isFinished) {
      const cupRound = state.cupState.rounds[state.cupState.currentRound];
      if (cupRound) calMatchSources.push(cupRound.matches);
    }
    if (state.internationalState && !state.internationalState.isFinished && !state.internationalState.isEliminated) {
      const intl = state.internationalState;
      const intlAll = [...(intl.leaguePhase?.matches ?? []), ...(intl.knockoutMatches ?? [])] as Match[];
      calMatchSources.push(intlAll);
    }
    for (const matches of calMatchSources) {
      for (const match of matches) {
        if (match.date !== dateStr) continue;
        if (match.homeTeamId !== state.currentTeamId && match.awayTeamId !== state.currentTeamId) continue;
        hasMatch = true;
        const oppId = match.homeTeamId === state.currentTeamId ? match.awayTeamId : match.homeTeamId;
        const oppTeam = state.teams.find((t) => t.id === oppId);
        if (oppTeam) {
          matchOpponent = oppTeam.shortName;
        } else if (match.competition === 'friendly' && state.preseason?.friendlies) {
          const fd = state.preseason.friendlies.find(f => f.date === dateStr);
          matchOpponent = fd?.opponentName ?? 'Testspiel';
        } else {
          matchOpponent = oppId.replace('int-', '').replace(/-/g, ' ');
        }
        if (match.competition === 'cup') matchOpponent = `🏆 ${matchOpponent}`;
        if (['cl', 'el', 'ecl'].includes(match.competition)) matchOpponent = `🌍 ${matchOpponent}`;
        if (match.competition === 'friendly') matchOpponent = `⚽ ${matchOpponent}`;
      }
    }

    // Monday = training
    const hasTraining = (new Date(dateStr).getDay() === 1) && !hasMatch;

    // Day before match = press conference
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);
    const nextDateStr = nextDay.toISOString().split('T')[0];
    let hasPressConference = false;
    for (const matches of calMatchSources) {
      for (const match of matches) {
        if (match.date !== nextDateStr) continue;
        if (match.homeTeamId !== state.currentTeamId && match.awayTeamId !== state.currentTeamId) continue;
        hasPressConference = true;
      }
    }

    days.push({
      date: dateStr,
      dayShort: SHORT_DAYS[i],
      dayNum: d.getDate().toString().padStart(2, '0'),
      isToday,
      isPast,
      hasMatch,
      hasTraining,
      hasPressConference,
      matchOpponent,
    });
  }

  return days;
}
