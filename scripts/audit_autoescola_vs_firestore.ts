import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase configuration
const configPath = resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Text Normalization Logic as specified in USER_REQUEST:
// - convert to lowercase;
// - remove accents;
// - remove punctuation;
// - remove signs ¿ and ?;
// - remove duplicate spaces;
// - remove line breaks;
// - remove leading/trailing spaces.
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // removes accents
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()¿?¡!"']/g, "") // removes punctuation and Spanish signs ¿ ? ¡ !
    .replace(/\r?\n|\r/g, " ") // removes line breaks
    .replace(/\s+/g, " ") // removes duplicate spaces
    .trim();
}

// Levenshtein Similarity calculation
function editDistance(s1: string, s2: string): number {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function stringSimilarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

// CSV escaping logic
function escapeCSV(val: any): string {
  if (val === undefined || val === null) return '""';
  let str = '';
  if (Array.isArray(val)) {
    str = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('; ');
  } else if (typeof val === 'object') {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

interface AutoescolaQuestion {
  id: string;
  question_es: string;
  correct_answer_es: string;
  category_hint?: string;
}

async function runAudit() {
  const args = process.argv.slice(2);
  const isFull = args.includes('--full');
  const customFilePathArg = args.find(arg => arg.startsWith('--file='));
  const inputFilePath = customFilePathArg 
    ? resolve(process.cwd(), customFilePathArg.split('=')[1])
    : resolve(__dirname, 'autoescola_test_questions.txt');

  console.log("==================================================");
  console.log("🚦 CAP MASTER - SCRIPT DE AUDITORIA DE QUESTÕES");
  console.log("==================================================");
  console.log(`📡 Modo de execução: ${isFull ? '🔥 COMPLETA' : '🔍 PRÉVIA (Limite de 20 perguntas)'}`);
  console.log(`📁 Lendo base autoescola de: ${inputFilePath}`);
  console.log("==================================================\n");

  // 1. Fetch all Firestore questions from quizzes (safe, read-only)
  console.log("📥 Buscando perguntas atuais da coleção 'quizzes' no Firestore...");
  const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
  const firestoreQuizzes = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  console.log(`✅ ${firestoreQuizzes.length} perguntas carregadas do Firestore.`);

  // Parse Autoescola File
  console.log("📖 Lendo e convertendo arquivo de perguntas da autoescola...");
  let fileContent = '';
  try {
    fileContent = readFileSync(inputFilePath, 'utf8');
  } catch (e: any) {
    console.error(`❌ Erro ao abrir arquivo autoescola: ${e.message}`);
    process.exit(1);
  }

  const lines = fileContent.split(/\r?\n/);
  const autoescolaQuestions: AutoescolaQuestion[] = [];
  let currentObjQuestion: AutoescolaQuestion | null = null;
  let currentCategory = 'Geral';

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Detect Category headers optionally
    if (trimmedLine.toLowerCase().startsWith('objetivo')) {
      currentCategory = trimmedLine;
      continue;
    }

    // Question start pattern match like "1. ¿..." or "152. El..."
    const questionMatch = trimmedLine.match(/^(\d+)\.\s*(.*)$/);
    if (questionMatch) {
      if (currentObjQuestion) {
        autoescolaQuestions.push(currentObjQuestion);
      }
      currentObjQuestion = {
        id: `auto_q_${questionMatch[1]}`,
        question_es: questionMatch[2].trim(),
        correct_answer_es: '',
        category_hint: currentCategory
      };
    } else {
      if (currentObjQuestion) {
        if (currentObjQuestion.correct_answer_es) {
          currentObjQuestion.correct_answer_es += ' ' + trimmedLine;
        } else {
          currentObjQuestion.correct_answer_es = trimmedLine;
        }
      }
    }
  }
  if (currentObjQuestion) {
    autoescolaQuestions.push(currentObjQuestion);
  }

  console.log(`✅ ${autoescolaQuestions.length} perguntas identificadas na base da autoescola.`);

  // Select dataset limits (Default is 20 preview questions for safety and inspection)
  const questionsToAudit = isFull ? autoescolaQuestions : autoescolaQuestions.slice(0, 20);
  console.log(`⚙️  Processando auditoria física para ${questionsToAudit.length} perguntas...`);

  // Build key-lookup map for Firestore questions using normalized questions
  const firestoreExactMap = new Map<string, any>();
  firestoreQuizzes.forEach(fq => {
    if (fq.question && fq.question.es) {
      const normText = normalizeText(fq.question.es);
      firestoreExactMap.set(normText, fq);
    }
  });

  // Results Containers
  const exactMatches: any[] = [];
  const answerMatches: any[] = [];
  const answerConflicts: any[] = [];
  const similarMatchesReview: any[] = [];
  const notFoundList: any[] = [];
  const invalidList: any[] = [];

  // Summary tallies
  let countFoundExact = 0;
  let countFoundSimilar = 0;
  let countNotFound = 0;
  let countAnswerMatch = 0;
  let countAnswerConflict = 0;
  let countNeedsReview = 0;
  let countInvalid = 0;

  for (const aq of questionsToAudit) {
    const normAqQuestion = normalizeText(aq.question_es);
    const normAqAnswer = normalizeText(aq.correct_answer_es);

    // Initial integrity check
    if (!normAqQuestion || !normAqAnswer) {
      countInvalid++;
      invalidList.push({
        id: aq.id,
        pergunta: aq.question_es,
        resposta: aq.correct_answer_es,
        motivo: "Questão incompleta (sem texto ou sem resposta correcta)"
      });
      continue;
    }

    // 1. Check EXACT match
    if (firestoreExactMap.has(normAqQuestion)) {
      countFoundExact++;
      const fqMatch = firestoreExactMap.get(normAqQuestion);
      
      // Get correct option from Firestore options array
      const firestoreCorrectOption = fqMatch.options?.find((opt: any) => opt.isCorrect === true);
      const fsCorrectAnsweres = firestoreCorrectOption?.text?.es || '';
      const normFsAnswer = normalizeText(fsCorrectAnsweres);

      exactMatches.push({
        autoescola: aq,
        firestoreMatch: {
          id: fqMatch.id,
          question: fqMatch.question,
          correct_option: fsCorrectAnsweres,
          category: fqMatch.category
        }
      });

      if (normAqAnswer === normFsAnswer) {
        countAnswerMatch++;
        answerMatches.push({
          auto_id: aq.id,
          pergunta_es: aq.question_es,
          resposta_es: aq.correct_answer_es,
          firestore_id: fqMatch.id,
          firestore_pergunta_es: fqMatch.question?.es,
          firestore_resposta_es: fsCorrectAnsweres,
          match_type: "ANSWER_MATCH"
        });
      } else {
        countAnswerConflict++;
        answerConflicts.push({
          auto_id: aq.id,
          pergunta_es: aq.question_es,
          alternativas_autoescola: [aq.correct_answer_es],
          resposta_correta_autoescola: aq.correct_answer_es,
          firestore_id: fqMatch.id,
          firestore_pergunta_es: fqMatch.question?.es,
          alternativas_firestore: fqMatch.options?.map((o: any) => o.text?.es) || [],
          resposta_correta_firestore: fsCorrectAnsweres,
          category: fqMatch.category || 'Não definida',
          similarity: 1.0,
          conflict_reason: "O texto da resposta correta no Firestore difere do texto correto na autoescola"
        });
      }
    } else {
      // 2. No exact match. Scan similarity Levenshtein above 0.8
      let bestSimilarity = 0;
      let bestFqMatch: any = null;

      for (const fq of firestoreQuizzes) {
        if (!fq.question || !fq.question.es) continue;
        const normFs = normalizeText(fq.question.es);
        const sim = stringSimilarity(normAqQuestion, normFs);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestFqMatch = fq;
        }
      }

      if (bestFqMatch && bestSimilarity >= 0.8) {
        countFoundSimilar++;
        const firestoreCorrectOption = bestFqMatch.options?.find((opt: any) => opt.isCorrect === true);
        const fsCorrectAnsweres = firestoreCorrectOption?.text?.es || '';

        // If very similar (>95%), we might check if answer matches
        if (bestSimilarity >= 0.95) {
          const normFsAnswer = normalizeText(fsCorrectAnsweres);
          if (normAqAnswer === normFsAnswer) {
             countAnswerMatch++;
             answerMatches.push({
               auto_id: aq.id,
               pergunta_es: aq.question_es,
               resposta_es: aq.correct_answer_es,
               firestore_id: bestFqMatch.id,
               firestore_pergunta_es: bestFqMatch.question?.es,
               firestore_resposta_es: fsCorrectAnsweres,
               match_type: "SIMILAR_ANSWER_MATCH",
               similarity: bestSimilarity
             });
          } else {
             countAnswerConflict++;
             answerConflicts.push({
               auto_id: aq.id,
               pergunta_es: aq.question_es,
               alternativas_autoescola: [aq.correct_answer_es],
               resposta_correta_autoescola: aq.correct_answer_es,
               firestore_id: bestFqMatch.id,
               firestore_pergunta_es: bestFqMatch.question?.es,
               alternativas_firestore: bestFqMatch.options?.map((o: any) => o.text?.es) || [],
               resposta_correta_firestore: fsCorrectAnsweres,
               category: bestFqMatch.category || 'Não definida',
               similarity: bestSimilarity,
               conflict_reason: "Texto de pergunta muito similar, mas respostas corretas divergem"
             });
          }
        } else {
          // 80% to 95%: flag as Needs Review to prevent over-automation
          countNeedsReview++;
          similarMatchesReview.push({
            auto_id: aq.id,
            pergunta_es: aq.question_es,
            resposta_correta_autoescola: aq.correct_answer_es,
            firestore_id: bestFqMatch.id,
            firestore_pergunta_es: bestFqMatch.question?.es,
            resposta_correta_firestore: fsCorrectAnsweres,
            category: bestFqMatch.category || 'Não definida',
            similarity: bestSimilarity,
            review_notes: "Similaridade de pergunta robusta, mas necessita de confirmação manual humana"
          });
        }
      } else {
        // 3. Match below 80%: Not found
        countNotFound++;
        notFoundList.push({
          auto_id: aq.id,
          pergunta_es: aq.question_es,
          resposta_es: aq.correct_answer_es,
          category_hint: aq.category_hint
        });
      }
    }
  }

  // Create audit directory
  const resultsDir = resolve(__dirname, '../audit-results');
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  // Construct Summary JSON representation
  const auditSummary = {
    total_autoescola: questionsToAudit.length,
    total_firestore: firestoreQuizzes.length,
    found_exact: countFoundExact,
    found_similar: countFoundSimilar,
    not_found: countNotFound,
    answer_match: countAnswerMatch,
    answer_conflict: countAnswerConflict,
    needs_review: countNeedsReview,
    invalid_autoescola: countInvalid
  };

  // Write JSON reports
  writeFileSync(join(resultsDir, 'audit_summary.json'), JSON.stringify(auditSummary, null, 2));
  writeFileSync(join(resultsDir, 'exact_matches.json'), JSON.stringify(exactMatches, null, 2));
  writeFileSync(join(resultsDir, 'answer_matches.json'), JSON.stringify(answerMatches, null, 2));
  writeFileSync(join(resultsDir, 'answer_conflicts.json'), JSON.stringify(answerConflicts, null, 2));
  writeFileSync(join(resultsDir, 'similar_matches_review.json'), JSON.stringify(similarMatchesReview, null, 2));
  writeFileSync(join(resultsDir, 'not_found.json'), JSON.stringify(notFoundList, null, 2));
  writeFileSync(join(resultsDir, 'invalid_autoescola_questions.json'), JSON.stringify(invalidList, null, 2));

  // Write CSV helper files
  // 1. Answer Conflicts CSV
  const csvHeadersConflicts = [
    "auto_id", "pergunta_es", "resposta_correta_autoescola", 
    "firestore_id", "firestore_pergunta_es", "resposta_correta_firestore", 
    "category", "similarity", "conflict_reason"
  ];
  let csvContentConflicts = csvHeadersConflicts.join(",") + "\n";
  answerConflicts.forEach(item => {
    csvContentConflicts += [
      escapeCSV(item.auto_id),
      escapeCSV(item.pergunta_es),
      escapeCSV(item.resposta_correta_autoescola),
      escapeCSV(item.firestore_id),
      escapeCSV(item.firestore_pergunta_es),
      escapeCSV(item.resposta_correta_firestore),
      escapeCSV(item.category),
      escapeCSV(item.similarity),
      escapeCSV(item.conflict_reason)
    ].join(",") + "\n";
  });
  writeFileSync(join(resultsDir, 'answer_conflicts.csv'), csvContentConflicts);

  // 2. Similar Matches Review CSV
  const csvHeadersReview = [
    "auto_id", "pergunta_es", "resposta_correta_autoescola",
    "firestore_id", "firestore_pergunta_es", "resposta_correta_firestore",
    "category", "similarity", "review_notes"
  ];
  let csvContentReview = csvHeadersReview.join(",") + "\n";
  similarMatchesReview.forEach(item => {
    csvContentReview += [
      escapeCSV(item.auto_id),
      escapeCSV(item.pergunta_es),
      escapeCSV(item.resposta_correta_autoescola),
      escapeCSV(item.firestore_id),
      escapeCSV(item.firestore_pergunta_es),
      escapeCSV(item.resposta_correta_firestore),
      escapeCSV(item.category),
      escapeCSV(item.similarity),
      escapeCSV(item.review_notes)
    ].join(",") + "\n";
  });
  writeFileSync(join(resultsDir, 'similar_matches_review.csv'), csvContentReview);

  // 3. Not Found CSV
  const csvHeadersNotFound = ["auto_id", "pergunta_es", "resposta_correta_es", "category_hint"];
  let csvContentNotFound = csvHeadersNotFound.join(",") + "\n";
  notFoundList.forEach(item => {
    csvContentNotFound += [
      escapeCSV(item.auto_id),
      escapeCSV(item.pergunta_es),
      escapeCSV(item.resposta_es),
      escapeCSV(item.category_hint)
    ].join(",") + "\n";
  });
  writeFileSync(join(resultsDir, 'not_found.csv'), csvContentNotFound);

  // OUTPUT SUMMATION TERMINAL LOG
  console.log("\n==================================================");
  console.log("🏆 AUDITORIA CONCLUÍDA");
  console.log("==================================================");
  console.log(`Total autoescola:             ${auditSummary.total_autoescola}`);
  console.log(`Total Firestore:              ${auditSummary.total_firestore}`);
  console.log(`Encontradas exatas:           ${auditSummary.found_exact}`);
  console.log(`Encontradas parecidas:        ${auditSummary.found_similar}`);
  console.log(`Não encontradas:              ${auditSummary.not_found}`);
  console.log(`Respostas iguais:             ${auditSummary.answer_match}`);
  console.log(`Conflitos de resposta:        ${auditSummary.answer_conflict}`);
  console.log(`Inválidas:                    ${auditSummary.invalid_autoescola}`);
  console.log("==================================================");
  console.log(`🚀 Arquivos gerados com êxito em: audit-results/`);
  console.log("==================================================\n");

  if (!isFull) {
    console.log("💡 Nota de Segurança: Para rodar a auditoria completa de todas as 3500 perguntas (ou do arquivo que você subir), basta rodar:");
    console.log("   --> npx tsx scripts/audit_autoescola_vs_firestore.ts --full");
    console.log("   Você também pode especificar um arquivo customizado:");
    console.log("   --> npx tsx scripts/audit_autoescola_vs_firestore.ts --full --file=seu_arquivo.txt\n");
  }

  process.exit(0);
}

runAudit().catch(err => {
  console.error("❌ Ocorreu um erro catastrófico na execução:", err);
  process.exit(1);
});
