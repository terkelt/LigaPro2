"use client";

import { useHasGameState } from "@/store/selectors";
import { Card, CardContent } from "@/components/ui/card";
import { UserCog } from "lucide-react";

export default function StaffPage() {
  const hasGame = useHasGameState();
  if (!hasGame) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Staff</h1>
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <UserCog className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Trainerteam & Scouts</p>
          <p className="text-sm mt-1">Personal einstellen, entlassen und Scouts auf Reisen schicken.</p>
        </CardContent>
      </Card>
    </div>
  );
}
