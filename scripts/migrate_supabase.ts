import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Firebase Setup
const configPath = resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrate() {
  console.log("🚀 Starting data migration from Supabase to Firebase!");

  let count = 0;
  let page = 0;
  const pageSize = 500;
  let hasMore = true;

  while(hasMore) {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching from Supabase:", error);
      break;
    }

    if (!questions || questions.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing batch ${page + 1}: ${questions.length} questions...`);

    const batch = writeBatch(db);

    for (const q of questions) {
      // Create Firebase format for Quiz
      const quizId = `q_${q.id.replace(/-/g, '_').substring(0, 8)}`;
      let options = [];
      let explanation = { pt: q.explanation_pt || 'Sem explicação disponível.', es: q.explanation_es || '' };

      const optionsMapping = [
        { id: '1', es: q.option_a_es, pt: q.option_a_pt, letter: 'A' },
        { id: '2', es: q.option_b_es, pt: q.option_b_pt, letter: 'B' },
        { id: '3', es: q.option_c_es, pt: q.option_c_pt, letter: 'C' },
        { id: '4', es: q.option_d_es, pt: q.option_d_pt, letter: 'D' },
      ];

      for (const opt of optionsMapping) {
        if (opt.es || opt.pt) {
            options.push({
                id: `${quizId}_${opt.id}`,
                text: { es: opt.es || '', pt: opt.pt || '' },
                isCorrect: q.correct_option === opt.letter
            });
        }
      }

      const fbQuiz = {
        id: quizId,
        category: 'Geral', // Fallback
        community: 'Nacional', // Fallback, we'd map region_id ideally
        question: { es: q.question_text_es, pt: q.question_text_pt },
        options: options,
        explanation: explanation
      };

      const docRef = doc(db, 'quizzes', quizId);
      batch.set(docRef, fbQuiz);

      // We can also create a flashcard automatically based on the correct answer for Spaced Repetition!
      const correctOption = options.find(o => o.isCorrect);
      if (correctOption) {
        const fcId = `fc_${q.id.replace(/-/g, '_').substring(0, 8)}`;
        const fbFlashcard = {
            id: fcId,
            category: 'Geral',
            community: 'Nacional',
            front: { es: q.question_text_es, pt: q.question_text_pt },
            back: { 
                es: `${correctOption.text.es}\n\n${explanation.es || ''}`.trim(), 
                pt: `${correctOption.text.pt}\n\n${explanation.pt || ''}`.trim() 
            },
            level: 1
        };
        const fcRef = doc(db, 'flashcards', fcId);
        batch.set(fcRef, fbFlashcard);
      }

      count++;
    }

    try {
        await batch.commit();
        console.log(`✅ Batch ${page + 1} synchronized.`);
    } catch (e: any) {
        if(e.message && e.message.includes("Missing or insufficient permissions")) {
            console.error("\n❌ Firebase Permission Error: You MUST read the instructions. Open AI Studio to set up Security Rules properly or disable them during migration.");
            process.exit(1);
        }
        throw e;
    }

    page++;
  }

  console.log(`\n🎉 Migration Complete! Successfully migrated ${count} questions to Firebase.`);
  process.exit(0);
}

migrate().catch(console.error);
