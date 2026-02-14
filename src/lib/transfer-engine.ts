import { GameState } from '@/types/game';
import { Player } from '@/types/player';
import { Team } from '@/types/team';
import { TransferOffer, Transfer, TransferListing } from '@/types/transfer';
import { NewsItem } from '@/types/news';

// --- Helpers ---

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function calcOverall(p: Player): number {
  const a = p.attributes;
  if (p.position === 'TW') return Math.round(a.reflexes * 0.25 + a.handling * 0.2 + a.diving * 0.2 + a.kicking * 0.1 + a.oneOnOne * 0.15 + a.composure * 0.1);
  if (['IV', 'LV', 'RV'].includes(p.position)) return Math.round(a.positioning * 0.2 + a.strength * 0.1 + a.heading * 0.1 + a.pace * 0.1 + a.passing * 0.1 + a.aggression * 0.1 + a.composure * 0.1 + a.stamina * 0.1 + a.workRate * 0.1);
  if (['ZDM', 'ZM'].includes(p.position)) return Math.round(a.passing * 0.2 + a.vision * 0.15 + a.stamina * 0.1 + a.positioning * 0.1 + a.ballControl * 0.1 + a.workRate * 0.1 + a.composure * 0.1 + a.shooting * 0.05 + a.strength * 0.1);
  if (p.position === 'ZOM') return Math.round(a.vision * 0.2 + a.passing * 0.15 + a.ballControl * 0.15 + a.dribbling * 0.1 + a.shooting * 0.1 + a.composure * 0.1 + a.finishing * 0.1 + a.pace * 0.1);
  if (['LA', 'RA'].includes(p.position)) return Math.round(a.pace * 0.2 + a.dribbling * 0.15 + a.crossing * 0.15 + a.acceleration * 0.1 + a.shooting * 0.1 + a.ballControl * 0.1 + a.stamina * 0.1 + a.finishing * 0.1);
  return Math.round(a.finishing * 0.25 + a.shooting * 0.15 + a.heading * 0.1 + a.positioning * 0.1 + a.composure * 0.1 + a.pace * 0.1 + a.strength * 0.1 + a.dribbling * 0.1);
}

function getAge(dob: string): number {
  return new Date('2025-07-01').getFullYear() - new Date(dob).getFullYear();
}

// --- AI Valuation ---

/**
 * AI evaluates how much a player is worth to the selling team.
 * Factors: market value, age, contract length, team importance, form
 */
function aiAskingPrice(player: Player, sellingTeam: Team, buyingTeam: Team): number {
  let base = player.marketValue;

  // Contract factor: shorter contract = cheaper
  const contractEnd = new Date(player.contractUntil);
  const now = new Date('2025-07-01');
  const yearsLeft = Math.max(0.5, (contractEnd.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (yearsLeft < 1) base *= 0.5;
  else if (yearsLeft < 2) base *= 0.75;
  else if (yearsLeft > 3) base *= 1.15;

  // Age factor: young talents are premium
  const age = getAge(player.dateOfBirth);
  if (age <= 21) base *= 1.35;
  else if (age <= 24) base *= 1.15;
  else if (age >= 32) base *= 0.7;
  else if (age >= 30) base *= 0.85;

  // Reputation premium: selling to a bigger club costs more
  const repDiff = buyingTeam.reputation - sellingTeam.reputation;
  if (repDiff > 20) base *= 1.25;
  else if (repDiff > 10) base *= 1.1;

  // Form bonus
  if (player.form > 75) base *= 1.1;

  // Key player bonus: high overall relative to team average
  const overall = calcOverall(player);
  if (overall >= 75) base *= 1.1;

  return Math.round(base / 100000) * 100000;
}

/**
 * AI decides whether to accept, reject, or counter an offer.
 */
export function evaluateOffer(
  player: Player,
  offer: number,
  sellingTeam: Team,
  buyingTeam: Team
): { decision: 'accepted' | 'rejected' | 'counter_offer'; counterFee?: number; reason: string } {
  const askPrice = aiAskingPrice(player, sellingTeam, buyingTeam);

  const ratio = offer / askPrice;

  // Transfer listed players are easier to buy
  const listedDiscount = player.isTransferListed ? 0.15 : 0;

  if (ratio >= (0.95 - listedDiscount)) {
    return { decision: 'accepted', reason: 'Der Verein akzeptiert das Angebot.' };
  }

  if (ratio >= (0.7 - listedDiscount)) {
    const counter = Math.round(askPrice * (0.92 - listedDiscount / 2) / 100000) * 100000;
    return {
      decision: 'counter_offer',
      counterFee: counter,
      reason: `Gegenangebot: ${formatVal(counter)} (Forderung: ~${formatVal(askPrice)})`,
    };
  }

  if (ratio >= 0.4) {
    return { decision: 'rejected', reason: `Angebot zu niedrig. Der Verein erwartet mindestens ~${formatVal(Math.round(askPrice * 0.85 / 100000) * 100000)}.` };
  }

  return { decision: 'rejected', reason: 'Das Angebot wird als unseriös abgelehnt.' };
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
      ? `${player.firstName} ${player.lastName} wechselt von ${otherTeam?.name ?? '?'} für ${formatVal(fee)} zu deinem Verein.`
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

// --- Player Offer Creation ---

export function createOffer(
  state: GameState,
  playerId: string,
  fee: number,
  salary: number,
  contractYears: number,
): { newState: GameState; offer: TransferOffer; evaluation: ReturnType<typeof evaluateOffer> } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found');

  const sellingTeam = state.teams.find((t) => t.id === player.teamId);
  const buyingTeam = state.teams.find((t) => t.id === state.currentTeamId);
  if (!sellingTeam || !buyingTeam) throw new Error('Team not found');

  const evaluation = evaluateOffer(player, fee, sellingTeam, buyingTeam);

  const offer: TransferOffer = {
    id: generateId(),
    playerId,
    fromTeamId: player.teamId,
    toTeamId: state.currentTeamId,
    fee,
    bonuses: [],
    sellOnPercentage: 0,
    offeredSalary: salary,
    offeredContractYears: contractYears,
    status: evaluation.decision,
    date: state.currentDate,
    isPlayerSide: false,
    counterFee: evaluation.counterFee,
    expiresDate: addDays(state.currentDate, 3),
  };

  const newOffers = [...state.transfers.offers, offer];

  const newState: GameState = {
    ...state,
    transfers: { ...state.transfers, offers: newOffers },
  };

  // If accepted, auto-execute
  if (evaluation.decision === 'accepted') {
    return {
      newState: executeTransfer(newState, playerId, player.teamId, state.currentTeamId, fee, salary, contractYears),
      offer,
      evaluation,
    };
  }

  return { newState, offer, evaluation };
}

// --- Accept Counter Offer ---

export function acceptCounterOffer(state: GameState, offerId: string): GameState {
  const offer = state.transfers.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'counter_offer' || !offer.counterFee) return state;

  const player = state.players.find((p) => p.id === offer.playerId);
  if (!player) return state;

  // Update the offer status
  const updatedOffers = state.transfers.offers.map((o) =>
    o.id === offerId ? { ...o, status: 'completed' as const, fee: offer.counterFee! } : o
  );

  const newState = { ...state, transfers: { ...state.transfers, offers: updatedOffers } };

  return executeTransfer(
    newState,
    offer.playerId,
    offer.fromTeamId,
    offer.toTeamId,
    offer.counterFee,
    offer.offeredSalary,
    offer.offeredContractYears,
  );
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
