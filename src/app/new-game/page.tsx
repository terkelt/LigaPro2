"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, User, Trophy, Minus, Plus, Zap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadTeams } from "@/lib/data-loader";
import { TeamLogo } from "@/components/ui/team-logo";
import { useGameStore } from "@/store/game-store";
import { Team } from "@/types/team";
import { ManagerProfile, ManagerSkills, SKILL_NAMES } from "@/types/manager";
import { createDefaultManagerStats, generateWeeklyMissions } from "@/lib/manager-engine";
import { GameStartSplash } from "@/components/game/GameStartSplash";

const NATIONALITIES = [
  "Deutschland", "Österreich", "Schweiz", "Niederlande", "Frankreich",
  "Spanien", "Italien", "England", "Portugal", "Brasilien",
  "Argentinien", "Türkei", "Kroatien", "Serbien", "Polen",
];

const ALL_TEAMS = loadTeams();

const LEAGUE_INFO: { id: string; label: string; country: string; flag: string }[] = [
  { id: 'bundesliga', label: '1. Bundesliga', country: 'Deutschland', flag: '🇩🇪' },
  { id: 'zweite-liga', label: '2. Bundesliga', country: 'Deutschland', flag: '🇩🇪' },
  { id: 'dritte-liga', label: '3. Liga', country: 'Deutschland', flag: '🇩🇪' },
  { id: 'premier-league', label: 'Premier League', country: 'England', flag: '🏴\u200d' },
  { id: 'la-liga', label: 'La Liga', country: 'Spanien', flag: '🇪🇸' },
  { id: 'serie-a', label: 'Serie A', country: 'Italien', flag: '🇮🇹' },
  { id: 'ligue-1', label: 'Ligue 1', country: 'Frankreich', flag: '🇫🇷' },
  { id: 'eredivisie', label: 'Eredivisie', country: 'Niederlande', flag: '🇳🇱' },
  { id: 'primeira-liga', label: 'Liga Portugal', country: 'Portugal', flag: '🇵🇹' },
  { id: 'belgian-pro-league', label: 'Jupiler Pro League', country: 'Belgien', flag: '🇧🇪' },
  { id: 'scottish-premiership', label: 'Premiership', country: 'Schottland', flag: '🏴\u200d' },
];

const TEAMS_BY_LEAGUE: Record<string, Team[]> = {};
for (const li of LEAGUE_INFO) {
  TEAMS_BY_LEAGUE[li.id] = ALL_TEAMS.filter((t) => t.league === li.id);
}

function formatBudget(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} Mio. €`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k €`;
  return `${amount} €`;
}

function getStars(reputation: number): string {
  if (reputation >= 90) return "★★★★★";
  if (reputation >= 75) return "★★★★☆";
  if (reputation >= 60) return "★★★☆☆";
  if (reputation >= 45) return "★★☆☆☆";
  return "★☆☆☆☆";
}

function getDifficulty(reputation: number): { label: string; color: string } {
  if (reputation >= 85) return { label: "Leicht", color: "text-green-400" };
  if (reputation >= 70) return { label: "Mittel", color: "text-yellow-400" };
  if (reputation >= 55) return { label: "Schwer", color: "text-orange-400" };
  return { label: "Sehr Schwer", color: "text-red-400" };
}

const TOTAL_SKILL_POINTS = 32;
const MIN_SKILL = 1;
const MAX_SKILL = 10;
const DEFAULT_SKILL = 3;

const MANAGER_ARCHETYPES: { label: string; icon: string; desc: string; skills: ManagerSkills }[] = [
  {
    label: 'Taktiker', icon: '🧠', desc: 'Starke taktische Fähigkeiten und Disziplin',
    skills: { tactics: 8, motivation: 4, negotiation: 3, youthDev: 2, fitness: 5, scouting: 3, media: 2, discipline: 5 },
  },
  {
    label: 'Motivator', icon: '🔥', desc: 'Inspiriert das Team zu Höchstleistungen',
    skills: { tactics: 4, motivation: 8, negotiation: 3, youthDev: 3, fitness: 4, scouting: 2, media: 5, discipline: 3 },
  },
  {
    label: 'Jugendtrainer', icon: '🌱', desc: 'Fokus auf Nachwuchsförderung und Scouting',
    skills: { tactics: 3, motivation: 4, negotiation: 2, youthDev: 8, fitness: 3, scouting: 7, media: 2, discipline: 3 },
  },
  {
    label: 'Geschäftsmann', icon: '🤝', desc: 'Meister der Verhandlungen und Medien',
    skills: { tactics: 3, motivation: 3, negotiation: 8, youthDev: 2, fitness: 3, scouting: 3, media: 7, discipline: 3 },
  },
];

