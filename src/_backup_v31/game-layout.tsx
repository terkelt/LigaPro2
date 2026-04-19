"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CalendarSimulation } from "@/components/game/CalendarSimulation";
import { PackOpener } from "@/components/game/PackOpener";
import { SeasonReview } from "@/components/game/SeasonReview";
import { useGameStore } from "@/store/game-store";
import {
  useIsLoaded, useHasGameState, useMyTeam, useMyFinances,
  useCurrentDate, useMySchedule, useCurrentTeamId, useTeams, usePreseason, useSeason,
} from "@/store/selectors";
import { computeDayAgenda } from "@/lib/day-agenda";
import { computeSeasonReview, SeasonReviewData } from "@/lib/season-review";
import { useToast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/store/settings-store";
import { VersionBadge } from "@/components/ui/version-badge";
import { Pack } from "@/types/packs";

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
  const [activePack, setActivePack] = useState<Pack | null>(null);
  const [seasonReview, setSeasonReview] = useState<SeasonReviewData | null>(null);
  const openPack = useGameStore((s) => s.openPack);
  const applyPack = useGameStore((s) => s.applyPack);
  const dismissPack = useGameStore((s) => s.dismissPack);
  const redeemCard = useGameStore((s) => s.redeemCard);
  const { toast } = useToast();
  const menuLayout = useSettingsStore((s) => s.settings.menuLayout ?? 'classic');

  // Detect season change to trigger season review
  const season = useSeason();
  const prevSeasonRef = useRef(season?.number ?? 1);
  useEffect(() => {
    if (!season || !gameState) return;
    if (season.number > prevSeasonRef.current) {
      // Season changed — compute review from the previous season's data
      const review = computeSeasonReview(gameState);
      if (review) setSeasonReview(review);
      prevSeasonRef.current = season.number;
    }
  }, [season?.number, gameState]);

  // Auto-show first unopened pack when calendar sim closes
  const pendingPacks = gameState?.pendingPacks ?? [];
  const unopenedPacks = pendingPacks.filter(p => !p.isOpened);

  const handleCalSimClose = useCallback(() => {
    setShowCalendarSim(false);
    // Show first unopened pack after sim ends
    if (unopenedPacks.length > 0) {
      setTimeout(() => setActivePack(unopenedPacks[0]), 400);
    }
  }, [unopenedPacks]);

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
      "/game/news", "/game/cup", "/game/international", "/game/cards",
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

  const sidebarPadding = menuLayout === 'modern' ? 'pl-14' : 'pl-60';

  return (
    <div className="h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className={`${sidebarPadding} flex flex-col h-screen relative transition-all duration-300`}>
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
        <VersionBadge className="absolute bottom-1 right-2" />
      </div>

      {showCalendarSim && (
        <CalendarSimulation onClose={handleCalSimClose} />
      )}

      {seasonReview && (
        <SeasonReview
          data={seasonReview}
          onClose={() => setSeasonReview(null)}
        />
      )}

      {activePack && !seasonReview && (
        <PackOpener
          pack={activePack}
          onOpen={(id) => openPack(id)}
          onApply={(id) => {
            const cardIds = applyPack(id);
            // Show next pack if available (after closing current)
            return cardIds;
          }}
          onRedeemCard={(cardId) => redeemCard(cardId)}
          onClose={() => {
            if (activePack && !activePack.isOpened) dismissPack(activePack.id);
            // Show next pack if available
            const remaining = unopenedPacks.filter(p => p.id !== activePack.id);
            if (remaining.length > 0) {
              setTimeout(() => setActivePack(remaining[0]), 600);
            }
            setActivePack(null);
          }}
        />
      )}
    </div>
  );
}
