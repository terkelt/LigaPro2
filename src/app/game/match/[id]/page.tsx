"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResults, useTeams, useAllPlayers, useCurrentTeamId, useSchedules, useTactics, calcOverall } from "@/store/selectors";
import { useGameStore } from "@/store/game-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, Code2, Pause, Play, FastForward, SkipForward, ArrowRightLeft } from "lucide-react";
import { TeamLogo } from "@/components/ui/team-logo";
import { MatchEvent, MatchResult } from "@/types/match";
import { Player } from "@/types/player";
import { createLiveMatch, advanceLiveMatch, finalizeLiveMatch, performPlayerSubstitution, LiveMatchContext, applyShout, applyHalftimeTalk, SHOUT_CATALOG, HALFTIME_TALKS, ShoutType, HalftimeTalkType } from "@/lib/match-engine";

// ── Constants ──

const EVENT_ICON: Record<string, string> = {
  goal: "⚽", assist: "🅰️", shot_saved: "🧤", shot_missed: "💨", shot_blocked: "🛡️", shot_post: "🥅",
  foul: "⚠️", yellow_card: "🟨", red_card: "🟥", second_yellow: "🟨🟥", substitution: "🔄",
  injury: "🏥", penalty_scored: "⚽🎯", penalty_missed: "❌🎯", penalty_saved: "🧤🎯",
  free_kick_goal: "⚽💫", corner: "📐", offside: "🚩", kick_off: "▶️",
  half_time: "⏸️", full_time: "🏁", extra_time_start: "⏱️", extra_time_end: "🏁", penalty_shootout: "🎯",
  tactical: "📣",
};

const EVENT_IMPORTANCE: Record<string, number> = {
  goal: 3, penalty_scored: 3, free_kick_goal: 3, penalty_missed: 3, penalty_saved: 3,
  red_card: 3, second_yellow: 3,
  shot_saved: 2, shot_post: 2, yellow_card: 2, substitution: 2,
  shot_missed: 1, foul: 1, corner: 1, offside: 1,
  kick_off: 2, half_time: 3, full_time: 3,
  assist: 0,
};

const SPEED_MS = { slow: 1200, normal: 500, fast: 150, instant: 0 };
type SimSpeed = keyof typeof SPEED_MS;

// ── Small Components ──