export default function NewGamePage() {
  const router = useRouter();
  const initNewGame = useGameStore((s) => s.initNewGame);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Manager profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDay, setBirthDay] = useState("15");
  const [birthMonth, setBirthMonth] = useState("6");
  const [birthYear, setBirthYear] = useState("1985");
  const [nationality, setNationality] = useState("Deutschland");
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  // Load saved manager profile on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('liga-pro-manager-profile');
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        setHasSavedProfile(true);
      } catch { /* ignore */ }
    }
  }, []);

  const loadSavedProfile = useCallback(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('liga-pro-manager-profile');
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        if (profile.dateOfBirth) {
          const [y, m, d] = profile.dateOfBirth.split('-');
          setBirthYear(y);
          setBirthMonth(String(parseInt(m)));
          setBirthDay(String(parseInt(d)));
        }
        setNationality(profile.nationality || 'Deutschland');
      } catch { /* ignore */ }
    }
  }, []);

  // Skill distribution
  const [skills, setSkills] = useState<ManagerSkills>({
    tactics: DEFAULT_SKILL, motivation: DEFAULT_SKILL, negotiation: DEFAULT_SKILL,
    youthDev: DEFAULT_SKILL, fitness: DEFAULT_SKILL, scouting: DEFAULT_SKILL,
    media: DEFAULT_SKILL, discipline: DEFAULT_SKILL,
  });

  const usedPoints = Object.values(skills).reduce((a, b) => a + b, 0);
  const remainingPoints = TOTAL_SKILL_POINTS - usedPoints;

  const adjustSkill = useCallback((key: keyof ManagerSkills, delta: number) => {
    setSkills(prev => {
      const newVal = prev[key] + delta;
      if (newVal < MIN_SKILL || newVal > MAX_SKILL) return prev;
      const newUsed = usedPoints + delta;
      if (newUsed > TOTAL_SKILL_POINTS) return prev;
      return { ...prev, [key]: newVal };
    });
  }, [usedPoints]);

  const applyArchetype = useCallback((archetype: typeof MANAGER_ARCHETYPES[0]) => {
    setSkills({ ...archetype.skills });
  }, []);

  const resetSkills = useCallback(() => {
    setSkills({
      tactics: DEFAULT_SKILL, motivation: DEFAULT_SKILL, negotiation: DEFAULT_SKILL,
      youthDev: DEFAULT_SKILL, fitness: DEFAULT_SKILL, scouting: DEFAULT_SKILL,
      media: DEFAULT_SKILL, discipline: DEFAULT_SKILL,
    });
  }, []);

  // Team selection
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState("bundesliga");

  // Splash screen
  const [showSplash, setShowSplash] = useState(false);
  const [splashManager, setSplashManager] = useState<ManagerProfile | null>(null);

  const canProceedStep1 = firstName.trim().length > 0 && lastName.trim().length > 0;

  function handleStartGame() {
    if (!selectedTeamId) return;

    const manager: ManagerProfile = {
      firstName,
      lastName,
      dateOfBirth: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
      nationality,
      avatarSeed: Math.floor(Math.random() * 100000),
      reputation: 30,
      currentTeamId: selectedTeamId,
      contractUntil: '2027-06-30',
      salary: 500000,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      skills,
      traits: [],
      activeMissions: generateWeeklyMissions('2025-07-01', []),
      completedMissionIds: [],
      missionsCompletedTotal: 0,
      lastMissionRefresh: '2025-07-01',
      career: [],
      achievements: [],
      stats: createDefaultManagerStats(),
    };

    // Save manager profile to localStorage for future games
    if (typeof window !== 'undefined') {
      localStorage.setItem('liga-pro-manager-profile', JSON.stringify({
        firstName: manager.firstName,
        lastName: manager.lastName,
        dateOfBirth: manager.dateOfBirth,
        nationality: manager.nationality,
      }));
    }

    initNewGame(manager, selectedTeamId);
    setSplashManager(manager);
    setShowSplash(true);
  }

  const selectedTeam = ALL_TEAMS.find((t) => t.id === selectedTeamId);

  if (showSplash && splashManager && selectedTeam) {
    return (
      <GameStartSplash
        team={selectedTeam}
        manager={splashManager}
        onComplete={() => setShowSplash(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold">Neues Spiel</h1>
            <p className="text-sm text-muted-foreground">
              Schritt {step} von 3 – {step === 1 ? "Manager-Profil" : step === 2 ? "Skill-Verteilung" : "Vereinsauswahl"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-primary" : "bg-border"}`} />
        </div>

        {/* Step 1: Manager Profile */}
        {step === 1 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Manager-Profil erstellen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasSavedProfile && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSavedProfile}
                    className="gap-2"
                  >
                    <User className="w-4 h-4" />
                    Gespeichertes Profil laden
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="z.B. Thomas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="z.B. Müller"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Geburtsdatum</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={birthDay} onValueChange={setBirthDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={birthMonth} onValueChange={setBirthMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Monat" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {[
                        { v: '1', l: 'Jan' }, { v: '2', l: 'Feb' }, { v: '3', l: 'Mär' },
                        { v: '4', l: 'Apr' }, { v: '5', l: 'Mai' }, { v: '6', l: 'Jun' },
                        { v: '7', l: 'Jul' }, { v: '8', l: 'Aug' }, { v: '9', l: 'Sep' },
                        { v: '10', l: 'Okt' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dez' },
                      ].map((m) => (
                        <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={birthYear} onValueChange={setBirthYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Jahr" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {Array.from({ length: 50 }, (_, i) => String(1950 + i)).reverse().map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nationalität</Label>
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NATIONALITIES.map((nat) => (
                        <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="gap-2"
                >
                  Weiter zu Skills
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Skill Distribution */}
        {step === 2 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Manager-Skills verteilen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Points remaining */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div>
                  <p className="text-sm font-medium">Verfügbare Punkte</p>
                  <p className="text-[10px] text-muted-foreground">Verteile {TOTAL_SKILL_POINTS} Punkte auf 8 Skills (je {MIN_SKILL}-{MAX_SKILL})</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold font-mono ${remainingPoints === 0 ? 'text-green-400' : remainingPoints < 0 ? 'text-red-400' : 'text-primary'}`}>
                    {remainingPoints}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{usedPoints}/{TOTAL_SKILL_POINTS} verteilt</p>
                </div>
              </div>

              {/* Archetypes */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Schnellauswahl — Archetyp wählen:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {MANAGER_ARCHETYPES.map(arch => (
                    <button
                      key={arch.label}
                      onClick={() => applyArchetype(arch)}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                    >
                      <p className="text-lg mb-0.5">{arch.icon}</p>
                      <p className="text-xs font-bold">{arch.label}</p>
                      <p className="text-[9px] text-muted-foreground">{arch.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill sliders */}
              <div className="space-y-3">
                {(Object.entries(SKILL_NAMES) as [keyof ManagerSkills, typeof SKILL_NAMES[keyof ManagerSkills]][]).map(([key, info]) => {
                  const val = skills[key];
                  const pct = ((val - MIN_SKILL) / (MAX_SKILL - MIN_SKILL)) * 100;
                  const barColor = val >= 7 ? 'bg-emerald-500' : val >= 5 ? 'bg-primary' : val >= 3 ? 'bg-yellow-500' : 'bg-orange-500';
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-lg w-7 text-center">{info.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium">{info.name}</span>
                          <span className="text-[9px] text-muted-foreground">{info.desc}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => adjustSkill(key, -1)}
                            disabled={val <= MIN_SKILL}
                            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${barColor} transition-all duration-200`} style={{ width: `${pct}%` }} />
                          </div>
                          <button
                            onClick={() => adjustSkill(key, 1)}
                            disabled={val >= MAX_SKILL || remainingPoints <= 0}
                            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold font-mono w-6 text-center">{val}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset + Continue */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={resetSkills} className="gap-1 text-xs">
                  <RotateCcw className="w-3 h-3" />Zurücksetzen
                </Button>
                <Button
                  disabled={remainingPoints < 0}
                  onClick={() => setStep(3)}
                  className="gap-2"
                >
                  Weiter zur Vereinsauswahl
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Team Selection */}
        {step === 3 && (
          <div className="space-y-6">
            <Tabs value={activeLeague} onValueChange={setActiveLeague}>
              <div className="overflow-x-auto pb-2">
                <TabsList className="inline-flex w-auto min-w-full gap-1">
                  {LEAGUE_INFO.map((li) => (
                    <TabsTrigger key={li.id} value={li.id} className="text-xs whitespace-nowrap px-3">
                      {li.flag} {li.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {Object.entries(TEAMS_BY_LEAGUE).map(([leagueId, teams]) => (
                <TabsContent key={leagueId} value={leagueId} className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teams.map((team) => {
                      const isSelected = selectedTeamId === team.id;
                      const difficulty = getDifficulty(team.reputation);
                      return (
                        <Card
                          key={team.id}
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                          onClick={() => setSelectedTeamId(team.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={36} />
                                <div>
                                  <h3 className="font-semibold text-sm">{team.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">{team.stadium.city}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-accent">{getStars(team.reputation)}</span>
                                <p className={`text-[10px] font-medium ${difficulty.color}`}>
                                  {difficulty.label}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                              <span className="text-xs text-muted-foreground">Budget</span>
                              <span className="text-xs font-medium text-primary">
                                {formatBudget(team.budget)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Selected team summary + Start button */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                {selectedTeam ? (
                  <div className="flex items-center gap-3">
                    <TeamLogo teamId={selectedTeam.id} teamName={selectedTeam.name} shortName={selectedTeam.shortName} colors={selectedTeam.colors} size={32} />
                    <div>
                      <p className="font-semibold text-sm">{selectedTeam.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedTeam.stadium.name} | Budget: {formatBudget(selectedTeam.budget)} | {getDifficulty(selectedTeam.reputation).label}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Wähle einen Verein aus</p>
                )}
              </div>
              <Button
                disabled={!selectedTeamId}
                onClick={handleStartGame}
                className="gap-2"
                size="lg"
              >
                <Trophy className="w-4 h-4" />
                Spiel starten
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
