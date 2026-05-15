import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useMySchedule, useLeagues, useTeams, useCurrentTeamId, useSeason } from "@/store/selectors";
import { TeamLogo } from "@/components/ui/team-logo";

export default function SchedulePage() {
  const navigate = useNavigate();
  const currentTeamId = useCurrentTeamId();
  const schedule = useMySchedule();
  const leagues = useLeagues();
  const teams = useTeams();
  const season = useSeason();

  const myLeague = useMemo(() => teams.find((t) => t.id === currentTeamId)?.league ?? null, [teams, currentTeamId]);
  const league = useMemo(() => leagues.find((l) => l.id === myLeague) ?? null, [leagues, myLeague]);

  const initialMatchday = useMemo(() => {
    if (!schedule) return 1;
    const nextUnplayed = schedule.matches.find(
      (m) => !m.isPlayed && (m.homeTeamId === currentTeamId || m.awayTeamId === currentTeamId)
    );
    return nextUnplayed?.matchday ?? (season?.currentMatchday || 1);
  }, [schedule, currentTeamId, season]);

  const [selectedMatchday, setSelectedMatchday] = useState(initialMatchday);

  const matchdayMatches = useMemo(() => {
    if (!schedule) return [];
    return schedule.matches
      .filter((m) => m.matchday === selectedMatchday)
      .sort((a, b) => {
        const aIsMine = a.homeTeamId === currentTeamId || a.awayTeamId === currentTeamId;
        const bIsMine = b.homeTeamId === currentTeamId || b.awayTeamId === currentTeamId;
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
        const homeA = teams.find((t) => t.id === a.homeTeamId)?.name ?? '';
        const homeB = teams.find((t) => t.id === b.homeTeamId)?.name ?? '';
        return homeA.localeCompare(homeB);
      });
  }, [schedule, selectedMatchday, currentTeamId, teams]);

  const totalMatchdays = league?.matchdays ?? 34;

  if (!schedule) return null;

  return (
    <div className="space-y-4 animate-slide-up max-w-[1400px] mx-auto">
      {/* ═══ Page Header ═══ */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Spielplan</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{league?.name} &middot; {totalMatchdays} Spieltage</p>
        </div>
      </div>

      {/* ═══ Matchday Navigator ═══ */}
      <div className="tile flex items-center justify-between p-2.5">
        <button
          disabled={selectedMatchday <= 1}
          onClick={() => setSelectedMatchday((d) => d - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Spieltag</span>
          <span className="font-display text-2xl font-black text-primary">{selectedMatchday}</span>
          <span className="text-[10px] font-mono text-muted-foreground/60">/ {totalMatchdays}</span>
        </div>
        <button
          disabled={selectedMatchday >= totalMatchdays}
          onClick={() => setSelectedMatchday((d) => d + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ═══ Match List ═══ */}
      <div className="tile overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="section-label">
            <Calendar className="w-3.5 h-3.5" />
            <span>{matchdayMatches[0]?.date ?? "—"}</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{matchdayMatches.length} Spiele</span>
        </div>
        {matchdayMatches.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-8">Keine Spiele für diesen Spieltag.</p>
        ) : (
          <div className="divide-y divide-border/15">
            {matchdayMatches.map((match) => {
              const home = teams.find((t) => t.id === match.homeTeamId);
              const away = teams.find((t) => t.id === match.awayTeamId);
              const isMyMatch = match.homeTeamId === currentTeamId || match.awayTeamId === currentTeamId;
              const result = match.result;

              return (
                <div
                  key={match.id}
                  className={`grid grid-cols-[1fr_24px_64px_24px_1fr_auto] items-center gap-1.5 px-4 py-2.5 transition-colors ${
                    isMyMatch ? "bg-primary/6 border-l-2 border-l-primary" : "hover:bg-secondary/20"
                  } ${result ? "cursor-pointer" : ""}`}
                  onClick={() => result && navigate(`/game/match/${match.id}`)}
                >
                  <span className={`text-[12px] font-medium text-right truncate ${
                    isMyMatch && match.homeTeamId === currentTeamId ? "text-primary font-semibold" : ""
                  }`}>
                    {home?.name ?? "?"}
                  </span>
                  <div className="flex justify-center">
                    <TeamLogo
                      teamId={match.homeTeamId}
                      teamName={home?.name ?? match.homeTeamId}
                      shortName={home?.shortName}
                      colors={home?.colors}
                      size={20}
                    />
                  </div>

                  <div className="text-center">
                    {result ? (
                      <span className="font-mono font-bold text-[13px] tabular-nums">
                        {result.homeScore} <span className="text-muted-foreground/60">:</span> {result.awayScore}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/70 font-mono">{match.time ?? "vs"}</span>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <TeamLogo
                      teamId={match.awayTeamId}
                      teamName={away?.name ?? match.awayTeamId}
                      shortName={away?.shortName}
                      colors={away?.colors}
                      size={20}
                    />
                  </div>
                  <span className={`text-[12px] font-medium truncate ${
                    isMyMatch && match.awayTeamId === currentTeamId ? "text-primary font-semibold" : ""
                  }`}>
                    {away?.name ?? "?"}
                  </span>

                  <span className="text-[10px] text-muted-foreground/70 truncate max-w-28 text-right hidden md:block">
                    {match.venue}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
