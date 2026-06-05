/**
 * audit_autoescola_pdf_vs_pack.ts
 *
 * Audits the autoescola PDF question bank against questions-v1.json (the data pack).
 *
 * PDF FORMAT (confirmed from raw_text.txt inspection):
 *   The PDF does NOT contain A/B/C/D multiple-choice options.
 *   Each entry is: "N. Question text?" followed by "Correct answer on next line(s)."
 *   The author explicitly removed option letters so answers are format-agnostic.
 *   Therefore pdfQ.answerText == correct answer text, compared against pack's isCorrect option.
 *
 * Usage:
 *   npm run audit:autoescola-pdf               # full run
 *   npm run audit:autoescola-pdf -- --preview=20  # preview first N PDF questions
 *
 * Does NOT modify any app files, Firestore, or the data pack.
 */

import { PDFParse } from 'pdf-parse';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

// ─── CLI ───────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const previewArg  = args.find(a => a.startsWith('--preview='));
const PREVIEW_N   = previewArg ? parseInt(previewArg.split('=')[1], 10) : null;
const IS_PREVIEW  = PREVIEW_N !== null && PREVIEW_N > 0;

// ─── Paths ─────────────────────────────────────────────────────────────────
const PDF_PATH   = 'C:\\Users\\julia\\Desktop\\FABIANO\\Projetos\\capdocumentos\\3500 preguntas cap.pdf';
const PACK_PATH  = resolve(ROOT, 'public/data/questions-v1.json');
const PDF_DIR    = resolve(ROOT, 'audit-results/autoescola_pdf');
const COMP_DIR   = resolve(ROOT, 'audit-results/autoescola_pdf_vs_pack');

// ─── Types ─────────────────────────────────────────────────────────────────
interface PdfQuestion {
  number:       number;
  questionText: string;
  answerText:   string;
  category?:    string;
  rawBlock:     string;
  parseStatus:  'valid' | 'no_answer' | 'invalid' | 'intro_skip';
}

interface PackQuestion {
  id:       string;
  category: string;
  question: { es: string };
  options:  { id: string; text: { es: string }; isCorrect: boolean }[];
}

type MatchStatus  = 'FOUND_EXACT' | 'FOUND_SIMILAR' | 'NOT_FOUND' | 'INVALID_PDF_QUESTION';
type AnswerStatus = 'ANSWER_MATCH' | 'ANSWER_CONFLICT' | 'NEEDS_REVIEW';

interface MatchResult {
  pdfNumber:      number;
  pdfQuestion:    string;
  pdfAnswerText?: string;
  matchStatus:    MatchStatus;
  similarity?:    number;
  packId?:        string;
  packQuestion?:  string;
  packCategory?:  string;
  answerStatus?:  AnswerStatus;
  packCorrectText?: string;
}

