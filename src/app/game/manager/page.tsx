"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Trophy, Calendar, Briefcase, Target, Zap, Star } from "lucide-react";
import { useManager, useMyTeam, useCurrentDate } from "@/store/selectors";
import { useGameStore } from "@/store/game-store";
import { SKILL_NAMES, ManagerSkills } from "@/types/manager";
import { MANAGER_TRAIT_CATALOG, completeMission } from "@/lib/manager-engine";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

function SkillBar({ value, max = 20, label, icon }: { value: number; max?: number; label: string; icon: string }) {
  const pct = (value / max) * 100;
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 35 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-5 text-center">{icon}</span>
      <span className="text-xs w-20 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono w-6 text-right text-muted-foreground">{value}</span>
    </div>
  );
}

export default function ManagerPage() {
  const m = useManager();
  const team = useMyTeam();
  const currentDate = useCurrentDate();
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);

  const handleClaimMission = useCallback((missionId: string) => {
    if (!gameState || !m) return;
    const updated = completeMission(m, missionId);
    setGameState({ ...gameState, manager: updated });
  }, [gameState, m, setGameState]);

  if (!m) return null;

  const xpPct = m.xpToNextLevel > 0 ? Math.round((m.xp / m.xpToNextLevel) * 100) : 0;
  const winRate = m.stats.totalMatches > 0
    ? Math.round((m.stats.wins / m.stats.totalMatches) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Manager Header Card */}
      <Card className="bg-card border-border">
        <CardContent className="py-5">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-bold border-2 border-primary/30 shrink-0"
              style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.15))` }}
            >
              {m.firstName.charAt(0)}{m.lastName.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-bold">{m.firstName} {m.lastName}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Lv. {m.level}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {m.nationality} • {2025 - parseInt(m.dateOfBirth.split('-')[0])} Jahre • {team?.name}
              </p>

              {/* XP Bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden max-w-xs">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${xpPct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{m.xp}/{m.xpToNextLevel} XP</span>
              </div>
            </div>

            <div className="text-right shrink-0 hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reputation</p>
              <p className="text-2xl font-bold text-primary">{m.reputation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Skills + Traits */}
        <div className="lg:col-span-2 space-y-4">

          {/* Skills */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />Manager-Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.entries(SKILL_NAMES) as [keyof ManagerSkills, typeof SKILL_NAMES[keyof ManagerSkills]][]).map(([key, info]) => (
                  <SkillBar key={key} value={m.skills[key]} label={info.name} icon={info.icon} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Traits */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />Manager-Traits
                <span className="text-[10px] font-normal ml-auto">{m.traits.length}/5 aktiv</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {m.traits.length === 0 ? (
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Noch keine Traits freigeschaltet.</p>
                  <p className="text-xs text-muted-foreground/60">Erfülle Missionen und steigere deine Skills, um Manager-Traits zu verdienen!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {m.traits.map(t => (
                    <div key={t.id} className="p-3 rounded-lg border border-border bg-secondary/10 flex items-start gap-2">
                      <span className="text-xl">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">{t.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            t.tier === 3 ? 'bg-amber-500/20 text-amber-400' :
                            t.tier === 2 ? 'bg-slate-300/20 text-slate-300' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {t.tier === 3 ? 'Gold' : t.tier === 2 ? 'Silber' : 'Bronze'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.effect}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Available traits to unlock */}
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Verfügbare Traits</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {MANAGER_TRAIT_CATALOG.filter(td => !m.traits.find(t => t.id === td.id)).slice(0, 6).map(td => (
                    <div key={td.id} className="p-2 rounded-lg border border-border/50 opacity-50">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{td.icon}</span>
                        <span className="text-[10px] font-medium truncate">{td.name}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{td.unlockCondition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />Karriere-Statistiken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Spiele', value: m.stats.totalMatches },
                  { label: 'Siege', value: m.stats.wins },
                  { label: 'Unentschieden', value: m.stats.draws },
                  { label: 'Niederlagen', value: m.stats.losses },
                  { label: 'Siegquote', value: `${winRate}%` },
                  { label: 'Zu-Null', value: m.stats.cleanSheets },
                  { label: 'Comebacks', value: m.stats.comebacks },
                  { label: 'Beste Serie', value: `${m.stats.winStreak}S` },
                  { label: 'Titel', value: m.stats.titlesWon },
                  { label: 'Pokalsiege', value: m.stats.cupsWon },
                  { label: 'Aufstiege', value: m.stats.promotions },
                  { label: 'Jugend-Debüts', value: m.stats.youthDebuts },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-lg bg-secondary/10">
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Missions + Contract */}
        <div className="space-y-4">
          {/* Weekly Missions */}
          <Card className="bg-card border-border border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary">Wöchentliche Missionen</span>
                <span className="text-[10px] font-normal text-muted-foreground ml-auto">
                  {m.missionsCompletedTotal} abgeschlossen
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(m.activeMissions ?? []).map(mission => {
                const progressPct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0;
                const canClaim = mission.progress >= mission.target && !mission.isCompleted;
                return (
                  <div key={mission.id} className={`p-3 rounded-lg border ${mission.isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{mission.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${mission.isCompleted ? 'text-emerald-400 line-through' : ''}`}>
                          {mission.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{mission.description}</p>

                        {/* Progress bar */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${mission.isCompleted ? 'bg-emerald-500' : canClaim ? 'bg-primary animate-pulse' : 'bg-primary/60'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {mission.progress}/{mission.target}
                          </span>
                        </div>

                        {/* Rewards */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">+{mission.reward.xp} XP</span>
                          {mission.reward.skillBoost && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                              +{mission.reward.skillBoost.amount} {SKILL_NAMES[mission.reward.skillBoost.skill].name}
                            </span>
                          )}
                          {mission.reward.reputationBoost && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                              +{mission.reward.reputationBoost} Rep
                            </span>
                          )}
                        </div>

                        {/* Claim button */}
                        {canClaim && (
                          <Button
                            size="sm"
                            className="mt-2 h-6 text-[10px] w-full"
                            onClick={() => handleClaimMission(mission.id)}
                          >
                            ✨ Belohnung einsammeln
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {(m.activeMissions ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Keine aktiven Missionen.</p>
              )}
            </CardContent>
          </Card>

          {/* Contract Info */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />Vertrag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Verein</span><span className="font-medium text-primary">{team?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vertrag bis</span><span>{m.contractUntil}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gehalt</span><span>{(m.salary / 1000).toFixed(0)}k €/Jahr</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reputation</span><span>{m.reputation}/100</span></div>
            </CardContent>
          </Card>

          {/* Career History */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />Karriere
              </CardTitle>
            </CardHeader>
            <CardContent>
              {m.career.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Dies ist dein erster Verein.</p>
              ) : (
                <div className="space-y-2">
                  {m.career.map((entry, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{entry.teamName}</span>
                      <span className="text-muted-foreground text-xs">{entry.startDate} – {entry.endDate ?? "aktuell"}</span>
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
