export type NewsType = 'result' | 'transfer' | 'injury' | 'press' | 'board' | 'milestone' | 'rumor' | 'contract' | 'youth' | 'general';

export interface NewsItem {
  id: string;
  type: NewsType;
  title: string;
  content: string;
  date: string;
  isRead: boolean;
  relatedTeamId?: string;
  relatedPlayerId?: string;
  importance: 'low' | 'medium' | 'high';
}

export interface PressQuestion {
  id: string;
  question: string;
  context: 'pre_match' | 'post_win' | 'post_loss' | 'post_draw' | 'transfer' | 'table' | 'general';
  options: PressAnswer[];
}

export interface PressAnswer {
  text: string;
  tone: 'motivating' | 'confident' | 'defensive' | 'provocative' | 'honest';
  moraleEffect: number;
  reputationEffect: number;
  fanEffect: number;
  fineRisk: boolean;
}

export interface PressConference {
  id: string;
  date: string;
  type: 'pre_match' | 'post_match';
  matchId?: string;
  questions: PressQuestion[];
  answers: { questionId: string; answerId: number }[];
  isCompleted: boolean;
}
