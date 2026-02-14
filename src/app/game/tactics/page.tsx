"use client";

import { useState, useMemo, useCallback, useRef, DragEvent } from "react";
import {
  FORMATION_POSITIONS, FORMATION_LABELS, FormationType,
  getPositionCompatibility, getPositionFitLabel, calcEffectiveOverall,
} from "@/types/tactics";
import { POSITION_LABELS, Player, Position } from "@/types/player";
import { getTraitDefinition, TIER_COLORS, TIER_BG_COLORS, TIER_LABELS, TRAIT_CATALOG, TraitTier } from "@/types/traits";
import { calcOverall as calculateOverall, useMyPlayers, useTactics } from "@/store/selectors";
import { useGameStore } from "@/store/game-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, Zap, Brain, Shield, Activity, Star, Search, X, GripVertical } from "lucide-react";

function getOverallColor(v: number): string {
  if (v >= 80) return "text-green-400";
  if (v >= 70) return "text-emerald-400";
  if (v >= 60) return "text-yellow-400";
  return "text-orange-400";
}

function getOverallBg(v: number): string {
  if (v >= 80) return "bg-green-400/20 border-green-400/40";
  if (v >= 70) return "bg-emerald-400/20 border-emerald-400/40";
  if (v >= 60) return "bg-yellow-400/20 border-yellow-400/40";
  return "bg-orange-400/20 border-orange-400/40";
}

function getAttrColor(v: number): string {
  if (v >= 85) return "text-green-400";
  if (v >= 70) return "text-emerald-400";
  if (v >= 55) return "text-yellow-400";
  if (v >= 40) return "text-orange-400";
  return "text-red-400";
}

function getCompatColor(c: number): string {
  if (c >= 0.95) return "border-green-400/60";
  if (c >= 0.80) return "border-emerald-400/50";
  if (c >= 0.65) return "border-yellow-400/50";
  if (c >= 0.50) return "border-orange-400/50";
  return "border-red-400/50";
}

function getCompatBg(c: number): string {
  if (c >= 0.95) return "bg-green-500/10";
  if (c >= 0.80) return "bg-emerald-500/10";
  if (c >= 0.65) return "bg-yellow-500/10";
  if (c >= 0.50) return "bg-orange-500/10";
  return "bg-red-500/10";
}

function AttrBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{
          width: `${value}%`,
          background: value >= 80 ? '#4ade80' : value >= 65 ? '#34d399' : value >= 50 ? '#facc15' : '#fb923c',
        }} />
      </div>
      <span className={`text-[10px] font-mono font-bold w-5 text-right ${getAttrColor(value)}`}>{value}</span>
    </div>
  );
}

