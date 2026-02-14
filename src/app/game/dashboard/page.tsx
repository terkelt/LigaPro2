"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Newspaper, Users, Wallet, Target, ChevronRight, Zap, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/game-store";
import {
  calcOverall, formatValue,
  useMyPlayers, useMyTeam, useLeagues, useTables,
  useMyFinances, useNews, useCurrentTeamId, useTeams, useSeason, usePreseason, useManager,
} from "@/store/selectors";
import { computeDayAgenda, computeWeekCalendar } from "@/lib/day-agenda";
import { useEffect, useCallback } from "react";
import { SKILL_NAMES, ManagerSkills } from "@/types/manager";
import { completeMission, calcManagerEffects } from "@/lib/manager-engine";

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

  return (
    <div className="space-y-5">
      {/* ── Day Header + Manager Quick Info ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{agenda.dayName}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(agenda.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            {season && <span className="ml-2">— Saison {season.year}</span>}
          </p>
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
                {item.type === "match" && (
                  <Button size="sm" className="text-xs gap-1 shrink-0" onClick={() => {
                    const matchId = (item.meta as Record<string, string>)?.matchId;
                    advanceOneDay();
                    router.push(`/game/match/${matchId}`);
                  }}>
                    Spiel starten <ChevronRight className="w-3 h-3" />
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
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" />Beste Spieler</CardTitle>
                <Link href="/game/squad" className="text-[10px] text-primary hover:underline">Kader →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {topPlayers.map((p) => {
                const ov = calcOverall(p);
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold w-6 ${ov >= 75 ? "text-green-400" : ov >= 65 ? "text-yellow-400" : "text-orange-400"}`}>{ov}</span>
                    <span className="text-sm flex-1 truncate">{p.lastName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{p.position}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

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
