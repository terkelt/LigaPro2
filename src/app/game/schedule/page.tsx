"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useMySchedule, useLeagues, useTeams, useCurrentTeamId, useSeason } from "@/store/selectors";
import { TeamLogo } from "@/components/ui/team-logo";

export default function SchedulePage() {
  const router = useRouter();
  const currentTeamId = useCurrentTeamId();
  const schedule = useMySchedule();
  const leagues = useLeagues();
  const teams = useTeams();
  const season = useSeason();

  const myLeague = useMemo(() => teams.find((t) => t.id === currentTeamId)?.league ?? null, [teams, currentTeamId]);
  const league = useMemo(() => leagues.find((l) => l.id === myLeague) ?? null, [leagues, myLeague]);

  const initialMatchday = useMemo(() => {
    if (!schedule) return 1;
    const nextUnplayed = schedule.matches.find(
      (m) => !m.isPlayed && (m.homeTeamId === currentTeamId || m.awayTeamId === currentTeamId)
    );
    return nextUnplayed?.matchday ?? (season?.currentMatchday || 1);
  }, [schedule, currentTeamId, season]);

  const [selectedMatchday, setSelectedMatchday] = useState(initialMatchday);

  const matchdayMatches = useMemo(() => {
    if (!schedule) return [];
    return schedule.matches
      .filter((m) => m.matchday === selectedMatchday)
      .sort((a, b) => {
        // Player's match always first
        const aIsMine = a.homeTeamId === currentTeamId || a.awayTeamId === currentTeamId;
        const bIsMine = b.homeTeamId === currentTeamId || b.awayTeamId === currentTeamId;
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        // Then by date
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        // Then by time
        if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
        // Then alphabetically by home team
        const homeA = teams.find((t) => t.id === a.homeTeamId)?.name ?? '';
        const homeB = teams.find((t) => t.id === b.homeTeamId)?.name ?? '';
        return homeA.localeCompare(homeB);
      });
  }, [schedule, selectedMatchday, currentTeamId, teams]);

  const totalMatchdays = league?.matchdays ?? 34;

  if (!schedule) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Spielplan</h1>

      {/* Matchday navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          disabled={selectedMatchday <= 1}
          onClick={() => setSelectedMatchday((d) => d - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-display text-lg font-bold min-w-32 text-center">
          {selectedMatchday}. Spieltag
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={selectedMatchday >= totalMatchdays}
          onClick={() => setSelectedMatchday((d) => d + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Match list */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {matchdayMatches[0]?.date ?? "—"} | {league?.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {matchdayMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine Spiele für diesen Spieltag.</p>
          ) : (
            <div>
              {matchdayMatches.map((match) => {
                const home = teams.find((t) => t.id === match.homeTeamId);
                const away = teams.find((t) => t.id === match.awayTeamId);
                const isMyMatch = match.homeTeamId === currentTeamId || match.awayTeamId === currentTeamId;
                const result = match.result;

                return (
                  <div
                    key={match.id}
                    className={`grid grid-cols-[1fr_24px_56px_24px_1fr_auto] items-center gap-1 px-4 py-3 border-b border-border/50 ${isMyMatch ? "bg-primary/5" : "hover:bg-secondary/20"} ${result ? "cursor-pointer" : ""}`}
                    onClick={() => result && router.push(`/game/match/${match.id}`)}
                  >
                    <span className={`text-sm font-medium text-right truncate ${isMyMatch && match.homeTeamId === currentTeamId ? "text-primary" : ""}`}>
                      {home?.name ?? "?"}
                    </span>
                    <div className="flex justify-center">
                      <TeamLogo
                        teamId={match.homeTeamId}
                        teamName={home?.name ?? match.homeTeamId}
                        shortName={home?.shortName}
                        colors={home?.colors}
                        size={20}
                      />
                    </div>

                    <div className="text-center">
                      {result ? (
                        <span className="font-mono font-bold text-sm">
                          {result.homeScore} : {result.awayScore}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">vs</span>
                      )}
                    </div>

                    <div className="flex justify-center">
                      <TeamLogo
                        teamId={match.awayTeamId}
                        teamName={away?.name ?? match.awayTeamId}
                        shortName={away?.shortName}
                        colors={away?.colors}
                        size={20}
                      />
                    </div>
                    <span className={`text-sm font-medium truncate ${isMyMatch && match.awayTeamId === currentTeamId ? "text-primary" : ""}`}>
                      {away?.name ?? "?"}
                    </span>

                    <span className="text-[10px] text-muted-foreground truncate max-w-28 text-right hidden md:block">
                      {match.venue}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
