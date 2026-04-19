"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Wochentraining</h1>
        <span className="text-xs text-muted-foreground">
          Training wird jeden <span className="text-primary font-medium">Montag</span> automatisch ausgeführt
        </span>
      </div>

      {/* Training selection grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TRAINING_CATALOG.map((def) => (
          <TrainingCard
            key={def.id}
            def={def}
            isSelected={selected === def.id}
            onSelect={() => handleSelect(def.id)}
          />
        ))}
      </div>

      {/* Selected training detail */}
      <Card className="bg-card border-border border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            Aktives Training: <span className="text-primary">{selectedDef.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{selectedDef.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positive effects */}
            {selectedDef.positiveEffects.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Verbesserungen
                </p>
                {selectedDef.positiveEffects.map((eff) => (
                  <div key={eff.attribute} className="flex items-center justify-between text-sm">
                    <span>{eff.label}</span>
                    <span className="text-green-400 font-mono font-bold">+{eff.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Negative effects */}
            {selectedDef.negativeEffects.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-red-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Verschlechterungen
                </p>
                {selectedDef.negativeEffects.map((eff) => (
                  <div key={eff.attribute} className="flex items-center justify-between text-sm">
                    <span>{eff.label}</span>
                    <span className="text-red-400 font-mono font-bold">{eff.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50 text-xs">
            <span className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-3 h-3" /> {selectedDef.xpReward} XP
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Heart className="w-3 h-3" />
              Kondition: {selectedDef.conditionCost > 0 ? `-${selectedDef.conditionCost}` : `+${Math.abs(selectedDef.conditionCost)}`}
            </span>
            {selectedDef.moraleEffect !== 0 && (
              <span className={`flex items-center gap-1 ${selectedDef.moraleEffect > 0 ? "text-green-400" : "text-red-400"}`}>
                Moral: {selectedDef.moraleEffect > 0 ? "+" : ""}{selectedDef.moraleEffect}
              </span>
            )}
            {selectedDef.injuryRiskPercent > 0 && (
              <span className="flex items-center gap-1 text-orange-400">
                <AlertTriangle className="w-3 h-3" /> {selectedDef.injuryRiskPercent}% Verletzungsrisiko
              </span>
            )}
            {selectedDef.gkOnly && (
              <span className="text-blue-400">Nur Torhüter</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" /> Trainingshistorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {history.map((h, i) => {
                const def = TRAINING_CATALOG.find((t) => t.id === h.type);
                return (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-secondary/30 border border-border/50">
                    <span className="text-muted-foreground">{h.week}</span>
                    <span className="ml-1.5">{def?.icon} {def?.name}</span>
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

function TrainingCard({ def, isSelected, onSelect }: { def: TrainingDefinition; isSelected: boolean; onSelect: () => void }) {
  return (
    <Card
      className={`bg-card border-border cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? "ring-2 ring-primary border-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{def.icon}</span>
          {isSelected && <Check className="w-4 h-4 text-primary" />}
        </div>
        <h3 className="text-sm font-bold mb-1">{def.name}</h3>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-yellow-400">{def.xpReward} XP</span>
          {def.positiveEffects.length > 0 && (
            <span className="text-green-400">+{def.positiveEffects.length} Buffs</span>
          )}
          {def.negativeEffects.length > 0 && (
            <span className="text-red-400">{def.negativeEffects.length} Debuffs</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
