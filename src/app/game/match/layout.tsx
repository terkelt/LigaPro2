import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useGameStore } from "@/store/game-store";
import { VersionBadge } from "@/components/ui/version-badge";

/**
 * Match layout — fullscreen without sidebar/header.
 * Overrides the parent game layout's sidebar+header for match pages.
 */
export default function MatchLayout() {
  const navigate = useNavigate();
  const hasGameState = useGameStore((s) => !!s.gameState);
  const isLoaded = useGameStore((s) => s.isLoaded);

  useEffect(() => {
    if (isLoaded && !hasGameState) {
      navigate("/", { replace: true });
    }
  }, [isLoaded, hasGameState, navigate]);

  if (!hasGameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col">
      <Outlet />
      <VersionBadge className="absolute bottom-1 right-2" />
    </div>
  );
}
