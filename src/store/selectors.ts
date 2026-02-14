/**
 * Granular Zustand selectors to avoid full gameState re-renders.
 * Each selector returns only the slice of state the component actually needs.
 *
 * IMPORTANT: Selectors that derive data (.filter / .find) MUST use useShallow
 * to prevent infinite re-render loops (new array/object reference each call).
 * Fallback values MUST be stable constants (not inline literals).
 */
import { useGameStore } from './game-store';
import { useShallow } from 'zustand/react/shallow';
import { Player } from '@/types/player';

// --- Stable fallback constants (prevent new-reference re-render loops) ---
const EMPTY_ARRAY: never[] = [];
const EMPTY_TABLES: Record<string, never[]> = {};
const EMPTY_TRANSFERS = { offers: [] as never[], completed: [] as never[], listings: [] as never[], loans: [] as never[], rumors: [] as never[] };

// --- Cached calcOverall ---
const overallCache = new Map<string, number>();

export function invalidateOverallCache() {
  overallCache.clear();
}

export function calcOverall(p: Player): number {
  const cached = overallCache.get(p.id);
  if (cached !== undefined) return cached;

  const a = p.attributes;
  let result: number;
  if (p.position === 'TW') result = Math.round(a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1);
  else if (['IV', 'LV', 'RV'].includes(p.position)) result = Math.round(a.positioning * 0.2 + a.strength * 0.1 + a.heading * 0.1 + a.pace * 0.1 + a.passing * 0.1 + a.aggression * 0.1 + a.composure * 0.1 + a.stamina * 0.1 + a.workRate * 0.1);
  else if (['ZDM', 'ZM'].includes(p.position)) result = Math.round(a.passing * 0.2 + a.vision * 0.15 + a.stamina * 0.1 + a.positioning * 0.1 + a.ballControl * 0.1 + a.workRate * 0.1 + a.composure * 0.1 + a.shooting * 0.05 + a.strength * 0.1);
  else if (p.position === 'ZOM') result = Math.round(a.vision * 0.2 + a.passing * 0.15 + a.ballControl * 0.15 + a.dribbling * 0.1 + a.shooting * 0.1 + a.composure * 0.1 + a.finishing * 0.1 + a.pace * 0.1);
  else if (['LA', 'RA'].includes(p.position)) result = Math.round(a.pace * 0.2 + a.dribbling * 0.15 + a.crossing * 0.15 + a.acceleration * 0.1 + a.shooting * 0.1 + a.ballControl * 0.1 + a.stamina * 0.1 + a.finishing * 0.1);
  else result = Math.round(a.finishing * 0.25 + a.shooting * 0.15 + a.heading * 0.1 + a.positioning * 0.1 + a.composure * 0.1 + a.pace * 0.1 + a.strength * 0.1 + a.dribbling * 0.1);

  overallCache.set(p.id, result);
  return result;
}

// --- Formatters (shared, no re-import needed) ---

export function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}

export function getAge(dob: string, refDate?: string): number {
  return new Date(refDate ?? '2025-07-01').getFullYear() - new Date(dob).getFullYear();
}

// --- Primitive selectors (safe — return same reference) ---

export function useCurrentTeamId() {
  return useGameStore((s) => s.gameState?.currentTeamId ?? '');
}

export function useCurrentDate() {
  return useGameStore((s) => s.gameState?.currentDate ?? '');
}

export function useIsLoaded() {
  return useGameStore((s) => s.isLoaded);
}

export function useHasGameState() {
  return useGameStore((s) => !!s.gameState);
}

// --- Direct-ref selectors (safe — return existing object from state) ---

export function useManager() {
  return useGameStore((s) => s.gameState?.manager ?? null);
}

export function useTeams() {
  return useGameStore((s) => s.gameState?.teams ?? EMPTY_ARRAY);
}

export function useLeagues() {
  return useGameStore((s) => s.gameState?.leagues ?? EMPTY_ARRAY);
}

export function useAllPlayers() {
  return useGameStore((s) => s.gameState?.players ?? EMPTY_ARRAY);
}

export function useSeason() {
  return useGameStore((s) => s.gameState?.season ?? null);
}

export function useSchedules() {
  return useGameStore((s) => s.gameState?.schedules ?? EMPTY_ARRAY);
}

export function useResults() {
  return useGameStore((s) => s.gameState?.results ?? EMPTY_ARRAY);
}

export function useTables() {
  return useGameStore((s) => s.gameState?.tables ?? EMPTY_TABLES);
}

export function useTraining() {
  return useGameStore((s) => s.gameState?.training ?? null);
}

export function useTransfers() {
  return useGameStore((s) => s.gameState?.transfers ?? EMPTY_TRANSFERS);
}

export function useScoutReports() {
  return useGameStore((s) => s.gameState?.scoutReports ?? EMPTY_ARRAY);
}

export function useNews() {
  return useGameStore((s) => s.gameState?.news ?? EMPTY_ARRAY);
}

export function usePressConferences() {
  return useGameStore((s) => s.gameState?.pressConferences ?? EMPTY_ARRAY);
}

export function useAdvanceSummary() {
  return useGameStore((s) => s.lastAdvanceSummary);
}

// --- Derived selectors (MUST use useShallow — .filter/.find create new refs) ---

export function useMyTeam() {
  return useGameStore(
    useShallow((s) => {
      if (!s.gameState) return null;
      return s.gameState.teams.find((t) => t.id === s.gameState!.currentTeamId) ?? null;
    })
  );
}

export function useMyPlayers() {
  return useGameStore(
    useShallow((s) => {
      if (!s.gameState) return EMPTY_ARRAY;
      return s.gameState.players.filter((p) => p.teamId === s.gameState!.currentTeamId);
    })
  );
}

export function useMyFinances() {
  return useGameStore(
    useShallow((s) => {
      if (!s.gameState) return null;
      return s.gameState.finances[s.gameState.currentTeamId] ?? null;
    })
  );
}

export function useMySchedule() {
  return useGameStore(
    useShallow((s) => {
      if (!s.gameState) return null;
      const team = s.gameState.teams.find((t) => t.id === s.gameState!.currentTeamId);
      return s.gameState.schedules.find((sc) => sc.leagueId === team?.league) ?? null;
    })
  );
}

export function useTransferWindow() {
  return useGameStore(
    useShallow((s) => ({
      isOpen: s.gameState?.isTransferWindowOpen ?? false,
      type: s.gameState?.transferWindowType ?? 'summer',
    }))
  );
}

export function useTactics() {
  return useGameStore(
    useShallow((s) => ({
      tactics: s.gameState?.tactics ?? null,
      activeTactic: s.gameState?.activeTactic ?? 'a',
    }))
  );
}

export function usePreseason() {
  return useGameStore((s) => s.gameState?.preseason ?? null);
}

// --- Actions (stable references) ---

export function useGameActions() {
  return useGameStore(
    useShallow((s) => ({
      advanceOneDay: s.advanceOneDay,
      advanceToNext: s.advanceToNext,
      clearSummary: s.clearSummary,
      saveCurrentGame: s.saveCurrentGame,
      makeTransferOffer: s.makeTransferOffer,
      acceptCounterOffer: s.acceptCounterOffer,
      togglePlayerTransferList: s.togglePlayerTransferList,
      respondToIncoming: s.respondToIncoming,
      answerPressQuestion: s.answerPressQuestion,
    }))
  );
}
