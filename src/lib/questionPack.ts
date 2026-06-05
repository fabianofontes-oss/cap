/**
 * questionPack.ts
 *
 * Loads the static versioned questions pack.
 * Source: /data/data-manifest.json + /data/questions-v1.json.gz (or .json)
 * Storage: IndexedDB — no Firestore reads for global content.
 *
 * Flow:
 *   1. Fetch manifest (version check). If offline, skip to step 4.
 *   2. If IndexedDB version matches manifest → return from IndexedDB.
 *   3. Download pack (gzip first, plain JSON fallback), save to IndexedDB.
 *   4. If offline + IndexedDB has data → return stored pack.
 *   5. If offline + no stored pack → throw with user-facing message.
 */

import { QuizQuestion } from '../types';

const DB_NAME    = 'cap-master-db';
const DB_VERSION = 1;
const STORE_NAME = 'question-pack';
const PACK_KEY   = 'current';

// In-memory cache: avoids repeated IndexedDB reads within the same session
// (e.g. fetchGlobalQuizzes and fetchGlobalFlashcards both call loadQuestionPack)
let _memoryCache: { version: string; questions: QuizQuestion[] } | null = null;

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

interface PackRecord {
  key: string;
  version: string;
  generatedAt: string;
  questions: QuizQuestion[];
  sha256: string;
  savedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = () => reject(req.error);
  });
}

function getPackFromDB(db: IDBDatabase): Promise<PackRecord | null> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(PACK_KEY);
    req.onsuccess = () => resolve((req.result as PackRecord) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

function savePackToDB(db: IDBDatabase, record: PackRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(record);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

interface PackManifest {
  version: string;
  generatedAt: string;
  totalQuestions: number;
  files: {
    json: { path: string; sha256: string; sizeBytes: number };
    gz:   { path: string; sha256: string; sizeBytes: number };
  };
}

async function fetchManifest(): Promise<PackManifest | null> {
  try {
    const res = await fetch('/data/data-manifest.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    return (await res.json()) as PackManifest;
  } catch {
    return null;
  }
}

async function bufferToSha256(buffer: ArrayBuffer): Promise<string> {
  try {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

/** Returns true if the buffer starts with gzip magic bytes (0x1F 0x8B). */
function isGzipBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

async function decompressGzip(buffer: ArrayBuffer): Promise<string> {
  const DS = (globalThis as any).DecompressionStream;
  const ds = new DS('gzip');
  const stream = new Response(new Blob([buffer]).stream().pipeThrough(ds));
  return stream.text();
}

async function downloadPack(manifest: PackManifest): Promise<{ questions: QuizQuestion[]; sha256: string } | null> {
  const supportsDecompressionStream = typeof (globalThis as any).DecompressionStream !== 'undefined';

  // Attempt 1: fetch .gz file
  if (supportsDecompressionStream) {
    try {
      const res = await fetch(manifest.files.gz.path);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const sha256 = await bufferToSha256(buffer);

        let text: string;
        if (isGzipBuffer(buffer)) {
          // Raw gzip bytes — decompress with DecompressionStream
          text = await decompressGzip(buffer);
        } else {
          // Server sent Content-Encoding: gzip; browser already decompressed the body
          text = new TextDecoder().decode(buffer);
        }

        const parsed = JSON.parse(text);
        console.log(`[questionPack] Downloaded gz pack: ${parsed.questions.length} questions`);
        return { questions: parsed.questions as QuizQuestion[], sha256 };
      }
    } catch (e) {
      console.warn('[questionPack] gz download failed, falling back to plain JSON:', e);
    }
  }

  // Attempt 2: plain JSON fallback
  try {
    const res = await fetch(manifest.files.json.path);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const sha256 = await bufferToSha256(buffer);
      const text   = new TextDecoder().decode(buffer);
      const parsed = JSON.parse(text);
      console.log(`[questionPack] Downloaded JSON pack: ${parsed.questions.length} questions`);
      return { questions: parsed.questions as QuizQuestion[], sha256 };
    }
  } catch (e) {
    console.warn('[questionPack] plain JSON download failed:', e);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadQuestionPack(): Promise<QuizQuestion[]> {
  // Serve from in-memory cache if already loaded this session
  if (_memoryCache) {
    return _memoryCache.questions;
  }

  const db = await openDB();

  // Try fetching the manifest (will be null if offline)
  const manifest = await fetchManifest();

  if (manifest) {
    // Online: check if the stored version is current
    const stored = await getPackFromDB(db);

    if (stored && stored.version === manifest.version) {
      console.log(`[questionPack] IndexedDB hit — v${stored.version}, ${stored.questions.length} questions`);
      _memoryCache = { version: stored.version, questions: stored.questions };
      return stored.questions;
    }

    // Version mismatch or no stored pack: download fresh
    console.log(`[questionPack] Downloading pack v${manifest.version}...`);
    const downloaded = await downloadPack(manifest);

    if (downloaded) {
      const record: PackRecord = {
        key:         PACK_KEY,
        version:     manifest.version,
        generatedAt: manifest.generatedAt,
        questions:   downloaded.questions,
        sha256:      downloaded.sha256,
        savedAt:     new Date().toISOString(),
      };
      await savePackToDB(db, record);
      console.log(`[questionPack] Saved v${manifest.version} to IndexedDB`);
      _memoryCache = { version: manifest.version, questions: downloaded.questions };
      return downloaded.questions;
    }
  }

  // Offline or manifest/download failed — use whatever is in IndexedDB
  const stored = await getPackFromDB(db);
  if (stored && stored.questions.length > 0) {
    console.log(`[questionPack] Offline — serving stored pack v${stored.version}`);
    _memoryCache = { version: stored.version, questions: stored.questions };
    return stored.questions;
  }

  // Nothing available
  throw new Error(
    'Não foi possível carregar o banco de perguntas. Conecte-se à internet e tente novamente.'
  );
}

/** Clears the in-memory session cache (does NOT clear IndexedDB). */
export function clearMemoryCache(): void {
  _memoryCache = null;
}
