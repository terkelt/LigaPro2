"use client";

import { useState, useCallback, useEffect } from "react";
import { Pack, PackReward, PACK_TYPE_INFO, RARITY_INFO } from "@/types/packs";
import { Button } from "@/components/ui/button";
import { X, Gift, Sparkles, Zap, Check } from "lucide-react";

interface Props {
  pack: Pack;
  onOpen: (packId: string) => void;
  onApply: (packId: string) => string[];
  onRedeemCard?: (cardId: string) => void;
  onClose: () => void;
}

type Phase = "intro" | "opening" | "reveal" | "done";

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v.toLocaleString("de-DE")}`;
}

const RARITY_BORDER: Record<string, string> = {
  common: "border-gray-500/40",
  uncommon: "border-green-500/50",
  rare: "border-blue-500/60",
  epic: "border-purple-500/70",
};

const RARITY_BG: Record<string, string> = {
  common: "from-gray-500/10 to-gray-600/5",
  uncommon: "from-green-500/15 to-green-600/5",
  rare: "from-blue-500/20 to-blue-600/5",
  epic: "from-purple-500/25 to-purple-600/10",
};

const RARITY_GLOW: Record<string, string> = {
  common: "",
  uncommon: "shadow-[0_0_12px_rgba(34,197,94,0.2)]",
  rare: "shadow-[0_0_16px_rgba(59,130,246,0.3)]",
  epic: "shadow-[0_0_24px_rgba(168,85,247,0.4)]",
};

export function PackOpener({ pack, onOpen, onApply, onRedeemCard, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [revealedCards, setRevealedCards] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [redeemedIndices, setRedeemedIndices] = useState<Set<number>>(new Set());

  const info = PACK_TYPE_INFO[pack.type];
  const hasRareOrBetter = pack.rewards.some(
    (r) => r.rarity === "rare" || r.rarity === "epic"
  );

  const handleOpenPack = useCallback(() => {
    if (!pack.isOpened) {
      onOpen(pack.id);
    }
    setPhase("opening");
    // Transition to reveal after animation
    setTimeout(() => setPhase("reveal"), 1200);
  }, [pack, onOpen]);

  const handleRevealCard = useCallback(() => {
    if (revealedCards < pack.rewards.length) {
      const nextCard = pack.rewards[revealedCards];
      setRevealedCards((prev) => prev + 1);
      // Show confetti for rare+
      if (nextCard.rarity === "rare" || nextCard.rarity === "epic") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    }
  }, [revealedCards, pack.rewards]);

  const handleRevealAll = useCallback(() => {
    setRevealedCards(pack.rewards.length);
    if (hasRareOrBetter) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [pack.rewards.length, hasRareOrBetter]);

  const handleCollect = useCallback(() => {
    const ids = onApply(pack.id);
    setCardIds(ids);
    // If no redeem callback, just close
    if (!onRedeemCard) {
      setPhase("done");
      setTimeout(onClose, 600);
    } else {
      // Stay in reveal phase to allow inline redemption
      setPhase("done");
    }
  }, [pack.id, onApply, onRedeemCard, onClose]);

  const handleRedeemCard = useCallback((idx: number) => {
    if (!onRedeemCard || !cardIds[idx] || redeemedIndices.has(idx)) return;
    onRedeemCard(cardIds[idx]);
    setRedeemedIndices(prev => new Set([...prev, idx]));
  }, [onRedeemCard, cardIds, redeemedIndices]);

  const handleRedeemAll = useCallback(() => {
    if (!onRedeemCard) return;
    cardIds.forEach((id, idx) => {
      if (!redeemedIndices.has(idx)) onRedeemCard(id);
    });
    setRedeemedIndices(new Set(cardIds.map((_, i) => i)));
  }, [onRedeemCard, cardIds, redeemedIndices]);

  const handleFinish = useCallback(() => {
    onClose();
  }, [onClose]);

  const allRevealed = revealedCards >= pack.rewards.length;
  const allRedeemed = cardIds.length > 0 && redeemedIndices.size >= cardIds.length;
  const redeemedCount = redeemedIndices.size;
  const collectedCount = cardIds.length - redeemedCount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={phase === "done" ? onClose : undefined}
      />

      {/* Confetti particles */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[101]">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `-5%`,
                background: [
                  "#FFD700",
                  "#FF6B6B",
                  "#4ECDC4",
                  "#45B7D1",
                  "#A855F7",
                  "#F59E0B",
                ][i % 6],
                animationDelay: `${Math.random() * 0.8}s`,
                animationDuration: `${1.5 + Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-[102] w-full max-w-lg mx-4">
        {/* Close button */}
        {(phase === "reveal" && allRevealed) || phase === "done" ? (
          <button
            onClick={allRevealed && phase !== "done" ? handleCollect : onClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        {/* Intro Phase */}
        {phase === "intro" && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Pack visual */}
            <div
              className={`mx-auto w-48 h-64 rounded-2xl bg-gradient-to-b ${info.bgClass} border-2 flex flex-col items-center justify-center gap-4 cursor-pointer hover:scale-105 transition-transform duration-300`}
              onClick={handleOpenPack}
            >
              <span className="text-6xl">{info.icon}</span>
              <div>
                <p className={`text-lg font-bold ${info.color}`}>
                  {info.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pack.itemCount} Items
                </p>
              </div>
              <Gift className={`w-5 h-5 ${info.color} animate-bounce`} />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">{pack.reason}</p>
              <Button
                className="mt-4 gap-2"
                size="lg"
                onClick={handleOpenPack}
              >
                <Sparkles className="w-4 h-4" /> Pack öffnen
              </Button>
            </div>
          </div>
        )}

        {/* Opening Animation Phase */}
        {phase === "opening" && (
          <div className="text-center animate-in fade-in duration-300">
            <div
              className={`mx-auto w-48 h-64 rounded-2xl bg-gradient-to-b ${info.bgClass} border-2 flex items-center justify-center animate-pack-open`}
            >
              <span className="text-6xl animate-spin-slow">{info.icon}</span>
            </div>
            <p className={`mt-4 text-lg font-bold ${info.color} animate-pulse`}>
              Öffne...
            </p>
          </div>
        )}

        {/* Reveal Phase */}
        {phase === "reveal" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <p className={`text-lg font-bold ${info.color}`}>
                {info.icon} {info.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {revealedCards}/{pack.rewards.length} aufgedeckt
              </p>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pack.rewards.map((reward, i) => {
                const isRevealed = i < revealedCards;
                const rarityInfo = RARITY_INFO[reward.rarity];
                return (
                  <div
                    key={reward.id}
                    className={`relative rounded-xl border-2 p-3 transition-all duration-500 cursor-pointer min-h-[130px] flex flex-col items-center justify-center text-center gap-1.5 ${
                      isRevealed
                        ? `bg-gradient-to-b ${RARITY_BG[reward.rarity]} ${RARITY_BORDER[reward.rarity]} ${RARITY_GLOW[reward.rarity]}`
                        : "bg-card/50 border-border hover:border-primary/30 hover:bg-card/80"
                    }`}
                    onClick={!isRevealed ? handleRevealCard : undefined}
                  >
                    {isRevealed ? (
                      <>
                        <span className="text-3xl">{reward.icon}</span>
                        <p className="text-[11px] font-bold leading-tight">
                          {reward.title}
                        </p>
                        <p className="text-[9px] text-muted-foreground leading-tight">
                          {reward.description}
                        </p>
                        <span
                          className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${rarityInfo.color}`}
                        >
                          {rarityInfo.label}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl opacity-30">❓</span>
                        <p className="text-[10px] text-muted-foreground">
                          Tippe zum Aufdecken
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3">
              {!allRevealed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleRevealAll}
                >
                  Alle aufdecken
                </Button>
              )}
              {allRevealed && (
                <Button size="sm" className="gap-1.5" onClick={handleCollect}>
                  <Sparkles className="w-3.5 h-3.5" /> Karten sammeln
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Done Phase — Inline Redemption */}
        {phase === "done" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <p className={`text-lg font-bold ${info.color}`}>
                🃏 Karten gesammelt!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Löse Karten jetzt ein oder sammle sie für später.
              </p>
            </div>

            {/* Cards with redeem buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pack.rewards.map((reward, i) => {
                const rarityInfo = RARITY_INFO[reward.rarity];
                const isRedeemed = redeemedIndices.has(i);
                return (
                  <div
                    key={reward.id}
                    className={`relative rounded-xl border-2 p-3 transition-all duration-300 min-h-[130px] flex flex-col items-center justify-center text-center gap-1 ${
                      isRedeemed
                        ? "bg-green-500/10 border-green-500/40 opacity-70"
                        : `bg-gradient-to-b ${RARITY_BG[reward.rarity]} ${RARITY_BORDER[reward.rarity]} ${RARITY_GLOW[reward.rarity]}`
                    }`}
                  >
                    {isRedeemed && (
                      <div className="absolute top-1.5 right-1.5">
                        <Check className="w-4 h-4 text-green-400" />
                      </div>
                    )}
                    <span className="text-2xl">{reward.icon}</span>
                    <p className="text-[10px] font-bold leading-tight">{reward.title}</p>
                    <p className="text-[8px] text-muted-foreground leading-tight">{reward.description}</p>
                    <span className={`text-[7px] font-bold uppercase tracking-wider ${rarityInfo.color}`}>
                      {rarityInfo.label}
                    </span>
                    {!isRedeemed && onRedeemCard && cardIds[i] && (
                      <button
                        onClick={() => handleRedeemCard(i)}
                        className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/20 hover:bg-primary/40 text-primary text-[9px] font-bold transition-colors"
                      >
                        <Zap className="w-3 h-3" /> Einlösen
                      </button>
                    )}
                    {isRedeemed && (
                      <p className="text-[8px] text-green-400 font-medium mt-1">✓ Eingelöst</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom action bar */}
            <div className="flex items-center justify-center gap-3">
              {onRedeemCard && !allRedeemed && (
                <Button size="sm" className="gap-1.5 text-xs" onClick={handleRedeemAll}>
                  <Zap className="w-3.5 h-3.5" /> Alle einlösen
                </Button>
              )}
              <Button
                size="sm"
                variant={allRedeemed ? "default" : "outline"}
                className="gap-1.5 text-xs"
                onClick={handleFinish}
              >
                {allRedeemed
                  ? <><Sparkles className="w-3.5 h-3.5" /> Fertig</>
                  : collectedCount > 0
                    ? `${collectedCount} für später sammeln`
                    : <><Sparkles className="w-3.5 h-3.5" /> Fertig</>
                }
              </Button>
            </div>

            {redeemedCount > 0 && (
              <p className="text-center text-[10px] text-green-400/70">
                ⚡ {redeemedCount} Karte{redeemedCount !== 1 ? 'n' : ''} sofort eingelöst
                {collectedCount > 0 && ` · ${collectedCount} gesammelt`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.3);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall 2s ease-in forwards;
        }
        @keyframes pack-open {
          0% {
            transform: scale(1) rotate(0deg);
          }
          30% {
            transform: scale(1.15) rotate(-3deg);
          }
          60% {
            transform: scale(1.15) rotate(3deg);
          }
          80% {
            transform: scale(1.3) rotate(0deg);
          }
          100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
        }
        .animate-pack-open {
          animation: pack-open 1.2s ease-in-out forwards;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
