/**
 * audit_quizzes_flashcards_overlap.ts
 *
 * Runs FULLY OFFLINE — reads only local JSON files.
 * No Firestore access. No quota consumed.
 *
 * Prerequisites: run `npm run export:content` first to generate:
 *   data-export/quizzes.json
 *   data-export/flashcards.json
 *
 * Outputs to: audit-results/quiz_flashcard_overlap/
 *   summary.json
 *   mapping_exact.json
 *   mapping_similar_review.json
 *   flashcards_unique.json
 *   quizzes_without_flashcard.json
 *   conflicts.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const EXPORT_DIR   = resolve(__dirname, '../data-export');
const QUIZZES_FILE = resolve(EXPORT_DIR, 'quizzes.json');
const FC_FILE      = resolve(EXPORT_DIR, 'flashcards.json');
const OUTPUT_DIR   = resolve(__dirname, '../audit-results/quiz_flashcard_overlap');

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------
const THRESHOLD_SIMILAR_MIN  = 0.85;  // minimum similarity to call a fuzzy match
const THRESHOLD_BACK_MATCH   = 0.80;  // back considered well-matched
const THRESHOLD_BACK_PARTIAL = 0.40;  // back partial match (below = conflict)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizOption {
  id: string;
  text: { es?: string; pt?: string; en?: string };
  isCorrect: boolean;
}

interface QuizDoc {
  id: string;
  category?: string;
  community?: string;
  question?: { es?: string; pt?: string; en?: string };
  options?: QuizOption[];
  explanation?: { es?: string; pt?: string; en?: string };
}

interface FlashcardDoc {
  id: string;
  category?: string;
  community?: string;
  front?: { es?: string; pt?: string; en?: string };
  back?:  { es?: string; pt?: string; en?: string };
  level?: number;
}

type MatchType   = 'id_exact' | 'text_exact' | 'text_similar';
type BackStatus  = 'match' | 'partial' | 'conflict' | 'no_data';

interface BackComparison {
  status: BackStatus;
  similarity: number;
  flashcard_back_es: string;
  quiz_expected_back_es: string;
}

interface MappedPair {
  matchType: MatchType;
  questionSimilarity: number;
  flashcardId: string;
  quizId: string;
  flashcard_category: string;
  quiz_category: string;
  categoryMatch: boolean;
  communityMatch: boolean;
  flashcard_front_es: string;
  quiz_question_es: string;
  backComparison: BackComparison;
}

interface UniqueFlashcard {
  flashcardId: string;
  category: string;
  community: string;
  front_es: string;
  back_es: string;
  bestSimilarityFound: number;
  bestMatchQuizId: string | null;
  bestMatchQuizQuestion: string | null;
}

interface QuizWithoutFlashcard {
  quizId: string;
  category: string;
  community: string;
  question_es: string;
}

interface ConflictEntry extends MappedPair {
  conflictReason: string;
}

// ---------------------------------------------------------------------------
// Text utilities  (same algorithm as audit_autoescola_vs_firestore.ts)
// ---------------------------------------------------------------------------

function normalizeText(text: string | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!"']/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= a.length; i++) {
    let last = i;
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let val = costs[j - 1];
        if (a[i - 1] !== b[j - 1]) val = Math.min(val, last, costs[j]) + 1;
        costs[j - 1] = last;
        last = val;
      }
    }
    if (i > 0) costs[b.length] = last;
  }
  return costs[b.length];
}

function similarity(s1: string, s2: string): number {
  const longer  = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length <  s2.length ? s1 : s2;
  const len = longer.length;
  if (len === 0) return 1.0;
  return (len - editDistance(longer, shorter)) / len;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /sem explicacao disponivel\.?/gi;

function cleanPlaceholder(text: string): string {
  return text.replace(PLACEHOLDER_RE, '').trim();
}

function buildExpectedBack(quiz: QuizDoc): string {
  const correct = quiz.options?.find(o => o.isCorrect);
  const answerEs = correct?.text?.es ?? '';
  const explanationEs = cleanPlaceholder(quiz.explanation?.es ?? '');
  return explanationEs
    ? `${answerEs} ${explanationEs}`.trim()
    : answerEs;
}

function compareBack(fc: FlashcardDoc, quiz: QuizDoc): BackComparison {
  const rawBack    = cleanPlaceholder(fc.back?.es ?? '');
  const expectedBk = buildExpectedBack(quiz);

  if (!rawBack && !expectedBk) {
    return { status: 'no_data', similarity: 1.0, flashcard_back_es: '', quiz_expected_back_es: '' };
  }
  if (!rawBack || !expectedBk) {
    return { status: 'no_data', similarity: 0, flashcard_back_es: rawBack, quiz_expected_back_es: expectedBk };
  }

  const sim = round3(similarity(normalizeText(rawBack), normalizeText(expectedBk)));

  let status: BackStatus;
  if      (sim >= THRESHOLD_BACK_MATCH)   status = 'match';
  else if (sim >= THRESHOLD_BACK_PARTIAL) status = 'partial';
  else                                     status = 'conflict';

  return { status, similarity: sim, flashcard_back_es: rawBack, quiz_expected_back_es: expectedBk };
}

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

function loadExport(filePath: string, label: string): any[] {
  if (!existsSync(filePath)) {
    console.error(`\n❌ Arquivo não encontrado: ${filePath}`);
    console.error('   Execute primeiro: npm run export:content\n');
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(parsed.documents)) throw new Error('"documents" não é um array');
    console.log(`  ✅ ${label}: ${parsed.documents.length} docs | exportado: ${parsed.metadata?.exportedAt ?? '?'}`);
    return parsed.documents;
  } catch (e: any) {
    console.error(`\n❌ Erro ao ler ${filePath}: ${e.message}\n`);
    process.exit(1);
  }
}

function writeReport(filename: string, data: unknown): void {
  const path  = join(OUTPUT_DIR, filename);
  const count = Array.isArray(data) ? data.length : '—';
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  📄 ${filename.padEnd(38)} (${count} registros)`);
}

// ---------------------------------------------------------------------------
// Main audit
// ---------------------------------------------------------------------------

async function runAudit(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   CAP MASTER — AUDITORIA OVERLAP QUIZZES × FLASHCARDS     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('🔒 Modo offline — zero leituras do Firestore.\n');

  console.log('📂 Carregando arquivos locais...');
  const quizDocs: QuizDoc[]       = loadExport(QUIZZES_FILE, 'quizzes.json');
  const fcDocs:   FlashcardDoc[]  = loadExport(FC_FILE,      'flashcards.json');
  console.log('');

  // ── Build lookup maps ───────────────────────────────────────────────────

  // quizId → QuizDoc  (pass 1: ID match)
  const quizById = new Map<string, QuizDoc>();
  quizDocs.forEach(q => quizById.set(q.id, q));

  // normalizedQuestion.es → QuizDoc  (pass 2: exact text match)
  const quizByNorm = new Map<string, QuizDoc>();
  quizDocs.forEach(q => {
    const n = normalizeText(q.question?.es);
    if (n) quizByNorm.set(n, q);
  });

  // category → QuizDoc[]  (pass 3: fuzzy within same category — only for unmatched)
  const quizByCategory = new Map<string, QuizDoc[]>();
  quizDocs.forEach(q => {
    const cat = q.category ?? '__none__';
    if (!quizByCategory.has(cat)) quizByCategory.set(cat, []);
    quizByCategory.get(cat)!.push(q);
  });

  // Set of quizIds that were matched (to find quizzes without flashcard later)
  const matchedQuizIds = new Set<string>();

  // ── Result containers ────────────────────────────────────────────────────

  const exactMatches:    MappedPair[]         = [];
  const similarReview:   MappedPair[]         = [];
  const uniqueFlashcards: UniqueFlashcard[]   = [];
  const conflicts:        ConflictEntry[]     = [];

  let passId    = 0;
  let passText  = 0;
  let passFuzzy = 0;
  let passNone  = 0;

  let backMatch   = 0;
  let backPartial = 0;
  let backConflict = 0;
  let backNoData  = 0;

  const t0 = Date.now();
  console.log(`⚙️  Processando ${fcDocs.length} flashcards...\n`);

  for (const fc of fcDocs) {
    const normFront = normalizeText(fc.front?.es);

    let matched: QuizDoc | null = null;
    let mType: MatchType = 'id_exact';
    let qSim = 1.0;

    // ── Pass 1: exact ID ──────────────────────────────────────────────────
    const byId = quizById.get(fc.id);
    if (byId) {
      matched = byId;
      mType   = 'id_exact';
      passId++;
    }

    // ── Pass 2: exact normalized question text ────────────────────────────
    if (!matched && normFront) {
      const byText = quizByNorm.get(normFront);
      if (byText) {
        matched = byText;
        mType   = 'text_exact';
        passText++;
      }
    }

    // ── Pass 3: fuzzy within same category (only runs for unmatched) ──────
    if (!matched && normFront) {
      const cat        = fc.category ?? '__none__';
      const candidates = quizByCategory.get(cat) ?? [];

      let bestSim  = 0;
      let bestQuiz: QuizDoc | null = null;

      for (const candidate of candidates) {
        const normCand = normalizeText(candidate.question?.es);
        if (!normCand) continue;

        // Pre-filter: skip if length ratio is too extreme (speeds up Levenshtein)
        const lenRatio = Math.min(normFront.length, normCand.length) /
                         Math.max(normFront.length, normCand.length);
        if (lenRatio < 0.55) continue;

        const sim = similarity(normFront, normCand);
        if (sim > bestSim) { bestSim = sim; bestQuiz = candidate; }
      }

      if (bestQuiz && bestSim >= THRESHOLD_SIMILAR_MIN) {
        matched = bestQuiz;
        mType   = 'text_similar';
        qSim    = round3(bestSim);
        passFuzzy++;
      } else {
        // Truly no match found
        passNone++;
        uniqueFlashcards.push({
          flashcardId:           fc.id,
          category:              fc.category  ?? '',
          community:             fc.community ?? '',
          front_es:              fc.front?.es ?? '',
          back_es:               fc.back?.es  ?? '',
          bestSimilarityFound:   round3(bestSim),
          bestMatchQuizId:       bestQuiz?.id              ?? null,
          bestMatchQuizQuestion: bestQuiz?.question?.es    ?? null,
        });
        continue;
      }
    }

    // Flashcard has no category at all and no text → unmatched
    if (!matched) {
      passNone++;
      uniqueFlashcards.push({
        flashcardId:           fc.id,
        category:              fc.category  ?? '',
        community:             fc.community ?? '',
        front_es:              fc.front?.es ?? '',
        back_es:               fc.back?.es  ?? '',
        bestSimilarityFound:   0,
        bestMatchQuizId:       null,
        bestMatchQuizQuestion: null,
      });
      continue;
    }

    // ── Matched: compare back content ─────────────────────────────────────
    matchedQuizIds.add(matched.id);
    const backComp = compareBack(fc, matched);

    switch (backComp.status) {
      case 'match':    backMatch++;    break;
      case 'partial':  backPartial++;  break;
      case 'conflict': backConflict++; break;
      case 'no_data':  backNoData++;   break;
    }

    const pair: MappedPair = {
      matchType:          mType,
      questionSimilarity: qSim,
      flashcardId:        fc.id,
      quizId:             matched.id,
      flashcard_category: fc.category      ?? '',
      quiz_category:      matched.category ?? '',
      categoryMatch:      (fc.category ?? '') === (matched.category ?? ''),
      communityMatch:     (fc.community ?? '') === (matched.community ?? ''),
      flashcard_front_es: fc.front?.es       ?? '',
      quiz_question_es:   matched.question?.es ?? '',
      backComparison:     backComp,
    };

    if (mType === 'id_exact' || mType === 'text_exact') {
      exactMatches.push(pair);
    } else {
      similarReview.push(pair);
    }

    if (backComp.status === 'conflict') {
      conflicts.push({
        ...pair,
        conflictReason:
          `Back similarity ${backComp.similarity} < threshold ${THRESHOLD_BACK_PARTIAL}. ` +
          `Content appears genuinely different from expected (correct_option + explanation).`,
      });
    }
  }

  // ── Quizzes with no matching flashcard ─────────────────────────────────

  const quizzesWithoutFlashcard: QuizWithoutFlashcard[] = quizDocs
    .filter(q => !matchedQuizIds.has(q.id))
    .map(q => ({
      quizId:      q.id,
      category:    q.category    ?? '',
      community:   q.community   ?? '',
      question_es: q.question?.es ?? '',
    }));

  // ── Category analysis ───────────────────────────────────────────────────

  const quizCats = new Set(quizDocs.map(q => q.category ?? ''));
  const fcCats   = new Set(fcDocs.map(fc => fc.category ?? ''));

  const categoriesInBoth         = [...quizCats].filter(c => fcCats.has(c)).sort();
  const categoriesInQuizzesOnly  = [...quizCats].filter(c => !fcCats.has(c)).sort();
  const categoriesInFcOnly       = [...fcCats].filter(c => !quizCats.has(c)).sort();

  // ── Build summary ───────────────────────────────────────────────────────

  const elapsed     = ((Date.now() - t0) / 1000).toFixed(1);
  const totalMapped = exactMatches.length + similarReview.length;
  const overlapPct  = Math.round((totalMapped / fcDocs.length) * 10000) / 100;

  const summary = {
    generatedAt:    new Date().toISOString(),
    elapsedSeconds: parseFloat(elapsed),
    thresholds: {
      similarMin:  THRESHOLD_SIMILAR_MIN,
      backMatch:   THRESHOLD_BACK_MATCH,
      backPartial: THRESHOLD_BACK_PARTIAL,
    },
    sources: {
      quizzesFile:    QUIZZES_FILE,
      flashcardsFile: FC_FILE,
      totalQuizzes:   quizDocs.length,
      totalFlashcards: fcDocs.length,
    },
    matchingPasses: {
      pass1_idExact:   passId,
      pass2_textExact: passText,
      pass3_fuzzy:     passFuzzy,
      unmatched:       passNone,
    },
    overlapAnalysis: {
      totalMapped,
      mappedExact:              exactMatches.length,
      mappedSimilarNeedsReview: similarReview.length,
      flashcardsUnique:         uniqueFlashcards.length,
      quizzesWithoutFlashcard:  quizzesWithoutFlashcard.length,
      overlapRatePercent:       overlapPct,
    },
    backComparison: {
      backMatch,
      backPartial,
      backConflict,
      backNoData,
      conflictsTotal: conflicts.length,
    },
    categoryAnalysis: {
      totalCategoriesInQuizzes:   quizCats.size,
      totalCategoriesInFlashcards: fcCats.size,
      categoriesInBoth,
      categoriesInQuizzesOnly,
      categoriesInFlashcardsOnly: categoriesInFcOnly,
    },
    interpretation: {
      likelyDerived: totalMapped >= fcDocs.length * 0.9,
      singleQuestionsBankViable: totalMapped >= fcDocs.length * 0.9 && uniqueFlashcards.length < fcDocs.length * 0.05,
      recommendation:
        totalMapped >= fcDocs.length * 0.9
          ? 'Alta sobreposição (≥90%). Flashcards são quase certamente derivados dos quizzes. ' +
            'Base única `questions` é viável. Revisar `flashcards_unique.json` para conteúdo exclusivo restante.'
          : totalMapped >= fcDocs.length * 0.7
          ? 'Sobreposição moderada (70-90%). Revisar `mapping_similar_review.json` e `flashcards_unique.json` ' +
            'antes de decidir o modelo final.'
          : 'Sobreposição baixa (<70%). Flashcards podem conter conteúdo independente. ' +
            'Revisar manualmente antes de qualquer fusão.',
    },
  };

  // ── Write output files ──────────────────────────────────────────────────

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📂 Diretório criado: ${OUTPUT_DIR}\n`);
  }

  console.log(`📊 Escrevendo relatórios → audit-results/quiz_flashcard_overlap/\n`);
  writeReport('summary.json',                  summary);
  writeReport('mapping_exact.json',            exactMatches);
  writeReport('mapping_similar_review.json',   similarReview);
  writeReport('flashcards_unique.json',        uniqueFlashcards);
  writeReport('quizzes_without_flashcard.json', quizzesWithoutFlashcard);
  writeReport('conflicts.json',                conflicts);

  // ── Terminal summary ────────────────────────────────────────────────────

  const pad = (label: string, value: string | number, width = 60) =>
    `║  ${label}: ${String(value)}`.padEnd(width) + '║';

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   AUDITORIA CONCLUÍDA                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(pad('Tempo',              `${elapsed}s`));
  console.log(pad('Total quizzes',      quizDocs.length));
  console.log(pad('Total flashcards',   fcDocs.length));
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(pad('Mapeados total',     `${totalMapped}  (${overlapPct}%)`));
  console.log(pad('  → por ID exato',   passId));
  console.log(pad('  → por texto exato',passText));
  console.log(pad(`  → fuzzy (≥${(THRESHOLD_SIMILAR_MIN*100).toFixed(0)}%)`, passFuzzy));
  console.log(pad('Flashcards únicos',  uniqueFlashcards.length));
  console.log(pad('Quizzes sem flashcard', quizzesWithoutFlashcard.length));
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(pad(`Back match (≥${(THRESHOLD_BACK_MATCH*100).toFixed(0)}%)`, backMatch));
  console.log(pad(`Back parcial (${(THRESHOLD_BACK_PARTIAL*100).toFixed(0)}-${(THRESHOLD_BACK_MATCH*100).toFixed(0)}%)`, backPartial));
  console.log(pad(`Back conflito (<${(THRESHOLD_BACK_PARTIAL*100).toFixed(0)}%)`, backConflict));
  console.log(pad('Back sem dados',     backNoData));
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  CONCLUSÃO:                                                ║');
  // Word-wrap the recommendation at ~56 chars
  const words = summary.interpretation.recommendation.split(' ');
  let line = '║    ';
  for (const w of words) {
    if ((line + w).length > 61) {
      console.log(line.padEnd(62) + '║');
      line = '║    ' + w + ' ';
    } else {
      line += w + ' ';
    }
  }
  if (line.trim() !== '║') console.log(line.padEnd(62) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

runAudit().catch((err) => {
  console.error('\n❌ Erro fatal durante a auditoria:', err);
  process.exit(1);
});
