"use client";

import { useMemo, useState } from "react";
import { Player, PlayerAttributes } from "@/types/player";
import { calcOverall } from "@/store/selectors";
import { X, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  players: Player[];
  initialPlayerA?: string;
  initialPlayerB?: string;
  onClose: () => void;
}

const ATTR_GROUPS: { label: string; attrs: { key: keyof PlayerAttributes; label: string }[] }[] = [
  {
    label: "Technik",
    attrs: [
      { key: "ballControl", label: "Ballkontrolle" },
      { key: "dribbling", label: "Dribbling" },
      { key: "passing", label: "Passen" },
      { key: "crossing", label: "Flanken" },
      { key: "shooting", label: "Schuss" },
      { key: "finishing", label: "Abschluss" },
      { key: "longShots", label: "Fernschuss" },
      { key: "freeKick", label: "Freistoß" },
      { key: "heading", label: "Kopfball" },
    ],
  },
  {
    label: "Physis",
    attrs: [
      { key: "pace", label: "Tempo" },
      { key: "acceleration", label: "Beschleunigung" },
      { key: "stamina", label: "Ausdauer" },
      { key: "strength", label: "Stärke" },
      { key: "jumping", label: "Sprungkraft" },
    ],
  },
  {
    label: "Mental",
    attrs: [
      { key: "vision", label: "Übersicht" },
      { key: "composure", label: "Gelassenheit" },
      { key: "aggression", label: "Aggression" },
      { key: "positioning", label: "Stellungsspiel" },
      { key: "workRate", label: "Einsatz" },
      { key: "leadership", label: "Führung" },
    ],
  },
  {
    label: "Torwart",
    attrs: [
      { key: "reflexes", label: "Reflexe" },
      { key: "handling", label: "Fangen" },
      { key: "diving", label: "Hechten" },
      { key: "kicking", label: "Abschlag" },
      { key: "oneOnOne", label: "1-gegen-1" },
    ],
  },
];

function attrColor(val: number): string {
  if (val >= 80) return "text-green-400";
  if (val >= 65) return "text-yellow-400";
  if (val >= 50) return "text-orange-400";
  return "text-red-400";
}

function diffColor(diff: number): string {
  if (diff > 0) return "text-green-400";
  if (diff < 0) return "text-red-400";
  return "text-muted-foreground";
}

function getAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

