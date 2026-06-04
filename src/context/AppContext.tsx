import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserStats, Flashcard, QuizQuestion, AppSubscription } from '../types';
import { auth, db, handleFirestoreError, fetchGlobalFlashcards, fetchGlobalQuizzes } from '../lib/firebase';
import { isSubscriptionActive } from '../lib/subscription';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AppContextType {
  user: User | null;
  authReady: boolean;
  dataLoaded: boolean;
  stats: UserStats;
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  audioSpeed: number;
  setAudioSpeed: (speed: number) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  interfaceLanguage: 'es' | 'pt' | 'en';
  setInterfaceLanguage: (lang: 'es' | 'pt' | 'en') => void;
  addXp: (amount: number) => void;
  recordStudySession: (cards: number) => void;
  recordQuizResult: (correct: number, total: number, errors?: string[]) => void;
  recordCardProgress: (cardId: string, isEasy: boolean) => void;
  recordSimuladoFinished: (correct: number, total: number, errors?: string[]) => void;
  resetAllProgress: () => Promise<void>;
  showSyncModal: boolean;
  setShowSyncModal: (show: boolean) => void;
  cloudStatsPending: UserStats | null;
  handleSyncAction: (action: 'keep_cloud' | 'overwrite_cloud' | 'merge') => Promise<void>;
  toggleFavoriteQuestion: (questionId: string) => void;
  toggleFavoriteCard: (cardId: string) => void;
  toggleDifficultQuestion: (questionId: string) => void;
  toggleDifficultCard: (cardId: string) => void;
  favoriteLimitReached: boolean;
  setFavoriteLimitReached: (reached: boolean) => void;
  
  // Subscription parameters
  subscription: AppSubscription;
  canAccessFeature: (featureName: string) => boolean;
  activatePlan: (plan: 'free' | 'pro_6_months' | 'pro_annual', simulateStatus?: 'free' | 'active' | 'expired' | 'trial') => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  triggerUpgradeModal: () => void;
}

const defaultStats: UserStats = {
  cardsStudied: 0,
  quizzesTaken: 0,
  correctAnswers: 0,
  totalAnswers: 0,
  xp: 0,
  level: 1,
  streak: 0,
  lastStudyDate: '',
  simuladosTaken: 0,
  cardProgress: {},
  errorCounts: {},
  favoriteQuestionIds: [],
  favoriteCardIds: [],
  difficultQuestionIds: [],
  difficultCardIds: []
};

