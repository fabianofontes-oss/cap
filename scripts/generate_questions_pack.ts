/**
 * generate_questions_pack.ts
 *
 * Generates the static versioned data pack from local export.
 * ZERO Firestore reads — source is data-export/quizzes.json only.
 *
 * Input:
 *   data-export/quizzes.json
 *
 * Output:
 *   public/data/questions-v1.json
 *   public/data/questions-v1.json.gz
 *   public/data/data-manifest.json
 *   public/data/flashcard-id-map-v1.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const PACK_VERSION  = '1.0.0';
const SOURCE_FILE   = resolve(__dirname, '../data-export/quizzes.json');
const OUTPUT_DIR    = resolve(__dirname, '../public/data');
const JSON_FILE     = resolve(OUTPUT_DIR, 'questions-v1.json');
const GZ_FILE       = resolve(OUTPUT_DIR, 'questions-v1.json.gz');
const MANIFEST_FILE = resolve(OUTPUT_DIR, 'data-manifest.json');
const ID_MAP_FILE   = resolve(OUTPUT_DIR, 'flashcard-id-map-v1.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function run(): void {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║      CAP MASTER — GERAÇÃO DO DATA PACK DE QUESTIONS     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log('🔒 Modo offline — zero leituras do Firestore.\n');

  // ── Load source ──────────────────────────────────────────────────────────

  if (!existsSync(SOURCE_FILE)) {
    console.error(`❌ Arquivo de entrada não encontrado: ${SOURCE_FILE}`);
    console.error('   Execute primeiro: npm run export:content\n');
    process.exit(1);
  }

  console.log(`📂 Carregando fonte: data-export/quizzes.json`);
  const raw = readFileSync(SOURCE_FILE, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.documents)) {
    console.error('❌ Campo "documents" não encontrado ou não é um array no arquivo de entrada.\n');
    process.exit(1);
  }

  const sourceMeta = parsed.metadata || {};
  const rawDocs: any[] = parsed.documents;

  console.log(`  ✅ ${rawDocs.length} documentos carregados`);
  console.log(`     Exportado em: ${sourceMeta.exportedAt ?? 'desconhecido'}\n`);

  // ── Build questions array ────────────────────────────────────────────────
  // Keep all fields from the quiz document as-is.
  // Only strip the redundant top-level `id` duplication if doc.id === doc field,
  // but in practice keep everything: id, category, community, question, options, explanation.

  const questions = rawDocs.map((doc: any) => {
    const { id, category, community, question, options, explanation } = doc;
    // Strip undefined/null fields to keep pack lean
    const q: Record<string, unknown> = { id, category };
    if (community !== undefined && community !== null) q.community = community;
    if (question   !== undefined && question   !== null) q.question   = question;
    if (options    !== undefined && options    !== null) q.options    = options;
    if (explanation !== undefined && explanation !== null) q.explanation = explanation;
    return q;
  });

  // ── Category list ────────────────────────────────────────────────────────

  const categorySet = new Set<string>();
  questions.forEach((q: any) => {
    if (q.category) categorySet.add(q.category);
  });
  const categories = [...categorySet].sort();

  // ── Build pack JSON ──────────────────────────────────────────────────────

  const pack = {
    version:     PACK_VERSION,
    generatedAt: new Date().toISOString(),
    counts: {
      questions: questions.length,
    },
    questions,
  };

  const packJson   = JSON.stringify(pack);
  const packBuffer = Buffer.from(packJson, 'utf8');

  // ── Gzip ─────────────────────────────────────────────────────────────────

  const gzBuffer = gzipSync(packBuffer, { level: 9 });

  // ── Hashes & sizes ───────────────────────────────────────────────────────

  const jsonSha256 = sha256hex(packBuffer);
  const gzSha256   = sha256hex(gzBuffer);
  const jsonBytes  = packBuffer.byteLength;
  const gzBytes    = gzBuffer.byteLength;

  // ── Manifest ─────────────────────────────────────────────────────────────

  const manifest = {
    version:        PACK_VERSION,
    generatedAt:    new Date().toISOString(),
    totalQuestions: questions.length,
    categories,
    files: {
      json: {
        path:      '/data/questions-v1.json',
        sha256:    jsonSha256,
        sizeBytes: jsonBytes,
      },
      gz: {
        path:      '/data/questions-v1.json.gz',
        sha256:    gzSha256,
        sizeBytes: gzBytes,
      },
    },
  };

  // ── Flashcard ID map ──────────────────────────────────────────────────────

  const idMap = {
    version:     PACK_VERSION,
    generatedAt: new Date().toISOString(),
    description: 'Rule to convert legacy flashcard IDs (fc_ prefix) to question IDs (q_ prefix). ' +
                 'Apply to: favoriteCardIds, difficultCardIds, cardProgress keys.',
    rule:          'fc_XXXXXXXX -> q_XXXXXXXX',
    mappingType:   'prefix_replace',
    fromPrefix:    'fc_',
    toPrefix:      'q_',
    auditConfirmed: {
      totalFlashcardsAudited: 5554,
      totalQuizzesAudited:    5554,
      overlapRatePercent:     100,
      uniqueFlashcards:       0,
      auditDate:              '2026-06-05',
    },
  };

  // ── Write files ───────────────────────────────────────────────────────────

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📂 Diretório criado: ${OUTPUT_DIR}\n`);
  }

  console.log('📦 Escrevendo arquivos em public/data/\n');

  writeFileSync(JSON_FILE,     packJson,  'utf8');
  console.log(`  ✅ questions-v1.json       ${formatBytes(jsonBytes).padStart(10)}   sha256: ${jsonSha256.slice(0, 16)}...`);

  writeFileSync(GZ_FILE,      gzBuffer);
  console.log(`  ✅ questions-v1.json.gz    ${formatBytes(gzBytes).padStart(10)}   sha256: ${gzSha256.slice(0, 16)}...`);

  writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  const manifestBytes = statSync(MANIFEST_FILE).size;
  console.log(`  ✅ data-manifest.json      ${formatBytes(manifestBytes).padStart(10)}`);

  writeFileSync(ID_MAP_FILE, JSON.stringify(idMap, null, 2), 'utf8');
  const idMapBytes = statSync(ID_MAP_FILE).size;
  console.log(`  ✅ flashcard-id-map-v1.json ${formatBytes(idMapBytes).padStart(10)}`);

  // ── Summary ───────────────────────────────────────────────────────────────

  const compressionRatio = ((1 - gzBytes / jsonBytes) * 100).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                  DATA PACK GERADO                      ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Total de questions:   ${String(questions.length).padEnd(34)}║`);
  console.log(`║  JSON bruto:           ${formatBytes(jsonBytes).padEnd(34)}║`);
  console.log(`║  Gzip (nível 9):       ${formatBytes(gzBytes).padEnd(34)}║`);
  console.log(`║  Compressão:           ${(compressionRatio + '%').padEnd(34)}║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Categorias (${categories.length}):`.padEnd(62) + '║');
  categories.forEach(cat => {
    console.log(`║    • ${cat}`.padEnd(62) + '║');
  });
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Fonte:   data-export/quizzes.json (local)              ║');
  console.log('║  Firestore lido:   NÃO                                  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Próximo passo:                                         ║');
  console.log('║    Adaptar app para carregar via IndexedDB              ║');
  console.log('║    (não alterar app ainda até decisão de migração)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

run();
