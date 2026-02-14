"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Heart, Zap, Star, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import {
  useMyTeam, useMyPlayers, useMyFinances, useCurrentTeamId,
  useCurrentDate, usePreseason, calcOverall, formatValue,
} from "@/store/selectors";
import {
  TRAINING_CAMPS,
  generatePreseasonEvents,
  generateFriendlySchedule,
  applyCampEffects,
  simulateFriendly,
  applyFriendlyEffects,
  initPreseasonRng,
} from "@/lib/preseason-engine";
import type { TrainingCampLocation, PreseasonEvent, FriendlyMatch } from "@/types/preseason";
import { Player } from "@/types/player";

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

  const [selectedCamp, setSelectedCamp] = useState<TrainingCampLocation | null>(preseason?.selectedCamp ?? null);
  const [campEvents, setCampEvents] = useState<PreseasonEvent[]>(preseason?.events ?? []);
  const [campDone, setCampDone] = useState(preseason?.phase !== 'camp_selection');
  const [friendlies, setFriendlies] = useState<FriendlyMatch[]>(preseason?.friendlies ?? []);
  const [currentFriendlyIdx, setCurrentFriendlyIdx] = useState(
    (preseason?.friendlies ?? []).filter(f => f.isPlayed).length
  );
  const [allDone, setAllDone] = useState(false);

  const budget = finances?.transferBudget ?? 0;

  const teamOverall = useMemo(() => {
    if (players.length === 0) return 0;
    return Math.round(players.reduce((s, p) => s + calcOverall(p), 0) / players.length);
  }, [players]);

  // ── STEP 1: Select Training Camp ──
  const handleSelectCamp = useCallback((campId: TrainingCampLocation) => {
    if (!gameState || !currentTeamId) return;
    const camp = TRAINING_CAMPS.find(c => c.id === campId);
    if (!camp) return;
    if (budget < camp.cost) return;

    initPreseasonRng(Date.now());
    const events = generatePreseasonEvents(camp, gameState.players, currentTeamId);

    // Apply camp effects to players
    const updatedPlayers = applyCampEffects(gameState.players, currentTeamId, camp, events);

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

    // Generate friendly schedule (between camp end and league start Aug 16)
    const generatedFriendlies = generateFriendlySchedule(campEnd, '2025-08-16');

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

    setGameState({
      ...gameState,
      currentDate: campEnd,
      players: updatedPlayers,
      finances: newFinances,
      news: [
        ...gameState.news,
        {
          id: 'preseason-camp-start',
          type: 'general',
          title: `Trainingslager: ${camp.name}`,
          content: `${team?.name} absolviert ein ${camp.durationDays}-tägiges Trainingslager in ${camp.country}. Kosten: ${formatValue(camp.cost)}.`,
          date: currentDate,
          isRead: false,
          relatedTeamId: currentTeamId,
          importance: 'medium',
        },
        ...campNews,
      ],
      preseason: {
        ...gameState.preseason!,
        phase: 'friendlies',
        selectedCamp: campId,
        campStartDate: currentDate,
        campEndDate: campEnd,
        campDay: camp.durationDays,
        events,
        friendlies: generatedFriendlies,
      },
    });

    setSelectedCamp(campId);
    setCampEvents(events);
    setCampDone(true);
    setFriendlies(generatedFriendlies);
  }, [gameState, currentTeamId, currentDate, budget, team, setGameState]);

  // ── STEP 2: Play Friendly ──
  const handlePlayFriendly = useCallback((idx: number) => {
    if (!gameState || !currentTeamId) return;
    const resolvedFriendlies = friendlies.length > 0 ? friendlies : (gameState.preseason?.friendlies ?? []);
    const friendly = resolvedFriendlies[idx];
    if (!friendly || friendly.isPlayed) return;

    initPreseasonRng(Date.now() + idx);
    const teamPlayers = gameState.players.filter(p => p.teamId === currentTeamId);
    const played = simulateFriendly(friendly, teamPlayers, teamOverall);

    const updatedFriendlies = [...resolvedFriendlies];
    updatedFriendlies[idx] = played;

    // Apply effects to players
    const updatedPlayers = applyFriendlyEffects(gameState.players, currentTeamId, played);

    const resultStr = played.result
      ? `${played.result.homeScore}:${played.result.awayScore}`
      : '0:0';
    const won = played.result && played.result.homeScore > played.result.awayScore;
    const lost = played.result && played.result.homeScore < played.result.awayScore;

    setGameState({
      ...gameState,
      currentDate: played.date,
      players: updatedPlayers,
      news: [
        ...gameState.news,
        {
          id: `preseason-friendly-${idx}`,
          type: 'result',
          title: `Testspiel: ${team?.name} ${resultStr} ${played.opponentName}`,
          content: won ? 'Guter Test mit einem Sieg!' : lost ? 'Niederlage im Testspiel, aber wichtige Erkenntnisse.' : 'Unentschieden — ein ausgeglichener Test.',
          date: played.date,
          isRead: false,
          relatedTeamId: currentTeamId,
          importance: 'low',
        },
      ],
      preseason: {
        ...gameState.preseason!,
        friendlies: updatedFriendlies,
      },
    });

    setFriendlies(updatedFriendlies);
    setCurrentFriendlyIdx(idx + 1);
  }, [gameState, currentTeamId, friendlies, teamOverall, team, setGameState]);

  // ── STEP 3: Complete Pre-Season ──
  const handleComplete = useCallback(() => {
    if (!gameState) return;

    // Advance date to August 14 (day before first league match)
    setGameState({
      ...gameState,
      currentDate: '2025-08-14',
      preseason: {
        ...gameState.preseason!,
        phase: 'completed',
        isCompleted: true,
      },
      news: [
        ...gameState.news,
        {
          id: 'preseason-complete',
          type: 'general',
          title: 'Saisonvorbereitung abgeschlossen!',
          content: `${team?.name} hat die Saisonvorbereitung erfolgreich abgeschlossen. Die Bundesliga startet am Wochenende!`,
          date: '2025-08-14',
          isRead: false,
          relatedTeamId: currentTeamId,
          importance: 'high',
        },
      ],
    });

    setAllDone(true);
  }, [gameState, team, currentTeamId, setGameState]);

  // Redirect if preseason is already done
  const isCompleted = preseason?.isCompleted || allDone;

  // Phase: Camp Summary + Friendlies
  const campDef = TRAINING_CAMPS.find(c => c.id === (selectedCamp ?? preseason?.selectedCamp));
  const activeFriendlies = friendlies.length > 0 ? friendlies : (preseason?.friendlies ?? []);
  const allFriendliesPlayed = activeFriendlies.length > 0 && activeFriendlies.every(f => f.isPlayed);
  const activeEvents = campEvents.length > 0 ? campEvents : (preseason?.events ?? []);

  // ── Calculate player impact from camp ──
  const playerImpact = useMemo(() => {
    if (!campDef || !currentTeamId) return [];
    
    // Simulate what the players looked like before camp (revert to original state)
    const originalPlayers = players.map(p => {
      const condBoost = campDef.effects.fitnessBoost;
      const moraleBoost = campDef.effects.moraleBoost;
      const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
      const xpBoost = age < 23 ? campDef.effects.youthDevelopment : 0;
      
      // Apply event effects in reverse
      let eventCondBoost = 0;
      let eventMoraleBoost = 0;
      let eventXpBoost = 0;
      
      for (const evt of activeEvents) {
        const affectsThisPlayer = !evt.effects.playerIds || evt.effects.playerIds.includes(p.id);
        if (!affectsThisPlayer && evt.effects.playerIds && evt.effects.playerIds.length > 0) continue;
        
        eventCondBoost += evt.effects.conditionChange ?? 0;
        eventMoraleBoost += evt.effects.moraleChange ?? 0;
        eventXpBoost += evt.effects.xpBonus ?? 0;
      }
      
      const totalCondBoost = condBoost + eventCondBoost;
      const totalMoraleBoost = moraleBoost + eventMoraleBoost;
      const totalXpBoost = xpBoost + eventXpBoost;
      
      return {
        ...p,
        condition: Math.max(50, Math.min(100, p.condition - totalCondBoost)),
        morale: Math.max(30, Math.min(100, (p.morale ?? 70) - totalMoraleBoost)),
        form: Math.max(40, Math.min(90, p.form - Math.round(totalMoraleBoost * 0.5))),
        xp: (p.xp ?? 0) - totalXpBoost,
      };
    });
    
    // Calculate impact for each player
    return players.map(p => {
      const original = originalPlayers.find(op => op.id === p.id);
      if (!original) return null;
      
      const conditionDiff = p.condition - original.condition;
      const moraleDiff = (p.morale ?? 70) - (original.morale ?? 70);
      const formDiff = p.form - original.form;
      const xpDiff = (p.xp ?? 0) - (original.xp ?? 0);
      
      // Check if player was injured during camp
      const injuryEvent = activeEvents.find(evt => 
        evt.effects.playerIds?.includes(p.id) && evt.effects.injuryDays
      );
      
      const hasSignificantImpact = Math.abs(conditionDiff) > 0 || Math.abs(moraleDiff) > 0 || 
                                  Math.abs(formDiff) > 0 || xpDiff > 0 || injuryEvent;
      
      if (!hasSignificantImpact) return null;
      
      return {
        player: p,
        conditionDiff,
        moraleDiff,
        formDiff,
        xpDiff,
        injuryEvent,
      };
    }).filter(Boolean) as Array<{
      player: Player;
      conditionDiff: number;
      moraleDiff: number;
      formDiff: number;
      xpDiff: number;
      injuryEvent?: PreseasonEvent;
    }>;
  }, [campDef, currentTeamId, players, activeEvents]);

  // ── RENDER ──

  // Already completed → show dashboard link
  if (isCompleted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Saisonvorbereitung abgeschlossen</h1>
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-4xl">🏟️</p>
            <h2 className="text-xl font-bold">Bereit für die Saison 2025/26!</h2>
            <p className="text-muted-foreground">Die Vorbereitung ist abgeschlossen. Deine Mannschaft ist bereit für den Ligastart.</p>
            <Button size="lg" onClick={() => router.push('/game/dashboard')}>
              Zum Dashboard →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: Camp Selection
  if (!campDone && preseason?.phase === 'camp_selection') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Saisonvorbereitung 2025/26</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Wähle ein Trainingslager für dein Team. Verschiedene Orte bieten unterschiedliche Vorteile.
          </p>
        </div>

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Saisonvorbereitung 2025/26</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {allFriendliesPlayed
            ? 'Alle Testspiele absolviert. Bereit für den Saisonstart!'
            : 'Trainingslager abgeschlossen. Absolviere nun die Testspiele.'}
        </p>
      </div>

      {/* Camp Summary */}
      {campDef && (
        <Card className="bg-card border-border border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
              ✅ Trainingslager: {campDef.name}
              <span className="text-[10px] font-normal text-muted-foreground ml-auto">{campDef.durationDays} Tage in {campDef.country}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeEvents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-1">Ereignisse während des Trainingslagers:</p>
                {activeEvents.map((evt, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${evt.isPositive ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <span className="text-sm">{evt.isPositive ? '✅' : '⚠️'}</span>
                    <div>
                      <p className="font-medium">{evt.title}</p>
                      <p className="text-muted-foreground">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Ruhiges Trainingslager ohne besondere Vorkommnisse. Die Mannschaft hat gut gearbeitet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player Impact Summary */}
      {playerImpact.length > 0 && (
        <Card className="bg-card border-border border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Spieler-Entwicklung durch Trainingslager
              <span className="text-[10px] font-normal text-muted-foreground ml-auto">
                {playerImpact.length} Spieler betroffen
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playerImpact.map(({ player, conditionDiff, moraleDiff, formDiff, xpDiff, injuryEvent }) => (
                <div key={player.id} className="flex items-start gap-2 p-2 rounded-lg border border-border/50 bg-secondary/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{player.position}</span>
                      <span className="text-xs font-bold truncate">{player.lastName}</span>
                      {injuryEvent && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-medium flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Verletzt
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[9px]">
                      {/* Fitness */}
                      {conditionDiff !== 0 && (
                        <span className="flex items-center gap-0.5">
                          <Activity className="w-3 h-3 text-green-400" />
                          {conditionDiff > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          <span className={conditionDiff > 0 ? 'text-green-400' : 'text-red-400'}>
                            {conditionDiff > 0 ? '+' : ''}{conditionDiff}%
                          </span>
                        </span>
                      )}
                      {/* Moral */}
                      {moraleDiff !== 0 && (
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3 text-pink-400" />
                          {moraleDiff > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          <span className={moraleDiff > 0 ? 'text-green-400' : 'text-red-400'}>
                            {moraleDiff > 0 ? '+' : ''}{moraleDiff}
                          </span>
                        </span>
                      )}
                      {/* Form */}
                      {formDiff !== 0 && (
                        <span className="flex items-center gap-0.5">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {formDiff > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          <span className={formDiff > 0 ? 'text-green-400' : 'text-red-400'}>
                            {formDiff > 0 ? '+' : ''}{formDiff}
                          </span>
                        </span>
                      )}
                      {/* XP */}
                      {xpDiff > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-blue-400" />
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">+{xpDiff} XP</span>
                        </span>
                      )}
                    </div>
                    {injuryEvent && (
                      <p className="text-[8px] text-red-400 mt-1">
                        {injuryEvent.description} — {injuryEvent.effects.injuryDays} Tage verletzt
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[8px] text-muted-foreground mt-2 italic">
              Die Werte zeigen die Veränderungen durch das Trainingslager und spezielle Ereignisse.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Friendly Matches */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            ⚽ Testspiele
            <span className="text-[10px] font-normal text-muted-foreground">
              ({activeFriendlies.filter(f => f.isPlayed).length}/{activeFriendlies.length} gespielt)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeFriendlies.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/10">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{team?.name}</span>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <span className="text-xs font-medium">{f.opponentName}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      f.opponentTier === 'amateur' ? 'bg-green-500/15 text-green-400' :
                      f.opponentTier === 'semi_pro' ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {f.opponentTier === 'amateur' ? 'Amateur' : f.opponentTier === 'semi_pro' ? 'Semi-Pro' : 'Profi'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {f.date} • Stärke Gegner: ~{f.opponentStrength}
                  </p>
                </div>

                {f.isPlayed && f.result ? (
                  <div className="text-right">
                    <span className={`text-lg font-bold font-mono ${
                      f.result.homeScore > f.result.awayScore ? 'text-green-400' :
                      f.result.homeScore < f.result.awayScore ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {f.result.homeScore}:{f.result.awayScore}
                    </span>
                    <p className="text-[9px] text-muted-foreground">
                      {f.result.homeScore > f.result.awayScore ? 'Sieg' :
                       f.result.homeScore < f.result.awayScore ? 'Niederlage' : 'Unentschieden'}
                    </p>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={i === currentFriendlyIdx || (i === 0 && !activeFriendlies[0].isPlayed) ? 'default' : 'outline'}
                    disabled={i > 0 && !activeFriendlies[i - 1]?.isPlayed}
                    onClick={() => handlePlayFriendly(i)}
                  >
                    Spielen
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Player Ratings from last friendly */}
      {activeFriendlies.some(f => f.isPlayed && f.playerRatings) && (() => {
        const lastPlayed = [...activeFriendlies].reverse().find(f => f.isPlayed);
        if (!lastPlayed?.playerRatings) return null;
        return (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Spielernoten: vs {lastPlayed.opponentName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {lastPlayed.playerRatings.sort((a, b) => b.rating - a.rating).map(r => {
                  const p = players.find(pl => pl.id === r.playerId);
                  if (!p) return null;
                  return (
                    <div key={r.playerId} className="flex items-center gap-2 text-xs p-1.5 rounded border border-border/50">
                      <span className="text-muted-foreground w-6">{p.position}</span>
                      <span className="truncate flex-1">{p.lastName}</span>
                      <span className={`font-bold font-mono ${r.rating >= 7.5 ? 'text-green-400' : r.rating >= 6.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {r.rating.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Complete Button */}
      {allFriendliesPlayed && (
        <div className="flex justify-center pt-2">
          <Button size="lg" onClick={handleComplete} className="px-8">
            🏟️ Saisonvorbereitung abschließen → Ligastart
          </Button>
        </div>
      )}

      {/* Skip friendlies option */}
      {!allFriendliesPlayed && campDone && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleComplete}>
            Testspiele überspringen und direkt zur Saison →
          </Button>
        </div>
      )}
    </div>
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
