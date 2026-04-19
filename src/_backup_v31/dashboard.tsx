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
import { useSettingsStore } from "@/store/settings-store";
import { Layers, ArrowLeftRight } from "lucide-react";

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

  const menuLayout = useSettingsStore((s) => s.settings.menuLayout ?? 'classic');

  if (!team || !agenda || !manager) return null;

  const xpPct = manager.xpToNextLevel > 0 ? Math.round((manager.xp / manager.xpToNextLevel) * 100) : 0;

  const unusedCards = (gameState?.cardInventory ?? []).filter(c => !c.isUsed && !c.isExpired).length;
  const injuredCount = teamPlayers.filter(p => p.injury).length;
  const lowMoraleCount = teamPlayers.filter(p => p.morale < 40).length;

  // ── Portal Dashboard (FM26-inspired tile hub) ──
  if (menuLayout === 'modern') {
    const BOOKMARKS = [
      { label: 'Taktik', href: '/game/tactics', icon: '🧠' },
      { label: 'Kader', href: '/game/squad', icon: '👥' },
      { label: 'Training', href: '/game/training', icon: '🏋️' },
      { label: 'Transfers', href: '/game/transfers', icon: '💼' },
      { label: 'Tabelle', href: '/game/table', icon: '🏆' },
      { label: 'Finanzen', href: '/game/finances', icon: '💰' },
    ];
    const unreadNews = allNews.filter(n => !n.isRead).length;
    const todayActions = agenda.items.filter(i => i.type === 'match' || i.type === 'transfer_offer' || i.type === 'training');
    return (
      <div className="space-y-4">
        {/* ═══ Bookmarks Bar ═══ */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {BOOKMARKS.map(bm => (
            <Link
              key={bm.href}
              href={bm.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium whitespace-nowrap shrink-0"
            >
              <span>{bm.icon}</span>
              <span>{bm.label}</span>
            </Link>
          ))}
        </div>

        {/* ═══ Header: Club + Date + Manager ═══ */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={36} />
            <div>
              <h1 className="font-display text-lg font-bold">{agenda.dayName}</h1>
              <p className="text-[10px] text-muted-foreground">
                {team.name} — {new Date(agenda.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                {season && <span className="ml-1">• Saison {season.year}</span>}
              </p>
            </div>
          </div>
          <Link href="/game/manager" className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-all shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
              {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-medium">{manager.firstName} {manager.lastName}</p>
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Lv. {manager.level}</span>
            </div>
          </Link>
        </div>

        {/* ═══ Main Portal Grid: Action Column | Content Area ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── Action Column (left, 2 cols) ── */}
          <div className="lg:col-span-2 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
            {[
              { icon: <Shield className="w-4 h-4" />, label: 'Taktik', href: '/game/tactics', color: 'text-amber-400' },
              { icon: <Users className="w-4 h-4" />, label: 'Kader', href: '/game/squad', color: 'text-green-400' },
              { icon: <Dumbbell className="w-4 h-4" />, label: 'Training', href: '/game/training', color: 'text-blue-400' },
              { icon: <ArrowLeftRight className="w-4 h-4" />, label: 'Transfers', href: '/game/transfers', color: 'text-purple-400' },
              { icon: <Star className="w-4 h-4" />, label: 'Jugend', href: '/game/youth', color: 'text-emerald-400' },
              { icon: <Layers className="w-4 h-4" />, label: 'Karten', href: '/game/cards', color: 'text-amber-400', badge: unusedCards > 0 ? unusedCards : undefined },
            ].map(action => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all shrink-0 relative group"
              >
                <span className={`${action.color} group-hover:scale-110 transition-transform`}>{action.icon}</span>
                <span className="text-[9px] text-muted-foreground font-medium">{action.label}</span>
                {action.badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">{action.badge}</span>
                )}
              </Link>
            ))}
          </div>

          {/* ── Content Area (right, 10 cols) ── */}
          <div className="lg:col-span-10 space-y-4">

            {/* Row 1: Hero Match Tile + Calendar Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Hero Tile: Next Match (3 cols) */}
              <div className="lg:col-span-3">
                <div className={`h-full rounded-xl border-2 p-5 flex flex-col justify-between transition-all ${
                  nextMatchCountdown?.days === 0
                    ? 'border-red-500/50 bg-gradient-to-br from-red-500/15 to-red-500/5'
                    : 'border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-primary/70">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-medium">Nächstes Spiel</span>
                    </div>
                    {nextMatchCountdown?.days === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold animate-pulse">SPIELTAG</span>
                    )}
                  </div>
                  {nextMatchCountdown ? (
                    <div className="mt-3">
                      <p className={`text-4xl font-display font-black ${nextMatchCountdown.days === 0 ? 'text-red-400' : 'text-primary'}`}>
                        {nextMatchCountdown.days === 0 ? 'HEUTE' : nextMatchCountdown.days === 1 ? 'MORGEN' : `${nextMatchCountdown.days} Tage`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {nextMatchCountdown.isHome ? '🏠 Heim' : '✈️ Auswärts'} vs. <span className="font-bold text-foreground">{nextMatchCountdown.opponent}</span>
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/game/tactics" className="text-[10px] px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium">🧠 Taktik</Link>
                        <Link href="/game/squad" className="text-[10px] px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium">👥 Aufstellung</Link>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-3">Kein Spiel geplant</p>
                  )}
                </div>
              </div>

              {/* Calendar Strip (2 cols) */}
              <div className="lg:col-span-2">
                <div className="h-full rounded-xl border border-border bg-card p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Kalender</p>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day) => (
                      <div
                        key={day.date}
                        className={`rounded-lg p-1 text-center ${
                          day.isToday ? "bg-primary/20 border border-primary" : day.isPast ? "bg-muted/20 text-muted-foreground" : "border border-border/50"
                        }`}
                      >
                        <p className={`text-[8px] font-bold ${day.isToday ? "text-primary" : ""}`}>{day.dayShort}</p>
                        <p className={`text-sm font-display ${day.isToday ? "text-primary font-bold" : ""}`}>{day.dayNum}</p>
                        {day.hasMatch && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
                      </div>
                    ))}
                  </div>
                  {/* Last results compact */}
                  {recentForm.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-[9px] text-muted-foreground mb-1">Letzte Ergebnisse</p>
                      <div className="flex gap-1">
                        {recentForm.map((f, i) => (
                          <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white ${
                            f.result === 'W' ? 'bg-green-500' : f.result === 'L' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} title={`${f.score} vs ${f.opponent}`}>
                            {f.result === 'W' ? 'S' : f.result === 'L' ? 'N' : 'U'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Info Tiles (3×2) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Table Position */}
              <Link href="/game/table" className="group">
                <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all h-full flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Tabelle</span>
                    <Link href="/game/table" className="ml-auto text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</Link>
                  </div>
                  <p className="text-3xl font-display font-black mt-2">{myTableEntry?.position ?? "—"}<span className="text-sm font-normal text-muted-foreground">.</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{myTableEntry?.points ?? 0} Pkt • {myTableEntry?.played ?? 0} Sp</p>
                  {table.length > 0 && (
                    <div className="mt-auto pt-2 space-y-0.5">
                      {table.slice(Math.max(0, (myTableEntry?.position ?? 1) - 2), (myTableEntry?.position ?? 1) + 1).map(e => {
                        const t = teams.find(tm => tm.id === e.teamId);
                        const isMe = e.teamId === currentTeamId;
                        return (
                          <div key={e.teamId} className={`flex items-center justify-between text-[9px] ${isMe ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            <span>{e.position}. {t?.shortName ?? '?'}</span>
                            <span>{e.points}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Link>

              {/* Squad */}
              <Link href="/game/squad" className="group">
                <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all h-full flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>Kader</span>
                  </div>
                  <p className="text-3xl font-display font-black mt-2">{avgOverall}<span className="text-sm font-normal text-muted-foreground"> Ø</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{teamPlayers.length} Spieler</p>
                  <div className="mt-auto pt-2 space-y-0.5">
                    {injuredCount > 0 && <p className="text-[10px] text-red-400">🏥 {injuredCount} verletzt</p>}
                    {lowMoraleCount > 0 && <p className="text-[10px] text-amber-400">😞 {lowMoraleCount} niedrige Moral</p>}
                    {injuredCount === 0 && lowMoraleCount === 0 && <p className="text-[10px] text-green-400">✓ Kader fit</p>}
                  </div>
                </div>
              </Link>

              {/* Finances */}
              <Link href="/game/finances" className="group">
                <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all h-full flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Finanzen</span>
                  </div>
                  <p className="text-2xl font-display font-black text-primary mt-2">{formatValue(finances?.transferBudget ?? 0)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Kaderwert: {formatValue(squadValue)}</p>
                  {mainSponsor && (
                    <p className="text-[9px] text-blue-400 mt-auto pt-2">🤝 {mainSponsor.name}</p>
                  )}
                </div>
              </Link>

              {/* Mood Barometer */}
              <Link href="/game/squad" className="group">
                <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all h-full flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Heart className="w-3.5 h-3.5" />
                    <span>Stimmung</span>
                  </div>
                  <div className="mt-3 space-y-2 flex-1">
                    {[
                      { label: 'Moral', value: avgMorale, color: avgMorale >= 70 ? 'bg-green-500' : avgMorale >= 45 ? 'bg-yellow-500' : 'bg-red-500' },
                      { label: 'Fitness', value: avgCondition, color: avgCondition >= 70 ? 'bg-green-500' : avgCondition >= 45 ? 'bg-yellow-500' : 'bg-red-500' },
                      { label: 'Rep.', value: teamReputation, color: teamReputation >= 70 ? 'bg-green-500' : teamReputation >= 45 ? 'bg-yellow-500' : 'bg-red-500' },
                    ].map(m => (
                      <div key={m.label} className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground w-9">{m.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
                        </div>
                        <span className="text-[9px] font-mono font-bold w-5 text-right">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>

              {/* Form Curve */}
              <Link href="/game/stats" className="group">
                <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all h-full flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Formkurve</span>
                  </div>
                  {recentForm.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground mt-4 text-center flex-1 flex items-center justify-center">Noch keine Ergebnisse</p>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 mt-3 flex-1">
                      {recentForm.map((f, i) => (
                        <div key={i} className="text-center">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${
                            f.result === 'W' ? 'bg-green-500' : f.result === 'L' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}>
                            {f.result === 'W' ? 'S' : f.result === 'L' ? 'N' : 'U'}
                          </div>
                          <p className="text-[7px] text-muted-foreground mt-0.5">{f.score}</p>
                          <p className="text-[6px] text-muted-foreground truncate w-8">{f.opponent}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>

              {/* Cards */}
              <Link href="/game/cards" className="group">
                <div className={`rounded-xl border p-4 hover:border-primary/40 transition-all h-full flex flex-col ${unusedCards > 0 ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card' : 'border-border bg-card'}`}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Karten</span>
                  </div>
                  <p className={`text-3xl font-display font-black mt-2 ${unusedCards > 0 ? 'text-amber-400' : ''}`}>{unusedCards}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">verfügbar zum Einlösen</p>
                  {(() => {
                    const expiringSoon = (gameState?.cardInventory ?? []).filter(c => !c.isUsed && !c.isExpired && c.expiresDate).filter(c => {
                      const days = Math.ceil((new Date(c.expiresDate!).getTime() - new Date(gameState!.currentDate).getTime()) / 86400000);
                      return days <= 3 && days >= 0;
                    }).length;
                    return expiringSoon > 0 ? <p className="text-[9px] text-red-400 mt-auto pt-2">⚠ {expiringSoon} laufen bald ab</p> : null;
                  })()}
                </div>
              </Link>
            </div>

            {/* Row 3: News & Tasks Feed */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">Neuigkeiten & Aufgaben</span>
                  {unreadNews > 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">{unreadNews} neu</span>
                  )}
                </div>
                <Link href="/game/news" className="text-[10px] text-primary hover:underline">Alle →</Link>
              </div>

              {/* Pending Actions */}
              {todayActions.length > 0 && (
                <div className="px-4 pb-2 space-y-1.5">
                  {todayActions.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                      <span className="text-sm">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold">{item.title}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{item.description}</p>
                      </div>
                      {item.type === 'match' && item.link && (
                        <Button size="sm" className="text-[9px] h-6 gap-1 shrink-0" onClick={() => {
                          const matchId = (item.meta as Record<string, string>)?.matchId;
                          advanceOneDay();
                          router.push(`/game/match/${matchId}`);
                        }}>
                          Spielen <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                      {item.type === 'match' && !item.link && (
                        <Button size="sm" variant="outline" className="text-[9px] h-6 gap-1 shrink-0" onClick={() => advanceOneDay()}>
                          Sim <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* News List */}
              <div className="px-4 pb-3 space-y-1">
                {news.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3">Keine Neuigkeiten</p>
                ) : (
                  news.slice(0, 5).map(item => (
                    <div key={item.id} className={`flex items-center gap-2 py-1.5 border-l-2 pl-2 ${!item.isRead ? 'border-l-primary' : 'border-l-border/50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] truncate ${!item.isRead ? 'font-bold' : ''}`}>{item.title}</p>
                        <p className="text-[9px] text-muted-foreground">{item.date}</p>
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

  // ── Classic Dashboard (original) ──
  return (
    <div className="space-y-5">
      {/* ── Day Header + Manager Quick Info ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold">{agenda.dayName}</h1>
            <p className="text-sm text-muted-foreground">
              {team.name} — {new Date(agenda.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
              {season && <span className="ml-1">• Saison {season.year}</span>}
            </p>
          </div>
        </div>
        {/* Manager Level Badge */}
        <Link href="/game/manager" className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-all shrink-0">
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

      {/* Week Calendar */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day) => (
          <div
            key={day.date}
            className={`rounded-lg p-2 text-center text-xs transition-all ${
              day.isToday
                ? "bg-primary/20 border-2 border-primary"
                : day.isPast
                ? "bg-muted/30 text-muted-foreground"
                : "bg-card border border-border"
            }`}
          >
            <p className={`font-bold ${day.isToday ? "text-primary" : ""}`}>{day.dayShort}</p>
            <p className={`text-lg font-display ${day.isToday ? "text-primary font-bold" : ""}`}>{day.dayNum}</p>
            {day.hasMatch && (
              <span className="inline-block bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1">
                ⚽ {day.matchOpponent}
              </span>
            )}
            {day.hasTraining && !day.hasMatch && (
              <span className="inline-block bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded-full mt-1">🏋️</span>
            )}
            {day.hasPressConference && !day.hasMatch && (
              <span className="inline-block bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded-full mt-1">🎙️</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Today's Events ── */}
      {agenda.items.some((i) => i.type === "match" || i.type === "transfer_offer" || i.type === "injury_return" || i.type === "training") && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              📋 Heute
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agenda.items.filter((i) => i.type !== "rest_day" && i.type !== "news_event" && i.type !== "press_conference").map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {item.type === "match" && item.link && (
                  <Button size="sm" className="text-xs gap-1 shrink-0" onClick={() => {
                    const matchId = (item.meta as Record<string, string>)?.matchId;
                    advanceOneDay();
                    router.push(`/game/match/${matchId}`);
                  }}>
                    Spiel starten <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
                {item.type === "match" && !item.link && (
                  <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={() => {
                    advanceOneDay();
                  }}>
                    Simulieren <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
                {item.type === "transfer_offer" && (
                  <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={() => router.push(item.link!)}>
                    Ansehen <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
                {item.type === "training" && (
                  <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={() => router.push(item.link!)}>
                    Training <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Trophy className="w-3.5 h-3.5" />Tabellenplatz</div>
            <p className="text-2xl font-bold">{myTableEntry?.position ?? "—"}<span className="text-sm text-muted-foreground font-normal">. Platz</span></p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="w-3.5 h-3.5" />Kaderstärke</div>
            <p className="text-2xl font-bold">{avgOverall}<span className="text-sm text-muted-foreground font-normal"> Ø GES</span></p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Wallet className="w-3.5 h-3.5" />Budget</div>
            <p className="text-2xl font-bold text-primary">{formatValue(finances?.transferBudget ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target className="w-3.5 h-3.5" />Kaderwert</div>
            <p className="text-2xl font-bold">{formatValue(squadValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── P5: Mood + Form + Countdown + Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Mood Barometer */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Heart className="w-4 h-4" />Stimmung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: 'Kader-Moral', value: avgMorale, icon: '😊', color: avgMorale >= 70 ? 'bg-green-500' : avgMorale >= 45 ? 'bg-yellow-500' : 'bg-red-500' },
              { label: 'Fitness', value: avgCondition, icon: '💪', color: avgCondition >= 70 ? 'bg-green-500' : avgCondition >= 45 ? 'bg-yellow-500' : 'bg-red-500' },
              { label: 'Reputation', value: teamReputation, icon: '⭐', color: teamReputation >= 70 ? 'bg-green-500' : teamReputation >= 45 ? 'bg-yellow-500' : 'bg-red-500' },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2">
                <span className="text-sm w-5">{m.icon}</span>
                <span className="text-[10px] text-muted-foreground w-16">{m.label}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${m.color} transition-all`} style={{ width: `${m.value}%` }} />
                </div>
                <span className="text-[10px] font-mono font-bold w-6 text-right">{m.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Curve */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" />Formkurve</CardTitle>
          </CardHeader>
          <CardContent>
            {recentForm.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Noch keine Ergebnisse</p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {recentForm.map((f, i) => (
                  <div key={i} className="text-center">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                      f.result === 'W' ? 'bg-green-500' : f.result === 'L' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}>
                      {f.result === 'W' ? 'S' : f.result === 'L' ? 'N' : 'U'}
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{f.score}</p>
                    <p className="text-[7px] text-muted-foreground truncate w-9">{f.opponent}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Match Countdown + Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />Nächstes Spiel</CardTitle>
          </CardHeader>
          <CardContent>
            {nextMatchCountdown ? (
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-primary">
                  {nextMatchCountdown.days === 0 ? 'HEUTE' : nextMatchCountdown.days === 1 ? 'MORGEN' : `${nextMatchCountdown.days} Tage`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {nextMatchCountdown.isHome ? '🏠 Heim' : '✈️ Auswärts'} vs. {nextMatchCountdown.opponent}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Kein Spiel geplant</p>
            )}
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <Link href="/game/training" className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[8px] text-muted-foreground">Training</span>
              </Link>
              <Link href="/game/tactics" className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[8px] text-muted-foreground">Taktik</span>
              </Link>
              <Link href="/game/squad" className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <Users className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[8px] text-muted-foreground">Kader</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Grid: Missions + Next Match Opponent Manager + Table + News ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left Column: Missions + Manager Skills */}
        <div className="space-y-4">
          {/* Weekly Missions */}
          <Card className="bg-card border-border border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary">Wöchentliche Missionen</span>
                </CardTitle>
                <Link href="/game/manager" className="text-[10px] text-primary hover:underline">Alle →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(manager.activeMissions ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Keine aktiven Missionen.</p>
              ) : (
                (manager.activeMissions ?? []).map(mission => {
                  const progressPct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0;
                  const canClaim = mission.progress >= mission.target && !mission.isCompleted;
                  return (
                    <div key={mission.id} className={`p-2.5 rounded-lg border ${mission.isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">{mission.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold ${mission.isCompleted ? 'text-emerald-400 line-through' : ''}`}>
                            {mission.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${mission.isCompleted ? 'bg-emerald-500' : canClaim ? 'bg-primary animate-pulse' : 'bg-primary/60'}`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground">{mission.progress}/{mission.target}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[8px] px-1 py-0.5 rounded-full bg-primary/15 text-primary">+{mission.reward.xp} XP</span>
                            {mission.reward.skillBoost && (
                              <span className="text-[8px] px-1 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                                +{mission.reward.skillBoost.amount} {SKILL_NAMES[mission.reward.skillBoost.skill].name}
                              </span>
                            )}
                          </div>
                          {canClaim && (
                            <Button size="sm" className="mt-1.5 h-5 text-[9px] w-full" onClick={() => handleClaimMission(mission.id)}>
                              ✨ Einsammeln
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Manager Skill Effects Info */}
          {managerEffects && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />Deine Skill-Effekte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {[
                  { label: 'Teamstärke (Taktik)', value: `+${managerEffects.tacticsBonus.toFixed(1)}%`, icon: '🧠' },
                  { label: 'Weniger Fouls (Disziplin)', value: `-${managerEffects.disciplineBonus.toFixed(0)}%`, icon: '⚖️' },
                  { label: 'Kondition (Fitness)', value: `-${managerEffects.fitnessBonus.toFixed(1)}% Drain`, icon: '💪' },
                  { label: 'Heimvorteil (Medien)', value: `+${managerEffects.homeBonus.toFixed(1)}`, icon: '📺' },
                  { label: 'Training', value: `+${managerEffects.trainingEfficiency.toFixed(0)}%`, icon: '🏋️' },
                  { label: 'Jugendentwicklung', value: `+${managerEffects.youthDevBonus.toFixed(0)}%`, icon: '🌱' },
                  { label: 'Transferrabatt', value: `-${managerEffects.negotiationDiscount.toFixed(1)}%`, icon: '🤝' },
                ].map(e => (
                  <div key={e.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1"><span>{e.icon}</span>{e.label}</span>
                    <span className="font-mono font-medium text-primary">{e.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle Column: Table + Next Match Opponent Manager */}
        <div className="space-y-4">
          {/* Next Match Opponent Manager */}
          {opponentManager && agenda.weekMatch && (
            <Card className="bg-card border-border border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Gegner-Trainer</span>
                  <span className="text-[10px] font-normal text-muted-foreground ml-auto">
                    {agenda.weekMatch.daysAway === 0 ? 'HEUTE' : `in ${agenda.weekMatch.daysAway}d`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-sm font-bold text-amber-400">
                    {opponentManager.firstName.charAt(0)}{opponentManager.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{opponentManager.firstName} {opponentManager.lastName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {agenda.weekMatch.opponentName} • Lv. {opponentManager.level} • {opponentManager.nationality}
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
                <div className="mt-2 pt-2 border-t border-border flex justify-between text-[10px] text-muted-foreground">
                  <span>Bilanz: {opponentManager.stats.wins}S {opponentManager.stats.draws}U {opponentManager.stats.losses}N</span>
                  {opponentManager.traits.length > 0 && (
                    <span>{opponentManager.traits.map(t => t.icon).join(' ')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* League Table */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Trophy className="w-4 h-4" />{league?.name ?? "Tabelle"}</CardTitle>
                <Link href="/game/table" className="text-[10px] text-primary hover:underline">Vollständig →</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-muted-foreground"><th className="text-center px-2 py-1.5 w-6">#</th><th className="text-left px-2 py-1.5">Verein</th><th className="text-center px-2 py-1.5 w-8">Sp</th><th className="text-center px-2 py-1.5 w-8">Pkt</th></tr></thead>
                <tbody>
                  {table.slice(0, 6).map((entry) => {
                    const t = teams.find((tm) => tm.id === entry.teamId);
                    const isMe = entry.teamId === currentTeamId;
                    return (
                      <tr key={entry.teamId} className={`border-b border-border/30 ${isMe ? "bg-primary/5 font-semibold" : ""}`}>
                        <td className="text-center px-2 py-1.5">{entry.position}</td>
                        <td className="px-2 py-1.5"><span className={isMe ? "text-primary" : ""}>{t?.name ?? "?"}</span></td>
                        <td className="text-center px-2 py-1.5">{entry.played}</td>
                        <td className="text-center px-2 py-1.5 font-bold">{entry.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Top Players + News */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" />Torjäger & Vorlagen</CardTitle>
                <Link href="/game/stats" className="text-[10px] text-primary hover:underline">Statistiken →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(() => {
                const withGoals = [...teamPlayers].filter(p => p.stats.goals > 0 || p.stats.assists > 0)
                  .sort((a, b) => (b.stats.goals + b.stats.assists) - (a.stats.goals + a.stats.assists))
                  .slice(0, 5);
                if (withGoals.length === 0) {
                  return topPlayers.map((p) => {
                    const ov = calcOverall(p);
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold w-6 ${ov >= 75 ? "text-green-400" : ov >= 65 ? "text-yellow-400" : "text-orange-400"}`}>{ov}</span>
                        <span className="text-sm flex-1 truncate">{p.lastName}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{p.position}</span>
                      </div>
                    );
                  });
                }
                return withGoals.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`text-xs font-mono w-4 ${i === 0 ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>{i + 1}</span>
                    <span className="text-sm flex-1 truncate">{p.lastName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{p.position}</span>
                    <span className="text-xs font-bold text-green-400 w-5 text-right">{p.stats.goals > 0 ? p.stats.goals : ''}</span>
                    <span className="text-[9px] text-muted-foreground w-2">⚽</span>
                    <span className="text-xs font-bold text-blue-400 w-5 text-right">{p.stats.assists > 0 ? p.stats.assists : ''}</span>
                    <span className="text-[9px] text-muted-foreground w-2">🅰️</span>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>

          {/* Sponsors Widget */}
          {activeSponsors.length > 0 && (
            <Card className="bg-card border-border border-blue-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-400">Sponsoren</span>
                  </CardTitle>
                  <Link href="/game/finances" className="text-[10px] text-primary hover:underline">Details →</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {mainSponsor && (
                  <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-wider text-blue-400/70">Hauptsponsor</p>
                        <p className="text-sm font-bold truncate">{mainSponsor.name}</p>
                      </div>
                      <p className="text-xs font-bold text-blue-400 whitespace-nowrap shrink-0">{formatValue(mainSponsor.amountPerSeason)}<span className="text-[9px] font-normal text-muted-foreground">/S</span></p>
                    </div>
                  </div>
                )}
                {activeSponsors.filter(s => s !== mainSponsor).slice(0, 2).map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-[11px] px-1">
                    <span className="text-muted-foreground truncate min-w-0">{s.name}</span>
                    <span className="font-mono text-blue-400 whitespace-nowrap shrink-0">{formatValue(s.amountPerSeason)}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-border flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-muted-foreground">{activeSponsors.length} Verträge</span>
                  <span className="font-bold text-blue-400 whitespace-nowrap shrink-0">{formatValue(totalSponsorIncome)}/Saison</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Newspaper className="w-4 h-4" />Neuigkeiten</CardTitle>
                <Link href="/game/news" className="text-[10px] text-primary hover:underline">Alle →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {news.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Keine Neuigkeiten.</p>
              ) : (
                <div className="space-y-2">
                  {news.map((item) => (
                    <div key={item.id} className={`text-xs border-l-2 pl-2 py-1 ${!item.isRead ? "border-l-primary" : "border-l-border"}`}>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{item.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
