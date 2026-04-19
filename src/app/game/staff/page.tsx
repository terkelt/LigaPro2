"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameStore } from "@/store/game-store";
import {
  UserCog, Plus, Trash2, Star, MapPin, RefreshCw, Zap,
} from "lucide-react";
import { StaffMember, STAFF_ROLE_LABELS, SCOUT_REGION_LABELS, Scout } from "@/types/staff";
import { calcStaffEffects } from "@/lib/staff-engine";

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}

function qualityStars(q: number): string {
  return "★".repeat(Math.min(5, Math.ceil(q / 2))) + "☆".repeat(Math.max(0, 5 - Math.ceil(q / 2)));
}

export default function StaffPage() {
  const staff = useGameStore((s) => s.gameState?.staff ?? []) as StaffMember[];
  const hireStaff = useGameStore((s) => s.hireStaff);
  const fireStaff = useGameStore((s) => s.fireStaff);
  const getAvailableStaff = useGameStore((s) => s.getAvailableStaff);

  const [available, setAvailable] = useState<StaffMember[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const refreshMarket = useCallback(() => {
    setAvailable(getAvailableStaff());
    setHasGenerated(true);
  }, [getAvailableStaff]);

  const groupedAvailable = useMemo(() => {
    const groups: Record<string, StaffMember[]> = {};
    for (const s of available) {
      if (!groups[s.role]) groups[s.role] = [];
      groups[s.role].push(s);
    }
    // Sort each group by quality desc
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => b.quality - a.quality);
    }
    return groups;
  }, [available]);

  const effects = useMemo(() => calcStaffEffects(staff), [staff]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2">
        <UserCog className="w-6 h-6" /> Trainerteam & Staff
      </h1>

      {/* Staff Effects Summary */}
      <Card className="bg-card border-border border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">Staff-Auswirkungen</span>
            <span className="text-[10px] font-normal text-muted-foreground ml-auto">
              {effects.filledRoles}/{effects.totalRoles} Rollen besetzt
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Stelle Personal ein, um Boni zu erhalten.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {effects.trainingBonus > 0 && (
                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-[9px] text-muted-foreground">Training</p>
                  <p className="text-sm font-bold text-emerald-400">+{effects.trainingBonus.toFixed(1)}%</p>
                </div>
              )}
              {effects.matchTacticsBonus > 0 && (
                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-[9px] text-muted-foreground">Taktik-Bonus</p>
                  <p className="text-sm font-bold text-emerald-400">+{effects.matchTacticsBonus.toFixed(1)}%</p>
                </div>
              )}
              {effects.conditionRecovery > 0 && (
                <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
                  <p className="text-[9px] text-muted-foreground">Konditions-Erholung</p>
                  <p className="text-sm font-bold text-blue-400">+{effects.conditionRecovery.toFixed(1)}%</p>
                </div>
              )}
              {effects.trainingInjuryReduction > 0 && (
                <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
                  <p className="text-[9px] text-muted-foreground">Training-Verletzungsrisiko</p>
                  <p className="text-sm font-bold text-blue-400">-{effects.trainingInjuryReduction.toFixed(1)}%</p>
                </div>
              )}
              {effects.injuryDurationReduction > 0 && (
                <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/15">
                  <p className="text-[9px] text-muted-foreground">Heilungsdauer</p>
                  <p className="text-sm font-bold text-purple-400">-{effects.injuryDurationReduction.toFixed(1)}%</p>
                </div>
              )}
              {effects.injuryRiskReduction > 0 && (
                <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/15">
                  <p className="text-[9px] text-muted-foreground">Verletzungsrisiko</p>
                  <p className="text-sm font-bold text-purple-400">-{effects.injuryRiskReduction.toFixed(1)}%</p>
                </div>
              )}
              {effects.gkGrowthBonus > 0 && (
                <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <p className="text-[9px] text-muted-foreground">TW-Entwicklung</p>
                  <p className="text-sm font-bold text-amber-400">+{effects.gkGrowthBonus.toFixed(1)}%</p>
                </div>
              )}
              {effects.youthQualityBonus > 0 && (
                <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/15">
                  <p className="text-[9px] text-muted-foreground">Jugend-Qualität</p>
                  <p className="text-sm font-bold text-green-400">+{effects.youthQualityBonus.toFixed(1)}%</p>
                </div>
              )}
              {effects.scoutCount > 0 && (
                <div className="p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
                  <p className="text-[9px] text-muted-foreground">Scouting ({effects.scoutCount} Scouts)</p>
                  <p className="text-sm font-bold text-cyan-400">+{effects.scoutAccuracy.toFixed(1)}% Genauigkeit</p>
                </div>
              )}
            </div>
          )}
          {staff.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">Gesamtkosten: {fmt(effects.totalStaffSalary)}/Jahr</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Aktuelles Team ({staff.length})</TabsTrigger>
          <TabsTrigger value="hire">Personal einstellen</TabsTrigger>
        </TabsList>

        {/* Current Staff */}
        <TabsContent value="current" className="space-y-4">
          {staff.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserCog className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Kein Personal eingestellt.</p>
                <p className="text-xs mt-1">Wechsle zum Tab &quot;Personal einstellen&quot; um Mitarbeiter zu finden.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {staff.map((s) => (
                <Card key={s.id} className="bg-card border-border">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{s.firstName} {s.lastName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {STAFF_ROLE_LABELS[s.role]}
                          </span>
                          <span className="text-xs text-muted-foreground">{s.nationality}</span>
                          {(s as Scout).region && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {SCOUT_REGION_LABELS[(s as Scout).region] ?? (s as Scout).region}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Qualität</p>
                        <p className="text-sm font-bold text-yellow-400">{s.quality}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Gehalt</p>
                        <p className="text-sm font-medium">{fmt(s.salary)}/Jahr</p>
                      </div>
                      <div className="text-center hidden md:block">
                        <p className="text-xs text-muted-foreground">Vertrag bis</p>
                        <p className="text-sm">{new Date(s.contractUntil).toLocaleDateString("de-DE")}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => fireStaff(s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Entlassen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Hire Staff */}
        <TabsContent value="hire" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hasGenerated
                ? `${available.length} Kandidaten verfügbar`
                : "Klicke auf \"Markt durchsuchen\" um verfügbare Mitarbeiter zu finden."}
            </p>
            <Button size="sm" variant="outline" onClick={refreshMarket}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Markt durchsuchen
            </Button>
          </div>

          {hasGenerated && Object.entries(groupedAvailable).map(([role, members]) => (
            <Card key={role} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role}
                  {staff.some(s => s.role === role) && role !== 'scout' && (
                    <span className="ml-2 text-[10px] text-yellow-400 font-normal">
                      (besetzt — Einstellung ersetzt aktuellen)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.nationality}
                          {(m as Scout).region && (
                            <> · <MapPin className="w-3 h-3 inline" /> {SCOUT_REGION_LABELS[(m as Scout).region] ?? (m as Scout).region}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Qualität</p>
                        <p className="text-sm font-bold text-yellow-400">{m.quality}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Gehalt</p>
                        <p className="text-sm font-medium">{fmt(m.salary)}/Jahr</p>
                      </div>
                      <Button size="sm" onClick={() => { hireStaff(m); setAvailable(prev => prev.filter(a => a.id !== m.id)); }}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Einstellen
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
