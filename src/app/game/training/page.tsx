"use client";

import { useMemo } from "react";
import { TRAINING_CATALOG, TrainingType, TrainingDefinition } from "@/types/training";
import { Dumbbell, TrendingUp, TrendingDown, Zap, Heart, AlertTriangle, History, Check } from "lucide-react";
import { useTraining } from "@/store/selectors";
import { useGameStore } from "@/store/game-store";

export default function TrainingPage() {
  const plan = useTraining();
  const setTraining = useGameStore((s) => s.setTraining);

  const selected = plan?.selectedTraining ?? "fitness";

  const selectedDef = useMemo(
    () => TRAINING_CATALOG.find((t) => t.id === selected) ?? TRAINING_CATALOG[0],
    [selected]
  );

  const history = useMemo(() => {
    if (!plan) return [];
    return [...plan.weekHistory].reverse().slice(0, 10);
  }, [plan]);

  function handleSelect(type: TrainingType) {
    if (setTraining) setTraining(type);
  }

  if (!plan) return null;

  return (
    <div className="space-y-4 animate-slide-up max-w-[1400px] mx-auto">
      {/* ═══ Page Header ═══ */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Wochentraining</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Wird jeden <span className="text-primary font-medium">Montag</span> automatisch ausgeführt
          </p>
        </div>
        <div className="metric-badge bg-primary/10 text-primary">
          <Dumbbell className="w-3 h-3" />
          <span>{TRAINING_CATALOG.length} Programme</span>
        </div>
      </div>

      {/* ═══ Training Selection Grid ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 stagger-children">
        {TRAINING_CATALOG.map((def) => (
          <TrainingCard
            key={def.id}
            def={def}
            isSelected={selected === def.id}
            onSelect={() => handleSelect(def.id)}
          />
        ))}
      </div>

      {/* ═══ Selected Training Detail ═══ */}
      <div className="tile overflow-hidden">
        <div className="h-0.5 bg-primary/40" />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-base">
              {selectedDef.icon}
            </div>
            <div className="flex-1">
              <div className="section-label">
                <span>Aktives Training</span>
              </div>
              <h2 className="text-base font-bold tracking-tight text-primary">{selectedDef.name}</h2>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground mb-4">{selectedDef.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Positive effects */}
            {selectedDef.positiveEffects.length > 0 && (
              <div className="surface-inset p-3 space-y-1.5">
                <div className="section-label text-emerald-400/90">
                  <TrendingUp className="w-3 h-3" />
                  <span>Verbesserungen</span>
                </div>
                {selectedDef.positiveEffects.map((eff) => (
                  <div key={eff.attribute} className="flex items-center justify-between text-[12px]">
                    <span className="text-foreground/90">{eff.label}</span>
                    <span className="text-emerald-400 font-mono font-bold">+{eff.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Negative effects */}
            {selectedDef.negativeEffects.length > 0 && (
              <div className="surface-inset p-3 space-y-1.5">
                <div className="section-label text-red-400/90">
                  <TrendingDown className="w-3 h-3" />
                  <span>Verschlechterungen</span>
                </div>
                {selectedDef.negativeEffects.map((eff) => (
                  <div key={eff.attribute} className="flex items-center justify-between text-[12px]">
                    <span className="text-foreground/90">{eff.label}</span>
                    <span className="text-red-400 font-mono font-bold">{eff.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-border/30">
            <span className="metric-badge bg-amber-500/10 text-amber-400">
              <Zap className="w-3 h-3" /> {selectedDef.xpReward} XP
            </span>
            <span className="metric-badge bg-secondary/60 text-muted-foreground">
              <Heart className="w-3 h-3" />
              Kondition {selectedDef.conditionCost > 0 ? `-${selectedDef.conditionCost}` : `+${Math.abs(selectedDef.conditionCost)}`}
            </span>
            {selectedDef.moraleEffect !== 0 && (
              <span className={`metric-badge ${selectedDef.moraleEffect > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                Moral {selectedDef.moraleEffect > 0 ? "+" : ""}{selectedDef.moraleEffect}
              </span>
            )}
            {selectedDef.injuryRiskPercent > 0 && (
              <span className="metric-badge bg-orange-500/10 text-orange-400">
                <AlertTriangle className="w-3 h-3" /> {selectedDef.injuryRiskPercent}% Risiko
              </span>
            )}
            {selectedDef.gkOnly && (
              <span className="metric-badge bg-blue-500/10 text-blue-400">Nur Torhüter</span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ History ═══ */}
      {history.length > 0 && (
        <div className="tile p-4">
          <div className="section-label mb-3">
            <History className="w-3.5 h-3.5" />
            <span>Trainingshistorie</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => {
              const def = TRAINING_CATALOG.find((t) => t.id === h.type);
              return (
                <div key={i} className="text-[11px] px-2 py-1 rounded-lg bg-secondary/40 border border-border/30 flex items-center gap-1.5">
                  <span className="text-muted-foreground font-mono text-[10px]">{h.week}</span>
                  <span>{def?.icon}</span>
                  <span className="font-medium">{def?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrainingCard({ def, isSelected, onSelect }: { def: TrainingDefinition; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`tile-interactive p-3.5 text-left relative ${
        isSelected ? "border-primary/60 bg-primary/8 ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{def.icon}</span>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>
      <h3 className="text-[13px] font-semibold mb-1.5 leading-tight">{def.name}</h3>
      <div className="flex items-center flex-wrap gap-1">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">{def.xpReward} XP</span>
        {def.positiveEffects.length > 0 && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">+{def.positiveEffects.length}</span>
        )}
        {def.negativeEffects.length > 0 && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">−{def.negativeEffects.length}</span>
        )}
      </div>
    </button>
  );
}
