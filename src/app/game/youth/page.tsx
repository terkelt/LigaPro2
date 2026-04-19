"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useYouthPlayers, useMyTeam, useGameActions, useCurrentDate, calcOverall,
} from "@/store/selectors";
import {
  GraduationCap, ArrowUp, Trash2, Star, TrendingUp, Users, Building2,
} from "lucide-react";
import { Player } from "@/types/player";

const POS_LABELS: Record<string, string> = {
  TW: "TW", IV: "IV", LV: "LV", RV: "RV", ZDM: "ZDM",
  ZM: "ZM", ZOM: "ZOM", LA: "LA", RA: "RA", ST: "ST",
};

function getAge(dob: string, ref: string): number {
  return new Date(ref).getFullYear() - new Date(dob).getFullYear();
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}

function potentialLabel(pot: number): { text: string; color: string } {
  if (pot >= 85) return { text: "Weltklasse", color: "text-yellow-400" };
  if (pot >= 75) return { text: "Herausragend", color: "text-green-400" };
  if (pot >= 65) return { text: "Sehr gut", color: "text-blue-400" };
  if (pot >= 55) return { text: "Gut", color: "text-muted-foreground" };
  return { text: "Durchschnittlich", color: "text-muted-foreground" };
}

export default function YouthPage() {
  const youthPlayers = useYouthPlayers() as Player[];
  const team = useMyTeam();
  const currentDate = useCurrentDate();
  const { promoteYouth, releaseYouth } = useGameActions();

  const sorted = useMemo(
    () => [...youthPlayers].sort((a, b) => b.potential - a.potential),
    [youthPlayers]
  );

  if (!team) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6" /> Jugendakademie
        </h1>
        <span className="text-xs text-muted-foreground">
          {youthPlayers.length} Talente
        </span>
      </div>

      {/* Facility Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Jugendeinrichtung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{team.facilities.youth}<span className="text-sm text-muted-foreground">/10</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Bessere Einrichtungen = bessere Talente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Talente im Kader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{youthPlayers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Neue Talente erscheinen monatlich
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Bestes Talent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sorted.length > 0 ? (
              <>
                <p className="text-lg font-bold">{sorted[0].firstName} {sorted[0].lastName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Potential: {sorted[0].potential} · {POS_LABELS[sorted[0].position]} · {getAge(sorted[0].dateOfBirth, currentDate)} Jahre
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Noch keine Talente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Youth Players List */}
      {sorted.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GraduationCap className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Noch keine Jugendtalente vorhanden.</p>
            <p className="text-xs mt-1">Neue Talente werden monatlich generiert.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Jugendtalente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sorted.map((p) => {
                const age = getAge(p.dateOfBirth, currentDate);
                const ovr = calcOverall(p);
                const pot = potentialLabel(p.potential);

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Position badge */}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground w-8 text-center shrink-0">
                        {POS_LABELS[p.position]}
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {age} Jahre · {p.nationality} · {p.foot === "right" ? "Rechts" : p.foot === "left" ? "Links" : "Beidfüßig"}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">OVR</p>
                        <p className="text-sm font-bold">{ovr}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">POT</p>
                        <p className={`text-sm font-bold ${pot.color}`}>
                          {p.potential}
                        </p>
                      </div>
                      <div className="text-center hidden md:block">
                        <p className="text-xs text-muted-foreground">Wert</p>
                        <p className="text-sm font-medium">{fmt(p.marketValue)}</p>
                      </div>
                      <div className="text-center hidden md:block">
                        <p className="text-xs text-muted-foreground">Gehalt</p>
                        <p className="text-sm font-medium">{fmt(p.salary)}</p>
                      </div>

                      {/* Potential label */}
                      <div className="hidden lg:block w-24 text-center">
                        <span className={`text-[10px] font-medium ${pot.color}`}>
                          <Star className="w-3 h-3 inline mr-0.5" />{pot.text}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => promoteYouth(p.id)}
                          title="In Profikader befördern"
                        >
                          <ArrowUp className="w-3.5 h-3.5 mr-1" /> Befördern
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => releaseYouth(p.id)}
                          title="Aus Akademie entlassen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
