"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play, FastForward, SkipForward, X, Mic, ChevronRight, Trophy, TrendingUp, Shield, Swords, AlertTriangle } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { useSettingsStore } from "@/store/settings-store";
import { calcOverall } from "@/store/selectors";
import { TeamLogo } from "@/components/ui/team-logo";
import { computeDayAgenda, computeWeekCalendar } from "@/lib/day-agenda";
import { SimulationSpeed } from "@/types/game";

const SPEED_MS: Record<SimulationSpeed, number> = {
  slow: 1500,
  normal: 800,
  fast: 300,
};

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

interface SimEvent {
  id: string;
  icon: string;
  title: string;
  date: string;
}

type SimPhase = "running" | "paused" | "match_preview" | "press_conference" | "random_event" | "finished";

interface MatchPreviewData {
  matchId: string;
  opponentName: string;
  opponentShort: string;
  opponentId: string;
  opponentColors: { primary: string; secondary: string };
  isHome: boolean;
  myTeamName: string;
  myTeamShort: string;
  myTeamId: string;
  myTeamColors: { primary: string; secondary: string };
  myOverall: number;
  oppOverall: number;
  myPosition: number;
  oppPosition: number;
  myForm: string[];
  oppForm: string[];
  myTopPlayers: { name: string; pos: string; ovr: number }[];
  oppTopPlayers: { name: string; pos: string; ovr: number }[];
  matchday: number;
  date: string;
  time: string;
}

interface Props {
  onClose: () => void;
}

