export interface ManagerProfile {
  firstName: string;
  lastName: string;
  nickname?: string;
  dateOfBirth: string;
  nationality: string;
  avatarSeed: number;
  reputation: number;       // 1-100
  currentTeamId: string;
  contractUntil: string;
  salary: number;

  // Progression
  level: number;            // 1-50
  xp: number;
  xpToNextLevel: number;

  // Manager Skills (1-20 each, grow through actions)
  skills: ManagerSkills;

  // Earned traits (max 5 active)
  traits: ManagerTrait[];

  // Weekly missions
  activeMissions: WeeklyMission[];
  completedMissionIds: string[];
  missionsCompletedTotal: number;
  lastMissionRefresh: string; // date when missions were last refreshed

  career: CareerEntry[];
  achievements: Achievement[];
  stats: ManagerStats;
}

// ── Manager Skills ──

export interface ManagerSkills {
  tactics: number;          // Taktikverständnis — better formation effects
  motivation: number;       // Motivationsfähigkeit — better morale recovery
  negotiation: number;      // Verhandlungsgeschick — better transfer deals
  youthDev: number;         // Jugendförderung — faster youth development
  fitness: number;          // Fitnesssteuerung — less injuries, better stamina
  scouting: number;         // Spielerkenntnis — better scouting accuracy
  media: number;            // Medienkompetenz — reputation gain, less pressure
  discipline: number;       // Disziplin — fewer cards, better mentality
}

export const SKILL_NAMES: Record<keyof ManagerSkills, { name: string; icon: string; desc: string }> = {
  tactics: { name: 'Taktik', icon: '🧠', desc: 'Bessere Formationseffekte und taktische Anpassungen' },
  motivation: { name: 'Motivation', icon: '🔥', desc: 'Schnellere Moralerholung und stärkere Ansprachen' },
  negotiation: { name: 'Verhandlung', icon: '🤝', desc: 'Bessere Transferkonditionen und Vertragsverhandlungen' },
  youthDev: { name: 'Jugendarbeit', icon: '🌱', desc: 'Schnellere Entwicklung junger Spieler' },
  fitness: { name: 'Fitness', icon: '💪', desc: 'Weniger Verletzungen und bessere Konditionssteuerung' },
  scouting: { name: 'Scouting', icon: '🔍', desc: 'Genauere Spielerbewertungen und Talenterkennung' },
  media: { name: 'Medien', icon: '📺', desc: 'Besserer Reputationsgewinn und Sponsoreninteresse' },
  discipline: { name: 'Disziplin', icon: '⚖️', desc: 'Weniger Karten und bessere Mannschaftsmentalität' },
};

// ── Manager Traits ──

export type ManagerTraitId =
  | 'motivator' | 'taktikfuchs' | 'jugendfluesterer' | 'transferhai'
  | 'eiserner_wille' | 'publikumsliebling' | 'detailverliebt' | 'glueckspilz'
  | 'festungsbauer' | 'pressing_maschine' | 'talentscout' | 'comeback_koenig';

export interface ManagerTrait {
  id: ManagerTraitId;
  name: string;
  icon: string;
  description: string;
  tier: 1 | 2 | 3;         // Bronze / Silber / Gold
  effect: string;           // Human-readable effect
  unlockedDate?: string;
}

// ── Weekly Missions ──

export type MissionType =
  | 'win_matches' | 'clean_sheets' | 'score_goals' | 'develop_youth'
  | 'no_cards' | 'win_streak' | 'training_sessions' | 'high_possession'
  | 'come_from_behind' | 'use_subs' | 'high_rating_player' | 'budget_profit'
  | 'morale_high' | 'no_injuries' | 'debut_youth' | 'tactical_shout';

export interface WeeklyMission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  icon: string;
  target: number;           // e.g. "win 2 matches" → target=2
  progress: number;
  isCompleted: boolean;
  reward: MissionReward;
  expiresDate: string;
}

export interface MissionReward {
  xp: number;
  skillBoost?: { skill: keyof ManagerSkills; amount: number };
  reputationBoost?: number;
  budgetBonus?: number;
  traitProgress?: ManagerTraitId;
}

export interface CareerEntry {
  teamId: string;
  teamName: string;
  leagueId: string;
  startDate: string;
  endDate?: string;
  reason?: 'hired' | 'resigned' | 'fired' | 'contract_expired';
  bestPosition?: number;
}

export interface ManagerStats {
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  titlesWon: number;
  cupsWon: number;
  promotions: number;
  relegations: number;
  seasonsManaged: number;
  cleanSheets: number;
  comebacks: number;
  winStreak: number;
  currentWinStreak: number;
  youthDebuts: number;
}

export type AchievementCategory =
  | 'league'
  | 'cup'
  | 'international'
  | 'transfers'
  | 'youth'
  | 'records'
  | 'manager'
  | 'fun';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  points: number;
  unlockedDate?: string;
  isUnlocked: boolean;
}

export interface JobOffer {
  id: string;
  teamId: string;
  teamName: string;
  leagueId: string;
  salary: number;
  contractYears: number;
  budget: number;
  expectations: string;
  date: string;
  expiresDate: string;
}
