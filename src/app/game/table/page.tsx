"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useLeagues, useTables, useTeams, useCurrentTeamId } from "@/store/selectors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamLogo } from "@/components/ui/team-logo";

function getPositionStyle(pos: number, totalTeams: number, leagueTier: number) {
  if (leagueTier === 1) {
    if (pos <= 4) return "border-l-2 border-l-green-500 bg-green-500/5";
    if (pos === 5) return "border-l-2 border-l-blue-500 bg-blue-500/5";
    if (pos === 6) return "border-l-2 border-l-sky-400 bg-sky-400/5";
    if (pos === totalTeams - 2) return "border-l-2 border-l-orange-500 bg-orange-500/5";
    if (pos >= totalTeams - 1) return "border-l-2 border-l-red-500 bg-red-500/5";
  }
  if (leagueTier === 2) {
    if (pos <= 2) return "border-l-2 border-l-green-500 bg-green-500/5";
    if (pos === 3) return "border-l-2 border-l-orange-500 bg-orange-500/5";
    if (pos === totalTeams - 2) return "border-l-2 border-l-orange-500 bg-orange-500/5";
    if (pos >= totalTeams - 1) return "border-l-2 border-l-red-500 bg-red-500/5";
  }
  if (leagueTier === 3) {
    if (pos <= 2) return "border-l-2 border-l-green-500 bg-green-500/5";
    if (pos === 3) return "border-l-2 border-l-orange-500 bg-orange-500/5";
    if (pos >= totalTeams - 1) return "border-l-2 border-l-red-500 bg-red-500/5";
  }
  return "";
}

export default function TablePage() {
  const leagues = useLeagues();
  const tables = useTables();
  const teams = useTeams();
  const currentTeamId = useCurrentTeamId();

  const myLeague = useMemo(() => teams.find((t) => t.id === currentTeamId)?.league ?? "bundesliga", [teams, currentTeamId]);

  if (leagues.length === 0) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Tabelle</h1>

      <Tabs defaultValue={myLeague}>
        <TabsList>
          {leagues.map((l) => (
            <TabsTrigger key={l.id} value={l.id}>{l.shortName}</TabsTrigger>
          ))}
        </TabsList>

        {leagues.map((league) => {
          const table = tables[league.id] ?? [];
          const tier = league.tier;

          return (
            <TabsContent key={league.id} value={league.id} className="mt-4">
              <Card className="bg-card border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                        <th className="text-center px-2 py-2 w-10">#</th>
                        <th className="text-left px-3 py-2">Verein</th>
                        <th className="text-center px-2 py-2 w-10">Sp</th>
                        <th className="text-center px-2 py-2 w-10">S</th>
                        <th className="text-center px-2 py-2 w-10">U</th>
                        <th className="text-center px-2 py-2 w-10">N</th>
                        <th className="text-center px-2 py-2 w-16">Tore</th>
                        <th className="text-center px-2 py-2 w-10">Diff</th>
                        <th className="text-center px-2 py-2 w-12 font-bold">Pkt</th>
                        <th className="text-center px-2 py-2 w-24">Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((entry) => {
                        const team = teams.find((t) => t.id === entry.teamId);
                        const isMyTeam = entry.teamId === currentTeamId;
                        const posStyle = getPositionStyle(entry.position, league.numberOfTeams, tier);

                        return (
                          <tr
                            key={entry.teamId}
                            className={`border-b border-border/50 transition-colors ${posStyle} ${isMyTeam ? "bg-primary/5 font-semibold" : "hover:bg-secondary/20"}`}
                          >
                            <td className="text-center px-2 py-2 text-xs">{entry.position}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <TeamLogo
                                  teamId={entry.teamId}
                                  teamName={team?.name ?? entry.teamId}
                                  shortName={team?.shortName}
                                  colors={team?.colors}
                                  size={20}
                                />
                                <span className={`text-sm ${isMyTeam ? "text-primary" : ""}`}>
                                  {team?.name ?? entry.teamId}
                                </span>
                              </div>
                            </td>
                            <td className="text-center px-2 py-2 text-xs">{entry.played}</td>
                            <td className="text-center px-2 py-2 text-xs">{entry.won}</td>
                            <td className="text-center px-2 py-2 text-xs">{entry.drawn}</td>
                            <td className="text-center px-2 py-2 text-xs">{entry.lost}</td>
                            <td className="text-center px-2 py-2 text-xs">{entry.goalsFor}:{entry.goalsAgainst}</td>
                            <td className="text-center px-2 py-2 text-xs">
                              <span className={entry.goalDifference > 0 ? "text-green-400" : entry.goalDifference < 0 ? "text-red-400" : ""}>
                                {entry.goalDifference > 0 ? "+" : ""}{entry.goalDifference}
                              </span>
                            </td>
                            <td className="text-center px-2 py-2 font-bold">{entry.points}</td>
                            <td className="text-center px-2 py-2">
                              <div className="flex items-center justify-center gap-0.5">
                                {entry.form.slice(-5).map((f, i) => (
                                  <span
                                    key={i}
                                    className={`w-4 h-4 rounded-sm text-[10px] flex items-center justify-center font-bold ${
                                      f === "W" ? "bg-green-500/20 text-green-400" :
                                      f === "D" ? "bg-yellow-500/20 text-yellow-400" :
                                      "bg-red-500/20 text-red-400"
                                    }`}
                                  >
                                    {f === "W" ? "S" : f === "D" ? "U" : "N"}
                                  </span>
                                ))}
                                {entry.form.length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="px-4 py-2 border-t border-border flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                  {tier === 1 && (
                    <>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Champions League</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Europa League</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Conference League</span>
                    </>
                  )}
                  {(tier === 2 || tier === 3) && (
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Aufstieg</span>
                  )}
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Relegation</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Abstieg</span>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
