"use client";

import { CalendarDays, Wallet, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  teamName?: string;
  teamColors?: { primary: string; secondary: string };
  currentDate?: string;
  budget?: number;
  nextOpponent?: string;
  nextMatchDate?: string;
  onAdvance?: () => void;
  onSave?: () => void;
  canAdvance?: boolean;
  isMatchDay?: boolean;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} Mio. €`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k €`;
  }
  return `${amount} €`;
}

function formatGameDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Header({
  teamName = "Kein Verein",
  currentDate,
  budget = 0,
  nextOpponent,
  nextMatchDate,
  onAdvance,
  onSave,
  canAdvance = true,
  isMatchDay = false,
}: HeaderProps) {
  return (
    <header className="h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* Left: Team info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-display font-bold text-xs">
              {teamName.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="font-semibold text-sm">{teamName}</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{formatGameDate(currentDate)}</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wallet className="w-3.5 h-3.5" />
          <span className="text-primary font-medium">{formatCurrency(budget)}</span>
        </div>

        {nextOpponent && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-xs text-muted-foreground">
              <span>Nächstes Spiel: </span>
              <span className="text-foreground font-medium">vs. {nextOpponent}</span>
              {nextMatchDate && (
                <span className="ml-1">({formatGameDate(nextMatchDate)})</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={onSave}
          >
            <Save className="w-3.5 h-3.5" />
            Speichern
          </Button>
        )}
        {onAdvance && (
          <Button
            size="sm"
            className={`text-xs gap-1.5 ${canAdvance ? 'bg-primary hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
            onClick={canAdvance ? onAdvance : undefined}
            disabled={!canAdvance}
            title={!canAdvance ? 'Es gibt noch offene Aufgaben für heute' : ''}
          >
            Weiter
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </header>
  );
}
