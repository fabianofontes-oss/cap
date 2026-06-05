/**
 * ai_prefill_review.ts
 *
 * Applies rule-based AI pre-classification to the P1/P2/P3 content-review files.
 * Adds columns: aiSuggestedDecision, aiConfidence, aiReason, humanNeedsReview.
 *
 * Does NOT apply any corrections. Does NOT modify questions-v1.json.
 * Does NOT alter the app, Firestore, or any data pack.
 *
 * Source: audit-results/autoescola_pdf_vs_pack/recheck_conflicts.json
 * Writes:
 *   content-review/p1_exact_question_wrong_answer.csv   (updated)
 *   content-review/p2_truncated_answers.csv             (updated)
 *   content-review/p3_near_exact_wrong_answer.csv       (updated)
 *   content-review/human_review_required.csv
 *   content-review/ai_prefilled_review_summary.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

const CONFLICTS_P = resolve(ROOT, 'audit-results/autoescola_pdf_vs_pack/recheck_conflicts.json');
const OUT_DIR     = resolve(ROOT, 'content-review');

// ─── Types ─────────────────────────────────────────────────────────────────
type Decision   = 'ACCEPT_PDF_ANSWER' | 'ACCEPT_PACK_ANSWER' | 'NEEDS_EXPERT';
type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

interface Classification {
  aiSuggestedDecision: Decision;
  aiConfidence:        Confidence;
  aiReason:            string;
  humanNeedsReview:    boolean;
}

// ─── Text helpers ──────────────────────────────────────────────────────────
function norm(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!"'[\]…]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(norm(text).split(' ').filter(w => w.length > 3));
}

function tokenJaccard(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (!sa.size && !sb.size) return 1;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Pairs where each element being in DIFFERENT answers signals a factual inversion.
// [pdfWord, packWord] = if PDF answer has pdfWord AND pack answer has packWord → opposite
const OPPOSITE_PAIRS: [string, string][] = [
  ['verde',       'rojo'],
  ['rojo',        'verde'],
  ['mayor',       'menor'],
  ['menor',       'mayor'],
  ['aumenta',     'disminuye'],
  ['disminuye',   'aumenta'],
  ['maximo',      'minimo'],
  ['minimo',      'maximo'],
  ['correcto',    'incorrecto'],
  ['incorrecto',  'correcto'],
  ['adecuada',    'inadecuada'],
  ['inadecuada',  'adecuada'],
  ['progresiv',   'rapida'],         // frenar progresivamente vs rapidamente
  ['aprovechamiento', 'mayor consumo'],
  ['eficiencia',  'mayor consumo'],
  [' si ',        ' no '],
  [' no ',        ' si '],
  ['pierde',      'no pierde'],
  ['aumenta',     'no aumenta'],
  ['reduce',      'no reduce'],
];

function hasOppositePolarity(pdfAns: string, packAns: string): boolean {
  const p = ` ${norm(pdfAns)} `;
  const k = ` ${norm(packAns)} `;
  for (const [pw, kw] of OPPOSITE_PAIRS) {
    if (p.includes(pw) && k.includes(kw)) return true;
  }
  return false;
}

// Questions that are inherently MCQ-list-selection (different options = different correct answer)
const MCQ_PATTERNS = [
  /señale la respuesta/i,
  /señale la afirmaci/i,
  /señala la respuesta/i,
  /cual de las siguientes/i,
  /cuál de las siguientes/i,
  /cuales de las siguientes/i,
  /cuáles de las siguientes/i,
  /¿cuál de estas/i,
  /¿cuales de estas/i,
  /indique cual/i,
  /indique cuál/i,
];
function isMCQSelection(question: string): boolean {
  return MCQ_PATTERNS.some(p => p.test(question));
}

// ─── Classification logic ───────────────────────────────────────────────────

function classifyP2(): Classification {
  return {
    aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
    aiConfidence:        'HIGH',
    aiReason:            'Pack answer is clearly truncated mid-sentence. PDF has the complete official text.',
    humanNeedsReview:    false,
  };
}

function classifyP1(question: string, pdfAnswer: string, packAnswer: string): Classification {
  const np = norm(pdfAnswer);
  const nk = norm(packAnswer);
  const pLen = np.length;
  const kLen = nk.length;

  // Rule 1 – MCQ-style question (pack may have had different option set)
  if (isMCQSelection(question)) {
    return {
      aiSuggestedDecision: 'NEEDS_EXPERT',
      aiConfidence:        'LOW',
      aiReason:            'Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.',
      humanNeedsReview:    true,
    };
  }

  // Rule 2 – Pack answer extremely short (< 15 chars) → clearly incomplete
  if (kLen < 15 && pLen > kLen) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'HIGH',
      aiReason:            `Pack answer only ${kLen} chars — appears incomplete. PDF answer is authoritative.`,
      humanNeedsReview:    false,
    };
  }

  // Rule 3 – Direct factual opposites (color, direction, polarity inversion)
  if (hasOppositePolarity(np, nk)) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'HIGH',
      aiReason:            'Answers contain opposing factual terms (e.g., verde/rojo, mayor/menor). One must be wrong — PDF is official source.',
      humanNeedsReview:    false,
    };
  }

  // Rule 4 – Pack much shorter than PDF (not truncated but missing content)
  const ratio = pLen > 0 ? kLen / pLen : 1;
  if (ratio < 0.40 && pLen > 30) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'HIGH',
      aiReason:            `Pack answer is ${Math.round(ratio * 100)}% the length of PDF answer — likely incomplete. PDF answer preferred.`,
      humanNeedsReview:    false,
    };
  }

  // Rule 5 – Compute token overlap
  const overlap = tokenJaccard(np, nk);

  // Rule 5a – Both short AND low overlap → could be synonymous phrasing (e.g., "pierde capacidad" vs "pierden eficacia")
  if (overlap < 0.15 && pLen < 50 && kLen < 50) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'MEDIUM',
      aiReason:            `Short answers with low token overlap (${(overlap * 100).toFixed(0)}%). May be synonymous phrasing — PDF preferred but human confirmation advised.`,
      humanNeedsReview:    true,
    };
  }

  // Rule 5b – Low token overlap on longer answers → genuinely different answers
  if (overlap < 0.15) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'HIGH',
      aiReason:            `Very different answers (token overlap ${(overlap * 100).toFixed(0)}%). Pack answer likely wrong — PDF is authoritative source.`,
      humanNeedsReview:    false,
    };
  }

  // Rule 6 – Medium overlap → different phrasing but related content
  if (overlap < 0.45) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'MEDIUM',
      aiReason:            `Answers differ in phrasing (token overlap ${(overlap * 100).toFixed(0)}%). PDF answer is more complete/official — review to confirm.`,
      humanNeedsReview:    true,
    };
  }

  // Rule 7 – High overlap → very similar, minor wording difference
  return {
    aiSuggestedDecision: 'NEEDS_EXPERT',
    aiConfidence:        'MEDIUM',
    aiReason:            `Answers are similar (overlap ${(overlap * 100).toFixed(0)}%) but phrased differently. May be acceptable variant or subtle factual difference.`,
    humanNeedsReview:    true,
  };
}

function classifyP3(question: string, pdfAnswer: string, packAnswer: string, similarity: number): Classification {
  const np = norm(pdfAnswer);
  const nk = norm(packAnswer);
  const kLen = nk.length;
  const pLen = np.length;

  // P3 questions are near-identical but NOT identical — more caution required
  // MCQ-style → definitely needs expert
  if (isMCQSelection(question)) {
    return {
      aiSuggestedDecision: 'NEEDS_EXPERT',
      aiConfidence:        'LOW',
      aiReason:            'Near-identical question with MCQ list-selection format — could be different test variant. Do not assume.',
      humanNeedsReview:    true,
    };
  }

  // Pack answer very short vs PDF
  const ratio = pLen > 0 ? kLen / pLen : 1;
  if (kLen < 15 || ratio < 0.35) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'MEDIUM',
      aiReason:            `Pack answer appears incomplete (${kLen} chars vs PDF ${pLen} chars). PDF preferred — confirm wording difference is minor.`,
      humanNeedsReview:    true,
    };
  }

  // Direct polarity opposites even in near-identical questions
  if (hasOppositePolarity(np, nk)) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'MEDIUM',
      aiReason:            `Opposing factual terms detected. Near-identical question but answer polarity inverted — likely pack error, but wording difference warrants review.`,
      humanNeedsReview:    true,
    };
  }

  const overlap = tokenJaccard(np, nk);
  if (overlap < 0.20) {
    return {
      aiSuggestedDecision: 'ACCEPT_PDF_ANSWER',
      aiConfidence:        'MEDIUM',
      aiReason:            `Answers are unrelated (overlap ${(overlap * 100).toFixed(0)}%) despite near-identical questions (sim=${similarity}). PDF answer preferred — human review required due to question wording difference.`,
      humanNeedsReview:    true,
    };
  }

  return {
    aiSuggestedDecision: 'NEEDS_EXPERT',
    aiConfidence:        'LOW',
    aiReason:            `Near-identical question (sim=${similarity}) with different but related answers (overlap ${(overlap * 100).toFixed(0)}%). Could be legitimate variant — requires subject-matter expert review.`,
    humanNeedsReview:    true,
  };
}

// ─── CSV helpers ───────────────────────────────────────────────────────────
function esc(v: unknown): string {
  if (v == null) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

function writeCSV(path: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) { writeFileSync(path, '', 'utf8'); return; }
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.map(esc).join(','),
    ...rows.map(r => keys.map(k => esc(r[k])).join(',')),
  ];
  writeFileSync(path, '\uFEFF' + lines.join('\r\n'), 'utf8');
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  if (!existsSync(CONFLICTS_P)) {
    console.error(`Missing: ${CONFLICTS_P}. Run "npm run audit:recheck" first.`);
    process.exit(1);
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const conflicts: Record<string, unknown>[] = JSON.parse(readFileSync(CONFLICTS_P, 'utf8'));

  // ── P1 ────────────────────────────────────────────────────────────────────
  const p1Raw = conflicts.filter(r =>
    r['conflictType'] === 'REAL_ANSWER_CONFLICT' && r['similarity'] === 1
  );
  const p1Rows = p1Raw.map(r => {
    const cl = classifyP1(
      String(r['pdfQuestion'] ?? ''),
      String(r['pdfAnswerText'] ?? ''),
      String(r['packCorrectText'] ?? '')
    );
    return {
      priority:            'P1_EXACT_QUESTION_WRONG_ANSWER',
      pdfIndex:            r['pdfNumber'],
      packId:              r['packId'],
      category:            r['packCategory'],
      question:            r['pdfQuestion'],
      pdfAnswer:           r['pdfAnswerText'],
      packAnswer:          r['packCorrectText'],
      sourcePriority:      'PDF_AUTOESCOLA_PRIMARY',
      recommendedAction:   'prefer_pdf_answer_review_required',
      aiSuggestedDecision: cl.aiSuggestedDecision,
      aiConfidence:        cl.aiConfidence,
      aiReason:            cl.aiReason,
      humanNeedsReview:    cl.humanNeedsReview,
      reviewerDecision:    '',
      notes:               '',
    };
  });

  // ── P2 ────────────────────────────────────────────────────────────────────
  const p2Raw = conflicts.filter(r => r['conflictType'] === 'PACK_ANSWER_TRUNCATED');
  const p2Rows = p2Raw.map(r => {
    const cl = classifyP2();
    return {
      priority:             'P2_PACK_ANSWER_TRUNCATED',
      pdfIndex:             r['pdfNumber'],
      packId:               r['packId'],
      category:             r['packCategory'],
      question:             r['pdfQuestion'],
      truncatedPackAnswer:  r['packCorrectText'],
      fullPdfAnswer:        r['pdfAnswerText'],
      sourcePriority:       'PDF_AUTOESCOLA_PRIMARY_TRUNCATED_FIX',
      recommendedAction:    'prefer_pdf_answer_review_required',
      aiSuggestedDecision:  cl.aiSuggestedDecision,
      aiConfidence:         cl.aiConfidence,
      aiReason:             cl.aiReason,
      humanNeedsReview:     cl.humanNeedsReview,
      reviewerDecision:     '',
      notes:                '',
    };
  });

  // ── P3 ────────────────────────────────────────────────────────────────────
  const p3Raw = conflicts.filter(r =>
    r['conflictType'] === 'REAL_ANSWER_CONFLICT' &&
    typeof r['similarity'] === 'number' &&
    (r['similarity'] as number) >= 0.95 &&
    (r['similarity'] as number) < 1
  );
  const p3Rows = p3Raw.map(r => {
    const cl = classifyP3(
      String(r['pdfQuestion'] ?? ''),
      String(r['pdfAnswerText'] ?? ''),
      String(r['packCorrectText'] ?? ''),
      r['similarity'] as number
    );
    return {
      priority:            'P3_NEAR_EXACT_WRONG_ANSWER',
      pdfIndex:            r['pdfNumber'],
      packId:              r['packId'],
      category:            r['packCategory'],
      question:            r['pdfQuestion'],   // alias so mixed CSV keeps question populated
      similarity:          r['similarity'],
      pdfQuestion:         r['pdfQuestion'],
      packQuestion:        r['packQuestion'],
      pdfAnswer:           r['pdfAnswerText'],
      packAnswer:          r['packCorrectText'],
      sourcePriority:      'MANUAL_VARIANT_REVIEW',
      recommendedAction:   'manual_review_variant',
      aiSuggestedDecision: cl.aiSuggestedDecision,
      aiConfidence:        cl.aiConfidence,
      aiReason:            cl.aiReason,
      humanNeedsReview:    cl.humanNeedsReview,
      reviewerDecision:    '',
      notes:               '',
    };
  });

  // ── Write updated CSVs ────────────────────────────────────────────────────
  writeCSV(resolve(OUT_DIR, 'p1_exact_question_wrong_answer.csv'), p1Rows);
  writeCSV(resolve(OUT_DIR, 'p2_truncated_answers.csv'),           p2Rows);
  writeCSV(resolve(OUT_DIR, 'p3_near_exact_wrong_answer.csv'),     p3Rows);

  const allRows = [
    ...p1Rows as Record<string, unknown>[],
    ...p2Rows as Record<string, unknown>[],
    ...p3Rows as Record<string, unknown>[],
  ];
  const total = allRows.length;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const countBy = (field: string, val: string) => allRows.filter(r => r[field] === val).length;

  const acceptHigh   = allRows.filter(r => r['aiSuggestedDecision'] === 'ACCEPT_PDF_ANSWER' && r['aiConfidence'] === 'HIGH').length;
  const acceptMedium = allRows.filter(r => r['aiSuggestedDecision'] === 'ACCEPT_PDF_ANSWER' && r['aiConfidence'] === 'MEDIUM').length;
  const needsExpert  = countBy('aiSuggestedDecision', 'NEEDS_EXPERT');
  const humanNeeded  = allRows.filter(r => r['humanNeedsReview'] === true).length;
  const batchReady   = allRows.filter(r => r['humanNeedsReview'] === false).length;

  // ── human_review_required.csv ─────────────────────────────────────────────
  const humanRows = allRows.filter(r => r['humanNeedsReview'] === true);
  writeCSV(resolve(OUT_DIR, 'human_review_required.csv'), humanRows);

  // ── ai_prefilled_review_summary.json ─────────────────────────────────────
  const summary = {
    generatedAt:          new Date().toISOString(),
    warning:              'Nenhuma correcao foi aplicada. Este e um arquivo de sugestao de revisao apenas.',
    sourcePriority:       { primary: 'PDF_AUTOESCOLA', secondary: 'PACK_INTERNET' },
    totals: {
      total,
      p1:                 p1Rows.length,
      p2:                 p2Rows.length,
      p3:                 p3Rows.length,
    },
    aiDecisions: {
      ACCEPT_PDF_ANSWER_HIGH:   acceptHigh,
      ACCEPT_PDF_ANSWER_MEDIUM: acceptMedium,
      NEEDS_EXPERT:             needsExpert,
    },
    humanReview: {
      humanNeedsReview_true:  humanNeeded,
      canApproveBatch:        batchReady,
      batchReadyPercent:      `${Math.round(batchReady / total * 100)}%`,
    },
    rulesSummary: [
      'P2: All 16 are HIGH ACCEPT_PDF_ANSWER (clearly truncated text)',
      'P1 HIGH: MCQ questions → NEEDS_EXPERT; opposite polarity (verde/rojo etc) → ACCEPT_PDF_ANSWER HIGH; pack very short → ACCEPT_PDF_ANSWER HIGH',
      'P1 MEDIUM: Short answers with low overlap, or different phrasing → ACCEPT_PDF_ANSWER MEDIUM with human review',
      'P3: Default NEEDS_EXPERT unless pack answer clearly incomplete → ACCEPT_PDF_ANSWER MEDIUM',
    ],
  };

  writeFileSync(resolve(OUT_DIR, 'ai_prefilled_review_summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  // ── Console report ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(62));
  console.log('AI PRE-CLASSIFICATION REPORT');
  console.log('='.repeat(62));
  console.log(`\nTotal items classified   : ${total}  (P1=${p1Rows.length} P2=${p2Rows.length} P3=${p3Rows.length})`);
  console.log('\n── AI Decisions ───────────────────────────────────────────────');
  console.log(`ACCEPT_PDF_ANSWER HIGH   : ${acceptHigh}  ← can approve in batch (no human needed)`);
  console.log(`ACCEPT_PDF_ANSWER MEDIUM : ${acceptMedium}  ← suggested but human confirmation advised`);
  console.log(`NEEDS_EXPERT             : ${needsExpert}  ← must be reviewed by a human`);
  console.log('\n── Review Load ────────────────────────────────────────────────');
  console.log(`Batch-approvable (HIGH)  : ${batchReady}  (${Math.round(batchReady / total * 100)}% of total)`);
  console.log(`Still needs human review : ${humanNeeded}  (${Math.round(humanNeeded / total * 100)}% of total)`);

  // Sample HIGH decisions
  const highSamples = allRows.filter(r => r['aiSuggestedDecision'] === 'ACCEPT_PDF_ANSWER' && r['aiConfidence'] === 'HIGH').slice(0, 6);
  console.log('\n── Examples: ACCEPT_PDF_ANSWER HIGH ───────────────────────────');
  highSamples.forEach(r => {
    console.log(`\n  [${r['pdfIndex']}] ${r['packId']} | ${r['category']}`);
    console.log(`  Q:    "${String(r['question'] ?? r['pdfQuestion'] ?? '').substring(0, 80)}"`);
    console.log(`  PDF:  "${String(r['pdfAnswer'] ?? r['fullPdfAnswer'] ?? '').substring(0, 70)}"`);
    console.log(`  Pack: "${String(r['packAnswer'] ?? r['truncatedPackAnswer'] ?? '').substring(0, 70)}"`);
    console.log(`  Why:  ${String(r['aiReason']).substring(0, 100)}`);
  });

  // Sample NEEDS_EXPERT
  const expertSamples = allRows.filter(r => r['aiSuggestedDecision'] === 'NEEDS_EXPERT').slice(0, 5);
  console.log('\n── Examples: NEEDS_EXPERT ─────────────────────────────────────');
  expertSamples.forEach(r => {
    console.log(`\n  [${r['pdfIndex']}] ${r['packId']} | ${r['category']}`);
    console.log(`  Q:    "${String(r['question'] ?? r['pdfQuestion'] ?? '').substring(0, 80)}"`);
    console.log(`  PDF:  "${String(r['pdfAnswer'] ?? '').substring(0, 70)}"`);
    console.log(`  Pack: "${String(r['packAnswer'] ?? '').substring(0, 70)}"`);
    console.log(`  Why:  ${String(r['aiReason']).substring(0, 100)}`);
  });

  console.log('\n' + '='.repeat(62));
  console.log('Files written to content-review/:');
  console.log('  p1_exact_question_wrong_answer.csv  (updated with AI columns)');
  console.log('  p2_truncated_answers.csv            (updated with AI columns)');
  console.log('  p3_near_exact_wrong_answer.csv      (updated with AI columns)');
  console.log('  human_review_required.csv           (only humanNeedsReview=true)');
  console.log('  ai_prefilled_review_summary.json');
  console.log('\nNo corrections were applied.');
}

main();
