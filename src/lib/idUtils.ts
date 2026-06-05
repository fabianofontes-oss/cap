/**
 * idUtils.ts
 *
 * Utilities for:
 *  - Converting legacy flashcard IDs (fc_XXXXXXXX) to question IDs (q_XXXXXXXX)
 *  - Generating Flashcard objects from QuizQuestion (client-side derivation)
 *  - Normalizing legacy UserStats fields that may contain fc_ prefixed IDs
 */

import { QuizQuestion, Flashcard, UserStats } from '../types';

const PLACEHOLDER_RE = /Sem explicação disponível\.?/gi;

// ---------------------------------------------------------------------------
// ID conversion
// ---------------------------------------------------------------------------

/**
 * Converts a legacy flashcard ID to its corresponding question ID.
 * Rule: fc_XXXXXXXX → q_XXXXXXXX (prefix replacement only; hash is identical).
 * If the ID does not start with "fc_", it is returned unchanged.
 */
export function legacyFlashcardIdToQuestionId(id: string): string {
  return id.startsWith('fc_') ? 'q_' + id.slice(3) : id;
}

// ---------------------------------------------------------------------------
// Flashcard generation from QuizQuestion
// ---------------------------------------------------------------------------

/**
 * Generates a Flashcard from a QuizQuestion.
 * - id: uses the question's q_ ID directly (NOT fc_)
 * - front: the question text (all languages)
 * - back: correct option text + explanation, placeholder stripped
 * - level: defaults to 1 (user progress is tracked in UserStats.cardProgress)
 */
export function questionToFlashcard(q: QuizQuestion): Flashcard {
  const correctOption = q.options.find(o => o.isCorrect);

  const backForLang = (lang: 'es' | 'pt' | 'en'): string => {
    const answer = correctOption?.text?.[lang] ?? '';
    const exp    = (q.explanation?.[lang] ?? '').replace(PLACEHOLDER_RE, '').trim();
    return exp ? `${answer}\n${exp}` : answer;
  };

  return {
    id:        q.id,
    category:  q.category,
    community: q.community,
    front: {
      es: q.question?.es ?? '',
      pt: q.question?.pt ?? '',
      en: q.question?.en ?? '',
    },
    back: {
      es: backForLang('es'),
      pt: backForLang('pt'),
      en: backForLang('en'),
    },
    level: 1,
  };
}

// ---------------------------------------------------------------------------
// Stats normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes UserStats that may contain legacy fc_ prefixed IDs.
 * Applies legacyFlashcardIdToQuestionId to:
 *  - favoriteCardIds
 *  - difficultCardIds
 *  - cardProgress keys
 *
 * Safe to call on already-normalized stats (no-op if no fc_ IDs remain).
 */
export function normalizeLegacyStats(stats: UserStats): UserStats {
  const norm = legacyFlashcardIdToQuestionId;

  const normalizedFavoriteCardIds = (stats.favoriteCardIds ?? []).map(norm);
  const normalizedDifficultCardIds = (stats.difficultCardIds ?? []).map(norm);

  const rawProgress = stats.cardProgress ?? {};
  const normalizedCardProgress: Record<string, { level: number; nextReview: string }> = {};
  for (const [id, val] of Object.entries(rawProgress)) {
    normalizedCardProgress[norm(id)] = val;
  }

  return {
    ...stats,
    favoriteCardIds:   normalizedFavoriteCardIds,
    difficultCardIds:  normalizedDifficultCardIds,
    cardProgress:      normalizedCardProgress,
  };
}
