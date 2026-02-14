"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, User, Trophy } from "lucide-react";
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
import { ManagerProfile } from "@/types/manager";
import { createDefaultManagerSkills, createDefaultManagerStats, generateWeeklyMissions } from "@/lib/manager-engine";
import { GameStartSplash } from "@/components/game/GameStartSplash";

const NATIONALITIES = [
  "Deutschland", "Österreich", "Schweiz", "Niederlande", "Frankreich",
  "Spanien", "Italien", "England", "Portugal", "Brasilien",
  "Argentinien", "Türkei", "Kroatien", "Serbien", "Polen",
];

const ALL_TEAMS = loadTeams();
const TEAMS_BY_LEAGUE: Record<string, Team[]> = {
  bundesliga: ALL_TEAMS.filter((t) => t.league === "bundesliga"),
  "zweite-liga": ALL_TEAMS.filter((t) => t.league === "zweite-liga"),
  "dritte-liga": ALL_TEAMS.filter((t) => t.league === "dritte-liga"),
};

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

export default function NewGamePage() {
  const router = useRouter();
  const initNewGame = useGameStore((s) => s.initNewGame);
  const [step, setStep] = useState<1 | 2>(1);

  // Manager profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("1985");
  const [nationality, setNationality] = useState("Deutschland");

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
      dateOfBirth: `${birthYear}-01-15`,
      nationality,
      avatarSeed: Math.floor(Math.random() * 100000),
      reputation: 30,
      currentTeamId: selectedTeamId,
      contractUntil: '2027-06-30',
      salary: 500000,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      skills: createDefaultManagerSkills(),
      traits: [],
      activeMissions: generateWeeklyMissions('2025-07-01', []),
      completedMissionIds: [],
      missionsCompletedTotal: 0,
      lastMissionRefresh: '2025-07-01',
      career: [],
      achievements: [],
      stats: createDefaultManagerStats(),
    };

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
            onClick={() => (step === 1 ? router.back() : setStep(1))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold">Neues Spiel</h1>
            <p className="text-sm text-muted-foreground">
              Schritt {step} von 2 – {step === 1 ? "Manager-Profil" : "Vereinsauswahl"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`} />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Geburtsjahr</Label>
                  <Select value={birthYear} onValueChange={setBirthYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 40 }, (_, i) => String(1960 + i)).map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  Weiter zur Vereinsauswahl
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Team Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <Tabs value={activeLeague} onValueChange={setActiveLeague}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bundesliga">1. Bundesliga</TabsTrigger>
                <TabsTrigger value="zweite-liga">2. Bundesliga</TabsTrigger>
                <TabsTrigger value="dritte-liga">3. Liga</TabsTrigger>
              </TabsList>

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