const defaultSubscription: AppSubscription = {
  status: 'free',
  plan: 'free',
  startedAt: '',
  expiresAt: '',
  provider: 'manual',
  updatedAt: ''
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [cloudStatsPending, setCloudStatsPending] = useState<UserStats | null>(null);
  const [favoriteLimitReached, setFavoriteLimitReached] = useState(false);
  
  // Subscription states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subscription, setSubscription] = useState<AppSubscription>(() => {
    const saved = localStorage.getItem('cap_subscription');
    if (saved) {
      try {
        return {
          ...defaultSubscription,
          ...JSON.parse(saved)
        };
      } catch (e) {
        return defaultSubscription;
      }
    }
    return defaultSubscription;
  });
  
  const [audioSpeed, setAudioSpeedState] = useState<number>(() => {
    return parseFloat(localStorage.getItem('cap_audio_speed') || '0.9');
  });

  const [audioEnabled, setAudioEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('cap_audio_enabled') !== 'false';
  });

  const [interfaceLanguage, setInterfaceLanguageState] = useState<'es' | 'pt' | 'en'>(() => {
    return (localStorage.getItem('cap_interface_language') as 'es' | 'pt' | 'en') || 'pt';
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('cap_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultStats,
          ...parsed
        };
      } catch (e) {
        return defaultStats;
      }
    }
    return defaultStats;
  });

  // Load Global DB Data
  useEffect(() => {
    const loadGlobalData = async () => {
      let fetchedCards = await fetchGlobalFlashcards();
      let fetchedQuizzes = await fetchGlobalQuizzes();
      
      setFlashcards(fetchedCards);
      setQuizzes(fetchedQuizzes);
      setDataLoaded(true);
    };

    const handleAudioLimit = () => {
      setShowUpgradeModal(true);
    };
    window.addEventListener('cap_premium_limit_audio', handleAudioLimit);

    loadGlobalData();

    return () => {
      window.removeEventListener('cap_premium_limit_audio', handleAudioLimit);
    };
  }, []);

  // Handle Auth State Changes with reliable synchronization flow
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch stats from Firestore
        const statsRef = doc(db, 'users', currentUser.uid, 'stats', 'main');
        const subRef = doc(db, 'users', currentUser.uid, 'subscription', 'main');
        
        // Load Subscription
        try {
          const subSnap = await getDoc(subRef);
          if (subSnap.exists()) {
            const subData = subSnap.data() as AppSubscription;
            setSubscription(subData);
            localStorage.setItem('cap_subscription', JSON.stringify(subData));
          } else {
            // Check local subscription first
            const localSavedSubRaw = localStorage.getItem('cap_subscription');
            let currentLocalSub = defaultSubscription;
            if (localSavedSubRaw) {
              try {
                currentLocalSub = { ...defaultSubscription, ...JSON.parse(localSavedSubRaw) };
              } catch (e) {}
            }
            await setDoc(subRef, {
              ...currentLocalSub,
              updatedAt: new Date().toISOString()
            }).catch(e => handleFirestoreError(e, 'create', subRef.path));
          }
        } catch (subErr) {
          console.error("Error fetching subscription from cloud, using default.", subErr);
        }

        try {
          const docSnap = await getDoc(statsRef);
          
          // Read actual latest local stats to avoid sync closures
          const localSavedStatsRaw = localStorage.getItem('cap_stats');
          let currentLocalStats = defaultStats;
          if (localSavedStatsRaw) {
            try {
              currentLocalStats = { ...defaultStats, ...JSON.parse(localSavedStatsRaw) };
            } catch (e) {}
          }

          if (docSnap.exists()) {
            const data = docSnap.data() as Omit<UserStats, 'updatedAt'>;
            
            // Re-calculate streak based on fetched lastStudyDate
            let updatedStreak = data.streak || 0;
            const today = new Date().toISOString().split('T')[0];
            if (data.lastStudyDate && data.lastStudyDate !== today) {
              const lastDate = new Date(data.lastStudyDate);
              const currentDate = new Date(today);
              const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 1) {
                updatedStreak = 0; // Streak broken
              }
            }
            
            const statsObjFromCloud: UserStats = {
              cardsStudied: data.cardsStudied || 0,
              quizzesTaken: data.quizzesTaken || 0,
              correctAnswers: data.correctAnswers || 0,
              totalAnswers: data.totalAnswers || 0,
              xp: data.xp || 0,
              level: data.level || 1,
              streak: updatedStreak,
              lastStudyDate: data.lastStudyDate || '',
              simuladosTaken: data.simuladosTaken || 0,
              cardProgress: data.cardProgress || {},
              errorCounts: data.errorCounts || {},
              favoriteQuestionIds: data.favoriteQuestionIds || [],
              favoriteCardIds: data.favoriteCardIds || [],
              difficultQuestionIds: data.difficultQuestionIds || [],
              difficultCardIds: data.difficultCardIds || []
            };
            
            // Analyze progress comparison
            const hasLocalProgress = currentLocalStats.xp > 0 || currentLocalStats.quizzesTaken > 0 || currentLocalStats.cardsStudied > 0;
            const hasCloudProgress = statsObjFromCloud.xp > 0 || statsObjFromCloud.quizzesTaken > 0 || statsObjFromCloud.cardsStudied > 0;

            // Detect if they are genuinely different in XP / progress
            const isDifferent = currentLocalStats.xp !== statsObjFromCloud.xp || 
                                currentLocalStats.quizzesTaken !== statsObjFromCloud.quizzesTaken ||
                                currentLocalStats.cardsStudied !== statsObjFromCloud.cardsStudied;

            if (hasLocalProgress && isDifferent) {
              // Both have progress and they diff: set pending and show the sync dialog
              setCloudStatsPending(statsObjFromCloud);
              setShowSyncModal(true);
            } else {
              // No significant local progress, or they are exactly the same: load cloud silently
              setStats(statsObjFromCloud);
              localStorage.setItem('cap_stats', JSON.stringify(statsObjFromCloud));
              
              if (updatedStreak !== data.streak) {
                 await updateDoc(statsRef, { streak: updatedStreak, updatedAt: Date.now() }).catch(e => handleFirestoreError(e, 'update', statsRef.path));
              }
            }
          } else {
            // First time user login. Sync current local stats up to the cloud securely
            await setDoc(statsRef, {
              ...currentLocalStats,
              updatedAt: Date.now()
            }).catch(e => handleFirestoreError(e, 'create', statsRef.path));
          }
        } catch(e) {
          handleFirestoreError(e, 'get', statsRef.path);
        }
      }
      
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []); // Only run once on mount

  // Sync to local when stats change locally (and not logged in)
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      localStorage.setItem('cap_stats', JSON.stringify(stats));
    }
  }, [stats, user, authReady]);
  
  const updateStatsInCloud = async (newStats: UserStats) => {
    if (user && !user.isAnonymous) {
        const statsRef = doc(db, 'users', user.uid, 'stats', 'main');
        await setDoc(statsRef, {
            ...newStats,
            updatedAt: Date.now()
        }).catch(e => handleFirestoreError(e, 'create', statsRef.path));
    }
  };

  const handleSyncAction = async (action: 'keep_cloud' | 'overwrite_cloud' | 'merge') => {
    if (!user) return;
    const statsRef = doc(db, 'users', user.uid, 'stats', 'main');

    let finalStats = stats;
    // Real latest local stats
    const localSavedStatsRaw = localStorage.getItem('cap_stats');
    let currentLocalStats = stats;
    if (localSavedStatsRaw) {
      try {
        currentLocalStats = { ...defaultStats, ...JSON.parse(localSavedStatsRaw) };
      } catch (e) {}
    }

    if (action === 'keep_cloud' && cloudStatsPending) {
      finalStats = cloudStatsPending;
    } else if (action === 'overwrite_cloud') {
      finalStats = currentLocalStats;
    } else if (action === 'merge' && cloudStatsPending) {
      finalStats = {
        cardsStudied: (currentLocalStats.cardsStudied || 0) + (cloudStatsPending.cardsStudied || 0),
        quizzesTaken: (currentLocalStats.quizzesTaken || 0) + (cloudStatsPending.quizzesTaken || 0),
        correctAnswers: (currentLocalStats.correctAnswers || 0) + (cloudStatsPending.correctAnswers || 0),
        totalAnswers: (currentLocalStats.totalAnswers || 0) + (cloudStatsPending.totalAnswers || 0),
        xp: (currentLocalStats.xp || 0) + (cloudStatsPending.xp || 0),
        level: Math.floor(((currentLocalStats.xp || 0) + (cloudStatsPending.xp || 0)) / 100) + 1,
        streak: Math.max(currentLocalStats.streak || 0, cloudStatsPending.streak || 0),
        lastStudyDate: currentLocalStats.lastStudyDate || cloudStatsPending.lastStudyDate || '',
        simuladosTaken: (currentLocalStats.simuladosTaken || 0) + (cloudStatsPending.simuladosTaken || 0),
        cardProgress: {
          ...(cloudStatsPending.cardProgress || {}),
          ...(currentLocalStats.cardProgress || {})
        },
        errorCounts: (() => {
          const cloudEC: Record<string, number> = cloudStatsPending.errorCounts || {};
          const localEC: Record<string, number> = currentLocalStats.errorCounts || {};
          const merged: Record<string, number> = { ...cloudEC };
          Object.entries(localEC).forEach(([id, count]) => {
            merged[id] = (merged[id] || 0) + count;
          });
          return merged;
        })(),
        favoriteQuestionIds: Array.from(new Set([
          ...(currentLocalStats.favoriteQuestionIds || []),
          ...(cloudStatsPending.favoriteQuestionIds || [])
        ])),
        favoriteCardIds: Array.from(new Set([
          ...(currentLocalStats.favoriteCardIds || []),
          ...(cloudStatsPending.favoriteCardIds || [])
        ])),
        difficultQuestionIds: Array.from(new Set([
          ...(currentLocalStats.difficultQuestionIds || []),
          ...(cloudStatsPending.difficultQuestionIds || [])
        ])),
        difficultCardIds: Array.from(new Set([
          ...(currentLocalStats.difficultCardIds || []),
          ...(cloudStatsPending.difficultCardIds || [])
        ]))
      };
    }

    setStats(finalStats);
    localStorage.setItem('cap_stats', JSON.stringify(finalStats));
    setShowSyncModal(false);
    setCloudStatsPending(null);

    // Save to Firestore
    await setDoc(statsRef, {
      ...finalStats,
      updatedAt: Date.now()
    }).catch(e => handleFirestoreError(e, 'create', statsRef.path));
  };

  const calcStreakAndXp = (prev: UserStats, xpGain: number) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let streak: number;
    if (prev.lastStudyDate === today) {
      streak = prev.streak;
    } else if (prev.lastStudyDate === yesterday) {
      streak = (prev.streak || 0) + 1;
    } else {
      streak = 1;
    }
    const newXp = (prev.xp || 0) + xpGain;
    const newLevel = Math.floor(newXp / 100) + 1;
    return { xp: newXp, level: newLevel, streak, lastStudyDate: today };
  };

  const addXp = (amount: number) => {
    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      computedNewStats = { ...prev, ...calcStreakAndXp(prev, amount) };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });
    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const setAudioSpeed = (speed: number) => {
    setAudioSpeedState(speed);
    localStorage.setItem('cap_audio_speed', speed.toString());
  };

  const setAudioEnabled = (enabled: boolean) => {
    setAudioEnabledState(enabled);
    localStorage.setItem('cap_audio_enabled', enabled ? 'true' : 'false');
  };

  const setInterfaceLanguage = (lang: 'es' | 'pt' | 'en') => {
    setInterfaceLanguageState(lang);
    localStorage.setItem('cap_interface_language', lang);
  };

  const recordStudySession = (cards: number) => {
    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      computedNewStats = {
        ...prev,
        cardsStudied: (prev.cardsStudied || 0) + cards,
        ...calcStreakAndXp(prev, cards * 5),
      };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });
    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const recordQuizResult = (correct: number, total: number, errors: string[] = []) => {
    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      const newErrorCounts = { ...(prev.errorCounts || {}) };
      errors.forEach(errId => {
        newErrorCounts[errId] = (newErrorCounts[errId] || 0) + 1;
      });
      computedNewStats = {
        ...prev,
        quizzesTaken: (prev.quizzesTaken || 0) + 1,
        correctAnswers: (prev.correctAnswers || 0) + correct,
        totalAnswers: (prev.totalAnswers || 0) + total,
        errorCounts: newErrorCounts,
        ...calcStreakAndXp(prev, correct * 10),
      };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });
    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const recordSimuladoFinished = (correct: number, total: number, errors: string[] = []) => {
    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      const newErrorCounts = { ...(prev.errorCounts || {}) };
      errors.forEach(errId => {
        newErrorCounts[errId] = (newErrorCounts[errId] || 0) + 1;
      });
      computedNewStats = {
        ...prev,
        quizzesTaken: (prev.quizzesTaken || 0) + 1,
        simuladosTaken: (prev.simuladosTaken || 0) + 1,
        correctAnswers: (prev.correctAnswers || 0) + correct,
        totalAnswers: (prev.totalAnswers || 0) + total,
        errorCounts: newErrorCounts,
        ...calcStreakAndXp(prev, correct * 15),
      };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });
    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const resetAllProgress = async () => {
    setStats(defaultStats);
    localStorage.setItem('cap_stats', JSON.stringify(defaultStats));
    if (user) {
      const statsRef = doc(db, 'users', user.uid, 'stats', 'main');
      await setDoc(statsRef, {
        ...defaultStats,
        updatedAt: Date.now()
      }).catch(e => handleFirestoreError(e, 'create', statsRef.path));
    }
  };

  const recordCardProgress = (cardId: string, isEasy: boolean) => {
    // Premium limit check before entering setStats — no side effects inside updater
    if (!isEasy) {
      const currentDiffs = stats.difficultCardIds || [];
      if (!currentDiffs.includes(cardId) && !canAccessFeature('unlimitedDifficult') && currentDiffs.length >= 5) {
        setShowUpgradeModal(true);
        return;
      }
    }

    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      const cardProgressMap = prev.cardProgress || {};
      const currentProgress = cardProgressMap[cardId] || { level: 1, nextReview: new Date().toISOString().split('T')[0] };

      let newLevel = isEasy ? currentProgress.level + 1 : 1;
      if (newLevel > 5) newLevel = 5;

      const nextDate = new Date();
      if (isEasy) {
        nextDate.setDate(nextDate.getDate() + (newLevel * 2));
      }
      // if not easy, nextDate stays as today (review again today)

      const prevDiffs = prev.difficultCardIds || [];
      let newDiffs: string[];
      if (!isEasy) {
        newDiffs = prevDiffs.includes(cardId) ? prevDiffs : [...prevDiffs, cardId];
      } else {
        newDiffs = prevDiffs.filter(id => id !== cardId);
      }

      computedNewStats = {
        ...prev,
        difficultCardIds: newDiffs,
        cardProgress: {
          ...cardProgressMap,
          [cardId]: {
            level: newLevel,
            nextReview: nextDate.toISOString().split('T')[0]
          }
        }
      };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });

    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const toggleFavoriteQuestion = (questionId: string) => {
    const currentFavs = stats.favoriteQuestionIds || [];
    const exists = currentFavs.includes(questionId);

    if (!exists && !canAccessFeature('unlimitedFavorites') && currentFavs.length >= 5) {
      setShowUpgradeModal(true);
      return;
    }
    if (!exists && currentFavs.length >= 1000) {
      setFavoriteLimitReached(true);
      return;
    }

    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      const prevFavs = prev.favoriteQuestionIds || [];
      const newFavs = prevFavs.includes(questionId)
        ? prevFavs.filter(id => id !== questionId)
        : [...prevFavs, questionId];
      computedNewStats = { ...prev, favoriteQuestionIds: newFavs };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });

    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const toggleFavoriteCard = (cardId: string) => {
    const currentFavs = stats.favoriteCardIds || [];
    const exists = currentFavs.includes(cardId);

    if (!exists && !canAccessFeature('unlimitedFavorites') && currentFavs.length >= 5) {
      setShowUpgradeModal(true);
      return;
    }
    if (!exists && currentFavs.length >= 1000) {
      setFavoriteLimitReached(true);
      return;
    }

    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      const prevFavs = prev.favoriteCardIds || [];
      const newFavs = prevFavs.includes(cardId)
        ? prevFavs.filter(id => id !== cardId)
        : [...prevFavs, cardId];
      computedNewStats = { ...prev, favoriteCardIds: newFavs };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });

    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const toggleDifficultQuestion = (questionId: string) => {
    const currentDiffs = stats.difficultQuestionIds || [];
    const exists = currentDiffs.includes(questionId);

    if (!exists && !canAccessFeature('unlimitedDifficult') && currentDiffs.length >= 5) {
      setShowUpgradeModal(true);
      return;
    }

    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      const prevDiffs = prev.difficultQuestionIds || [];
      const newDiffs = prevDiffs.includes(questionId)
        ? prevDiffs.filter(id => id !== questionId)
        : [...prevDiffs, questionId];
      computedNewStats = { ...prev, difficultQuestionIds: newDiffs };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });

    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const toggleDifficultCard = (cardId: string) => {
    const currentDiffs = stats.difficultCardIds || [];
    const exists = currentDiffs.includes(cardId);

    if (!exists && !canAccessFeature('unlimitedDifficult') && currentDiffs.length >= 5) {
      setShowUpgradeModal(true);
      return;
    }

    let computedNewStats: UserStats = { ...stats };
    setStats(prev => {
      const prevDiffs = prev.difficultCardIds || [];
      const newDiffs = prevDiffs.includes(cardId)
        ? prevDiffs.filter(id => id !== cardId)
        : [...prevDiffs, cardId];
      computedNewStats = { ...prev, difficultCardIds: newDiffs };
      localStorage.setItem('cap_stats', JSON.stringify(computedNewStats));
      return computedNewStats;
    });

    setTimeout(() => {
      if (user) updateStatsInCloud(computedNewStats);
    }, 0);
  };

  const canAccessFeature = (featureName: string): boolean => {
    if (isSubscriptionActive(subscription)) {
      return true;
    }
    const premiumFeatures = [
      'fullQuestionBank',
      'allCategories',
      'officialMockExam',
      'unlimitedAudio',
      'unlimitedFavorites',
      'unlimitedDifficult',
      'fullErrorReview',
      'advancedStats',
      'postSimuladoReport'
    ];
    if (premiumFeatures.includes(featureName)) {
      return false;
    }
    return true;
  };

  const triggerUpgradeModal = () => {
    setShowUpgradeModal(true);
  };

  const activatePlan = async (
    plan: 'free' | 'pro_6_months' | 'pro_annual',
    simulateStatus: 'free' | 'active' | 'expired' | 'trial' = 'active'
  ) => {
    const startedVal = new Date();
    let expiresVal = new Date();

    if (plan === 'free') {
      const freeSub: AppSubscription = {
        status: 'free',
        plan: 'free',
        startedAt: '',
        expiresAt: '',
        provider: 'manual',
        updatedAt: new Date().toISOString()
      };
      setSubscription(freeSub);
      localStorage.setItem('cap_subscription', JSON.stringify(freeSub));
      
      if (user) {
        const subRef = doc(db, 'users', user.uid, 'subscription', 'main');
        await setDoc(subRef, freeSub).catch(e => handleFirestoreError(e, 'create', subRef.path));
      }
      return;
    }

    const monthsToAdd = plan === 'pro_annual' ? 12 : 6;
    const isCurrentlyPremium = subscription.status === 'active' || subscription.status === 'trial';
    const isCurrentExpiresInFuture = subscription.expiresAt && new Date(subscription.expiresAt).getTime() > Date.now();

    if (isCurrentlyPremium && isCurrentExpiresInFuture) {
      const currentExpiry = new Date(subscription.expiresAt);
      currentExpiry.setMonth(currentExpiry.getMonth() + monthsToAdd);
      expiresVal = currentExpiry;
    } else {
      expiresVal.setMonth(expiresVal.getMonth() + monthsToAdd);
    }

    if (simulateStatus === 'expired') {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expiresVal = pastDate;
    }

    const newSub: AppSubscription = {
      status: simulateStatus,
      plan: plan,
      startedAt: startedVal.toISOString(),
      expiresAt: expiresVal.toISOString(),
      provider: 'manual',
      updatedAt: new Date().toISOString()
    };

    setSubscription(newSub);
    localStorage.setItem('cap_subscription', JSON.stringify(newSub));

    if (user) {
      const subRef = doc(db, 'users', user.uid, 'subscription', 'main');
      await setDoc(subRef, newSub).catch(e => handleFirestoreError(e, 'create', subRef.path));
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      authReady, 
      dataLoaded, 
      stats, 
      flashcards, 
      quizzes, 
      audioSpeed, 
      setAudioSpeed,
      audioEnabled,
      setAudioEnabled,
      interfaceLanguage,
      setInterfaceLanguage,
      addXp, 
      recordStudySession, 
      recordQuizResult, 
      recordCardProgress,
      recordSimuladoFinished,
      resetAllProgress,
      showSyncModal,
      setShowSyncModal,
      cloudStatsPending,
      handleSyncAction,
      toggleFavoriteQuestion,
      toggleFavoriteCard,
      toggleDifficultQuestion,
      toggleDifficultCard,
      favoriteLimitReached,
      setFavoriteLimitReached,
      
      subscription,
      canAccessFeature,
      activatePlan,
      showUpgradeModal,
      setShowUpgradeModal,
      triggerUpgradeModal
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
