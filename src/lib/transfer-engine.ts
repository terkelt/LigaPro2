import { GameState } from '@/types/game';
import { Player } from '@/types/player';
import { Team } from '@/types/team';
import { TransferOffer, Transfer, TransferListing, NegotiationPhase } from '@/types/transfer';
import { NewsItem } from '@/types/news';

// ════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function calcOverall(p: Player): number {
  const a = p.attributes;
  if (p.position === 'TW') return Math.round(a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1);
  if (['IV', 'LV', 'RV'].includes(p.position)) return Math.round(a.positioning * 0.2 + a.strength * 0.1 + a.heading * 0.1 + a.pace * 0.1 + a.passing * 0.1 + a.aggression * 0.1 + a.composure * 0.1 + a.stamina * 0.1 + a.workRate * 0.1);
  if (['ZDM', 'ZM'].includes(p.position)) return Math.round(a.passing * 0.2 + a.vision * 0.15 + a.stamina * 0.1 + a.positioning * 0.1 + a.ballControl * 0.1 + a.workRate * 0.1 + a.composure * 0.1 + a.shooting * 0.05 + a.strength * 0.1);
  if (p.position === 'ZOM') return Math.round(a.vision * 0.2 + a.passing * 0.15 + a.ballControl * 0.15 + a.dribbling * 0.1 + a.shooting * 0.1 + a.composure * 0.1 + a.finishing * 0.1 + a.pace * 0.1);
  if (['LA', 'RA'].includes(p.position)) return Math.round(a.pace * 0.2 + a.dribbling * 0.15 + a.crossing * 0.15 + a.acceleration * 0.1 + a.shooting * 0.1 + a.ballControl * 0.1 + a.stamina * 0.1 + a.finishing * 0.1);
  return Math.round(a.finishing * 0.25 + a.shooting * 0.15 + a.heading * 0.1 + a.positioning * 0.1 + a.composure * 0.1 + a.pace * 0.1 + a.strength * 0.1 + a.dribbling * 0.1);
}

function getAge(dob: string, refDate?: string): number {
  const ref = new Date(refDate ?? '2025-07-01');
  const b = new Date(dob);
  let a = ref.getFullYear() - b.getFullYear();
  if (ref.getMonth() < b.getMonth() || (ref.getMonth() === b.getMonth() && ref.getDate() < b.getDate())) a--;
  return a;
}

// ════════════════════════════════════════════════════════
//  Stable Market Value — deterministic, attribute-based
// ════════════════════════════════════════════════════════

/**
 * Calculates a stable, deterministic market value for a player.
 * Based on: overall rating, age, potential, position scarcity.
 * This value does NOT fluctuate randomly.
 */
