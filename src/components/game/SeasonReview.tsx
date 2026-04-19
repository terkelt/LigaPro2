"use client";

import { useState } from "react";
import { SeasonReviewData } from "@/lib/season-review";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trophy, Target, Star, TrendingUp, Wallet, Shield } from "lucide-react";

interface Props {
  data: SeasonReviewData;
  onClose: () => void;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k €`;
  return `${v.toLocaleString("de-DE")} €`;
}

const SLIDES = [
  "overview",
  "mvp",
  "highlights",
  "scorers",
  "finances",
  "outlook",
] as const;
type Slide = (typeof SLIDES)[number];

const SLIDE_LABELS: Record<Slide, string> = {
  overview: "Gesamtbilanz",
  mvp: "Spieler der Saison",
  highlights: "Highlights",
  scorers: "Torjäger & Vorlagen",
  finances: "Finanzbilanz",
  outlook: "Ausblick",
};

export function SeasonReview({ data, onClose }: Props) {
  const [slideIdx, setSlideIdx] = useState(0);
  const slide = SLIDES[slideIdx];

  const next = () => setSlideIdx((i) => Math.min(i + 1, SLIDES.length - 1));
  const prev = () => setSlideIdx((i) => Math.max(i - 1, 0));
  const isLast = slideIdx === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-xl mx-4">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {SLIDES.map((s, i) => (
            <button
              key={s}
              onClick={() => setSlideIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === slideIdx
                  ? "bg-primary w-6"
                  : i < slideIdx
                  ? "bg-primary/50"
                  : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Slide label */}
        <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-2">
          {SLIDE_LABELS[slide]}
        </p>

        {/* Content */}
        <div className="bg-card border border-border rounded-2xl p-6 min-h-[360px] flex flex-col">
          {slide === "overview" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Trophy className="w-12 h-12 text-primary" />
              <h2 className="text-2xl font-display font-bold">
                Saison {data.seasonYear}
              </h2>
              <div className="text-4xl font-display font-bold">
                Platz{" "}
                <span
                  className={
                    data.position <= 3
                      ? "text-green-400"
                      : data.position <= 6
                      ? "text-yellow-400"
                      : data.position >= 16
                      ? "text-red-400"
                      : "text-foreground"
                  }
                >
                  {data.position}
                </span>
              </div>
              <p className="text-muted-foreground">
                {data.points} Punkte • {data.totalMatches} Spiele
              </p>
              <div className="grid grid-cols-3 gap-6 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {data.wins}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Siege</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {data.draws}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Unentschieden
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {data.losses}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Niederlagen
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {data.goalsScored}:{data.goalsConceded} Tore •{" "}
                {data.cleanSheets} Zu-Null-Spiele
              </p>
            </div>
          )}

          {slide === "mvp" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Star className="w-12 h-12 text-amber-400" />
              <h2 className="text-lg font-bold text-muted-foreground">
                Spieler der Saison
              </h2>
              {data.mvp ? (
                <>
                  <p className="text-3xl font-display font-bold">
                    {data.mvp.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.mvp.position}
                  </p>
                  <div className="grid grid-cols-3 gap-6 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {data.mvp.goals}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Tore</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {data.mvp.assists}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Vorlagen
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">
                        {data.mvp.avgRating}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Ø Note
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Nicht genug Daten vorhanden
                </p>
              )}
            </div>
          )}

          {slide === "highlights" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TrendingUp className="w-10 h-10 text-primary" />
              <h2 className="text-lg font-bold">Saison-Highlights</h2>
              <div className="w-full space-y-3">
                {data.biggestWin && (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-xs text-green-400 font-bold">
                        Höchster Sieg
                      </p>
                      <p className="text-sm">
                        vs. {data.biggestWin.opponent}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-green-400">
                      {data.biggestWin.score}
                    </span>
                  </div>
                )}
                {data.biggestLoss && (
                  <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-xs text-red-400 font-bold">
                        Höchste Niederlage
                      </p>
                      <p className="text-sm">
                        vs. {data.biggestLoss.opponent}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-red-400">
                      {data.biggestLoss.score}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xl font-bold">
                      {data.longestWinStreak}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      Siege in Folge
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xl font-bold">
                      {data.longestUnbeatenStreak}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      Ungeschlagen
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xl font-bold">{data.comebacks}</p>
                    <p className="text-[9px] text-muted-foreground">
                      Comebacks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {slide === "scorers" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Target className="w-10 h-10 text-green-400" />
              <h2 className="text-lg font-bold">Torjäger & Vorlagen</h2>
              <div className="w-full space-y-3">
                {data.topScorer && (
                  <div className="flex items-center gap-3 bg-secondary/20 rounded-lg px-4 py-3">
                    <span className="text-2xl">⚽</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">
                        {data.topScorer.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Torschützenkönig
                      </p>
                    </div>
                    <span className="text-xl font-bold text-green-400">
                      {data.topScorer.goals}
                    </span>
                  </div>
                )}
                {data.topAssist && (
                  <div className="flex items-center gap-3 bg-secondary/20 rounded-lg px-4 py-3">
                    <span className="text-2xl">🅰️</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">
                        {data.topAssist.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Assistkönig
                      </p>
                    </div>
                    <span className="text-xl font-bold text-blue-400">
                      {data.topAssist.assists}
                    </span>
                  </div>
                )}
                {data.bestRating && (
                  <div className="flex items-center gap-3 bg-secondary/20 rounded-lg px-4 py-3">
                    <span className="text-2xl">⭐</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">
                        {data.bestRating.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Beste Ø-Bewertung ({data.bestRating.matches} Spiele)
                      </p>
                    </div>
                    <span className="text-xl font-bold text-amber-400">
                      {data.bestRating.avgRating}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {slide === "finances" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Wallet className="w-10 h-10 text-emerald-400" />
              <h2 className="text-lg font-bold">Finanzbilanz</h2>
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">
                    Kontostand
                  </span>
                  <span
                    className={`font-bold ${
                      data.budgetEnd >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatValue(data.budgetEnd)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">
                    Transfer-Ausgaben
                  </span>
                  <span className="font-bold text-red-400">
                    -{formatValue(data.transferSpent)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">
                    Transfer-Einnahmen
                  </span>
                  <span className="font-bold text-green-400">
                    +{formatValue(data.transferEarned)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">
                    Kaderwert
                  </span>
                  <span className="font-bold text-primary">
                    {formatValue(data.squadValueEnd)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {slide === "outlook" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Shield className="w-12 h-12 text-primary" />
              <h2 className="text-2xl font-display font-bold">
                Bereit für die neue Saison?
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {data.position <= 3
                  ? "Eine fantastische Saison! Kannst du den Erfolg wiederholen?"
                  : data.position <= 6
                  ? "Solide Saison. Mit den richtigen Transfers geht nächstes Jahr mehr!"
                  : data.position <= 10
                  ? "Mittelmäßig. Es gibt Potenzial für Verbesserungen."
                  : data.position <= 15
                  ? "Schwere Saison. Nächstes Jahr muss besser werden."
                  : "Abstiegskampf überstanden? Zeit, den Kader umzubauen!"}
              </p>
              <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-xs text-primary font-bold mb-1">
                  🎁 Saisonpack verdient!
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Qualität basiert auf deinem Tabellenplatz
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={slideIdx === 0}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="w-4 h-4" /> Zurück
          </Button>

          <span className="text-[10px] text-muted-foreground">
            {slideIdx + 1} / {SLIDES.length}
          </span>

          {isLast ? (
            <Button size="sm" onClick={onClose} className="gap-1 text-xs">
              Weiter zur neuen Saison <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={next}
              className="gap-1 text-xs"
            >
              Weiter <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
