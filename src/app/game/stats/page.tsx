"use client";

import { useHasGameState } from "@/store/selectors";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function StatsPage() {
  const hasGame = useHasGameState();
  if (!hasGame) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Statistiken</h1>
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Trophy className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Statistiken</p>
          <p className="text-sm mt-1">Torjäger, Assists, Bewertungen und mehr nach dem ersten Spieltag.</p>
        </CardContent>
      </Card>
    </div>
  );
}