export function calcStableMarketValue(p: Player, refDate?: string): number {
  const ovr = calcOverall(p);
  const age = getAge(p.dateOfBirth, refDate);
  const pot = p.potential ?? ovr;

  // Base value curve: exponential growth with OVR
  // OVR 60 → ~500k, 70 → ~3M, 75 → ~8M, 80 → ~20M, 85 → ~45M, 90 → ~80M
  let base = Math.pow(1.18, ovr - 50) * 100_000;

  // Age multiplier: peak value at 25-27, premium for youth, discount for 30+
  let ageMult = 1.0;
  if (age <= 19) ageMult = 0.6 + (pot - 60) * 0.015; // high potential youth
  else if (age <= 21) ageMult = 0.8 + (pot - 60) * 0.01;
  else if (age <= 24) ageMult = 1.1;
  else if (age <= 27) ageMult = 1.15; // peak
  else if (age <= 29) ageMult = 1.0;
  else if (age <= 31) ageMult = 0.7;
  else if (age <= 33) ageMult = 0.45;
  else ageMult = 0.25;

  // Position scarcity: strikers and attacking midfielders are more expensive
  const posMult: Record<string, number> = {
    ST: 1.25, ZOM: 1.15, LA: 1.1, RA: 1.1,
    ZM: 1.0, ZDM: 0.95, IV: 0.9, LV: 0.85, RV: 0.85, TW: 0.8,
  };
  const pm = posMult[p.position] ?? 1.0;

  // Contract: shorter = cheaper (clubs know they can get player cheaper/free)
  const contractEnd = new Date(p.contractUntil);
  const now = new Date(refDate ?? '2025-07-01');
  const yearsLeft = Math.max(0, (contractEnd.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  let contractMult = 1.0;
  if (yearsLeft < 0.5) contractMult = 0.3;
  else if (yearsLeft < 1) contractMult = 0.5;
  else if (yearsLeft < 2) contractMult = 0.75;
  else if (yearsLeft > 4) contractMult = 1.05;

  const value = base * ageMult * pm * contractMult;

  // Round to nice numbers
  if (value >= 10_000_000) return Math.round(value / 500_000) * 500_000;
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000;
  if (value >= 100_000) return Math.round(value / 50_000) * 50_000;
  return Math.max(50_000, Math.round(value / 10_000) * 10_000);
}

// ════════════════════════════════════════════════════════
//  AI Asking Price (what the selling club demands)
// ════════════════════════════════════════════════════════

function aiAskingPrice(player: Player, sellingTeam: Team, buyingTeam: Team, refDate?: string): number {
  let base = calcStableMarketValue(player, refDate);

  // Selling club adds premium based on player importance
  const ovr = calcOverall(player);
  if (ovr >= 80) base *= 1.15; // key player premium
  else if (ovr >= 75) base *= 1.08;

  // Form bonus: in-form players cost more
  if (player.form > 80) base *= 1.12;
  else if (player.form > 70) base *= 1.05;

  // Reputation premium: selling to a bigger club costs more
  const repDiff = (buyingTeam.reputation ?? 50) - (sellingTeam.reputation ?? 50);
  if (repDiff > 20) base *= 1.2;
  else if (repDiff > 10) base *= 1.1;
  else if (repDiff < -20) base *= 0.9; // discount for smaller clubs

  // Transfer-listed discount
  if (player.isTransferListed) base *= 0.8;
  if (player.transferRequested) base *= 0.75;

  // Young talent premium
  const age = getAge(player.dateOfBirth, refDate);
  if (age <= 21 && (player.potential ?? ovr) >= 80) base *= 1.25;

  return Math.round(base / 100_000) * 100_000;
}

// ════════════════════════════════════════════════════════
//  Phase 1: Club Negotiation (multi-round)
// ════════════════════════════════════════════════════════

export interface ClubNegotiationResult {
  decision: 'accepted' | 'rejected' | 'counter_offer';
  counterFee?: number;
  askingPrice: number;
  reason: string;
}

/**
 * Club evaluates an offer. Supports multiple rounds — each round
 * the club may lower their asking price slightly.
 */
export function evaluateClubOffer(
  player: Player,
  offer: number,
  sellingTeam: Team,
  buyingTeam: Team,
  negotiationRound: number,
  refDate?: string,
): ClubNegotiationResult {
  let askPrice = aiAskingPrice(player, sellingTeam, buyingTeam, refDate);

  // Each negotiation round, the club softens slightly (max 3 rounds useful)
  const roundDiscount = Math.min(negotiationRound, 3) * 0.04; // up to 12% discount
  askPrice = Math.round(askPrice * (1 - roundDiscount) / 100_000) * 100_000;

  const ratio = offer / askPrice;
  const listedBonus = (player.isTransferListed ? 0.1 : 0) + (player.transferRequested ? 0.08 : 0);

  if (ratio >= (0.93 - listedBonus)) {
    return { decision: 'accepted', askingPrice: askPrice, reason: 'Der Verein akzeptiert das Angebot.' };
  }

  if (ratio >= (0.65 - listedBonus)) {
    // Counter-offer: midpoint between offer and asking price
    const counter = Math.round(((offer + askPrice) / 2) / 100_000) * 100_000;
    return {
      decision: 'counter_offer',
      counterFee: Math.max(counter, offer + 100_000),
      askingPrice: askPrice,
      reason: `Gegenangebot: ${formatVal(counter)}. Der Verein fordert ca. ${formatVal(askPrice)}.`,
    };
  }

  if (negotiationRound >= 3) {
    return { decision: 'rejected', askingPrice: askPrice, reason: `Verhandlungen gescheitert. Der Verein besteht auf mindestens ${formatVal(askPrice)}.` };
  }

  if (ratio >= 0.4) {
    return { decision: 'rejected', askingPrice: askPrice, reason: `Angebot zu niedrig. Der Verein erwartet mindestens ~${formatVal(Math.round(askPrice * 0.9 / 100_000) * 100_000)}.` };
  }

  return { decision: 'rejected', askingPrice: askPrice, reason: 'Das Angebot wird als unseriös abgelehnt.' };
}

// ════════════════════════════════════════════════════════
//  Phase 2: Player Negotiation (willingness + salary)
// ════════════════════════════════════════════════════════

export interface PlayerNegotiationResult {
  willing: boolean;
  salaryDemand: number;
  willingness: number; // 0-100
  reason: string;
}

/**
 * Player decides if they want to join. Factors:
 * - Club reputation difference (player prefers bigger/equal clubs)
 * - Salary offer vs current salary
 * - Age (older players more open to moves)
 * - Player morale (unhappy players more willing)
 * - Transfer-listed/requested (very willing)
 */
export function evaluatePlayerWillingness(
  player: Player,
  buyingTeam: Team,
  sellingTeam: Team,
  offeredSalary: number,
): PlayerNegotiationResult {
  let willingness = 50; // base

  // Reputation: player wants to go to a club of equal or higher reputation
  const repDiff = (buyingTeam.reputation ?? 50) - (sellingTeam.reputation ?? 50);
  if (repDiff >= 20) willingness += 25;       // much bigger club
  else if (repDiff >= 10) willingness += 15;  // bigger club
  else if (repDiff >= 0) willingness += 5;    // similar
  else if (repDiff >= -10) willingness -= 10; // smaller club
  else if (repDiff >= -20) willingness -= 25; // much smaller club
  else willingness -= 50;                     // way below player's level

  // Hard floor: world-class players (overall >= 82 or salary >= 3M) at top clubs (rep >= 80)
  // will NEVER join a club with reputation gap > 25, regardless of salary
  const playerOverall = calcOverall(player);
  const sellingRep = sellingTeam.reputation ?? 50;
  if (sellingRep >= 75 && playerOverall >= 80 && repDiff < -25) {
    const salaryDemand = Math.round(player.salary * 2.0 / 10_000) * 10_000;
    return {
      willing: false,
      salaryDemand,
      willingness: 0,
      reason: `${player.firstName} ${player.lastName} ist ein Weltklasse-Spieler und wird nicht zu einem Verein mit deutlich niedrigerer Reputation wechseln. Kein Gehalt kann ihn überzeugen.`,
    };
  }

  // Salary: player wants a raise
  const salaryRatio = offeredSalary / Math.max(1, player.salary);
  if (salaryRatio >= 1.5) willingness += 20;
  else if (salaryRatio >= 1.2) willingness += 10;
  else if (salaryRatio >= 1.0) willingness += 3;
  else if (salaryRatio >= 0.8) willingness -= 10;
  else willingness -= 25;

  // Morale: unhappy players want to leave
  if (player.morale < 40) willingness += 20;
  else if (player.morale < 55) willingness += 10;
  else if (player.morale > 85) willingness -= 10;

  // Transfer-listed or requested
  if (player.transferRequested) willingness += 30;
  if (player.isTransferListed) willingness += 15;

  // Age: older players more open (want playing time / last big contract)
  const age = getAge(player.dateOfBirth);
  if (age >= 32) willingness += 10;
  else if (age >= 30) willingness += 5;

  willingness = Math.max(0, Math.min(100, willingness));

  // Salary demand: player wants at least current salary, premium for moving
  const baseDemand = player.salary;
  let demandMult = 1.1; // 10% raise minimum
  if (repDiff < -10) demandMult = 1.4; // big premium to go to smaller club
  else if (repDiff < 0) demandMult = 1.25;
  else if (repDiff > 20) demandMult = 1.0; // willing to take same salary for big club
  const salaryDemand = Math.round(baseDemand * demandMult / 10_000) * 10_000;

  if (willingness < 30) {
    let reason = 'Der Spieler hat kein Interesse an einem Wechsel';
    if (repDiff < -15) {
      reason += ' — die Reputation deines Vereins ist zu niedrig';
      // Hint: if salary could push willingness over threshold, tell the user
      const salaryNeededForConsideration = Math.round(player.salary * (repDiff < -20 ? 2.5 : 1.8) / 10_000) * 10_000;
      if (willingness >= 15 && salaryNeededForConsideration > offeredSalary) {
        reason += `. Für ein Gehalt von ca. ${formatVal(salaryNeededForConsideration)}/Jahr würde er es sich vielleicht überlegen`;
      }
    } else if (salaryRatio < 0.8) {
      reason += ' — das Gehaltsangebot ist zu niedrig';
    }
    reason += '.';
    return { willing: false, salaryDemand, willingness, reason };
  }

  if (offeredSalary < salaryDemand * 0.85) {
    return {
      willing: false,
      salaryDemand,
      willingness,
      reason: `Der Spieler fordert mindestens ${formatVal(salaryDemand)}/Jahr. Dein Angebot: ${formatVal(offeredSalary)}/Jahr.`,
    };
  }

  return {
    willing: true,
    salaryDemand,
    willingness,
    reason: willingness >= 70 ? 'Der Spieler ist begeistert vom Wechsel!' : willingness >= 50 ? 'Der Spieler ist offen für einen Wechsel.' : 'Der Spieler ist zögerlich, aber bereit zu verhandeln.',
  };
}

function formatVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}

// --- Transfer Execution ---

/**
 * Execute a transfer: move player, update budgets, create records
 */
export function executeTransfer(
  state: GameState,
  playerId: string,
  fromTeamId: string,
  toTeamId: string,
  fee: number,
  salary: number,
  contractYears: number,
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const fromTeam = state.teams.find((t) => t.id === fromTeamId);
  const toTeam = state.teams.find((t) => t.id === toTeamId);

  // Update player
  const newPlayers = state.players.map((p) => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      teamId: toTeamId,
      salary,
      contractUntil: `${2025 + contractYears}-06-30`,
      isTransferListed: false,
      transferRequested: false,
      morale: Math.min(100, p.morale + 15),
    };
  });

  // Update finances
  const newFinances = { ...state.finances };
  if (toTeamId === state.currentTeamId && newFinances[toTeamId]) {
    newFinances[toTeamId] = {
      ...newFinances[toTeamId],
      balance: newFinances[toTeamId].balance - fee,
      transferBudget: newFinances[toTeamId].transferBudget - fee,
      totalSalaryPerMonth: newFinances[toTeamId].totalSalaryPerMonth + Math.round(salary / 12),
    };
  }
  if (fromTeamId === state.currentTeamId && newFinances[fromTeamId]) {
    newFinances[fromTeamId] = {
      ...newFinances[fromTeamId],
      balance: newFinances[fromTeamId].balance + fee,
      transferBudget: newFinances[fromTeamId].transferBudget + fee,
      totalSalaryPerMonth: Math.max(0, newFinances[fromTeamId].totalSalaryPerMonth - Math.round(player.salary / 12)),
    };
  }

  // Transfer record
  const transfer: Transfer = {
    id: generateId(),
    playerId,
    fromTeamId,
    toTeamId,
    fee,
    bonuses: [],
    sellOnPercentage: 0,
    date: state.currentDate,
    type: fee > 0 ? 'transfer' : 'free',
  };

  // News
  const isIncoming = toTeamId === state.currentTeamId;
  const otherTeam = isIncoming ? fromTeam : toTeam;
  const news: NewsItem = {
    id: `transfer-${transfer.id}`,
    type: 'transfer',
    title: isIncoming
      ? `Neuzugang: ${player.firstName} ${player.lastName}`
      : `Abgang: ${player.firstName} ${player.lastName}`,
    content: isIncoming
      ? (fromTeamId
        ? `${player.firstName} ${player.lastName} wechselt von ${otherTeam?.name ?? '?'} für ${formatVal(fee)} zu deinem Verein.`
        : `${player.firstName} ${player.lastName} wurde ablösefrei verpflichtet!`)
      : `${player.firstName} ${player.lastName} wechselt für ${formatVal(fee)} zu ${otherTeam?.name ?? '?'}.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  };

  // Remove from transfer listings
  const newListings = state.transfers.listings.filter((l) => l.playerId !== playerId);

  // Remove related offers
  const newOffers = state.transfers.offers.filter((o) => o.playerId !== playerId);

  return {
    ...state,
    players: newPlayers,
    finances: newFinances,
    transfers: {
      ...state.transfers,
      completed: [...state.transfers.completed, transfer],
      offers: newOffers,
      listings: newListings,
    },
    news: [...state.news, news],
  };
}

// ════════════════════════════════════════════════════════
//  Create Offer — Phase 1: Club Negotiation
// ════════════════════════════════════════════════════════

export interface OfferResult {
  decision: 'accepted' | 'rejected' | 'counter_offer' | 'player_rejected' | 'completed';
  reason: string;
  counterFee?: number;
  askingPrice?: number;
  playerWillingness?: number;
  playerSalaryDemand?: number;
  negotiationPhase: NegotiationPhase;
}

export function createOffer(
  state: GameState,
  playerId: string,
  fee: number,
  salary: number,
  contractYears: number,
  existingOfferId?: string,
): { newState: GameState; evaluation: OfferResult } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found');

  const sellingTeam = player.teamId ? state.teams.find((t) => t.id === player.teamId) : null;
  const buyingTeam = state.teams.find((t) => t.id === state.currentTeamId);
  if (!buyingTeam) throw new Error('Team not found');

  // Free agent / legend: no selling club → skip club negotiation, go straight to player
  const isFreeAgent = !player.teamId || !sellingTeam;

  // B7: Block club-to-club transfers when transfer window is closed (free agents always allowed)
  if (!isFreeAgent && !state.isTransferWindowOpen) {
    return {
      newState: state,
      evaluation: {
        decision: 'rejected',
        reason: 'Das Transferfenster ist geschlossen. Transfers zwischen Vereinen sind derzeit nicht möglich. Vereinslose Spieler können weiterhin verpflichtet werden.',
        negotiationPhase: 'club',
      },
    };
  }

  if (isFreeAgent) {
    // Legends / Icons are NOT truly free — they demand a transfer fee based on market value
    const isLegendary = !!(player.isIcon || player.isLegend || player.legendaryTier);
    // Deterministic fee: always 0.75× market value (no random — prevents exploit on re-click)
    // If there's already an existing offer for this player, reuse its asking price
    const existingLegendOffer = state.transfers.offers.find(o => o.playerId === playerId && o.toTeamId === state.currentTeamId && o.clubAskingPrice && o.clubAskingPrice > 0);
    const legendFee = isLegendary
      ? (existingLegendOffer ? existingLegendOffer.clubAskingPrice! : Math.round(player.marketValue * 0.75 / 100_000) * 100_000)
      : 0;

    // Legends demand a fee close to their market value — reject lowball offers
    if (isLegendary && legendFee > 0 && fee < legendFee * 0.8) {
      return {
        newState: state,
        evaluation: {
          decision: 'rejected',
          reason: `Die Ablöseforderung beträgt ${(legendFee / 1_000_000).toFixed(1)}M €. Dein Angebot von ${(fee / 1_000_000).toFixed(1)}M € ist zu niedrig. Mindestens ${((legendFee * 0.8) / 1_000_000).toFixed(1)}M € nötig.`,
          askingPrice: legendFee,
          playerWillingness: 50,
          playerSalaryDemand: player.salary,
          negotiationPhase: 'club',
        },
      };
    }

    const actualFee = isLegendary ? Math.max(fee, legendFee) : 0;

    // Create a dummy "selling team" for player willingness calc (low rep so player is happy to join)
    const freeAgentTeam = { id: '', name: 'Vereinslos', shortName: 'VL', league: '', leagueLevel: 99, reputation: 20, colors: { primary: '#666', secondary: '#999' }, boardPatience: 50 } as unknown as Team;
    const playerResult = evaluatePlayerWillingness(player, buyingTeam, freeAgentTeam, salary);

    const offer: TransferOffer = {
      id: generateId(),
      playerId,
      fromTeamId: '',
      toTeamId: state.currentTeamId,
      fee: actualFee,
      bonuses: [],
      sellOnPercentage: 0,
      offeredSalary: salary,
      offeredContractYears: contractYears,
      status: playerResult.willing ? 'completed' : 'club_agreed',
      date: state.currentDate,
      isPlayerSide: true,
      expiresDate: addDays(state.currentDate, 5),
      negotiationPhase: playerResult.willing ? 'done' : 'player',
      negotiationRound: 0,
      clubAskingPrice: actualFee,
      playerWillingness: playerResult.willingness,
      playerSalaryDemand: playerResult.salaryDemand,
    };

    const newOffers = [...state.transfers.offers, offer];
    let newState: GameState = { ...state, transfers: { ...state.transfers, offers: newOffers } };

    if (playerResult.willing) {
      newState = executeTransfer(newState, playerId, '', state.currentTeamId, actualFee, salary, contractYears);
      const feeText = actualFee > 0 ? `für ${(actualFee / 1_000_000).toFixed(1)}M € ` : 'ablösefrei ';
      return {
        newState,
        evaluation: {
          decision: 'completed',
          reason: `${feeText}verpflichtet! ${playerResult.reason}`,
          askingPrice: actualFee,
          playerWillingness: playerResult.willingness,
          playerSalaryDemand: playerResult.salaryDemand,
          negotiationPhase: 'done',
        },
      };
    } else {
      return {
        newState,
        evaluation: {
          decision: 'player_rejected',
          reason: playerResult.reason,
          askingPrice: actualFee,
          playerWillingness: playerResult.willingness,
          playerSalaryDemand: playerResult.salaryDemand,
          negotiationPhase: 'player',
        },
      };
    }
  }

  // Find existing offer for round tracking
  const existingOffer = existingOfferId
    ? state.transfers.offers.find(o => o.id === existingOfferId)
    : state.transfers.offers.find(o => o.playerId === playerId && o.toTeamId === state.currentTeamId && (o.status === 'counter_offer' || o.status === 'club_agreed'));
  const round = existingOffer ? existingOffer.negotiationRound + 1 : 0;
  const phase: NegotiationPhase = existingOffer?.negotiationPhase === 'player' ? 'player' : 'club';

  // B8: Plausibility check — don't allow lowball re-offers after a counter
  if (existingOffer && phase === 'club' && existingOffer.counterFee) {
    // Must offer at least as much as previous offer (no going backwards)
    if (fee < existingOffer.fee) {
      return {
        newState: state,
        evaluation: {
          decision: 'rejected',
          reason: `Dein neues Angebot (${(fee / 1_000_000).toFixed(1)}M €) ist niedriger als dein vorheriges (${(existingOffer.fee / 1_000_000).toFixed(1)}M €). Der Verein nimmt dich nicht mehr ernst.`,
          counterFee: existingOffer.counterFee,
          askingPrice: existingOffer.clubAskingPrice,
          negotiationPhase: 'club',
        },
      };
    }
    // Must offer at least 80% of the counter-fee — otherwise it's insulting
    const minAcceptable = Math.round(existingOffer.counterFee * 0.8);
    if (fee < minAcceptable) {
      return {
        newState: state,
        evaluation: {
          decision: 'rejected',
          reason: `Der Verein fordert ${(existingOffer.counterFee / 1_000_000).toFixed(1)}M €. Dein Angebot von ${(fee / 1_000_000).toFixed(1)}M € ist zu weit entfernt. Biete mindestens ${(minAcceptable / 1_000_000).toFixed(1)}M €.`,
          counterFee: existingOffer.counterFee,
          askingPrice: existingOffer.clubAskingPrice,
          negotiationPhase: 'club',
        },
      };
    }
  }

  // B8: Patience system — club breaks off after too many rounds
  if (round >= 4 && phase === 'club') {
    // Mark offer as dead
    const deadOffers = state.transfers.offers.map(o =>
      o.id === existingOffer?.id ? { ...o, status: 'rejected' as const, negotiationPhase: 'done' as NegotiationPhase } : o
    );
    return {
      newState: { ...state, transfers: { ...state.transfers, offers: deadOffers } },
      evaluation: {
        decision: 'rejected',
        reason: `Der Verein hat die Geduld verloren und bricht die Verhandlungen ab. "${player.lastName} steht nicht mehr zum Verkauf — zumindest nicht an euch."`,
        negotiationPhase: 'done',
      },
    };
  }

  // If we're in player negotiation phase, skip club and go straight to player
  if (phase === 'player' && existingOffer) {
    return negotiateWithPlayer(state, existingOffer, salary, contractYears);
  }

  // Phase 1: Club negotiation
  const clubResult = evaluateClubOffer(player, fee, sellingTeam!, buyingTeam, round, state.currentDate);

  const offer: TransferOffer = {
    id: existingOffer?.id ?? generateId(),
    playerId,
    fromTeamId: player.teamId,
    toTeamId: state.currentTeamId,
    fee,
    bonuses: [],
    sellOnPercentage: 0,
    offeredSalary: salary,
    offeredContractYears: contractYears,
    status: clubResult.decision === 'accepted' ? 'club_agreed' : clubResult.decision,
    date: state.currentDate,
    isPlayerSide: false,
    counterFee: clubResult.counterFee,
    expiresDate: addDays(state.currentDate, 5),
    negotiationPhase: clubResult.decision === 'accepted' ? 'player' : 'club',
    negotiationRound: round,
    clubAskingPrice: clubResult.askingPrice,
  };

  // Replace or add offer
  const filteredOffers = state.transfers.offers.filter(o => o.id !== offer.id);
  const newOffers = [...filteredOffers, offer];
  let newState: GameState = { ...state, transfers: { ...state.transfers, offers: newOffers } };

  // If club accepted, immediately evaluate player willingness
  if (clubResult.decision === 'accepted') {
    const playerResult = evaluatePlayerWillingness(player, buyingTeam, sellingTeam, salary);
    offer.playerWillingness = playerResult.willingness;
    offer.playerSalaryDemand = playerResult.salaryDemand;

    if (playerResult.willing) {
      // Both club and player agree — execute transfer!
      offer.status = 'completed';
      offer.negotiationPhase = 'done';
      const finalOffers = state.transfers.offers.filter(o => o.id !== offer.id);
      newState = { ...state, transfers: { ...state.transfers, offers: [...finalOffers, offer] } };
      newState = executeTransfer(newState, playerId, player.teamId, state.currentTeamId, fee, salary, contractYears);
      return {
        newState,
        evaluation: {
          decision: 'completed',
          reason: `Transfer abgeschlossen! ${playerResult.reason}`,
          askingPrice: clubResult.askingPrice,
          playerWillingness: playerResult.willingness,
          playerSalaryDemand: playerResult.salaryDemand,
          negotiationPhase: 'done',
        },
      };
    } else {
      // Club agreed but player refuses
      offer.status = 'club_agreed';
      offer.negotiationPhase = 'player';
      offer.rejectionReason = playerResult.reason;
      const finalOffers = state.transfers.offers.filter(o => o.id !== offer.id);
      newState = { ...state, transfers: { ...state.transfers, offers: [...finalOffers, offer] } };
      return {
        newState,
        evaluation: {
          decision: 'player_rejected',
          reason: playerResult.reason,
          askingPrice: clubResult.askingPrice,
          playerWillingness: playerResult.willingness,
          playerSalaryDemand: playerResult.salaryDemand,
          negotiationPhase: 'player',
        },
      };
    }
  }

  return {
    newState,
    evaluation: {
      decision: clubResult.decision,
      reason: clubResult.reason,
      counterFee: clubResult.counterFee,
      askingPrice: clubResult.askingPrice,
      negotiationPhase: 'club',
    },
  };
}

// ════════════════════════════════════════════════════════
//  Negotiate with Player (Phase 2 — salary renegotiation)
// ════════════════════════════════════════════════════════

function negotiateWithPlayer(
  state: GameState,
  existingOffer: TransferOffer,
  newSalary: number,
  contractYears: number,
): { newState: GameState; evaluation: OfferResult } {
  const player = state.players.find(p => p.id === existingOffer.playerId);
  if (!player) throw new Error('Player not found');

  const buyingTeam = state.teams.find(t => t.id === state.currentTeamId);
  const sellingTeam = state.teams.find(t => t.id === existingOffer.fromTeamId);
  if (!buyingTeam || !sellingTeam) throw new Error('Team not found');

  const playerResult = evaluatePlayerWillingness(player, buyingTeam, sellingTeam, newSalary);
  const updatedOffer: TransferOffer = {
    ...existingOffer,
    offeredSalary: newSalary,
    offeredContractYears: contractYears,
    playerWillingness: playerResult.willingness,
    playerSalaryDemand: playerResult.salaryDemand,
    negotiationRound: existingOffer.negotiationRound + 1,
  };

  if (playerResult.willing) {
    updatedOffer.status = 'completed';
    updatedOffer.negotiationPhase = 'done';
    const filteredOffers = state.transfers.offers.filter(o => o.id !== existingOffer.id);
    let newState: GameState = { ...state, transfers: { ...state.transfers, offers: [...filteredOffers, updatedOffer] } };
    newState = executeTransfer(newState, existingOffer.playerId, existingOffer.fromTeamId, existingOffer.toTeamId, existingOffer.fee, newSalary, contractYears);
    return {
      newState,
      evaluation: {
        decision: 'completed',
        reason: `Transfer abgeschlossen! ${playerResult.reason}`,
        playerWillingness: playerResult.willingness,
        playerSalaryDemand: playerResult.salaryDemand,
        negotiationPhase: 'done',
      },
    };
  }

  // Player still refuses
  if (updatedOffer.negotiationRound >= 3) {
    updatedOffer.status = 'player_rejected';
    updatedOffer.negotiationPhase = 'done';
    updatedOffer.rejectionReason = playerResult.reason;
  } else {
    updatedOffer.status = 'club_agreed';
    updatedOffer.rejectionReason = playerResult.reason;
  }

  const filteredOffers = state.transfers.offers.filter(o => o.id !== existingOffer.id);
  const newState: GameState = { ...state, transfers: { ...state.transfers, offers: [...filteredOffers, updatedOffer] } };

  return {
    newState,
    evaluation: {
      decision: updatedOffer.negotiationRound >= 3 ? 'rejected' : 'player_rejected',
      reason: updatedOffer.negotiationRound >= 3
        ? `Spieler lehnt endgültig ab. ${playerResult.reason}`
        : playerResult.reason,
      playerWillingness: playerResult.willingness,
      playerSalaryDemand: playerResult.salaryDemand,
      negotiationPhase: updatedOffer.negotiationPhase,
    },
  };
}

// ════════════════════════════════════════════════════════
//  Accept Counter Offer (club counter → re-evaluate)
// ════════════════════════════════════════════════════════

export function acceptCounterOffer(state: GameState, offerId: string): GameState {
  const offer = state.transfers.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'counter_offer' || !offer.counterFee) return state;

  const player = state.players.find((p) => p.id === offer.playerId);
  if (!player) return state;

  const buyingTeam = state.teams.find(t => t.id === state.currentTeamId);
  const sellingTeam = state.teams.find(t => t.id === offer.fromTeamId);
  if (!buyingTeam || !sellingTeam) return state;

  // Club agrees at counter price — now check player willingness
  const playerResult = evaluatePlayerWillingness(player, buyingTeam, sellingTeam, offer.offeredSalary);

  if (playerResult.willing) {
    // Both agree — execute
    const updatedOffers = state.transfers.offers.map((o) =>
      o.id === offerId ? { ...o, status: 'completed' as const, fee: offer.counterFee!, negotiationPhase: 'done' as NegotiationPhase } : o
    );
    const newState = { ...state, transfers: { ...state.transfers, offers: updatedOffers } };
    return executeTransfer(newState, offer.playerId, offer.fromTeamId, offer.toTeamId, offer.counterFee, offer.offeredSalary, offer.offeredContractYears);
  }

  // Player refuses — move to player negotiation phase
  const updatedOffers = state.transfers.offers.map((o) =>
    o.id === offerId ? {
      ...o,
      status: 'club_agreed' as const,
      fee: offer.counterFee!,
      negotiationPhase: 'player' as NegotiationPhase,
      playerWillingness: playerResult.willingness,
      playerSalaryDemand: playerResult.salaryDemand,
      rejectionReason: playerResult.reason,
    } : o
  );

  return { ...state, transfers: { ...state.transfers, offers: updatedOffers } };
}

// --- Toggle Transfer List ---

export function toggleTransferList(state: GameState, playerId: string): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.teamId !== state.currentTeamId) return state;

  const isListed = player.isTransferListed;

  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, isTransferListed: !isListed } : p
  );

  let newListings = [...state.transfers.listings];

  if (!isListed) {
    // Add to listings
    const listing: TransferListing = {
      playerId,
      teamId: state.currentTeamId,
      askingPrice: player.marketValue,
      listedDate: state.currentDate,
      isLoanAvailable: false,
    };
    newListings.push(listing);
  } else {
    // Remove from listings
    newListings = newListings.filter((l) => l.playerId !== playerId);
  }

  return {
    ...state,
    players: newPlayers,
    transfers: { ...state.transfers, listings: newListings },
  };
}

// --- AI generates incoming offers for listed players (called during day advance) ---

export function generateIncomingOffers(state: GameState): GameState {
  const listings = state.transfers.listings.filter((l) => l.teamId === state.currentTeamId);
  if (listings.length === 0) return state;

  // Simple RNG based on date
  const seed = hashStr(state.currentDate);
  const rng = () => {
    const x = Math.sin(seed + state.transfers.offers.length) * 10000;
    return x - Math.floor(x);
  };

  // ~15% chance per listed player per day to get an offer
  const newOffers: TransferOffer[] = [];
  const newNews: NewsItem[] = [];

  for (const listing of listings) {
    if (rng() > 0.15) continue;

    const player = state.players.find((p) => p.id === listing.playerId);
    if (!player) continue;

    // Pick a random team from another league or same league
    const otherTeams = state.teams.filter((t) =>
      t.id !== state.currentTeamId &&
      t.reputation >= Math.max(20, player.marketValue > 5000000 ? 50 : 30)
    );
    if (otherTeams.length === 0) continue;

    const buyingTeam = otherTeams[Math.floor(rng() * otherTeams.length)];

    // AI offer is 75-110% of asking price
    const offerMultiplier = 0.75 + rng() * 0.35;
    const offerFee = Math.round(listing.askingPrice * offerMultiplier / 100000) * 100000;

    const offer: TransferOffer = {
      id: generateId(),
      playerId: listing.playerId,
      fromTeamId: state.currentTeamId,
      toTeamId: buyingTeam.id,
      fee: offerFee,
      bonuses: [],
      sellOnPercentage: 0,
      offeredSalary: Math.round(player.salary * (0.9 + rng() * 0.3)),
      offeredContractYears: Math.floor(2 + rng() * 3),
      status: 'pending',
      date: state.currentDate,
      isPlayerSide: false,
      expiresDate: addDays(state.currentDate, 5),
      negotiationPhase: 'club',
      negotiationRound: 0,
    };

    newOffers.push(offer);
    newNews.push({
      id: `offer-${offer.id}`,
      type: 'transfer',
      title: `Eingehendes Angebot für ${player.lastName}`,
      content: `${buyingTeam.name} bietet ${formatVal(offerFee)} für ${player.firstName} ${player.lastName}.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    });
  }

  if (newOffers.length === 0) return state;

  return {
    ...state,
    transfers: {
      ...state.transfers,
      offers: [...state.transfers.offers, ...newOffers],
    },
    news: [...state.news, ...newNews],
  };
}

