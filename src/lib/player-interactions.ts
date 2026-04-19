/**
 * Extended Player Interactions Engine
 * Generates dynamic player feedback, complaints, and requests based on game state.
 * Uses the existing PendingInteraction type from game.ts.
 */

import { GameState, PendingInteraction, InteractionOption } from '@/types/game';
import { Player } from '@/types/player';

function generateId(): string {
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function playerDisplayName(p: Player): string {
  return `${p.firstName.charAt(0)}. ${p.lastName}`;
}

/**
 * Check for player interactions that should trigger based on current game state.
 * Called weekly (e.g., on Mondays) from day-advance.
 */
export function checkPlayerInteractions(state: GameState): PendingInteraction[] {
  const interactions: PendingInteraction[] = [];
  const teamId = state.currentTeamId;
  const teamPlayers = state.players.filter(p => p.teamId === teamId && !p.injury);
  const currentDate = state.currentDate;

  // Don't generate if there are already unresolved interactions
  const unresolvedCount = (state.interactions ?? []).filter(i => !i.isResolved).length;
  if (unresolvedCount >= 2 || teamPlayers.length === 0) return interactions;

  // 1. Playing time complaints
  const lowPractice = teamPlayers.filter(p =>
    (p.matchPractice ?? 50) < 25 &&
    p.stats.appearances < 5 &&
    p.morale < 50
  );
  for (const p of lowPractice.slice(0, 1)) {
    interactions.push({
      id: generateId(),
      playerId: p.id,
      type: 'playing_time',
      message: `${playerDisplayName(p)}: "Trainer, ich bin unzufrieden mit meiner Spielzeit. Ich möchte öfter spielen."`,
      options: [
        { text: 'Ich verspreche dir mehr Einsätze', moraleEffect: 10 },
        { text: 'Du musst dich im Training beweisen', moraleEffect: 3 },
        { text: 'Akzeptiere deine Rolle', moraleEffect: -10 },
      ],
      date: currentDate,
      isResolved: false,
    });
  }

  // 2. Contract request
  const expiringContract = teamPlayers.filter(p => {
    const contractEnd = new Date(p.contractUntil);
    const now = new Date(currentDate);
    const monthsLeft = (contractEnd.getFullYear() - now.getFullYear()) * 12 + contractEnd.getMonth() - now.getMonth();
    return monthsLeft <= 6 && monthsLeft > 0;
  });
  for (const p of expiringContract.slice(0, 1)) {
    interactions.push({
      id: generateId(),
      playerId: p.id,
      type: 'contract_worry',
      message: `${playerDisplayName(p)}: "Mein Vertrag läuft bald aus. Ich würde gerne über eine Verlängerung sprechen."`,
      options: [
        { text: 'Lass uns verhandeln', moraleEffect: 5 },
        { text: 'Wir reden am Saisonende darüber', moraleEffect: -3 },
        { text: 'Wir werden nicht verlängern', moraleEffect: -15 },
      ],
      date: currentDate,
      isResolved: false,
    });
  }

  // 3. Captain feedback on low morale
  const avgMorale = teamPlayers.reduce((s, p) => s + p.morale, 0) / teamPlayers.length;
  if (avgMorale < 40) {
    const captain = teamPlayers.find(p => p.attributes.leadership >= 70) ?? teamPlayers[0];
    if (captain) {
      interactions.push({
        id: generateId(),
        playerId: captain.id,
        type: 'captain_feedback',
        message: `${playerDisplayName(captain)}: "Trainer, die Stimmung ist am Boden. Wir brauchen eine Ansprache."`,
        options: [
          { text: 'Motivationsrede halten', moraleEffect: 8 },
          { text: 'Trainingsfreier Tag', moraleEffect: 5 },
          { text: 'Harte Worte — wir müssen kämpfen', moraleEffect: -2 },
        ],
        date: currentDate,
        isResolved: false,
      });
    }
  }

  // 4. Young player development request (15% chance)
  const youngPlayers = teamPlayers.filter(p => {
    const age = Math.floor((new Date(currentDate).getTime() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age <= 21 && p.potential > 70;
  });
  for (const p of youngPlayers.slice(0, 1)) {
    if (Math.random() < 0.15) {
      interactions.push({
        id: generateId(),
        playerId: p.id,
        type: 'young_player_request',
        message: `${playerDisplayName(p)}: "Trainer, ich möchte mich verbessern. Können wir Zusatztraining machen?"`,
        options: [
          { text: 'Zusatztraining anbieten', moraleEffect: 8 },
          { text: 'Einen Mentor zuweisen', moraleEffect: 5 },
          { text: 'Das kommt mit der Zeit', moraleEffect: -3 },
        ],
        date: currentDate,
        isResolved: false,
      });
    }
  }

  // 5. Praise after good form (10% chance)
  const topPerformers = teamPlayers
    .filter(p => p.stats.avgRating >= 7.5 && p.stats.appearances >= 5)
    .sort((a, b) => b.stats.avgRating - a.stats.avgRating);
  for (const p of topPerformers.slice(0, 1)) {
    if (Math.random() < 0.1) {
      interactions.push({
        id: generateId(),
        playerId: p.id,
        type: 'praise',
        message: `${playerDisplayName(p)}: "Danke für Ihr Vertrauen, Trainer. Ich bin in Topform!"`,
        options: [
          { text: 'Weiter so! Du bist unser Schlüssel', moraleEffect: 10 },
          { text: 'Bleib auf dem Boden', moraleEffect: 3 },
        ],
        date: currentDate,
        isResolved: false,
      });
    }
  }

  // 6. Veteran advice (8% chance)
  const veterans = teamPlayers.filter(p => {
    const age = Math.floor((new Date(currentDate).getTime() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 32 && p.attributes.leadership >= 60;
  });
  for (const v of veterans.slice(0, 1)) {
    if (Math.random() < 0.08) {
      interactions.push({
        id: generateId(),
        playerId: v.id,
        type: 'veteran_advice',
        message: `${playerDisplayName(v)}: "Trainer, soll ich mich um die jungen Spieler kümmern?"`,
        options: [
          { text: 'Das wäre großartig, danke!', moraleEffect: 8 },
          { text: 'Das übernehme ich selbst', moraleEffect: -3 },
        ],
        date: currentDate,
        isResolved: false,
      });
    }
  }

  // Limit to max 2 new interactions per week
  return interactions.slice(0, 2);
}

/**
 * Apply the chosen option from a player interaction.
 * Updates player morale and marks interaction as resolved.
 */
export function resolvePlayerInteraction(
  state: GameState,
  interactionId: string,
  optionIdx: number
): GameState {
  const interaction = state.interactions.find(i => i.id === interactionId);
  if (!interaction || interaction.isResolved) return state;

  const option = interaction.options[optionIdx];
  if (!option) return state;

  let players = [...state.players];
  const teamId = state.currentTeamId;

  // Apply morale to the specific player
  if (option.moraleEffect) {
    players = players.map(p =>
      p.id === interaction.playerId
        ? { ...p, morale: Math.max(10, Math.min(100, p.morale + option.moraleEffect)) }
        : p
    );
  }

  // Captain feedback + veteran advice affect the whole team
  if (interaction.type === 'captain_feedback' || interaction.type === 'veteran_advice') {
    const teamEffect = Math.round(option.moraleEffect * 0.5);
    if (teamEffect !== 0) {
      players = players.map(p =>
        p.teamId === teamId && p.id !== interaction.playerId
          ? { ...p, morale: Math.max(10, Math.min(100, p.morale + teamEffect)) }
          : p
      );
    }
  }

  // Young player request: bonus XP
  if (interaction.type === 'young_player_request' && optionIdx <= 1) {
    const xpBonus = optionIdx === 0 ? 25 : 15;
    players = players.map(p =>
      p.id === interaction.playerId
        ? { ...p, xp: p.xp + xpBonus }
        : p
    );
  }

  // Mark resolved
  const interactions = state.interactions.map(i =>
    i.id === interactionId ? { ...i, isResolved: true } : i
  );

  return { ...state, players, interactions };
}
