"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMyTeam, useMyFinances, useSponsors, useSponsorOffers,
  useTransferWindowInfo, useGameActions, useCurrentDate,
  useResults, useTables, useCurrentTeamId,
} from "@/store/selectors";
import type { SponsorCondition, SponsorConditionType } from "@/types/finance";
import type { MatchResult } from "@/types/match";
import {
  Wallet, TrendingUp, TrendingDown, Building2, Tv, Ticket,
  ShoppingBag, Handshake, Check, X, Clock, ArrowUpRight, ArrowDownRight,
  Hammer, Wrench, Loader2,
} from "lucide-react";
import { useGameStore } from "@/store/game-store";
import type { UpgradeOption } from "@/lib/stadium-engine";
import type { StadiumUpgrade } from "@/types/finance";

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}

// B4: Calculate progress for a sponsor condition
function calcConditionProgress(
  cond: SponsorCondition,
  results: MatchResult[],
  teamId: string,
  tablePosition: number,
  cupState: { currentRound: number } | null,
  stadiumCapacity: number,
): { current: number; target: number; label: string } {
  switch (cond.type) {
    case 'home_wins': {
      const homeWins = results.filter(r => r.homeTeamId === teamId && r.homeScore > r.awayScore).length;
      return { current: homeWins, target: cond.target, label: `${homeWins}/${cond.target} Heimsiege` };
    }
    case 'goals_scored': {
      const goals = results.reduce((sum, r) => {
        if (r.homeTeamId === teamId) return sum + r.homeScore;
        if (r.awayTeamId === teamId) return sum + r.awayScore;
        return sum;
      }, 0);
      return { current: goals, target: cond.target, label: `${goals}/${cond.target} Tore` };
    }
    case 'clean_sheets': {
      const cs = results.filter(r => {
        if (r.homeTeamId === teamId) return r.awayScore === 0;
        if (r.awayTeamId === teamId) return r.homeScore === 0;
        return false;
      }).length;
      return { current: cs, target: cond.target, label: `${cs}/${cond.target} Spiele zu Null` };
    }
    case 'avg_attendance': {
      const homeGames = results.filter(r => r.homeTeamId === teamId).length;
      // Attendance tracking is approximate — use home games count as proxy
      const avgPct = homeGames > 0 ? Math.min(100, Math.round(70 + homeGames * 1.5)) : 0;
      return { current: avgPct, target: cond.target, label: `~${avgPct}%/${cond.target}% Auslastung (${homeGames} Heimspiele)` };
    }
    case 'min_league_position': {
      return { current: tablePosition, target: cond.target, label: `Platz ${tablePosition} (Ziel: Top ${cond.target})` };
    }
    case 'cup_round': {
      const round = cupState?.currentRound ?? 0;
      const roundNames: Record<number, string> = { 0: '1. Runde', 1: 'Achtelfinale', 2: 'Viertelfinale', 3: 'Halbfinale', 4: 'Finale' };
      return { current: round, target: cond.target, label: `${roundNames[round] ?? `Runde ${round}`} (Ziel: ${roundNames[cond.target] ?? `Runde ${cond.target}`})` };
    }
    case 'no_relegation': {
      const safe = tablePosition <= 15;
      return { current: safe ? 1 : 0, target: 1, label: safe ? `Platz ${tablePosition} — sicher` : `Platz ${tablePosition} — Abstiegsgefahr!` };
    }
    case 'european_qualification': {
      const qualified = tablePosition <= 6;
      return { current: qualified ? 1 : 0, target: 1, label: qualified ? `Platz ${tablePosition} — Europapokal!` : `Platz ${tablePosition} (Ziel: Top 6)` };
    }
    default:
      return { current: 0, target: cond.target, label: '—' };
  }
}

