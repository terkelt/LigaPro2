"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResults, useTeams, useAllPlayers, useCurrentTeamId, useSchedules, useTactics, calcOverall, useSponsors, useTables, useLeagues } from "@/store/selectors";
import { useGameStore } from "@/store/game-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Pause, Play, FastForward, SkipForward, ArrowRightLeft, Zap, Shield, Crosshair, Wind, Footprints, Target, X, Trophy, Star, TrendingUp, Award, BarChart3, Eye, EyeOff, Volume2, VolumeX } from "lucide-react";
import { TeamLogo } from "@/components/ui/team-logo";
import { MatchEvent, MatchResult } from "@/types/match";
import { Player } from "@/types/player";
import { createLiveMatch, advanceLiveMatch, finalizeLiveMatch, performPlayerSubstitution, LiveMatchContext, applyShout, applyHalftimeTalk, SHOUT_CATALOG, HALFTIME_TALKS, ShoutType, HalftimeTalkType } from "@/lib/match-engine";
import MatchTickerView from "@/components/match/MatchTickerView";
import { Match2DCanvas } from "@/components/match/Match2DCanvas";
import { PostMatchAnalysis } from "@/components/match/PostMatchAnalysis";
import { generateMatchAnalysis } from "@/lib/match-analysis";
import { soundManager } from "@/lib/sound-manager";

// ── Constants ──

const EVENT_ICON: Record<string, string> = {
  goal: "⚽", assist: "🅰️", shot_saved: "🧤", shot_missed: "💨", shot_blocked: "🛡️", shot_post: "🥅",
  foul: "⚠️", yellow_card: "🟨", red_card: "🟥", second_yellow: "🟨🟥", substitution: "🔄",
  injury: "🏥", penalty_scored: "⚽🎯", penalty_missed: "❌🎯", penalty_saved: "🧤🎯",
  free_kick_goal: "⚽💫", corner: "📐", offside: "🚩", kick_off: "▶️",
  half_time: "⏸️", full_time: "🏁", extra_time_start: "⏱️", extra_time_end: "🏁", penalty_shootout: "🎯",
  tactical: "📣", decision: "🎮",
};

const EVENT_IMPORTANCE: Record<string, number> = {
  goal: 3, penalty_scored: 3, free_kick_goal: 3, penalty_missed: 3, penalty_saved: 3,
  red_card: 3, second_yellow: 3,
  shot_saved: 2, shot_post: 2, yellow_card: 2, substitution: 2,
  shot_missed: 1, foul: 1, corner: 1, offside: 1,
  kick_off: 2, half_time: 3, full_time: 3, decision: 2,
  assist: 0,
};

const SPEED_MS = { slow: 1200, normal: 500, fast: 150, instant: 0 };
type SimSpeed = keyof typeof SPEED_MS;

// ── Commentary buildup for goal presentation ──
const GOAL_BUILDUP = [
  (name: string, team: string) => `${name} bekommt den Ball am Strafraum...`,
  (name: string, team: string) => `${team} mit einem schnellen Angriff über die Seite...`,
  (name: string, team: string) => `Steilpass! ${name} ist durch...`,
  (name: string, team: string) => `Querpass in die Mitte... ${name} steht bereit!`,
  (name: string, team: string) => `${team} mit Druck nach vorne, ${name} zieht ab...`,
  (name: string, team: string) => `Schöne Kombination von ${team}! ${name} nimmt Maß...`,
];
const GOAL_REVEAL = [
  (name: string) => `UND DER BALL IST DRIN!!! ${name} trifft!`,
  (name: string) => `TOOOR! ${name} lässt dem Torwart keine Chance!`,
  (name: string) => `JAAA! ${name} mit einem wunderschönen Treffer!`,
  (name: string) => `DAS NETZ WACKELT! ${name} trifft eiskalt!`,
];
const SHOT_MISS_REVEAL = [
  (name: string) => `Knapp daneben! ${name} verfehlt das Tor nur um Zentimeter.`,
  (name: string) => `Der Schuss geht drüber! ${name} ärgert sich.`,
  (name: string) => `Vorbei! ${name} hätte besser zielen müssen.`,
];
const SHOT_SAVED_REVEAL = [
  (name: string) => `GEHALTEN! Großartige Parade des Torwarts gegen ${name}!`,
  (name: string) => `Der Keeper pariert! ${name} kann es nicht fassen.`,
];
const PENALTY_BUILDUP = [
  (_name: string, team: string) => `Elfmeter für ${team}!`,
  (name: string, _team: string) => `${name} legt sich den Ball zurecht...`,
  (_name: string, _team: string) => `Die Zuschauer halten den Atem an...`,
];
const CARD_BUILDUP = [
  (name: string, _team: string) => `Harte Attacke von ${name}!`,
  (_name: string, _team: string) => `Der Schiedsrichter greift zur Tasche...`,
];
function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// Auto-pause events
const AUTO_PAUSE_EVENTS = new Set(['goal', 'penalty_scored', 'free_kick_goal', 'red_card', 'second_yellow', 'half_time', 'penalty_missed', 'penalty_saved']);


// ── Interactive Decision Types ──
interface MatchDecision {
  minute: number;
  situation: string;
  playerName: string;
  options: { id: string; label: string; icon: React.ReactNode; description: string; successChance: number }[];
}

// ── Small Components ──

function RatingBadge({ rating }: { rating: number }) {
  const c = rating >= 8 ? "bg-green-500/20 text-green-400" : rating >= 7 ? "bg-emerald-500/20 text-emerald-400" : rating >= 6 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400";
  return <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${c}`}>{rating.toFixed(1)}</span>;
}

function StatBar({ label, home, away, suffix = "" }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium w-10 text-right">{home}{suffix}</span>
        <span className="text-muted-foreground flex-1 text-center">{label}</span>
        <span className="font-medium w-10">{away}{suffix}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
        <div className="bg-primary/70 rounded-l-full transition-all duration-500" style={{ width: `${(home / total) * 100}%` }} />
        <div className="bg-accent/70 rounded-r-full flex-1" />
      </div>
    </div>
  );
}

// ── Progress Bar ──
function MatchProgressBar({ minute, isHalfTime }: { minute: number; isHalfTime: boolean }) {
  const pct = Math.min(100, (minute / 90) * 100);
  return (
    <div className="relative w-full h-1 bg-secondary/50 rounded-full overflow-hidden">
      <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
      {isHalfTime && <div className="absolute inset-y-0 left-1/2 w-1 bg-amber-500 -translate-x-1/2 rounded-full" />}
    </div>
  );
}

// ── Decision Overlay ──
function DecisionOverlay({ decision, onChoose, showChances }: { decision: MatchDecision; onChoose: (id: string) => void; showChances: boolean }) {
  return (
    <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
      <div className="bg-card border border-primary/40 rounded-xl p-5 max-w-lg w-full mx-4 shadow-2xl">
        <div className="text-center mb-4">
          <p className="text-xs text-primary font-bold uppercase tracking-wider">Entscheidung gefragt!</p>
          <p className="text-sm text-muted-foreground mt-1">{decision.minute}&apos; — {decision.situation}</p>
          <p className="text-base font-bold mt-1">{decision.playerName} hat den Ball...</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {decision.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onChoose(opt.id)}
              className="group relative p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary">{opt.icon}</span>
                <span className="text-sm font-bold">{opt.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{opt.description}</p>
              {showChances && (
                <div className="mt-2 flex items-center gap-1">
                  <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${opt.successChance > 60 ? 'bg-green-500' : opt.successChance > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${opt.successChance}%` }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{opt.successChance}%</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Post-Match Summary Screen ──
