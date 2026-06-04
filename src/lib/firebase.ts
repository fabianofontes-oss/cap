import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, getDocs, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserStats, Flashcard, QuizQuestion } from '../types';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Enforce correct databaseId
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    isAnonymous: boolean;
  };
}

export const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null) => {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown Firebase Error',
    operationType,
    path,
    authInfo: {
      userId: user?.uid || 'unauthenticated',
      email: user?.email || '',
      isAnonymous: user?.isAnonymous || false,
    }
  };
  
  if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
    console.error(JSON.stringify(errorInfo, null, 2));
    throw new Error(JSON.stringify(errorInfo));
  }
  
  console.error("Firestore Error:", errorInfo);
  throw error;
};

export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  
  // Initialize user doc if not exists
  const userDocRef = doc(db, 'users', result.user.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    await setDoc(userDocRef, {
      email: result.user.email,
      createdAt: Date.now()
    }).catch(err => handleFirestoreError(err, 'create', `users/${result.user.uid}`));
  }
  return result.user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Initialize user doc if not exists
    const userDocRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: result.user.email,
        createdAt: Date.now()
      }).catch(err => handleFirestoreError(err, 'create', `users/${result.user.uid}`));
    }
  } catch (error) {
    console.error("Google Sign-in Error:", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

// Hook for connection test
export const testConnection = async () => {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCached<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return data as T[];
  } catch { return null; }
}

function setCache<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export const fetchGlobalFlashcards = async (): Promise<Flashcard[]> => {
  const cached = getCached<Flashcard>('cap_cache_flashcards');
  if (cached && cached.length > 0) return cached;
  try {
    const querySnapshot = await getDocs(collection(db, 'flashcards'));
    const cards: Flashcard[] = [];
    querySnapshot.forEach((doc) => { cards.push(doc.data() as Flashcard); });
    if (cards.length > 0) setCache('cap_cache_flashcards', cards);
    return cards;
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    return [];
  }
};

export const fetchGlobalQuizzes = async (): Promise<QuizQuestion[]> => {
  const cached = getCached<QuizQuestion>('cap_cache_quizzes');
  if (cached && cached.length > 0) return cached;
  try {
    const querySnapshot = await getDocs(collection(db, 'quizzes'));
    const quizzes: QuizQuestion[] = [];
    querySnapshot.forEach((doc) => { quizzes.push(doc.data() as QuizQuestion); });
    if (quizzes.length > 0) setCache('cap_cache_quizzes', quizzes);
    return quizzes;
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return [];
  }
};
