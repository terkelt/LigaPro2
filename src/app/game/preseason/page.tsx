"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, SkipForward } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { useSettingsStore } from "@/store/settings-store";
import {
  useMyTeam, useMyPlayers, useMyFinances, useCurrentTeamId,
  useCurrentDate, usePreseason, calcOverall, formatValue,
} from "@/store/selectors";
import {
  TRAINING_CAMPS,
  generatePreseasonEvents,
  generateFriendlySchedule,
  applyCampEffects,
  initPreseasonRng,
  TACTICAL_FOCUS_OPTIONS,
  generateSquadAssessment,
} from "@/lib/preseason-engine";
import type { TrainingCampLocation, PreseasonEvent, FriendlyMatch, TacticalFocus } from "@/types/preseason";
import { generateCampSponsorOffer } from "@/lib/sponsor-engine";

export default function PreseasonPage() {
  const router = useRouter();
  const team = useMyTeam();
  const players = useMyPlayers();
  const finances = useMyFinances();
  const currentTeamId = useCurrentTeamId();
  const currentDate = useCurrentDate();
  const preseason = usePreseason();
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);

  const devMode = useSettingsStore((s) => s.settings.devMode);
  const [tacticalFocus, setTacticalFocus] = useState<TacticalFocus | null>(preseason?.tacticalFocus ?? null);

  const squadAssessment = useMemo(() => {
    if (!gameState || !currentTeamId) return null;
    return preseason?.squadAssessment ?? generateSquadAssessment(gameState.players, currentTeamId);
  }, [gameState, currentTeamId, preseason?.squadAssessment]);

  const budget = finances?.transferBudget ?? 0;

  const teamOverall = useMemo(() => {
    if (players.length === 0) return 0;
    return Math.round(players.reduce((s, p) => s + calcOverall(p), 0) / players.length);
  }, [players]);

  // ── Select Camp → apply effects, add friendlies to schedule, complete preseason, redirect ──
  const handleSelectCamp = useCallback((campId: TrainingCampLocation) => {
    if (!gameState || !currentTeamId) return;
    const camp = TRAINING_CAMPS.find(c => c.id === campId);
    if (!camp) return;
    if (budget < camp.cost) return;
    const focus = TACTICAL_FOCUS_OPTIONS.find(f => f.id === (tacticalFocus ?? 'balanced')) ?? TACTICAL_FOCUS_OPTIONS[4];

    initPreseasonRng(Date.now());
    const events = generatePreseasonEvents(camp, gameState.players, currentTeamId);

    // Apply camp effects to players (including tactical focus bonuses)
    let updatedPlayers = applyCampEffects(gameState.players, currentTeamId, camp, events);
    updatedPlayers = updatedPlayers.map(p => {
      if (p.teamId !== currentTeamId) return p;
      return {
        ...p,
        condition: Math.min(100, p.condition + focus.effects.conditionBonus),
        morale: Math.min(100, (p.morale ?? 70) + focus.effects.moraleBonus),
        xp: (p.xp ?? 0) + focus.effects.xpBonus,
      };
    });

    // Deduct cost from budget
    const newFinances = { ...gameState.finances };
    if (newFinances[currentTeamId]) {
      newFinances[currentTeamId] = {
        ...newFinances[currentTeamId],
        transferBudget: newFinances[currentTeamId].transferBudget - camp.cost,
        balance: newFinances[currentTeamId].balance - camp.cost,
      };
    }

    // Advance date by camp duration
    const campEnd = addDays(currentDate, camp.durationDays);

    // Generate friendly schedule (between camp end and league start)
    const generatedFriendlies = generateFriendlySchedule(campEnd, '2025-08-16');

    // Add friendlies as real matches in a "preseason" schedule so day-advance handles them
    const friendlyMatches = generatedFriendlies.map((f, i) => ({
      id: `friendly-match-${i}`,
      homeTeamId: currentTeamId,
      awayTeamId: `friendly-opp-${i}`,
      date: f.date,
      time: '15:30',
      matchday: 0,
      competition: 'friendly' as const,
      venue: team?.stadium.name ?? 'Stadion',
      isPlayed: false,
    }));

    // Create a preseason schedule
    const preseasonSchedule = {
      leagueId: 'preseason',
      season: parseInt(gameState.season.year.split('/')[0]) || 2025,
      matches: friendlyMatches,
    };

    // Build news items for camp events
    const campNews = events.map((evt, i) => ({
      id: `preseason-camp-${i}`,
      type: 'general' as const,
      title: evt.title,
      content: evt.description,
      date: addDays(currentDate, Math.floor(camp.durationDays * ((i + 1) / (events.length + 1)))),
      isRead: false,
      relatedTeamId: currentTeamId,
      importance: (evt.isPositive ? 'low' : 'medium') as 'low' | 'medium' | 'high',
    }));

    // If any event was sponsor_interest, generate a real sponsor offer
    let stateWithSponsor = {
      ...gameState,
      // Don't jump date — let normal day-advance handle week-by-week progression
      currentDate: currentDate,
      players: updatedPlayers,
      finances: newFinances,
      schedules: [...gameState.schedules, preseasonSchedule],
    };
    if (events.some(e => e.type === 'sponsor_interest')) {
      stateWithSponsor = generateCampSponsorOffer(stateWithSponsor);
    }

    setGameState({
      ...stateWithSponsor,
      news: [
        ...gameState.news,
        {
          id: 'preseason-camp-start',
          type: 'general',
          title: `Trainingslager: ${camp.name}`,
          content: `${team?.name} absolviert ein ${camp.durationDays}-tägiges Trainingslager in ${camp.country}. Kosten: ${formatValue(camp.cost)}. Die Effekte wurden sofort angewendet.`,
          date: currentDate,
          isRead: false,
          relatedTeamId: currentTeamId,
          importance: 'medium',
        },
        ...campNews,
        {
          id: 'preseason-complete',
          type: 'general',
          title: 'Trainingslager abgeschlossen!',
          content: `${team?.name} hat das Trainingslager beendet. ${generatedFriendlies.length} Testspiele stehen an. Nutze das Dashboard, um Tag für Tag bis zum Saisonstart vorzurücken.`,
          date: currentDate,
          isRead: false,
          relatedTeamId: currentTeamId,
          importance: 'medium',
        },
      ],
      preseason: {
        ...gameState.preseason!,
        phase: 'completed',
        isCompleted: true,
        selectedCamp: campId,
        tacticalFocus: tacticalFocus ?? 'balanced',
        campStartDate: currentDate,
        campEndDate: campEnd,
        campDay: camp.durationDays,
        events,
        friendlies: generatedFriendlies,
        squadAssessment: generateSquadAssessment(gameState.players, currentTeamId),
      },
    });

    // Redirect to dashboard — normal day-advance will handle friendlies + league start
    router.push('/game/dashboard');
  }, [gameState, currentTeamId, currentDate, budget, team, setGameState, tacticalFocus, router]);

  // ── Dev Mode: Skip preseason entirely ──
  const handleSkipPreseason = useCallback(() => {
    if (!gameState || !currentTeamId) return;
    setGameState({
      ...gameState,
      preseason: {
        ...gameState.preseason!,
        phase: 'completed',
        isCompleted: true,
        tacticalFocus: 'balanced',
        squadAssessment: generateSquadAssessment(gameState.players, currentTeamId),
      },
    });
    router.push('/game/dashboard');
  }, [gameState, currentTeamId, setGameState, router]);

  // ── RENDER ──

  // No preseason state → loading or error
  if (!preseason || !gameState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Lade Saisonvorbereitung...</p>
          <Button onClick={() => router.push('/game/dashboard')}>
            Zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Already completed → redirect to dashboard
  if (preseason.isCompleted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Saisonvorbereitung abgeschlossen</h1>
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-4xl">🏟️</p>
            <h2 className="text-xl font-bold">Vorbereitung läuft!</h2>
            <p className="text-muted-foreground">Testspiele und Saisonstart findest du im Dashboard.</p>
            <Button size="lg" onClick={() => router.push('/game/dashboard')}>
              Zum Dashboard →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: Camp Selection
  if (preseason?.phase === 'camp_selection') {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Saisonvorbereitung 2025/26</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Analysiere deinen Kader, wähle einen taktischen Schwerpunkt und ein Trainingslager.
            </p>
          </div>
          {devMode && (
            <Button variant="outline" size="sm" className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={handleSkipPreseason}>
              <SkipForward className="w-3.5 h-3.5 mr-1" /> Überspringen (DEV)
            </Button>
          )}
        </div>

        {/* Squad Assessment */}
        {squadAssessment && (
          <Card className="bg-card border-border border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Kader-Analyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="text-center p-2 rounded-lg bg-secondary/20">
                  <p className="text-[9px] text-muted-foreground">Ø Gesamtstärke</p>
                  <p className="text-xl font-bold text-primary">{squadAssessment.avgOverall}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/20">
                  <p className="text-[9px] text-muted-foreground">Ø Alter</p>
                  <p className="text-xl font-bold">{squadAssessment.avgAge}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/20">
                  <p className="text-[9px] text-muted-foreground">Schlüsselspieler</p>
                  <p className="text-xs font-bold truncate">{squadAssessment.keyPlayer}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/20">
                  <p className="text-[9px] text-muted-foreground">Top-Talent</p>
                  <p className="text-xs font-bold truncate">{squadAssessment.youngTalent}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {squadAssessment.strengths.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-green-400 mb-1">Stärken</p>
                    {squadAssessment.strengths.map((s, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="text-green-400">✓</span> {s}
                      </p>
                    ))}
                  </div>
                )}
                {(squadAssessment.weaknesses.length > 0 || squadAssessment.positionGaps.length > 0) && (
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-red-400 mb-1">Schwächen</p>
                    {squadAssessment.weaknesses.map((w, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="text-red-400">✗</span> {w}
                      </p>
                    ))}
                    {squadAssessment.positionGaps.length > 0 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="text-red-400">✗</span> Bedarf: {squadAssessment.positionGaps.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tactical Focus Selection */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              🎯 Taktischer Schwerpunkt
              <span className="text-[10px] font-normal text-muted-foreground">
                Wähle den Fokus für die Vorbereitung
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {TACTICAL_FOCUS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTacticalFocus(opt.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    tacticalFocus === opt.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  <p className="text-lg mb-0.5">{opt.icon}</p>
                  <p className="text-xs font-bold">{opt.name}</p>
                  <p className="text-[8px] text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                  <div className="mt-1.5 space-y-0.5 text-[8px]">
                    <p className="text-green-400">+{opt.effects.conditionBonus} Fitness</p>
                    <p className="text-blue-400">+{opt.effects.moraleBonus} Moral</p>
                    <p className="text-yellow-400">+{opt.effects.xpBonus} XP</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TRAINING_CAMPS.map(camp => {
            const canAfford = budget >= camp.cost;
            return (
              <Card
                key={camp.id}
                className={`bg-card border-border transition-all hover:border-primary/50 ${!canAfford ? 'opacity-50' : 'cursor-pointer'}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{camp.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{camp.country}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{camp.description}</p>

                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <div className="text-muted-foreground">Kosten:</div>
                    <div className={`font-medium ${canAfford ? 'text-primary' : 'text-red-400'}`}>{formatValue(camp.cost)}</div>
                    <div className="text-muted-foreground">Dauer:</div>
                    <div className="font-medium">{camp.durationDays} Tage</div>
                    <div className="text-muted-foreground">Fitness:</div>
                    <div className="font-medium text-green-400">+{camp.effects.fitnessBoost}</div>
                    <div className="text-muted-foreground">Moral:</div>
                    <div className="font-medium text-blue-400">+{camp.effects.moraleBoost}</div>
                    <div className="text-muted-foreground">Teamgeist:</div>
                    <div className="font-medium text-purple-400">+{camp.effects.cohesionBoost}</div>
                    <div className="text-muted-foreground">Jugend-XP:</div>
                    <div className="font-medium text-yellow-400">+{camp.effects.youthDevelopment}</div>
                    <div className="text-muted-foreground">Verletzungsrisiko:</div>
                    <div className={`font-medium ${camp.effects.injuryRisk <= 4 ? 'text-green-400' : camp.effects.injuryRisk <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {camp.effects.injuryRisk}%
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!canAfford}
                    onClick={() => handleSelectCamp(camp.id as TrainingCampLocation)}
                  >
                    {canAfford ? 'Auswählen' : 'Nicht genug Budget'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-card border-border">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Verfügbares Budget: <span className="font-bold text-primary">{formatValue(budget)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Team: <span className="font-bold">{team?.name}</span> • Ø Stärke: <span className="font-bold">{teamOverall}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we reach here, preseason is completed but user navigated back — redirect to dashboard
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Saisonvorbereitung</h1>
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-4xl">🏟️</p>
          <h2 className="text-xl font-bold">Trainingslager abgeschlossen!</h2>
          <p className="text-muted-foreground">Die Vorbereitung läuft. Testspiele und Saisonstart findest du im Dashboard.</p>
          <Button size="lg" onClick={() => router.push('/game/dashboard')}>
            Zum Dashboard →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
