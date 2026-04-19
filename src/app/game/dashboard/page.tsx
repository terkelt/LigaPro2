import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Newspaper, Users, Wallet, Target, ChevronRight, Zap, Star, Handshake, Clock, Heart, Shield, Dumbbell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/game-store";
import { TeamLogo } from "@/components/ui/team-logo";
import {
  calcOverall, formatValue,
  useMyPlayers, useMyTeam, useLeagues, useTables,
  useMyFinances, useNews, useCurrentTeamId, useTeams, useSeason, usePreseason, useManager,
  useSponsors, useResults, useMySchedule,
} from "@/store/selectors";
import { computeDayAgenda, computeWeekCalendar } from "@/lib/day-agenda";
import { useEffect, useCallback } from "react";
import { SKILL_NAMES, ManagerSkills } from "@/types/manager";
import { completeMission, calcManagerEffects } from "@/lib/manager-engine";
import { Layers, ArrowLeftRight, Calendar, Globe, GraduationCap } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);
  const advanceOneDay = useGameStore((s) => s.advanceOneDay);
  const preseason = usePreseason();
  const manager = useManager();

  useEffect(() => {
    if (preseason && !preseason.isCompleted) {
      navigate('/game/preseason', { replace: true });
    }
  }, [preseason, navigate]);
  const teamPlayers = useMyPlayers();

  const squadValue = useMemo(() => teamPlayers.reduce((sum, p) => sum + p.marketValue, 0), [teamPlayers]);
  const avgOverall = useMemo(() => {
    if (teamPlayers.length === 0) return 0;
    return Math.round(teamPlayers.reduce((sum, p) => sum + calcOverall(p), 0) / teamPlayers.length);
  }, [teamPlayers]);

  const topPlayers = useMemo(() => {
    return [...teamPlayers].sort((a, b) => calcOverall(b) - calcOverall(a)).slice(0, 5);
  }, [teamPlayers]);

  const team = useMyTeam();
  const leagues = useLeagues();
  const tables = useTables();
  const finances = useMyFinances();
  const allNews = useNews();
  const currentTeamId = useCurrentTeamId();
  const teams = useTeams();
  const season = useSeason();
  const sponsors = useSponsors();

  const activeSponsors = useMemo(
    () => (sponsors as import("@/types/finance").Sponsor[]).filter((s) => s.isActive),
    [sponsors]
  );
  const mainSponsor = useMemo(
    () => activeSponsors.find(s => s.type === 'trikot') ?? activeSponsors[0] ?? null,
    [activeSponsors]
  );
  const totalSponsorIncome = useMemo(
    () => activeSponsors.reduce((sum, s) => sum + s.amountPerSeason, 0),
    [activeSponsors]
  );

  // P5: Mood barometer data
  const results = useResults();
  const mySchedule = useMySchedule();
  const avgMorale = useMemo(() => {
    if (teamPlayers.length === 0) return 50;
    return Math.round(teamPlayers.reduce((s, p) => s + p.morale, 0) / teamPlayers.length);
  }, [teamPlayers]);
  const avgCondition = useMemo(() => {
    if (teamPlayers.length === 0) return 50;
    return Math.round(teamPlayers.reduce((s, p) => s + p.condition, 0) / teamPlayers.length);
  }, [teamPlayers]);
  const teamReputation = team?.reputation ?? 50;

  // P5: Form curve — last 5 results
  const recentForm = useMemo(() => {
    const myResults = results
      .filter(r => (r.homeTeamId === currentTeamId || r.awayTeamId === currentTeamId) && r.competition === 'league')
      .slice(-5);
    return myResults.map(r => {
      const isHome = r.homeTeamId === currentTeamId;
      const myScore = isHome ? r.homeScore : r.awayScore;
      const oppScore = isHome ? r.awayScore : r.homeScore;
      const oppTeam = teams.find(t => t.id === (isHome ? r.awayTeamId : r.homeTeamId));
      return {
        result: myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D',
        score: `${myScore}:${oppScore}`,
        opponent: oppTeam?.shortName ?? '?',
      };
    });
  }, [results, currentTeamId, teams]);

  // P5: Next match countdown
  const nextMatchCountdown = useMemo(() => {
    if (!mySchedule || !gameState) return null;
    const nextMatch = mySchedule.matches.find(
      m => !m.isPlayed && (m.homeTeamId === currentTeamId || m.awayTeamId === currentTeamId)
    );
    if (!nextMatch) return null;
    const today = new Date(gameState.currentDate).getTime();
    const matchDay = new Date(nextMatch.date).getTime();
    const daysUntil = Math.round((matchDay - today) / (1000 * 60 * 60 * 24));
    const oppId = nextMatch.homeTeamId === currentTeamId ? nextMatch.awayTeamId : nextMatch.homeTeamId;
    const oppTeam = teams.find(t => t.id === oppId);
    return { days: daysUntil, opponent: oppTeam?.name ?? '?', isHome: nextMatch.homeTeamId === currentTeamId };
  }, [mySchedule, gameState, currentTeamId, teams]);

  const league = useMemo(() => leagues.find((l) => l.id === team?.league), [leagues, team]);
  const table = useMemo(() => team ? tables[team.league] ?? [] : [], [tables, team]);
  const myTableEntry = useMemo(() => table.find((e) => e.teamId === currentTeamId), [table, currentTeamId]);
  const news = useMemo(() => [...allNews].reverse().slice(0, 4), [allNews]);

  const agenda = useMemo(() => {
    if (!gameState) return null;
    return computeDayAgenda(gameState);
  }, [gameState]);

  const weekDays = useMemo(() => {
    if (!gameState) return [];
    return computeWeekCalendar(gameState);
  }, [gameState]);

  // Opponent manager for next match
  const opponentManager = useMemo(() => {
    if (!agenda?.weekMatch || !gameState) return null;
    const oppTeamId = agenda.weekMatch.opponentId;
    return gameState.aiManagers?.[oppTeamId] ?? null;
  }, [agenda, gameState]);

  const managerEffects = useMemo(() => {
    if (!manager) return null;
    return calcManagerEffects(manager.skills);
  }, [manager]);

  const handleClaimMission = useCallback((missionId: string) => {
    if (!gameState || !manager) return;
    const updated = completeMission(manager, missionId);
    setGameState({ ...gameState, manager: updated });
  }, [gameState, manager, setGameState]);

  if (!team || !agenda || !manager) return null;

  const xpPct = manager.xpToNextLevel > 0 ? Math.round((manager.xp / manager.xpToNextLevel) * 100) : 0;

  const unusedCards = (gameState?.cardInventory ?? []).filter(c => !c.isUsed && !c.isExpired).length;
  const injuredCount = teamPlayers.filter(p => p.injury).length;
  const lowMoraleCount = teamPlayers.filter(p => p.morale < 40).length;

  const unreadNews = allNews.filter(n => !n.isRead).length;
  const todayActions = agenda.items.filter(i => i.type === 'match' || i.type === 'transfer_offer' || i.type === 'training');

  // ═══════════════════════════════════════════════════════════
  //  BROADCAST DASHBOARD — Premium Sports Hub v3
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 animate-slide-up max-w-[1400px] mx-auto">

      {/* ═══ Hero Bar: Club identity + date + manager ═══ */}
      <div className="flex items-center gap-4 px-1">
        <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight">{agenda.dayName}</h1>
            {season && <span className="text-[10px] font-mono text-muted-foreground tracking-wider">S{season.year}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {team.name} &middot; {new Date(agenda.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link to="/game/manager" className="tile-interactive flex items-center gap-2.5 px-3 py-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px] font-bold text-primary">
            {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <p className="text-[11px] font-medium leading-tight">{manager.firstName} {manager.lastName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] px-1.5 py-px rounded-md bg-primary/12 text-primary font-semibold">Lv.{manager.level}</span>
              <div className="w-10 h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </Link>
      </div>

      {/* ═══ Action Alerts (match day / tasks) ═══ */}
      {todayActions.length > 0 && (
        <div className="space-y-1.5 stagger-children">
          {todayActions.map(item => (
            <div key={item.id} className={`tile flex items-center gap-3 px-4 py-3 ${
              item.type === 'match' ? 'border-accent/30 bg-gradient-to-r from-accent/6 to-transparent' : 'border-primary/20'
            }`}>
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">{item.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
              </div>
              {item.type === 'match' && item.link && (
                <Button size="sm" className="gap-1 h-7 text-xs rounded-lg shadow-[0_0_12px_hsl(var(--primary)/0.2)]" onClick={() => {
                  const matchId = (item.meta as Record<string, string>)?.matchId;
                  advanceOneDay();
                  navigate(`/game/match/${matchId}`);
                }}>
                  Spielen <ChevronRight className="w-3 h-3" />
                </Button>
              )}
              {item.type === 'match' && !item.link && (
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs rounded-lg" onClick={() => advanceOneDay()}>
                  Simulieren <ChevronRight className="w-3 h-3" />
                </Button>
              )}
              {(item.type === 'transfer_offer' || item.type === 'training') && item.link && (
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs rounded-lg" onClick={() => navigate(item.link!)}>
                  Ansehen <ChevronRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* ── LEFT COLUMN (5/12): Match + Form ── */}
        <div className="lg:col-span-5 space-y-3">

          {/* Next Match Card */}
          <div className={`tile overflow-hidden ${
            nextMatchCountdown?.days === 0
              ? 'border-accent/40'
              : 'border-border/60'
          }`}>
            {/* Colored top accent bar */}
            <div className={`h-0.5 ${nextMatchCountdown?.days === 0 ? 'bg-accent' : 'bg-primary/40'}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="section-label">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Nächstes Spiel</span>
                </div>
                {nextMatchCountdown?.days === 0 && (
                  <span className="text-[9px] px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold uppercase tracking-wider animate-pulse-soft">Spieltag</span>
                )}
              </div>
              {nextMatchCountdown ? (
                <>
                  <p className={`text-3xl font-display font-black tracking-tight ${
                    nextMatchCountdown.days === 0 ? 'text-accent' : 'text-foreground'
                  }`}>
                    {nextMatchCountdown.days === 0 ? 'HEUTE' : nextMatchCountdown.days === 1 ? 'MORGEN' : `IN ${nextMatchCountdown.days} TAGEN`}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1.5">
                    {nextMatchCountdown.isHome ? '🏠 Heim' : '✈️ Auswärts'} vs. <span className="font-semibold text-foreground">{nextMatchCountdown.opponent}</span>
                  </p>
                  <div className="flex gap-1.5 mt-3">
                    <Link to="/game/tactics" className="text-[10px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                      Taktik
                    </Link>
                    <Link to="/game/squad" className="text-[10px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                      Aufstellung
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Kein Spiel geplant</p>
              )}
            </div>
          </div>

          {/* Form Curve */}
          <div className="tile p-4">
            <div className="section-label mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Formkurve</span>
            </div>
            {recentForm.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">Noch keine Ergebnisse</p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {recentForm.map((f, i) => (
                  <div key={i} className="text-center group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white transition-transform group-hover:scale-110 ${
                      f.result === 'W' ? 'bg-emerald-500/90' : f.result === 'L' ? 'bg-red-500/90' : 'bg-amber-500/90'
                    }`}>
                      {f.result === 'W' ? 'S' : f.result === 'L' ? 'N' : 'U'}
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1 font-mono">{f.score}</p>
                    <p className="text-[7px] text-muted-foreground truncate w-10">{f.opponent}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opponent Manager */}
          {opponentManager && agenda.weekMatch && (
            <div className="tile p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="section-label">
                  <Star className="w-3.5 h-3.5 text-accent" />
                  <span className="text-accent">Gegner-Trainer</span>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {agenda.weekMatch.daysAway === 0 ? 'HEUTE' : `in ${agenda.weekMatch.daysAway}d`}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                  {opponentManager.firstName.charAt(0)}{opponentManager.lastName.charAt(0)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{opponentManager.firstName} {opponentManager.lastName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {agenda.weekMatch.opponentName} &middot; Lv. {opponentManager.level}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(SKILL_NAMES) as [keyof ManagerSkills, typeof SKILL_NAMES[keyof ManagerSkills]][]).slice(0, 4).map(([key, info]) => (
                  <div key={key} className="flex items-center gap-1.5 text-[10px]">
                    <span>{info.icon}</span>
                    <span className="text-muted-foreground">{info.name}</span>
                    <span className="ml-auto font-mono font-bold">{opponentManager.skills[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sponsors */}
          {activeSponsors.length > 0 && (
            <div className="tile p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="section-label">
                  <Handshake className="w-3.5 h-3.5" />
                  <span>Sponsoren</span>
                </div>
                <Link to="/game/finances" className="text-[10px] text-primary hover:text-primary/80 transition-colors">Details →</Link>
              </div>
              {mainSponsor && (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-muted-foreground">{mainSponsor.name}</span>
                  <span className="font-mono text-primary font-bold whitespace-nowrap">{formatValue(mainSponsor.amountPerSeason)}</span>
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{activeSponsors.length} Verträge</span>
                <span className="font-semibold text-primary">{formatValue(totalSponsorIncome)}/S</span>
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER COLUMN (4/12): KPIs + Mood + Table ── */}
        <div className="lg:col-span-4 space-y-3">

          {/* KPI Grid — 2x2 stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <Link to="/game/table" className="tile-stat p-3.5 group">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Trophy className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Tabelle</span>
              </div>
              <p className="text-2xl font-display font-black leading-none">{myTableEntry?.position ?? "—"}<span className="text-xs font-normal text-muted-foreground">.</span></p>
              <p className="text-[9px] text-muted-foreground mt-1 font-mono">{myTableEntry?.points ?? 0} Pkt &middot; {myTableEntry?.played ?? 0} Sp</p>
            </Link>

            <Link to="/game/squad" className="tile-stat p-3.5 group">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Users className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Kader</span>
              </div>
              <p className="text-2xl font-display font-black leading-none">{avgOverall}<span className="text-xs font-normal text-muted-foreground"> Ø</span></p>
              <p className="text-[9px] text-muted-foreground mt-1 font-mono">{teamPlayers.length} Spieler</p>
              {injuredCount > 0 && <p className="text-[8px] text-red-400 mt-0.5">🏥 {injuredCount} verletzt</p>}
            </Link>

            <Link to="/game/finances" className="tile-stat p-3.5 group">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wallet className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Budget</span>
              </div>
              <p className="text-xl font-display font-black text-primary leading-none">{formatValue(finances?.transferBudget ?? 0)}</p>
              <p className="text-[9px] text-muted-foreground mt-1 font-mono">Wert: {formatValue(squadValue)}</p>
            </Link>

            <Link to="/game/cards" className="tile-stat p-3.5 group">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors" />
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Karten</span>
              </div>
              <p className={`text-2xl font-display font-black leading-none ${unusedCards > 0 ? 'text-accent' : ''}`}>{unusedCards}</p>
              <p className="text-[9px] text-muted-foreground mt-1">verfügbar</p>
            </Link>
          </div>

          {/* Mood Barometer */}
          <div className="tile p-4">
            <div className="section-label mb-3">
              <Heart className="w-3.5 h-3.5" />
              <span>Teamstimmung</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Moral', value: avgMorale, icon: '💪' },
                { label: 'Fitness', value: avgCondition, icon: '🏃' },
                { label: 'Reputation', value: teamReputation, icon: '⭐' },
              ].map(m => {
                const color = m.value >= 70 ? 'bg-emerald-500' : m.value >= 45 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={m.label} className="flex items-center gap-2.5">
                    <span className="text-xs">{m.icon}</span>
                    <span className="text-[10px] text-muted-foreground w-14">{m.label}</span>
                    <div className="flex-1 progress-bar">
                      <div className={color} style={{ width: `${m.value}%` }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold w-6 text-right">{m.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* League Table Mini */}
          <div className="tile overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="section-label">
                <Trophy className="w-3.5 h-3.5" />
                <span>{league?.name ?? "Tabelle"}</span>
              </div>
              <Link to="/game/table" className="text-[10px] text-primary hover:text-primary/80 transition-colors">Alle →</Link>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/40 text-[8px] text-muted-foreground/60 uppercase tracking-widest">
                  <th className="text-center px-2 py-1.5 w-6">#</th>
                  <th className="text-left px-2 py-1.5">Verein</th>
                  <th className="text-center px-2 py-1.5 w-8">Sp</th>
                  <th className="text-center px-2 py-1.5 w-8">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {table.slice(0, 6).map((entry) => {
                  const t = teams.find((tm) => tm.id === entry.teamId);
                  const isMe = entry.teamId === currentTeamId;
                  return (
                    <tr key={entry.teamId} className={`border-b border-border/15 transition-colors hover:bg-secondary/30 ${isMe ? "bg-primary/6" : ""}`}>
                      <td className={`text-center px-2 py-1.5 font-mono ${isMe ? "text-primary font-bold" : "text-muted-foreground"}`}>{entry.position}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <TeamLogo teamId={entry.teamId} teamName={t?.name ?? '?'} shortName={t?.shortName} colors={t?.colors} size={14} />
                          <span className={isMe ? "text-primary font-semibold" : ""}>{t?.shortName ?? "?"}</span>
                        </div>
                      </td>
                      <td className="text-center px-2 py-1.5 text-muted-foreground font-mono">{entry.played}</td>
                      <td className={`text-center px-2 py-1.5 font-mono ${isMe ? "text-primary font-bold" : "font-semibold"}`}>{entry.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT COLUMN (3/12): Calendar + Missions + News ── */}
        <div className="lg:col-span-3 space-y-3">

          {/* Week Calendar */}
          <div className="tile p-3.5">
            <div className="section-label mb-2.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Woche</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div
                  key={day.date}
                  className={`rounded-lg p-1 text-center transition-all ${
                    day.isToday
                      ? "bg-primary/15 border border-primary/40 ring-1 ring-primary/20"
                      : day.isPast
                        ? "opacity-40"
                        : "border border-border/30"
                  }`}
                >
                  <p className={`text-[7px] font-bold uppercase ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>{day.dayShort}</p>
                  <p className={`text-[13px] font-display leading-tight ${day.isToday ? "text-primary font-bold" : ""}`}>{day.dayNum}</p>
                  {day.hasMatch && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />}
                  {day.hasTraining && !day.hasMatch && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/60 mt-0.5" />}
                </div>
              ))}
            </div>
          </div>

          {/* Missions */}
          <div className="tile p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="section-label">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary">Missionen</span>
              </div>
              <Link to="/game/manager" className="text-[10px] text-primary hover:text-primary/80 transition-colors">Alle →</Link>
            </div>
            {(manager.activeMissions ?? []).length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-3">Keine aktiven Missionen.</p>
            ) : (
              <div className="space-y-2">
                {(manager.activeMissions ?? []).slice(0, 3).map(mission => {
                  const progressPct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0;
                  const canClaim = mission.progress >= mission.target && !mission.isCompleted;
                  return (
                    <div key={mission.id} className={`p-2.5 rounded-lg border ${
                      mission.isCompleted ? 'border-emerald-500/25 bg-emerald-500/5' : canClaim ? 'border-primary/30 bg-primary/5' : 'border-border/40'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">{mission.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-semibold ${mission.isCompleted ? 'text-emerald-400 line-through' : ''}`}>{mission.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 progress-bar">
                              <div className={mission.isCompleted ? 'bg-emerald-500' : canClaim ? 'bg-primary animate-pulse-soft' : 'bg-primary/50'} style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-[8px] font-mono text-muted-foreground">{mission.progress}/{mission.target}</span>
                          </div>
                          {canClaim && (
                            <Button size="sm" className="mt-1.5 h-5 text-[9px] w-full rounded-md" onClick={() => handleClaimMission(mission.id)}>
                              Einsammeln
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* News Feed */}
          <div className="tile overflow-hidden">
            <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
              <div className="section-label">
                <Newspaper className="w-3.5 h-3.5" />
                <span>Neuigkeiten</span>
                {unreadNews > 0 && (
                  <span className="metric-badge bg-primary/15 text-primary">{unreadNews} neu</span>
                )}
              </div>
              <Link to="/game/news" className="text-[10px] text-primary hover:text-primary/80 transition-colors">Alle →</Link>
            </div>
            <div className="px-3.5 pb-3 space-y-0.5">
              {news.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-3">Keine Neuigkeiten</p>
              ) : (
                news.slice(0, 5).map(item => (
                  <div key={item.id} className={`flex items-center gap-2 py-1.5 border-l-2 pl-2.5 rounded-r-md transition-colors hover:bg-secondary/20 ${
                    !item.isRead ? 'border-l-primary' : 'border-l-border/30'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] truncate ${!item.isRead ? 'font-semibold' : 'text-muted-foreground'}`}>{item.title}</p>
                      <p className="text-[8px] text-muted-foreground font-mono">{item.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
