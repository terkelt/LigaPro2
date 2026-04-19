/**
 * Stadium Upgrade Engine — handles stadium construction projects.
 *
 * Upgrade types and their effects:
 *  - capacity: +seats → more ticket income
 *  - vip: +VIP lounges → premium ticket income
 *  - shop: +fan shop → more merchandising income
 *  - training: +training facilities → better training effectiveness
 *  - youth: +youth facilities → better youth talent quality
 *  - medical: +medical facilities → faster injury recovery
 *
 * Construction takes weeks and costs money. Only one project at a time.
 */
import { GameState } from '@/types/game';
import { StadiumUpgrade, StadiumUpgradeType } from '@/types/finance';
import { Team } from '@/types/team';
import { NewsItem } from '@/types/news';

function generateId(): string {
  return 'upg-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export interface UpgradeOption {
  type: StadiumUpgradeType;
  name: string;
  description: string;
  cost: number;
  buildTimeWeeks: number;
  effect: string;
  currentLevel: number;
  maxLevel: number;
  canBuild: boolean;
  reason?: string;
}

/**
 * Get available upgrade options for the player's team.
 */
export function getUpgradeOptions(state: GameState): UpgradeOption[] {
  const team = state.teams.find(t => t.id === state.currentTeamId);
  if (!team) return [];

  const finances = state.finances[state.currentTeamId];
  const hasActiveProject = state.stadiumUpgrades.some(u => u.isInProgress && !u.isCompleted);

  const options: UpgradeOption[] = [
    {
      type: 'capacity',
      name: 'Stadionausbau',
      description: `Kapazität um 5.000 Plätze erhöhen (aktuell: ${team.stadium.capacity.toLocaleString('de-DE')})`,
      cost: getCost('capacity', team),
      buildTimeWeeks: 12,
      effect: '+5.000 Plätze → mehr Ticketeinnahmen',
      currentLevel: Math.floor(team.stadium.capacity / 10000),
      maxLevel: 8, // max 80.000
      canBuild: !hasActiveProject && team.stadium.capacity < 80000 && (finances?.balance ?? 0) >= getCost('capacity', team),
      reason: hasActiveProject ? 'Bereits ein Projekt aktiv' : team.stadium.capacity >= 80000 ? 'Maximale Kapazität erreicht' : undefined,
    },
    {
      type: 'vip',
      name: 'VIP-Logen',
      description: 'Premium-Bereich für höhere Ticketeinnahmen',
      cost: getCost('vip', team),
      buildTimeWeeks: 8,
      effect: '+15% Ticketeinnahmen pro Heimspiel',
      currentLevel: team.facilities.stadium,
      maxLevel: 10,
      canBuild: !hasActiveProject && team.facilities.stadium < 10 && (finances?.balance ?? 0) >= getCost('vip', team),
      reason: hasActiveProject ? 'Bereits ein Projekt aktiv' : team.facilities.stadium >= 10 ? 'Maximale Stufe erreicht' : undefined,
    },
    {
      type: 'shop',
      name: 'Fan-Shop Ausbau',
      description: 'Größerer Fan-Shop für mehr Merchandising-Einnahmen',
      cost: getCost('shop', team),
      buildTimeWeeks: 4,
      effect: '+20% Merchandising-Einnahmen',
      currentLevel: Math.min(10, Math.floor(team.reputation / 10)),
      maxLevel: 10,
      canBuild: !hasActiveProject && (finances?.balance ?? 0) >= getCost('shop', team),
    },
    {
      type: 'training',
      name: 'Trainingsgelände',
      description: `Trainingseinrichtungen verbessern (aktuell: ${team.facilities.training}/10)`,
      cost: getCost('training', team),
      buildTimeWeeks: 6,
      effect: '+1 Trainingsqualität → bessere Trainingseffekte',
      currentLevel: team.facilities.training,
      maxLevel: 10,
      canBuild: !hasActiveProject && team.facilities.training < 10 && (finances?.balance ?? 0) >= getCost('training', team),
      reason: hasActiveProject ? 'Bereits ein Projekt aktiv' : team.facilities.training >= 10 ? 'Maximale Stufe erreicht' : undefined,
    },
    {
      type: 'youth',
      name: 'Jugendakademie',
      description: `Jugendeinrichtungen verbessern (aktuell: ${team.facilities.youth}/10)`,
      cost: getCost('youth', team),
      buildTimeWeeks: 8,
      effect: '+1 Jugendqualität → bessere Talente',
      currentLevel: team.facilities.youth,
      maxLevel: 10,
      canBuild: !hasActiveProject && team.facilities.youth < 10 && (finances?.balance ?? 0) >= getCost('youth', team),
      reason: hasActiveProject ? 'Bereits ein Projekt aktiv' : team.facilities.youth >= 10 ? 'Maximale Stufe erreicht' : undefined,
    },
    {
      type: 'medical',
      name: 'Medizinische Abteilung',
      description: `Medizinische Einrichtungen verbessern (aktuell: ${team.facilities.medical}/10)`,
      cost: getCost('medical', team),
      buildTimeWeeks: 6,
      effect: '+1 Medizinqualität → schnellere Genesung',
      currentLevel: team.facilities.medical,
      maxLevel: 10,
      canBuild: !hasActiveProject && team.facilities.medical < 10 && (finances?.balance ?? 0) >= getCost('medical', team),
      reason: hasActiveProject ? 'Bereits ein Projekt aktiv' : team.facilities.medical >= 10 ? 'Maximale Stufe erreicht' : undefined,
    },
  ];

  return options;
}

