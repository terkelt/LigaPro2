"use client";

import { MatchAnalysis } from "@/lib/match-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, MessageSquare, Star } from "lucide-react";

interface Props {
  analysis: MatchAnalysis;
  homeTeamName: string;
  awayTeamName: string;
}

function RatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8 ? "bg-green-500/20 text-green-400 border-green-500/30" :
    rating >= 7 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
    rating >= 6 ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" :
    rating >= 5 ? "bg-orange-500/15 text-orange-400 border-orange-500/25" :
    "bg-red-500/15 text-red-400 border-red-500/25";
  return (
    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-bold border ${color}`}>
      {rating.toFixed(1)}
    </span>
  );
}

export function PostMatchAnalysis({ analysis, homeTeamName, awayTeamName }: Props) {
  return (
    <div className="space-y-3 mt-4">
          {/* Stats comparison */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Statistik-Vergleich
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Ballbesitz", home: `${analysis.possessionHome}%`, away: `${analysis.possessionAway}%`, homeVal: analysis.possessionHome, awayVal: analysis.possessionAway },
                { label: "Torschüsse", home: `${analysis.shotsHome}`, away: `${analysis.shotsAway}`, homeVal: analysis.shotsHome, awayVal: analysis.shotsAway },
                { label: "Auf Tor", home: `${analysis.shotsOnTargetHome}`, away: `${analysis.shotsOnTargetAway}`, homeVal: analysis.shotsOnTargetHome, awayVal: analysis.shotsOnTargetAway },
                { label: "Ecken", home: `${analysis.cornersHome}`, away: `${analysis.cornersAway}`, homeVal: analysis.cornersHome, awayVal: analysis.cornersAway },
                { label: "Fouls", home: `${analysis.foulsHome}`, away: `${analysis.foulsAway}`, homeVal: analysis.foulsAway, awayVal: analysis.foulsHome },
              ].map((stat) => {
                const total = stat.homeVal + stat.awayVal || 1;
                const homePct = (stat.homeVal / total) * 100;
                return (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="font-mono font-bold w-8">{stat.home}</span>
                      <span className="text-muted-foreground">{stat.label}</span>
                      <span className="font-mono font-bold w-8 text-right">{stat.away}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
                      <div className="bg-primary/70 rounded-l-full transition-all" style={{ width: `${homePct}%` }} />
                      <div className="bg-red-500/50 rounded-r-full flex-1" />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between text-[9px] text-muted-foreground pt-1">
                <span>{homeTeamName}</span>
                <span>{awayTeamName}</span>
              </div>
            </CardContent>
          </Card>

          {/* Player Ratings */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Spielerbewertungen
                <span className="ml-auto text-[10px] font-normal">Ø {analysis.avgTeamRating}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {analysis.playerRatings.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <RatingBadge rating={p.rating} />
                  <span className="text-[10px] font-mono text-muted-foreground w-6">{p.position}</span>
                  <span className="text-xs flex-1 truncate">{p.name}</span>
                  {p.goals > 0 && <span className="text-[9px] text-green-400">⚽{p.goals > 1 ? `×${p.goals}` : ""}</span>}
                  {p.assists > 0 && <span className="text-[9px] text-blue-400">🅰️{p.assists > 1 ? `×${p.assists}` : ""}</span>}
                  {p.highlight && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{p.highlight}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tactical Summary */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Taktische Analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.tacticalSummary.map((text, i) => (
                <p key={i} className="text-xs text-foreground">{text}</p>
              ))}

              {analysis.strengths.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-green-400 mb-1">Stärken</p>
                  {analysis.strengths.map((s, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-green-400 mt-0.5">+</span> {s}
                    </p>
                  ))}
                </div>
              )}

              {analysis.weaknesses.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-red-400 mb-1">Schwächen</p>
                  {analysis.weaknesses.map((w, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5">−</span> {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Manager Rating */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold">Trainer-Note:</span>
                  <RatingBadge rating={analysis.managerRating} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{analysis.managerVerdict}</p>
              </div>
            </CardContent>
          </Card>
    </div>
  );
}
