/**
 * apply_approved_content_corrections.ts
 *
 * Generates public/data/questions-v2.json (+ .gz) by applying ONLY approved
 * ACCEPT_PDF_ANSWER corrections to a copy of questions-v1.json.
 *
 * HARD GUARANTEES:
 *   - questions-v1.json is read-only (never written).
 *   - data-manifest.json is NOT touched.
 *   - src/ is NOT touched.
 *   - No question is added or removed. No ID is changed. Order preserved.
 *   - Question text, categories, structure unchanged.
 *   - Options unchanged EXCEPT: (a) which option isCorrect (P1/P3),
 *                               (b) truncated option text fix (P2 only).
 *   - Explanations are NOT modified (logged if a case would need it).
 *   - NEEDS_EXPERT / SKIP / empty decisions are ignored (logged).
 *   - ACCEPT_PACK_ANSWER is kept as-is (logged).
 *
 * Decision precedence per row:
 *   humanNeedsReview === 'true'  → reviewerDecision from human_review_required.csv (by packId)
 *   humanNeedsReview === 'false' → aiSuggestedDecision (AI HIGH batch)
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { gzipSync } from 'zlib';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

const PATHS = {
  v1:        resolve(ROOT, 'public/data/questions-v1.json'),
  v2:        resolve(ROOT, 'public/data/questions-v2.json'),
  v2gz:      resolve(ROOT, 'public/data/questions-v2.json.gz'),
  manifest:  resolve(ROOT, 'public/data/data-manifest.json'),
  p1:        resolve(ROOT, 'content-review/p1_exact_question_wrong_answer.csv'),
  p2:        resolve(ROOT, 'content-review/p2_truncated_answers.csv'),
  p3:        resolve(ROOT, 'content-review/p3_near_exact_wrong_answer.csv'),
  human:     resolve(ROOT, 'content-review/human_review_required.csv'),
  log:       resolve(ROOT, 'content-review/corrections_log.json'),
  summary:   resolve(ROOT, 'content-review/corrections_summary.json'),
};

const OPTION_MATCH_THRESHOLD = 0.55;

// ── Text utils ──────────────────────────────────────────────────────────────
function norm(s: string): string {
  return (s ?? '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!"'[\]…]/g, '')
    .replace(/\s+/g, ' ').trim();
}
function tokenJaccard(a: string, b: string): number {
  const sa = new Set(norm(a).split(' ').filter(w => w.length > 2));
  const sb = new Set(norm(b).split(' ').filter(w => w.length > 2));
  if (!sa.size && !sb.size) return 1;
  let inter = 0; for (const w of sa) if (sb.has(w)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}
function containSim(a: string, b: string): number {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  return 0;
}
function sim(a: string, b: string): number {
  return Math.max(tokenJaccard(a, b), containSim(a, b));
}

// ── CSV parser ──────────────────────────────────────────────────────────────
function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}
function parseCsv(path: string): Record<string, string>[] {
  if (!existsSync(path)) return [];
  const text  = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const hdrs = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const o: Record<string, string> = {};
    hdrs.forEach((h, i) => { o[h] = vals[i] ?? ''; });
    return o;
  });
}

// ── Pack types ──────────────────────────────────────────────────────────────
interface PackOption { id: string; text: { es?: string; pt?: string; en?: string }; isCorrect: boolean; }
interface PackQuestion {
  id: string;
  category: string;
  question: { es?: string; pt?: string; en?: string };
  options: PackOption[];
  explanation?: { es?: string; pt?: string; en?: string };
  community?: string;
}

function findBestOption(opts: PackOption[], pdfText: string): { opt: PackOption; sim: number } | null {
  let best: { opt: PackOption; sim: number } | null = null;
  for (const o of opts) {
    const s = Math.max(sim(o.text?.es ?? '', pdfText), sim(o.text?.pt ?? '', pdfText));
    if (!best || s > best.sim) best = { opt: o, sim: s };
  }
  return best;
}

// ── Log entry ────────────────────────────────────────────────────────────────
interface LogEntry {
  packId: string;
  priority: string;
  finalDecision: string;
  decisionSource: 'AI_HIGH' | 'HUMAN_REVIEW';
  status: 'APPLIED' | 'KEPT_PACK' | 'IGNORED_EXPERT' | 'IGNORED_SKIP' | 'NOT_APPLIED_NO_MATCH'
        | 'NOT_APPLIED_ALREADY_CORRECT' | 'PACKID_NOT_FOUND' | 'CONFLICT';
  changeType?: 'TOGGLE_IS_CORRECT' | 'FIX_TRUNCATED_TEXT' | 'NONE';
  pdfAnswer?: string;
  optionUpdated?: string;
  matchSim?: number;
  reason: string;
}

function main() {
  // Snapshot v1 file stats (to prove non-mutation later)
  const v1StatBefore = statSync(PATHS.v1);
  const v1RawBefore  = readFileSync(PATHS.v1, 'utf8');
  const manifestRawBefore = readFileSync(PATHS.manifest, 'utf8');

  const v1Parsed = JSON.parse(v1RawBefore);
  const v1Questions: PackQuestion[] = Array.isArray(v1Parsed) ? v1Parsed : v1Parsed.questions;
  const V1_COUNT = v1Questions.length;
  console.log(`questions-v1.json: ${V1_COUNT} questions`);

  // Deep clone for v2 (v1 in-memory object never mutated)
  const v2Parsed = JSON.parse(v1RawBefore);
  const v2Questions: PackQuestion[] = Array.isArray(v2Parsed) ? v2Parsed : v2Parsed.questions;
  const qIndex = new Map<string, PackQuestion>();
  for (const q of v2Questions) qIndex.set(q.id, q);

  // ── Human decisions by packId ───────────────────────────────────────────
  const humanRows = parseCsv(PATHS.human);
  const humanDecisions = new Map<string, string>();
  for (const r of humanRows) {
    if (r['packId']) humanDecisions.set(r['packId'], (r['reviewerDecision'] ?? '').trim());
  }

  // ── Load P1/P2/P3 with normalized fields ────────────────────────────────
  interface Row { priority: string; packId: string; pdfAnswer: string; truncated?: string;
                  aiDecision: string; humanNeeds: boolean; }
  const rows: Row[] = [];
  for (const r of parseCsv(PATHS.p1)) rows.push({
    priority: 'P1', packId: r['packId'], pdfAnswer: r['pdfAnswer'] ?? '',
    aiDecision: r['aiSuggestedDecision'] ?? '', humanNeeds: r['humanNeedsReview'] === 'true',
  });
  for (const r of parseCsv(PATHS.p2)) rows.push({
    priority: 'P2', packId: r['packId'], pdfAnswer: r['fullPdfAnswer'] ?? '',
    truncated: r['truncatedPackAnswer'] ?? '',
    aiDecision: r['aiSuggestedDecision'] ?? '', humanNeeds: r['humanNeedsReview'] === 'true',
  });
  for (const r of parseCsv(PATHS.p3)) rows.push({
    priority: 'P3', packId: r['packId'], pdfAnswer: r['pdfAnswer'] ?? '',
    aiDecision: r['aiSuggestedDecision'] ?? '', humanNeeds: r['humanNeedsReview'] === 'true',
  });

  // ── Resolve final decision per row ──────────────────────────────────────
  function finalDecision(r: Row): { dec: string; src: 'AI_HIGH' | 'HUMAN_REVIEW' } {
    if (r.humanNeeds) return { dec: humanDecisions.get(r.packId) ?? '', src: 'HUMAN_REVIEW' };
    return { dec: r.aiDecision, src: 'AI_HIGH' };
  }

  // ── Detect duplicate/conflicting decisions per packId ───────────────────
  const seen = new Map<string, string>(); // packId → finalDecision
  const conflicts: string[] = [];
  for (const r of rows) {
    const { dec } = finalDecision(r);
    if (seen.has(r.packId) && seen.get(r.packId) !== dec) {
      conflicts.push(`${r.packId}: "${seen.get(r.packId)}" vs "${dec}"`);
    }
    if (!seen.has(r.packId)) seen.set(r.packId, dec);
  }

  // ── Apply ───────────────────────────────────────────────────────────────
  const log: LogEntry[] = [];
  let applied = 0, keptPack = 0, ignoredExpert = 0, ignoredSkip = 0;
  let notApplNoMatch = 0, notApplAlready = 0, packNotFound = 0;
  let p1p3Toggled = 0, p2Fixed = 0;

  for (const r of rows) {
    const { dec, src } = finalDecision(r);
    const base: LogEntry = {
      packId: r.packId, priority: r.priority, finalDecision: dec || '(empty)',
      decisionSource: src, status: 'IGNORED_SKIP', reason: '', pdfAnswer: r.pdfAnswer,
    };

    if (dec === 'ACCEPT_PACK_ANSWER') {
      base.status = 'KEPT_PACK'; base.changeType = 'NONE';
      base.reason = 'Reviewer chose to keep pack answer — no change.';
      log.push(base); keptPack++; continue;
    }
    if (dec === 'NEEDS_EXPERT') {
      base.status = 'IGNORED_EXPERT'; base.changeType = 'NONE';
      base.reason = 'NEEDS_EXPERT — ignored per rules.';
      log.push(base); ignoredExpert++; continue;
    }
    if (dec !== 'ACCEPT_PDF_ANSWER') {
      base.status = 'IGNORED_SKIP'; base.changeType = 'NONE';
      base.reason = `Decision "${dec || '(empty)'}" — SKIP/empty, ignored per rules.`;
      log.push(base); ignoredSkip++; continue;
    }

    // ACCEPT_PDF_ANSWER
    const q = qIndex.get(r.packId);
    if (!q) {
      base.status = 'PACKID_NOT_FOUND';
      base.reason = `packId ${r.packId} not present in questions-v1.json.`;
      log.push(base); packNotFound++; continue;
    }

    // P2: fix truncated option text
    if (r.priority === 'P2') {
      // Locate the option to fix: best match to the truncated text, else the current correct one
      let target: PackOption | undefined;
      let mSim = 0;
      if (r.truncated) {
        const m = findBestOption(q.options, r.truncated);
        if (m && m.sim >= OPTION_MATCH_THRESHOLD) { target = m.opt; mSim = m.sim; }
      }
      if (!target) target = q.options.find(o => o.isCorrect);
      if (!target) {
        base.status = 'NOT_APPLIED_NO_MATCH';
        base.reason = 'P2: no truncated option matched and no current correct option.';
        log.push(base); notApplNoMatch++; continue;
      }
      // Ensure it is the correct one and fix its text to the full PDF answer
      for (const o of q.options) o.isCorrect = (o.id === target.id);
      target.text.es = r.pdfAnswer;
      base.status = 'APPLIED'; base.changeType = 'FIX_TRUNCATED_TEXT';
      base.optionUpdated = target.id; base.matchSim = mSim;
      base.reason = `P2: replaced truncated option text with full PDF answer (sim=${mSim.toFixed(3)}).`;
      log.push(base); applied++; p2Fixed++; continue;
    }

    // P1/P3: toggle isCorrect only (NEVER change option text)
    const m = findBestOption(q.options, r.pdfAnswer);
    if (!m || m.sim < OPTION_MATCH_THRESHOLD) {
      base.status = 'NOT_APPLIED_NO_MATCH'; base.changeType = 'NONE';
      base.matchSim = m ? Number(m.sim.toFixed(3)) : 0;
      base.reason = `No pack option matches PDF answer (best sim=${m ? m.sim.toFixed(3) : '0'} < ${OPTION_MATCH_THRESHOLD}). ` +
                    `Per rules, option text is NOT changed — left unchanged for expert review.`;
      log.push(base); notApplNoMatch++; continue;
    }
    if (m.opt.isCorrect) {
      base.status = 'NOT_APPLIED_ALREADY_CORRECT'; base.changeType = 'NONE';
      base.optionUpdated = m.opt.id; base.matchSim = Number(m.sim.toFixed(3));
      base.reason = `Matching option already isCorrect (sim=${m.sim.toFixed(3)}). No change needed.`;
      log.push(base); notApplAlready++; continue;
    }
    for (const o of q.options) o.isCorrect = (o.id === m.opt.id);
    base.status = 'APPLIED'; base.changeType = 'TOGGLE_IS_CORRECT';
    base.optionUpdated = m.opt.id; base.matchSim = Number(m.sim.toFixed(3));
    base.reason = `Toggled isCorrect to option matching PDF answer (sim=${m.sim.toFixed(3)}).`;
    log.push(base); applied++; p1p3Toggled++;
  }

  // ── VALIDATIONS ──────────────────────────────────────────────────────────
  const V2_COUNT = v2Questions.length;
  const v1Ids = v1Questions.map(q => q.id);
  const v2Ids = v2Questions.map(q => q.id);
  const sameOrder = v1Ids.length === v2Ids.length && v1Ids.every((id, i) => id === v2Ids[i]);
  const v1Set = new Set(v1Ids), v2Set = new Set(v2Ids);
  const newIds     = v2Ids.filter(id => !v1Set.has(id));
  const removedIds = v1Ids.filter(id => !v2Set.has(id));

  // Prove v1 + manifest untouched (we never wrote them; re-read to confirm bytes identical)
  const v1RawAfter = readFileSync(PATHS.v1, 'utf8');
  const manifestRawAfter = readFileSync(PATHS.manifest, 'utf8');
  const v1Untouched = v1RawAfter === v1RawBefore;
  const manifestUntouched = manifestRawAfter === manifestRawBefore;

  // ── WRITE OUTPUTS ─────────────────────────────────────────────────────────
  const v2Json = JSON.stringify(v2Parsed, null, 2);
  writeFileSync(PATHS.v2, v2Json, 'utf8');
  writeFileSync(PATHS.v2gz, gzipSync(Buffer.from(v2Json, 'utf8'), { level: 9 }));

  writeFileSync(PATHS.log, JSON.stringify(log, null, 2), 'utf8');

  const decisionTotals = {
    ACCEPT_PDF_ANSWER:  rows.filter(r => finalDecision(r).dec === 'ACCEPT_PDF_ANSWER').length,
    ACCEPT_PACK_ANSWER: rows.filter(r => finalDecision(r).dec === 'ACCEPT_PACK_ANSWER').length,
    NEEDS_EXPERT:       rows.filter(r => finalDecision(r).dec === 'NEEDS_EXPERT').length,
    SKIP_OR_EMPTY:      rows.filter(r => { const d = finalDecision(r).dec;
                          return d !== 'ACCEPT_PDF_ANSWER' && d !== 'ACCEPT_PACK_ANSWER' && d !== 'NEEDS_EXPERT'; }).length,
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    warning: 'questions-v1.json NOT modified. data-manifest.json NOT modified. App still uses v1.',
    source: { v1: 'public/data/questions-v1.json' },
    output: { v2: 'public/data/questions-v2.json', v2gz: 'public/data/questions-v2.json.gz' },
    totals: {
      v1Questions: V1_COUNT,
      v2Questions: V2_COUNT,
      reviewRowsProcessed: rows.length,
    },
    decisionTotals,
    applied: {
      total: applied,
      p1p3_toggledIsCorrect: p1p3Toggled,
      p2_fixedTruncatedText: p2Fixed,
    },
    notApplied: {
      keptPackAnswer: keptPack,
      ignoredNeedsExpert: ignoredExpert,
      ignoredSkipOrEmpty: ignoredSkip,
      noMatchingOption: notApplNoMatch,
      alreadyCorrect: notApplAlready,
      packIdNotFound: packNotFound,
    },
    integrity: {
      sameOrder, newIdsCount: newIds.length, removedIdsCount: removedIds.length,
      newIds, removedIds,
      duplicateOrConflictingDecisions: conflicts,
      v1Untouched, manifestUntouched,
    },
  };
  writeFileSync(PATHS.summary, JSON.stringify(summary, null, 2), 'utf8');

  // ── REPORT ─────────────────────────────────────────────────────────────────
  const ok = (b: boolean) => b ? 'PASS' : 'FAIL';
  console.log('\n' + '='.repeat(64));
  console.log('CORRECTION REPORT — questions-v2.json');
  console.log('='.repeat(64));
  console.log(`Review rows processed        : ${rows.length}`);
  console.log(`  ACCEPT_PDF_ANSWER          : ${decisionTotals.ACCEPT_PDF_ANSWER}`);
  console.log(`  ACCEPT_PACK_ANSWER         : ${decisionTotals.ACCEPT_PACK_ANSWER}`);
  console.log(`  NEEDS_EXPERT               : ${decisionTotals.NEEDS_EXPERT}`);
  console.log(`  SKIP / empty               : ${decisionTotals.SKIP_OR_EMPTY}`);
  console.log('-'.repeat(64));
  console.log(`Corrections APPLIED          : ${applied}`);
  console.log(`  P1/P3 toggled isCorrect    : ${p1p3Toggled}`);
  console.log(`  P2 fixed truncated text    : ${p2Fixed}`);
  console.log(`Kept pack (ACCEPT_PACK)      : ${keptPack}`);
  console.log(`Ignored NEEDS_EXPERT         : ${ignoredExpert}`);
  console.log(`Ignored SKIP/empty           : ${ignoredSkip}`);
  console.log(`Not applied (no match)       : ${notApplNoMatch}`);
  console.log(`Not applied (already correct): ${notApplAlready}`);
  console.log(`packId not found             : ${packNotFound}`);
  console.log('='.repeat(64));
  console.log('VALIDATIONS');
  console.log(`  [${ok(V1_COUNT === 5554)}] v1 has 5554 questions (${V1_COUNT})`);
  console.log(`  [${ok(V2_COUNT === 5554)}] v2 has 5554 questions (${V2_COUNT})`);
  console.log(`  [${ok(sameOrder)}] all v1 IDs present in v2, same order`);
  console.log(`  [${ok(newIds.length === 0)}] no new IDs created (${newIds.length})`);
  console.log(`  [${ok(removedIds.length === 0)}] no IDs removed (${removedIds.length})`);
  console.log(`  [${ok(conflicts.length === 0)}] no duplicate/conflicting decisions (${conflicts.length})`);
  console.log(`  [${ok(v1Untouched)}] questions-v1.json byte-identical (untouched)`);
  console.log(`  [${ok(manifestUntouched)}] data-manifest.json byte-identical (untouched)`);
  console.log('='.repeat(64));
  console.log('Outputs:');
  console.log('  public/data/questions-v2.json');
  console.log('  public/data/questions-v2.json.gz');
  console.log('  content-review/corrections_log.json');
  console.log('  content-review/corrections_summary.json');
  console.log('='.repeat(64));

  if (conflicts.length) {
    console.log('\nCONFLICTS:'); conflicts.forEach(c => console.log('  ' + c));
  }
}

main();
