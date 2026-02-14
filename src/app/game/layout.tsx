"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CalendarSimulation } from "@/components/game/CalendarSimulation";
import { useGameStore } from "@/store/game-store";
import {
  useIsLoaded, useHasGameState, useMyTeam, useMyFinances,
  useCurrentDate, useMySchedule, useCurrentTeamId, useTeams, usePreseason,
} from "@/store/selectors";
import { computeDayAgenda } from "@/lib/day-agenda";
import { useToast } from "@/hooks/use-toast";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isLoaded = useIsLoaded();
  const hasGameState = useHasGameState();
  const saveCurrentGame = useGameStore((s) => s.saveCurrentGame);
  const gameState = useGameStore((s) => s.gameState);
  const [showCalendarSim, setShowCalendarSim] = useState(false);
  const { toast } = useToast();

  const handleSave = useCallback(async () => {
    try {
      await saveCurrentGame();
      toast({ title: "Gespeichert", description: "Spielstand wurde erfolgreich gespeichert." });
    } catch {
      toast({ title: "Fehler", description: "Spielstand konnte nicht gespeichert werden.", variant: "destructive" });
    }
  }, [saveCurrentGame, toast]);

  const team = useMyTeam();
  const finances = useMyFinances();
  const currentDate = useCurrentDate();
  const currentTeamId = useCurrentTeamId();
  const mySchedule = useMySchedule();
  const teams = useTeams();

  useEffect(() => {
    if (!isLoaded || !hasGameState) {
      router.replace("/");
    }
  }, [isLoaded, hasGameState, router]);

  // Prefetch all game routes on mount so they compile immediately
  useEffect(() => {
    const routes = [
      "/game/dashboard", "/game/squad", "/game/tactics", "/game/schedule",
      "/game/table", "/game/transfers", "/game/finances", "/game/training",
      "/game/youth", "/game/staff", "/game/stats", "/game/manager",
      "/game/news",
    ];
    routes.forEach((r) => router.prefetch(r));
  }, [router]);

  const { nextOpponentName, nextMatchDate } = useMemo(() => {
    if (!mySchedule) return { nextOpponentName: undefined, nextMatchDate: undefined };
    const nextMatch = mySchedule.matches.find(
      (m) => !m.isPlayed && (m.homeTeamId === currentTeamId || m.awayTeamId === currentTeamId)
    );
    if (!nextMatch) return { nextOpponentName: undefined, nextMatchDate: undefined };
    const oppId = nextMatch.homeTeamId === currentTeamId ? nextMatch.awayTeamId : nextMatch.homeTeamId;
    const opp = teams.find((t) => t.id === oppId);
    return { nextOpponentName: opp?.name, nextMatchDate: nextMatch.date };
  }, [mySchedule, currentTeamId, teams]);

  const preseason = usePreseason();
  const isPreseason = preseason && !preseason.isCompleted;

  const agenda = useMemo(() => {
    if (!gameState) return null;
    return computeDayAgenda(gameState);
  }, [gameState]);

  if (!hasGameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="pl-60 flex flex-col h-screen">
        <Header
          teamName={team?.name ?? "Kein Verein"}
          currentDate={currentDate}
          budget={finances?.transferBudget ?? 0}
          nextOpponent={nextOpponentName}
          nextMatchDate={nextMatchDate}
          onAdvance={() => setShowCalendarSim(true)}
          onSave={handleSave}
          canAdvance={isPreseason ? false : (agenda?.canAdvance ?? true)}
          isMatchDay={isPreseason ? false : (agenda?.isMatchDay ?? false)}
        />
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>

      {showCalendarSim && (
        <CalendarSimulation onClose={() => setShowCalendarSim(false)} />
      )}
    </div>
  );
}
