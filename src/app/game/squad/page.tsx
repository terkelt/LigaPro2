"use client";

import { useState, useMemo } from "react";
import { Player, Position, POSITION_LABELS } from "@/types/player";
import { calcOverall as calculateOverall, formatValue, getAge, useMyPlayers, useMyTeam } from "@/store/selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ArrowUpDown, Heart, Zap, TrendingUp, TrendingDown, Minus, Shield, Star, HelpCircle, ArrowRightLeft } from "lucide-react";
import { getTraitDefinition, TIER_COLORS, TIER_BG_COLORS, TIER_LABELS, TRAIT_CATALOG, TraitCategory } from "@/types/traits";
import { PlayerCompare } from "@/components/game/PlayerCompare";

type SortKey = "name" | "position" | "age" | "overall" | "marketValue" | "form" | "condition";

/** Calculate form trend from formHistory: compares recent avg to older avg */
function getFormTrend(formHistory: number[]): 'up' | 'down' | 'stable' {
  if (!formHistory || formHistory.length < 3) return 'stable';
  const recent = formHistory.slice(-3);
  const older = formHistory.slice(-6, -3);
  if (older.length === 0) return 'stable';
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'stable';
}

function FormTrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}


function getOverallColor(overall: number): string {
  if (overall >= 80) return "text-green-400";
  if (overall >= 70) return "text-emerald-400";
  if (overall >= 60) return "text-yellow-400";
  if (overall >= 50) return "text-orange-400";
  return "text-red-400";
}

function getPracticeColor(val: number): string {
  if (val >= 75) return "text-green-400";
  if (val >= 50) return "text-yellow-400";
  if (val >= 30) return "text-orange-400";
  return "text-red-400";
}

function getPracticeBarColor(val: number): string {
  if (val >= 75) return "bg-green-500";
  if (val >= 50) return "bg-yellow-500";
  if (val >= 30) return "bg-orange-500";
  return "bg-red-500";
}

function getConditionColor(cond: number): string {
  if (cond >= 80) return "bg-green-500";
  if (cond >= 60) return "bg-yellow-500";
  if (cond >= 40) return "bg-orange-500";
  return "bg-red-500";
}

const POSITION_ORDER: Position[] = ["TW", "IV", "LV", "RV", "ZDM", "ZM", "ZOM", "LA", "RA", "ST"];

/** German translations for attribute keys */
const ATTR_DE: Record<string, string> = {
  ballControl: 'Ballkontrolle', dribbling: 'Dribbling', passing: 'Passen', crossing: 'Flanken',
  shooting: 'Schuss', longShots: 'Fernschuss', finishing: 'Abschluss', freeKick: 'Freistoß', heading: 'Kopfball',
  pace: 'Tempo', acceleration: 'Beschleunigung', stamina: 'Ausdauer', strength: 'Stärke', jumping: 'Sprungkraft',
  vision: 'Übersicht', composure: 'Gelassenheit', aggression: 'Aggression', positioning: 'Stellungsspiel',
  workRate: 'Einsatz', leadership: 'Führung',
  reflexes: 'Reflexe', handling: 'Fangen', diving: 'Hechten', kicking: 'Abschlag', oneOnOne: '1-gegen-1',
};

/** Convert OVR (1-99) to half-star count (0-10, where 10 = 5 full stars) */
function ovrToHalfStars(ovr: number): number {
  if (ovr >= 95) return 10;  // 5.0 ★
  if (ovr >= 90) return 9;   // 4.5 ★
  if (ovr >= 85) return 8;   // 4.0 ★
  if (ovr >= 80) return 7;   // 3.5 ★
  if (ovr >= 75) return 6;   // 3.0 ★
  if (ovr >= 70) return 5;   // 2.5 ★
  if (ovr >= 65) return 4;   // 2.0 ★
  if (ovr >= 58) return 3;   // 1.5 ★
  if (ovr >= 50) return 2;   // 1.0 ★
  if (ovr >= 40) return 1;   // 0.5 ★
  return 0;                   // 0.0 ★
}

/** Render 5-star rating with half stars */
function StarRating({ halfStars, label, colorClass }: { halfStars: number; label?: string; colorClass?: string }) {
  const full = Math.floor(halfStars / 2);
  const hasHalf = halfStars % 2 === 1;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  const displayStr = (halfStars / 2).toFixed(1);
  return (
    <span className="inline-flex items-center gap-0" title={`${displayStr} / 5.0 Sterne`}>
      {label && <span className="text-[10px] text-muted-foreground mr-1">{label}</span>}
      <span className={colorClass ?? 'text-yellow-400'} style={{letterSpacing: '-1px'}}>{'★'.repeat(full)}{hasHalf ? '⯨' : ''}</span>
      <span className="text-muted-foreground/30" style={{letterSpacing: '-1px'}}>{'★'.repeat(empty)}</span>
    </span>
  );
}