function PostMatchScreen({ result, homeTeam, awayTeam, currentTeamId, findPlayer, onContinue,
  otherResults, leagueTable, allTeams,
}: {
  result: MatchResult;
  homeTeam: { id: string; name: string; shortName: string; colors: { primary: string; secondary: string } } | undefined;
  awayTeam: { id: string; name: string; shortName: string; colors: { primary: string; secondary: string } } | undefined;
  currentTeamId: string;
  findPlayer: (id?: string) => Player | null;
  onContinue: () => void;
  otherResults: MatchResult[];
  leagueTable: { position: number; teamId: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form: string[] }[];
  allTeams: { id: string; name: string; shortName: string; colors: { primary: string; secondary: string } }[];
}) {
  const [tab, setTab] = useState<'overview' | 'ratings' | 'analysis' | 'matchday' | 'table'>('overview');
  const isHome = currentTeamId === result.homeTeamId;
  const myScore = isHome ? result.homeScore : result.awayScore;
  const oppScore = isHome ? result.awayScore : result.homeScore;
  const won = myScore > oppScore;
  const lost = myScore < oppScore;

  const resultText = won ? 'SIEG!' : lost ? 'NIEDERLAGE' : 'UNENTSCHIEDEN';
  const resultColor = won ? 'text-green-400' : lost ? 'text-red-400' : 'text-amber-400';
  const resultBg = won ? 'from-green-500/10' : lost ? 'from-red-500/10' : 'from-amber-500/10';

  const motm = result.manOfTheMatch ? findPlayer(result.manOfTheMatch) : null;
  const allRatings = result.homeRatings.concat(result.awayRatings);
  const motmRating = allRatings.find(r => r.playerId === result.manOfTheMatch);

  const getTeamShort = (id: string) => allTeams.find(t => t.id === id)?.shortName ?? '?';

  // Goal events for display
  const goalEvts = result.events.filter(e => ['goal', 'penalty_scored', 'free_kick_goal'].includes(e.type));
  const homeGoalEvts = goalEvts.filter(e => e.teamId === result.homeTeamId);
  const awayGoalEvts = goalEvts.filter(e => e.teamId === result.awayTeamId);

  const allPlayers = useAllPlayers();
  const analysis = useMemo(() => generateMatchAnalysis(result, currentTeamId, allPlayers), [result, currentTeamId, allPlayers]);

  const TABS = [
    { key: 'overview' as const, label: 'Übersicht' },
    { key: 'ratings' as const, label: 'Bewertungen' },
    { key: 'analysis' as const, label: 'Analyse' },
    { key: 'matchday' as const, label: 'Spieltag' },
    { key: 'table' as const, label: 'Tabelle' },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-card animate-in fade-in duration-500">
      {/* Hero */}
      <div className={`text-center py-5 bg-gradient-to-b ${resultBg} to-transparent shrink-0`}>
        <p className={`text-3xl font-display font-black ${resultColor} mb-2`}>{resultText}</p>
        <div className="flex items-center justify-center gap-6">
          <div className="text-right">
            <TeamLogo teamId={homeTeam?.id ?? ''} teamName={homeTeam?.name ?? ''} shortName={homeTeam?.shortName} colors={homeTeam?.colors} size={40} />
            <p className="text-xs font-bold mt-1">{homeTeam?.shortName}</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-display font-black">{result.homeScore} : {result.awayScore}</p>
            {result.isPenaltyShootout && <p className="text-[10px] text-muted-foreground">({result.penaltyHome}:{result.penaltyAway} i.E.)</p>}
          </div>
          <div className="text-left">
            <TeamLogo teamId={awayTeam?.id ?? ''} teamName={awayTeam?.name ?? ''} shortName={awayTeam?.shortName} colors={awayTeam?.colors} size={40} />
            <p className="text-xs font-bold mt-1">{awayTeam?.shortName}</p>
          </div>
        </div>
        {/* Goal scorers under score */}
        <div className="flex justify-center gap-12 mt-2 text-[10px] text-muted-foreground max-w-md mx-auto">
          <div className="text-right flex-1">{homeGoalEvts.map(g => `${findPlayer(g.playerId)?.lastName ?? '?'} ${g.minute}'`).join(', ')}</div>
          <div className="text-left flex-1">{awayGoalEvts.map(g => `${findPlayer(g.playerId)?.lastName ?? '?'} ${g.minute}'`).join(', ')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 px-4 pt-2 pb-1 border-b border-border/50">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-1.5 rounded-t font-medium transition-colors ${tab === t.key ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === 'overview' && (
          <div className="max-w-2xl mx-auto space-y-3 pt-3">
            {/* MOTM */}
            {motm && motmRating && (
              <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                <Award className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Spieler des Spiels</p>
                <p className="text-base font-bold mt-1">{motm.firstName} {motm.lastName}</p>
                <div className="flex items-center justify-center gap-3 mt-1 text-sm">
                  <RatingBadge rating={motmRating.rating} />
                  {motmRating.goals > 0 && <span>⚽ {motmRating.goals}</span>}
                  {motmRating.assists > 0 && <span>🅰️ {motmRating.assists}</span>}
                </div>
              </div>
            )}
            {/* Stats */}
            <div className="bg-card/50 border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Statistiken</p>
              <div className="space-y-2">
                <StatBar label="Ballbesitz" home={result.homeStats.possession} away={result.awayStats.possession} suffix="%" />
                <StatBar label="Torschüsse" home={result.homeStats.shots} away={result.awayStats.shots} />
                <StatBar label="Aufs Tor" home={result.homeStats.shotsOnTarget} away={result.awayStats.shotsOnTarget} />
                <StatBar label="Ecken" home={result.homeStats.corners} away={result.awayStats.corners} />
                <StatBar label="Fouls" home={result.homeStats.fouls} away={result.awayStats.fouls} />
                <StatBar label="Abseits" home={result.homeStats.offsides} away={result.awayStats.offsides} />
                <StatBar label="Gelbe Karten" home={result.homeStats.yellowCards} away={result.awayStats.yellowCards} />
                <StatBar label="Rote Karten" home={result.homeStats.redCards} away={result.awayStats.redCards} />
                <StatBar label="Passquote" home={result.homeStats.passAccuracy} away={result.awayStats.passAccuracy} suffix="%" />
              </div>
            </div>
          </div>
        )}

        {tab === 'ratings' && (
          <div className="max-w-3xl mx-auto pt-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Home Ratings */}
              <div className="bg-card/50 border border-border rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">{homeTeam?.shortName ?? 'Heim'}</p>
                <div className="space-y-0.5">
                  {[...result.homeRatings].sort((a, b) => b.rating - a.rating).map(r => {
                    const p = findPlayer(r.playerId);
                    return (
                      <div key={r.playerId} className="flex items-center gap-1.5 py-0.5">
                        <RatingBadge rating={r.rating} />
                        <span className="text-[10px] font-mono text-muted-foreground w-6">{p?.position}</span>
                        <span className="text-xs flex-1 truncate">{p?.lastName ?? '?'}</span>
                        <span className="text-[9px] text-muted-foreground">{r.minutesPlayed}&apos;</span>
                        {r.goals > 0 && <span className="text-[10px]">⚽{r.goals}</span>}
                        {r.assists > 0 && <span className="text-[10px]">🅰️{r.assists}</span>}
                        {r.yellowCard && <span className="text-[10px]">🟨</span>}
                        {r.redCard && <span className="text-[10px]">🟥</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Away Ratings */}
              <div className="bg-card/50 border border-border rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">{awayTeam?.shortName ?? 'Gast'}</p>
                <div className="space-y-0.5">
                  {[...result.awayRatings].sort((a, b) => b.rating - a.rating).map(r => {
                    const p = findPlayer(r.playerId);
                    return (
                      <div key={r.playerId} className="flex items-center gap-1.5 py-0.5">
                        <RatingBadge rating={r.rating} />
                        <span className="text-[10px] font-mono text-muted-foreground w-6">{p?.position}</span>
                        <span className="text-xs flex-1 truncate">{p?.lastName ?? '?'}</span>
                        <span className="text-[9px] text-muted-foreground">{r.minutesPlayed}&apos;</span>
                        {r.goals > 0 && <span className="text-[10px]">⚽{r.goals}</span>}
                        {r.assists > 0 && <span className="text-[10px]">🅰️{r.assists}</span>}
                        {r.yellowCard && <span className="text-[10px]">🟨</span>}
                        {r.redCard && <span className="text-[10px]">🟥</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'analysis' && (
          <div className="max-w-lg mx-auto pt-3">
            <PostMatchAnalysis
              analysis={analysis}
              homeTeamName={homeTeam?.shortName ?? 'Heim'}
              awayTeamName={awayTeam?.shortName ?? 'Auswärts'}
            />
          </div>
        )}

        {tab === 'matchday' && (
          <div className="max-w-lg mx-auto pt-3 space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Ergebnisse — {result.matchday}. Spieltag</p>
            {otherResults.length === 0 && <p className="text-xs text-muted-foreground">Keine weiteren Ergebnisse verfügbar.</p>}
            {otherResults.map(r => {
              const isMine = r.homeTeamId === currentTeamId || r.awayTeamId === currentTeamId;
              return (
                <div key={r.id} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs ${isMine ? 'bg-primary/10 border border-primary/30' : 'bg-card/50 border border-border/50'}`}>
                  <TeamLogo teamId={r.homeTeamId} teamName={getTeamShort(r.homeTeamId)} size={20} />
                  <span className="flex-1 text-right truncate font-medium">{getTeamShort(r.homeTeamId)}</span>
                  <span className="font-display font-bold min-w-[40px] text-center">{r.homeScore} : {r.awayScore}</span>
                  <span className="flex-1 truncate font-medium">{getTeamShort(r.awayTeamId)}</span>
                  <TeamLogo teamId={r.awayTeamId} teamName={getTeamShort(r.awayTeamId)} size={20} />
                </div>
              );
            })}
          </div>
        )}

        {tab === 'table' && (
          <div className="max-w-lg mx-auto pt-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Aktuelle Tabelle</p>
            {leagueTable.length === 0 && <p className="text-xs text-muted-foreground">Keine Tabelle verfügbar.</p>}
            {leagueTable.length > 0 && (
              <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                      <th className="py-1.5 px-2 text-center w-8">#</th>
                      <th className="py-1.5 px-2 text-left">Verein</th>
                      <th className="py-1.5 px-1 text-center w-7">Sp</th>
                      <th className="py-1.5 px-1 text-center w-7">S</th>
                      <th className="py-1.5 px-1 text-center w-7">U</th>
                      <th className="py-1.5 px-1 text-center w-7">N</th>
                      <th className="py-1.5 px-1 text-center w-12">Tore</th>
                      <th className="py-1.5 px-1 text-center w-8">Diff</th>
                      <th className="py-1.5 px-2 text-center w-10 font-bold">Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueTable.map((row, i) => {
                      const isMine = row.teamId === currentTeamId;
                      const isRelZone = i >= leagueTable.length - 2;
                      const isChampion = i === 0;
                      return (
                        <tr key={row.teamId} className={`border-b border-border/30 ${isMine ? 'bg-primary/10 font-bold' : ''} ${isRelZone ? 'bg-red-500/5' : ''} ${isChampion ? 'bg-green-500/5' : ''}`}>
                          <td className="py-1 px-2 text-center text-muted-foreground">{row.position}</td>
                          <td className="py-1 px-2 flex items-center gap-1.5">
                            <TeamLogo teamId={row.teamId} teamName={getTeamShort(row.teamId)} size={16} />
                            <span className="truncate">{getTeamShort(row.teamId)}</span>
                          </td>
                          <td className="py-1 px-1 text-center text-muted-foreground">{row.played}</td>
                          <td className="py-1 px-1 text-center">{row.won}</td>
                          <td className="py-1 px-1 text-center">{row.drawn}</td>
                          <td className="py-1 px-1 text-center">{row.lost}</td>
                          <td className="py-1 px-1 text-center text-muted-foreground">{row.goalsFor}:{row.goalsAgainst}</td>
                          <td className="py-1 px-1 text-center">{row.goalDifference > 0 ? '+' : ''}{row.goalDifference}</td>
                          <td className="py-1 px-2 text-center font-bold">{row.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-6 py-3 flex items-center justify-center gap-4">
        <Button variant="outline" size="lg" onClick={() => onContinue()} className="gap-2">
          <TrendingUp className="w-4 h-4" /> Weiter zum Dashboard
        </Button>
      </div>
    </div>
  );
}

// ── Dev Log Panel ──
function DevLogPanel({ log, onClose }: { log: string[]; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-4 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-primary">🔍 Developer-Ansicht — Match-Engine Details</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">{log.join('\n')}</pre>
      </div>
    </div>
  );
}

// ── Generate interactive decision from match context ──
type DecisionType = 'attack' | 'penalty' | 'freekick' | 'corner' | 'counter' | 'defensive';

function generateDecision(ctx: LiveMatchContext, currentTeamId: string, forceType?: DecisionType): MatchDecision | null {
  const isHome = ctx.homeTeam.id === currentTeamId;
  const myPlayers = isHome ? ctx.homePlayers : ctx.awayPlayers;
  const attackers = myPlayers.filter(p => ['ST', 'LA', 'RA', 'ZOM'].includes(p.position));
  const midfielders = myPlayers.filter(p => ['ZM', 'ZDM', 'ZOM'].includes(p.position));
  const defenders = myPlayers.filter(p => ['IV', 'LV', 'RV', 'ZDM'].includes(p.position));
  const gk = myPlayers.find(p => p.position === 'TW');

  const pickAtk = () => attackers.length > 0 ? attackers[Math.floor(Math.random() * attackers.length)] : midfielders[0];
  const pickMid = () => midfielders.length > 0 ? midfielders[Math.floor(Math.random() * midfielders.length)] : pickAtk();
  const pickDef = () => defenders.length > 0 ? defenders[Math.floor(Math.random() * defenders.length)] : pickMid();
  const pName = (p: { firstName?: string; lastName: string }) => `${p.firstName?.charAt(0) ?? ''}. ${p.lastName}`;

  const type = forceType ?? (['attack', 'counter', 'freekick', 'corner', 'defensive'] as const)[Math.floor(Math.random() * 5)];

  switch (type) {
    case 'penalty': {
      const shooter = pickAtk();
      if (!shooter) return null;
      const sh = shooter.attributes.shooting ?? 50;
      const comp = shooter.attributes.composure ?? 50;
      return {
        minute: ctx.currentMinute,
        situation: 'ELFMETER! Wohin soll geschossen werden?',
        playerName: pName(shooter),
        options: [
          { id: 'pen_left', label: 'Links unten', icon: <Crosshair className="w-4 h-4" />, description: 'Flach in die linke Ecke', successChance: Math.min(80, Math.round(sh * 0.5 + comp * 0.3 + 15)) },
          { id: 'pen_middle', label: 'Mitte', icon: <Target className="w-4 h-4" />, description: 'Riskant — aber wenn der Torwart sich bewegt...', successChance: Math.min(70, Math.round(comp * 0.6 + 25)) },
          { id: 'pen_right', label: 'Rechts oben', icon: <Crosshair className="w-4 h-4" />, description: 'Hart in die rechte obere Ecke', successChance: Math.min(75, Math.round(sh * 0.6 + comp * 0.2 + 10)) },
          { id: 'pen_chip', label: 'Lupfer', icon: <Wind className="w-4 h-4" />, description: 'Panenka! Frech in die Mitte chippen', successChance: Math.min(55, Math.round(comp * 0.7 + 5)) },
        ],
      };
    }
    case 'freekick': {
      const taker = pickMid();
      if (!taker) return null;
      const sh = taker.attributes.shooting ?? 50;
      const pass = taker.attributes.passing ?? 50;
      const cross = taker.attributes.crossing ?? 50;
      return {
        minute: ctx.currentMinute,
        situation: 'Freistoß in guter Position! Was soll passieren?',
        playerName: pName(taker),
        options: [
          { id: 'fk_direct', label: 'Direkt schießen', icon: <Crosshair className="w-4 h-4" />, description: 'Über die Mauer ins Tor', successChance: Math.min(45, Math.round(sh * 0.5 + 5)) },
          { id: 'fk_cross', label: 'Flanke', icon: <Wind className="w-4 h-4" />, description: 'Hoher Ball in den Strafraum', successChance: Math.min(70, Math.round(cross * 0.6 + 15)) },
          { id: 'fk_short', label: 'Kurz spielen', icon: <Target className="w-4 h-4" />, description: 'Kurz ablegen und dann angreifen', successChance: Math.min(80, Math.round(pass * 0.7 + 15)) },
        ],
      };
    }
    case 'corner': {
      const taker = pickMid();
      if (!taker) return null;
      const cross = taker.attributes.crossing ?? 50;
      const pass = taker.attributes.passing ?? 50;
      return {
        minute: ctx.currentMinute,
        situation: 'Eckstoß! Welche Variante?',
        playerName: pName(taker),
        options: [
          { id: 'cor_near', label: 'Erster Pfosten', icon: <Target className="w-4 h-4" />, description: 'Scharf an den kurzen Pfosten', successChance: Math.min(65, Math.round(cross * 0.6 + 10)) },
          { id: 'cor_far', label: 'Zweiter Pfosten', icon: <Wind className="w-4 h-4" />, description: 'Hoch an den langen Pfosten', successChance: Math.min(60, Math.round(cross * 0.55 + 12)) },
          { id: 'cor_short', label: 'Kurze Ecke', icon: <Footprints className="w-4 h-4" />, description: 'Kurz spielen und dann flanken', successChance: Math.min(75, Math.round(pass * 0.65 + 15)) },
          { id: 'cor_direct', label: 'Direkt aufs Tor', icon: <Crosshair className="w-4 h-4" />, description: 'Olympisches Tor versuchen!', successChance: Math.min(15, Math.round(cross * 0.15 + 2)) },
        ],
      };
    }
    case 'counter': {
      const runner = pickAtk();
      if (!runner) return null;
      const pace = runner.attributes.pace ?? 50;
      const pass = runner.attributes.passing ?? 50;
      const drib = runner.attributes.dribbling ?? 50;
      return {
        minute: ctx.currentMinute,
        situation: 'Konterchance! Schnell umschalten!',
        playerName: pName(runner),
        options: [
          { id: 'cnt_sprint', label: 'Durchstarten!', icon: <Zap className="w-4 h-4" />, description: 'Mit Tempo alleine aufs Tor', successChance: Math.min(70, Math.round(pace * 0.6 + drib * 0.2 + 5)) },
          { id: 'cnt_pass', label: 'Mitspieler mitnehmen', icon: <Target className="w-4 h-4" />, description: 'Überzahl herstellen', successChance: Math.min(80, Math.round(pass * 0.7 + 12)) },
          { id: 'cnt_safe', label: 'Absichern', icon: <Shield className="w-4 h-4" />, description: 'Ball halten, kein Risiko', successChance: 90 },
        ],
      };
    }
    case 'defensive': {
      const def = pickDef();
      if (!def) return null;
      const pos = def.attributes.positioning ?? 50;
      const aggr = def.attributes.aggression ?? 50;
      const str = def.attributes.strength ?? 50;
      return {
        minute: ctx.currentMinute,
        situation: 'Gegner greift an! Wie reagieren?',
        playerName: pName(def),
        options: [
          { id: 'def_press', label: 'Pressing!', icon: <Zap className="w-4 h-4" />, description: 'Aggressiv draufgehen', successChance: Math.min(65, Math.round(aggr * 0.5 + str * 0.2 + 8)) },
          { id: 'def_hold', label: 'Stellung halten', icon: <Shield className="w-4 h-4" />, description: 'Kompakt stehen bleiben', successChance: Math.min(80, Math.round(pos * 0.6 + 20)) },
          { id: 'def_foul', label: 'Taktisches Foul', icon: <Target className="w-4 h-4" />, description: 'Konter unterbinden — Gelb riskieren!', successChance: 85 },
        ],
      };
    }
    default: {
      // Standard attack decision
      const player = pickAtk();
      if (!player) return null;
      const shooting = player.attributes.shooting ?? 50;
      const passing = player.attributes.passing ?? 50;
      const dribbling = player.attributes.dribbling ?? 50;
      const crossing = player.attributes.crossing ?? 50;
      return {
        minute: ctx.currentMinute,
        situation: 'Dein Team hat einen vielversprechenden Angriff!',
        playerName: pName(player),
        options: [
          { id: 'shoot', label: 'Schuss!', icon: <Crosshair className="w-4 h-4" />, description: 'Direkt aufs Tor schießen', successChance: Math.min(85, Math.round(shooting * 0.8 + 10)) },
          { id: 'pass', label: 'Steilpass', icon: <Target className="w-4 h-4" />, description: 'Einen Mitspieler anspielen', successChance: Math.min(90, Math.round(passing * 0.85 + 8)) },
          { id: 'cross', label: 'Flanke', icon: <Wind className="w-4 h-4" />, description: 'Flanke in den Strafraum', successChance: Math.min(80, Math.round(crossing * 0.75 + 12)) },
          { id: 'dribble', label: 'Dribbeln', icon: <Footprints className="w-4 h-4" />, description: 'Am Gegner vorbeiziehen', successChance: Math.min(75, Math.round(dribbling * 0.7 + 8)) },
        ],
      };
    }
  }
}

// ── Main Page ──

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const results = useResults();
  const teams = useTeams();
  const allPlayers = useAllPlayers();
  const currentTeamId = useCurrentTeamId();
  const schedules = useSchedules();
  const { tactics, activeTactic } = useTactics();
  const gameState = useGameStore((s) => s.gameState);
  const advanceOneDay = useGameStore((s) => s.advanceOneDay);
  const sponsors = useSponsors();
  const tables = useTables();
  const leagues = useLeagues();
  const matchId = params.id as string;

  const mainSponsor = useMemo(() => {
    const active = (sponsors as import("@/types/finance").Sponsor[]).filter(s => s.isActive);
    return active.find(s => s.type === 'trikot') ?? active[0] ?? null;
  }, [sponsors]);

  const existingResult = useMemo(() => results.find((r) => r.id === matchId) ?? null, [results, matchId]);

  const unplayedMatch = useMemo(() => {
    if (existingResult) return null;
    // League matches
    for (const sched of schedules) {
      for (const m of sched.matches) {
        if (m.id === matchId && !m.isPlayed) return m;
      }
    }
    // Cup matches
    if (gameState?.cupState && !gameState.cupState.isFinished) {
      const cupRound = gameState.cupState.rounds[gameState.cupState.currentRound];
      if (cupRound) {
        for (const m of cupRound.matches) {
          if (m.id === matchId && !m.isPlayed) return m;
        }
      }
    }
    // International matches
    if (gameState?.internationalState && !gameState.internationalState.isFinished) {
      const intl = gameState.internationalState;
      const intlMatches = [...(intl.leaguePhase?.matches ?? []), ...(intl.knockoutMatches ?? [])];
      for (const m of intlMatches) {
        if ((m as any).id === matchId && !m.isPlayed) return m as import('@/types/match').Match;
      }
    }
    return null;
  }, [schedules, matchId, existingResult, gameState]);

  // ── LIVE MATCH STATE ──
  const [liveCtx, setLiveCtx] = useState<LiveMatchContext | null>(null);
  const [displayEvents, setDisplayEvents] = useState<MatchEvent[]>([]);
  const [speed, setSpeed] = useState<SimSpeed>("normal");
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveResult, setLiveResult] = useState<MatchResult | null>(null);
  const [showSubPanel, setShowSubPanel] = useState(false);
  const [subOut, setSubOut] = useState<string | null>(null);
  const [activeDecision, setActiveDecision] = useState<MatchDecision | null>(null);
  const [showCoaching, setShowCoaching] = useState(true);
  const [autoPause, setAutoPause] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [devLog, setDevLog] = useState<string[] | null>(null);
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [eventSplash, setEventSplash] = useState<{ event: MatchEvent; player?: Player | null; commentaryLines: string[]; revealLine: string; phase: number; preScore?: { home: number; away: number } } | null>(null);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decisionCooldownRef = useRef(0);
  const pendingSplashSoundRef = useRef<{ eventType: string; isMyTeam: boolean } | null>(null);

  // T20: Stop ambient sound when leaving the match page (component unmount)
  useEffect(() => {
    return () => { soundManager.stopAmbient(); };
  }, []);

  // Initialize live match context
  useEffect(() => {
    if (!unplayedMatch || liveCtx) return;
    const homeTeam = teams.find(t => t.id === unplayedMatch.homeTeamId);
    const awayTeam = teams.find(t => t.id === unplayedMatch.awayTeamId);
    if (!homeTeam || !awayTeam) return;

    const isPlayerHome = unplayedMatch.homeTeamId === currentTeamId;
    const isPlayerAway = unplayedMatch.awayTeamId === currentTeamId;
    const activeTac = tactics ? tactics[activeTactic as 'a' | 'b' | 'c'] : null;
    const lineup = activeTac?.lineup ?? [];

    const gs = gameState;
    const homeSkills = unplayedMatch.homeTeamId === currentTeamId
      ? gs?.manager.skills
      : gs?.aiManagers?.[unplayedMatch.homeTeamId]?.skills;
    const awaySkills = unplayedMatch.awayTeamId === currentTeamId
      ? gs?.manager.skills
      : gs?.aiManagers?.[unplayedMatch.awayTeamId]?.skills;

    const playerFormation = activeTac?.formation;
    const ctx = createLiveMatch(
      unplayedMatch, homeTeam, awayTeam, allPlayers, currentTeamId,
      isPlayerHome ? lineup : undefined,
      isPlayerAway ? lineup : undefined,
      homeSkills, awaySkills,
      isPlayerHome ? playerFormation : undefined,
      isPlayerAway ? playerFormation : undefined,
      isPlayerHome ? (activeTac ?? undefined) : undefined,
      isPlayerAway ? (activeTac ?? undefined) : undefined,
    );
    setLiveCtx(ctx);
    setDisplayEvents([...ctx.events]);
    // D11: Auto-start with instant speed for amateur team matches
    if (searchParams.get('speed') === 'instant') {
      setSpeed('instant');
      setShowSplash(false);
      setIsPlaying(true);
    }
  }, [unplayedMatch, teams, allPlayers, currentTeamId, tactics, liveCtx, searchParams]);


  // Timer tick for live simulation
  const tick = useCallback(() => {
    if (!liveCtx || liveCtx.isFinished) {
      setIsPlaying(false);
      return;
    }
    const newEvents = advanceLiveMatch(liveCtx);
    const filtered = newEvents.filter(e => e.type !== 'assist');
    setDisplayEvents(prev => [...prev, ...filtered]);
    setLiveCtx({ ...liveCtx });

    // E11: Play sounds for match events — but DEFER sounds for splash-eligible events
    // to avoid spoiling the outcome before the commentary buildup finishes
    const SPLASH_EVENT_TYPES = new Set(['goal', 'penalty_scored', 'free_kick_goal', 'red_card', 'second_yellow', 'penalty_missed', 'penalty_saved', 'shot_saved', 'shot_missed', 'shot_post']);
    for (const evt of filtered) {
      const isMyEvt = evt.teamId === currentTeamId;
      if (SPLASH_EVENT_TYPES.has(evt.type) && speed !== 'instant') {
        // Don't play yet — store for reveal phase
        pendingSplashSoundRef.current = { eventType: evt.type, isMyTeam: isMyEvt };
      } else {
        soundManager.playMatchEvent(evt.type, isMyEvt);
      }
    }

    // Auto-pause on important events (respects toggle)
    const hasImportant = filtered.some(e => AUTO_PAUSE_EVENTS.has(e.type));
    if (hasImportant && speed !== 'instant' && autoPause) {
      setIsPlaying(false);
    }

    // B1: Always pause at half-time for motivational talk (except instant)
    const hasHalfTime = filtered.some(e => e.type === 'half_time');
    if (hasHalfTime && speed !== 'instant') {
      setIsPlaying(false);
    }

    // Interactive decisions: trigger on various events for the player's team
    // Check decisions FIRST — if one triggers, skip the commentary splash
    let decisionTriggered = false;
    if (!hasImportant && !liveCtx.isFinished && speed !== 'instant' && speed !== 'fast' && liveCtx.currentMinute > decisionCooldownRef.current) {
      let decisionType: DecisionType | undefined;

      // Corner for my team → corner decision
      const myCorner = filtered.find(e => e.type === 'corner' && e.teamId === currentTeamId);
      if (myCorner && Math.random() < 0.6) decisionType = 'corner';

      // Foul against opponent (my free kick) → free kick decision
      const myFreeKick = filtered.find(e => e.type === 'foul' && e.teamId !== currentTeamId);
      if (!decisionType && myFreeKick && Math.random() < 0.4) decisionType = 'freekick';

      // My shot saved/missed → attack/counter decision
      const myShot = filtered.find(e =>
        (e.type === 'shot_saved' || e.type === 'shot_missed' || e.type === 'shot_blocked' || e.type === 'shot_post') &&
        e.teamId === currentTeamId
      );
      if (!decisionType && myShot && Math.random() < 0.3) decisionType = Math.random() < 0.5 ? 'attack' : 'counter';

      // Opponent attacking (their shot) → defensive decision
      const oppShot = filtered.find(e =>
        (e.type === 'shot_saved' || e.type === 'shot_missed' || e.type === 'shot_blocked' || e.type === 'shot_post') &&
        e.teamId !== currentTeamId
      );
      if (!decisionType && oppShot && Math.random() < 0.25) decisionType = 'defensive';

      if (decisionType) {
        const decision = generateDecision(liveCtx, currentTeamId, decisionType);
        if (decision) {
          setActiveDecision(decision);
          setIsPlaying(false);
          decisionCooldownRef.current = liveCtx.currentMinute + 8;
          decisionTriggered = true;
        }
      }
    }

    // E10: Show dramatic commentary buildup for important events
    // Skip splash if a decision was triggered (player needs to interact with decision overlay)
    if (!decisionTriggered) {
      // Only show splash for goals, cards, penalties, and OPPONENT shots — not player's own shots (those become decisions)
      const splashEvent = filtered.find(e => {
        if (['goal', 'penalty_scored', 'free_kick_goal', 'red_card', 'second_yellow', 'penalty_missed', 'penalty_saved'].includes(e.type)) return true;
        // For shots that aren't goals, only show splash for opponent events
        if (['shot_saved', 'shot_missed', 'shot_post'].includes(e.type) && e.teamId !== currentTeamId) return true;
        return false;
      });
      if (splashEvent && speed !== 'instant') {
        const splashPlayer = splashEvent.playerId ? allPlayers.find(p => p.id === splashEvent.playerId) ?? null : null;
        const playerName = splashPlayer?.lastName ?? 'Spieler';
        const teamObj = splashEvent.teamId ? (teams.find(t => t.id === splashEvent.teamId)?.name ?? '') : '';
        const isGoal = ['goal', 'penalty_scored', 'free_kick_goal'].includes(splashEvent.type);
        const isPenalty = ['penalty_scored', 'penalty_missed', 'penalty_saved'].includes(splashEvent.type);
        const isCard = ['red_card', 'second_yellow'].includes(splashEvent.type);
        const isShotMiss = ['shot_missed', 'shot_post'].includes(splashEvent.type);
        const isShotSaved = splashEvent.type === 'shot_saved';

        // Generate commentary lines
        let commentaryLines: string[];
        let revealLine: string;
        if (isPenalty) {
          commentaryLines = PENALTY_BUILDUP.map(fn => fn(playerName, teamObj));
          revealLine = isGoal ? pickRandom(GOAL_REVEAL)(playerName) : splashEvent.type === 'penalty_saved' ? pickRandom(SHOT_SAVED_REVEAL)(playerName) : pickRandom(SHOT_MISS_REVEAL)(playerName);
        } else if (isCard) {
          commentaryLines = CARD_BUILDUP.map(fn => fn(playerName, teamObj));
          revealLine = splashEvent.type === 'red_card' ? `ROTE KARTE! ${playerName} muss vom Platz!` : `GELB-ROT! ${playerName} sieht die Ampelkarte!`;
        } else if (isGoal) {
          commentaryLines = [pickRandom(GOAL_BUILDUP)(playerName, teamObj)];
          revealLine = pickRandom(GOAL_REVEAL)(playerName);
        } else if (isShotSaved) {
          commentaryLines = [pickRandom(GOAL_BUILDUP)(playerName, teamObj)];
          revealLine = pickRandom(SHOT_SAVED_REVEAL)(playerName);
        } else {
          commentaryLines = [pickRandom(GOAL_BUILDUP)(playerName, teamObj)];
          revealLine = isShotMiss ? pickRandom(SHOT_MISS_REVEAL)(playerName) : `${playerName} — Chance vergeben!`;
        }

        // Capture score BEFORE this event — for goals, subtract 1 from the scoring team to show pre-goal score during buildup
        const preHome = liveCtx.homeScore - (isGoal && splashEvent.teamId === liveCtx.homeTeam.id ? 1 : 0);
        const preAway = liveCtx.awayScore - (isGoal && splashEvent.teamId === liveCtx.awayTeam.id ? 1 : 0);
        setEventSplash({ event: splashEvent, player: splashPlayer, commentaryLines, revealLine, phase: 0, preScore: { home: preHome, away: preAway } });
        setIsPlaying(false);
        if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
        if (commentaryTimerRef.current) clearTimeout(commentaryTimerRef.current);

        // Play neutral tension buildup sound (identical for goals and misses — no spoiler)
        soundManager.playTensionBuild();

        // Progressive commentary: advance phase every ~800ms, then show reveal, then auto-dismiss
        const phaseDelay = speed === 'fast' ? 400 : 800;
        const totalPhases = commentaryLines.length + 1; // +1 for reveal
        let currentPhase = 0;
        const advancePhase = () => {
          currentPhase++;
          setEventSplash(prev => prev ? { ...prev, phase: currentPhase } : null);
          if (currentPhase < totalPhases) {
            // At reveal phase: play the actual event sound now
            if (currentPhase === totalPhases - 1 && pendingSplashSoundRef.current) {
              // Small delay so reveal text appears before sound
              setTimeout(() => {
                if (pendingSplashSoundRef.current) {
                  soundManager.playMatchEvent(pendingSplashSoundRef.current.eventType, pendingSplashSoundRef.current.isMyTeam);
                  pendingSplashSoundRef.current = null;
                }
              }, 200);
            }
            commentaryTimerRef.current = setTimeout(advancePhase, currentPhase === totalPhases - 1 ? phaseDelay * 1.5 : phaseDelay);
          } else {
            // Auto-dismiss after reveal shown
            // Play sound if it wasn't played during reveal transition
            if (pendingSplashSoundRef.current) {
              soundManager.playMatchEvent(pendingSplashSoundRef.current.eventType, pendingSplashSoundRef.current.isMyTeam);
              pendingSplashSoundRef.current = null;
            }
            splashTimerRef.current = setTimeout(() => {
              setEventSplash(null);
              setIsPlaying(true);
            }, speed === 'fast' ? 1000 : 2000);
          }
        };
        commentaryTimerRef.current = setTimeout(advancePhase, phaseDelay);
      }
    }

    if (liveCtx.isFinished) {
      setIsPlaying(false);
      soundManager.stopAmbient();
      const result = finalizeLiveMatch(liveCtx);
      setLiveResult(result);
      setShowPostMatch(true);
      advanceOneDay(result);
      useGameStore.getState().autoSaveGame();
    }
  }, [liveCtx, advanceOneDay, speed, currentTeamId, autoPause]);

  useEffect(() => {
    if (!isPlaying || !liveCtx) return;
    if (speed === 'instant') {
      const batchEvents: MatchEvent[] = [];
      while (!liveCtx.isFinished) {
        const evts = advanceLiveMatch(liveCtx);
        batchEvents.push(...evts.filter(e => e.type !== 'assist'));
      }
      setDisplayEvents(prev => [...prev, ...batchEvents]);
      setLiveCtx({ ...liveCtx });
      setIsPlaying(false);
      soundManager.stopAmbient();
      const result = finalizeLiveMatch(liveCtx);
      setLiveResult(result);
      setShowPostMatch(true);
      advanceOneDay(result);
      useGameStore.getState().autoSaveGame();
      return;
    }
    timerRef.current = setTimeout(tick, SPEED_MS[speed]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, speed, tick, liveCtx, advanceOneDay]);

  // Handle substitution
  const handleSub = (playerInId: string) => {
    if (!liveCtx || !subOut) return;
    const ev = performPlayerSubstitution(liveCtx, subOut, playerInId);
    if (ev) {
      setDisplayEvents(prev => [...prev, ev]);
      setLiveCtx({ ...liveCtx });
    }
    setSubOut(null);
    setShowSubPanel(false);
  };

  // Handle interactive decision — B3: don't pause, show result in ticker
  const handleDecision = (choiceId: string) => {
    if (!activeDecision || !liveCtx) return;
    const option = activeDecision.options.find(o => o.id === choiceId);
    if (!option) return;

    const success = Math.random() * 100 < option.successChance;
    const p = activeDecision.playerName;
    const descMap: Record<string, { success: string; fail: string }> = {
      // Attack
      shoot: { success: `🎮 ${p} schießt — TOOOR! Deine Entscheidung zahlt sich aus!`, fail: `🎮 ${p} schießt — knapp vorbei!` },
      pass: { success: `🎮 ${p} spielt den perfekten Steilpass — große Chance!`, fail: `🎮 ${p} spielt den Pass — abgefangen!` },
      cross: { success: `🎮 ${p} flankt perfekt in den Strafraum — Kopfballchance!`, fail: `🎮 ${p} flankt — die Flanke findet keinen Abnehmer.` },
      dribble: { success: `🎮 ${p} dribbelt am Gegner vorbei — freie Bahn!`, fail: `🎮 ${p} versucht das Dribbling — Ball verloren!` },
      // Penalty
      pen_left: { success: `🎮 ${p} schießt links unten — TOOOR! Der Torwart hatte keine Chance!`, fail: `🎮 ${p} schießt links — gehalten! Der Torwart war zur Stelle!` },
      pen_middle: { success: `🎮 ${p} schießt in die Mitte — TOOOR! Der Torwart war schon in der Ecke!`, fail: `🎮 ${p} schießt in die Mitte — der Torwart bleibt stehen und hält!` },
      pen_right: { success: `🎮 ${p} hämmert den Ball rechts oben rein — TOOOR! Unhaltbar!`, fail: `🎮 ${p} schießt rechts oben — knapp am Pfosten vorbei!` },
      pen_chip: { success: `🎮 ${p} chippt den Ball frech in die Mitte — TOOOR! Panenka!`, fail: `🎮 ${p} versucht den Lupfer — peinlich daneben! Was für ein Fehlschuss!` },
      // Free kick
      fk_direct: { success: `🎮 ${p} zirkelt den Freistoß ins Netz — TOOOR! Traumtor!`, fail: `🎮 ${p} schießt direkt — in die Mauer!` },
      fk_cross: { success: `🎮 ${p} flankt den Freistoß perfekt — Kopfball, große Chance!`, fail: `🎮 ${p} flankt den Freistoß — zu ungenau, Abstoß.` },
      fk_short: { success: `🎮 ${p} spielt kurz ab — gute Kombination, Angriff läuft!`, fail: `🎮 ${p} spielt kurz — der Gegner hat aufgepasst.` },
      // Corner
      cor_near: { success: `🎮 ${p} bringt die Ecke scharf an den ersten Pfosten — Kopfball!`, fail: `🎮 ${p} bringt die Ecke rein — der Torwart fängt ab.` },
      cor_far: { success: `🎮 ${p} flankt an den zweiten Pfosten — Kopfballchance!`, fail: `🎮 ${p} flankt an den zweiten Pfosten — zu lang, Abstoß.` },
      cor_short: { success: `🎮 Kurze Ecke, ${p} spielt sich frei — gute Position!`, fail: `🎮 Kurze Ecke — der Gegner stellt zu, Ballverlust.` },
      cor_direct: { success: `🎮 ${p} zieht direkt aufs Tor — TOOOR! Olympisches Tor! Unglaublich!`, fail: `🎮 ${p} versucht das Olympische Tor — weit drüber!` },
      // Counter
      cnt_sprint: { success: `🎮 ${p} sprintet alleine aufs Tor — große Chance!`, fail: `🎮 ${p} sprintet los — wird noch eingeholt!` },
      cnt_pass: { success: `🎮 ${p} nimmt den Mitspieler mit — Überzahl, Torchance!`, fail: `🎮 ${p} versucht den Pass — Fehlpass, Konter verpufft.` },
      cnt_safe: { success: `🎮 ${p} sichert den Ball — kluges Spiel, Kontrolle behalten.`, fail: `🎮 ${p} will absichern — verliert den Ball trotzdem!` },
      // Defensive
      def_press: { success: `🎮 ${p} geht aggressiv drauf — Ballgewinn! Stark verteidigt!`, fail: `🎮 ${p} geht drauf — wird ausgespielt! Gefahr!` },
      def_hold: { success: `🎮 ${p} hält die Stellung — Angriff abgewehrt!`, fail: `🎮 ${p} steht gut, aber der Gegner findet eine Lücke!` },
      def_foul: { success: `🎮 ${p} stoppt den Konter mit einem taktischen Foul — Gelbe Karte, aber Gefahr gebannt!`, fail: `🎮 ${p} foult — Gelbe Karte und der Freistoß ist gefährlich nah!` },
    };

    // Determine if this choice can score a goal
    const goalChoices = new Set(['shoot', 'pen_left', 'pen_middle', 'pen_right', 'pen_chip', 'fk_direct', 'cor_direct']);
    const isGoal = success && goalChoices.has(choiceId);

    const desc = descMap[choiceId] ?? { success: '🎮 Erfolg!', fail: '🎮 Fehlgeschlagen.' };
    const decisionEvent: MatchEvent = {
      minute: activeDecision.minute,
      type: isGoal ? 'goal' : 'decision' as MatchEvent['type'],
      description: success ? desc.success : desc.fail,
      teamId: currentTeamId,
    };

    // If the decision resulted in a goal, update the score
    if (isGoal) {
      const isHome = liveCtx.homeTeam.id === currentTeamId;
      if (isHome) { liveCtx.homeScore++; liveCtx.homeStats.shots++; }
      else { liveCtx.awayScore++; liveCtx.awayStats.shots++; }
    }

    setDisplayEvents(prev => [...prev, decisionEvent]);
    setLiveCtx({ ...liveCtx });
    setActiveDecision(null);
    // B3: Resume play automatically after decision — don't pause
    if (!liveCtx.isFinished) {
      setIsPlaying(true);
    }
  };

  // ── Determine what to show ──
  const result = liveResult ?? existingResult;
  const isLive = !!liveCtx && !liveResult && !existingResult;
  const homeTeamId = liveCtx?.homeTeam.id ?? result?.homeTeamId ?? '';
  const awayTeamId = liveCtx?.awayTeam.id ?? result?.awayTeamId ?? '';
  const homeTeam = teams.find(t => t.id === homeTeamId);
  const awayTeam = teams.find(t => t.id === awayTeamId);
  const rawHomeScore = liveCtx?.homeScore ?? result?.homeScore ?? 0;
  const rawAwayScore = liveCtx?.awayScore ?? result?.awayScore ?? 0;
  // During commentary buildup, show the pre-event score to avoid spoilers
  const splashRevealed = eventSplash ? eventSplash.phase > eventSplash.commentaryLines.length : true;
  const homeScore = (eventSplash?.preScore && !splashRevealed) ? eventSplash.preScore.home : rawHomeScore;
  const awayScore = (eventSplash?.preScore && !splashRevealed) ? eventSplash.preScore.away : rawAwayScore;
  const currentMin = liveCtx?.currentMinute ?? 90;
  const weather = liveCtx?.weather ?? result?.weather;
  const isHalfTime = isLive && currentMin >= 45 && currentMin <= 50;

  const eventsToShow = result && !isLive ? result.events : displayEvents;

  const findPlayer = (id?: string) => id ? allPlayers.find(p => p.id === id) ?? null : null;

  const isPlayerHome = homeTeamId === currentTeamId;
  const activePlayers = isLive ? (isPlayerHome ? liveCtx!.homePlayers : liveCtx!.awayPlayers) : [];
  const allTeamPlayers = isLive ? (isPlayerHome ? liveCtx!.allHomePlayers : liveCtx!.allAwayPlayers) : [];
  const activeIds = new Set(activePlayers.map(p => p.id));
  const benchPlayers = allTeamPlayers.filter(p => !activeIds.has(p.id));
  const playerSubs = isPlayerHome ? (liveCtx?.homeSubs ?? 0) : (liveCtx?.awaySubs ?? 0);

  // ── Post-match data (must be before any early return to satisfy Rules of Hooks) ──
  const postMatchData = useMemo(() => {
    if (!result) return { otherResults: [] as MatchResult[], leagueTable: [] as { position: number; teamId: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form: string[] }[], allTeamsMapped: [] as { id: string; name: string; shortName: string; colors: { primary: string; secondary: string } }[] };
    const otherResults = results.filter(r =>
      r.id !== result.id &&
      r.matchday === result.matchday &&
      r.competition === result.competition &&
      r.leagueId === result.leagueId
    );
    const leagueId = result.leagueId ?? '';
    const leagueTable = (tables[leagueId] ?? []).map(e => ({ ...e, form: e.form as string[] }));
    const allTeamsMapped = teams.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, colors: t.colors }));
    return { otherResults, leagueTable, allTeamsMapped };
  }, [result, results, tables, teams]);

  if (!homeTeam && !awayTeam && !liveCtx) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Zurück</Button>
          <p className="text-muted-foreground mt-4">Spiel nicht gefunden.</p>
        </div>
      </div>
    );
  }

  // Goal scorers for display — hide the latest goal during commentary buildup to avoid spoilers
  const allGoalEvents = eventsToShow.filter(e => e.type === 'goal' || e.type === 'penalty_scored' || e.type === 'free_kick_goal');
  const goalEvents = (eventSplash && !splashRevealed && eventSplash.event)
    ? allGoalEvents.filter(e => !(e.minute === eventSplash.event.minute && e.type === eventSplash.event.type && e.teamId === eventSplash.event.teamId && e.playerId === eventSplash.event.playerId))
    : allGoalEvents;
  const homeGoals = goalEvents.filter(e => e.teamId === homeTeamId);
  const awayGoals = goalEvents.filter(e => e.teamId === awayTeamId);

  // ── Pre-match Splashscreen ──
  if (showSplash && isLive && liveCtx && !liveResult) {
    const competition = unplayedMatch?.competition ?? 'league';
    const compLabel = competition === 'cup' ? 'DFB-Pokal' : competition === 'cl' ? 'Champions League' : competition === 'el' ? 'Europa League' : competition === 'ecl' ? 'Conference League' : 'Liga';
    const matchdayLabel = unplayedMatch?.matchday ? `${unplayedMatch.matchday}. Spieltag` : '';
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-background via-card to-background items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: homeTeam?.colors.primary ?? '#333' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: awayTeam?.colors.primary ?? '#333' }} />
        </div>

        <div className="relative z-10 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Competition */}
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold">{compLabel}</p>
            {matchdayLabel && <p className="text-[10px] text-muted-foreground mt-1">{matchdayLabel}</p>}
          </div>

          {/* Teams VS */}
          <div className="flex items-center gap-8 md:gap-12">
            <div className="text-center space-y-2">
              <TeamLogo teamId={homeTeam?.id ?? ''} teamName={homeTeam?.name ?? ''} shortName={homeTeam?.shortName} colors={homeTeam?.colors} size={80} className="mx-auto" />
              <p className="text-lg font-bold">{homeTeam?.name}</p>
              <p className="text-[10px] text-muted-foreground">Stärke: <span className="font-mono font-bold text-primary">{Math.round(liveCtx.homeStrength)}</span></p>
            </div>

            <div className="text-center">
              <p className="text-4xl font-display font-black text-muted-foreground/30">VS</p>
              {weather && <p className="text-sm mt-2">{weather.type === 'sunny' ? '☀️' : weather.type === 'rain' ? '🌧️' : weather.type === 'heavy_rain' ? '⛈️' : weather.type === 'snow' ? '❄️' : weather.type === 'hot' ? '🔥' : '🥶'} {weather.description}</p>}
            </div>

            <div className="text-center space-y-2">
              <TeamLogo teamId={awayTeam?.id ?? ''} teamName={awayTeam?.name ?? ''} shortName={awayTeam?.shortName} colors={awayTeam?.colors} size={80} className="mx-auto" />
              <p className="text-lg font-bold">{awayTeam?.name}</p>
              <p className="text-[10px] text-muted-foreground">Stärke: <span className="font-mono font-bold text-accent">{Math.round(liveCtx.awayStrength)}</span></p>
            </div>
          </div>

          {/* Sponsor */}
          {mainSponsor && (
            <p className="text-[10px] text-muted-foreground/50">Präsentiert von {mainSponsor.name}</p>
          )}

          {/* Start Button */}
          <Button
            size="lg"
            className="text-base gap-2 px-8 py-3 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={() => { setShowSplash(false); setIsPlaying(true); soundManager.startAmbient(); }}
          >
            ⚽ Anpfiff! <ChevronRight className="w-5 h-5" />
          </Button>

          {/* Speed selector */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] text-muted-foreground">Geschwindigkeit:</span>
            {(['slow', 'normal', 'fast'] as SimSpeed[]).map(s => (
              <button
                key={s}
                className={`text-[10px] px-2 py-1 rounded border transition-all ${speed === s ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                onClick={() => setSpeed(s)}
              >
                {s === 'slow' ? 'Langsam' : s === 'normal' ? 'Normal' : 'Schnell'}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Post-match screen ──
  if (showPostMatch && result) {
    return (
      <PostMatchScreen
        result={result}
        homeTeam={homeTeam ? { id: homeTeam.id, name: homeTeam.name, shortName: homeTeam.shortName, colors: homeTeam.colors } : undefined}
        awayTeam={awayTeam ? { id: awayTeam.id, name: awayTeam.name, shortName: awayTeam.shortName, colors: awayTeam.colors } : undefined}
        currentTeamId={currentTeamId}
        findPlayer={findPlayer}
        onContinue={() => router.push('/game/dashboard')}
        otherResults={postMatchData.otherResults}
        leagueTable={postMatchData.leagueTable}
        allTeams={postMatchData.allTeamsMapped}
      />
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* E10: Commentary Buildup Overlay */}
      {eventSplash && (() => {
        const e = eventSplash.event;
        const { commentaryLines, revealLine, phase } = eventSplash;
        const isGoal = ['goal', 'penalty_scored', 'free_kick_goal'].includes(e.type);
        const isCard = ['red_card', 'second_yellow'].includes(e.type);
        const isMiss = ['penalty_missed', 'penalty_saved', 'shot_missed', 'shot_post', 'shot_saved'].includes(e.type);
        const isMyTeam = e.teamId === currentTeamId;
        const showReveal = phase > commentaryLines.length;
        const bgColor = showReveal
          ? (isGoal ? (isMyTeam ? 'from-green-500/40' : 'from-red-500/40') : isCard ? 'from-red-500/40' : isMiss ? 'from-amber-500/20' : 'from-slate-500/30')
          : 'from-slate-800/60';
        const revealColor = isGoal && isMyTeam ? 'text-green-400' : isGoal ? 'text-red-400' : isCard ? 'text-red-400' : 'text-amber-400';
        return (
          <div className="absolute inset-0 z-40 flex items-center justify-center" onClick={() => { setEventSplash(null); if (splashTimerRef.current) clearTimeout(splashTimerRef.current); if (commentaryTimerRef.current) clearTimeout(commentaryTimerRef.current); if (pendingSplashSoundRef.current) { soundManager.playMatchEvent(pendingSplashSoundRef.current.eventType, pendingSplashSoundRef.current.isMyTeam); pendingSplashSoundRef.current = null; } setIsPlaying(true); }}>
            <div className={`absolute inset-0 bg-gradient-radial ${bgColor} to-black/85 backdrop-blur-sm transition-all duration-500`} />
            <div className="relative z-10 text-center max-w-lg px-6 space-y-4">
              {/* Minute badge */}
              <p className="text-xs text-white/50 font-mono">{e.minute}&apos;</p>

              {/* Commentary lines — appear one by one */}
              <div className="space-y-2 min-h-[60px]">
                {commentaryLines.map((line, i) => (
                  <p
                    key={i}
                    className={`text-lg text-white/90 font-medium italic transition-all duration-500 ${
                      phase > i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>

              {/* Reveal line — appears last with dramatic effect */}
              {showReveal && (
                <div className="space-y-3 animate-in zoom-in-95 fade-in duration-500">
                  <p className={`text-2xl font-display font-black ${revealColor}`}>
                    {revealLine}
                  </p>
                  {isGoal && liveCtx && (
                    <p className="text-4xl font-display font-black text-white animate-in zoom-in duration-300">
                      {liveCtx.homeScore} : {liveCtx.awayScore}
                    </p>
                  )}
                </div>
              )}

              {/* Loading dots while waiting for reveal */}
              {!showReveal && phase > 0 && (
                <p className="text-2xl text-white/40 animate-pulse">...</p>
              )}

              {showReveal && <p className="text-[10px] text-white/30 mt-4">Klicken zum Fortfahren</p>}
            </div>
          </div>
        );
      })()}

      {/* Decision Overlay */}
      {activeDecision && <DecisionOverlay decision={activeDecision} onChoose={handleDecision} showChances={showDevInfo} />}
      {/* Dev Log Overlay */}
      {devLog && <DevLogPanel log={devLog} onClose={() => setDevLog(null)} />}

      {/* ═══ TOP: Score Header (cinematic broadcast bar) ═══ */}
      <div className="shrink-0 glass-panel border-b border-border/30 shadow-lg shadow-black/40">
        {isLive && <MatchProgressBar minute={currentMin} isHalfTime={isHalfTime} />}

        <div className="flex items-center px-4 py-2.5 relative overflow-hidden">
          {/* Team color gradient glow behind score */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-0 top-0 bottom-0 w-1/3 opacity-10" style={{ background: `linear-gradient(to right, ${homeTeam?.colors?.primary ?? '#1C7ED6'}, transparent)` }} />
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10" style={{ background: `linear-gradient(to left, ${awayTeam?.colors?.primary ?? '#E8A317'}, transparent)` }} />
          </div>

          <div className="relative z-10 flex items-center w-full">
            {result ? (
              <Button variant="ghost" size="sm" className="shrink-0 h-8 text-xs" onClick={() => router.push('/game/dashboard')}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />Zurück
              </Button>
            ) : (
              <div className="shrink-0 h-8 w-16" />
            )}

            <div className="flex-1 flex items-center justify-center gap-5">
              <div className="flex items-center gap-3">
                <TeamLogo teamId={homeTeam?.id ?? ''} teamName={homeTeam?.name ?? ''} shortName={homeTeam?.shortName} colors={homeTeam?.colors} size={36} />
                <div className="text-right">
                  <p className="text-sm font-bold leading-tight">{homeTeam?.shortName ?? homeTeam?.name}</p>
                  {homeGoals.length > 0 && (
                    <p className="text-[9px] text-green-400/80 leading-tight">{homeGoals.map(g => `${findPlayer(g.playerId)?.lastName ?? '?'} ${g.minute}'`).join(', ')}</p>
                  )}
                </div>
              </div>

              <div className="text-center min-w-[90px]">
                <p className="text-4xl font-display font-black leading-none neon-primary">{homeScore} <span className="text-muted-foreground/30 text-3xl">:</span> {awayScore}</p>
                {isLive && (
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                    <span className="text-[10px] text-red-400 font-bold font-mono">{currentMin}&apos;</span>
                  </div>
                )}
                {!isLive && result && <p className="text-[10px] text-muted-foreground mt-1">Endstand</p>}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">{awayTeam?.shortName ?? awayTeam?.name}</p>
                  {awayGoals.length > 0 && (
                    <p className="text-[9px] text-green-400/80 leading-tight">{awayGoals.map(g => `${findPlayer(g.playerId)?.lastName ?? '?'} ${g.minute}'`).join(', ')}</p>
                  )}
                </div>
                <TeamLogo teamId={awayTeam?.id ?? ''} teamName={awayTeam?.name ?? ''} shortName={awayTeam?.shortName} colors={awayTeam?.colors} size={36} />
              </div>
            </div>

            <div className="shrink-0 text-right">
              {weather && <p className="text-[9px] text-muted-foreground">{weather.description} {weather.temperature}°C</p>}
              {mainSponsor && <p className="text-[8px] text-primary/40 mt-0.5">presented by {mainSponsor.name}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MIDDLE: New Layout ═══ */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── LEFT: Stats Panel (compact) ── */}
        <div className="w-[200px] flex flex-col border-r border-border/30 min-w-0 overflow-y-auto bg-[hsl(var(--card)/0.4)]">
          <div className="px-3 pt-2 pb-1 border-b border-border/30">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Statistiken</p>
          </div>
          <div className="p-2 space-y-2">
            {(() => {
              const hs = liveCtx?.homeStats ?? result?.homeStats;
              const as_ = liveCtx?.awayStats ?? result?.awayStats;
              if (!hs || !as_) return <p className="text-[10px] text-muted-foreground p-2">Warte auf Anstoß...</p>;
              return (
                <>
                  <StatBar label="Ballbesitz" home={hs.possession} away={as_.possession} suffix="%" />
                  <StatBar label="Torschüsse" home={hs.shots} away={as_.shots} />
                  <StatBar label="Aufs Tor" home={hs.shotsOnTarget} away={as_.shotsOnTarget} />
                  <StatBar label="Ecken" home={hs.corners} away={as_.corners} />
                  <StatBar label="Fouls" home={hs.fouls} away={as_.fouls} />
                  <StatBar label="Abseits" home={hs.offsides} away={as_.offsides} />
                </>
              );
            })()}
          </div>

          {/* Lineup section — sorted by position, with jersey numbers */}
          {isLive && liveCtx && (
            <div className="border-t border-border/50 p-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">👥 Aufstellung</p>
              <div className="space-y-0.5">
                {(() => {
                  const POS_ORDER: Record<string, number> = { TW: 0, IV: 1, LV: 2, RV: 3, ZDM: 4, ZM: 5, ZOM: 6, LA: 7, RA: 8, ST: 9 };
                  const sorted = [...activePlayers].sort((a, b) => (POS_ORDER[a.position] ?? 5) - (POS_ORDER[b.position] ?? 5));
                  return sorted.map((p) => {
                    const stam = liveCtx.stamina[p.id] ?? 80;
                    const barColor = stam > 60 ? 'bg-green-500' : stam > 35 ? 'bg-yellow-500' : 'bg-red-500';
                    // Jersey number = index in the original lineup + 1
                    const jerseyNum = (isPlayerHome ? liveCtx.homePlayers : liveCtx.awayPlayers).findIndex(lp => lp.id === p.id) + 1;
                    return (
                      <div key={p.id} className="flex items-center gap-1 py-0.5">
                        <span className="text-[9px] w-4 text-center font-mono font-bold text-primary">{jerseyNum}</span>
                        <span className="text-[9px] w-6 text-muted-foreground font-mono">{p.position}</span>
                        <span className="text-[10px] truncate flex-1">{p.lastName}</span>
                        <div className="w-8 h-1 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${stam}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Post-match ratings */}
          {result && !isLive && (
            <div className="border-t border-border/50 p-2 space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">👥 Bewertungen</p>
              <RatingsCard title={homeTeam?.name ?? 'Heim'} ratings={result.homeRatings} motm={result.manOfTheMatch} findPlayer={findPlayer} />
              <RatingsCard title={awayTeam?.name ?? 'Gast'} ratings={result.awayRatings} motm={result.manOfTheMatch} findPlayer={findPlayer} />
            </div>
          )}
        </div>

        {/* ── CENTER: 2D Pitch + Live-Ticker ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 2D Canvas Pitch (only during live play) */}
          {isLive && liveCtx && (
            <div className="shrink-0 h-[60%] min-h-[280px] border-b border-border/30 bg-black/20">
              <Match2DCanvas
                ctx={liveCtx}
                homeFormation={tactics?.[activeTactic]?.formation}
                awayFormation={undefined}
                className="w-full h-full"
              />
            </div>
          )}
          <div className="flex-1 min-h-0">
            <MatchTickerView
              events={eventsToShow}
              homeTeamId={homeTeamId}
              homeScore={homeScore}
              awayScore={awayScore}
              currentMinute={currentMin}
              isPlaying={isPlaying}
              isFinished={!!result || !!liveCtx?.isFinished}
              onShowDevLog={setDevLog}
            />
          </div>
        </div>

        {/* ── RIGHT COLUMN: Coaching Panel ── */}
        {isLive && showCoaching && liveCtx && !liveCtx.isFinished && (
          <div className="w-64 border-l border-border bg-card/50 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground">⚡ Coaching</p>
              <button onClick={() => setShowCoaching(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>

            {/* Substitution */}
            {playerSubs < 5 && !showSubPanel && (
              <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => { setIsPlaying(false); setShowSubPanel(true); }}>
                <ArrowRightLeft className="w-3 h-3" />Auswechslung ({playerSubs}/5)
              </Button>
            )}

            {showSubPanel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Wechsel ({playerSubs}/5)</p>
                  <button onClick={() => { setShowSubPanel(false); setSubOut(null); }} className="text-[10px] text-muted-foreground hover:text-foreground">Schließen</button>
                </div>
                {!subOut ? (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Spieler RAUS wählen:</p>
                    {activePlayers.filter(p => p.position !== 'TW').map(p => {
                      const stam = liveCtx?.stamina[p.id] ?? 80;
                      const stamColor = stam > 60 ? 'text-green-400' : stam > 35 ? 'text-yellow-400' : 'text-red-400';
                      return (
                        <button key={p.id} onClick={() => setSubOut(p.id)}
                          className="flex items-center gap-1.5 w-full p-1.5 rounded border border-border hover:bg-secondary/30 text-left text-[11px]">
                          <span className="font-medium truncate flex-1">{p.lastName}</span>
                          <span className="text-[9px] text-muted-foreground">{p.position}</span>
                          <span className={`text-[9px] font-mono ${stamColor}`}>{Math.round(stam)}%</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-muted-foreground">RAUS:</span>
                      <span className="text-red-400 font-bold">{findPlayer(subOut)?.lastName}</span>
                      <button onClick={() => setSubOut(null)} className="ml-auto text-muted-foreground hover:text-foreground">Ändern</button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Ersatz wählen:</p>
                    {benchPlayers.filter(p => p.position !== 'TW').sort((a, b) => calcOverall(b) - calcOverall(a)).map(p => (
                      <button key={p.id} onClick={() => handleSub(p.id)}
                        className="flex items-center gap-1.5 w-full p-1.5 rounded border border-border hover:bg-blue-500/10 text-left text-[11px]">
                        <span className="font-medium truncate flex-1">{p.lastName}</span>
                        <span className="text-[9px] text-muted-foreground">{p.position} • {calcOverall(p)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shouts */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-medium">📣 Reinrufe</p>
              {SHOUT_CATALOG.map(s => {
                const onCooldown = liveCtx.currentMinute < liveCtx.shoutCooldownUntil;
                const isActive = liveCtx.shoutActive?.type === s.type && liveCtx.currentMinute <= (liveCtx.shoutActive?.expiresAt ?? 0);
                return (
                  <button key={s.type} disabled={onCooldown && !isActive} title={s.description}
                    className={`w-full text-left p-1.5 rounded border text-[11px] transition-colors ${isActive ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-border hover:bg-secondary/30'} ${onCooldown && !isActive ? 'opacity-40' : ''}`}
                    onClick={() => {
                      if (isActive) return;
                      const ev = applyShout(liveCtx, s.type as ShoutType);
                      if (ev) { setDisplayEvents(prev => [...prev, ev]); setLiveCtx({ ...liveCtx }); }
                    }}>
                    {s.icon} {s.label}
                  </button>
                );
              })}
            </div>

            {/* Halftime Talk */}
            {liveCtx.currentMinute >= 45 && liveCtx.currentMinute <= 50 && !liveCtx.halftimeTalkDone && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <p className="text-[10px] text-amber-400 font-medium">📢 Halbzeitansprache</p>
                {HALFTIME_TALKS.map(t => (
                  <button key={t.type}
                    className="w-full text-left p-2 rounded border border-border hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors"
                    onClick={() => {
                      const ev = applyHalftimeTalk(liveCtx, t.type as HalftimeTalkType);
                      if (ev) { setDisplayEvents(prev => [...prev, ev]); setLiveCtx({ ...liveCtx }); }
                    }}>
                    <p className="text-[11px] font-medium">{t.icon} {t.label}</p>
                    <p className="text-[9px] text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ BOTTOM: Controls Bar (fixed) ═══ */}
      <div className="shrink-0 glass-panel border-t border-border/30 px-4 py-2 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {/* Left: Speed controls */}
        {isLive ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button onClick={() => setIsPlaying(false)} className={`px-3 py-1.5 text-xs flex items-center gap-1 ${!isPlaying ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/50'}`}>
                <Pause className="w-3.5 h-3.5" /><span className="hidden sm:inline">Pause</span>
              </button>
              <button onClick={() => { setSpeed('slow'); setIsPlaying(true); }} className={`px-3 py-1.5 text-xs ${isPlaying && speed === 'slow' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/50'}`}>
                <Play className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setSpeed('normal'); setIsPlaying(true); }} className={`px-3 py-1.5 text-xs ${isPlaying && speed === 'normal' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/50'}`}>
                <FastForward className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setSpeed('fast'); setIsPlaying(true); }} className={`px-3 py-1.5 text-[10px] font-bold ${isPlaying && speed === 'fast' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/50'}`}>
                4×
              </button>
              <button onClick={() => { setSpeed('instant'); setIsPlaying(true); }} className={`px-3 py-1.5 text-xs ${speed === 'instant' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/50'}`}>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Auto-Pause Toggle */}
            <button
              onClick={() => setAutoPause(!autoPause)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] border transition-colors ${autoPause ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-border text-muted-foreground hover:text-foreground'}`}
              title={autoPause ? 'Auto-Pause aktiv: Spiel pausiert bei Toren und wichtigen Ereignissen' : 'Auto-Pause deaktiviert'}
            >
              {autoPause ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              Auto-Pause
            </button>
            {/* Sound Mute Toggle */}
            <button
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                soundManager.updateSettings({ masterVolume: next ? 0 : 0.5 });
                if (next) soundManager.stopAmbient();
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] border transition-colors ${isMuted ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-border text-muted-foreground hover:text-foreground'}`}
              title={isMuted ? 'Ton ist aus' : 'Ton ist an'}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            {/* Dev Mode Toggle — shows success % in decisions */}
            <button
              onClick={() => setShowDevInfo(!showDevInfo)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] border transition-colors ${showDevInfo ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
              title={showDevInfo ? 'Dev-Modus aktiv: Erfolgsquoten sichtbar' : 'Dev-Modus: Erfolgsquoten bei Entscheidungen anzeigen'}
            >
              {showDevInfo ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Dev
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Center: Status */}
        <div className="text-center">
          {isLive && !isPlaying && !liveCtx?.isFinished && !activeDecision && (
            <p className="text-xs text-amber-400 font-medium">⏸ Pausiert</p>
          )}
          {isLive && isPlaying && (
            <p className="text-xs text-muted-foreground">Simulation läuft...</p>
          )}
          {result && !isLive && (
            <p className="text-xs text-muted-foreground">Spiel beendet</p>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {isLive && liveCtx && !liveCtx.isFinished && (
            <Button variant={showCoaching ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1" onClick={() => setShowCoaching(!showCoaching)}>
              <Zap className="w-3.5 h-3.5" />Coaching
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RatingsCard({ title, ratings, motm, findPlayer }: {
  title: string;
  ratings: { playerId: string; rating: number; goals: number; assists: number; minutesPlayed: number; yellowCard: boolean }[];
  motm?: string;
  findPlayer: (id?: string) => Player | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      {[...ratings].sort((a, b) => b.rating - a.rating).map(r => {
        const p = findPlayer(r.playerId);
        const isMotm = motm === r.playerId;
        return (
          <div key={r.playerId} className="flex items-center gap-1.5 text-[11px]">
            <RatingBadge rating={r.rating} />
            <span className={`flex-1 truncate ${isMotm ? "text-accent font-semibold" : ""}`}>{p?.lastName ?? "?"}{isMotm ? " ⭐" : ""}</span>
            <span className="text-[9px] text-muted-foreground">{r.minutesPlayed}&apos;</span>
            {r.goals > 0 && <span className="text-[9px]">⚽{r.goals > 1 ? `×${r.goals}` : ""}</span>}
            {r.assists > 0 && <span className="text-[9px]">🅰{r.assists > 1 ? `×${r.assists}` : ""}</span>}
            {r.yellowCard && <span className="w-2 h-2.5 bg-yellow-400 rounded-sm inline-block" />}
          </div>
        );
      })}
    </div>
  );
}