// ─── Text helpers ──────────────────────────────────────────────────────────
function norm(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!"'[\]]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function ensure(dir: string) { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); }

// ─── PDF Question Parser ───────────────────────────────────────────────────
/**
 * Format: numbered question followed by answer text on subsequent lines.
 *   "1. ¿Cuántos CV equivale un kW?\n1 kW = 1,36 CV."
 *   "12. El par motor se produce…\ndebido a la fuerza de expansión..."
 *   "35. La utilización adecuada de la caja de velocidades…\ndebe permitir..."
 *
 * Strategy:
 *   1. Split into blocks by question-number pattern.
 *   2. In each block, locate the end of the question (first ?, …, or : that terminates a sentence).
 *   3. Everything before → questionText; everything after → answerText.
 */
function parsePdfQuestions(rawText: string): PdfQuestion[] {
  const Q_NUM = /^(\d{1,4})\.\s+(.+)$/;
  const PAGE_SEP = /^--\s*\d+\s*of\s*\d+\s*--$/;
  const STANDALONE_NUM = /^\d{1,3}$/;

  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Collect blocks: each block is the raw lines belonging to one question number
  const blocks: Array<{ num: number; lines: string[]; category?: string }> = [];
  let currentBlock: { num: number; lines: string[]; category?: string } | null = null;
  let lastCategory: string | undefined;

  for (const line of lines) {
    const t = line.trim();

    // Skip page separators and standalone page numbers
    if (PAGE_SEP.test(t) || STANDALONE_NUM.test(t) || t === '') {
      continue;
    }

    // Detect category headers (all-caps, no digits, length > 15)
    if (/^[A-ZÁÉÍÓÚÑÜ\s.,:]{15,}$/.test(t) && !/^\d/.test(t)) {
      lastCategory = t;
      continue;
    }

    const qm = t.match(Q_NUM);
    if (qm) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { num: parseInt(qm[1], 10), lines: [qm[2]], category: lastCategory };
      continue;
    }

    if (currentBlock) {
      currentBlock.lines.push(t);
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  // ── Intro-block filter ──────────────────────────────────────────────────
  // Conservative: only skip blocks that clearly match known intro patterns.
  // Any doubt → keep the block (it will appear in NOT_FOUND, not silently dropped).
  const INTRO_PHRASES = [
    /pregunta y respuesta/i,
    /todas las respuestas son correctas/i,
    /m[aá]s de una respuesta correcta/i,
    /estudia por temas/i,
    /autoevaluaci[oó]n regular/i,
    /simulacros de examen/i,
    /haz test en la aplicaci[oó]n/i,
    /bienvenidos al camino/i,
    /prop[oó]sito de este ebook/i,
    /estructura del contenido/i,
    /c[oó]mo utilizar este ebook/i,
    /ebook.*maximizar/i,
    /ministerio de transporte/i,
  ];

  function isIntroBlock(text: string): boolean {
    const t = text.toLowerCase();
    // Must match at least one intro phrase
    if (!INTRO_PHRASES.some(re => re.test(t))) return false;
    // AND must NOT look like a real CAP question (starts with ¿ or ends with ?)
    const hasQuestionMark = /[¿?]/.test(text);
    return !hasQuestionMark;
  }

  // Parse each block: split question text from answer text
  const questions: PdfQuestion[] = [];

  for (const block of blocks) {
    const fullText = block.lines.join(' ').trim();
    const rawBlock = block.lines.join('\n');

    if (!fullText || fullText.length < 5) {
      questions.push({
        number: block.num, questionText: '', answerText: '',
        category: block.category, rawBlock, parseStatus: 'invalid'
      });
      continue;
    }

    // Filter intro/instructional blocks
    if (isIntroBlock(fullText)) {
      questions.push({
        number: block.num, questionText: fullText.substring(0, 80),
        answerText: '', category: block.category, rawBlock, parseStatus: 'intro_skip'
      });
      continue;
    }

    // Find where the question ends: last ? or … or : that precedes non-empty answer
    // We look for these sentence-ending characters in the concatenated text
    let splitIdx = -1;

    // Priority 1: last occurrence of ? in the text
    const qMarkIdx = fullText.lastIndexOf('?');
    if (qMarkIdx !== -1 && qMarkIdx < fullText.length - 1) {
      splitIdx = qMarkIdx + 1;
    }

    // Priority 2: ellipsis … (used in completion questions like "El par motor se produce…")
    if (splitIdx === -1) {
      const ellipsisIdx = fullText.indexOf('\u2026'); // …
      if (ellipsisIdx !== -1 && ellipsisIdx < fullText.length - 1) {
        splitIdx = ellipsisIdx + 1;
      }
    }

    // Priority 3: last : followed by space and lowercase (answer starts there)
    if (splitIdx === -1) {
      const colonMatch = fullText.match(/:\s+[a-záéíóúñü]/);
      if (colonMatch?.index !== undefined) {
        splitIdx = colonMatch.index + 1;
      }
    }

    let questionText: string;
    let answerText: string;

    if (splitIdx !== -1) {
      questionText = fullText.substring(0, splitIdx).trim();
      answerText   = fullText.substring(splitIdx).trim();
    } else {
      // Fallback: use raw line boundary — first line = question, rest = answer
      questionText = block.lines[0].trim();
      answerText   = block.lines.slice(1).join(' ').trim();
    }

    const status: PdfQuestion['parseStatus'] =
      !questionText ? 'invalid' :
      !answerText   ? 'no_answer' :
      'valid';

    questions.push({
      number: block.num,
      questionText,
      answerText,
      category:    block.category,
      rawBlock,
      parseStatus: status,
    });
  }

  return questions;
}

// ─── Pack index ────────────────────────────────────────────────────────────
interface PackIndex {
  exact:     Map<string, PackQuestion>;
  byWord:    Map<string, PackQuestion[]>;
  all:       PackQuestion[];
}

function buildIndex(questions: PackQuestion[]): PackIndex {
  const exact  = new Map<string, PackQuestion>();
  const byWord = new Map<string, PackQuestion[]>();

  for (const q of questions) {
    const n = norm(q.question.es);
    exact.set(n, q);
    const words = n.split(' ').filter(w => w.length > 3);
    const key   = words.slice(0, 2).join('_');
    if (key) {
      if (!byWord.has(key)) byWord.set(key, []);
      byWord.get(key)!.push(q);
    }
  }
  return { exact, byWord, all: questions };
}

function findBest(normQ: string, idx: PackIndex): { q: PackQuestion; s: number } | null {
  // Exact
  const e = idx.exact.get(normQ);
  if (e) return { q: e, s: 1.0 };

  // Candidate pool via first 2 words
  const words = normQ.split(' ').filter(w => w.length > 3);
  const key   = words.slice(0, 2).join('_');
  let pool = idx.byWord.get(key) ?? [];

  if (pool.length < 3 && words.length > 0) {
    // Try first word as prefix
    const extras: PackQuestion[] = [];
    for (const [k, qs] of idx.byWord) {
      if (k.startsWith(words[0] + '_') || k === words[0]) extras.push(...qs);
    }
    pool = [...new Set([...pool, ...extras])];
  }

  if (!pool.length) return null;

  let best: PackQuestion | null = null;
  let bestS = 0;
  for (const c of pool) {
    const s = sim(normQ, norm(c.question.es));
    if (s > bestS) { bestS = s; best = c; }
  }
  return bestS >= 0.80 && best ? { q: best, s: bestS } : null;
}

// ─── Answer comparison ─────────────────────────────────────────────────────
function compareAnswer(
  pdfAnswerText: string,
  packQ: PackQuestion
): { status: AnswerStatus; packCorrectText: string } {
  const correct = packQ.options.find(o => o.isCorrect);
  const packText = correct?.text?.es ?? '';

  if (!pdfAnswerText || !packText) return { status: 'NEEDS_REVIEW', packCorrectText: packText };

  const s = sim(norm(pdfAnswerText), norm(packText));
  if (s >= 0.80) return { status: 'ANSWER_MATCH',    packCorrectText: packText };
  if (s >= 0.55) return { status: 'NEEDS_REVIEW',    packCorrectText: packText };
  return             { status: 'ANSWER_CONFLICT', packCorrectText: packText };
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  ensure(PDF_DIR);
  ensure(COMP_DIR);

  const t0    = Date.now();
  const label = IS_PREVIEW ? `[PREVIEW first ${PREVIEW_N}]` : '[FULL RUN]';
  console.log(`\n=== Autoescola PDF vs Pack Audit ${label} ===\n`);

  // 1. Extract text ──────────────────────────────────────────────────────────
  console.log(`Reading PDF: ${PDF_PATH}`);
  if (!existsSync(PDF_PATH)) { console.error('PDF not found'); process.exit(1); }

  const buf = readFileSync(PDF_PATH);
  console.log(`PDF loaded: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

  let rawText = '';
  const parser = new PDFParse({ data: buf });
  try {
    const res = await parser.getText();
    rawText = res.text ?? '';
    console.log(`Text extracted: ${rawText.length.toLocaleString()} chars`);
  } catch (e) {
    console.error('pdf-parse error:', e);
    process.exit(1);
  } finally {
    await parser.destroy();
  }

  if (rawText.trim().length < 100) {
    console.error('ERROR: Text too short — PDF may be image-only (needs OCR).');
  }

  writeFileSync(resolve(PDF_DIR, 'raw_text.txt'), rawText, 'utf8');
  console.log(`raw_text.txt saved`);

  // 2. Parse questions ───────────────────────────────────────────────────────
  console.log('\nParsing questions...');
  const allParsed = parsePdfQuestions(rawText);
  console.log(`Blocks found: ${allParsed.length}`);

  const slice = IS_PREVIEW ? allParsed.slice(0, PREVIEW_N!) : allParsed;

  const introSkipped = slice.filter(q => q.parseStatus === 'intro_skip').length;
  const withAnswer    = slice.filter(q => q.parseStatus === 'valid').length;
  const noAnswer      = slice.filter(q => q.parseStatus === 'no_answer').length;
  const invalid       = slice.filter(q => q.parseStatus === 'invalid').length;
  const toCompare     = slice.filter(q => q.parseStatus === 'valid' || q.parseStatus === 'no_answer');

  const parseSummary = {
    generatedAt:       new Date().toISOString(),
    isPreview:         IS_PREVIEW,
    previewN:          IS_PREVIEW ? PREVIEW_N : null,
    totalBlocksInPDF:  allParsed.length,
    inThisRun:         slice.length,
    introSkipped,
    realQuestions:     toCompare.length,
    valid:             withAnswer,
    noAnswer,
    invalid,
    first10:           slice.slice(0, 10),
  };

  writeFileSync(resolve(PDF_DIR, 'parsed_questions.json'), JSON.stringify(slice, null, 2), 'utf8');
  writeFileSync(resolve(PDF_DIR, 'parse_summary.json'),    JSON.stringify(parseSummary, null, 2), 'utf8');

  console.log(`  total blocks: ${slice.length}  |  intro_skip: ${introSkipped}  |  real questions: ${toCompare.length}`);
  console.log(`  valid(Q+A): ${withAnswer}  |  no_answer: ${noAnswer}  |  invalid: ${invalid}`);

  if (!toCompare.length) { console.error('No questions to compare.'); process.exit(1); }

  // 3. Load pack ─────────────────────────────────────────────────────────────
  console.log(`\nLoading pack: ${PACK_PATH}`);
  const packFile: { questions: PackQuestion[] } = JSON.parse(readFileSync(PACK_PATH, 'utf8'));
  const packQs = packFile.questions;
  console.log(`Pack: ${packQs.length} questions`);
  const idx = buildIndex(packQs);

  // 4. Compare ───────────────────────────────────────────────────────────────
  console.log(`\nComparing ${toCompare.length} real questions against ${packQs.length} pack entries...`);
  const results: MatchResult[] = [];

  for (const pdfQ of toCompare) {
    if (pdfQ.parseStatus === 'invalid') {
      results.push({ pdfNumber: pdfQ.number, pdfQuestion: pdfQ.questionText, matchStatus: 'INVALID_PDF_QUESTION' });
      continue;
    }

    const normQ  = norm(pdfQ.questionText);
    const found  = findBest(normQ, idx);

    if (!found) {
      results.push({
        pdfNumber:    pdfQ.number,
        pdfQuestion:  pdfQ.questionText,
        pdfAnswerText: pdfQ.answerText,
        matchStatus:  'NOT_FOUND',
      });
      continue;
    }

    const { q: packQ, s } = found;
    const matchStatus: MatchStatus = s >= 0.999 ? 'FOUND_EXACT' : 'FOUND_SIMILAR';
    const { status: answerStatus, packCorrectText } = compareAnswer(pdfQ.answerText, packQ);

    results.push({
      pdfNumber:      pdfQ.number,
      pdfQuestion:    pdfQ.questionText,
      pdfAnswerText:  pdfQ.answerText,
      matchStatus,
      similarity:     parseFloat(s.toFixed(4)),
      packId:         packQ.id,
      packQuestion:   packQ.question.es,
      packCategory:   packQ.category,
      answerStatus,
      packCorrectText,
    });
  }

  // 5. Bucket & write reports ────────────────────────────────────────────────
  const exact        = results.filter(r => r.matchStatus === 'FOUND_EXACT');
  const similar      = results.filter(r => r.matchStatus === 'FOUND_SIMILAR');
  const notFound     = results.filter(r => r.matchStatus === 'NOT_FOUND');
  const invalidQ     = results.filter(r => r.matchStatus === 'INVALID_PDF_QUESTION');
  const ansMatch     = results.filter(r => r.answerStatus === 'ANSWER_MATCH');
  const ansConflict  = results.filter(r => r.answerStatus === 'ANSWER_CONFLICT');
  const ansReview    = results.filter(r => r.answerStatus === 'NEEDS_REVIEW');

  const matched   = exact.length + similar.length;
  const denom     = toCompare.length - invalidQ.length;
  const matchRate = denom ? `${((matched / denom) * 100).toFixed(1)}%` : 'N/A';

  const summary = {
    generatedAt:       new Date().toISOString(),
    isPreview:         IS_PREVIEW,
    previewN:          IS_PREVIEW ? PREVIEW_N : null,
    pdfTotalBlocks:    allParsed.length,
    pdfIntroSkipped:   introSkipped,
    pdfRealQuestions:  toCompare.length,
    packTotal:         packQs.length,
    match: { FOUND_EXACT: exact.length, FOUND_SIMILAR: similar.length, NOT_FOUND: notFound.length, INVALID: invalidQ.length, matchRate },
    answer: { ANSWER_MATCH: ansMatch.length, ANSWER_CONFLICT: ansConflict.length, NEEDS_REVIEW: ansReview.length },
    elapsedMs: Date.now() - t0,
  };

  writeFileSync(resolve(COMP_DIR, 'audit_summary.json'),          JSON.stringify(summary,     null, 2), 'utf8');
  writeFileSync(resolve(COMP_DIR, 'exact_matches.json'),           JSON.stringify(exact,       null, 2), 'utf8');
  writeFileSync(resolve(COMP_DIR, 'similar_matches_review.json'),  JSON.stringify(similar,     null, 2), 'utf8');
  writeFileSync(resolve(COMP_DIR, 'not_found.json'),               JSON.stringify(notFound,    null, 2), 'utf8');
  writeFileSync(resolve(COMP_DIR, 'answer_matches.json'),          JSON.stringify(ansMatch,    null, 2), 'utf8');
  writeFileSync(resolve(COMP_DIR, 'answer_conflicts.json'),        JSON.stringify(ansConflict, null, 2), 'utf8');
  writeFileSync(resolve(COMP_DIR, 'invalid_pdf_questions.json'),   JSON.stringify(invalidQ,    null, 2), 'utf8');

  writeCSV(resolve(COMP_DIR, 'similar_matches_review.csv'), similar.map(r => ({
    pdfNumber: r.pdfNumber, pdfQuestion: r.pdfQuestion, similarity: r.similarity,
    packId: r.packId, packQuestion: r.packQuestion, packCategory: r.packCategory,
    answerStatus: r.answerStatus, pdfAnswer: r.pdfAnswerText, packCorrect: r.packCorrectText,
  })));
  writeCSV(resolve(COMP_DIR, 'not_found.csv'), notFound.map(r => ({
    pdfNumber: r.pdfNumber, pdfQuestion: r.pdfQuestion, pdfAnswer: r.pdfAnswerText,
  })));
  writeCSV(resolve(COMP_DIR, 'answer_conflicts.csv'), ansConflict.map(r => ({
    pdfNumber: r.pdfNumber, pdfQuestion: r.pdfQuestion,
    pdfAnswer: r.pdfAnswerText, packId: r.packId,
    packQuestion: r.packQuestion, packCorrect: r.packCorrectText, similarity: r.similarity,
  })));

  // 6. Console output ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`AUDIT SUMMARY ${label}`);
  console.log('='.repeat(60));
  console.log(`PDF total blocks        : ${allParsed.length}`);
  console.log(`PDF intro skipped       : ${introSkipped}`);
  console.log(`PDF real questions      : ${toCompare.length}`);
  console.log(`Pack questions          : ${packQs.length}`);
  console.log('');
  console.log(`FOUND_EXACT             : ${exact.length}`);
  console.log(`FOUND_SIMILAR           : ${similar.length}`);
  console.log(`NOT_FOUND               : ${notFound.length}`);
  console.log(`INVALID_PDF_QUESTION    : ${invalidQ.length}`);
  console.log(`Match rate              : ${matchRate}`);
  console.log('');
  console.log(`ANSWER_MATCH            : ${ansMatch.length}`);
  console.log(`ANSWER_CONFLICT         : ${ansConflict.length}`);
  console.log(`NEEDS_REVIEW            : ${ansReview.length}`);
  console.log('');

  // Always show sample output (10 NOT_FOUND, conflicts, similars)
  if (notFound.length) {
    console.log(`\n--- NOT_FOUND examples (first 10 of ${notFound.length}) ---`);
    notFound.slice(0, 10).forEach(r => {
      console.log(`  [${r.pdfNumber}] Q: "${r.pdfQuestion.substring(0, 90)}"`);
      console.log(`         A: "${(r.pdfAnswerText ?? '').substring(0, 70)}"`);
    });
  }

  if (ansConflict.length) {
    console.log(`\n--- ANSWER_CONFLICT examples (first 10 of ${ansConflict.length}) ---`);
    ansConflict.slice(0, 10).forEach(r => {
      console.log(`  [${r.pdfNumber}] "${r.pdfQuestion.substring(0, 70)}"`);
      console.log(`         PDF answer : "${(r.pdfAnswerText ?? '').substring(0, 70)}"`);
      console.log(`         Pack answer: "${(r.packCorrectText ?? '').substring(0, 70)}"`);
    });
  }

  if (IS_PREVIEW && similar.length) {
    console.log(`\n--- FOUND_SIMILAR examples ---`);
    similar.slice(0, 3).forEach(r => {
      console.log(`  [${r.pdfNumber}] sim=${r.similarity}  "${r.pdfQuestion.substring(0, 60)}"`);
      console.log(`           Pack: "${(r.packQuestion ?? '').substring(0, 60)}"`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`Reports: audit-results/autoescola_pdf/  and  audit-results/autoescola_pdf_vs_pack/`);
  if (IS_PREVIEW) console.log('\n⚠  PREVIEW run only. Approve before running full audit.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
