"use client";

import { useMemo } from "react";
import { useLeagues, useTables, useTeams, useCurrentTeamId } from "@/store/selectors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamLogo } from "@/components/ui/team-logo";
import { Trophy } from "lucide-react";

function getPositionStyle(pos: number, totalTeams: number, leagueTier: number) {
  if (leagueTier === 1) {
    if (pos <= 4) return "border-l-2 border-l-emerald-500/80";
    if (pos === 5) return "border-l-2 border-l-blue-500/80";
    if (pos === 6) return "border-l-2 border-l-sky-400/80";
    if (pos === totalTeams - 2) return "border-l-2 border-l-orange-500/80";
    if (pos >= totalTeams - 1) return "border-l-2 border-l-red-500/80";
  }
  if (leagueTier === 2) {
    if (pos <= 2) return "border-l-2 border-l-emerald-500/80";
    if (pos === 3) return "border-l-2 border-l-orange-500/80";
    if (pos === totalTeams - 2) return "border-l-2 border-l-orange-500/80";
    if (pos >= totalTeams - 1) return "border-l-2 border-l-red-500/80";
  }
  if (leagueTier === 3) {
    if (pos <= 2) return "border-l-2 border-l-emerald-500/80";
    if (pos === 3) return "border-l-2 border-l-orange-500/80";
    if (pos >= totalTeams - 1) return "border-l-2 border-l-red-500/80";
  }
  return "border-l-2 border-l-transparent";
}

export default function TablePage() {
  const leagues = useLeagues();
  const tables = useTables();
  const teams = useTeams();
  const currentTeamId = useCurrentTeamId();

  const myLeague = useMemo(() => teams.find((t) => t.id === currentTeamId)?.league ?? "bundesliga", [teams, currentTeamId]);

  if (leagues.length === 0) return null;

  return (
    <div className="space-y-4 animate-slide-up max-w-[1400px] mx-auto">
      {/* ═══ Page Header ═══ */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Tabellen</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{leagues.length} Ligen verfügbar</p>
        </div>
        <div className="metric-badge bg-primary/10 text-primary">
          <Trophy className="w-3 h-3" />
          <span>Aktuelle Stände</span>
        </div>
      </div>

      <Tabs defaultValue={myLeague}>
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/30 h-9">
          {leagues.map((l) => (
            <TabsTrigger key={l.id} value={l.id} className="text-[12px]">{l.shortName}</TabsTrigger>
          ))}
        </TabsList>

        {leagues.map((league) => {
          const table = tables[league.id] ?? [];
          const tier = league.tier;

          return (
            <TabsContent key={league.id} value={league.id} className="mt-3">
              <div className="tile overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border/40 bg-secondary/20 text-[9px] text-muted-foreground/70 uppercase tracking-widest">
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
                            className={`border-b border-border/15 transition-colors ${posStyle} ${
                              isMyTeam ? "bg-primary/8 font-semibold" : "hover:bg-secondary/15"
                            }`}
                          >
                            <td className="text-center px-2 py-2 font-mono">
                              <span className={`inline-flex items-center gap-0.5 ${isMyTeam ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                {entry.position}
                                {entry.form.length > 0 && entry.form[entry.form.length - 1] === 'W' && <span className="text-emerald-400 text-[8px]">▲</span>}
                                {entry.form.length > 0 && entry.form[entry.form.length - 1] === 'L' && <span className="text-red-400 text-[8px]">▼</span>}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <TeamLogo
                                  teamId={entry.teamId}
                                  teamName={team?.name ?? entry.teamId}
                                  shortName={team?.shortName}
                                  colors={team?.colors}
                                  size={20}
                                />
                                <span className={isMyTeam ? "text-primary" : ""}>
                                  {team?.name ?? entry.teamId}
                                </span>
                              </div>
                            </td>
                            <td className="text-center px-2 py-2 font-mono text-muted-foreground">{entry.played}</td>
                            <td className="text-center px-2 py-2 font-mono">{entry.won}</td>
                            <td className="text-center px-2 py-2 font-mono text-muted-foreground">{entry.drawn}</td>
                            <td className="text-center px-2 py-2 font-mono">{entry.lost}</td>
                            <td className="text-center px-2 py-2 font-mono text-muted-foreground">{entry.goalsFor}:{entry.goalsAgainst}</td>
                            <td className="text-center px-2 py-2 font-mono">
                              <span className={entry.goalDifference > 0 ? "text-emerald-400" : entry.goalDifference < 0 ? "text-red-400" : "text-muted-foreground"}>
                                {entry.goalDifference > 0 ? "+" : ""}{entry.goalDifference}
                              </span>
                            </td>
                            <td className={`text-center px-2 py-2 font-mono font-bold ${isMyTeam ? "text-primary" : ""}`}>{entry.points}</td>
                            <td className="text-center px-2 py-2">
                              <div className="flex items-center justify-center gap-0.5">
                                {entry.form.slice(-5).map((f, i) => (
                                  <span
                                    key={i}
                                    className={`w-3.5 h-3.5 rounded text-[8px] flex items-center justify-center font-bold ${
                                      f === "W" ? "bg-emerald-500/20 text-emerald-400" :
                                      f === "D" ? "bg-amber-500/20 text-amber-400" :
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
                <div className="px-4 py-2 border-t border-border/30 flex flex-wrap gap-3 text-[10px] text-muted-foreground bg-secondary/10">
                  {tier === 1 && (
                    <>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Champions League</span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Europa League</span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Conference League</span>
                    </>
                  )}
                  {(tier === 2 || tier === 3) && (
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aufstieg</span>
                  )}
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Relegation</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Abstieg</span>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