function RatingBadge({ rating }: { rating: number }) {
  const c = rating >= 8 ? "bg-green-500/20 text-green-400" : rating >= 7 ? "bg-emerald-500/20 text-emerald-400" : rating >= 6 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400";
  return <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${c}`}>{rating.toFixed(1)}</span>;
}

function StatBar({ label, home, away, suffix = "" }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium w-10 text-right">{home}{suffix}</span>
        <span className="text-muted-foreground flex-1 text-center">{label}</span>
        <span className="font-medium w-10">{away}{suffix}</span>
      </div>
      <div className="flex h-1 rounded-full overflow-hidden bg-secondary">
        <div className="bg-primary/70 rounded-l-full" style={{ width: `${(home / total) * 100}%` }} />
        <div className="bg-accent/70 rounded-r-full flex-1" />
      </div>
    </div>
  );
}

function TickerEvent({ event, homeTeamId, devMode }: { event: MatchEvent; homeTeamId: string; devMode: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const icon = EVENT_ICON[event.type] ?? "•";
  const isHome = event.teamId === homeTeamId;
  const imp = EVENT_IMPORTANCE[event.type] ?? 1;
  const hasDev = devMode && event.devLog && event.devLog.length > 0;

  const bg =
    event.type === 'goal' || event.type === 'penalty_scored' || event.type === 'free_kick_goal' ? 'bg-green-500/10 border-green-500/30' :
    event.type === 'red_card' || event.type === 'second_yellow' ? 'bg-red-500/10 border-red-500/30' :
    event.type === 'substitution' ? 'bg-blue-500/8 border-blue-500/20' :
    event.type === 'half_time' || event.type === 'full_time' || event.type === 'kick_off' ? 'bg-secondary/30 border-border/50' :
    'bg-card/50 border-border/30';

  return (
    <div className={`rounded-lg border p-2 ${bg} ${imp >= 2 ? '' : 'opacity-70'} animate-in fade-in slide-in-from-left-2 duration-200`}>
      <div className={`flex items-start gap-2 ${hasDev ? 'cursor-pointer' : ''}`} onClick={() => hasDev && setExpanded(!expanded)}>
        <span className="text-muted-foreground w-10 text-right shrink-0 font-mono text-xs pt-0.5">{event.minute}&apos;</span>
        <span className="w-6 text-center shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs ${imp >= 3 ? 'font-bold' : imp >= 2 ? 'font-medium' : 'text-muted-foreground'}`}>{event.description}</p>
          {event.type !== 'kick_off' && event.type !== 'half_time' && event.type !== 'full_time' && event.teamId && (
            <p className="text-[9px] text-muted-foreground mt-0.5">{isHome ? '⬅ Heim' : '➡ Gast'}</p>
          )}
        </div>
        {hasDev && <span className="text-muted-foreground shrink-0 pt-0.5">{expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>}
      </div>
      {expanded && event.devLog && (
        <div className="mt-2 ml-[4.5rem] p-2 rounded bg-black/30 border border-border/30 font-mono text-[9px] text-emerald-400/80 space-y-0.5 overflow-x-auto whitespace-pre-wrap">
          {event.devLog.map((line, i) => (
            <p key={i} className={line.startsWith('═') || line.startsWith('╔') || line.startsWith('╚') ? 'text-yellow-400/80 font-bold' : line.startsWith('📋') ? 'text-sky-400/90 font-bold mt-1' : ''}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const results = useResults();
  const teams = useTeams();
  const allPlayers = useAllPlayers();
  const currentTeamId = useCurrentTeamId();
  const schedules = useSchedules();
  const { tactics, activeTactic } = useTactics();
  const gameState = useGameStore((s) => s.gameState);
  const advanceOneDay = useGameStore((s) => s.advanceOneDay);
  const matchId = params.id as string;

  // Check if result already exists (already-played match)
  const existingResult = useMemo(() => results.find((r) => r.id === matchId) ?? null, [results, matchId]);

  // Find the unplayed match from schedule
  const unplayedMatch = useMemo(() => {
    if (existingResult) return null;
    for (const sched of schedules) {
      for (const m of sched.matches) {
        if (m.id === matchId && !m.isPlayed) return m;
      }
    }
    return null;
  }, [schedules, matchId, existingResult]);

  // ── LIVE MATCH STATE ──
  const [liveCtx, setLiveCtx] = useState<LiveMatchContext | null>(null);
  const [displayEvents, setDisplayEvents] = useState<MatchEvent[]>([]);
  const [speed, setSpeed] = useState<SimSpeed>("normal");
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveResult, setLiveResult] = useState<MatchResult | null>(null);
  const [showSubPanel, setShowSubPanel] = useState(false);
  const [subOut, setSubOut] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerEndRef = useRef<HTMLDivElement>(null);

  const [devMode, setDevMode] = useState(true);
  const [filterLevel, setFilterLevel] = useState<number>(1);

  // Initialize live match context
  useEffect(() => {
    if (!unplayedMatch || liveCtx) return;
    const homeTeam = teams.find(t => t.id === unplayedMatch.homeTeamId);
    const awayTeam = teams.find(t => t.id === unplayedMatch.awayTeamId);
    if (!homeTeam || !awayTeam) return;

    const isPlayerHome = unplayedMatch.homeTeamId === currentTeamId;
    const isPlayerAway = unplayedMatch.awayTeamId === currentTeamId;
    const activeTac = tactics ? tactics[activeTactic as 'a' | 'b' | 'c'] : null;
    const lineup = activeTac?.lineup ?? [];

    const gs = gameState;
    const homeSkills = unplayedMatch.homeTeamId === currentTeamId
      ? gs?.manager.skills
      : gs?.aiManagers?.[unplayedMatch.homeTeamId]?.skills;
    const awaySkills = unplayedMatch.awayTeamId === currentTeamId
      ? gs?.manager.skills
      : gs?.aiManagers?.[unplayedMatch.awayTeamId]?.skills;

    const playerFormation = activeTac?.formation;
    const ctx = createLiveMatch(
      unplayedMatch, homeTeam, awayTeam, allPlayers, currentTeamId,
      isPlayerHome ? lineup : undefined,
      isPlayerAway ? lineup : undefined,
      homeSkills, awaySkills,
      isPlayerHome ? playerFormation : undefined,
      isPlayerAway ? playerFormation : undefined,
    );
    setLiveCtx(ctx);
    setDisplayEvents([...ctx.events]);
  }, [unplayedMatch, teams, allPlayers, currentTeamId, tactics, liveCtx]);

  // Auto-scroll ticker
  useEffect(() => {
    tickerEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayEvents]);

  // Timer tick for live simulation
  const tick = useCallback(() => {
    if (!liveCtx || liveCtx.isFinished) {
      setIsPlaying(false);
      return;
    }
    const newEvents = advanceLiveMatch(liveCtx);
    setDisplayEvents(prev => [...prev, ...newEvents.filter(e => e.type !== 'assist')]);
    setLiveCtx({ ...liveCtx }); // trigger re-render

    if (liveCtx.isFinished) {
      setIsPlaying(false);
      const result = finalizeLiveMatch(liveCtx);
      setLiveResult(result);
      // Save result: advance the day with the live result
      advanceOneDay(result);
      useGameStore.getState().autoSaveGame();
    }
  }, [liveCtx, advanceOneDay]);

  useEffect(() => {
    if (!isPlaying || !liveCtx) return;
    if (speed === 'instant') {
      // Simulate all remaining minutes at once
      const batchEvents: MatchEvent[] = [];
      while (!liveCtx.isFinished) {
        const evts = advanceLiveMatch(liveCtx);
        batchEvents.push(...evts.filter(e => e.type !== 'assist'));
      }
      setDisplayEvents(prev => [...prev, ...batchEvents]);
      setLiveCtx({ ...liveCtx });
      setIsPlaying(false);
      const result = finalizeLiveMatch(liveCtx);
      setLiveResult(result);
      advanceOneDay(result);
      useGameStore.getState().autoSaveGame();
      return;
    }
    timerRef.current = setTimeout(tick, SPEED_MS[speed]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, speed, tick, liveCtx, advanceOneDay]);

  // Handle substitution
  const handleSub = (playerInId: string) => {
    if (!liveCtx || !subOut) return;
    const ev = performPlayerSubstitution(liveCtx, subOut, playerInId);
    if (ev) {
      setDisplayEvents(prev => [...prev, ev]);
      setLiveCtx({ ...liveCtx });
    }
    setSubOut(null);
    setShowSubPanel(false);
  };

  // ── Determine what to show ──
  const result = liveResult ?? existingResult;
  const isLive = !!liveCtx && !liveResult && !existingResult;
  const homeTeamId = liveCtx?.homeTeam.id ?? result?.homeTeamId ?? '';
  const awayTeamId = liveCtx?.awayTeam.id ?? result?.awayTeamId ?? '';
  const homeTeam = teams.find(t => t.id === homeTeamId);
  const awayTeam = teams.find(t => t.id === awayTeamId);
  const homeScore = liveCtx?.homeScore ?? result?.homeScore ?? 0;
  const awayScore = liveCtx?.awayScore ?? result?.awayScore ?? 0;
  const currentMin = liveCtx?.currentMinute ?? 90;
  const weather = liveCtx?.weather ?? result?.weather;

  // Events to display
  const eventsToShow = result && !isLive ? result.events : displayEvents;
  const filteredEvents = eventsToShow.filter(e => {
    if (e.type === 'assist') return false;
    return (EVENT_IMPORTANCE[e.type] ?? 1) >= filterLevel;
  });

  // Player lookup
  const findPlayer = (id?: string) => id ? allPlayers.find(p => p.id === id) ?? null : null;

  // Bench for substitutions
  const isPlayerHome = homeTeamId === currentTeamId;
  const activePlayers = isLive ? (isPlayerHome ? liveCtx!.homePlayers : liveCtx!.awayPlayers) : [];
  const allTeamPlayers = isLive ? (isPlayerHome ? liveCtx!.allHomePlayers : liveCtx!.allAwayPlayers) : [];
  const activeIds = new Set(activePlayers.map(p => p.id));
  const benchPlayers = allTeamPlayers.filter(p => !activeIds.has(p.id));
  const playerSubs = isPlayerHome ? (liveCtx?.homeSubs ?? 0) : (liveCtx?.awaySubs ?? 0);

  if (!homeTeam && !awayTeam && !liveCtx) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Zurück</Button>
        <p className="text-muted-foreground text-center py-16">Spiel nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/game/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />{liveResult || existingResult ? 'Zurück' : 'Abbrechen'}
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Controls */}
          {isLive && (
            <>
              <div className="flex items-center rounded-md border border-border overflow-hidden">
                <button onClick={() => { setIsPlaying(false); }} className={`px-2 py-1 text-xs ${!isPlaying ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/30'}`}>
                  <Pause className="w-3 h-3" />
                </button>
                <button onClick={() => { setSpeed('slow'); setIsPlaying(true); }} className={`px-2 py-1 text-xs ${isPlaying && speed === 'slow' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/30'}`}>
                  <Play className="w-3 h-3" />
                </button>
                <button onClick={() => { setSpeed('normal'); setIsPlaying(true); }} className={`px-2 py-1 text-xs ${isPlaying && speed === 'normal' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/30'}`}>
                  <FastForward className="w-3 h-3" />
                </button>
                <button onClick={() => { setSpeed('fast'); setIsPlaying(true); }} className={`px-2 py-1 text-[9px] font-bold ${isPlaying && speed === 'fast' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/30'}`}>
                  4×
                </button>
                <button onClick={() => { setSpeed('instant'); setIsPlaying(true); }} className={`px-2 py-1 text-xs ${speed === 'instant' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/30'}`}>
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
              {playerSubs < 3 && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setIsPlaying(false); setShowSubPanel(!showSubPanel); }}>
                  <ArrowRightLeft className="w-3 h-3" />Wechsel ({playerSubs}/3)
                </Button>
              )}
            </>
          )}
          <Button variant={devMode ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1" onClick={() => setDevMode(!devMode)}>
            <Code2 className="w-3 h-3" />{devMode ? "Dev AN" : "Dev AUS"}
          </Button>
          <div className="flex rounded-md border border-border overflow-hidden">
            {[{ l: 1, t: "Alle" }, { l: 2, t: "Wichtig" }, { l: 3, t: "Tore" }].map(({ l, t }) => (
              <button key={l} onClick={() => setFilterLevel(l)} className={`px-2 py-1 text-[10px] ${filterLevel === l ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/30'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Score Header */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center gap-6 py-6 px-4">
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-3">
                <div>
                  <p className="text-lg font-bold">{homeTeam?.name}</p>
                  <p className="text-xs text-muted-foreground">Heim</p>
                </div>
                <TeamLogo teamId={homeTeam?.id ?? ''} teamName={homeTeam?.name ?? ''} shortName={homeTeam?.shortName} colors={homeTeam?.colors} size={40} />
              </div>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-display font-bold">{homeScore} <span className="text-muted-foreground">:</span> {awayScore}</p>
              {isLive && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-400 font-bold">{currentMin}&apos;</span>
                </div>
              )}
              {!isLive && result && <p className="text-xs text-muted-foreground mt-1">{result.date} | Spieltag {result.matchday}</p>}
              {weather && <p className="text-[10px] text-muted-foreground">{weather.description}, {weather.temperature}°C</p>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <TeamLogo teamId={awayTeam?.id ?? ''} teamName={awayTeam?.name ?? ''} shortName={awayTeam?.shortName} colors={awayTeam?.colors} size={40} />
                <div>
                  <p className="text-lg font-bold">{awayTeam?.name}</p>
                  <p className="text-xs text-muted-foreground">Gast</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Substitution Panel */}
      {showSubPanel && isLive && (
        <Card className="bg-card border-border border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              Auswechslung ({playerSubs}/3)
              <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => { setShowSubPanel(false); setSubOut(null); }}>Schließen</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!subOut ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Wähle den Spieler, der RAUS soll:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {activePlayers.filter(p => p.position !== 'TW').map(p => {
                    const stam = liveCtx?.stamina[p.id] ?? 80;
                    const stamColor = stam > 60 ? 'text-green-400' : stam > 35 ? 'text-yellow-400' : 'text-red-400';
                    return (
                      <button key={p.id} onClick={() => setSubOut(p.id)}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-secondary/30 transition-all text-left">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.lastName}</p>
                          <p className="text-[10px] text-muted-foreground">{p.position} • GES {calcOverall(p)}</p>
                        </div>
                        <span className={`text-[10px] font-mono ${stamColor}`}>{Math.round(stam)}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">RAUS:</span>
                  <span className="text-xs font-bold text-red-400">{findPlayer(subOut)?.lastName}</span>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={() => setSubOut(null)}>Ändern</Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Wähle den Ersatzspieler:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {benchPlayers.filter(p => p.position !== 'TW').sort((a, b) => calcOverall(b) - calcOverall(a)).map(p => (
                    <button key={p.id} onClick={() => handleSub(p.id)}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.lastName}</p>
                        <p className="text-[10px] text-muted-foreground">{p.position} • GES {calcOverall(p)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Coaching Interventions Panel */}
      {isLive && liveCtx && !liveCtx.isFinished && (
        <Card className="bg-card border-border border-emerald-500/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">📣 Reinrufe:</span>
              {SHOUT_CATALOG.map(s => {
                const onCooldown = liveCtx.currentMinute < liveCtx.shoutCooldownUntil;
                const isActive = liveCtx.shoutActive?.type === s.type && liveCtx.currentMinute <= (liveCtx.shoutActive?.expiresAt ?? 0);
                return (
                  <Button
                    key={s.type}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-7 gap-1 ${isActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    disabled={onCooldown && !isActive}
                    title={s.description}
                    onClick={() => {
                      if (!liveCtx || isActive) return;
                      const ev = applyShout(liveCtx, s.type as ShoutType);
                      if (ev) {
                        setDisplayEvents(prev => [...prev, ev]);
                        setLiveCtx({ ...liveCtx });
                      }
                    }}
                  >
                    {s.icon} {s.label}
                  </Button>
                );
              })}
              {liveCtx.shoutActive && liveCtx.currentMinute <= liveCtx.shoutActive.expiresAt && (
                <span className="text-[10px] text-emerald-400 ml-1">
                  Aktiv bis {liveCtx.shoutActive.expiresAt}&apos;
                </span>
              )}
              {liveCtx.currentMinute < liveCtx.shoutCooldownUntil && !liveCtx.shoutActive && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  Abklingzeit bis {liveCtx.shoutCooldownUntil}&apos;
                </span>
              )}
            </div>
            {/* Halftime Talk - show between minute 45 and 46, or when paused at halftime */}
            {liveCtx.currentMinute >= 45 && liveCtx.currentMinute <= 50 && !liveCtx.halftimeTalkDone && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-amber-400 mb-2">📢 Halbzeitansprache wählen:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {HALFTIME_TALKS.map(t => (
                    <button
                      key={t.type}
                      className="p-2 rounded-lg border border-border hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-left"
                      onClick={() => {
                        if (!liveCtx) return;
                        const ev = applyHalftimeTalk(liveCtx, t.type as HalftimeTalkType);
                        if (ev) {
                          setDisplayEvents(prev => [...prev, ev]);
                          setLiveCtx({ ...liveCtx });
                        }
                      }}
                    >
                      <p className="text-sm">{t.icon} {t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.description}</p>
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5">Ideal: {t.bestWhen}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {liveCtx.halftimeTalkDone && liveCtx.currentMinute >= 45 && liveCtx.currentMinute <= 50 && (
              <div className="mt-2 text-[10px] text-emerald-400">✓ Halbzeitansprache gehalten</div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live-Ticker */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                {isLive ? '🔴 Live-Ticker' : 'Spielverlauf'}
                <span className="text-[10px] font-normal">({filteredEvents.length} Ereignisse)</span>
                {devMode && <span className="text-[10px] font-normal text-emerald-400 ml-auto">🔧 Dev: Klick = Details</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredEvents.map((event, i) => (
                  <TickerEvent key={`${event.minute}-${event.type}-${i}`} event={event} homeTeamId={homeTeamId} devMode={devMode} />
                ))}
                <div ref={tickerEndRef} />
                {isLive && isPlaying && (
                  <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Simulation läuft... ({currentMin}&apos;)
                  </div>
                )}
                {isLive && !isPlaying && !liveCtx?.isFinished && (
                  <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground">
                    <Pause className="w-3 h-3" /> Pausiert bei {currentMin}&apos; — Drücke Play zum Fortsetzen
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stamina Overview (live only) */}
          {isLive && liveCtx && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Kondition — {isPlayerHome ? homeTeam?.name : awayTeam?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {activePlayers.map(p => {
                    const stam = liveCtx.stamina[p.id] ?? 80;
                    const barColor = stam > 60 ? 'bg-green-500' : stam > 35 ? 'bg-yellow-500' : 'bg-red-500';
                    return (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <span className="text-[10px] w-5 text-muted-foreground">{p.position}</span>
                        <span className="text-[10px] truncate flex-1">{p.lastName}</span>
                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${stam}%` }} />
                        </div>
                        <span className="text-[9px] font-mono w-7 text-right">{Math.round(stam)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Statistiken</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {(() => {
                const hs = liveCtx?.homeStats ?? result?.homeStats;
                const as_ = liveCtx?.awayStats ?? result?.awayStats;
                if (!hs || !as_) return null;
                return (
                  <>
                    <StatBar label="Ballbesitz" home={hs.possession} away={as_.possession} suffix="%" />
                    <StatBar label="Torschüsse" home={hs.shots} away={as_.shots} />
                    <StatBar label="Aufs Tor" home={hs.shotsOnTarget} away={as_.shotsOnTarget} />
                    <StatBar label="Ecken" home={hs.corners} away={as_.corners} />
                    <StatBar label="Fouls" home={hs.fouls} away={as_.fouls} />
                    <StatBar label="Abseits" home={hs.offsides} away={as_.offsides} />
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Ratings (only after match) */}
          {result && !isLive && (
            <>
              <RatingsCard title={`${homeTeam?.name} – Bewertungen`} ratings={result.homeRatings} motm={result.manOfTheMatch} findPlayer={findPlayer} />
              <RatingsCard title={`${awayTeam?.name} – Bewertungen`} ratings={result.awayRatings} motm={result.manOfTheMatch} findPlayer={findPlayer} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RatingsCard({ title, ratings, motm, findPlayer }: {
  title: string;
  ratings: { playerId: string; rating: number; goals: number; assists: number; minutesPlayed: number; yellowCard: boolean }[];
  motm?: string;
  findPlayer: (id?: string) => Player | null;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {[...ratings].sort((a, b) => b.rating - a.rating).map(r => {
          const p = findPlayer(r.playerId);
          const isMotm = motm === r.playerId;
          return (
            <div key={r.playerId} className="flex items-center gap-1.5 text-xs">
              <RatingBadge rating={r.rating} />
              <span className={`flex-1 truncate ${isMotm ? "text-accent font-semibold" : ""}`}>{p?.lastName ?? "?"}{isMotm ? " ⭐" : ""}</span>
              <span className="text-[9px] text-muted-foreground">{r.minutesPlayed}&apos;</span>
              {r.goals > 0 && <span className="text-[9px]">⚽{r.goals > 1 ? `×${r.goals}` : ""}</span>}
              {r.assists > 0 && <span className="text-[9px]">🅰{r.assists > 1 ? `×${r.assists}` : ""}</span>}
              {r.yellowCard && <span className="w-2 h-2.5 bg-yellow-400 rounded-sm inline-block" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
