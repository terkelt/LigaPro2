"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyTeam, useMyFinances } from "@/store/selectors";
import { Wallet, TrendingUp, TrendingDown, Building2 } from "lucide-react";

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}

export default function FinancesPage() {
  const team = useMyTeam();
  const finances = useMyFinances();

  if (!team || !finances) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Finanzen</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />Kontostand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(finances.balance)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />Transferbudget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(finances.transferBudget)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />Gehaltsbudget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(finances.salaryBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aktuell: {formatCurrency(finances.totalSalaryPerMonth)}/Monat
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />Stadion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{team?.stadium.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Kapazität: {team?.stadium.capacity?.toLocaleString("de-DE")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">Detaillierte Finanzübersicht wird nach dem ersten Monat verfügbar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
