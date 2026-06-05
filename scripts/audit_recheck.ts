/**
 * audit_recheck.ts
 *
 * Second-pass audit to fix false negatives in the first audit run.
 *
 * Problems found in audit run 1:
 *   - Word-index used only first 2 non-stopword tokens → high false NOT_FOUND rate
 *   - "¿A cuántos caballos de vapor?" was FOUND_EXACT in preview but NOT_FOUND in full run
 *
 * This script:
 *   1. Re-checks NOT_FOUND questions with a better token-overlap + brute-force strategy
 *   2. Reclassifies ANSWER_CONFLICTs into: PACK_ANSWER_TRUNCATED / WRONG_MATCH_VARIANT /
 *      REAL_ANSWER_CONFLICT / NEEDS_REVIEW
 *   3. Produces audit_summary_v2.json with revised coverage estimate
 *
 * Usage:
 *   npm run audit:recheck                  # full recheck (all NOT_FOUND + all conflicts)
 *   npm run audit:recheck -- --sample=100  # sample mode: first 100 NOT_FOUND only
 *   npm run audit:recheck -- --bruteforce  # add brute-force fallback for empoty pools
 *
 * Reads (produced by audit_autoescola_pdf_vs_pack.ts):
 *   audit-results/autoescola_pdf_vs_pack/not_found.json
 *   audit-results/autoescola_pdf_vs_pack/answer_conflicts.json
 *   audit-results/autoescola_pdf_vs_pack/audit_summary.json
 *   public/data/questions-v1.json
 *
 * Writes:
 *   audit-results/autoescola_pdf_vs_pack/recheck_not_found.json
 *   audit-results/autoescola_pdf_vs_pack/recheck_conflicts.json
 *   audit-results/autoescola_pdf_vs_pack/recheck_conflicts.csv
 *   audit-results/autoescola_pdf_vs_pack/audit_summary_v2.json
 *
 * Does NOT modify any app files, Firestore, or the data pack.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

// ─── CLI ───────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const sampleArg  = args.find(a => a.startsWith('--sample='));
const SAMPLE_N   = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : null;
const BRUTEFORCE = args.includes('--bruteforce');

// ─── Paths ─────────────────────────────────────────────────────────────────
const COMP_DIR      = resolve(ROOT, 'audit-results/autoescola_pdf_vs_pack');
const NOT_FOUND_P   = resolve(COMP_DIR, 'not_found.json');
const CONFLICTS_P   = resolve(COMP_DIR, 'answer_conflicts.json');
const SUMMARY_P     = resolve(COMP_DIR, 'audit_summary.json');
const PACK_P        = resolve(ROOT, 'public/data/questions-v1.json');

// ─── Types ─────────────────────────────────────────────────────────────────
interface NotFoundEntry {
  pdfNumber:    number;
  pdfQuestion:  string;
  pdfAnswerText?: string;
  matchStatus:  'NOT_FOUND';
}

interface ConflictEntry {
  pdfNumber:       number;
  pdfQuestion:     string;
  pdfAnswerText?:  string;
  matchStatus:     string;
  similarity?:     number;
  packId?:         string;
  packQuestion?:   string;
  packCategory?:   string;
  answerStatus?:   string;
  packCorrectText?: string;
}

interface PackQuestion {
  id:       string;
  category: string;
  question: { es: string };
  options:  { id: string; text: { es: string }; isCorrect: boolean }[];
}

type RecheckStatus = 'FALSE_NOT_FOUND_FOUND_EXACT' | 'FALSE_NOT_FOUND_FOUND_SIMILAR' | 'REAL_NOT_FOUND' | 'NEEDS_REVIEW';
type ConflictType  = 'PACK_ANSWER_TRUNCATED' | 'WRONG_MATCH_VARIANT' | 'REAL_ANSWER_CONFLICT' | 'NEEDS_REVIEW';

// ─── Spanish stopwords ─────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'a','al','ante','aquel','aquella','aquellas','aquellos','aqui','ahi',
  'bajo','bien','cada','con','cual','cuales','cuando','de','del','desde',
  'durante','e','el','ella','ellas','ellos','en','entre','era','eres',
  'es','esta','estas','este','esto','estos','fue','han','has','hay',
  'la','las','le','les','lo','los','me','mi','mis','muy','ni','no',
  'nos','nuestro','o','para','pero','por','que','quien','quienes',
  'se','sea','ser','si','sin','sobre','son','su','sus','también','te',
  'ti','tiene','todo','todos','tras','tu','tus','un','una','unas','unos',
  'ya','y','yo',
]);

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

function tokens(text: string): string[] {
  return norm(text).split(' ').filter(w => w.length > 3 && !STOPWORDS.has(w));
}

function editDist(a: string, b: string): number {
  const dp: number[] = [];
  for (let i = 0; i <= a.length; i++) {
    let prev = i;
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) { dp[j] = j; continue; }
      if (j > 0) {
        let cur = dp[j - 1];
        if (a[i - 1] !== b[j - 1]) cur = Math.min(cur, prev, dp[j]) + 1;
        dp[j - 1] = prev;
        prev = cur;
      }
    }
    if (i > 0) dp[b.length] = prev;
  }
  return dp[b.length] ?? Math.max(a.length, b.length);
}

function sim(a: string, b: string): number {
  if (!a && !b) return 1;
  const la = a.substring(0, 300);
  const lb = b.substring(0, 300);
  const len = Math.max(la.length, lb.length);
  if (len === 0) return 1;
  return (len - editDist(la, lb)) / len;
}

/** Token overlap ratio: |A∩B| / |A∪B| (Jaccard) */
function tokenOverlap(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Combined score: 60% Levenshtein + 40% Jaccard */
function combinedScore(normA: string, tokA: string[], normB: string, tokB: string[]): number {
  return 0.6 * sim(normA, normB) + 0.4 * tokenOverlap(tokA, tokB);
}

function escCSV(v: unknown): string {
  if (v == null) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

function writeCSV(path: string, rows: object[]): void {
  if (!rows.length) { writeFileSync(path, '', 'utf8'); return; }
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.map(escCSV).join(','),
    ...rows.map(r => keys.map(k => escCSV((r as Record<string, unknown>)[k])).join(','))
  ];
  writeFileSync(path, lines.join('\n'), 'utf8');
}

// ─── Token index ───────────────────────────────────────────────────────────
interface TokenIndex {
  byToken: Map<string, PackQuestion[]>;
  all:     PackQuestion[];
}

function buildTokenIndex(packQuestions: PackQuestion[]): TokenIndex {
  const byToken = new Map<string, PackQuestion[]>();
  for (const q of packQuestions) {
    for (const tok of tokens(q.question.es)) {
      if (!byToken.has(tok)) byToken.set(tok, []);
      byToken.get(tok)!.push(q);
    }
  }
  return { byToken, all: packQuestions };
}

/** Find the best pack match for a PDF question using the improved algorithm */
function findBest(
  pdfQ: string,
  idx: TokenIndex,
  bruteforce: boolean
): { q: PackQuestion; score: number; method: string } | null {

  const normQ  = norm(pdfQ);
  const toksQ  = tokens(pdfQ);

  // Fast path: exact normalized match
  const exact = idx.all.find(q => norm(q.question.es) === normQ);
  if (exact) return { q: exact, score: 1.0, method: 'exact' };

  // Candidate pool via token overlap
  const overlap = new Map<string, { q: PackQuestion; count: number }>();
  for (const tok of toksQ) {
    for (const pq of (idx.byToken.get(tok) ?? [])) {
      const e = overlap.get(pq.id);
      if (e) e.count++;
      else overlap.set(pq.id, { q: pq, count: 1 });
    }
  }

  // Sort by overlap count, keep top 80 candidates
  const pool = [...overlap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 80)
    .map(x => x.q);

  let best: PackQuestion | null = null;
  let bestScore = 0;

  for (const c of pool) {
    const s = combinedScore(normQ, toksQ, norm(c.question.es), tokens(c.question.es));
    if (s > bestScore) { bestScore = s; best = c; }
  }

  if (bestScore >= 0.72 && best) return { q: best, score: parseFloat(bestScore.toFixed(4)), method: 'token_pool' };

  // Brute-force fallback (all 5554 pack questions)
  if (bruteforce) {
    for (const c of idx.all) {
      const s = combinedScore(normQ, toksQ, norm(c.question.es), tokens(c.question.es));
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (bestScore >= 0.72 && best) return { q: best, score: parseFloat(bestScore.toFixed(4)), method: 'brute_force' };
  }

  return null;
}

// ─── Conflict reclassification ─────────────────────────────────────────────
function classifyConflict(
  r: ConflictEntry,
  packIdCounts: Map<string, number>
): { type: ConflictType; reason: string } {

  const pdfAns  = norm(r.pdfAnswerText ?? '');
  const packAns = norm(r.packCorrectText ?? '');

  if (!pdfAns || !packAns) {
    return { type: 'NEEDS_REVIEW', reason: 'missing_answer_text' };
  }

  // 1. PACK_ANSWER_TRUNCATED: pack answer is a short prefix of PDF answer
  const pdfLen  = pdfAns.length;
  const packLen = packAns.length;
  if (
    packLen > 5 &&
    packLen < pdfLen * 0.75 &&
    pdfAns.startsWith(packAns.substring(0, Math.min(packLen, 35)))
  ) {
    return { type: 'PACK_ANSWER_TRUNCATED', reason: `pack_len=${packLen}_pdf_len=${pdfLen}` };
  }

  // 2. WRONG_MATCH_VARIANT: the same packId was matched to 2+ different PDF questions
  const packId    = r.packId ?? '';
  const sharedCount = packIdCounts.get(packId) ?? 1;
  if (sharedCount >= 2) {
    return { type: 'WRONG_MATCH_VARIANT', reason: `packId_shared_by_${sharedCount}_pdf_questions` };
  }

  // 3. REAL_ANSWER_CONFLICT: question is very similar (sim ≥ 0.90) but answers differ
  const qSim = r.similarity ?? 0;
  const ansSim = sim(pdfAns, packAns);
  if (qSim >= 0.90 && ansSim < 0.50) {
    return { type: 'REAL_ANSWER_CONFLICT', reason: `q_sim=${qSim}_ans_sim=${ansSim.toFixed(2)}` };
  }

  return { type: 'NEEDS_REVIEW', reason: `q_sim=${qSim}_ans_sim=${ansSim.toFixed(2)}` };
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const t0    = Date.now();
  const label = SAMPLE_N ? `[SAMPLE ${SAMPLE_N}]` : '[FULL RECHECK]';
  console.log(`\n=== Audit Recheck ${label}${BRUTEFORCE ? ' +bruteforce' : ''} ===\n`);

  // Guard: check inputs exist
  for (const p of [NOT_FOUND_P, CONFLICTS_P, PACK_P]) {
    if (!existsSync(p)) {
      console.error(`Missing input: ${p}`);
      console.error('Run "npm run audit:autoescola-pdf" first.');
      process.exit(1);
    }
  }

  // Load inputs
  const notFoundAll: NotFoundEntry[] = JSON.parse(readFileSync(NOT_FOUND_P, 'utf8'));
  const conflicts:   ConflictEntry[] = JSON.parse(readFileSync(CONFLICTS_P, 'utf8'));
  const packFile:    { questions: PackQuestion[] } = JSON.parse(readFileSync(PACK_P, 'utf8'));
  const packQs = packFile.questions;

  const prevSummary = existsSync(SUMMARY_P)
    ? JSON.parse(readFileSync(SUMMARY_P, 'utf8'))
    : {};

  console.log(`NOT_FOUND loaded   : ${notFoundAll.length}`);
  console.log(`CONFLICTS loaded   : ${conflicts.length}`);
  console.log(`Pack questions     : ${packQs.length}`);

  const notFoundSlice = SAMPLE_N ? notFoundAll.slice(0, SAMPLE_N) : notFoundAll;
  console.log(`NOT_FOUND to recheck: ${notFoundSlice.length}${BRUTEFORCE ? ' (brute-force enabled)' : ''}`);

  // Build improved token index
  console.log('\nBuilding token index...');
  const idx = buildTokenIndex(packQs);
  console.log(`Token index: ${idx.byToken.size} unique tokens`);

  // ── Step 1: Recheck NOT_FOUND ─────────────────────────────────────────────
  console.log('\nRechecking NOT_FOUND...');

  interface RecheckResult {
    pdfNumber:     number;
    pdfQuestion:   string;
    pdfAnswerText: string;
    recheckStatus: RecheckStatus;
    score?:        number;
    method?:       string;
    packId?:       string;
    packQuestion?: string;
    packCategory?: string;
    answerStatus?: string;
    packCorrectText?: string;
  }

  const recheckResults: RecheckResult[] = [];
  let progressInterval = Math.max(1, Math.floor(notFoundSlice.length / 10));

  for (let i = 0; i < notFoundSlice.length; i++) {
    if (i > 0 && i % progressInterval === 0) {
      const pct = ((i / notFoundSlice.length) * 100).toFixed(0);
      process.stdout.write(`  ${pct}%... `);
    }

    const entry = notFoundSlice[i];
    const found = findBest(entry.pdfQuestion, idx, BRUTEFORCE);

    if (!found) {
      recheckResults.push({
        pdfNumber:     entry.pdfNumber,
        pdfQuestion:   entry.pdfQuestion,
        pdfAnswerText: entry.pdfAnswerText ?? '',
        recheckStatus: 'REAL_NOT_FOUND',
      });
      continue;
    }

    const { q: packQ, score, method } = found;
    const status: RecheckStatus = score >= 0.999 ? 'FALSE_NOT_FOUND_FOUND_EXACT' : 'FALSE_NOT_FOUND_FOUND_SIMILAR';

    // Compare answers
    const pdfAns  = norm(entry.pdfAnswerText ?? '');
    const correct = packQ.options.find(o => o.isCorrect);
    const packAns = norm(correct?.text?.es ?? '');
    const ansSim  = sim(pdfAns, packAns);
    const answerStatus = !pdfAns || !packAns ? 'NEEDS_REVIEW'
      : ansSim >= 0.80 ? 'ANSWER_MATCH'
      : ansSim >= 0.55 ? 'NEEDS_REVIEW'
      : 'ANSWER_CONFLICT';

    recheckResults.push({
      pdfNumber:       entry.pdfNumber,
      pdfQuestion:     entry.pdfQuestion,
      pdfAnswerText:   entry.pdfAnswerText ?? '',
      recheckStatus:   status,
      score,
      method,
      packId:          packQ.id,
      packQuestion:    packQ.question.es,
      packCategory:    packQ.category,
      answerStatus,
      packCorrectText: correct?.text?.es ?? '',
    });
  }

  console.log('\n');

  const falseExact   = recheckResults.filter(r => r.recheckStatus === 'FALSE_NOT_FOUND_FOUND_EXACT');
  const falseSimilar = recheckResults.filter(r => r.recheckStatus === 'FALSE_NOT_FOUND_FOUND_SIMILAR');
  const realNotFound = recheckResults.filter(r => r.recheckStatus === 'REAL_NOT_FOUND');
  const needsReview  = recheckResults.filter(r => r.recheckStatus === 'NEEDS_REVIEW');
  const recovered    = falseExact.length + falseSimilar.length;

  // ── Step 2: Reclassify ANSWER_CONFLICTs ───────────────────────────────────
  console.log('Reclassifying ANSWER_CONFLICTs...');

  // Pre-count how many PDF questions share each packId in the conflict list
  const packIdCounts = new Map<string, number>();
  for (const r of conflicts) {
    const id = r.packId ?? '';
    packIdCounts.set(id, (packIdCounts.get(id) ?? 0) + 1);
  }

  interface RecheckConflict extends ConflictEntry {
    conflictType: ConflictType;
    conflictReason: string;
  }

  const reclassifiedConflicts: RecheckConflict[] = conflicts.map(r => {
    const { type, reason } = classifyConflict(r, packIdCounts);
    return { ...r, conflictType: type, conflictReason: reason };
  });

  const truncated    = reclassifiedConflicts.filter(r => r.conflictType === 'PACK_ANSWER_TRUNCATED');
  const wrongVariant = reclassifiedConflicts.filter(r => r.conflictType === 'WRONG_MATCH_VARIANT');
  const realConflict = reclassifiedConflicts.filter(r => r.conflictType === 'REAL_ANSWER_CONFLICT');
  const conflictNR   = reclassifiedConflicts.filter(r => r.conflictType === 'NEEDS_REVIEW');

  // ── Step 3: Revised summary ────────────────────────────────────────────────
  const prevMatch    = prevSummary.match ?? {};
  const prevAnswer   = prevSummary.answer ?? {};
  const pdfReal      = prevSummary.pdfRealQuestions ?? 3422;
  const originalFE   = prevMatch.FOUND_EXACT  ?? 1246;
  const originalFS   = prevMatch.FOUND_SIMILAR ?? 351;
  const originalNF   = prevMatch.NOT_FOUND     ?? 1825;

  // Extrapolate to full set if in sample mode
  const scaleFactor  = SAMPLE_N ? notFoundAll.length / notFoundSlice.length : 1;
  const recoveredEst = Math.round(recovered * scaleFactor);
  const realNFEst    = Math.round(realNotFound.length * scaleFactor);

  const revisedCoverage = (
    (originalFE + originalFS + recoveredEst) / pdfReal * 100
  ).toFixed(1);

  const summaryV2 = {
    generatedAt:           new Date().toISOString(),
    isSample:              SAMPLE_N !== null,
    sampleN:               SAMPLE_N,
    bruteforceEnabled:     BRUTEFORCE,

    pdfRealQuestions:      pdfReal,
    packTotal:             packQs.length,

    originalAudit: {
      FOUND_EXACT:         originalFE,
      FOUND_SIMILAR:       originalFS,
      NOT_FOUND:           originalNF,
      ANSWER_MATCH:        prevAnswer.ANSWER_MATCH,
      ANSWER_CONFLICT:     prevAnswer.ANSWER_CONFLICT,
      NEEDS_REVIEW:        prevAnswer.NEEDS_REVIEW,
      matchRate:           prevMatch.matchRate,
    },

    recheckNotFound: {
      processed:           notFoundSlice.length,
      scaleFactor:         parseFloat(scaleFactor.toFixed(2)),
      FALSE_NOT_FOUND_FOUND_EXACT:    falseExact.length,
      FALSE_NOT_FOUND_FOUND_SIMILAR:  falseSimilar.length,
      recovered_in_sample:            recovered,
      recovered_estimated_full:       recoveredEst,
      REAL_NOT_FOUND_in_sample:       realNotFound.length,
      REAL_NOT_FOUND_estimated_full:  realNFEst,
      NEEDS_REVIEW:                   needsReview.length,
    },

    recheckConflicts: {
      total:               conflicts.length,
      PACK_ANSWER_TRUNCATED:   truncated.length,
      WRONG_MATCH_VARIANT:     wrongVariant.length,
      REAL_ANSWER_CONFLICT:    realConflict.length,
      NEEDS_REVIEW:            conflictNR.length,
    },

    revisedCoverage: {
      estimatedMatchedQuestions: originalFE + originalFS + recoveredEst,
      estimatedCoveragePercent:  `${revisedCoverage}%`,
      note: SAMPLE_N
        ? `Based on sample of ${SAMPLE_N}/${notFoundAll.length} NOT_FOUND (scale ×${scaleFactor.toFixed(1)})`
        : 'Based on full recheck',
    },
  };

  // ── Write outputs ─────────────────────────────────────────────────────────
  writeFileSync(resolve(COMP_DIR, 'recheck_not_found.json'),
    JSON.stringify(recheckResults, null, 2), 'utf8');

  writeFileSync(resolve(COMP_DIR, 'recheck_conflicts.json'),
    JSON.stringify(reclassifiedConflicts, null, 2), 'utf8');

  writeCSV(resolve(COMP_DIR, 'recheck_conflicts.csv'),
    reclassifiedConflicts.map(r => ({
      pdfNumber:      r.pdfNumber,
      pdfQuestion:    r.pdfQuestion,
      similarity:     r.similarity,
      packId:         r.packId,
      packQuestion:   r.packQuestion,
      pdfAnswer:      r.pdfAnswerText,
      packAnswer:     r.packCorrectText,
      conflictType:   r.conflictType,
      conflictReason: r.conflictReason,
    }))
  );

  writeFileSync(resolve(COMP_DIR, 'audit_summary_v2.json'),
    JSON.stringify(summaryV2, null, 2), 'utf8');

  // ── Console output ────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(62));
  console.log(`RECHECK SUMMARY ${label}`);
  console.log('='.repeat(62));

  console.log('\n── NOT_FOUND Recheck ──────────────────────────────────────────');
  console.log(`Processed                : ${notFoundSlice.length}  (of ${notFoundAll.length} total NOT_FOUND)`);
  console.log(`FALSE_NOT_FOUND (exact)  : ${falseExact.length}   ← were in pack, missed by old index`);
  console.log(`FALSE_NOT_FOUND (similar): ${falseSimilar.length}   ← were in pack, missed by old index`);
  console.log(`REAL_NOT_FOUND           : ${realNotFound.length}   ← genuinely absent from pack`);
  console.log(`NEEDS_REVIEW             : ${needsReview.length}`);
  if (SAMPLE_N) {
    console.log(`\n  Estimated for full ${notFoundAll.length} NOT_FOUND (×${scaleFactor.toFixed(1)}x scale):`);
    console.log(`  → False positives recovered  : ~${recoveredEst}`);
    console.log(`  → Real NOT_FOUND (absent)    : ~${realNFEst}`);
  }

  console.log('\n── Conflict Reclassification ──────────────────────────────────');
  console.log(`Total conflicts          : ${conflicts.length}`);
  console.log(`PACK_ANSWER_TRUNCATED    : ${truncated.length}   ← pack data truncated, likely correct`);
  console.log(`WRONG_MATCH_VARIANT      : ${wrongVariant.length}   ← wrong pack question matched`);
  console.log(`REAL_ANSWER_CONFLICT     : ${realConflict.length}   ← genuine data discrepancy`);
  console.log(`NEEDS_REVIEW             : ${conflictNR.length}`);

  console.log('\n── Revised Coverage ────────────────────────────────────────────');
  console.log(`Original match rate      : ${prevMatch.matchRate ?? '?'}`);
  console.log(`Estimated revised rate   : ${revisedCoverage}%`);
  console.log(`  (original matched + recovered false NOT_FOUND / total real questions)`);

  console.log('\n── Sample: FALSE_NOT_FOUND examples ───────────────────────────');
  const falseExamples = [...falseExact, ...falseSimilar].slice(0, 8);
  falseExamples.forEach(r => {
    console.log(`\n  [${r.pdfNumber}] ${r.recheckStatus} (score=${r.score} method=${r.method})`);
    console.log(`    PDF : "${r.pdfQuestion.substring(0, 80)}"`);
    console.log(`    Pack: "${(r.packQuestion ?? '').substring(0, 80)}"`);
    console.log(`    Ans : ${r.answerStatus}`);
  });

  if (realNotFound.length) {
    console.log('\n── Sample: REAL_NOT_FOUND examples ────────────────────────────');
    realNotFound.slice(0, 5).forEach(r => {
      console.log(`  [${r.pdfNumber}] "${r.pdfQuestion.substring(0, 80)}"`);
      console.log(`         A: "${r.pdfAnswerText.substring(0, 60)}"`);
    });
  }

  if (truncated.length) {
    console.log('\n── Sample: PACK_ANSWER_TRUNCATED examples ─────────────────────');
    truncated.slice(0, 3).forEach(r => {
      console.log(`  [${r.pdfNumber}] "${r.pdfQuestion.substring(0, 70)}"`);
      console.log(`    PDF ans : "${(r.pdfAnswerText ?? '').substring(0, 70)}"`);
      console.log(`    Pack ans: "${(r.packCorrectText ?? '').substring(0, 70)}"`);
    });
  }

  if (realConflict.length) {
    console.log('\n── Sample: REAL_ANSWER_CONFLICT examples ───────────────────────');
    realConflict.slice(0, 3).forEach(r => {
      console.log(`  [${r.pdfNumber}] sim=${r.similarity} "${r.pdfQuestion.substring(0, 70)}"`);
      console.log(`    PDF ans : "${(r.pdfAnswerText ?? '').substring(0, 70)}"`);
      console.log(`    Pack ans: "${(r.packCorrectText ?? '').substring(0, 70)}"`);
    });
  }

  console.log('\n' + '='.repeat(62));
  console.log(`Elapsed: ${elapsed}s`);
  console.log(`Reports: ${COMP_DIR}`);
  if (SAMPLE_N) console.log('\n⚠  Sample run. Run without --sample to recheck all NOT_FOUND.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
