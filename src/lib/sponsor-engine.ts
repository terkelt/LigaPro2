/**
 * Sponsor Engine — generates sponsor offers and manages contracts.
 * Categories: Trikot, Ärmel, Bande, Stadion, Ausrüster, Partner
 * Each exclusive slot (Trikot, Ärmel, Stadion, Ausrüster) can only have 1 sponsor.
 * Bande allows 2, Partner allows 3.
 * Cancelling a sponsor early incurs a penalty fee.
 */
import { GameState } from '@/types/game';
import { Sponsor, SponsorOffer, SponsorType, SponsorCondition, SponsorConditionType, SponsorConditionTerm, SPONSOR_TYPE_LABELS, SPONSOR_MAX_SLOTS } from '@/types/finance';
import { NewsItem } from '@/types/news';

function generateId(): string {
  return 'spon-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// ── Sponsor Name Pools ──
const SPONSOR_NAMES: Record<SponsorType, string[]> = {
  trikot: [
    'Deutsche Telekom', 'SAP', 'Volkswagen', 'REWE', 'Lidl',
    'DHL', 'Bayer', 'Henkel', 'Continental', 'Siemens',
    '1&1', 'Veolia', 'Evonik', 'Wiesenhof', 'Postbank',
  ],
  aermel: [
    'Indeed', 'Tipico', 'Hermes', 'Orthomol', 'Capri-Sun',
    'Ergo', 'Viessmann', 'Flyeralarm', 'Sunmaker', 'bet-at-home',
  ],
  bande: [
    'Coca-Cola', 'Pepsi', 'Samsung', 'Bitburger', 'Krombacher',
    'Warsteiner', 'Gerolsteiner', 'Radeberger', 'Paulaner', 'Erdinger',
    'Aral', 'Shell', 'Sparkasse', 'Commerzbank', 'ING',
  ],
  stadion: [
    'Allianz', 'Signal Iduna', 'Veltins', 'Merkur', 'PreZero',
    'Vonovia', 'Red Bull', 'Deutsche Bank', 'Commerzbank', 'Wohninvest',
  ],
  ausruester: [
    'Adidas', 'Nike', 'Puma', 'Under Armour', 'New Balance',
    'Umbro', 'Macron', 'Joma', 'Jako', 'Hummel',
  ],
  partner: [
    'EA Sports', 'Konami', 'Sony', 'Apple', 'Google', 'Amazon',
    'Mercedes-Benz', 'BMW', 'Audi', 'Lufthansa', 'Deutsche Bahn',
  ],
};

// ── Amount Ranges per Type and League Tier (realistic, reduced from original) ──
const AMOUNT_RANGES: Record<SponsorType, Record<number, { min: number; max: number }>> = {
  trikot: {
    1: { min: 3_000_000, max: 18_000_000 },
    2: { min: 600_000, max: 4_500_000 },
    3: { min: 100_000, max: 1_000_000 },
  },
  aermel: {
    1: { min: 500_000, max: 4_000_000 },
    2: { min: 150_000, max: 1_000_000 },
    3: { min: 25_000, max: 250_000 },
  },
  bande: {
    1: { min: 250_000, max: 1_500_000 },
    2: { min: 80_000, max: 500_000 },
    3: { min: 15_000, max: 150_000 },
  },
  stadion: {
    1: { min: 2_000_000, max: 8_000_000 },
    2: { min: 300_000, max: 2_000_000 },
    3: { min: 50_000, max: 500_000 },
  },
  ausruester: {
    1: { min: 2_000_000, max: 12_000_000 },
    2: { min: 500_000, max: 3_000_000 },
    3: { min: 80_000, max: 800_000 },
  },
  partner: {
    1: { min: 200_000, max: 2_500_000 },
    2: { min: 50_000, max: 800_000 },
    3: { min: 15_000, max: 200_000 },
  },
};

/**
 * Generate a single sponsor offer for a given type.
 */
function createSponsorOffer(
  type: SponsorType,
  tier: number,
  reputation: number,
  currentDate: string,
): SponsorOffer {
  const names = SPONSOR_NAMES[type];
  const name = names[Math.floor(Math.random() * names.length)];
  const range = AMOUNT_RANGES[type][tier] || AMOUNT_RANGES[type][3];

  const repFactor = Math.max(0.2, reputation / 100);
  const baseAmount = range.min + (range.max - range.min) * repFactor;
  // More variance: offers can be significantly below max
  const amount = Math.round(baseAmount * (0.70 + Math.random() * 0.35));

  const contractYears = 1 + Math.floor(Math.random() * 3);
  const bonusCL = type === 'trikot' ? Math.round(amount * 0.15) : 0;
  const bonusTitle = ['trikot', 'ausruester'].includes(type) ? Math.round(amount * 0.1) : Math.round(amount * 0.05);

  // Cancellation penalty: 50% of remaining contract value
  const cancellationPenalty = Math.round(amount * contractYears * 0.5);

  const expiresDate = new Date(currentDate);
  expiresDate.setDate(expiresDate.getDate() + 14);

  // Generate 1-2 conditions based on sponsor type and tier
  const conditions = generateSponsorConditions(type, tier, amount);

  // Negotiation: the initial offer is 70-85% of the sponsor's hidden maximum
  const maxAmount = Math.round(amount * (1.15 + Math.random() * 0.15));
  const initialOffer = Math.round(amount * (0.70 + Math.random() * 0.15));

  return {
    id: generateId(),
    sponsorName: name,
    type,
    amountPerSeason: initialOffer,
    contractYears,
    bonusCL,
    bonusTitle,
    minReputation: Math.max(10, reputation - 20),
    date: currentDate,
    expiresDate: expiresDate.toISOString().split('T')[0],
    cancellationPenalty: Math.round(initialOffer * contractYears * 0.5),
    conditions,
    maxNegotiateAmount: maxAmount,
    negotiationAttempts: 0,
  };
}

// ── Condition Generation ──

interface ConditionTemplate {
  type: SponsorConditionType;
  term: SponsorConditionTerm;
  label: (target: number) => string;
  targetByTier: Record<number, number>;
  penaltyFactor: number; // fraction of amountPerSeason
}

const CONDITION_POOL: ConditionTemplate[] = [
  // Short-term conditions (checked monthly/quarterly)
  {
    type: 'home_wins',
    term: 'short',
    label: (t) => `Mindestens ${t} Heimsiege pro Saison`,
    targetByTier: { 1: 10, 2: 8, 3: 6 },
    penaltyFactor: 0.08,
  },
  {
    type: 'goals_scored',
    term: 'short',
    label: (t) => `Mindestens ${t} Tore pro Saison erzielen`,
    targetByTier: { 1: 45, 2: 35, 3: 25 },
    penaltyFactor: 0.06,
  },
  {
    type: 'clean_sheets',
    term: 'short',
    label: (t) => `Mindestens ${t} Spiele ohne Gegentor pro Saison`,
    targetByTier: { 1: 8, 2: 6, 3: 4 },
    penaltyFactor: 0.07,
  },
  {
    type: 'avg_attendance',
    term: 'short',
    label: (t) => `Durchschnittliche Stadionauslastung über ${t}%`,
    targetByTier: { 1: 75, 2: 65, 3: 55 },
    penaltyFactor: 0.05,
  },
  // Medium-term conditions (checked at season end)
  {
    type: 'min_league_position',
    term: 'medium',
    label: (t) => `Saisonende in den Top ${t} der Liga`,
    targetByTier: { 1: 8, 2: 6, 3: 5 },
    penaltyFactor: 0.12,
  },
  {
    type: 'cup_round',
    term: 'medium',
    label: (t) => `Mindestens ${t === 2 ? 'Achtelfinale' : t === 3 ? 'Viertelfinale' : t === 4 ? 'Halbfinale' : `Runde ${t}`} im Pokal erreichen`,
    targetByTier: { 1: 3, 2: 2, 3: 1 },
    penaltyFactor: 0.10,
  },
  // Long-term conditions (checked at season end)
  {
    type: 'no_relegation',
    term: 'long',
    label: () => `Nicht absteigen`,
    targetByTier: { 1: 1, 2: 1, 3: 1 },
    penaltyFactor: 0.20,
  },
  {
    type: 'european_qualification',
    term: 'long',
    label: () => `Für einen europäischen Wettbewerb qualifizieren`,
    targetByTier: { 1: 1, 2: 1, 3: 1 },
    penaltyFactor: 0.15,
  },
];

function generateSponsorConditions(
  type: SponsorType,
  tier: number,
  amount: number,
): SponsorCondition[] {
  const conditions: SponsorCondition[] = [];

  // Higher-value sponsors have more conditions; big sponsors almost always have 2
  const numConditions = type === 'partner' || type === 'bande' ? 1
    : type === 'trikot' || type === 'stadion' || type === 'ausruester' ? (Math.random() < 0.25 ? 1 : 2)
    : (Math.random() < 0.6 ? 1 : 2);

  // Filter pool: tier-1 can get european_qualification, others can't
  let pool = [...CONDITION_POOL];
  if (tier > 1) {
    pool = pool.filter(c => c.type !== 'european_qualification');
  }
  // Small sponsors (partner/bande) only get short-term conditions
  if (type === 'partner' || type === 'bande') {
    pool = pool.filter(c => c.term === 'short');
  }

  // Shuffle and pick
  pool.sort(() => Math.random() - 0.5);
  const usedTypes = new Set<SponsorConditionType>();

  for (const tmpl of pool) {
    if (conditions.length >= numConditions) break;
    if (usedTypes.has(tmpl.type)) continue;
    usedTypes.add(tmpl.type);

    const target = tmpl.targetByTier[tier] ?? tmpl.targetByTier[3];
    const penalty = Math.round(amount * tmpl.penaltyFactor);

    conditions.push({
      type: tmpl.type,
      term: tmpl.term,
      label: tmpl.label(target),
      target,
      penaltyAmount: penalty,
    });
  }

  return conditions;
}

/**
 * Check if new sponsor offers should be generated.
 */
export function generateSponsorOffers(state: GameState): GameState {
  const team = state.teams.find(t => t.id === state.currentTeamId);
  if (!team) return state;

  const d = new Date(state.currentDate);
  const month = d.getMonth();
  const dayOfMonth = d.getDate();

  const isPreseason = month === 6;
  // Reduced frequency: preseason every 5 days, in-season only on 1st of month
  const shouldCheck = isPreseason
    ? (dayOfMonth % 5 === 0)
    : (dayOfMonth === 1);

  if (!shouldCheck) return state;

  const league = state.leagues.find(l => l.id === team.league);
  const tier = league?.tier ?? 3;

  const activeSponsors = state.sponsors.filter(s => s.isActive);
  const validOffers = state.sponsorOffers.filter(o => o.expiresDate >= state.currentDate);

  const newOffers: SponsorOffer[] = [];
  const newNews: NewsItem[] = [];

  const baseChance = isPreseason ? 0.20 : 0.06;
  const repBonus = team.reputation / 800;
  const chance = baseChance + repBonus;

  // Check each category for available slots
  const TYPES: SponsorType[] = ['trikot', 'aermel', 'bande', 'stadion', 'ausruester', 'partner'];
  const TYPE_CHANCE: Record<SponsorType, number> = {
    trikot: 1.5, aermel: 1.0, bande: 0.8, stadion: 0.5, ausruester: 0.7, partner: 0.8,
  };

  for (const type of TYPES) {
    const maxSlots = SPONSOR_MAX_SLOTS[type];
    const activeCount = activeSponsors.filter(s => s.type === type).length;
    const pendingOffers = validOffers.filter(o => o.type === type).length;

    if (activeCount >= maxSlots) continue;
    if (pendingOffers > 0) continue;

    if (Math.random() < chance * (TYPE_CHANCE[type] ?? 1)) {
      const offer = createSponsorOffer(type, tier, team.reputation, state.currentDate);
      newOffers.push(offer);
      newNews.push({
        id: `sponsor-offer-${offer.id}`,
        type: 'general',
        title: `${SPONSOR_TYPE_LABELS[type]}-Anfrage: ${offer.sponsorName}`,
        content: `${offer.sponsorName} bietet einen ${SPONSOR_TYPE_LABELS[type]}-Vertrag über ${formatValue(offer.amountPerSeason)}/Saison für ${offer.contractYears} Jahre an. Kündigungsstrafe: ${formatValue(offer.cancellationPenalty)}.`,
        date: state.currentDate,
        isRead: false,
        relatedTeamId: state.currentTeamId,
        importance: ['trikot', 'stadion', 'ausruester'].includes(type) ? 'high' : 'medium',
      });
    }
  }

  if (newOffers.length === 0) return state;

  return {
    ...state,
    sponsorOffers: [...validOffers, ...newOffers],
    news: [...state.news, ...newNews],
  };
}

/**
 * Accept a sponsor offer — creates an active Sponsor from a SponsorOffer.
 * If the slot is already occupied (exclusive types), the old sponsor is deactivated.
 */
export function acceptSponsorOffer(state: GameState, offerId: string): GameState {
  const offer = state.sponsorOffers.find(o => o.id === offerId);
  if (!offer) return state;

  // Check slot availability
  const maxSlots = SPONSOR_MAX_SLOTS[offer.type];
  const activeCount = state.sponsors.filter(s => s.type === offer.type && s.isActive).length;
  if (activeCount >= maxSlots) {
    // Slot is full — cannot accept without cancelling first
    return state;
  }

  const endDate = new Date(state.currentDate);
  endDate.setFullYear(endDate.getFullYear() + offer.contractYears);

  const newSponsor: Sponsor = {
    id: generateId(),
    name: offer.sponsorName,
    type: offer.type,
    amountPerSeason: offer.amountPerSeason,
    contractYears: offer.contractYears,
    contractStart: state.currentDate,
    contractEnd: endDate.toISOString().split('T')[0],
    bonusCL: offer.bonusCL,
    bonusTitle: offer.bonusTitle,
    isActive: true,
    cancellationPenalty: offer.cancellationPenalty,
    conditions: offer.conditions,
  };

  const conditionText = offer.conditions && offer.conditions.length > 0
    ? ` Bedingungen: ${offer.conditions.map(c => c.label).join('; ')}.`
    : '';

  const news: NewsItem = {
    id: `sponsor-signed-${newSponsor.id}`,
    type: 'contract',
    title: `Neuer ${SPONSOR_TYPE_LABELS[offer.type]}: ${offer.sponsorName}!`,
    content: `${offer.sponsorName} wird neuer ${SPONSOR_TYPE_LABELS[offer.type]}. Vertrag: ${offer.contractYears} Jahre, ${formatValue(offer.amountPerSeason)}/Saison. Vorzeitige Kündigung: ${formatValue(offer.cancellationPenalty)} Strafe.${conditionText}`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  };

  return {
    ...state,
    sponsors: [...state.sponsors, newSponsor],
    sponsorOffers: state.sponsorOffers.filter(o => o.id !== offerId),
    news: [...state.news, news],
  };
}

/**
 * Negotiate a sponsor offer — try to get a higher amount.
 * Max 2 attempts. Each attempt either raises the offer or risks the sponsor withdrawing.
 * Returns: { state, result: 'raised' | 'unchanged' | 'withdrawn' | 'max_attempts' }
 */
export function negotiateSponsorOffer(state: GameState, offerId: string): { state: GameState; result: 'raised' | 'unchanged' | 'withdrawn' | 'max_attempts' } {
  const offer = state.sponsorOffers.find(o => o.id === offerId);
  if (!offer) return { state, result: 'unchanged' };
  if (offer.isWithdrawn) return { state, result: 'withdrawn' };
  if (offer.negotiationAttempts >= 2) return { state, result: 'max_attempts' };

  const attempt = offer.negotiationAttempts + 1;
  // Withdrawal risk increases with each attempt: 15% on 1st, 35% on 2nd
  const withdrawalRisk = attempt === 1 ? 0.15 : 0.35;

  if (Math.random() < withdrawalRisk) {
    // Sponsor withdraws
    const news: NewsItem = {
      id: `sponsor-withdraw-${offerId}`,
      type: 'general',
      title: `${offer.sponsorName} zieht Angebot zurück!`,
      content: `${offer.sponsorName} hat das ${SPONSOR_TYPE_LABELS[offer.type]}-Angebot nach gescheiterten Verhandlungen zurückgezogen.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'high',
    };
    return {
      state: {
        ...state,
        sponsorOffers: state.sponsorOffers.map(o => o.id === offerId ? { ...o, isWithdrawn: true, negotiationAttempts: attempt } : o),
        news: [...state.news, news],
      },
      result: 'withdrawn',
    };
  }

  // Negotiation succeeds: raise amount toward maxNegotiateAmount
  const currentAmount = offer.amountPerSeason;
  const maxAmount = offer.maxNegotiateAmount;
  const gap = maxAmount - currentAmount;
  // First attempt gets 40-70% of gap, second attempt gets 60-90% of remaining
  const raisePercent = attempt === 1 ? (0.40 + Math.random() * 0.30) : (0.60 + Math.random() * 0.30);
  const newAmount = Math.round(currentAmount + gap * raisePercent);

  if (newAmount <= currentAmount) {
    // Sponsor won't budge
    return {
      state: {
        ...state,
        sponsorOffers: state.sponsorOffers.map(o => o.id === offerId ? { ...o, negotiationAttempts: attempt } : o),
      },
      result: 'unchanged',
    };
  }

  const news: NewsItem = {
    id: `sponsor-negotiate-${offerId}-${attempt}`,
    type: 'general',
    title: `Verhandlung erfolgreich: ${offer.sponsorName}`,
    content: `${offer.sponsorName} hat das ${SPONSOR_TYPE_LABELS[offer.type]}-Angebot auf ${formatValue(newAmount)}/Saison erhöht (vorher: ${formatValue(currentAmount)}).`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'medium',
  };

  return {
    state: {
      ...state,
      sponsorOffers: state.sponsorOffers.map(o => o.id === offerId ? {
        ...o,
        amountPerSeason: newAmount,
        cancellationPenalty: Math.round(newAmount * o.contractYears * 0.5),
        negotiationAttempts: attempt,
      } : o),
      news: [...state.news, news],
    },
    result: 'raised',
  };
}

/**
 * Cancel an active sponsor contract early. Incurs a penalty fee.
 */
export function cancelSponsor(state: GameState, sponsorId: string): GameState {
  const sponsor = state.sponsors.find(s => s.id === sponsorId && s.isActive);
  if (!sponsor) return state;

  // Calculate remaining penalty based on remaining contract time
  const now = new Date(state.currentDate);
  const end = new Date(sponsor.contractEnd);
  const totalMs = new Date(sponsor.contractEnd).getTime() - new Date(sponsor.contractStart).getTime();
  const remainingMs = Math.max(0, end.getTime() - now.getTime());
  const remainingFraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const penalty = Math.round((sponsor.cancellationPenalty ?? sponsor.amountPerSeason) * remainingFraction);

  // Deduct penalty from balance
  const finances = state.finances[state.currentTeamId];
  if (!finances) return state;

  const updatedFinances = {
    ...state.finances,
    [state.currentTeamId]: {
      ...finances,
      balance: finances.balance - penalty,
      transferBudget: Math.max(0, finances.transferBudget - penalty),
    },
  };

  const news: NewsItem = {
    id: `sponsor-cancelled-${sponsorId}`,
    type: 'contract',
    title: `Sponsorvertrag gekündigt: ${sponsor.name}`,
    content: `Der ${SPONSOR_TYPE_LABELS[sponsor.type]}-Vertrag mit ${sponsor.name} wurde vorzeitig aufgelöst. Strafzahlung: ${formatValue(penalty)}.`,
    date: state.currentDate,
    isRead: false,
    relatedTeamId: state.currentTeamId,
    importance: 'high',
  };

  return {
    ...state,
    sponsors: state.sponsors.map(s => s.id === sponsorId ? { ...s, isActive: false } : s),
    finances: updatedFinances,
    news: [...state.news, news],
  };
}

/**
 * Decline a sponsor offer.
 */
export function declineSponsorOffer(state: GameState, offerId: string): GameState {
  return {
    ...state,
    sponsorOffers: state.sponsorOffers.filter(o => o.id !== offerId),
  };
}

/**
 * Check for expired sponsor contracts AND expired sponsor offers. Called from day-advance.
 */
export function checkSponsorExpiry(state: GameState): GameState {
  const news: NewsItem[] = [];

  // 1) Expire active sponsor contracts
  let contractChanged = false;
  const updatedSponsors = state.sponsors.map(s => {
    if (s.isActive && s.contractEnd <= state.currentDate) {
      contractChanged = true;
      return { ...s, isActive: false };
    }
    return s;
  });

  if (contractChanged) {
    const expiredNames = state.sponsors
      .filter(s => s.isActive && s.contractEnd <= state.currentDate)
      .map(s => `${s.name} (${SPONSOR_TYPE_LABELS[s.type]})`);

    for (const name of expiredNames) {
      news.push({
        id: `sponsor-expired-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'contract' as const,
        title: `Sponsorvertrag ausgelaufen: ${name}`,
        content: `Der Vertrag mit ${name} ist ausgelaufen. Der Platz ist jetzt frei für neue Angebote.`,
        date: state.currentDate,
        isRead: false,
        relatedTeamId: state.currentTeamId,
        importance: 'medium' as const,
      });
    }
  }

  // 2) Expire sponsor offers that passed their expiresDate
  const expiredOffers = state.sponsorOffers.filter(o => o.expiresDate < state.currentDate);
  const validOffers = state.sponsorOffers.filter(o => o.expiresDate >= state.currentDate);

  for (const offer of expiredOffers) {
    news.push({
      id: `sponsor-offer-expired-${offer.id}`,
      type: 'general' as const,
      title: `Sponsorenangebot abgelaufen: ${offer.sponsorName}`,
      content: `Das ${SPONSOR_TYPE_LABELS[offer.type]}-Angebot von ${offer.sponsorName} (${formatValue(offer.amountPerSeason)}/Saison) ist abgelaufen. Neue Angebote können in Kürze eintreffen — diese können besser oder schlechter ausfallen.`,
      date: state.currentDate,
      isRead: false,
      relatedTeamId: state.currentTeamId,
      importance: 'low' as const,
    });
  }

  if (!contractChanged && expiredOffers.length === 0) return state;

  return {
    ...state,
    sponsors: contractChanged ? updatedSponsors : state.sponsors,
    sponsorOffers: validOffers,
    news: [...state.news, ...news],
  };
}

/**
 * Generate a sponsor offer triggered by preseason camp event.
 * This ensures the "sponsor interest" news actually results in a real offer.
 */
export function generateCampSponsorOffer(state: GameState): GameState {
  const team = state.teams.find(t => t.id === state.currentTeamId);
  if (!team) return state;

  const league = state.leagues.find(l => l.id === team.league);
  const tier = league?.tier ?? 3;

  // Find an empty slot to offer
  const activeSponsors = state.sponsors.filter(s => s.isActive);
  const emptyTypes: SponsorType[] = [];
  const TYPES: SponsorType[] = ['partner', 'bande', 'aermel', 'trikot', 'ausruester'];
  for (const type of TYPES) {
    const maxSlots = SPONSOR_MAX_SLOTS[type];
    if (activeSponsors.filter(s => s.type === type).length < maxSlots) {
      emptyTypes.push(type);
    }
  }

  if (emptyTypes.length === 0) return state;

  // Pick a random empty type (prefer partner/bande for camp-triggered offers)
  const type = emptyTypes[0];
  const offer = createSponsorOffer(type, tier, team.reputation, state.currentDate);

  return {
    ...state,
    sponsorOffers: [...state.sponsorOffers, offer],
  };
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio. €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
  return `${v} €`;
}
