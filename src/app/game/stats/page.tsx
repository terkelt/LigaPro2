"use client";

import { useMemo, useState } from "react";
import { useHasGameState, useResults, useAllPlayers, useTeams, useCurrentTeamId } from "@/store/selectors";
import { useGameStore } from "@/store/game-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Star, Shield, Award, TrendingUp, Filter } from "lucide-react";
import { TeamLogo } from "@/components/ui/team-logo";

type StatTab = 'scorers' | 'assists' | 'ratings' | 'cleansheets' | 'team';
type CompFilter = 'all' | 'league' | 'cup' | 'cl' | 'el' | 'ecl' | 'friendly';

const COMP_LABELS: Record<CompFilter, string> = {
  all: 'Gesamt',
  league: 'Liga',
  cup: 'Pokal',
  cl: 'Champions League',
  el: 'Europa League',
  ecl: 'Conference League',
  friendly: 'Freundschaftsspiele',
};

function computeStats(results: any[], allPlayers: any[], compFilter: CompFilter, playerLeagueId?: string) {
  let filtered: any[];
  if (compFilter === 'all') {
    filtered = results;
  } else if (compFilter === 'league' && playerLeagueId) {
    // Filter by player's specific league, not all leagues
    filtered = results.filter((r: any) => r.competition === 'league' && r.leagueId === playerLeagueId);
  } else {
    filtered = results.filter((r: any) => r.competition === compFilter);
  }
  if (filtered.length === 0) return null;

  const playerGoals: Record<string, number> = {};
  const playerAssists: Record<string, number> = {};
  const playerRatings: Record<string, { total: number; count: number }> = {};
  const playerMinutes: Record<string, number> = {};
  const playerYellows: Record<string, number> = {};
  const playerReds: Record<string, number> = {};
  const teamGoals: Record<string, { scored: number; conceded: number; wins: number; draws: number; losses: number; cleanSheets: number }> = {};
  const gkCleanSheets: Record<string, number> = {};

  for (const r of filtered) {
    for (const tid of [r.homeTeamId, r.awayTeamId]) {
      if (!teamGoals[tid]) teamGoals[tid] = { scored: 0, conceded: 0, wins: 0, draws: 0, losses: 0, cleanSheets: 0 };
    }
    const hg = teamGoals[r.homeTeamId];
    const ag = teamGoals[r.awayTeamId];
    hg.scored += r.homeScore;
    hg.conceded += r.awayScore;
    ag.scored += r.awayScore;
    ag.conceded += r.homeScore;
    if (r.homeScore > r.awayScore) { hg.wins++; ag.losses++; }
    else if (r.homeScore < r.awayScore) { ag.wins++; hg.losses++; }
    else { hg.draws++; ag.draws++; }
    if (r.awayScore === 0) hg.cleanSheets++;
    if (r.homeScore === 0) ag.cleanSheets++;

    for (const pr of [...(r.homeRatings ?? []), ...(r.awayRatings ?? [])]) {
      playerGoals[pr.playerId] = (playerGoals[pr.playerId] ?? 0) + pr.goals;
      playerAssists[pr.playerId] = (playerAssists[pr.playerId] ?? 0) + pr.assists;
      if (!playerRatings[pr.playerId]) playerRatings[pr.playerId] = { total: 0, count: 0 };
      playerRatings[pr.playerId].total += pr.rating;
      playerRatings[pr.playerId].count++;
      playerMinutes[pr.playerId] = (playerMinutes[pr.playerId] ?? 0) + pr.minutesPlayed;
      if (pr.yellowCard) playerYellows[pr.playerId] = (playerYellows[pr.playerId] ?? 0) + 1;
      if (pr.redCard) playerReds[pr.playerId] = (playerReds[pr.playerId] ?? 0) + 1;
    }

    if (r.awayScore === 0) {
      const homeGK = (r.homeRatings ?? []).find((pr: any) => {
        const p = allPlayers.find((pl: any) => pl.id === pr.playerId);
        return p?.position === 'TW';
      });
      if (homeGK) gkCleanSheets[homeGK.playerId] = (gkCleanSheets[homeGK.playerId] ?? 0) + 1;
    }
    if (r.homeScore === 0) {
      const awayGK = (r.awayRatings ?? []).find((pr: any) => {
        const p = allPlayers.find((pl: any) => pl.id === pr.playerId);
        return p?.position === 'TW';
      });
      if (awayGK) gkCleanSheets[awayGK.playerId] = (gkCleanSheets[awayGK.playerId] ?? 0) + 1;
    }
  }

  const topScorers = Object.entries(playerGoals)
    .filter(([, g]) => g > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, goals]) => ({ id, goals, assists: playerAssists[id] ?? 0 }));

  const topAssists = Object.entries(playerAssists)
    .filter(([, a]) => a > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, assists]) => ({ id, assists, goals: playerGoals[id] ?? 0 }));

  const topRatings = Object.entries(playerRatings)
    .filter(([, r]) => r.count >= 3)
    .map(([id, r]) => ({ id, avg: r.total / r.count, matches: r.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 20);

  const topCleanSheets = Object.entries(gkCleanSheets)
    .filter(([, cs]) => cs > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, cs]) => ({ id, cleanSheets: cs }));

  const teamStatsList = Object.entries(teamGoals)
    .map(([id, s]) => ({ id, ...s, gamesPlayed: s.wins + s.draws + s.losses }))
    .sort((a, b) => b.scored - a.scored);

  return { topScorers, topAssists, topRatings, topCleanSheets, teamStatsList, totalMatches: filtered.length };
}

