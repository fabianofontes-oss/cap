import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));

const EXPORT_DIR = resolve(__dirname, '../data-export');
const QUIZZES_FILE = resolve(EXPORT_DIR, 'quizzes.json');
const FLASHCARDS_FILE = resolve(EXPORT_DIR, 'flashcards.json');

const ESTIMATED_READS_PER_COLLECTION = 5554;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printFileInfo(label: string, filePath: string): boolean {
  if (existsSync(filePath)) {
    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      const meta = parsed.metadata || {};
      console.log(`  ✅ ${label}: encontrado`);
      console.log(`     → ${meta.total ?? '?'} docs | coleção: ${meta.sourceCollection ?? '?'} | exportado: ${meta.exportedAt ?? 'desconhecido'}`);
    } catch {
      console.log(`  ⚠️  ${label}: arquivo existe mas não pôde ser lido como JSON válido`);
    }
    return true;
  }
  console.log(`  ❌ ${label}: não encontrado`);
  return false;
}

async function askConfirmation(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(prompt, (answer) => {
      rl.close();
      res(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function exportCollection(
  db: ReturnType<typeof getFirestore>,
  collectionName: string,
  outputPath: string,
  databaseId: string
): Promise<number> {
  console.log(`\n  📥 Lendo '${collectionName}' do Firestore...`);
  const snapshot = await getDocs(collection(db, collectionName));

  const documents: Record<string, unknown>[] = [];
  snapshot.forEach((docSnap) => {
    documents.push({ id: docSnap.id, ...docSnap.data() });
  });

  const output = {
    metadata: {
      exportedAt: new Date().toISOString(),
      total: documents.length,
      sourceCollection: collectionName,
      databaseId,
    },
    documents,
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  ✅ ${documents.length} documentos salvos → ${outputPath}`);
  return documents.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║      CAP MASTER — EXPORTAÇÃO DE CONTEÚDO FIRESTORE      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('📁 Status dos arquivos de exportação:');
  const quizzesExists    = printFileInfo('data-export/quizzes.json',    QUIZZES_FILE);
  const flashcardsExists = printFileInfo('data-export/flashcards.json', FLASHCARDS_FILE);
  console.log('');

  // Both files already exist — nothing to do
  if (quizzesExists && flashcardsExists) {
    console.log('✅ Ambos os arquivos já existem. Nenhuma leitura do Firestore é necessária.');
    console.log('\n📌 Para forçar nova exportação: delete os arquivos em data-export/ e rode novamente.');
    console.log('📌 Para rodar a auditoria offline:  npm run audit:overlap\n');
    process.exit(0);
  }

  // Build list of missing collections
  const missing: Array<{ collection: string; reads: number }> = [];
  if (!quizzesExists)    missing.push({ collection: 'quizzes',    reads: ESTIMATED_READS_PER_COLLECTION });
  if (!flashcardsExists) missing.push({ collection: 'flashcards', reads: ESTIMATED_READS_PER_COLLECTION });

  const totalEstimatedReads = missing.reduce((acc, m) => acc + m.reads, 0);

  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│             ⚠️  AVISO DE COTA DO FIRESTORE  ⚠️             │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│  Coleções a exportar:                                     │');
  missing.forEach(m => {
    const line = `│    • '${m.collection}' (~${m.reads.toLocaleString()} leituras)`;
    console.log(line.padEnd(61) + '│');
  });
  console.log('│                                                           │');
  console.log(`│  Total estimado:  ~${totalEstimatedReads.toLocaleString()} leituras`.padEnd(62) + '│');
  console.log('│  Limite free tier: 50.000 leituras/dia                   │');
  console.log('│                                                           │');
  console.log('│  ⛔ Se a cota estiver estourada ou próxima do limite,     │');
  console.log('│     cancele e aguarde o reset diário (meia-noite UTC).    │');
  console.log('│  ⛔ Esta exportação deve ser feita apenas UMA VEZ.        │');
  console.log('│     Os JSONs gerados são reutilizados em todas auditorias.│');
  console.log('└──────────────────────────────────────────────────────────┘\n');

  const confirmed = await askConfirmation('Prosseguir com a exportação? [y/N]: ');
  if (!confirmed) {
    console.log('\n❌ Exportação cancelada. Nenhuma leitura foi feita.\n');
    process.exit(0);
  }

  if (!existsSync(EXPORT_DIR)) {
    mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`\n📂 Diretório criado: ${EXPORT_DIR}`);
  }

  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  let totalReads = 0;

  if (!quizzesExists) {
    totalReads += await exportCollection(db, 'quizzes', QUIZZES_FILE, firebaseConfig.firestoreDatabaseId);
  }
  if (!flashcardsExists) {
    totalReads += await exportCollection(db, 'flashcards', FLASHCARDS_FILE, firebaseConfig.firestoreDatabaseId);
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                 EXPORTAÇÃO CONCLUÍDA                    ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Leituras consumidas nesta execução: ~${totalReads.toLocaleString()}`.padEnd(62) + '║');
  console.log(`║  Arquivos salvos em: ${EXPORT_DIR}`.padEnd(62) + '║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Próximo passo — auditoria offline (0 leituras):        ║');
  console.log('║    npm run audit:overlap                                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Erro fatal durante a exportação:', err);
  process.exit(1);
});
