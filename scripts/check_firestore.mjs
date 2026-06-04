import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(resolve(__dirname, '../firebase-applet-config.json'), 'utf8'));

const app = initializeApp(cfg);
const db = getFirestore(app, cfg.firestoreDatabaseId);

async function check() {
  console.log('Verificando banco:', cfg.firestoreDatabaseId);

  try {
    const qSnap = await getDocs(query(collection(db, 'quizzes'), limit(3)));
    console.log('\n✅ QUIZZES encontrados:', qSnap.size, '(amostra de 3)');
    qSnap.forEach(d => console.log(' -', d.id, '|', d.data().question?.pt?.slice(0, 60)));
  } catch (e) {
    console.error('❌ QUIZZES erro:', e.code, e.message);
  }

  try {
    const fSnap = await getDocs(query(collection(db, 'flashcards'), limit(3)));
    console.log('\n✅ FLASHCARDS encontrados:', fSnap.size, '(amostra de 3)');
    fSnap.forEach(d => console.log(' -', d.id, '|', d.data().front?.pt?.slice(0, 60)));
  } catch (e) {
    console.error('❌ FLASHCARDS erro:', e.code, e.message);
  }

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
