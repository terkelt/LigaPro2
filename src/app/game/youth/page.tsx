"use client";

import { useHasGameState } from "@/store/selectors";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default function YouthPage() {
  const hasGame = useHasGameState();
  if (!hasGame) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Jugendakademie</h1>
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Jugendakademie</p>
          <p className="text-sm mt-1">Jugendtalente entwickeln und in den Profikader befördern.</p>
        </CardContent>
      </Card>
    </div>
  );
}