function PlayerDetailPanel({ player, slotLabel, onClose }: { player: Player; slotLabel?: string; onClose: () => void }) {
  const overall = calculateOverall(player);
  const a = player.attributes;
  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();
  const compat = slotLabel ? getPositionCompatibility(player.position, slotLabel) : 1.0;
  const fit = getPositionFitLabel(compat);
  const effectiveOvr = calcEffectiveOverall(overall, compat);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">{player.firstName} {player.lastName}</p>
          <p className="text-[10px] text-muted-foreground">{POSITION_LABELS[player.position]} | {age} Jahre | {player.nationality}</p>
        </div>
        <div className="text-right">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-primary/50 ${getOverallColor(overall)}`}>
            {overall}
          </div>
          {slotLabel && compat < 0.95 && (
            <p className={`text-[8px] mt-0.5 ${fit.color}`}>{fit.icon} {effectiveOvr} eff.</p>
          )}
        </div>
      </div>

      {slotLabel && compat < 0.95 && (
        <div className={`p-2 rounded text-[10px] border ${getCompatColor(compat)} ${getCompatBg(compat)}`}>
          <span className={fit.color}>{fit.icon} {fit.label}</span>
          <span className="text-muted-foreground"> — Effektivität: {Math.round(compat * 100)}% auf {slotLabel}</span>
        </div>
      )}

      {(player.traits ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3" /> Spezialeigenschaften</p>
          <div className="flex flex-wrap gap-1">
            {(player.traits ?? []).map((t) => {
              const def = getTraitDefinition(t.traitId);
              if (!def) return null;
              return (
                <span key={t.traitId} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${TIER_BG_COLORS[t.tier]} ${TIER_COLORS[t.tier]}`}>
                  {def.icon} {def.name} <span className="opacity-70">({TIER_LABELS[t.tier]})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1 text-center">
        <div className="p-1.5 rounded bg-secondary/30">
          <Heart className="w-3 h-3 mx-auto text-red-400 mb-0.5" />
          <p className="text-[10px] font-bold">{player.condition}%</p>
          <p className="text-[8px] text-muted-foreground">Fitness</p>
        </div>
        <div className="p-1.5 rounded bg-secondary/30">
          <Brain className="w-3 h-3 mx-auto text-blue-400 mb-0.5" />
          <p className="text-[10px] font-bold">{player.morale}%</p>
          <p className="text-[8px] text-muted-foreground">Moral</p>
        </div>
        <div className="p-1.5 rounded bg-secondary/30">
          <Activity className="w-3 h-3 mx-auto text-green-400 mb-0.5" />
          <p className="text-[10px] font-bold">{player.form}%</p>
          <p className="text-[8px] text-muted-foreground">Form</p>
        </div>
        <div className="p-1.5 rounded bg-secondary/30">
          <Zap className="w-3 h-3 mx-auto text-yellow-400 mb-0.5" />
          <p className="text-[10px] font-bold">Lv.{player.level}</p>
          <p className="text-[8px] text-muted-foreground">Level</p>
        </div>
      </div>

      {player.position === 'TW' ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">Torwart</p>
          <AttrBar label="REF" value={a.reflexes} />
          <AttrBar label="HAL" value={a.handling} />
          <AttrBar label="TAU" value={a.diving} />
          <AttrBar label="ABS" value={a.kicking} />
          <AttrBar label="1v1" value={a.oneOnOne} />
          <AttrBar label="RUH" value={a.composure} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">Technisch</p>
          <AttrBar label="BAL" value={a.ballControl} />
          <AttrBar label="DRI" value={a.dribbling} />
          <AttrBar label="PAS" value={a.passing} />
          <AttrBar label="SCH" value={a.shooting} />
          <AttrBar label="ABS" value={a.finishing} />
          <p className="text-[10px] font-medium text-muted-foreground mt-2">Physisch</p>
          <AttrBar label="TEM" value={a.pace} />
          <AttrBar label="AUS" value={a.stamina} />
          <AttrBar label="STR" value={a.strength} />
        </div>
      )}

      {player.injury && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          🏥 {player.injury.type} — noch {player.injury.daysRemaining} Tage
        </div>
      )}

      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onClose}>Schließen</Button>
    </div>
  );
}

// ── Position sort order (TW → ABW → MF → ANG) ──
const POS_ORDER: Record<Position, number> = {
  TW: 0, IV: 1, LV: 2, RV: 3, ZDM: 4, ZM: 5, ZOM: 6, LA: 7, RA: 8, ST: 9,
};

// ── Position filter tabs ──
const POS_FILTERS: { label: string; positions: Position[] | null }[] = [
  { label: 'Alle', positions: null },
  { label: 'TW', positions: ['TW'] },
  { label: 'ABW', positions: ['IV', 'LV', 'RV'] },
  { label: 'MF', positions: ['ZDM', 'ZM', 'ZOM'] },
  { label: 'ANG', positions: ['LA', 'RA', 'ST'] },
];