export default function StatsPage() {
  const hasGame = useHasGameState();
  const results = useResults();
  const allPlayers = useAllPlayers();
  const teams = useTeams();
  const currentTeamId = useCurrentTeamId();
  const gameState = useGameStore(s => s.gameState);
  const [tab, setTab] = useState<StatTab>('scorers');
  const [compFilter, setCompFilter] = useState<CompFilter>('league');

  // Find the player's league ID
  const playerLeagueId = useMemo(() => {
    if (!gameState) return undefined;
    const myTeam = gameState.teams.find(t => t.id === gameState.currentTeamId);
    return myTeam?.league;
  }, [gameState]);

  // Which competitions actually have results?
  const availableComps = useMemo(() => {
    const comps = new Set<string>();
    for (const r of results) comps.add(r.competition);
    const available: CompFilter[] = ['all'];
    if (comps.has('league')) available.push('league');
    if (comps.has('cup')) available.push('cup');
    if (comps.has('cl')) available.push('cl');
    if (comps.has('el')) available.push('el');
    if (comps.has('ecl')) available.push('ecl');
    if (comps.has('friendly')) available.push('friendly');
    return available;
  }, [results]);

  // Per-competition breakdown for summary card
  const compBreakdown = useMemo(() => {
    const breakdown: { comp: string; label: string; matches: number; goals: number }[] = [];
    for (const comp of availableComps) {
      if (comp === 'all') continue;
      const filtered = results.filter(r => r.competition === comp);
      const totalGoals = filtered.reduce((s, r) => s + r.homeScore + r.awayScore, 0);
      breakdown.push({ comp, label: COMP_LABELS[comp], matches: filtered.length, goals: totalGoals });
    }
    return breakdown;
  }, [results, availableComps]);

  const stats = useMemo(() => computeStats(results, allPlayers, compFilter, playerLeagueId), [results, allPlayers, compFilter, playerLeagueId]);

  if (!hasGame) return null;

  const findPlayer = (id: string) => allPlayers.find(p => p.id === id);
  const findTeam = (id: string) => teams.find(t => t.id === id);

  const tabs: { key: StatTab; label: string; icon: React.ReactNode }[] = [
    { key: 'scorers', label: 'Torjäger', icon: <Target className="w-3.5 h-3.5" /> },
    { key: 'assists', label: 'Vorlagen', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'ratings', label: 'Bewertungen', icon: <Star className="w-3.5 h-3.5" /> },
    { key: 'cleansheets', label: 'Weiße Weste', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'team', label: 'Teams', icon: <Trophy className="w-3.5 h-3.5" /> },
  ];

  if (!stats || stats.totalMatches === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Statistiken</h1>
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Noch keine Statistiken</p>
            <p className="text-sm mt-1">Torjäger, Assists, Bewertungen und mehr nach dem ersten Spieltag.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Statistiken</h1>
        <span className="text-xs text-muted-foreground">{stats.totalMatches} Spiele ausgewertet ({COMP_LABELS[compFilter]})</span>
      </div>

      {/* Competition breakdown summary */}
      {compBreakdown.length > 1 && (
        <Card className="bg-card border-border">
          <CardContent className="py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Übersicht:</span>
              {compBreakdown.map(b => (
                <div key={b.comp} className="text-center px-3 py-1 rounded bg-secondary/20">
                  <p className="text-[9px] text-muted-foreground">{b.label}</p>
                  <p className="text-xs font-bold">{b.matches} <span className="text-muted-foreground font-normal">Sp.</span> / {b.goals} <span className="text-muted-foreground font-normal">Tore</span></p>
                </div>
              ))}
              <div className="text-center px-3 py-1 rounded bg-primary/10 border border-primary/20">
                <p className="text-[9px] text-primary">Gesamt</p>
                <p className="text-xs font-bold text-primary">{results.length} <span className="font-normal">Sp.</span> / {results.reduce((s, r) => s + r.homeScore + r.awayScore, 0)} <span className="font-normal">Tore</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competition filter */}
      {availableComps.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {availableComps.map(c => (
            <button key={c} onClick={() => setCompFilter(c)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${compFilter === c ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30'}`}>
              {COMP_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${tab === t.key ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'scorers' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Torjägerliste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider pb-1 border-b border-border">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Spieler</span>
                <span className="col-span-3">Team</span>
                <span className="col-span-1 text-center">⚽</span>
                <span className="col-span-1 text-center">🅰️</span>
                <span className="col-span-1 text-center">Σ</span>
              </div>
              {stats.topScorers.map((s, i) => {
                const p = findPlayer(s.id);
                const t = p ? findTeam(p.teamId) : null;
                const isMine = p?.teamId === currentTeamId;
                return (
                  <div key={s.id} className={`grid grid-cols-12 gap-2 items-center py-1.5 text-xs ${i < 3 ? 'font-medium' : ''} ${isMine ? 'bg-primary/5 rounded' : ''}`}>
                    <span className={`col-span-1 font-mono ${i === 0 ? 'text-amber-400 font-bold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="col-span-5 truncate">{p?.firstName?.charAt(0)}. {p?.lastName ?? '?'} <span className="text-[9px] text-muted-foreground">({p?.position})</span></span>
                    <span className="col-span-3 flex items-center gap-1 truncate">
                      {t && <TeamLogo teamId={t.id} teamName={t.name} shortName={t.shortName} colors={t.colors} size={14} />}
                      <span className="text-[10px] text-muted-foreground truncate">{t?.shortName}</span>
                    </span>
                    <span className="col-span-1 text-center font-bold">{s.goals}</span>
                    <span className="col-span-1 text-center text-muted-foreground">{s.assists}</span>
                    <span className="col-span-1 text-center text-muted-foreground">{s.goals + s.assists}</span>
                  </div>
                );
              })}
              {stats.topScorers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Noch keine Tore erzielt.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'assists' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Vorlagengeber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider pb-1 border-b border-border">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Spieler</span>
                <span className="col-span-3">Team</span>
                <span className="col-span-1 text-center">🅰️</span>
                <span className="col-span-1 text-center">⚽</span>
                <span className="col-span-1 text-center">Σ</span>
              </div>
              {stats.topAssists.map((s, i) => {
                const p = findPlayer(s.id);
                const t = p ? findTeam(p.teamId) : null;
                const isMine = p?.teamId === currentTeamId;
                return (
                  <div key={s.id} className={`grid grid-cols-12 gap-2 items-center py-1.5 text-xs ${i < 3 ? 'font-medium' : ''} ${isMine ? 'bg-primary/5 rounded' : ''}`}>
                    <span className={`col-span-1 font-mono ${i === 0 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="col-span-5 truncate">{p?.firstName?.charAt(0)}. {p?.lastName ?? '?'} <span className="text-[9px] text-muted-foreground">({p?.position})</span></span>
                    <span className="col-span-3 flex items-center gap-1 truncate">
                      {t && <TeamLogo teamId={t.id} teamName={t.name} shortName={t.shortName} colors={t.colors} size={14} />}
                      <span className="text-[10px] text-muted-foreground truncate">{t?.shortName}</span>
                    </span>
                    <span className="col-span-1 text-center font-bold">{s.assists}</span>
                    <span className="col-span-1 text-center text-muted-foreground">{s.goals}</span>
                    <span className="col-span-1 text-center text-muted-foreground">{s.goals + s.assists}</span>
                  </div>
                );
              })}
              {stats.topAssists.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Noch keine Vorlagen.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'ratings' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Beste Bewertungen (Ø, min. 3 Spiele)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider pb-1 border-b border-border">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Spieler</span>
                <span className="col-span-3">Team</span>
                <span className="col-span-2 text-center">Ø Note</span>
                <span className="col-span-1 text-center">Sp.</span>
              </div>
              {stats.topRatings.map((s, i) => {
                const p = findPlayer(s.id);
                const t = p ? findTeam(p.teamId) : null;
                const isMine = p?.teamId === currentTeamId;
                const ratingColor = s.avg >= 8 ? 'text-green-400' : s.avg >= 7 ? 'text-emerald-400' : s.avg >= 6 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div key={s.id} className={`grid grid-cols-12 gap-2 items-center py-1.5 text-xs ${isMine ? 'bg-primary/5 rounded' : ''}`}>
                    <span className={`col-span-1 font-mono ${i === 0 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="col-span-5 truncate">{p?.firstName?.charAt(0)}. {p?.lastName ?? '?'} <span className="text-[9px] text-muted-foreground">({p?.position})</span></span>
                    <span className="col-span-3 flex items-center gap-1 truncate">
                      {t && <TeamLogo teamId={t.id} teamName={t.name} shortName={t.shortName} colors={t.colors} size={14} />}
                      <span className="text-[10px] text-muted-foreground truncate">{t?.shortName}</span>
                    </span>
                    <span className={`col-span-2 text-center font-bold ${ratingColor}`}>{s.avg.toFixed(2)}</span>
                    <span className="col-span-1 text-center text-muted-foreground">{s.matches}</span>
                  </div>
                );
              })}
              {stats.topRatings.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Noch nicht genug Spiele.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'cleansheets' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Weiße Weste (Torwarte)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider pb-1 border-b border-border">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Torwart</span>
                <span className="col-span-4">Team</span>
                <span className="col-span-2 text-center">Zu-Null</span>
              </div>
              {stats.topCleanSheets.map((s, i) => {
                const p = findPlayer(s.id);
                const t = p ? findTeam(p.teamId) : null;
                const isMine = p?.teamId === currentTeamId;
                return (
                  <div key={s.id} className={`grid grid-cols-12 gap-2 items-center py-1.5 text-xs ${isMine ? 'bg-primary/5 rounded' : ''}`}>
                    <span className={`col-span-1 font-mono ${i === 0 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="col-span-5 truncate">{p?.firstName?.charAt(0)}. {p?.lastName ?? '?'}</span>
                    <span className="col-span-4 flex items-center gap-1 truncate">
                      {t && <TeamLogo teamId={t.id} teamName={t.name} shortName={t.shortName} colors={t.colors} size={14} />}
                      <span className="text-[10px] text-muted-foreground truncate">{t?.shortName}</span>
                    </span>
                    <span className="col-span-2 text-center font-bold">{s.cleanSheets}</span>
                  </div>
                );
              })}
              {stats.topCleanSheets.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Noch keine Zu-Null-Spiele.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'team' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Team-Statistiken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider pb-1 border-b border-border">
                <span className="col-span-1">#</span>
                <span className="col-span-3">Team</span>
                <span className="col-span-1 text-center">Sp</span>
                <span className="col-span-1 text-center">S</span>
                <span className="col-span-1 text-center">U</span>
                <span className="col-span-1 text-center">N</span>
                <span className="col-span-1 text-center">Tore</span>
                <span className="col-span-1 text-center">Geg.</span>
                <span className="col-span-1 text-center">Diff</span>
                <span className="col-span-1 text-center">ZN</span>
              </div>
              {stats.teamStatsList.map((s, i) => {
                const t = findTeam(s.id);
                const isMine = s.id === currentTeamId;
                const diff = s.scored - s.conceded;
                return (
                  <div key={s.id} className={`grid grid-cols-12 gap-2 items-center py-1.5 text-xs ${isMine ? 'bg-primary/5 rounded font-medium' : ''}`}>
                    <span className="col-span-1 font-mono text-muted-foreground">{i + 1}</span>
                    <span className="col-span-3 flex items-center gap-1 truncate">
                      {t && <TeamLogo teamId={t.id} teamName={t.name} shortName={t.shortName} colors={t.colors} size={14} />}
                      <span className="truncate">{t?.shortName ?? '?'}</span>
                    </span>
                    <span className="col-span-1 text-center">{s.gamesPlayed}</span>
                    <span className="col-span-1 text-center text-green-400">{s.wins}</span>
                    <span className="col-span-1 text-center text-muted-foreground">{s.draws}</span>
                    <span className="col-span-1 text-center text-red-400">{s.losses}</span>
                    <span className="col-span-1 text-center font-bold">{s.scored}</span>
                    <span className="col-span-1 text-center text-muted-foreground">{s.conceded}</span>
                    <span className={`col-span-1 text-center ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{diff > 0 ? '+' : ''}{diff}</span>
                    <span className="col-span-1 text-center">{s.cleanSheets}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
