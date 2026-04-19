"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/store/game-store";
import { useTeams, useCurrentTeamId, useResults } from "@/store/selectors";
import { TeamLogo } from "@/components/ui/team-logo";
import { Trophy, CheckCircle, XCircle, Clock, Swords, Eye } from "lucide-react";
import { getCupName } from "@/lib/cup-engine";

export default function CupPage() {
  const router = useRouter();
  const cupState = useGameStore((s) => s.gameState?.cupState ?? null);
  const gameState = useGameStore((s) => s.gameState);
  const teams = useTeams();
  const results = useResults();
  const currentTeamId = useCurrentTeamId();
  const cupName = gameState ? getCupName(gameState) : 'Pokal';

  const teamMap = useMemo(() => {
    const map = new Map<string, { name: string; shortName: string; colors: { primary: string; secondary: string } }>();
    for (const t of teams as import("@/types/team").Team[]) {
      map.set(t.id, { name: t.name, shortName: t.shortName, colors: t.colors });
    }
    return map;
  }, [teams]);

  const getTeam = (id: string) => teamMap.get(id) ?? { name: id.startsWith("amateur") ? id : "Unbekannt", shortName: "???", colors: { primary: "#666", secondary: "#999" } };

  // Check if player's team is still in the cup
  const isEliminated = useMemo(() => {
    if (!cupState) return false;
    for (const round of cupState.rounds) {
      for (const match of round.matches) {
        if (!match.isPlayed || !match.result) continue;
        const isInMatch = match.homeTeamId === currentTeamId || match.awayTeamId === currentTeamId;
        if (!isInMatch) continue;
        const isHome = match.homeTeamId === currentTeamId;
        const myScore = isHome ? match.result.homeScore : match.result.awayScore;
        const oppScore = isHome ? match.result.awayScore : match.result.homeScore;
        if (myScore < oppScore) return true;
      }
    }
    return false;
  }, [cupState, currentTeamId]);

  if (!cupState) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6" /> {cupName}
        </h1>
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Trophy className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Der {cupName} wurde noch nicht ausgelost.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6" /> {cupName}
        </h1>
        <div className="flex items-center gap-2">
          {cupState.isFinished && cupState.winnerId && (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
              Sieger: {getTeam(cupState.winnerId).name}
            </span>
          )}
          {isEliminated && !cupState.isFinished && (
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-medium">
              Ausgeschieden
            </span>
          )}
          {!isEliminated && !cupState.isFinished && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium">
              Noch im Wettbewerb
            </span>
          )}
        </div>
      </div>

      {/* Rounds */}
      {[...cupState.rounds].reverse().map((round, reverseIdx) => {
        const roundIdx = cupState.rounds.length - 1 - reverseIdx;
        const isCurrent = roundIdx === cupState.currentRound && !cupState.isFinished;

        return (
          <Card key={round.name} className={`bg-card ${isCurrent ? "border-primary/50" : "border-border"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {round.isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : isCurrent ? (
                    <Swords className="w-4 h-4 text-primary" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                  {round.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {round.matches.filter(m => m.isPlayed).length}/{round.matches.length} gespielt
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {round.matches
                  .sort((a, b) => {
                    // Player's match first
                    const aIsPlayer = a.homeTeamId === currentTeamId || a.awayTeamId === currentTeamId;
                    const bIsPlayer = b.homeTeamId === currentTeamId || b.awayTeamId === currentTeamId;
                    if (aIsPlayer && !bIsPlayer) return -1;
                    if (!aIsPlayer && bIsPlayer) return 1;
                    return 0;
                  })
                  .map((match) => {
                    const home = getTeam(match.homeTeamId);
                    const away = getTeam(match.awayTeamId);
                    const isPlayerMatch = match.homeTeamId === currentTeamId || match.awayTeamId === currentTeamId;

                    return (
                      <div
                        key={match.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border ${
                          isPlayerMatch
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <TeamLogo
                            teamId={match.homeTeamId}
                            teamName={home.name}
                            shortName={home.shortName}
                            colors={home.colors}
                            size={20}
                          />
                          <span className={`text-xs truncate ${
                            match.homeTeamId === currentTeamId ? "font-bold text-primary" : ""
                          }`}>
                            {home.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 shrink-0">
                          {match.isPlayed && match.result ? (
                            <button
                              className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group bg-muted/50 hover:bg-muted px-2 py-0.5 rounded"
                              onClick={() => router.push(`/game/match/${match.id}`)}
                              title="Spiel ansehen"
                            >
                              <span className="text-sm font-bold tabular-nums">
                                {match.result.homeScore} : {match.result.awayScore}
                              </span>
                              <Eye className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {new Date(match.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span className={`text-xs truncate text-right ${
                            match.awayTeamId === currentTeamId ? "font-bold text-primary" : ""
                          }`}>
                            {away.name}
                          </span>
                          <TeamLogo
                            teamId={match.awayTeamId}
                            teamName={away.name}
                            shortName={away.shortName}
                            colors={away.colors}
                            size={20}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
