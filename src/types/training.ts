export type TrainingType =
  | 'fitness'
  | 'technique'
  | 'tactics'
  | 'shooting'
  | 'defense'
  | 'goalkeeper'
  | 'intensive'
  | 'recovery';

/** Temporary boost/penalty applied by a training session, decays over weeks */
export interface TrainingBoost {
  attribute: string;
  value: number;        // +/- change
  weeksRemaining: number;
}

/** One effect entry: which attribute, how much */
export interface TrainingEffect {
  attribute: string;
  label: string;
  value: number; // positive = boost, negative = penalty
}

/** Definition of a training session type */
export interface TrainingDefinition {
  id: TrainingType;
  name: string;
  description: string;
  icon: string;
  positiveEffects: TrainingEffect[];
  negativeEffects: TrainingEffect[];
  xpReward: number;
  conditionCost: number;   // how much condition is lost
  moraleEffect: number;    // +/- morale
  injuryRiskPercent: number;
  gkOnly?: boolean;        // only affects goalkeepers
}

/** The current weekly training state */
export interface TrainingPlan {
  selectedTraining: TrainingType;
  lastTrainingDate: string;   // ISO date when last training was applied
  weekHistory: { week: string; type: TrainingType }[];
}

// ─── Training catalog ───

export const TRAINING_CATALOG: TrainingDefinition[] = [
  {
    id: 'fitness',
    name: 'Fitness & Ausdauer',
    description: 'Verbessert die körperliche Leistungsfähigkeit, geht aber auf Kosten der Technik.',
    icon: '🏃',
    positiveEffects: [
      { attribute: 'stamina', label: 'Ausdauer', value: 2 },
      { attribute: 'pace', label: 'Tempo', value: 1 },
      { attribute: 'strength', label: 'Stärke', value: 1 },
      { attribute: 'acceleration', label: 'Beschleunigung', value: 1 },
    ],
    negativeEffects: [
      { attribute: 'ballControl', label: 'Ballkontrolle', value: -1 },
      { attribute: 'vision', label: 'Übersicht', value: -1 },
    ],
    xpReward: 20,
    conditionCost: 8,
    moraleEffect: 0,
    injuryRiskPercent: 3,
  },
  {
    id: 'technique',
    name: 'Techniktraining',
    description: 'Verbessert technische Fertigkeiten. Etwas weniger Ausdauer und Kraft.',
    icon: '⚽',
    positiveEffects: [
      { attribute: 'ballControl', label: 'Ballkontrolle', value: 2 },
      { attribute: 'dribbling', label: 'Dribbling', value: 1 },
      { attribute: 'passing', label: 'Passen', value: 1 },
      { attribute: 'crossing', label: 'Flanken', value: 1 },
    ],
    negativeEffects: [
      { attribute: 'stamina', label: 'Ausdauer', value: -1 },
      { attribute: 'strength', label: 'Stärke', value: -1 },
    ],
    xpReward: 20,
    conditionCost: 5,
    moraleEffect: 2,
    injuryRiskPercent: 1,
  },
  {
    id: 'tactics',
    name: 'Taktikschulung',
    description: 'Verbessert taktisches Verständnis und Spielintelligenz.',
    icon: '📋',
    positiveEffects: [
      { attribute: 'positioning', label: 'Stellungsspiel', value: 2 },
      { attribute: 'vision', label: 'Übersicht', value: 1 },
      { attribute: 'workRate', label: 'Einsatz', value: 1 },
      { attribute: 'composure', label: 'Gelassenheit', value: 1 },
    ],
    negativeEffects: [
      { attribute: 'pace', label: 'Tempo', value: -1 },
      { attribute: 'shooting', label: 'Schuss', value: -1 },
    ],
    xpReward: 20,
    conditionCost: 3,
    moraleEffect: 1,
    injuryRiskPercent: 0,
  },
  {
    id: 'shooting',
    name: 'Torschusstraining',
    description: 'Fokus auf Abschluss und Schusstechnik. Defensivarbeit leidet.',
    icon: '🎯',
    positiveEffects: [
      { attribute: 'shooting', label: 'Schuss', value: 2 },
      { attribute: 'finishing', label: 'Abschluss', value: 2 },
      { attribute: 'longShots', label: 'Fernschuss', value: 1 },
    ],
    negativeEffects: [
      { attribute: 'positioning', label: 'Stellungsspiel', value: -1 },
      { attribute: 'stamina', label: 'Ausdauer', value: -1 },
    ],
    xpReward: 20,
    conditionCost: 6,
    moraleEffect: 3,
    injuryRiskPercent: 2,
  },
  {
    id: 'defense',
    name: 'Defensivarbeit',
    description: 'Stärkt die Verteidigungsfähigkeiten. Offensiv-Skills rosten etwas.',
    icon: '🛡️',
    positiveEffects: [
      { attribute: 'positioning', label: 'Stellungsspiel', value: 2 },
      { attribute: 'heading', label: 'Kopfball', value: 1 },
      { attribute: 'strength', label: 'Stärke', value: 1 },
      { attribute: 'aggression', label: 'Aggression', value: 1 },
    ],
    negativeEffects: [
      { attribute: 'dribbling', label: 'Dribbling', value: -1 },
      { attribute: 'finishing', label: 'Abschluss', value: -1 },
    ],
    xpReward: 20,
    conditionCost: 7,
    moraleEffect: 0,
    injuryRiskPercent: 3,
  },
  {
    id: 'goalkeeper',
    name: 'Torwarttraining',
    description: 'Spezielles Training nur für Torhüter. Verbessert alle TW-Attribute.',
    icon: '🧤',
    gkOnly: true,
    positiveEffects: [
      { attribute: 'reflexes', label: 'Reflexe', value: 2 },
      { attribute: 'handling', label: 'Fangen', value: 1 },
      { attribute: 'diving', label: 'Hechten', value: 1 },
      { attribute: 'oneOnOne', label: '1-gegen-1', value: 1 },
      { attribute: 'kicking', label: 'Abschlag', value: 1 },
    ],
    negativeEffects: [],
    xpReward: 20,
    conditionCost: 5,
    moraleEffect: 1,
    injuryRiskPercent: 2,
  },
  {
    id: 'intensive',
    name: 'Intensivcamp',
    description: 'Extrem hartes Training. Starke Verbesserungen, aber hoher Konditionsverlust und Verletzungsgefahr!',
    icon: '🔥',
    positiveEffects: [
      { attribute: 'stamina', label: 'Ausdauer', value: 3 },
      { attribute: 'strength', label: 'Stärke', value: 2 },
      { attribute: 'pace', label: 'Tempo', value: 2 },
      { attribute: 'workRate', label: 'Einsatz', value: 2 },
      { attribute: 'aggression', label: 'Aggression', value: 1 },
    ],
    negativeEffects: [
      { attribute: 'composure', label: 'Gelassenheit', value: -2 },
      { attribute: 'ballControl', label: 'Ballkontrolle', value: -1 },
    ],
    xpReward: 35,
    conditionCost: 20,
    moraleEffect: -5,
    injuryRiskPercent: 10,
  },
  {
    id: 'recovery',
    name: 'Regenerationswoche',
    description: 'Leichtes Training mit Fokus auf Erholung. Keine Attribut-Boosts, aber volle Regeneration.',
    icon: '🧘',
    positiveEffects: [],
    negativeEffects: [],
    xpReward: 5,
    conditionCost: -20,  // negative = condition GAIN
    moraleEffect: 10,
    injuryRiskPercent: 0,
  },
];

export function getTrainingDef(type: TrainingType): TrainingDefinition {
  return TRAINING_CATALOG.find((t) => t.id === type)!;
}

// Legacy compat
export type TrainingFocus = TrainingType;
export const TRAINING_FOCUS_LABELS: Record<string, string> = Object.fromEntries(
  TRAINING_CATALOG.map((t) => [t.id, t.name])
);