export default function TacticsPage() {
  const allMyPlayers = useMyPlayers();
  const { tactics: allTactics, activeTactic } = useTactics();
  const updateTactics = useGameStore((s) => s.updateTactics);
  const setActiveTactic = useGameStore((s) => s.setActiveTactic);

  const tacticKey = (activeTactic ?? 'a') as 'a' | 'b' | 'c';
  const currentTactic = allTactics?.[tacticKey];

  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [inspectedSlotLabel, setInspectedSlotLabel] = useState<string | undefined>(undefined);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [posFilter, setPosFilter] = useState<Position[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTraitLegend, setShowTraitLegend] = useState(false);
  const dragPlayerRef = useRef<string | null>(null);

  const formation = (currentTactic?.formation ?? '4-2-3-1') as FormationType;
  const lineup = currentTactic?.lineup ?? [];

  const players = useMemo(() => {
    return [...allMyPlayers].sort((a, b) => {
      const posA = POS_ORDER[a.position] ?? 99;
      const posB = POS_ORDER[b.position] ?? 99;
      if (posA !== posB) return posA - posB;
      return calculateOverall(b) - calculateOverall(a);
    });
  }, [allMyPlayers]);

  const positions = FORMATION_POSITIONS[formation];

  const assignedPlayers = useMemo(() => {
    const padded = Array(positions.length).fill(null) as (string | null)[];
    lineup.forEach((id: string, i: number) => {
      if (i < padded.length) padded[i] = id || null;
    });
    return padded;
  }, [lineup, positions.length]);

  const assignedIds = useMemo(() => new Set(assignedPlayers.filter(Boolean)), [assignedPlayers]);

  const setFormation = useCallback((f: FormationType) => {
    updateTactics(tacticKey, { formation: f, lineup: [], substitutes: [] });
  }, [updateTactics, tacticKey]);

  const assignPlayer = useCallback((slotIndex: number, playerId: string) => {
    const newLineup = [...assignedPlayers];
    const sourceIdx = newLineup.indexOf(playerId);
    const displacedId = newLineup[slotIndex]; // player currently in target slot
    // Swap: put displaced player into source slot (if source exists)
    if (sourceIdx !== -1 && displacedId) {
      newLineup[sourceIdx] = displacedId;
    } else if (sourceIdx !== -1) {
      newLineup[sourceIdx] = null;
    }
    newLineup[slotIndex] = playerId;
    updateTactics(tacticKey, { lineup: newLineup.map((id) => id ?? '') });
  }, [assignedPlayers, updateTactics, tacticKey]);

  const removeFromSlot = useCallback((slotIndex: number) => {
    const newLineup = [...assignedPlayers];
    newLineup[slotIndex] = null;
    updateTactics(tacticKey, { lineup: newLineup.map((id) => id ?? '') });
  }, [assignedPlayers, updateTactics, tacticKey]);

  const autoFill = useCallback(() => {
    const newAssigned: (string | null)[] = Array(positions.length).fill(null);
    const usedIds = new Set<string>();
    // 1st pass: match by compatibility score
    const slots = positions.map((pos, idx) => ({ pos, idx }));
    // Sort slots to fill goalkeeper first, then specific positions
    slots.sort((a, b) => {
      if (a.pos.label === 'TW') return -1;
      if (b.pos.label === 'TW') return 1;
      return 0;
    });
    for (const { pos, idx } of slots) {
      const candidates = players
        .filter(p => !usedIds.has(p.id) && !p.injury)
        .map(p => ({ p, compat: getPositionCompatibility(p.position, pos.label) }))
        .sort((a, b) => {
          const effA = calcEffectiveOverall(calculateOverall(a.p), a.compat);
          const effB = calcEffectiveOverall(calculateOverall(b.p), b.compat);
          return effB - effA;
        });
      if (candidates.length > 0) {
        newAssigned[idx] = candidates[0].p.id;
        usedIds.add(candidates[0].p.id);
      }
    }
    updateTactics(tacticKey, { lineup: newAssigned.map((id) => id ?? '') });
  }, [positions, players, updateTactics, tacticKey]);

  const clearLineup = useCallback(() => {
    updateTactics(tacticKey, { lineup: [], substitutes: [] });
  }, [updateTactics, tacticKey]);

  // Drag handlers
  const handleDragStart = useCallback((e: DragEvent, playerId: string) => {
    dragPlayerRef.current = playerId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', playerId);
  }, []);

  const handleSlotDragOver = useCallback((e: DragEvent, slotIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotIdx);
  }, []);

  const handleSlotDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  const handleSlotDrop = useCallback((e: DragEvent, slotIdx: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    const playerId = e.dataTransfer.getData('text/plain') || dragPlayerRef.current;
    if (playerId) {
      assignPlayer(slotIdx, playerId);
    }
    dragPlayerRef.current = null;
  }, [assignPlayer]);

  if (players.length === 0) return null;

  const filledCount = assignedPlayers.filter(Boolean).length;
  const inspectedPlayer = inspectedPlayerId ? players.find((p) => p.id === inspectedPlayerId) ?? null : null;

  // Filtered squad for the right panel — 3 groups: Aufstellung / Bank / Nicht verfügbar
  const { squadStarters, squadBench, squadUnavailable } = useMemo(() => {
    const filtered = players.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.lastName.toLowerCase().includes(q) && !p.firstName.toLowerCase().includes(q) && !p.position.toLowerCase().includes(q)) return false;
      }
      if (posFilter && !posFilter.includes(p.position)) return false;
      return true;
    });
    const isUnavailable = (p: Player) => !!p.injury || p.suspended;
    const starters = filtered.filter(p => assignedIds.has(p.id));
    const bench = filtered.filter(p => !assignedIds.has(p.id) && !isUnavailable(p));
    const unavailable = filtered.filter(p => !assignedIds.has(p.id) && isUnavailable(p));
    return { squadStarters: starters, squadBench: bench, squadUnavailable: unavailable };
  }, [players, searchQuery, posFilter, assignedIds]);

  // ── Aufstellungsstärke berechnen ──
  const lineupStrength = useMemo(() => {
    const lineupPlayers = assignedPlayers
      .map((id, idx) => {
        if (!id) return null;
        const p = players.find(pl => pl.id === id);
        if (!p) return null;
        return { player: p, slotLabel: positions[idx]?.label ?? '' };
      })
      .filter(Boolean) as { player: Player; slotLabel: string }[];

    if (lineupPlayers.length === 0) return null;

    const MID_POS = new Set(['ZDM', 'ZM', 'ZOM']);
    const ATK_POS = new Set(['ST', 'LA', 'RA']);
    const DEF_POS = new Set(['IV', 'LV', 'RV']);

    const all = lineupPlayers.map(lp => lp.player);
    const gks = all.filter(p => p.position === 'TW');
    const defs = all.filter(p => DEF_POS.has(p.position));
    const mids = all.filter(p => MID_POS.has(p.position));
    const atks = all.filter(p => ATK_POS.has(p.position));
    const field = all.filter(p => p.position !== 'TW');

    // Effective overall per player (with position penalty)
    const effOvrMap = new Map<string, number>();
    for (const lp of lineupPlayers) {
      const compat = getPositionCompatibility(lp.player.position, lp.slotLabel);
      effOvrMap.set(lp.player.id, calcEffectiveOverall(calculateOverall(lp.player), compat));
    }

    const avg = (arr: Player[]) => arr.length > 0 ? Math.round(arr.reduce((s, p) => s + (effOvrMap.get(p.id) ?? calculateOverall(p)), 0) / arr.length) : 0;
    const avgAttr = (arr: Player[], fn: (p: Player) => number) => arr.length > 0 ? arr.reduce((s, p) => s + fn(p), 0) / arr.length : 0;

    const teamAvg = avg(all);
    const gkAvg = avg(gks);
    const defAvg = avg(defs);
    const midAvg = avg(mids);
    const atkAvg = avg(atks);

    const midfieldControl = mids.length > 0
      ? Math.round(avgAttr(mids, p => p.attributes.passing * 0.35 + p.attributes.vision * 0.30 + p.attributes.ballControl * 0.25 + p.attributes.composure * 0.10))
      : 0;
    const pressing = field.length > 0
      ? Math.round(avgAttr(field, p => p.attributes.workRate * 0.55 + p.attributes.aggression * 0.30 + p.attributes.positioning * 0.15))
      : 0;
    const defPass = defs.length > 0 ? avgAttr(defs, p => p.attributes.passing * 0.6 + p.attributes.composure * 0.4) : 0;
    const gkBuild = gks.length > 0 ? avgAttr(gks, p => p.attributes.kicking * 0.5 + p.attributes.handling * 0.3 + p.attributes.composure * 0.2) : 0;
    const buildup = Math.round(defPass * 0.7 + gkBuild * 0.3);
    const avgCondition = Math.round(avgAttr(field, p => p.condition));
    const attackPower = atks.length > 0
      ? Math.round(avgAttr(atks, p => p.attributes.finishing * 0.3 + p.attributes.shooting * 0.25 + p.attributes.dribbling * 0.2 + p.attributes.positioning * 0.25))
      : 0;
    const defensePower = defs.length > 0
      ? Math.round(avgAttr(defs, p => p.attributes.positioning * 0.3 + p.attributes.strength * 0.25 + p.attributes.heading * 0.2 + p.attributes.composure * 0.15 + p.attributes.aggression * 0.1))
      : 0;

    return {
      teamAvg, gkAvg, defAvg, midAvg, atkAvg,
      midfieldControl, pressing, buildup, avgCondition,
      attackPower, defensePower,
      gkCount: gks.length, defCount: defs.length, midCount: mids.length, atkCount: atks.length,
      total: all.length,
    };
  }, [assignedPlayers, players, positions]);

  // Count OOP players
  const oopCount = assignedPlayers.reduce((count, id, idx) => {
    if (!id) return count;
    const p = players.find(pl => pl.id === id);
    if (!p) return count;
    const compat = getPositionCompatibility(p.position, positions[idx].label);
    return compat < 0.80 ? count + 1 : count;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl font-bold">Taktik</h1>
          <div className="flex items-center gap-1">
            {(['a', 'b', 'c'] as const).map((k) => (
              <Button key={k} size="sm" variant={tacticKey === k ? "default" : "outline"} className="text-xs w-8 h-7" onClick={() => setActiveTactic(k)}>
                {k.toUpperCase()}
              </Button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            <span className={filledCount >= 11 ? "text-green-400 font-bold" : "text-amber-400 font-bold"}>{filledCount}/11</span>
            {oopCount > 0 && <span className="text-orange-400 ml-2">⚠ {oopCount} falsche Pos.</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={formation} onValueChange={(v) => setFormation(v as FormationType)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FORMATION_LABELS) as FormationType[]).map((f) => (
                <SelectItem key={f} value={f}>{FORMATION_LABELS[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={autoFill}>Auto</Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={clearLineup}>Reset</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ═══ PITCH (left: 7 cols) ═══ */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="relative w-full aspect-[3/4] max-h-[540px] bg-[hsl(var(--pitch))] overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130" preserveAspectRatio="none">
                  <rect x="0" y="0" width="100" height="130" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                  <line x1="0" y1="65" x2="100" y2="65" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
                  <circle cx="50" cy="65" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
                  <circle cx="50" cy="65" r="0.8" fill="rgba(255,255,255,0.2)" />
                  <rect x="22" y="0" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
                  <rect x="35" y="0" width="30" height="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
                  <rect x="22" y="110" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
                  <rect x="35" y="123" width="30" height="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
                </svg>

                {positions.map((pos, idx) => {
                  const playerId = assignedPlayers[idx];
                  const player = playerId ? players.find((p) => p.id === playerId) : null;
                  const overall = player ? calculateOverall(player) : 0;
                  const compat = player ? getPositionCompatibility(player.position, pos.label) : 1.0;
                  const effectiveOvr = player ? calcEffectiveOverall(overall, compat) : 0;
                  const isDragOver = dragOverSlot === idx;
                  const isOOP = player && compat < 0.80;

                  return (
                    <div
                      key={idx}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 group ${player ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                      style={{ left: `${pos.x}%`, top: `${(pos.y / 100) * 100}%` }}
                      draggable={!!player}
                      onDragStart={(e) => { if (player) handleDragStart(e, player.id); }}
                      onDragOver={(e) => handleSlotDragOver(e, idx)}
                      onDragLeave={handleSlotDragLeave}
                      onDrop={(e) => handleSlotDrop(e, idx)}
                      onClick={() => {
                        if (player) {
                          setInspectedPlayerId(player.id);
                          setInspectedSlotLabel(pos.label);
                        }
                      }}
                    >
                      {/* Drop zone indicator */}
                      {isDragOver && (
                        <div className="absolute -inset-2 rounded-full bg-primary/30 border-2 border-primary border-dashed animate-pulse" />
                      )}
                      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                        player
                          ? `bg-card/90 backdrop-blur-sm ${isOOP ? getCompatColor(compat) : 'border-primary/60'} group-hover:scale-110`
                          : `bg-card/40 border-dashed border-muted-foreground/40 ${isDragOver ? 'border-primary scale-110' : ''}`
                      }`}>
                        {player ? (
                          <>
                            <span className={getOverallColor(effectiveOvr)}>{effectiveOvr}</span>
                            {isOOP && (
                              <span className="absolute -bottom-0.5 -right-0.5 text-[7px] w-3.5 h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">!</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground/70 text-[10px]">{pos.label}</span>
                        )}
                      </div>
                      <p className="text-center text-[8px] mt-0.5 text-white/80 font-medium drop-shadow-md truncate max-w-16">
                        {player ? player.lastName : pos.label}
                      </p>
                      {player && compat < 0.95 && (
                        <p className={`text-center text-[7px] ${getPositionFitLabel(compat).color} drop-shadow-md`}>
                          {player.position}→{pos.label} {Math.round(compat * 100)}%
                        </p>
                      )}
                      {/* Trait badges on pitch */}
                      {player && (player.traits ?? []).length > 0 && (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          {(player.traits ?? []).map((t) => {
                            const def = getTraitDefinition(t.traitId);
                            if (!def) return null;
                            return (
                              <span
                                key={t.traitId}
                                className={`text-[7px] px-1 py-px rounded border ${TIER_BG_COLORS[t.tier]} ${TIER_COLORS[t.tier]} drop-shadow-md`}
                                title={`${def.name} (${TIER_LABELS[t.tier]})`}
                              >
                                {def.icon}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {/* Right-click to remove */}
                      {player && (
                        <button
                          className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white text-[8px] hidden group-hover:flex items-center justify-center hover:bg-red-500"
                          onClick={(e) => { e.stopPropagation(); removeFromSlot(idx); }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ═══ Aufstellungsstärke ═══ */}
          {lineupStrength && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Aufstellungsstärke
                  </CardTitle>
                  <span className={`text-lg font-bold font-mono ${getOverallColor(lineupStrength.teamAvg)}`}>
                    Ø {lineupStrength.teamAvg}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Positionsgruppen */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Torwart', avg: lineupStrength.gkAvg, count: lineupStrength.gkCount, icon: '🧤' },
                    { label: 'Abwehr', avg: lineupStrength.defAvg, count: lineupStrength.defCount, icon: '🛡️' },
                    { label: 'Mittelfeld', avg: lineupStrength.midAvg, count: lineupStrength.midCount, icon: '🎯' },
                    { label: 'Angriff', avg: lineupStrength.atkAvg, count: lineupStrength.atkCount, icon: '⚡' },
                  ].map((g) => (
                    <div key={g.label} className="text-center p-2 rounded-md bg-secondary/30 border border-border/50">
                      <p className="text-xs mb-1">{g.icon}</p>
                      <p className={`text-sm font-bold font-mono ${g.count > 0 ? getOverallColor(g.avg) : 'text-muted-foreground'}`}>
                        {g.count > 0 ? g.avg : '—'}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{g.label} ({g.count})</p>
                    </div>
                  ))}
                </div>

                {/* Spieler-Slots Kompaktansicht */}
                <div className="flex items-center gap-2 flex-wrap">
                  {positions.map((pos, idx) => {
                    const pid = assignedPlayers[idx];
                    const p = pid ? players.find(pl => pl.id === pid) : null;
                    if (!p) return null;
                    const compat = getPositionCompatibility(p.position, pos.label);
                    const effOvr = calcEffectiveOverall(calculateOverall(p), compat);
                    return (
                      <div key={idx} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border ${getCompatColor(compat)} ${getCompatBg(compat)}`}>
                        <span className="font-mono text-muted-foreground">{pos.label}</span>
                        <span className={`font-bold ${getOverallColor(effOvr)}`}>{effOvr}</span>
                        <span className="text-muted-foreground truncate max-w-12">{p.lastName}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Match-Engine Faktoren */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Spieleinfluss (Match-Engine)</p>
                  {[
                    { label: 'Mittelfeld-Kontrolle', value: lineupStrength.midfieldControl, desc: 'Passing · Vision · Ballkontrolle', weight: '35%' },
                    { label: 'Pressing', value: lineupStrength.pressing, desc: 'Einsatz · Aggression · Positionierung', weight: '25%' },
                    { label: 'Spielaufbau', value: lineupStrength.buildup, desc: 'Verteidiger-Pass · TW-Abschlag', weight: '15%' },
                    { label: 'Angriffsstärke', value: lineupStrength.attackPower, desc: 'Abschluss · Schuss · Dribbling', weight: '—' },
                    { label: 'Defensive Stärke', value: lineupStrength.defensePower, desc: 'Positionierung · Stärke · Kopfball', weight: '—' },
                    { label: 'Ø Fitness', value: lineupStrength.avgCondition, desc: 'Durchschnittliche Kondition', weight: '15%' },
                  ].map((f) => (
                    <div key={f.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground/80">{f.label}</span>
                        <div className="flex items-center gap-2">
                          {f.weight !== '—' && <span className="text-muted-foreground/60">{f.weight}</span>}
                          <span className={`font-mono font-bold w-6 text-right ${getAttrColor(f.value)}`}>{f.value}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{
                          width: `${f.value}%`,
                          background: f.value >= 80 ? '#4ade80' : f.value >= 65 ? '#34d399' : f.value >= 50 ? '#facc15' : '#fb923c',
                        }} />
                      </div>
                      <p className="text-[8px] text-muted-foreground/50">{f.desc}</p>
                    </div>
                  ))}
                </div>

                {lineupStrength.total < 11 && (
                  <p className="text-[10px] text-amber-400 text-center">
                    Aufstellung unvollständig ({lineupStrength.total}/11)
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══ RIGHT PANEL: Full Squad + Details (5 cols) ═══ */}
        <div className="lg:col-span-5 space-y-3">
          {/* Player Detail (shown when inspected) */}
          {inspectedPlayer && (
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <PlayerDetailPanel player={inspectedPlayer} slotLabel={inspectedSlotLabel} onClose={() => { setInspectedPlayerId(null); setInspectedSlotLabel(undefined); }} />
              </CardContent>
            </Card>
          )}

          {/* Full Squad */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Kader</CardTitle>
                <span className="text-[10px] text-muted-foreground">{players.length} Spieler</span>
              </div>
              {/* Search + Filter */}
              <div className="flex items-center gap-1.5 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    className="w-full h-7 pl-6 pr-6 text-xs bg-secondary/30 border border-border rounded-md outline-none focus:border-primary/50"
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {POS_FILTERS.map(f => (
                  <button
                    key={f.label}
                    className={`text-[9px] px-1.5 py-1 rounded border ${
                      (posFilter === null && f.positions === null) || (posFilter && f.positions && posFilter[0] === f.positions[0])
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setPosFilter(f.positions)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[520px] overflow-y-auto">
                {/* ── Render helper for a player row ── */}
                {[
                  { key: 'starters', label: 'Aufstellung', players: squadStarters, bg: 'bg-primary/10 border-primary/20', textCls: 'text-primary', count: squadStarters.length },
                  { key: 'bench', label: 'Bank', players: squadBench, bg: 'bg-secondary/30 border-border/50', textCls: 'text-muted-foreground', count: squadBench.length },
                  { key: 'unavailable', label: 'Nicht verfügbar', players: squadUnavailable, bg: 'bg-red-500/10 border-red-500/20', textCls: 'text-red-400', count: squadUnavailable.length },
                ].map(section => {
                  if (section.players.length === 0) return null;
                  return (
                    <div key={section.key}>
                      <div className={`px-3 py-1 border-b ${section.bg}`}>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${section.textCls}`}>
                          {section.label} ({section.count})
                        </span>
                      </div>
                      {section.players.map((player) => {
                        const overall = calculateOverall(player);
                        const isAssigned = assignedIds.has(player.id);
                        const assignedSlotIdx = isAssigned ? assignedPlayers.indexOf(player.id) : -1;
                        const slotLabel = assignedSlotIdx >= 0 ? positions[assignedSlotIdx]?.label : undefined;
                        const compat = slotLabel ? getPositionCompatibility(player.position, slotLabel) : 1.0;
                        const effOvr = slotLabel ? calcEffectiveOverall(overall, compat) : overall;
                        const isInjured = !!player.injury;
                        const isSuspended = player.suspended;
                        const isUnavail = isInjured || isSuspended;

                        return (
                          <div
                            key={player.id}
                            draggable={!isUnavail}
                            onDragStart={(e) => handleDragStart(e, player.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 border-b border-border/30 transition-colors hover:bg-secondary/20 ${
                              isUnavail ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                            } ${isAssigned ? 'bg-primary/5' : ''}`}
                            onClick={() => { setInspectedPlayerId(player.id); setInspectedSlotLabel(slotLabel); }}
                          >
                            <GripVertical className={`w-3 h-3 shrink-0 ${isUnavail ? 'text-muted-foreground/10' : 'text-muted-foreground/30'}`} />
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${getOverallBg(overall)}`}>
                              {slotLabel && compat < 0.95 ? (
                                <span className={getOverallColor(effOvr)}>{effOvr}</span>
                              ) : (
                                <span className={getOverallColor(overall)}>{overall}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Row 1: Name + Traits */}
                              <div className="flex items-center gap-1">
                                <p className={`text-xs font-medium truncate ${isUnavail ? 'text-muted-foreground' : ''}`}>{player.lastName}</p>
                                {(player.traits ?? []).length > 0 && (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {(player.traits ?? []).map(t => {
                                      const def = getTraitDefinition(t.traitId);
                                      if (!def) return null;
                                      return (
                                        <span
                                          key={t.traitId}
                                          className={`text-[8px] px-1 py-px rounded border ${TIER_BG_COLORS[t.tier]} ${TIER_COLORS[t.tier]}`}
                                          title={`${def.name} (${TIER_LABELS[t.tier]})`}
                                        >
                                          {def.icon} {def.name}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              {/* Row 2: Position + Slot Compat */}
                              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                <span className="font-mono font-medium">{player.position}</span>
                                {isAssigned && slotLabel && (
                                  <>
                                    <span>→</span>
                                    <span className={compat >= 0.80 ? 'text-green-400' : compat >= 0.50 ? 'text-yellow-400' : 'text-red-400'}>
                                      {slotLabel} {compat < 0.95 ? `${Math.round(compat * 100)}%` : '✓'}
                                    </span>
                                  </>
                                )}
                                {!isAssigned && !isUnavail && <span className="text-muted-foreground/50">—</span>}
                              </div>
                              {/* Row 3: Stats (Fitness, Moral, Form, Level) */}
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] flex items-center gap-0.5" title="Fitness">
                                  <Activity className="w-2.5 h-2.5 text-green-400" />
                                  <span className={player.condition >= 80 ? 'text-green-400' : player.condition >= 50 ? 'text-yellow-400' : 'text-red-400'}>{player.condition}%</span>
                                </span>
                                <span className="text-[8px] flex items-center gap-0.5" title="Moral">
                                  <Heart className="w-2.5 h-2.5 text-pink-400" />
                                  <span className={player.morale >= 70 ? 'text-green-400' : player.morale >= 40 ? 'text-yellow-400' : 'text-red-400'}>{player.morale}</span>
                                </span>
                                <span className="text-[8px] flex items-center gap-0.5" title="Form">
                                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                                  <span className={player.form >= 70 ? 'text-green-400' : player.form >= 40 ? 'text-yellow-400' : 'text-red-400'}>{player.form}</span>
                                </span>
                                <span className="text-[8px] flex items-center gap-0.5" title="Level">
                                  <Star className="w-2.5 h-2.5 text-blue-400" />
                                  <span className="text-blue-400">Lv.{player.level}</span>
                                </span>
                              </div>
                              {/* Row 4: Unavailability reason */}
                              {isInjured && player.injury && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-medium">
                                    🏥 {player.injury.type} — noch {player.injury.daysRemaining} {player.injury.daysRemaining === 1 ? 'Tag' : 'Tage'}
                                  </span>
                                </div>
                              )}
                              {isSuspended && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-400 font-medium">
                                    � Gesperrt — noch {player.suspendedMatches} {player.suspendedMatches === 1 ? 'Spiel' : 'Spiele'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {squadStarters.length === 0 && squadBench.length === 0 && squadUnavailable.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Keine Spieler gefunden.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trait-Legende */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-1">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowTraitLegend(!showTraitLegend)}
              >
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Trait-Legende
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">{showTraitLegend ? '▲' : '▼'}</span>
              </button>
            </CardHeader>
            {showTraitLegend && (
              <CardContent className="pt-1 space-y-2">
                {/* Tier-Erklärung */}
                <div className="flex items-center gap-2">
                  {(['bronze', 'silver', 'gold'] as TraitTier[]).map(tier => (
                    <span key={tier} className={`text-[9px] px-1.5 py-0.5 rounded border ${TIER_BG_COLORS[tier]} ${TIER_COLORS[tier]}`}>
                      {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : '⭐'} {TIER_LABELS[tier]}
                    </span>
                  ))}
                </div>
                {/* Trait-Katalog nach Kategorie */}
                {(['offensive', 'defensive', 'goalkeeper', 'mental', 'physical'] as const).map(cat => {
                  const traits = TRAIT_CATALOG.filter(t => t.category === cat);
                  if (traits.length === 0) return null;
                  const catLabel = cat === 'offensive' ? 'Offensiv' : cat === 'defensive' ? 'Defensiv' : cat === 'goalkeeper' ? 'Torwart' : cat === 'mental' ? 'Mental' : 'Physisch';
                  return (
                    <div key={cat}>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{catLabel}</p>
                      <div className="space-y-0.5">
                        {traits.map(t => (
                          <div key={t.id} className="flex items-start gap-1.5 text-[9px]">
                            <span className="shrink-0">{t.icon}</span>
                            <div>
                              <span className="font-medium text-foreground">{t.name}</span>
                              <span className="text-muted-foreground"> — {t.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
