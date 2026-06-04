export type Language = 'es' | 'pt' | 'en';

export interface Flashcard {
  id: string;
  category: string;
  community?: string; // e.g., 'Nacional', 'Andalucía', 'Madrid'
  front: {
    es: string;
    pt: string;
    en: string;
  };
  back: {
    es: string;
    pt: string;
    en: string;
  };
  level: number; // For spaced repetition (1 = hard/new, 5 = mastered)
  nextReviewDate?: string;
}

export interface QuizQuestion {
  id: string;
  category: string;
  community?: string;
  question: {
    es: string;
    pt: string;
    en: string;
  };
  options: {
    id: string;
    text: {
      es: string;
      pt: string;
      en: string;
    };
    isCorrect: boolean;
  }[];
  explanation: {
    es: string;
    pt: string;
    en: string;
  };
}

export interface UserStats {
  cardsStudied: number;
  quizzesTaken: number;
  correctAnswers: number;
  totalAnswers: number;
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string;
  simuladosTaken?: number;
  cardProgress?: Record<string, { level: number; nextReview: string }>;
  errorCounts?: Record<string, number>;
  favoriteQuestionIds?: string[];
  favoriteCardIds?: string[];
  difficultQuestionIds?: string[];
  difficultCardIds?: string[];
}

export interface AppSubscription {
  status: 'free' | 'active' | 'expired' | 'trial';
  plan: 'free' | 'pro_6_months' | 'pro_annual';
  startedAt: string;
  expiresAt: string;
  provider: 'manual' | 'admin' | 'external';
  updatedAt: string;
}