// --- Deadline Day: increased transfer activity ---

export function isDeadlineDay(dateStr: string): boolean {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const day = d.getDate();
  return (month === 7 && day === 31) || (month === 0 && day === 31); // Aug 31 or Jan 31
}

export function isLastWeekOfWindow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const day = d.getDate();
  return (month === 7 && day >= 25) || (month === 0 && day >= 25); // Last week of Aug or Jan
}

/**
 * Deadline Day: AI teams make unsolicited bids for the player's squad members.
 * Called from day-advance on deadline day or last week of window.
 */
export function generateDeadlineDayOffers(state: GameState): GameState {
  const deadline = isDeadlineDay(state.currentDate);
  const lastWeek = isLastWeekOfWindow(state.currentDate);
  if (!deadline && !lastWeek) return state;

  const myPlayers = state.players.filter(p => p.teamId === state.currentTeamId);
  if (myPlayers.length === 0) return state;

  const seed = hashStr(state.currentDate + 'deadline');
  let seedCounter = 0;
  const rng = () => {
    seedCounter++;
    const x = Math.sin(seed + seedCounter) * 10000;
    return x - Math.floor(x);
  };

  // On deadline day: 2-4 unsolicited offers. Last week: 0-2.
  const maxOffers = deadline ? 2 + Math.floor(rng() * 3) : Math.floor(rng() * 3);
  if (maxOffers === 0) return state;

  // Sort players by market value, pick from top half
  const sorted = [...myPlayers].sort((a, b) => b.marketValue - a.marketValue);
  const candidates = sorted.slice(0, Math.ceil(sorted.length / 2));

  const newOffers: TransferOffer[] = [];
  const newNews: NewsItem[] = [];

  for (let i = 0; i < maxOffers && i < candidates.length; i++) {
    const player = candidates[Math.floor(rng() * candidates.length)];
    // Skip if already has a pending offer
    if (state.transfers.offers.some(o => o.playerId === player.id && o.status === 'pending')) continue;

    const otherTeams = state.teams.filter(t =>
      t.id !== state.currentTeamId &&
      t.reputation >= Math.max(30, (player.marketValue > 10000000 ? 60 : 40))
    );
    if (otherTeams.length === 0) continue;

    const buyingTeam = otherTeams[Math.floor(rng() * otherTeams.length)];

    // Deadline offers are often overpaying (panic buys): 90-130% of market value
    const multiplier = deadline ? (0.90 + rng() * 0.40) : (0.80 + rng() * 0.30);
    const offerFee = Math.round(player.marketValue * multiplier / 100000) * 100000;

    const offer: TransferOffer = {
      id: generateId(),
      playerId: player.id,
      fromTeamId: state.currentTeamId,
      toTeamId: buyingTeam.id,
      fee: offerFee,
      bonuses: [],
      sellOnPercentage: 0,
      offeredSalary: Math.round(player.salary * (1.0 + rng() * 0.4)),
      offeredContractYears: Math.floor(2 + rng() * 3),
      status: 'pending',
      date: state.currentDate,
      isPlayerSide: false,
      expiresDate: deadline ? state.currentDate : addDays(state.currentDate, 2),
      negotiationPhase: 'club',
      negotiationRound: 0,
    };

    newOffers.push(offer);
    const urgency = deadline ? '🚨 DEADLINE DAY: ' : '⏰ ';
    newNews.push({
      id: `deadline-offer-${offer.id}`,
      type: 'transfer',
      title: `${urgency}Angebot für ${player.lastName}!`,
      content: `${buyingTeam.name} bietet ${formatVal(offerFee)} für ${player.firstName} ${player.lastName}. ${deadline ? 'Deadline Day — Angebot läuft heute ab!' : 'Letzte Woche des Transferfensters!'}`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    });
  }

  if (newOffers.length === 0) return state;

  // Deadline day news event
  if (deadline && newOffers.length > 0) {
    newNews.unshift({
      id: `deadline-day-${state.currentDate}`,
      type: 'general',
      title: '🚨 DEADLINE DAY!',
      content: `Das Transferfenster schließt heute Nacht! ${newOffers.length} Last-Minute-Angebot${newOffers.length > 1 ? 'e' : ''} für deine Spieler!`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    });
  }

  return {
    ...state,
    transfers: {
      ...state.transfers,
      offers: [...state.transfers.offers, ...newOffers],
    },
    news: [...state.news, ...newNews],
  };
}