export function CalendarSimulation({ onClose }: Props) {
  const router = useRouter();
  const gameState = useGameStore((s) => s.gameState);
  const advanceOneDay = useGameStore((s) => s.advanceOneDay);
  const answerPressQuestion = useGameStore((s) => s.answerPressQuestion);
  const resolveRandomEvent = useGameStore((s) => s.resolveRandomEvent);
  const settings = useSettingsStore((s) => s.settings);

  const [phase, setPhase] = useState<SimPhase>("running");
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [matchPreview, setMatchPreview] = useState<MatchPreviewData | null>(null);
  const [pkQuestionIdx, setPkQuestionIdx] = useState(0);
  const [activeRandomEvent, setActiveRandomEvent] = useState<import("@/types/game").RandomEvent | null>(null);
  const [eventResult, setEventResult] = useState<{ optionText: string; effects: import("@/types/game").RandomEventOption['effects'] } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  /** Track added event IDs via ref to avoid stale closure duplicates */
  const addedEventIds = useRef<Set<string>>(new Set());

  const speed = settings.simulationSpeed ?? "normal";
  const speedMs = SPEED_MS[speed];

  // Scroll events to bottom
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Helper: find ANY unplayed player match today (league, cup, international)
  const findTodayPlayerMatch = useCallback((): import('@/types/match').Match | null => {
    if (!gameState) return null;
    const { currentTeamId, currentDate } = gameState;
    // League matches (skip friendlies — they are auto-simulated)
    for (const schedule of gameState.schedules) {
      for (const match of schedule.matches) {
        if (match.date !== currentDate || match.isPlayed) continue;
        if (match.competition === 'friendly') continue;
        if (match.homeTeamId !== currentTeamId && match.awayTeamId !== currentTeamId) continue;
        return match;
      }
    }
    // Cup matches
    if (gameState.cupState && !gameState.cupState.isFinished) {
      const cupRound = gameState.cupState.rounds[gameState.cupState.currentRound];
      if (cupRound) {
        for (const match of cupRound.matches) {
          if (match.date !== currentDate || match.isPlayed) continue;
          if (match.homeTeamId !== currentTeamId && match.awayTeamId !== currentTeamId) continue;
          return match;
        }
      }
    }
    // International matches (league phase + knockout)
    const intl = gameState.internationalState;
    if (intl && !intl.isFinished && !intl.isEliminated) {
      const intlMatches = [...(intl.leaguePhase?.matches ?? []), ...(intl.knockoutMatches ?? [])];
      for (const match of intlMatches) {
        if (match.date !== currentDate || match.isPlayed) continue;
        if (match.homeTeamId !== currentTeamId && match.awayTeamId !== currentTeamId) continue;
        return match as import('@/types/match').Match;
      }
    }
    return null;
  }, [gameState]);

  // Build match preview data from current state (league, cup, international)
  const buildMatchPreview = useCallback((): MatchPreviewData | null => {
    if (!gameState) return null;
    const { currentTeamId } = gameState;
    const match = findTodayPlayerMatch();
    if (!match) return null;

    const isHome = match.homeTeamId === currentTeamId;
    const oppId = isHome ? match.awayTeamId : match.homeTeamId;
    const myTeam = gameState.teams.find((t) => t.id === currentTeamId);
    const oppTeam = gameState.teams.find((t) => t.id === oppId);
    if (!myTeam) return null;

    // For foreign/international opponents that aren't in teams list
    const oppName = oppTeam?.name ?? oppId.replace('int-', '').replace(/-/g, ' ');
    const oppShort = oppTeam?.shortName ?? oppName.slice(0, 3).toUpperCase();
    const oppColors = oppTeam?.colors ?? { primary: '#666', secondary: '#999' };

    const leagueId = myTeam.league;
    const table = gameState.tables[leagueId] ?? [];
    const myEntry = table.find((e) => e.teamId === currentTeamId);
    const oppEntry = table.find((e) => e.teamId === oppId);

    const myPlayers = gameState.players
      .filter((p) => p.teamId === currentTeamId)
      .sort((a, b) => calcOverall(b) - calcOverall(a))
      .slice(0, 5)
      .map((p) => ({ name: p.lastName, pos: p.position, ovr: calcOverall(p) }));

    const oppAllPlayers = gameState.players.filter((p) => p.teamId === oppId);
    const oppPlayers = oppAllPlayers.length > 0
      ? [...oppAllPlayers].sort((a, b) => calcOverall(b) - calcOverall(a)).slice(0, 5).map((p) => ({ name: p.lastName, pos: p.position, ovr: calcOverall(p) }))
      : [];

    const myAllPlayers = gameState.players.filter((p) => p.teamId === currentTeamId);
    const myOvr = myAllPlayers.length > 0 ? Math.round(myAllPlayers.reduce((s, p) => s + calcOverall(p), 0) / myAllPlayers.length) : 0;
    const oppOvr = oppAllPlayers.length > 0 ? Math.round(oppAllPlayers.reduce((s, p) => s + calcOverall(p), 0) / oppAllPlayers.length) : 0;

    const compLabel = match.competition === 'cup' ? '🏆 DFB-Pokal' : match.competition === 'cl' ? '🏆 Champions League' : match.competition === 'el' ? '🏆 Europa League' : match.competition === 'ecl' ? '🏆 Conference League' : '';

    return {
      matchId: match.id,
      opponentName: compLabel ? `${compLabel}: ${oppName}` : oppName,
      opponentShort: oppShort,
      opponentId: oppId,
      opponentColors: oppColors,
      isHome,
      myTeamName: myTeam.name,
      myTeamShort: myTeam.shortName,
      myTeamId: myTeam.id,
      myTeamColors: myTeam.colors,
      myOverall: myOvr,
      oppOverall: oppOvr,
      myPosition: myEntry?.position ?? 0,
      oppPosition: oppEntry?.position ?? 0,
      myForm: myEntry?.form ?? [],
      oppForm: oppEntry?.form ?? [],
      myTopPlayers: myPlayers,
      oppTopPlayers: oppPlayers,
      matchday: match.matchday,
      date: match.date,
      time: match.time ?? "15:30",
    };
  }, [gameState, findTodayPlayerMatch]);

  // Main simulation tick
  const tick = useCallback(() => {
    if (!gameState) return;
    const agenda = computeDayAgenda(gameState);
    const dateBefore = gameState.currentDate;
    const dayName = DAY_NAMES[new Date(dateBefore).getDay()];
    const dayNum = new Date(dateBefore).getDate().toString().padStart(2, "0");
    const monthShort = new Date(dateBefore).toLocaleDateString("de-DE", { month: "short" });

    // Check: is today a match day? (league, cup, or international)
    // This MUST be checked BEFORE the Sunday pause to avoid skipping cup/intl matches on Sundays
    const todayPlayerMatch = findTodayPlayerMatch();
    if (todayPlayerMatch || agenda.isMatchDay) {
      const preview = buildMatchPreview();
      if (preview) {
        setEvents((prev) => [...prev, { id: `match-${dateBefore}`, icon: "⚽", title: `${dayName} ${dayNum}. ${monthShort} — SPIELTAG vs. ${preview.opponentName}`, date: dateBefore }]);
        setMatchPreview(preview);
        setPhase("match_preview");
        return;
      }
    }

    // Check: pending press conference?
    const pendingPK = gameState.pressConferences.find((pc) => pc.date === dateBefore && !pc.isCompleted);
    if (pendingPK) {
      setEvents((prev) => [...prev, { id: `pk-${dateBefore}`, icon: "🎙️", title: `${dayName} ${dayNum}. ${monthShort} — Pressekonferenz`, date: dateBefore }]);
      setPkQuestionIdx(0);
      setPhase("press_conference");
      return;
    }

    // Stop on Sundays (week end) so user can interact with dashboard
    // Checked AFTER match/PK so those events on Sundays are not missed
    if (events.length > 0 && new Date(dateBefore).getDay() === 0) {
      // Auto-close the overlay so the user returns to the dashboard
      onClose();
      return;
    }

    // Normal day: add event, advance
    const newsCount = gameState.news.length;
    advanceOneDay();

    // Check what happened after advancing
    const newState = useGameStore.getState().gameState;
    if (!newState) return;

    // Check for new unresolved random event
    const unresolvedEvent = (newState.randomEvents ?? []).find(e => !e.isResolved);
    if (unresolvedEvent) {
      setActiveRandomEvent(unresolvedEvent);
      setEvents((prev) => [...prev, { id: `rnd-${dateBefore}`, icon: unresolvedEvent.icon, title: `${dayName} ${dayNum}. ${monthShort} — ${unresolvedEvent.title}`, date: dateBefore }]);
      setPhase("random_event");
      return;
    }

    const newNews = newState.news.slice(newsCount);
    let dayEvent = `${dayName} ${dayNum}. ${monthShort}`;

    // Categorize the day
    if (newNews.some((n) => n.title.startsWith("Wochentraining:"))) {
      dayEvent += " — 🏋️ Training absolviert";
    } else if (newNews.length > 0) {
      dayEvent += ` — ${newNews[0].title}`;
    }

    const dayOfWeek = new Date(dateBefore).getDay();
    const icons: Record<number, string> = { 1: "🏋️", 2: "⚽", 3: "🏃", 4: "⚽", 5: "🧘", 6: "📋", 0: "🛋️" };
    setEvents((prev) => [...prev, { id: `day-${dateBefore}`, icon: icons[dayOfWeek] ?? "📅", title: dayEvent, date: dateBefore }]);
  }, [gameState, advanceOneDay, buildMatchPreview, findTodayPlayerMatch]);

  // Timer loop
  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setTimeout(tick, speedMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, tick, speedMs, events]);

  // Current state info
  if (!gameState) return null;

  const currentDate = gameState.currentDate;
  const dayName = DAY_NAMES[new Date(currentDate).getDay()];
  const weekDays = computeWeekCalendar(gameState);
  const pendingPK = gameState.pressConferences.find((pc) => pc.date === currentDate && !pc.isCompleted);

  const handlePKAnswer = (answerIdx: number) => {
    if (!pendingPK) return;
    const q = pendingPK.questions[pkQuestionIdx];
    if (!q) return;
    answerPressQuestion(pendingPK.id, q.id, answerIdx);
    if (pkQuestionIdx + 1 < pendingPK.questions.length) {
      setPkQuestionIdx(pkQuestionIdx + 1);
    } else {
      // PK done, advance past this day and continue
      advanceOneDay();
      setPhase("running");
    }
  };

  const handleRandomEventChoice = (optionId: string) => {
    if (!activeRandomEvent) return;
    const chosen = activeRandomEvent.options.find(o => o.id === optionId);
    resolveRandomEvent(activeRandomEvent.id, optionId);
    if (chosen) {
      setEventResult({ optionText: chosen.text, effects: chosen.effects });
    }
  };

  const handleEventResultDismiss = () => {
    setEventResult(null);
    setActiveRandomEvent(null);
    setPhase("running");
  };

  const handleMatchStart = () => {
    if (!matchPreview || !gameState) return;
    const matchId = matchPreview.matchId;
    // Navigate to live match — simulation happens on the match page
    onClose();
    router.push(`/game/match/${matchId}`);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-card/90 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-primary">{dayName}, {new Date(currentDate).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Geschwindigkeit:</span>
            <span className={`font-medium ${speed === "slow" ? "text-blue-400" : speed === "fast" ? "text-red-400" : "text-primary"}`}>
              {speed === "slow" ? "Langsam" : speed === "normal" ? "Normal" : "Schnell"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {phase === "running" && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPhase("paused")}>
              <Pause className="w-3.5 h-3.5 mr-1" /> Pause
            </Button>
          )}
          {phase === "paused" && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPhase("running")}>
              <Play className="w-3.5 h-3.5 mr-1" /> Weiter
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Week Calendar Strip */}
      <div className="bg-card/50 border-b border-border px-4 py-2">
        <div className="grid grid-cols-7 gap-1 max-w-2xl mx-auto">
          {weekDays.map((day) => (
            <div key={day.date} className={`text-center text-xs rounded-md py-1.5 transition-all ${
              day.isToday ? "bg-primary text-primary-foreground font-bold" : day.isPast ? "text-muted-foreground/50" : "text-muted-foreground"
            }`}>
              <p className="font-medium">{day.dayShort}</p>
              <p className="text-sm">{day.dayNum}</p>
              {day.hasMatch && <span className="text-[8px]">⚽</span>}
              {day.hasPressConference && !day.hasMatch && <span className="text-[8px]">🎙️</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Events Feed (left) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-xl mx-auto space-y-1">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-card/40 border border-border/30 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-base">{ev.icon}</span>
                <span className="text-xs text-foreground/80">{ev.title}</span>
              </div>
            ))}
            <div ref={eventsEndRef} />
            {phase === "running" && (
              <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Simulation läuft...
              </div>
            )}
            {phase === "paused" && (
              <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground">
                <Pause className="w-3 h-3" /> Pausiert
              </div>
            )}
          </div>
        </div>

        {/* Match Preview Panel (right, when stopped at match) */}
        {phase === "match_preview" && matchPreview && (
          <div className="w-[480px] border-l border-border bg-card/80 overflow-y-auto p-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{matchPreview.matchday}. Spieltag</p>
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="text-center">
                  <TeamLogo teamId={matchPreview.myTeamId} teamName={matchPreview.myTeamName} shortName={matchPreview.myTeamShort} colors={matchPreview.myTeamColors} size={56} className="mx-auto" />
                  <p className="text-sm font-bold mt-1">{matchPreview.myTeamName}</p>
                  {matchPreview.isHome && <p className="text-[10px] text-primary">Heim</p>}
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-muted-foreground">VS</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{matchPreview.time} Uhr</p>
                </div>
                <div className="text-center">
                  <TeamLogo teamId={matchPreview.opponentId} teamName={matchPreview.opponentName} shortName={matchPreview.opponentShort} colors={matchPreview.opponentColors} size={56} className="mx-auto" />
                  <p className="text-sm font-bold mt-1">{matchPreview.opponentName}</p>
                  {!matchPreview.isHome && <p className="text-[10px] text-destructive">Heim</p>}
                </div>
              </div>
            </div>

            {/* Strength Comparison */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> Stärke-Vergleich</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-primary">{matchPreview.myOverall}</span>
                  <span className="text-xs text-muted-foreground">Ø Gesamtstärke</span>
                  <span className="font-bold text-destructive">{matchPreview.oppOverall}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full transition-all" style={{ width: `${(matchPreview.myOverall / (matchPreview.myOverall + matchPreview.oppOverall)) * 100}%` }} />
                  <div className="bg-destructive h-full transition-all flex-1" />
                </div>
              </CardContent>
            </Card>

            {/* Table Position */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="w-3 h-3" /> Tabellen-Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{matchPreview.myPosition}.</p>
                    <p className="text-[10px] text-muted-foreground">Platz</p>
                  </div>
                  <Swords className="w-5 h-5 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">{matchPreview.oppPosition}.</p>
                    <p className="text-[10px] text-muted-foreground">Platz</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Form (letzte 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {(matchPreview.myForm.length > 0 ? matchPreview.myForm.slice(-5) : ["—"]).map((f, i) => (
                      <span key={i} className={`w-5 h-5 rounded-sm text-[10px] font-bold flex items-center justify-center ${
                        f === "W" ? "bg-green-500/20 text-green-400" : f === "D" ? "bg-yellow-500/20 text-yellow-400" : f === "L" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"
                      }`}>{f}</span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {(matchPreview.oppForm.length > 0 ? matchPreview.oppForm.slice(-5) : ["—"]).map((f, i) => (
                      <span key={i} className={`w-5 h-5 rounded-sm text-[10px] font-bold flex items-center justify-center ${
                        f === "W" ? "bg-green-500/20 text-green-400" : f === "D" ? "bg-yellow-500/20 text-yellow-400" : f === "L" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"
                      }`}>{f}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Players */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Schlüsselspieler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    {matchPreview.myTopPlayers.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold w-5 ${p.ovr >= 75 ? "text-green-400" : p.ovr >= 65 ? "text-yellow-400" : "text-orange-400"}`}>{p.ovr}</span>
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground text-[10px] ml-auto">{p.pos}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {matchPreview.oppTopPlayers.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold w-5 ${p.ovr >= 75 ? "text-green-400" : p.ovr >= 65 ? "text-yellow-400" : "text-orange-400"}`}>{p.ovr}</span>
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground text-[10px] ml-auto">{p.pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lineup Check + Action Buttons */}
            {(() => {
              const tactic = gameState?.tactics[gameState?.activeTactic ?? 'a'];
              const lineupCount = tactic?.lineup?.filter((id: string) => id && id.length > 0).length ?? 0;
              const hasFullLineup = lineupCount >= 11;
              return (
                <>
                  {!hasFullLineup ? (
                    <>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-400">Aufstellung unvollständig ({lineupCount}/11)</p>
                          <p className="text-muted-foreground mt-0.5">Du kannst ohne vollständige Aufstellung nicht antreten. Stelle 11 Spieler auf oder nutze die Auto-Aufstellung.</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1 text-xs gap-1" onClick={() => { onClose(); router.push("/game/tactics"); }}>
                          Aufstellung bearbeiten
                        </Button>
                        <Button className="flex-1 text-xs gap-1 bg-amber-600 hover:bg-amber-600/90" onClick={() => {
                          useGameStore.getState().autoFillLineup();
                        }}>
                          🤖 Auto-Aufstellung
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="text-xs gap-1" onClick={() => { onClose(); router.push("/game/tactics"); }}>
                        Aufstellung prüfen
                      </Button>
                      {matchPreview.oppTopPlayers.length === 0 ? (
                        <Button className="flex-1 text-xs gap-1 bg-amber-600 hover:bg-amber-600/90" onClick={() => {
                          // D11: Opponent has no players (amateur team) — instant calculation only
                          onClose();
                          router.push(`/game/match/${matchPreview.matchId}?speed=instant`);
                        }}>
                          ⚡ Sofortberechnung <ChevronRight className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button className="flex-1 text-xs gap-1" onClick={handleMatchStart}>
                          ⚽ Spiel starten <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Press Conference Panel */}
        {phase === "press_conference" && pendingPK && pendingPK.questions[pkQuestionIdx] && (
          <div className="w-[480px] border-l border-border bg-card/80 overflow-y-auto p-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Mic className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold">Pressekonferenz</p>
                <p className="text-xs text-muted-foreground">Frage {pkQuestionIdx + 1} von {pendingPK.questions.length}</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Reporter fragt:</p>
              <p className="text-sm font-medium italic">&ldquo;{pendingPK.questions[pkQuestionIdx].question}&rdquo;</p>
            </div>

            <div className="space-y-2">
              {pendingPK.questions[pkQuestionIdx].options.map((opt, idx) => {
                const toneColor: Record<string, string> = { motivating: "border-green-500/30 hover:bg-green-500/10", confident: "border-blue-500/30 hover:bg-blue-500/10", defensive: "border-gray-500/30 hover:bg-gray-500/10", provocative: "border-red-500/30 hover:bg-red-500/10", honest: "border-amber-500/30 hover:bg-amber-500/10" };
                const toneLabel: Record<string, string> = { motivating: "🔥 Motivierend", confident: "💪 Selbstbewusst", defensive: "🛡️ Defensiv", provocative: "⚡ Provokant", honest: "💬 Ehrlich" };
                return (
                  <button key={idx} className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${toneColor[opt.tone] ?? ""}`} onClick={() => handlePKAnswer(idx)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm">{opt.text}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{toneLabel[opt.tone] ?? ""}</span>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className={opt.moraleEffect > 0 ? "text-green-400" : opt.moraleEffect < 0 ? "text-red-400" : ""}>
                        Moral: {opt.moraleEffect > 0 ? "+" : ""}{opt.moraleEffect}
                      </span>
                      {opt.fineRisk && <span className="text-red-400">⚠️ Strafe möglich</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Random Event Panel */}
        {phase === "random_event" && activeRandomEvent && (
          <div className="w-[520px] border-l border-border bg-card/80 overflow-y-auto p-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl">
                {activeRandomEvent.icon}
              </div>
              <div>
                <p className="text-sm font-bold">{activeRandomEvent.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {activeRandomEvent.category === 'city' ? 'Stadtereignis' :
                   activeRandomEvent.category === 'sponsor' ? 'Sponsoring' :
                   activeRandomEvent.category === 'fan' ? 'Fans' :
                   activeRandomEvent.category === 'media' ? 'Medien' :
                   activeRandomEvent.category === 'internal' ? 'Intern' :
                   activeRandomEvent.category === 'weather' ? 'Wetter' : 'Ereignis'}
                </p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-sm leading-relaxed">{activeRandomEvent.description}</p>
            </div>

            {!eventResult ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Deine Entscheidung:</p>
                {activeRandomEvent.options.map((opt) => (
                  <button
                    key={opt.id}
                    className="w-full text-left p-3 rounded-lg border border-purple-500/20 hover:bg-purple-500/10 transition-all cursor-pointer"
                    onClick={() => handleRandomEventChoice(opt.id)}
                  >
                    <p className="text-sm">{opt.text}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">Auswirkungen unbekannt...</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-500">
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs text-muted-foreground mb-1">Deine Wahl:</p>
                  <p className="text-sm font-medium">{eventResult.optionText}</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Auswirkungen:</p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const eff = eventResult.effects;
                      const tags: { label: string; positive: boolean }[] = [];
                      if (eff.moraleAll && eff.moraleAll > 0) tags.push({ label: `Moral +${eff.moraleAll}`, positive: true });
                      if (eff.moraleAll && eff.moraleAll < 0) tags.push({ label: `Moral ${eff.moraleAll}`, positive: false });
                      if (eff.fanLoyalty && eff.fanLoyalty > 0) tags.push({ label: `Fans +${eff.fanLoyalty}`, positive: true });
                      if (eff.fanLoyalty && eff.fanLoyalty < 0) tags.push({ label: `Fans ${eff.fanLoyalty}`, positive: false });
                      if (eff.reputation && eff.reputation > 0) tags.push({ label: `Ansehen +${eff.reputation}`, positive: true });
                      if (eff.reputation && eff.reputation < 0) tags.push({ label: `Ansehen ${eff.reputation}`, positive: false });
                      if (eff.budgetChange && eff.budgetChange > 0) tags.push({ label: `+${(eff.budgetChange / 1000).toFixed(0)}k €`, positive: true });
                      if (eff.budgetChange && eff.budgetChange < 0) tags.push({ label: `${(eff.budgetChange / 1000).toFixed(0)}k €`, positive: false });
                      if (eff.attendanceModifier && eff.attendanceModifier < 1) tags.push({ label: `Zuschauer ${Math.round((eff.attendanceModifier - 1) * 100)}%`, positive: false });
                      if (eff.attendanceModifier && eff.attendanceModifier > 1) tags.push({ label: `Zuschauer +${Math.round((eff.attendanceModifier - 1) * 100)}%`, positive: true });
                      if (tags.length === 0) tags.push({ label: 'Keine sichtbare Auswirkung', positive: true });
                      return tags.map((t, i) => (
                        <span key={i} className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                          t.positive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                        }`}>{t.label}</span>
                      ));
                    })()}
                  </div>
                </div>
                <Button className="w-full text-xs" onClick={handleEventResultDismiss}>
                  Weiter <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