function PlayerDetailDialog({ player, open, onClose }: { player: Player | null; open: boolean; onClose: () => void }) {
  if (!player) return null;
  const overall = calculateOverall(player);
  const effectivePotential = Math.max(player.potential, overall); // potential must never display below OVR
  const age = getAge(player.dateOfBirth);
  const a = player.attributes;

  const technicalAttrs = [
    { label: "Ballkontrolle", value: a.ballControl },
    { label: "Dribbling", value: a.dribbling },
    { label: "Passen", value: a.passing },
    { label: "Flanken", value: a.crossing },
    { label: "Schuss", value: a.shooting },
    { label: "Fernschuss", value: a.longShots },
    { label: "Abschluss", value: a.finishing },
    { label: "Freistoß", value: a.freeKick },
    { label: "Kopfball", value: a.heading },
  ];
  const physicalAttrs = [
    { label: "Tempo", value: a.pace },
    { label: "Beschleunigung", value: a.acceleration },
    { label: "Ausdauer", value: a.stamina },
    { label: "Stärke", value: a.strength },
    { label: "Sprungkraft", value: a.jumping },
  ];
  const mentalAttrs = [
    { label: "Übersicht", value: a.vision },
    { label: "Gelassenheit", value: a.composure },
    { label: "Aggression", value: a.aggression },
    { label: "Stellungsspiel", value: a.positioning },
    { label: "Einsatz", value: a.workRate },
    { label: "Führung", value: a.leadership },
  ];
  const gkAttrs = [
    { label: "Reflexe", value: a.reflexes },
    { label: "Fangen", value: a.handling },
    { label: "Hechten", value: a.diving },
    { label: "Abschlag", value: a.kicking },
    { label: "1-gegen-1", value: a.oneOnOne },
  ];

  function AttrRow({ label, value }: { label: string; value: number }) {
    const color = value >= 75 ? "text-green-400" : value >= 60 ? "text-yellow-400" : value >= 45 ? "text-orange-400" : "text-red-400";
    const barColor = value >= 75 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : value >= 45 ? "bg-orange-500" : "bg-red-500";
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-28 text-muted-foreground truncate">{label}</span>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value}%` }} />
        </div>
        <span className={`w-7 text-right font-mono font-semibold ${color}`}>{value}</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className={`font-display font-bold text-lg ${getOverallColor(overall)}`}>{overall}</span>
            </div>
            <div>
              <p className="text-lg font-bold">
                {[player.firstName, player.lastName].filter(Boolean).join(' ')}
                {player.isIcon && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold align-middle">⭐ Ikone</span>}
                {player.isLegend && !player.isIcon && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold align-middle">👑 Legende</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {POSITION_LABELS[player.position]} | {age} Jahre | {player.nationality}
                {player.legendReason && <span className="ml-1 text-purple-400/70">— {player.legendReason}</span>}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Marktwert</span><span className="font-medium text-primary">{formatValue(player.marketValue)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gehalt</span><span>{formatValue(player.salary)}/Jahr</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vertrag bis</span><span>{player.contractUntil}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fuß</span><span>{player.foot === "right" ? "Rechts" : player.foot === "left" ? "Links" : "Beide"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Größe/Gewicht</span><span>{player.height}cm / {player.weight}kg</span></div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Kondition</span><span>{player.condition}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Moral</span><span>{player.morale}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Form</span><span>{player.form}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Spielpraxis</span><span className={getPracticeColor(player.matchPractice ?? 50)}>{player.matchPractice ?? 50}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Trikotnummer</span><span>#{player.shirtNumber}</span></div>
          </div>
        </div>

        {/* Season Stats */}
        {player.stats.appearances > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
            <p className="text-xs font-medium mb-2">📊 Saison-Statistiken</p>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div><p className="text-lg font-bold">{player.stats.appearances}</p><p className="text-[9px] text-muted-foreground">Einsätze</p></div>
              <div><p className="text-lg font-bold text-green-400">{player.stats.goals}</p><p className="text-[9px] text-muted-foreground">Tore</p></div>
              <div><p className="text-lg font-bold text-blue-400">{player.stats.assists}</p><p className="text-[9px] text-muted-foreground">Vorlagen</p></div>
              <div><p className="text-lg font-bold text-amber-400">{player.stats.cleanSheets}</p><p className="text-[9px] text-muted-foreground">Zu Null</p></div>
              <div><p className="text-lg font-bold">{player.stats.avgRating > 0 ? player.stats.avgRating.toFixed(1) : '—'}</p><p className="text-[9px] text-muted-foreground">Ø Note</p></div>
            </div>
            {(player.stats.yellowCards > 0 || player.stats.redCards > 0) && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                {player.stats.yellowCards > 0 && <span>🟨 {player.stats.yellowCards} Gelbe</span>}
                {player.stats.redCards > 0 && <span>🟥 {player.stats.redCards} Rote</span>}
                <span className="ml-auto">{player.stats.minutesPlayed} Min. gespielt</span>
              </div>
            )}
          </div>
        )}

        {/* Traits */}
        {(player.traits ?? []).length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
            <p className="text-xs font-medium flex items-center gap-1.5 mb-2"><Star className="w-3.5 h-3.5 text-yellow-400" /> Spezialeigenschaften</p>
            <div className="space-y-1.5">
              {(player.traits ?? []).map((t) => {
                const def = getTraitDefinition(t.traitId);
                if (!def) return null;
                return (
                  <div key={t.traitId} className={`flex items-center gap-2 px-2 py-1.5 rounded border ${TIER_BG_COLORS[t.tier]}`}>
                    <span className="text-sm">{def.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${TIER_COLORS[t.tier]}`}>{def.name} <span className="opacity-60">({TIER_LABELS[t.tier]})</span></p>
                      <p className="text-[10px] text-muted-foreground">{def.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Star Rating */}
        <div className="mt-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-14">Stärke:</span>
                <StarRating halfStars={ovrToHalfStars(overall)} colorClass="text-yellow-400" />
                <span className="text-[10px] text-muted-foreground">({overall})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-14">Potenzial:</span>
                <StarRating halfStars={ovrToHalfStars(effectivePotential)} colorClass="text-cyan-400" />
                <span className="text-[10px] text-muted-foreground">({effectivePotential})</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground">Wachstum: </span>
              <span className={`text-[10px] font-medium ${player.growthRate >= 0.8 ? "text-green-400" : player.growthRate >= 0.5 ? "text-yellow-400" : "text-orange-400"}`}>
                {player.growthRate >= 0.8 ? "Hoch" : player.growthRate >= 0.5 ? "Mittel" : "Gering"}
              </span>
            </div>
          </div>
        </div>

        {/* XP & Level */}
        <div className="mt-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Level <span className="text-yellow-400 font-bold">{player.level}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {player.xp} / {player.xpToNextLevel} XP ({Math.round((player.xp / player.xpToNextLevel) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all"
              style={{ width: `${Math.min(100, (player.xp / player.xpToNextLevel) * 100)}%` }}
            />
          </div>
          {player.trainingBoosts.length > 0 && (() => {
            // Group boosts by weeksRemaining for cleaner display
            const grouped = new Map<number, typeof player.trainingBoosts>();
            for (const b of player.trainingBoosts) {
              const arr = grouped.get(b.weeksRemaining) ?? [];
              arr.push(b);
              grouped.set(b.weeksRemaining, arr);
            }
            const weeks = [...grouped.keys()].sort((a, b) => a - b);
            return (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium">Aktive Trainingseffekte:</p>
                {weeks.map(w => (
                  <div key={w} className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] text-muted-foreground/70 w-16 shrink-0">noch {w} Wo.</span>
                    {grouped.get(w)!.map((b, i) => (
                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${b.value > 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                        {b.value > 0 ? "+" : ""}{b.value} {ATTR_DE[b.attribute] ?? b.attribute}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Form Trend */}
        <div className="mt-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Form
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold">{player.form}%</span>
              <FormTrendIcon trend={getFormTrend(player.formHistory)} />
              <span className={`text-[10px] font-medium ${getFormTrend(player.formHistory) === 'up' ? 'text-green-400' : getFormTrend(player.formHistory) === 'down' ? 'text-red-400' : 'text-muted-foreground'}`}>
                {getFormTrend(player.formHistory) === 'up' ? 'Aufwärtstrend' : getFormTrend(player.formHistory) === 'down' ? 'Abwärtstrend' : 'Stabil'}
              </span>
            </div>
          </div>
          {player.ratingHistory.length > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              {player.ratingHistory.slice(-10).map((r, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className={`h-5 rounded-sm text-[8px] font-bold flex items-center justify-center ${
                    r >= 8 ? 'bg-green-500/30 text-green-400' :
                    r >= 7 ? 'bg-emerald-500/20 text-emerald-400' :
                    r >= 6 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {r.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card className="bg-secondary/30 border-border">
            <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" />Technik</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3 space-y-1.5">
              {technicalAttrs.map((a) => <AttrRow key={a.label} {...a} />)}
            </CardContent>
          </Card>
          <Card className="bg-secondary/30 border-border">
            <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" />Physisch</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3 space-y-1.5">
              {physicalAttrs.map((a) => <AttrRow key={a.label} {...a} />)}
            </CardContent>
          </Card>
          <Card className="bg-secondary/30 border-border">
            <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Mental</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3 space-y-1.5">
              {mentalAttrs.map((a) => <AttrRow key={a.label} {...a} />)}
            </CardContent>
          </Card>
          {player.position === "TW" && (
            <Card className="bg-secondary/30 border-border">
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" />Torwart</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                {gkAttrs.map((a) => <AttrRow key={a.label} {...a} />)}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CATEGORY_LABELS: Record<TraitCategory, string> = {
  offensive: 'Offensiv',
  defensive: 'Defensiv',
  goalkeeper: 'Torwart',
  mental: 'Mental',
  physical: 'Physisch',
};

const CATEGORY_ORDER: TraitCategory[] = ['offensive', 'defensive', 'goalkeeper', 'mental', 'physical'];

function TraitLegendButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setOpen(true)}>
        <HelpCircle className="w-3.5 h-3.5" /> Trait-Legende
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Spezialeigenschaften – Legende</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Spieler können besondere Traits besitzen, die ihnen einzigartige Vorteile in der Match-Engine verleihen.
            Jeder Trait existiert in drei Stufen: <span className="text-amber-600 font-semibold">Bronze</span>, <span className="text-gray-300 font-semibold">Silber</span> und <span className="text-yellow-400 font-semibold">Gold</span> — jede Stufe ist stärker und seltener.
            Traits können bei Spielstart vorhanden sein oder durch Level-Ups und herausragende Leistungen (Note ≥ 8.5) erworben werden.
          </p>
          <div className="space-y-5">
            {CATEGORY_ORDER.map((cat) => {
              const traits = TRAIT_CATALOG.filter((t) => t.category === cat);
              if (traits.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-sm font-bold mb-2 border-b border-border pb-1">{CATEGORY_LABELS[cat]}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {traits.map((trait) => (
                      <div key={trait.id} className="p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{trait.icon}</span>
                          <span className="text-sm font-bold">{trait.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-2">{trait.description}</p>
                        <div className="flex gap-1.5">
                          {(['bronze', 'silver', 'gold'] as const).map((tier) => {
                            const boost = trait.boost[tier];
                            const entries = Object.entries(boost).filter(([, v]) => v !== undefined && v !== 0);
                            return (
                              <div key={tier} className={`flex-1 p-1.5 rounded border text-[9px] ${TIER_BG_COLORS[tier]}`}>
                                <p className={`font-bold ${TIER_COLORS[tier]} mb-0.5`}>{TIER_LABELS[tier]}</p>
                                {entries.map(([k, v]) => (
                                  <p key={k} className="text-muted-foreground">+{v} {BOOST_LABELS[k] ?? k}</p>
                                ))}
                                <p className="text-muted-foreground mt-0.5">MW ×{trait.valueMultiplier[tier]}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const BOOST_LABELS: Record<string, string> = {
  goalChance: '% Torchance',
  assistChance: '% Vorlagen',
  saveChance: '% Paraden',
  tackleChance: '% Tacklings',
  headerChance: '% Kopfball',
  freeKickChance: '% Freistoß',
  penaltyChance: '% Elfmeter',
  longShotChance: '% Fernschuss',
  crossChance: '% Flanken',
  clutchFactor: '% Clutch',
  consistencyBonus: ' Rating',
  injuryResistance: '% Verletzungsschutz',
  staminaBoost: '% Ausdauer',
  speedBoost: '% Tempo',
  moraleAura: ' Moral-Aura',
};

export default function SquadPage() {
  const players = useMyPlayers();
  const team = useMyTeam();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [comparePlayerA, setComparePlayerA] = useState<string | undefined>();
  const [tab, setTab] = useState("roster");

  const filteredPlayers = useMemo(() => {
    let result = [...players];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.firstName.toLowerCase().includes(s) ||
          p.lastName.toLowerCase().includes(s) ||
          p.position.toLowerCase().includes(s)
      );
    }

    if (posFilter !== "all") {
      result = result.filter((p) => p.position === posFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.lastName.localeCompare(b.lastName); break;
        case "position": cmp = POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position); break;
        case "age": cmp = getAge(a.dateOfBirth) - getAge(b.dateOfBirth); break;
        case "overall": cmp = calculateOverall(b) - calculateOverall(a); break;
        case "marketValue": cmp = b.marketValue - a.marketValue; break;
        case "form": cmp = b.form - a.form; break;
        case "condition": cmp = b.condition - a.condition; break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [players, search, posFilter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "position" || key === "name"); }
  }

  if (!team) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">Kader – {team?.name}</h1>
          <TraitLegendButton />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setShowCompare(true)}>
            <ArrowRightLeft className="w-3.5 h-3.5" /> Vergleichen
          </Button>
          <span className="text-sm text-muted-foreground">{players.length} Spieler</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="roster">Kaderliste</TabsTrigger>
          <TabsTrigger value="stats">Statistiken</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-4 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Spieler suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={posFilter} onValueChange={setPosFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Positionen</SelectItem>
                {POSITION_ORDER.map((pos) => (
                  <SelectItem key={pos} value={pos}>{pos} – {POSITION_LABELS[pos]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-3 py-2 w-8 text-muted-foreground font-medium text-xs">#</th>
                    <ThSort label="Name" sortKey="name" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                    <ThSort label="Pos" sortKey="position" current={sortKey} asc={sortAsc} onSort={toggleSort} className="w-14" />
                    <ThSort label="Alter" sortKey="age" current={sortKey} asc={sortAsc} onSort={toggleSort} className="w-14" />
                    <ThSort label="GES" sortKey="overall" current={sortKey} asc={sortAsc} onSort={toggleSort} className="w-14" />
                    <th className="text-left px-2 py-2 text-muted-foreground font-medium text-xs">Sterne</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-20">Lv / XP</th>
                    <ThSort label="Marktwert" sortKey="marketValue" current={sortKey} asc={sortAsc} onSort={toggleSort} className="w-24" />
                    <ThSort label="Form" sortKey="form" current={sortKey} asc={sortAsc} onSort={toggleSort} className="w-14" />
                    <ThSort label="Kond." sortKey="condition" current={sortKey} asc={sortAsc} onSort={toggleSort} className="w-20" />
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-16" title="Spielpraxis — steigt durch Einsätze, sinkt durch Inaktivität">Praxis</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium text-xs">Traits</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium text-xs w-16">Moral</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => {
                    const overall = calculateOverall(player);
                    const age = getAge(player.dateOfBirth);
                    return (
                      <tr
                        key={player.id}
                        className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors"
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <td className="px-3 py-2 text-xs text-muted-foreground">{player.shirtNumber}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{player.lastName || player.firstName}</span>
                            {player.firstName && player.lastName && <span className="text-muted-foreground ml-1">{player.firstName}</span>}
                            {player.isIcon && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold" title={player.legendReason}>⭐ IKONE</span>
                            )}
                            {player.isLegend && !player.isIcon && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold" title={player.legendReason}>👑 LEGENDE</span>
                            )}
                            {player.suspended && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-bold" title={`Gesperrt (${player.suspendedMatches} Spiel${player.suspendedMatches > 1 ? 'e' : ''})`}>
                                GESPERRT ({player.suspendedMatches})
                              </span>
                            )}
                            {player.injury && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold" title={`${player.injury.type} (${player.injury.daysRemaining} Tage)`}>
                                VERLETZT ({player.injury.daysRemaining}T)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{player.nationality}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono bg-secondary/50 px-1.5 py-0.5 rounded">{player.position}</span>
                        </td>
                        <td className="px-3 py-2 text-xs">{age}</td>
                        <td className="px-3 py-2">
                          <span className={`font-mono font-bold ${getOverallColor(overall)}`}>{overall}</span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-0.5">
                            <StarRating halfStars={ovrToHalfStars(overall)} colorClass="text-yellow-400" />
                            <StarRating halfStars={ovrToHalfStars(Math.max(player.potential, overall))} colorClass="text-cyan-400" />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-yellow-400 w-5 text-right">{player.level}</span>
                            <div className="w-10 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-yellow-500" style={{ width: `${Math.min(100, (player.xp / player.xpToNextLevel) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-primary">{formatValue(player.marketValue)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{player.form}</span>
                            <FormTrendIcon trend={getFormTrend(player.formHistory)} />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${getConditionColor(player.condition)}`} style={{ width: `${player.condition}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-7">{player.condition}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center gap-1 justify-center" title={`Spielpraxis: ${player.matchPractice ?? 50}% — beeinflusst Spielschärfe`}>
                            <div className="w-8 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${getPracticeBarColor(player.matchPractice ?? 50)}`} style={{ width: `${player.matchPractice ?? 50}%` }} />
                            </div>
                            <span className={`text-[10px] w-5 ${getPracticeColor(player.matchPractice ?? 50)}`}>{player.matchPractice ?? 50}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(player.traits ?? []).map((t) => {
                              const def = getTraitDefinition(t.traitId);
                              if (!def) return null;
                              return (
                                <span key={t.traitId} className={`text-[10px] px-1 py-0.5 rounded border ${TIER_BG_COLORS[t.tier]} ${TIER_COLORS[t.tier]}`} title={`${def.name} (${TIER_LABELS[t.tier]})`}>
                                  {def.icon}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">{player.morale}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium text-xs">Name</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-10">Pos</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-10" title="Einsätze">Sp</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-10" title="Tore">T</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-10" title="Vorlagen">V</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-10" title="Gelbe Karten">🟨</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-10" title="Rote Karten">🟥</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-14" title="Ø Bewertung">Ø Note</th>
                    <th className="text-center px-2 py-2 text-muted-foreground font-medium text-xs w-14" title="Minuten">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredPlayers]
                    .sort((a, b) => b.stats.appearances - a.stats.appearances || b.stats.goals - a.stats.goals)
                    .map((player) => {
                      const s = player.stats;
                      const avgRating = s.appearances > 0 && s.avgRating ? s.avgRating.toFixed(1) : '—';
                      return (
                        <tr
                          key={player.id}
                          className="border-b border-border/30 hover:bg-secondary/20 cursor-pointer transition-colors"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <td className="px-3 py-2">
                            <span className="font-medium">{player.lastName}</span>
                            <span className="text-muted-foreground ml-1 text-xs">{player.firstName.charAt(0)}.</span>
                          </td>
                          <td className="text-center px-2 py-2 text-xs text-muted-foreground">{player.position}</td>
                          <td className="text-center px-2 py-2 font-mono font-bold">{s.appearances}</td>
                          <td className={`text-center px-2 py-2 font-mono font-bold ${s.goals > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>{s.goals}</td>
                          <td className={`text-center px-2 py-2 font-mono font-bold ${s.assists > 0 ? 'text-blue-400' : 'text-muted-foreground'}`}>{s.assists}</td>
                          <td className={`text-center px-2 py-2 font-mono ${s.yellowCards > 0 ? 'text-yellow-400' : 'text-muted-foreground'}`}>{s.yellowCards}</td>
                          <td className={`text-center px-2 py-2 font-mono ${s.redCards > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{s.redCards}</td>
                          <td className={`text-center px-2 py-2 font-mono font-bold ${
                            Number(avgRating) >= 7.5 ? 'text-green-400' : Number(avgRating) >= 6.5 ? 'text-emerald-400' : Number(avgRating) >= 5.5 ? 'text-yellow-400' : avgRating !== '—' ? 'text-orange-400' : 'text-muted-foreground'
                          }`}>{avgRating}</td>
                          <td className="text-center px-2 py-2 font-mono text-xs text-muted-foreground">{s.minutesPlayed ?? '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <PlayerDetailDialog
        player={selectedPlayer}
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />

      {showCompare && (
        <PlayerCompare
          players={players}
          initialPlayerA={comparePlayerA}
          onClose={() => { setShowCompare(false); setComparePlayerA(undefined); }}
        />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ThSort({ label, sortKey: sk, current, asc, onSort, className = "" }: {
  label: string; sortKey: SortKey; current: SortKey; asc: boolean; onSort: (k: SortKey) => void; className?: string;
}) {
  const isActive = current === sk;
  return (
    <th className={`text-left px-3 py-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
        onClick={() => onSort(sk)}
      >
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? "text-primary" : "opacity-30"}`} />
      </Button>
    </th>
  );
}