// --- Accept/Reject incoming offer ---

export function respondToIncomingOffer(state: GameState, offerId: string, accept: boolean): GameState {
  const offer = state.transfers.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'pending') return state;

  if (!accept) {
    return {
      ...state,
      transfers: {
        ...state.transfers,
        offers: state.transfers.offers.map((o) =>
          o.id === offerId ? { ...o, status: 'rejected' as const } : o
        ),
      },
    };
  }

  // Accept: execute the transfer (player leaves our team)
  const updatedOffers = state.transfers.offers.map((o) =>
    o.id === offerId ? { ...o, status: 'completed' as const } : o
  );
  const newState = { ...state, transfers: { ...state.transfers, offers: updatedOffers } };

  return executeTransfer(
    newState,
    offer.playerId,
    offer.fromTeamId,
    offer.toTeamId,
    offer.fee,
    offer.offeredSalary,
    offer.offeredContractYears,
  );
}

// --- Counter incoming offer (player demands more) ---

export function counterIncomingOffer(
  state: GameState,
  offerId: string,
  demandedFee: number,
): { state: GameState; result: 'accepted' | 'raised' | 'rejected' | 'withdrawn'; newFee?: number } {
  const offer = state.transfers.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'pending') return { state, result: 'rejected' };

  const player = state.players.find((p) => p.id === offer.playerId);
  if (!player) return { state, result: 'rejected' };

  const buyingTeam = state.teams.find((t) => t.id === offer.toTeamId);
  if (!buyingTeam) return { state, result: 'rejected' };

  const marketValue = player.marketValue;
  const originalFee = offer.fee;
  const demandRatio = demandedFee / marketValue;

  // AI club's maximum willingness: based on reputation and player value
  const repBonus = Math.max(0, (buyingTeam.reputation - 40) / 100); // 0-0.6
  const maxWilling = Math.round(marketValue * (1.15 + repBonus * 0.3)); // up to ~145% of market value

  // If demand is above what they'll ever pay → withdraw or reject
  if (demandedFee > maxWilling * 1.3) {
    // Outrageous demand — club withdraws
    const news: NewsItem = {
      id: `transfer-withdraw-${offerId}`,
      type: 'transfer',
      title: `${buyingTeam.name} zieht Angebot zurück`,
      content: `${buyingTeam.name} hat das Angebot für ${player.lastName} nach überzogener Forderung (${formatVal(demandedFee)}) zurückgezogen.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    };
    return {
      state: {
        ...state,
        transfers: {
          ...state.transfers,
          offers: state.transfers.offers.map(o => o.id === offerId ? { ...o, status: 'rejected' as const } : o),
        },
        news: [...state.news, news],
      },
      result: 'withdrawn',
    };
  }

  if (demandedFee > maxWilling) {
    // Too high but not outrageous — reject but keep offer open at original price
    const news: NewsItem = {
      id: `transfer-counter-reject-${offerId}`,
      type: 'transfer',
      title: `${buyingTeam.name} lehnt Forderung ab`,
      content: `${buyingTeam.name} lehnt die Forderung von ${formatVal(demandedFee)} für ${player.lastName} ab. Ihr ursprüngliches Angebot von ${formatVal(originalFee)} bleibt bestehen.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'medium',
    };
    return {
      state: { ...state, news: [...state.news, news] },
      result: 'rejected',
    };
  }

  // Club is willing to go higher — how high?
  if (demandedFee <= originalFee) {
    // Player asked for less or same — accept immediately
    return { state: respondToIncomingOffer(state, offerId, true), result: 'accepted', newFee: originalFee };
  }

  // Chance of accepting full demand vs meeting halfway
  const gapRatio = (demandedFee - originalFee) / (maxWilling - originalFee);
  const acceptFullChance = Math.max(0.1, 1 - gapRatio); // closer to max = less likely to accept full

  if (Math.random() < acceptFullChance * 0.5) {
    // Accept full demand
    const updatedOffers = state.transfers.offers.map(o =>
      o.id === offerId ? { ...o, fee: demandedFee, status: 'completed' as const } : o
    );
    let newState = { ...state, transfers: { ...state.transfers, offers: updatedOffers } };
    newState = executeTransfer(newState, offer.playerId, offer.fromTeamId, offer.toTeamId, demandedFee, offer.offeredSalary, offer.offeredContractYears);
    return { state: newState, result: 'accepted', newFee: demandedFee };
  }

  // Meet somewhere between original and demanded
  const meetRatio = 0.4 + Math.random() * 0.4; // 40-80% of the way
  const newFee = Math.round((originalFee + (demandedFee - originalFee) * meetRatio) / 100_000) * 100_000;

  const news: NewsItem = {
    id: `transfer-counter-raise-${offerId}`,
    type: 'transfer',
    title: `${buyingTeam.name} erhöht Angebot für ${player.lastName}`,
    content: `${buyingTeam.name} erhöht das Angebot auf ${formatVal(newFee)} (vorher: ${formatVal(originalFee)}, gefordert: ${formatVal(demandedFee)}).`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  };

  return {
    state: {
      ...state,
      transfers: {
        ...state.transfers,
        offers: state.transfers.offers.map(o => o.id === offerId ? { ...o, fee: newFee } : o),
      },
      news: [...state.news, news],
    },
    result: 'raised',
    newFee,
  };
}

// --- Helpers ---

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}
