"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Newspaper, Users, Wallet, Target, ChevronRight, Zap, Star, Handshake, Clock, Heart, Shield, Dumbbell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);
  const advanceOneDay = useGameStore((s) => s.advanceOneDay);
  const preseason = usePreseason();
  const manager = useManager();

  useEffect(() => {
    if (preseason && !preseason.isCompleted) {
      router.replace('/game/preseason');
    }
  }, [preseason, router]);
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
  //  PORTAL DASHBOARD — Unified Tile-Based Hub
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-5 animate-slide-up">

      {/* ═══ Hero Section: Club Info + Manager ═══ */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold neon-primary">{agenda.dayName}</h1>
            <p className="text-xs text-muted-foreground">
              {team.name} — {new Date(agenda.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
              {season && <span className="ml-1">• Saison {season.year}</span>}
            </p>
          </div>
        </div>
        <Link href="/game/manager" className="tile flex items-center gap-2.5 p-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium">{manager.firstName} {manager.lastName}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Lv. {manager.level}</span>
              <div className="w-12 h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ═══ Today's Actions (Match Day / Tasks) ═══ */}
      {todayActions.length > 0 && (
        <div className="space-y-2">
          {todayActions.map(item => (
            <div key={item.id} className="tile flex items-center gap-3 p-3.5 border-primary/25 bg-gradient-to-r from-primary/5 to-transparent">
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              {item.type === 'match' && item.link && (
                <Button size="sm" className="gap-1.5 shrink-0" onClick={() => {
                  const matchId = (item.meta as Record<string, string>)?.matchId;
                  advanceOneDay();
                  router.push(`/game/match/${matchId}`);
                }}>
                  Spielen <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
              {item.type === 'match' && !item.link && (
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => advanceOneDay()}>
                  Simulieren <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
              {(item.type === 'transfer_offer' || item.type === 'training') && item.link && (
                <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => router.push(item.link!)}>
                  Ansehen <ChevronRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ Main Grid: Hero Match + Calendar + Info Tiles ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left: Next Match Hero + Form ── */}
        <div className="space-y-4">
          {/* Next Match Hero */}
          <div className={`tile p-5 ${
            nextMatchCountdown?.days === 0
              ? 'border-accent/50 bg-gradient-to-br from-accent/10 to-transparent glow-accent'
              : 'border-primary/30 bg-gradient-to-br from-primary/8 to-transparent'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">Nächstes Spiel</span>
              </div>
              {nextMatchCountdown?.days === 0 && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/20 text-accent font-bold animate-pulse">SPIELTAG</span>
              )}
            </div>
            {nextMatchCountdown ? (
              <>
                <p className={`text-4xl font-display font-black ${nextMatchCountdown.days === 0 ? 'text-accent' : 'text-primary'}`}>
                  {nextMatchCountdown.days === 0 ? 'HEUTE' : nextMatchCountdown.days === 1 ? 'MORGEN' : `${nextMatchCountdown.days} Tage`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextMatchCountdown.isHome ? '🏠 Heim' : '✈️ Auswärts'} vs. <span className="font-bold text-foreground">{nextMatchCountdown.opponent}</span>
                </p>
                <div className="flex gap-2 mt-4">
                  <Link href="/game/tactics" className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium">Taktik</Link>
                  <Link href="/game/squad" className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium">Aufstellung</Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Kein Spiel geplant</p>
            )}
          </div>

          {/* Form Curve */}
          <div className="tile p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-medium">Formkurve</span>
            </div>
            {recentForm.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Noch keine Ergebnisse</p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {recentForm.map((f, i) => (
                  <div key={i} className="text-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white ${
                      f.result === 'W' ? 'bg-green-500' : f.result === 'L' ? 'bg-red-500' : 'bg-amber-500'
                    }`}>
                      {f.result === 'W' ? 'S' : f.result === 'L' ? 'N' : 'U'}
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1">{f.score}</p>
                    <p className="text-[7px] text-muted-foreground truncate w-10">{f.opponent}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opponent Manager */}
          {opponentManager && agenda.weekMatch && (
            <div className="tile p-4 border-accent/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Star className="w-3.5 h-3.5 text-accent" />
                <span className="font-medium text-accent">Gegner-Trainer</span>
                <span className="ml-auto text-[10px]">
                  {agenda.weekMatch.daysAway === 0 ? 'HEUTE' : `in ${agenda.weekMatch.daysAway}d`}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                  {opponentManager.firstName.charAt(0)}{opponentManager.lastName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold">{opponentManager.firstName} {opponentManager.lastName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {agenda.weekMatch.opponentName} • Lv. {opponentManager.level}
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
        </div>

        {/* ── Center: Stats Grid + Table ── */}
        <div className="space-y-4">
          {/* KPI Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/game/table" className="tile p-4 group">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Trophy className="w-3 h-3" />
                <span>Tabelle</span>
              </div>
              <p className="text-3xl font-display font-black">{myTableEntry?.position ?? "—"}<span className="text-sm font-normal text-muted-foreground">.</span></p>
              <p className="text-[10px] text-muted-foreground">{myTableEntry?.points ?? 0} Pkt • {myTableEntry?.played ?? 0} Sp</p>
            </Link>

            <Link href="/game/squad" className="tile p-4 group">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Users className="w-3 h-3" />
                <span>Kader</span>
              </div>
              <p className="text-3xl font-display font-black">{avgOverall}<span className="text-sm font-normal text-muted-foreground"> Ø</span></p>
              <p className="text-[10px] text-muted-foreground">{teamPlayers.length} Spieler</p>
              {injuredCount > 0 && <p className="text-[9px] text-red-400 mt-1">🏥 {injuredCount} verletzt</p>}
            </Link>

            <Link href="/game/finances" className="tile p-4 group">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Wallet className="w-3 h-3" />
                <span>Budget</span>
              </div>
              <p className="text-2xl font-display font-black text-primary">{formatValue(finances?.transferBudget ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">Kaderwert: {formatValue(squadValue)}</p>
            </Link>

            <Link href="/game/cards" className="tile p-4 group">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Layers className="w-3 h-3" />
                <span>Karten</span>
              </div>
              <p className={`text-3xl font-display font-black ${unusedCards > 0 ? 'text-accent' : ''}`}>{unusedCards}</p>
              <p className="text-[10px] text-muted-foreground">verfügbar</p>
            </Link>
          </div>

          {/* Mood Barometer */}
          <div className="tile p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Heart className="w-3.5 h-3.5" />
              <span className="font-medium">Stimmung</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Moral', value: avgMorale, color: avgMorale >= 70 ? 'bg-green-500' : avgMorale >= 45 ? 'bg-amber-500' : 'bg-red-500' },
                { label: 'Fitness', value: avgCondition, color: avgCondition >= 70 ? 'bg-green-500' : avgCondition >= 45 ? 'bg-amber-500' : 'bg-red-500' },
                { label: 'Reputation', value: teamReputation, color: teamReputation >= 70 ? 'bg-green-500' : teamReputation >= 45 ? 'bg-amber-500' : 'bg-red-500' },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16">{m.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${m.color} transition-all`} style={{ width: `${m.value}%` }} />
                  </div>
                  <span className="text-[10px] font-mono font-bold w-6 text-right">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* League Table Mini */}
          <div className="tile overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Trophy className="w-3.5 h-3.5" />
                <span className="font-medium">{league?.name ?? "Tabelle"}</span>
              </div>
              <Link href="/game/table" className="text-[10px] text-primary hover:underline">Alle →</Link>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-[9px] text-muted-foreground uppercase tracking-wider">
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
                    <tr key={entry.teamId} className={`border-b border-border/20 ${isMe ? "bg-primary/8 font-semibold" : ""}`}>
                      <td className="text-center px-2 py-1.5 text-muted-foreground">{entry.position}</td>
                      <td className="px-2 py-1.5 flex items-center gap-1.5">
                        <TeamLogo teamId={entry.teamId} teamName={t?.name ?? '?'} shortName={t?.shortName} colors={t?.colors} size={16} />
                        <span className={isMe ? "text-primary" : ""}>{t?.shortName ?? "?"}</span>
                      </td>
                      <td className="text-center px-2 py-1.5 text-muted-foreground">{entry.played}</td>
                      <td className="text-center px-2 py-1.5 font-bold">{entry.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right: Calendar + Missions + News ── */}
        <div className="space-y-4">
          {/* Week Calendar */}
          <div className="tile p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium">Woche</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div
                  key={day.date}
                  className={`rounded-lg p-1.5 text-center transition-all ${
                    day.isToday ? "bg-primary/20 border border-primary ring-1 ring-primary/30" : day.isPast ? "bg-muted/20 text-muted-foreground" : "border border-border/40"
                  }`}
                >
                  <p className={`text-[8px] font-bold uppercase ${day.isToday ? "text-primary" : ""}`}>{day.dayShort}</p>
                  <p className={`text-sm font-display ${day.isToday ? "text-primary font-bold" : ""}`}>{day.dayNum}</p>
                  {day.hasMatch && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />}
                  {day.hasTraining && !day.hasMatch && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-0.5" />}
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Missions */}
          <div className="tile p-4 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">Missionen</span>
              </div>
              <Link href="/game/manager" className="text-[10px] text-primary hover:underline">Alle →</Link>
            </div>
            {(manager.activeMissions ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Keine aktiven Missionen.</p>
            ) : (
              <div className="space-y-2">
                {(manager.activeMissions ?? []).slice(0, 3).map(mission => {
                  const progressPct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0;
                  const canClaim = mission.progress >= mission.target && !mission.isCompleted;
                  return (
                    <div key={mission.id} className={`p-2.5 rounded-lg border ${mission.isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-border/50'}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">{mission.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold ${mission.isCompleted ? 'text-green-400 line-through' : ''}`}>{mission.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${mission.isCompleted ? 'bg-green-500' : canClaim ? 'bg-primary animate-pulse' : 'bg-primary/60'}`} style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground">{mission.progress}/{mission.target}</span>
                          </div>
                          {canClaim && (
                            <Button size="sm" className="mt-1.5 h-5 text-[9px] w-full" onClick={() => handleClaimMission(mission.id)}>
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
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Newspaper className="w-3.5 h-3.5" />
                <span className="font-medium">Neuigkeiten</span>
                {unreadNews > 0 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">{unreadNews} neu</span>
                )}
              </div>
              <Link href="/game/news" className="text-[10px] text-primary hover:underline">Alle →</Link>
            </div>
            <div className="px-4 pb-3 space-y-1">
              {news.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-3">Keine Neuigkeiten</p>
              ) : (
                news.slice(0, 5).map(item => (
                  <div key={item.id} className={`flex items-center gap-2 py-1.5 border-l-2 pl-2.5 ${!item.isRead ? 'border-l-primary' : 'border-l-border/40'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] truncate ${!item.isRead ? 'font-bold' : ''}`}>{item.title}</p>
                      <p className="text-[9px] text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sponsors */}
          {activeSponsors.length > 0 && (
            <div className="tile p-4 border-primary/15">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Handshake className="w-3.5 h-3.5" />
                  <span className="font-medium">Sponsoren</span>
                </div>
                <Link href="/game/finances" className="text-[10px] text-primary hover:underline">Details →</Link>
              </div>
              {mainSponsor && (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate">{mainSponsor.name}</span>
                  <span className="font-mono text-primary font-bold whitespace-nowrap">{formatValue(mainSponsor.amountPerSeason)}</span>
                </div>
              )}
              <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{activeSponsors.length} Verträge</span>
                <span className="font-bold text-primary">{formatValue(totalSponsorIncome)}/S</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
