"use client";

import { useEffect, useState } from "react";

interface Props {
  type: "manager" | "player";
  name: string;
  newLevel: number;
  onComplete: () => void;
}

export function LevelUpSplash({ type, name, newLevel, onComplete }: Props) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 300);
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    const t3 = setTimeout(onComplete, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className={`relative z-10 text-center transition-all duration-500 ${
          phase === "enter"
            ? "scale-50 opacity-0"
            : phase === "hold"
            ? "scale-100 opacity-100"
            : "scale-110 opacity-0"
        }`}
      >
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]">
            <span className="text-4xl font-display font-bold text-primary">
              {newLevel}
            </span>
          </div>
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
            ⬆️
          </div>
        </div>
        <p className="mt-3 text-lg font-bold text-white">Level Up!</p>
        <p className="text-sm text-primary font-medium">{name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {type === "manager" ? "Manager" : "Spieler"} ist jetzt Level{" "}
          {newLevel}
        </p>
      </div>

      <style jsx global>{`
        @keyframes level-pulse {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.2);
          }
          50% {
            box-shadow: 0 0 50px rgba(var(--primary-rgb), 0.5);
          }
        }
      `}</style>
    </div>
  );
}