export function PlayerCompare({ players, initialPlayerA, initialPlayerB, onClose }: Props) {
  const [playerAId, setPlayerAId] = useState(initialPlayerA ?? "");
  const [playerBId, setPlayerBId] = useState(initialPlayerB ?? "");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  const playerA = useMemo(() => players.find(p => p.id === playerAId) ?? null, [players, playerAId]);
  const playerB = useMemo(() => players.find(p => p.id === playerBId) ?? null, [players, playerBId]);

  const filteredA = useMemo(() => {
    if (!searchA) return players.slice(0, 15);
    const q = searchA.toLowerCase();
    return players.filter(p => p.lastName.toLowerCase().includes(q) || p.firstName.toLowerCase().includes(q)).slice(0, 15);
  }, [players, searchA]);

  const filteredB = useMemo(() => {
    if (!searchB) return players.slice(0, 15);
    const q = searchB.toLowerCase();
    return players.filter(p => p.lastName.toLowerCase().includes(q) || p.firstName.toLowerCase().includes(q)).slice(0, 15);
  }, [players, searchB]);

  const ovrA = playerA ? calcOverall(playerA) : 0;
  const ovrB = playerB ? calcOverall(playerB) : 0;

  const isGK = playerA?.position === "TW" || playerB?.position === "TW";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] mx-4 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" /> Spielervergleich
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Selectors */}
        <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b border-border shrink-0">
          {/* Player A */}
          <div>
            <input
              type="text"
              placeholder="Spieler A suchen..."
              value={playerA ? `${playerA.firstName.charAt(0)}. ${playerA.lastName}` : searchA}
              onChange={(e) => { setSearchA(e.target.value); setPlayerAId(""); }}
              onFocus={() => { setSearchA(""); setPlayerAId(""); }}
              className="w-full px-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg focus:outline-none focus:border-primary"
            />
            {!playerA && (
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                {filteredA.map(p => (
                  <button key={p.id} onClick={() => { setPlayerAId(p.id); setSearchA(""); }}
                    className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-secondary/50 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-6">{calcOverall(p)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground w-6">{p.position}</span>
                    <span className="truncate">{p.firstName.charAt(0)}. {p.lastName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Player B */}
          <div>
            <input
              type="text"
              placeholder="Spieler B suchen..."
              value={playerB ? `${playerB.firstName.charAt(0)}. ${playerB.lastName}` : searchB}
              onChange={(e) => { setSearchB(e.target.value); setPlayerBId(""); }}
              onFocus={() => { setSearchB(""); setPlayerBId(""); }}
              className="w-full px-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg focus:outline-none focus:border-primary"
            />
            {!playerB && (
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                {filteredB.map(p => (
                  <button key={p.id} onClick={() => { setPlayerBId(p.id); setSearchB(""); }}
                    className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-secondary/50 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-6">{calcOverall(p)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground w-6">{p.position}</span>
                    <span className="truncate">{p.firstName.charAt(0)}. {p.lastName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comparison */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {playerA && playerB ? (
            <div className="space-y-4">
              {/* Overview */}
              <div className="grid grid-cols-3 text-center gap-2">
                <div>
                  <p className={`text-3xl font-display font-bold ${ovrA > ovrB ? "text-green-400" : ovrA < ovrB ? "text-red-400" : ""}`}>{ovrA}</p>
                  <p className="text-xs text-muted-foreground">{playerA.position} • {getAge(playerA.dateOfBirth)}J</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">GES</p>
                  <p className="text-sm font-bold mt-1">vs</p>
                </div>
                <div>
                  <p className={`text-3xl font-display font-bold ${ovrB > ovrA ? "text-green-400" : ovrB < ovrA ? "text-red-400" : ""}`}>{ovrB}</p>
                  <p className="text-xs text-muted-foreground">{playerB.position} • {getAge(playerB.dateOfBirth)}J</p>
                </div>
              </div>

              {/* Stats comparison */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                {[
                  { label: "Tore", a: playerA.stats.goals, b: playerB.stats.goals },
                  { label: "Vorlagen", a: playerA.stats.assists, b: playerB.stats.assists },
                  { label: "Spiele", a: playerA.stats.appearances, b: playerB.stats.appearances },
                  { label: "Ø Note", a: playerA.stats.avgRating, b: playerB.stats.avgRating },
                  { label: "Marktwert", a: playerA.marketValue, b: playerB.marketValue },
                  { label: "Gehalt", a: playerA.salary, b: playerB.salary },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between px-2 py-1.5 bg-secondary/20 rounded">
                    <span className={`font-mono font-bold ${s.a > s.b ? "text-green-400" : s.a < s.b ? "text-red-400" : ""}`}>
                      {typeof s.a === "number" && s.a >= 1000 ? `${(s.a / 1000).toFixed(0)}k` : s.a}
                    </span>
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-mono font-bold ${s.b > s.a ? "text-green-400" : s.b < s.a ? "text-red-400" : ""}`}>
                      {typeof s.b === "number" && s.b >= 1000 ? `${(s.b / 1000).toFixed(0)}k` : s.b}
                    </span>
                  </div>
                ))}
              </div>

              {/* Attribute Groups */}
              {ATTR_GROUPS.filter(g => isGK || g.label !== "Torwart").map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{group.label}</p>
                  <div className="space-y-1">
                    {group.attrs.map(attr => {
                      const valA = playerA.attributes[attr.key];
                      const valB = playerB.attributes[attr.key];
                      const diff = valA - valB;
                      const maxVal = Math.max(valA, valB, 1);
                      return (
                        <div key={attr.key} className="flex items-center gap-2 text-[11px]">
                          <span className={`font-mono font-bold w-6 text-right ${attrColor(valA)}`}>{valA}</span>
                          <div className="flex-1 flex h-1.5 gap-0.5">
                            <div className="flex-1 flex justify-end">
                              <div className={`h-full rounded-l-full ${valA >= valB ? "bg-green-500/60" : "bg-red-500/40"}`} style={{ width: `${(valA / maxVal) * 100}%` }} />
                            </div>
                            <div className="flex-1">
                              <div className={`h-full rounded-r-full ${valB >= valA ? "bg-green-500/60" : "bg-red-500/40"}`} style={{ width: `${(valB / maxVal) * 100}%` }} />
                            </div>
                          </div>
                          <span className={`font-mono font-bold w-6 ${attrColor(valB)}`}>{valB}</span>
                          <span className="text-muted-foreground w-20 truncate">{attr.label}</span>
                          <span className={`font-mono text-[9px] w-6 text-right ${diffColor(diff)}`}>
                            {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "="}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowRightLeft className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm">Wähle zwei Spieler zum Vergleich aus</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border shrink-0">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>
    </div>
  );
}
