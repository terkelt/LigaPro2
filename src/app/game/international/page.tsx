"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/store/game-store";
import { useTeams, useCurrentTeamId } from "@/store/selectors";
import { TeamLogo } from "@/components/ui/team-logo";
import { Globe, Trophy, CheckCircle, XCircle, Clock, Star, Shield } from "lucide-react";
import { getForeignClubs } from "@/lib/international-engine";

const COMP_NAMES: Record<string, string> = {
  cl: "Champions League",
  el: "Europa League",
  ecl: "Conference League",
};

const COMP_COLORS: Record<string, string> = {
  cl: "from-blue-900 to-blue-700",
  el: "from-orange-700 to-orange-500",
  ecl: "from-green-800 to-green-600",
};

const COMP_ICONS: Record<string, string> = {
  cl: "🏆",
  el: "🥈",
  ecl: "🥉",
};

const PHASE_NAMES: Record<string, string> = {
  league: "Ligaphase",
  playoff: "Playoff-Runde",
  group: "Gruppenphase",
  r16: "Achtelfinale",
  quarter: "Viertelfinale",
  semi: "Halbfinale",
  final: "Finale",
};

export default function InternationalPage() {
  const intlState = useGameStore((s) => s.gameState?.internationalState ?? null);
  const teams = useTeams();
  const currentTeamId = useCurrentTeamId();

  const foreignClubs = useMemo(() => {
    const map = new Map<string, { name: string; shortName: string; country: string }>();
    for (const fc of getForeignClubs()) {
      map.set(fc.id, { name: fc.name, shortName: fc.shortName, country: fc.country });
    }
    return map;
  }, []);

  const teamMap = useMemo(() => {
    const map = new Map<string, { name: string; shortName: string; colors: { primary: string; secondary: string } }>();
    for (const t of teams as import("@/types/team").Team[]) {
      map.set(t.id, { name: t.name, shortName: t.shortName, colors: t.colors });
    }
    return map;
  }, [teams]);

  const getTeamDisplay = (id: string) => {
    // Check foreign clubs FIRST — they also get added to teams[] but should keep their real country flag
    const fc = foreignClubs.get(id);
    const real = teamMap.get(id);
    if (fc) {
      return { name: fc.name, shortName: fc.shortName, isReal: !!real, country: fc.country, colors: real?.colors };
    }
    if (real) return { name: real.name, shortName: real.shortName, isReal: true, country: "🇩🇪", colors: real.colors };
    return { name: id, shortName: "???", isReal: false, country: "🏳️", colors: undefined };
  };

  // No international competition
  if (!intlState) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Internationale Wettbewerbe</h1>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Globe className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">Nicht qualifiziert</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Dein Team hat sich in dieser Saison nicht für einen internationalen Wettbewerb qualifiziert.
              Beende die Bundesliga-Saison auf Platz 1-7, um dich für CL, EL oder ECL zu qualifizieren.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto text-xs text-muted-foreground">
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/30">
                <div className="text-lg mb-1">🏆</div>
                <div className="font-semibold">Champions League</div>
                <div>Platz 1-4</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-950/30 border border-orange-800/30">
                <div className="text-lg mb-1">🥈</div>
                <div className="font-semibold">Europa League</div>
                <div>Platz 5-6</div>
              </div>
              <div className="p-3 rounded-lg bg-green-950/30 border border-green-800/30">
                <div className="text-lg mb-1">🥉</div>
                <div className="font-semibold">Conference League</div>
                <div>Platz 7</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const comp = intlState.competition;
  const compName = COMP_NAMES[comp] ?? comp;
  const compColor = COMP_COLORS[comp] ?? "from-gray-800 to-gray-600";
  const compIcon = COMP_ICONS[comp] ?? "🏆";
  const phaseName = PHASE_NAMES[intlState.currentPhase] ?? intlState.currentPhase;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className={`rounded-xl bg-gradient-to-r ${compColor} p-6 text-white`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{compIcon}</span>
          <div>
            <h1 className="text-2xl font-bold">{compName}</h1>
            <p className="text-white/70 text-sm">
              {intlState.isFinished
                ? intlState.isEliminated
                  ? "Ausgeschieden"
                  : "🏆 Gewonnen!"
                : `Aktuelle Phase: ${phaseName}`}
            </p>
          </div>
        </div>
        {intlState.isFinished && !intlState.isEliminated && (
          <div className="mt-3 flex items-center gap-2 text-yellow-300">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">Herzlichen Glückwunsch zum {compName}-Sieg!</span>
          </div>
        )}
      </div>

      {/* League Phase (Swiss Model) */}
      {intlState.leaguePhase && intlState.leaguePhase.table.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Ligaphase — {intlState.leaguePhase.teams.length} Teams
          </h2>

          {/* Zone Legend */}
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Platz 1-8: Direkt Achtelfinale</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Platz 9-24: Playoff</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Platz 25-36: Ausgeschieden</span>
          </div>

          {/* League Table */}
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-1 w-6">#</th>
                    <th className="text-left py-1">Team</th>
                    <th className="text-center py-1 w-6">Sp</th>
                    <th className="text-center py-1 w-6">S</th>
                    <th className="text-center py-1 w-6">U</th>
                    <th className="text-center py-1 w-6">N</th>
                    <th className="text-center py-1 w-12">Tore</th>
                    <th className="text-center py-1 w-8">TD</th>
                    <th className="text-center py-1 w-8 font-bold">Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {intlState.leaguePhase.table.map((entry, i) => {
                    const display = getTeamDisplay(entry.teamId);
                    const isPlayer = entry.teamId === currentTeamId;
                    const zone = i < 8 ? "border-l-green-500" : i < 24 ? "border-l-yellow-500" : "border-l-red-500";
                    return (
                      <tr
                        key={entry.teamId}
                        className={`border-b last:border-0 border-l-2 ${zone} ${isPlayer ? "bg-primary/10 font-semibold" : ""}`}
                      >
                        <td className="py-1 text-muted-foreground pl-1">{i + 1}</td>
                        <td className="py-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]">{display.country}</span>
                            <TeamLogo teamId={entry.teamId} teamName={display.name} shortName={display.shortName} colors={display.colors} size={14} />
                            <span className={`truncate ${isPlayer ? "text-primary" : ""}`}>{display.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-1">{entry.played}</td>
                        <td className="text-center py-1 text-green-500">{entry.won}</td>
                        <td className="text-center py-1 text-yellow-500">{entry.drawn}</td>
                        <td className="text-center py-1 text-red-500">{entry.lost}</td>
                        <td className="text-center py-1">{entry.goalsFor}:{entry.goalsAgainst}</td>
                        <td className="text-center py-1">{entry.goalDifference > 0 ? "+" : ""}{entry.goalDifference}</td>
                        <td className="text-center py-1 font-bold">{entry.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Player's Matches */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Deine Spiele</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {intlState.leaguePhase.matches
                  .filter(m => m.homeTeamId === currentTeamId || m.awayTeamId === currentTeamId)
                  .sort((a, b) => a.matchday - b.matchday)
                  .map((match) => {
                    const home = getTeamDisplay(match.homeTeamId);
                    const away = getTeamDisplay(match.awayTeamId);
                    const isHome = match.homeTeamId === currentTeamId;
                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-primary/5"
                      >
                        <span className="text-[10px] text-muted-foreground w-8 shrink-0">ST {match.matchday}</span>
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <span className={`text-xs text-right truncate ${isHome ? "font-semibold text-primary" : ""}`}>{home.name}</span>
                          <span className="text-[10px]">{home.country}</span>
                          <TeamLogo teamId={match.homeTeamId} teamName={home.name} shortName={home.shortName} colors={home.colors} size={16} />
                        </div>
                        <div className="w-14 text-center font-mono shrink-0">
                          {match.isPlayed && match.result ? (
                            <span className="font-semibold text-xs">{match.result.homeScore} : {match.result.awayScore}</span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">{match.date.slice(5)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-1">
                          <TeamLogo teamId={match.awayTeamId} teamName={away.name} shortName={away.shortName} colors={away.colors} size={16} />
                          <span className="text-[10px]">{away.country}</span>
                          <span className={`text-xs truncate ${!isHome ? "font-semibold text-primary" : ""}`}>{away.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0">
                          {isHome ? "H" : "A"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Knockout Stage */}
      {intlState.knockoutMatches && intlState.knockoutMatches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5" />
            K.O.-Runde
          </h2>
          {(['playoff', 'r16', 'quarter', 'semi', 'final'] as const).map((phase) => {
            const phaseMatches = intlState.knockoutMatches!.filter(m => m.cupRound === phase);
            if (phaseMatches.length === 0) return null;
            return (
              <Card key={phase}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{PHASE_NAMES[phase] ?? phase}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {phaseMatches.map((match) => {
                      const home = getTeamDisplay(match.homeTeamId);
                      const away = getTeamDisplay(match.awayTeamId);
                      const isPlayerMatch = match.homeTeamId === currentTeamId || match.awayTeamId === currentTeamId;
                      const isPlayed = match.isPlayed && match.result;
                      let resultIcon = <Clock className="w-4 h-4 text-muted-foreground" />;
                      if (isPlayed && isPlayerMatch) {
                        const isHome = match.homeTeamId === currentTeamId;
                        const myScore = isHome ? match.result!.homeScore : match.result!.awayScore;
                        const oppScore = isHome ? match.result!.awayScore : match.result!.homeScore;
                        resultIcon = myScore > oppScore
                          ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : myScore < oppScore
                            ? <XCircle className="w-4 h-4 text-red-500" />
                            : <Clock className="w-4 h-4 text-yellow-500" />;
                      }

                      return (
                        <div
                          key={match.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${isPlayerMatch ? "border-primary/30 bg-primary/5" : "border-border"}`}
                        >
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className={`font-medium text-right truncate ${match.homeTeamId === currentTeamId ? "text-primary font-bold" : ""}`}>
                              {home.name}
                            </span>
                            <span className="text-sm shrink-0">{home.country}</span>
                            <TeamLogo teamId={match.homeTeamId} teamName={home.name} shortName={home.shortName} colors={home.colors} size={24} />
                          </div>
                          <div className="px-4 text-center min-w-[80px] shrink-0">
                            {isPlayed ? (
                              <span className="text-lg font-bold">{match.result!.homeScore} : {match.result!.awayScore}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">{match.date.slice(5)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <TeamLogo teamId={match.awayTeamId} teamName={away.name} shortName={away.shortName} colors={away.colors} size={24} />
                            <span className="text-sm shrink-0">{away.country}</span>
                            <span className={`font-medium truncate ${match.awayTeamId === currentTeamId ? "text-primary font-bold" : ""}`}>
                              {away.name}
                            </span>
                          </div>
                          <div className="ml-3">{resultIcon}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
