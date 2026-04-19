"use client";

import { useEffect, useMemo, useRef } from "react";
import { MatchEvent } from "@/types/match";

// ── Event styling ──

const EVENT_ICON: Record<string, string> = {
  goal: "⚽", assist: "🅰️", shot_saved: "🧤", shot_missed: "💨", shot_blocked: "🛡️", shot_post: "🥅",
  foul: "⚠️", yellow_card: "🟨", red_card: "🟥", second_yellow: "🟨🟥", substitution: "🔄",
  injury: "🏥", penalty_scored: "⚽🎯", penalty_missed: "❌🎯", penalty_saved: "🧤🎯",
  free_kick_goal: "⚽💫", corner: "📐", offside: "🚩", kick_off: "▶️",
  half_time: "⏸️", full_time: "🏁", extra_time_start: "⏱️", extra_time_end: "🏁",
  penalty_shootout: "🎯", tactical: "", decision: "🎮",
};

type EventSize = 'hero' | 'large' | 'medium' | 'small' | 'commentary' | 'separator';

function getEventSize(type: string): EventSize {
  if (['goal', 'penalty_scored', 'free_kick_goal'].includes(type)) return 'hero';
  if (['red_card', 'second_yellow', 'penalty_missed', 'penalty_saved'].includes(type)) return 'large';
  if (['shot_saved', 'shot_post', 'shot_blocked', 'yellow_card', 'substitution', 'decision'].includes(type)) return 'medium';
  if (['kick_off', 'half_time', 'full_time', 'extra_time_start', 'extra_time_end', 'penalty_shootout'].includes(type)) return 'separator';
  if (type === 'tactical') return 'commentary';
  return 'small';
}

