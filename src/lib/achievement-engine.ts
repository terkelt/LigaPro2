/**
 * Achievement Engine — checks and awards achievements based on game state.
 *
 * Achievements are checked daily in day-advance.
 * Each achievement has a unique ID, condition check, and reward.
 */
import { GameState } from '@/types/game';
import { Achievement } from '@/types/manager';
import { NewsItem } from '@/types/news';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: import('@/types/manager').AchievementCategory;
  points: number;
  check: (state: GameState) => boolean;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_win', name: 'Erster Sieg', description: 'Gewinne dein erstes Ligaspiel.',
    icon: '🏆', category: 'league', points: 50,
    check: (s) => s.manager.stats.wins >= 1,
  },
  {
    id: 'ten_wins', name: '10 Siege', description: 'Gewinne 10 Ligaspiele.',
    icon: '⭐', category: 'league', points: 100,
    check: (s) => s.manager.stats.wins >= 10,
  },
  {
    id: 'fifty_wins', name: '50 Siege', description: 'Gewinne 50 Ligaspiele.',
    icon: '🌟', category: 'league', points: 300,
    check: (s) => s.manager.stats.wins >= 50,
  },
  {
    id: 'first_title', name: 'Meister!', description: 'Gewinne deine erste Meisterschaft.',
    icon: '🥇', category: 'league', points: 500,
    check: (s) => s.manager.stats.titlesWon >= 1,
  },
  {
    id: 'promotion', name: 'Aufstieg!', description: 'Steige mit deinem Team auf.',
    icon: '📈', category: 'league', points: 300,
    check: (s) => s.manager.stats.promotions >= 1,
  },
  {
    id: 'cup_winner', name: 'Pokalsieger', description: 'Gewinne den nationalen Pokalwettbewerb.',
    icon: '🏅', category: 'cup', points: 400,
    check: (s) => s.cupState.winnerId === s.currentTeamId,
  },
  {
    id: 'unbeaten_5', name: 'Ungeschlagen (5)', description: '5 Spiele in Folge ungeschlagen.',
    icon: '🔥', category: 'records', points: 75,
    check: (s) => (s.manager.stats.currentWinStreak ?? 0) >= 5,
  },
  {
    id: 'clean_sheet_5', name: 'Weiße Weste', description: '5 Spiele ohne Gegentor.',
    icon: '🧤', category: 'records', points: 100,
    check: (s) => s.manager.stats.cleanSheets >= 5,
  },
  {
    id: 'youth_promote_3', name: 'Jugendarbeit', description: 'Befördere 3 Jugendspieler in den Profikader.',
    icon: '🎓', category: 'youth', points: 150,
    check: (s) => {
      const youthPromotions = s.news.filter(n => n.type === 'youth' && n.title.startsWith('Beförderung'));
      return youthPromotions.length >= 3;
    },
  },
  {
    id: 'big_transfer', name: 'Großer Deal', description: 'Tätige einen Transfer über 10 Mio. €.',
    icon: '💰', category: 'transfers', points: 100,
    check: (s) => s.transfers.completed.some(t => t.fee >= 10_000_000),
  },
  {
    id: 'squad_depth', name: 'Breiter Kader', description: 'Habe mindestens 25 Spieler im Kader.',
    icon: '👥', category: 'manager', points: 50,
    check: (s) => s.players.filter(p => p.teamId === s.currentTeamId && !p.isLoaned).length >= 25,
  },
  {
    id: 'full_staff', name: 'Volles Team', description: 'Stelle alle 6 Staff-Positionen ein.',
    icon: '🏢', category: 'manager', points: 75,
    check: (s) => {
      const roles = new Set(s.staff.map(st => st.role));
      return roles.size >= 6;
    },
  },
  {
    id: 'stadium_upgrade', name: 'Bauherr', description: 'Schließe ein Stadion-Upgrade ab.',
    icon: '🏗️', category: 'manager', points: 100,
    check: (s) => s.stadiumUpgrades.some(u => u.isCompleted),
  },
  {
    id: 'sponsor_main', name: 'Hauptsponsor', description: 'Schließe einen Hauptsponsor-Vertrag ab.',
    icon: '🤝', category: 'transfers', points: 75,
    check: (s) => s.sponsors.some(sp => sp.type === 'trikot' && sp.isActive),
  },
  {
    id: 'season_2', name: 'Zweite Saison', description: 'Starte deine zweite Saison.',
    icon: '📅', category: 'manager', points: 100,
    check: (s) => s.season.number >= 2,
  },
  {
    id: 'season_5', name: 'Veteran', description: 'Erreiche Saison 5.',
    icon: '🎖️', category: 'manager', points: 300,
    check: (s) => s.season.number >= 5,
  },
];

/**
 * Check all achievements and award any newly unlocked ones.
 * Called from day-advance (weekly, on Sundays).
 */
export function checkAchievements(state: GameState): GameState {
  const d = new Date(state.currentDate);
  // Only check on Sundays to avoid performance overhead
  if (d.getDay() !== 0) return state;

  const unlockedIds = new Set(state.achievements.filter(a => a.isUnlocked).map(a => a.id));
  const newlyUnlocked: Achievement[] = [];
  const news: NewsItem[] = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (unlockedIds.has(def.id)) continue;

    try {
      if (def.check(state)) {
        newlyUnlocked.push({
          id: def.id,
          name: def.name,
          description: def.description,
          category: def.category,
          icon: def.icon,
          points: def.points,
          isUnlocked: true,
          unlockedDate: state.currentDate,
        });

        news.push({
          id: `achievement-${def.id}`,
          type: 'milestone',
          title: `Achievement: ${def.name}`,
          content: `${def.description} (+${def.points} XP)`,
          date: state.currentDate,
          isRead: false,
          relatedTeamId: state.currentTeamId,
          importance: 'high',
        });
      }
    } catch {
      // Skip achievements that fail to check (defensive)
    }
  }

  if (newlyUnlocked.length === 0) return state;

  // Award XP to manager
  const totalXP = newlyUnlocked.reduce((sum, a) => sum + a.points, 0);
  let updatedManager = { ...state.manager };
  updatedManager.xp = (updatedManager.xp ?? 0) + totalXP;

  // Level up check
  while (updatedManager.xp >= updatedManager.xpToNextLevel) {
    updatedManager.xp -= updatedManager.xpToNextLevel;
    updatedManager.level = (updatedManager.level ?? 1) + 1;
    updatedManager.xpToNextLevel = Math.round(updatedManager.xpToNextLevel * 1.2);
  }

  // Merge new achievements with existing
  const updatedAchievements = [...state.achievements];
  for (const newA of newlyUnlocked) {
    const existingIdx = updatedAchievements.findIndex(a => a.id === newA.id);
    if (existingIdx >= 0) {
      updatedAchievements[existingIdx] = newA;
    } else {
      updatedAchievements.push(newA);
    }
  }

  return {
    ...state,
    achievements: updatedAchievements,
    manager: updatedManager,
    news: [...state.news, ...news],
  };
}

/**
 * Get all achievement definitions with their unlock status.
 */
export function getAllAchievements(state: GameState): (AchievementDef & { isUnlocked: boolean; unlockedDate?: string })[] {
  const unlockedMap = new Map(state.achievements.filter(a => a.isUnlocked).map(a => [a.id, a.unlockedDate]));

  return ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    isUnlocked: unlockedMap.has(def.id),
    unlockedDate: unlockedMap.get(def.id),
  }));
}