const SPONSOR_CAT: Record<string, { label: string; icon: string; color: string }> = {
  trikot:    { label: "Trikotsponsor",  icon: "👕", color: "text-blue-400" },
  aermel:    { label: "Ärmelsponsor",   icon: "💪", color: "text-purple-400" },
  bande:     { label: "Bandenwerbung",  icon: "📺", color: "text-green-400" },
  stadion:   { label: "Stadion-Naming", icon: "🏟️", color: "text-amber-400" },
  ausruester:{ label: "Ausrüster",      icon: "👟", color: "text-orange-400" },
  partner:   { label: "Partner",        icon: "🤝", color: "text-cyan-400" },
};

const SPONSOR_MAX_SLOTS: Record<string, number> = {
  trikot: 1, aermel: 1, bande: 2, stadion: 1, ausruester: 1, partner: 3,
};

export default function FinancesPage() {
  const team = useMyTeam();
  const finances = useMyFinances();
  const sponsors = useSponsors();
  const sponsorOffers = useSponsorOffers();
  const transferWindow = useTransferWindowInfo();
  const currentDate = useCurrentDate();
  const results = useResults();
  const tables = useTables();
  const currentTeamId = useCurrentTeamId();
  const { acceptSponsor, declineSponsor, cancelSponsor, negotiateSponsor } = useGameActions();
  const [negotiateMsg, setNegotiateMsg] = useState<{ offerId: string; msg: string; color: string } | null>(null);
  const cupState = useGameStore((s) => s.gameState?.cupState ?? null);

  // B4: Derive table position for condition progress
  const tablePosition = useMemo(() => {
    if (!team) return 99;
    const table = tables[team.league];
    if (!table) return 99;
    const entry = table.find((e: { teamId: string }) => e.teamId === currentTeamId);
    return entry?.position ?? 99;
  }, [tables, team, currentTeamId]);

  const activeSponsors = useMemo(
    () => (sponsors as import("@/types/finance").Sponsor[]).filter((s) => s.isActive),
    [sponsors]
  );

  const totalSponsorIncome = useMemo(
    () => activeSponsors.reduce((sum, s) => sum + s.amountPerSeason, 0),
    [activeSponsors]
  );

  const monthlyData = useMemo(() => {
    if (!finances) return [];
    return [...finances.monthlyIncome].reverse().slice(0, 12);
  }, [finances]);

  if (!team || !finances) return null;

  return (
    <div className="space-y-4 animate-slide-up max-w-[1400px] mx-auto">
      {/* ═══ Page Header ═══ */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Finanzen</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{team?.name} &middot; Budget &amp; Sponsoren</p>
        </div>
        <div className={`metric-badge ${
          transferWindow.isOpen ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        }`}>
          <Clock className="w-3 h-3" />
          <span>Transferfenster: {transferWindow.isOpen
            ? (transferWindow.type === "summer" ? "Sommer offen" : "Winter offen")
            : "geschlossen"}</span>
        </div>
      </div>

      {/* ═══ KPI Tiles ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 stagger-children">
        <div className="tile-stat p-4">
          <div className="section-label mb-2">
            <Wallet className="w-3 h-3" />
            <span>Kontostand</span>
          </div>
          <p className={`text-2xl font-display font-black leading-none ${finances.balance >= 0 ? "text-primary" : "text-red-400"}`}>
            {fmt(finances.balance)}
          </p>
          <p className="text-[9px] text-muted-foreground mt-1.5 font-mono">aktuell verfügbar</p>
        </div>

        <div className="tile-stat p-4">
          <div className="section-label mb-2">
            <TrendingUp className="w-3 h-3" />
            <span>Transferbudget</span>
          </div>
          <p className="text-2xl font-display font-black text-emerald-400 leading-none">{fmt(finances.transferBudget)}</p>
          <p className="text-[9px] text-muted-foreground mt-1.5 font-mono">für Neuzugänge</p>
        </div>

        <div className="tile-stat p-4">
          <div className="section-label mb-2">
            <TrendingDown className="w-3 h-3" />
            <span>Gehälter / Monat</span>
          </div>
          <p className="text-2xl font-display font-black leading-none">{fmt(finances.totalSalaryPerMonth)}</p>
          <p className="text-[9px] text-muted-foreground mt-1.5 font-mono">Budget: {fmt(finances.salaryBudget)}</p>
        </div>

        <div className="tile-stat p-4">
          <div className="section-label mb-2">
            <Handshake className="w-3 h-3" />
            <span>Sponsoren / Saison</span>
          </div>
          <p className="text-2xl font-display font-black text-blue-400 leading-none">{fmt(totalSponsorIncome)}</p>
          <p className="text-[9px] text-muted-foreground mt-1.5 font-mono">{activeSponsors.length} Verträge</p>
        </div>
      </div>

      {/* ═══ Tabs: Monatsübersicht / Sponsoren / Stadion ═══ */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/30 h-9">
          <TabsTrigger value="monthly" className="text-[12px]">Monatsübersicht</TabsTrigger>
          <TabsTrigger value="sponsors" className="text-[12px]">
            Sponsoren
            {(sponsorOffers as import("@/types/finance").SponsorOffer[]).length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {(sponsorOffers as import("@/types/finance").SponsorOffer[]).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stadium" className="text-[12px]">Stadion</TabsTrigger>
        </TabsList>

        {/* Monthly Overview */}
        <TabsContent value="monthly" className="space-y-3 mt-3">
          {monthlyData.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Detaillierte Finanzübersicht wird nach dem ersten Monatsabschluss verfügbar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {monthlyData.map((m) => {
                const income = m.tvMoney + m.ticketIncome + m.merchandising + m.sponsoring + m.transferIncome + m.prizesMoney;
                const expenses = m.salaries + m.transferExpenses + m.stadiumMaintenance + m.staffSalaries + m.youthAcademy + m.bonuses;
                const net = income - expenses;
                return (
                  <Card key={m.month} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>{new Date(m.month + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</span>
                        <span className={`text-sm font-bold ${net >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {net >= 0 ? "+" : ""}{fmt(net)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> Einnahmen: {fmt(income)}
                          </p>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {m.tvMoney > 0 && <div className="flex justify-between"><span className="flex items-center gap-1"><Tv className="w-3 h-3" />TV-Gelder</span><span>{fmt(m.tvMoney)}</span></div>}
                            {m.ticketIncome > 0 && <div className="flex justify-between"><span className="flex items-center gap-1"><Ticket className="w-3 h-3" />Tickets</span><span>{fmt(m.ticketIncome)}</span></div>}
                            {m.merchandising > 0 && <div className="flex justify-between"><span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />Merchandising</span><span>{fmt(m.merchandising)}</span></div>}
                            {m.sponsoring > 0 && <div className="flex justify-between"><span className="flex items-center gap-1"><Handshake className="w-3 h-3" />Sponsoring</span><span>{fmt(m.sponsoring)}</span></div>}
                            {m.transferIncome > 0 && <div className="flex justify-between"><span>Transfererlöse</span><span>{fmt(m.transferIncome)}</span></div>}
                            {m.prizesMoney > 0 && <div className="flex justify-between"><span>Preisgelder</span><span>{fmt(m.prizesMoney)}</span></div>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3" /> Ausgaben: {fmt(expenses)}
                          </p>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {m.salaries > 0 && <div className="flex justify-between"><span>Spielergehälter</span><span>{fmt(m.salaries)}</span></div>}
                            {m.staffSalaries > 0 && <div className="flex justify-between"><span>Mitarbeiter</span><span>{fmt(m.staffSalaries)}</span></div>}
                            {m.stadiumMaintenance > 0 && <div className="flex justify-between"><span>Stadion</span><span>{fmt(m.stadiumMaintenance)}</span></div>}
                            {m.youthAcademy > 0 && <div className="flex justify-between"><span>Jugendakademie</span><span>{fmt(m.youthAcademy)}</span></div>}
                            {m.transferExpenses > 0 && <div className="flex justify-between"><span>Transfers</span><span>{fmt(m.transferExpenses)}</span></div>}
                            {m.bonuses > 0 && <div className="flex justify-between"><span>Boni</span><span>{fmt(m.bonuses)}</span></div>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Sponsors */}
        <TabsContent value="sponsors" className="space-y-4">
          {/* Category Overview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(SPONSOR_CAT).map(([type, cat]) => {
              const filled = activeSponsors.filter(s => s.type === type).length;
              const max = SPONSOR_MAX_SLOTS[type] ?? 1;
              return (
                <div key={type} className="p-2.5 rounded-lg bg-card border border-border text-center">
                  <span className="text-lg">{cat.icon}</span>
                  <p className="text-[10px] font-semibold mt-0.5">{cat.label}</p>
                  <p className={`text-xs font-bold mt-0.5 ${filled >= max ? "text-green-400" : "text-muted-foreground"}`}>
                    {filled}/{max}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Pending Offers */}
          {(sponsorOffers as import("@/types/finance").SponsorOffer[]).length > 0 && (
            <Card className="bg-card border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Offene Angebote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(sponsorOffers as import("@/types/finance").SponsorOffer[]).filter(o => !o.isWithdrawn).map((offer) => {
                  const cat = SPONSOR_CAT[offer.type];
                  const daysLeft = Math.max(0, Math.ceil((new Date(offer.expiresDate).getTime() - new Date(currentDate).getTime()) / 86400000));
                  const urgencyColor = daysLeft <= 3 ? "text-red-400" : daysLeft <= 7 ? "text-amber-400" : "text-green-400";
                  const canNegotiate = (offer.negotiationAttempts ?? 0) < 2;
                  return (
                    <div key={offer.id} className="p-3 rounded-lg bg-background border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{cat?.icon}</span>
                            <span className="font-semibold text-sm">{offer.sponsorName}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium ${cat?.color ?? "text-muted-foreground"}`}>
                              {cat?.label ?? offer.type}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${urgencyColor} bg-current/10`}>
                              ⏳ {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"}
                            </span>
                            {(offer.negotiationAttempts ?? 0) > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                                {offer.negotiationAttempts}× verhandelt
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmt(offer.amountPerSeason)}/Saison · {offer.contractYears} {offer.contractYears === 1 ? "Jahr" : "Jahre"}
                            {offer.bonusCL > 0 && ` · CL-Bonus: ${fmt(offer.bonusCL)}`}
                            {offer.bonusTitle > 0 && ` · Meister-Bonus: ${fmt(offer.bonusTitle)}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Läuft ab: {new Date(offer.expiresDate).toLocaleDateString("de-DE")}
                            {offer.cancellationPenalty > 0 && <span className="text-red-400 ml-2">Kündigungsstrafe: {fmt(offer.cancellationPenalty)}</span>}
                          </p>
                          {offer.conditions && offer.conditions.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {offer.conditions.map((cond, ci) => (
                                <div key={ci} className="flex items-center gap-1.5 text-[10px]">
                                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                    cond.term === 'short' ? 'bg-blue-500/20 text-blue-400' :
                                    cond.term === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-purple-500/20 text-purple-400'
                                  }`}>
                                    {cond.term === 'short' ? 'Kurzfristig' : cond.term === 'medium' ? 'Mittelfristig' : 'Langfristig'}
                                  </span>
                                  <span className="text-muted-foreground">{cond.label}</span>
                                  <span className="text-red-400/70 ml-auto">Strafe: {fmt(cond.penaltyAmount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <Button size="sm" variant="outline" onClick={() => declineSponsor(offer.id)} title="Ablehnen">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          {canNegotiate && (
                            <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/40 hover:bg-amber-500/10" onClick={() => {
                              const result = negotiateSponsor(offer.id);
                              if (result === 'raised') setNegotiateMsg({ offerId: offer.id, msg: 'Verhandlung erfolgreich! Betrag erhöht.', color: 'text-green-400' });
                              else if (result === 'withdrawn') setNegotiateMsg({ offerId: offer.id, msg: 'Sponsor hat das Angebot zurückgezogen!', color: 'text-red-400' });
                              else if (result === 'unchanged') setNegotiateMsg({ offerId: offer.id, msg: 'Sponsor bleibt beim aktuellen Angebot.', color: 'text-amber-400' });
                              else setNegotiateMsg({ offerId: offer.id, msg: 'Keine weiteren Verhandlungen möglich.', color: 'text-muted-foreground' });
                              setTimeout(() => setNegotiateMsg(null), 3000);
                            }} title={`Verhandeln (${2 - (offer.negotiationAttempts ?? 0)} Versuche übrig — Risiko: Sponsor kann Angebot zurückziehen!)`}>
                              💬 Verhandeln
                            </Button>
                          )}
                          <Button size="sm" onClick={() => acceptSponsor(offer.id)}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Annehmen
                          </Button>
                        </div>
                      </div>
                      {negotiateMsg?.offerId === offer.id && (
                        <p className={`text-xs font-medium ${negotiateMsg.color} animate-in fade-in duration-300`}>
                          {negotiateMsg.msg}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Active Sponsors by Category */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Aktive Sponsoren</CardTitle>
            </CardHeader>
            <CardContent>
              {activeSponsors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine aktiven Sponsoren. Angebote kommen in der Vorsaison und bei guten Ergebnissen.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(SPONSOR_CAT).map(([type, cat]) => {
                    const catSponsors = activeSponsors.filter(s => s.type === type);
                    if (catSponsors.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span>{cat.icon}</span>
                          <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
                          <span className="text-[10px] text-muted-foreground">({catSponsors.length}/{SPONSOR_MAX_SLOTS[type] ?? 1})</span>
                        </div>
                        <div className="space-y-2">
                          {catSponsors.map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                              <div className="flex-1">
                                <span className="font-semibold text-sm">{s.name}</span>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Vertrag bis {new Date(s.contractEnd).toLocaleDateString("de-DE")}
                                  {s.cancellationPenalty > 0 && (
                                    <span className="text-red-400/70 ml-2">Strafe: {fmt(s.cancellationPenalty)}</span>
                                  )}
                                </p>
                              </div>
                              {s.conditions && s.conditions.length > 0 && (
                                <div className="mt-1.5 space-y-1.5 w-full">
                                  {s.conditions.map((cond, ci) => {
                                    const progress = calcConditionProgress(cond, results as MatchResult[], currentTeamId, tablePosition, cupState, team?.stadium?.capacity ?? 10000);
                                    const pct = cond.target > 0 ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : 0;
                                    const isOnTrack = cond.type === 'min_league_position' || cond.type === 'no_relegation' || cond.type === 'european_qualification'
                                      ? progress.current <= progress.target
                                      : progress.current >= progress.target;
                                    return (
                                      <div key={ci} className="text-[10px]">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                            cond.isFailed ? 'bg-red-500/20 text-red-400' :
                                            cond.isChecked ? 'bg-green-500/20 text-green-400' :
                                            cond.term === 'short' ? 'bg-blue-500/20 text-blue-400' :
                                            cond.term === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-purple-500/20 text-purple-400'
                                          }`}>
                                            {cond.isFailed ? '✗ Verfehlt' : cond.isChecked ? '✓ Erfüllt' :
                                              cond.term === 'short' ? 'Kurzfristig' : cond.term === 'medium' ? 'Mittelfristig' : 'Langfristig'}
                                          </span>
                                          <span className="text-muted-foreground flex-1">{cond.label}</span>
                                          {!cond.isChecked && !cond.isFailed && <span className="text-red-400/70">Strafe: {fmt(cond.penaltyAmount)}</span>}
                                        </div>
                                        {!cond.isChecked && !cond.isFailed && (
                                          <div className="flex items-center gap-1.5">
                                            <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                                              <div className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className={`text-[9px] font-bold ${isOnTrack ? 'text-green-400' : 'text-amber-400'}`}>{progress.label}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-400">{fmt(s.amountPerSeason)}</p>
                                  <p className="text-[10px] text-muted-foreground">pro Saison</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-red-400 border-red-400/30 hover:bg-red-500/10"
                                  onClick={() => cancelSponsor(s.id)}
                                >
                                  Kündigen
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stadium */}
        <TabsContent value="stadium" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> {team.stadium.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Kapazität</p>
                  <p className="text-lg font-bold">{team.stadium.capacity.toLocaleString("de-DE")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stadt</p>
                  <p className="text-lg font-bold">{team.stadium.city}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(team.facilities).map(([key, val]) => (
                  <div key={key} className="text-center p-2 rounded bg-background border border-border">
                    <p className="text-[10px] text-muted-foreground capitalize">{
                      key === "training" ? "Training" :
                      key === "youth" ? "Jugend" :
                      key === "stadium" ? "Stadion" :
                      key === "medical" ? "Medizin" : key
                    }</p>
                    <p className="text-lg font-bold">{val}<span className="text-xs text-muted-foreground">/10</span></p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <StadiumUpgradesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StadiumUpgradesSection() {
  const startStadiumUpgrade = useGameStore((s) => s.startStadiumUpgrade);
  const getStadiumUpgradeOptions = useGameStore((s) => s.getStadiumUpgradeOptions);
  const stadiumUpgrades = useGameStore((s) => s.gameState?.stadiumUpgrades ?? []) as StadiumUpgrade[];
  const currentDate = useCurrentDate();

  const [options, setOptions] = useState<UpgradeOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadOptions = useCallback(() => {
    setOptions(getStadiumUpgradeOptions());
    setLoaded(true);
  }, [getStadiumUpgradeOptions]);

  // Load on mount
  useMemo(() => { if (!loaded) loadOptions(); }, [loaded, loadOptions]);

  const activeProject = stadiumUpgrades.find((u) => u.isInProgress && !u.isCompleted);
  const completedProjects = stadiumUpgrades.filter((u) => u.isCompleted);

  // Calculate progress for active project
  const progress = useMemo(() => {
    if (!activeProject?.startDate || !activeProject?.completionDate) return 0;
    const start = new Date(activeProject.startDate).getTime();
    const end = new Date(activeProject.completionDate).getTime();
    const now = new Date(currentDate).getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [activeProject, currentDate]);

  return (
    <>
      {/* Active Project */}
      {activeProject && (
        <Card className="bg-card border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" /> Laufendes Bauprojekt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold">{activeProject.name}</p>
                <p className="text-xs text-muted-foreground">{activeProject.effect}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{fmt(activeProject.cost)}</p>
                <p className="text-xs text-muted-foreground">
                  Fertig: {activeProject.completionDate ? new Date(activeProject.completionDate).toLocaleDateString("de-DE") : "?"}
                </p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{progress}% abgeschlossen</p>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Options */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Hammer className="w-4 h-4" /> Ausbauprojekte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {options.map((opt) => (
            <div
              key={opt.type}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                opt.canBuild ? "bg-background border-border" : "bg-muted/30 border-border/50 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">{opt.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {opt.currentLevel}/{opt.maxLevel}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">{opt.description}</p>
                <p className="text-[10px] text-green-400 mt-0.5 ml-5.5">{opt.effect}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold">{fmt(opt.cost)}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.buildTimeWeeks} Wochen</p>
                </div>
                <Button
                  size="sm"
                  disabled={!opt.canBuild}
                  onClick={() => { startStadiumUpgrade(opt.type); loadOptions(); }}
                >
                  <Hammer className="w-3.5 h-3.5 mr-1" /> Bauen
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Abgeschlossene Projekte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {completedProjects.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-400" />
                  {p.name}
                </span>
                <span className="text-muted-foreground">{fmt(p.cost)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
