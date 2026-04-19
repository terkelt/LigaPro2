import Dexie, { type Table } from 'dexie';
import { GameState } from '@/types/game';

export interface SaveGame {
  id?: number;
  name: string;
  teamId: string;
  teamName: string;
  leagueName: string;
  season: number;
  date: string;
  createdAt: Date;
  updatedAt: Date;
  isAutosave: boolean;
  gameState: GameState;
}

class LigaProDB extends Dexie {
  saves!: Table<SaveGame>;

  constructor() {
    super('LigaProDB');
    this.version(1).stores({
      saves: '++id, name, teamId, date, createdAt, isAutosave',
    });
    this.version(2).stores({
      saves: '++id, name, teamId, date, createdAt, updatedAt, isAutosave',
    });
  }
}

export const db = new LigaProDB();

export async function saveGame(
  name: string,
  gameState: GameState,
  isAutosave = false
): Promise<number> {
  const team = gameState.teams.find((t) => t.id === gameState.currentTeamId);

  const save: SaveGame = {
    name,
    teamId: gameState.currentTeamId,
    teamName: team?.name ?? 'Unbekannt',
    leagueName: gameState.leagues.find((l) => l.id === team?.league)?.name ?? '',
    season: gameState.season.number,
    date: gameState.currentDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    isAutosave,
    gameState,
  };

  return await db.saves.add(save);
}

export async function updateSave(id: number, gameState: GameState): Promise<void> {
  const team = gameState.teams.find((t) => t.id === gameState.currentTeamId);

  await db.saves.update(id, {
    teamName: team?.name ?? 'Unbekannt',
    leagueName: gameState.leagues.find((l) => l.id === team?.league)?.name ?? '',
    season: gameState.season.number,
    date: gameState.currentDate,
    updatedAt: new Date(),
    gameState,
  });
}

export async function loadGame(id: number): Promise<SaveGame | undefined> {
  return await db.saves.get(id);
}

export async function deleteSave(id: number): Promise<void> {
  await db.saves.delete(id);
}

export async function listSaves(): Promise<SaveGame[]> {
  const all = await db.saves.toArray();
  return all.sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
}

export async function listManualSaves(): Promise<SaveGame[]> {
  const all = await db.saves.filter((s) => !s.isAutosave).toArray();
  return all.sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
}

export async function autoSave(gameState: GameState): Promise<void> {
  const autosaves = await db.saves
    .where('isAutosave')
    .equals(1)
    .sortBy('createdAt');

  // Keep max 3 autosaves, delete oldest if needed
  if (autosaves.length >= 3) {
    const toDelete = autosaves.slice(0, autosaves.length - 2);
    for (const save of toDelete) {
      if (save.id) await db.saves.delete(save.id);
    }
  }

  await saveGame(
    `Autosave – ${gameState.currentDate}`,
    gameState,
    true
  );
}