function getEventColors(type: string): { bg: string; border: string; text: string; glow?: string; dot: string } {
  if (['goal', 'penalty_scored', 'free_kick_goal'].includes(type))
    return { bg: 'bg-green-500/15', border: 'border-green-500/50', text: 'text-green-400', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]', dot: 'bg-green-500' };
  if (['red_card', 'second_yellow'].includes(type))
    return { bg: 'bg-red-500/15', border: 'border-red-500/50', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]', dot: 'bg-red-500' };
  if (['yellow_card'].includes(type))
    return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', dot: 'bg-yellow-500' };
  if (['penalty_missed', 'penalty_saved'].includes(type))
    return { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-400', dot: 'bg-orange-500' };
  if (['shot_saved', 'shot_post', 'shot_blocked'].includes(type))
    return { bg: 'bg-blue-500/8', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' };
  if (['substitution'].includes(type))
    return { bg: 'bg-cyan-500/8', border: 'border-cyan-500/25', text: 'text-cyan-400', dot: 'bg-cyan-500' };
  if (['kick_off', 'half_time', 'full_time'].includes(type))
    return { bg: 'bg-secondary/40', border: 'border-border', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };
  return { bg: 'bg-card/50', border: 'border-border/30', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' };
}

// ── Momentum calculation ──
function calcMomentum(events: MatchEvent[], homeTeamId: string): number {
  // Returns -100 to +100 (negative = away momentum, positive = home momentum)
  const recent = events.slice(-15);
  let score = 0;
  for (const e of recent) {
    const isHome = e.teamId === homeTeamId;
    const dir = isHome ? 1 : -1;
    if (['goal', 'penalty_scored', 'free_kick_goal'].includes(e.type)) score += dir * 30;
    else if (['shot_saved', 'shot_post', 'shot_blocked'].includes(e.type)) score += dir * 8;
    else if (e.type === 'shot_missed') score += dir * 4;
    else if (e.type === 'corner') score += dir * 3;
    else if (['red_card', 'second_yellow'].includes(e.type)) score -= dir * 15;
    else if (e.type === 'foul') score -= dir * 2;
    else if (e.type === 'tactical' && e.teamId) score += dir * 1;
  }
  return Math.max(-100, Math.min(100, score));
}

// ── Timeline Event Cards ──

function HeroEventCard({ event, homeTeamId, homeScore, awayScore, onShowDevLog, isLatest }: {
  event: MatchEvent; homeTeamId: string; homeScore?: number; awayScore?: number;
  onShowDevLog?: (log: string[]) => void; isLatest?: boolean;
}) {
  const colors = getEventColors(event.type);
  const isHome = event.teamId === homeTeamId;

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Timeline */}
      <div className="flex flex-col items-center shrink-0 w-12">
        <span className={`text-sm font-mono font-black ${colors.text}`}>{event.minute}&apos;</span>
        <div className={`w-4 h-4 rounded-full ${colors.dot} ${isLatest ? 'animate-pulse ring-2 ring-green-500/50' : ''} shrink-0 mt-1`} />
        <div className="w-px flex-1 bg-border/40 mt-1" />
      </div>

      {/* Card */}
      <div
        className={`flex-1 rounded-xl border-2 ${colors.border} ${colors.bg} ${colors.glow ?? ''} p-4 mb-2 ${event.devLog && onShowDevLog ? 'cursor-pointer hover:brightness-110' : ''}`}
        onClick={() => event.devLog && onShowDevLog?.(event.devLog)}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-2xl">{EVENT_ICON[event.type] ?? "⚽"}</span>
          <span className={`text-lg font-display font-black uppercase tracking-wide ${colors.text}`}>
            {event.type === 'goal' ? 'TOOOR!' : event.type === 'penalty_scored' ? 'ELFMETER — TOR!' : 'FREISTOSS — TOR!'}
          </span>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${isHome ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
            {isHome ? 'HEIM' : 'GAST'}
          </span>
        </div>
        <p className="text-sm font-medium leading-snug">{event.description}</p>
        {homeScore !== undefined && awayScore !== undefined && (
          <div className="mt-2.5 inline-flex items-center gap-2.5 bg-black/30 rounded-lg px-4 py-1.5">
            <span className={`text-2xl font-display font-black ${isHome ? colors.text : ''}`}>{homeScore}</span>
            <span className="text-lg text-muted-foreground/50">:</span>
            <span className={`text-2xl font-display font-black ${!isHome ? colors.text : ''}`}>{awayScore}</span>
          </div>
        )}
        {event.devLog && onShowDevLog && (
          <p className="text-[9px] text-muted-foreground/50 mt-1.5">🔍 Klick für Details</p>
        )}
      </div>
    </div>
  );
}

function LargeEventCard({ event, homeTeamId, onShowDevLog }: {
  event: MatchEvent; homeTeamId: string; onShowDevLog?: (log: string[]) => void;
}) {
  const colors = getEventColors(event.type);
  const isHome = event.teamId === homeTeamId;

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-3 duration-400">
      <div className="flex flex-col items-center shrink-0 w-12">
        <span className={`text-xs font-mono font-bold ${colors.text}`}>{event.minute}&apos;</span>
        <div className={`w-3 h-3 rounded-full ${colors.dot} shrink-0 mt-1`} />
        <div className="w-px flex-1 bg-border/40 mt-1" />
      </div>
      <div
        className={`flex-1 rounded-lg border ${colors.border} ${colors.bg} ${colors.glow ?? ''} p-3 mb-1.5 ${event.devLog && onShowDevLog ? 'cursor-pointer hover:brightness-110' : ''}`}
        onClick={() => event.devLog && onShowDevLog?.(event.devLog)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl shrink-0">{EVENT_ICON[event.type] ?? "•"}</span>
          <p className={`text-sm font-bold flex-1 ${colors.text}`}>{event.description}</p>
          {event.devLog && onShowDevLog && <span className="text-[7px] text-muted-foreground/50 shrink-0">🔍</span>}
          {event.teamId && <span className="text-[9px] text-muted-foreground shrink-0">{isHome ? 'H' : 'A'}</span>}
        </div>
      </div>
    </div>
  );
}

function MediumEventCard({ event, homeTeamId, onShowDevLog }: {
  event: MatchEvent; homeTeamId: string; onShowDevLog?: (log: string[]) => void;
}) {
  const colors = getEventColors(event.type);
  const isHome = event.teamId === homeTeamId;

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col items-center shrink-0 w-12">
        <span className="text-[10px] font-mono text-muted-foreground">{event.minute}&apos;</span>
        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} shrink-0 mt-1`} />
        <div className="w-px flex-1 bg-border/30 mt-1" />
      </div>
      <div
        className={`flex-1 rounded-lg border ${colors.border} ${colors.bg} px-3 py-2 mb-1 ${event.devLog && onShowDevLog ? 'cursor-pointer hover:brightness-110' : ''}`}
        onClick={() => event.devLog && onShowDevLog?.(event.devLog)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base shrink-0">{EVENT_ICON[event.type] ?? "•"}</span>
          <p className="text-xs font-medium flex-1 min-w-0">{event.description}</p>
          <div className="flex items-center gap-1 shrink-0">
            {event.devLog && onShowDevLog && <span className="text-[7px] text-muted-foreground/50">🔍</span>}
            {event.teamId && <span className="text-[8px] text-muted-foreground">{isHome ? 'H' : 'A'}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentaryCard({ event }: { event: MatchEvent }) {
  return (
    <div className="flex gap-3 animate-in fade-in duration-200">
      <div className="flex flex-col items-center shrink-0 w-12">
        <span className="text-[10px] font-mono text-muted-foreground/60">{event.minute}&apos;</span>
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0 mt-1" />
        <div className="w-px flex-1 bg-border/20 mt-1" />
      </div>
      <div className="flex-1 py-0.5 mb-0.5">
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed italic">{event.description}</p>
      </div>
    </div>
  );
}

function SmallEventCard({ event, homeTeamId }: { event: MatchEvent; homeTeamId: string }) {
  const isHome = event.teamId === homeTeamId;
  return (
    <div className="flex gap-3 animate-in fade-in duration-200">
      <div className="flex flex-col items-center shrink-0 w-12">
        <span className="text-[10px] font-mono text-muted-foreground/60">{event.minute}&apos;</span>
        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0 mt-1" />
        <div className="w-px flex-1 bg-border/20 mt-1" />
      </div>
      <div className="flex-1 flex items-center gap-1.5 py-0.5 mb-0.5 opacity-70 hover:opacity-100 transition-opacity">
        <span className="text-xs shrink-0">{EVENT_ICON[event.type] ?? "•"}</span>
        <p className="text-[11px] text-muted-foreground flex-1 min-w-0">{event.description}</p>
        {event.teamId && <span className="text-[8px] text-muted-foreground shrink-0">{isHome ? 'H' : 'A'}</span>}
      </div>
    </div>
  );
}

function SeparatorCard({ event }: { event: MatchEvent }) {
  const colors = getEventColors(event.type);
  return (
    <div className="flex gap-3 my-1 animate-in fade-in duration-300">
      <div className="flex flex-col items-center shrink-0 w-12">
        <div className={`w-3 h-3 rounded-full ${colors.dot} shrink-0`} />
      </div>
      <div className={`flex-1 flex items-center justify-center gap-3 py-2 border-y ${colors.border} ${colors.bg} rounded-lg`}>
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          {EVENT_ICON[event.type]} {event.description}
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  Momentum Bar
// ════════════════════════════════════════════════════════

function MomentumBar({ value }: { value: number }) {
  // value: -100 (away) to +100 (home)
  const pct = 50 + (value / 2);
  const isHome = value > 10;
  const isAway = value < -10;
  const color = isHome ? 'bg-primary/70' : isAway ? 'bg-accent/70' : 'bg-muted-foreground/40';
  const label = isHome ? 'Heim-Druck' : isAway ? 'Gast-Druck' : 'Ausgeglichen';

  return (
    <div className="px-4 py-1.5">
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
        <span>Gast</span>
        <span className="font-medium">{label}</span>
        <span>Heim</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-secondary/50 overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border z-10" />
        <div
          className={`absolute inset-y-0 rounded-full transition-all duration-700 ease-out ${color}`}
          style={{
            left: `${Math.min(pct, 50)}%`,
            width: `${Math.abs(pct - 50)}%`,
          }}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  Main Ticker View
// ════════════════════════════════════════════════════════

interface MatchTickerViewProps {
  events: MatchEvent[];
  homeTeamId: string;
  homeScore: number;
  awayScore: number;
  currentMinute: number;
  isPlaying: boolean;
  isFinished: boolean;
  onShowDevLog?: (log: string[]) => void;
}

export default function MatchTickerView({
  events, homeTeamId, homeScore, awayScore,
  currentMinute, isPlaying, isFinished, onShowDevLog,
}: MatchTickerViewProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  // Filter out assists (shown inline with goals)
  const filtered = useMemo(() => events.filter(e => e.type !== 'assist'), [events]);

  // Momentum
  const momentum = useMemo(() => calcMomentum(filtered, homeTeamId), [filtered, homeTeamId]);

  // Track running score for goal cards
  let runningHome = 0;
  let runningAway = 0;

  return (
    <div className="flex flex-col h-full">
      {/* Ticker header */}
      <div className="shrink-0 border-b border-border/50 glass-panel">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            Live-Ticker
          </p>
          {isPlaying && !isFinished && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-400 font-bold">{currentMinute}&apos; LIVE</span>
            </div>
          )}
          {isFinished && (
            <span className="text-[10px] text-muted-foreground font-bold">ABPFIFF</span>
          )}
        </div>
        {/* Momentum bar — only during live play */}
        {!isFinished && currentMinute > 0 && <MomentumBar value={momentum} />}
      </div>

      {/* Event list with timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filtered.map((event, i) => {
          // Track score for goal events
          if (['goal', 'penalty_scored', 'free_kick_goal'].includes(event.type)) {
            if (event.teamId === homeTeamId) runningHome++;
            else runningAway++;
          }

          const size = getEventSize(event.type);
          const isLatest = i === filtered.length - 1;

          switch (size) {
            case 'hero':
              return <HeroEventCard key={`${event.minute}-${event.type}-${i}`} event={event} homeTeamId={homeTeamId} homeScore={runningHome} awayScore={runningAway} onShowDevLog={onShowDevLog} isLatest={isLatest} />;
            case 'large':
              return <LargeEventCard key={`${event.minute}-${event.type}-${i}`} event={event} homeTeamId={homeTeamId} onShowDevLog={onShowDevLog} />;
            case 'medium':
              return <MediumEventCard key={`${event.minute}-${event.type}-${i}`} event={event} homeTeamId={homeTeamId} onShowDevLog={onShowDevLog} />;
            case 'separator':
              return <SeparatorCard key={`${event.minute}-${event.type}-${i}`} event={event} />;
            case 'commentary':
              return <CommentaryCard key={`${event.minute}-${event.type}-${i}`} event={event} />;
            default:
              return <SmallEventCard key={`${event.minute}-${event.type}-${i}`} event={event} homeTeamId={homeTeamId} />;
          }
        })}

        {/* Status indicators */}
        {isPlaying && !isFinished && (
          <div className="flex gap-3 py-2">
            <div className="flex flex-col items-center shrink-0 w-12">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground animate-pulse">Spiel läuft... ({currentMinute}&apos;)</p>
          </div>
        )}
        {!isPlaying && !isFinished && currentMinute > 0 && (
          <div className="flex gap-3 py-2">
            <div className="flex flex-col items-center shrink-0 w-12">
              <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            </div>
            <p className="text-xs text-amber-400/80">⏸ Pausiert — {currentMinute}&apos;</p>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