function getCost(type: StadiumUpgradeType, team: Team): number {
  const baseCosts: Record<StadiumUpgradeType, number> = {
    capacity: 8_000_000,
    vip: 3_000_000,
    shop: 1_500_000,
    training: 2_000_000,
    youth: 2_500_000,
    medical: 1_800_000,
  };

  // Scale cost by current level
  const level = type === 'capacity'
    ? Math.floor(team.stadium.capacity / 10000)
    : type === 'vip' || type === 'shop'
    ? team.facilities.stadium
    : team.facilities[type as 'training' | 'youth' | 'medical'];

  return Math.round(baseCosts[type] * (1 + level * 0.3));
}

/**
 * Start a stadium upgrade project.
 */
export function startUpgrade(state: GameState, type: StadiumUpgradeType): GameState {
  const team = state.teams.find(t => t.id === state.currentTeamId);
  if (!team) return state;

  const finances = state.finances[state.currentTeamId];
  if (!finances) return state;

  const options = getUpgradeOptions(state);
  const option = options.find(o => o.type === type);
  if (!option || !option.canBuild) return state;

  const completionDate = new Date(state.currentDate);
  completionDate.setDate(completionDate.getDate() + option.buildTimeWeeks * 7);

  const upgrade: StadiumUpgrade = {
    id: generateId(),
    type,
    name: option.name,
    description: option.description,
    cost: option.cost,
    buildTimeWeeks: option.buildTimeWeeks,
    effect: option.effect,
    startDate: state.currentDate,
    completionDate: completionDate.toISOString().split('T')[0],
    isCompleted: false,
    isInProgress: true,
  };

  const updatedFinances = {
    ...finances,
    balance: finances.balance - option.cost,
    transferBudget: Math.max(0, finances.transferBudget - option.cost),
  };

  const news: NewsItem = {
    id: `upgrade-start-${upgrade.id}`,
    type: 'general',
    title: `Baustart: ${option.name}`,
    content: `Der Ausbau "${option.name}" hat begonnen. Kosten: ${fmtVal(option.cost)}. Fertigstellung in ${option.buildTimeWeeks} Wochen.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  };

  return {
    ...state,
    stadiumUpgrades: [...state.stadiumUpgrades, upgrade],
    finances: { ...state.finances, [state.currentTeamId]: updatedFinances },
    news: [...state.news, news],
  };
}

/**
 * Check for completed upgrades. Called from day-advance.
 */
export function checkUpgradeCompletion(state: GameState): GameState {
  const activeUpgrades = state.stadiumUpgrades.filter(u => u.isInProgress && !u.isCompleted);
  if (activeUpgrades.length === 0) return state;

  let changed = false;
  const updatedUpgrades = state.stadiumUpgrades.map(u => {
    if (!u.isInProgress || u.isCompleted) return u;
    if (u.completionDate && u.completionDate <= state.currentDate) {
      changed = true;
      return { ...u, isCompleted: true, isInProgress: false };
    }
    return u;
  });

  if (!changed) return state;

  // Apply effects of completed upgrades
  let updatedTeams = [...state.teams];
  const news: NewsItem[] = [];

  for (const upgrade of updatedUpgrades) {
    if (!upgrade.isCompleted || state.stadiumUpgrades.find(u => u.id === upgrade.id)?.isCompleted) continue;

    const teamIdx = updatedTeams.findIndex(t => t.id === state.currentTeamId);
    if (teamIdx === -1) continue;

    const team = { ...updatedTeams[teamIdx] };

    switch (upgrade.type) {
      case 'capacity':
        team.stadium = { ...team.stadium, capacity: team.stadium.capacity + 5000 };
        break;
      case 'vip':
      case 'shop':
        team.facilities = { ...team.facilities, stadium: Math.min(10, team.facilities.stadium + 1) };
        break;
      case 'training':
        team.facilities = { ...team.facilities, training: Math.min(10, team.facilities.training + 1) };
        break;
      case 'youth':
        team.facilities = { ...team.facilities, youth: Math.min(10, team.facilities.youth + 1) };
        break;
      case 'medical':
        team.facilities = { ...team.facilities, medical: Math.min(10, team.facilities.medical + 1) };
        break;
    }

    updatedTeams[teamIdx] = team;

    news.push({
      id: `upgrade-done-${upgrade.id}`,
      type: 'milestone',
      title: `Fertiggestellt: ${upgrade.name}!`,
      content: `Der Ausbau "${upgrade.name}" wurde abgeschlossen. Effekt: ${upgrade.effect}`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    });
  }

  return {
    ...state,
    stadiumUpgrades: updatedUpgrades,
    teams: updatedTeams,
    news: [...state.news, ...news],
  };
}

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}
