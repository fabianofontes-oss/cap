import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { QuizQuestion } from '../types';
import { CheckCircle2, XCircle, ArrowRight, Award, Volume2, Filter, Clock, Star, AlertOctagon } from 'lucide-react';
import { playAudio } from '../lib/audio';
import { HiddenTranslation } from './HiddenTranslation';
import DetailedResults from './DetailedResults';

export default function Quiz() {
  const { 
    recordQuizResult, 
    quizzes: allQuizzes, 
    dataLoaded, 
    audioSpeed, 
    stats,
    toggleFavoriteQuestion,
    toggleDifficultQuestion,
    favoriteLimitReached,
    setFavoriteLimitReached,
    canAccessFeature,
    triggerUpgradeModal
  } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [quizSessionKey, setQuizSessionKey] = useState(0);
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [errorsThisSession, setErrorsThisSession] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(40 * 60); // 40 minutes in seconds
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timesSpent, setTimesSpent] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const scoreRef = React.useRef(score);
  const errorsThisSessionRef = React.useRef(errorsThisSession);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { errorsThisSessionRef.current = errorsThisSession; }, [errorsThisSession]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const handleCategoryClick = (cat: string) => {
    if (cat === '🏥 Hospital' && !canAccessFeature('fullErrorReview')) {
      triggerUpgradeModal();
      return;
    }
    if (cat !== 'All' && cat !== '⭐ Favoritos' && cat !== '🔴 Difíceis' && cat !== '🏥 Hospital') {
      if (!canAccessFeature('allCategories')) {
        triggerUpgradeModal();
        return;
      }
    }
    setSelectedCategory(cat);
  };

  useEffect(() => {
    if (!dataLoaded) return;
    
    let filtered = allQuizzes;
    
    if (selectedCategory === '🏥 Hospital') {
       // Only cards with 2 or more errors
       const hospitalIds = Object.keys(stats?.errorCounts || {}).filter(k => (stats.errorCounts?.[k] || 0) >= 2);
       filtered = allQuizzes.filter(q => hospitalIds.includes(q.id));
    } else if (selectedCategory === '⭐ Favoritos') {
       filtered = allQuizzes.filter(q => stats.favoriteQuestionIds?.includes(q.id));
    } else if (selectedCategory === '🔴 Difíceis') {
       filtered = allQuizzes.filter(q => stats.difficultQuestionIds?.includes(q.id));
    } else if (selectedCategory !== 'All') {
       filtered = allQuizzes.filter(q => q.category === selectedCategory);
    }
    
    // Fisher-Yates Shuffle
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Limit to 40 random questions per run for performance & realistic test scope
    setQuizzes(shuffled.slice(0, 40));
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
    setErrorsThisSession([]);
    setTimeLeft(40 * 60); // Reset timer to 40 minutes per batch
    setAnswers({});
    setTimesSpent({});
    setQuestionStartTime(Date.now());
  }, [selectedCategory, dataLoaded, quizSessionKey, allQuizzes, stats.errorCounts, stats.favoriteQuestionIds, stats.difficultQuestionIds]);

  // Timer logic — refs used so interval is not recreated on every answered question
  useEffect(() => {
    if (quizzes.length === 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowResults(true);
          recordQuizResult(scoreRef.current, quizzes.length, errorsThisSessionRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizzes.length, showResults]);

  if (!dataLoaded) {
    return <div className="text-center p-8 text-gray-500">Sincronizando com o banco oficial...</div>;
  }

  const categories: string[] = ['All', '🏥 Hospital', '⭐ Favoritos', '🔴 Difíceis', ...(Array.from(new Set(allQuizzes.map(q => q.category))) as string[])];

  if (quizzes.length === 0) {
     return (
       <div className="w-full max-w-2xl mx-auto">
         {/* Category Filter */}
         <div className="w-full flex items-center gap-2 overflow-x-auto pb-4 mb-4 hide-scrollbar">
            <div className="flex items-center text-gray-400 shrink-0 mr-2">
              <Filter size={18} />
            </div>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-colors ${
                  selectedCategory === cat 
                    ? (cat === '🏥 Hospital' ? 'bg-red-500 text-white shadow-sm' : 'bg-[#FF6321] text-white shadow-sm')
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat === 'All' ? 'Todas' : cat}
              </button>
            ))}
         </div>
         <div className="text-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4">
           {selectedCategory === '⭐ Favoritos' ? (
             <>
               <p className="text-gray-800 text-lg font-bold">Você ainda não salvou nenhum item.</p>
               <p className="text-gray-500 mt-2 text-sm font-medium">Toque na estrela durante o estudo para guardar.</p>
             </>
           ) : selectedCategory === '🔴 Difíceis' ? (
             <>
               <p className="text-gray-800 text-lg font-bold">Você ainda não marcou nenhum card como difícil.</p>
               <p className="text-gray-500 mt-2 text-sm font-medium">Ao estudar flashcards, toque em Difícil para revisar depois.</p>
             </>
           ) : selectedCategory === '🏥 Hospital' ? (
             <>
               <p className="text-[#FF6321] text-lg font-extrabold pb-1">Você ainda não tem questões no Hospital de Erros.</p>
               <p className="text-gray-500 text-sm font-medium">Continue praticando.</p>
             </>
           ) : (
             <p className="text-gray-500 text-lg font-medium">Nenhuma pergunta disponível para esta categoria.</p>
           )}
         </div>
       </div>
     );
  }

  const currentQuiz = quizzes[currentIndex];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelect = (optionId: string) => {
    if (isAnswered) return;
    
    setSelectedOption(optionId);
    setIsAnswered(true);

    // Record the user's answer
    setAnswers(prev => ({
      ...prev,
      [currentQuiz.id]: optionId
    }));

    // Save duration for this question
    const elapsed = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    setTimesSpent(prev => ({
      ...prev,
      [currentQuiz.id]: elapsed
    }));
    
    const option = currentQuiz.options.find(o => o.id === optionId);
    if (option?.isCorrect) {
      setScore(prev => prev + 1);
    } else {
      setErrorsThisSession(prev => [...prev, currentQuiz.id]);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
      recordQuizResult(score, quizzes.length, errorsThisSession);
    }
  };

  if (showResults) {
    return (
      <DetailedResults
        questions={quizzes}
        answers={answers}
        timesSpent={timesSpent}
        onRestart={() => setQuizSessionKey(prev => prev + 1)}
        title={`Treino Prático: ${selectedCategory === 'All' ? 'Foco Geral' : selectedCategory}`}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Category Filter */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-4 mb-4 hide-scrollbar">
         <div className="flex items-center text-gray-400 shrink-0 mr-2">
           <Filter size={18} />
         </div>
         {categories.map(cat => (
           <button
             key={cat}
             onClick={() => handleCategoryClick(cat)}
             className={`px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-colors ${
               selectedCategory === cat 
                 ? (cat === '🏥 Hospital' ? 'bg-red-500 text-white shadow-sm' : 'bg-[#FF6321] text-white shadow-sm')
                 : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
             }`}
           >
             {cat === 'All' ? 'Todas' : cat}
           </button>
         ))}
      </div>

       {/* Soft Limit Warning Banner */}
      {favoriteLimitReached && (
        <div className="w-full bg-yellow-50 border-2 border-yellow-200 text-yellow-800 p-4 rounded-2xl mb-6 text-sm flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="font-bold">Limite de Favoritos Excedido!</p>
              <p className="text-xs text-yellow-600 font-medium">Você tem mais de 1000 itens favoritados. O app continuará funcionando normalmente, mas sugerimos otimizar seus estudos remanescentes.</p>
            </div>
          </div>
          <button 
            onClick={() => setFavoriteLimitReached(false)} 
            className="text-xs font-black uppercase text-yellow-800 hover:text-yellow-600 bg-white border border-yellow-200 px-3 py-1 rounded-lg shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold uppercase tracking-wider text-gray-400">
            {currentQuiz.category}
          </span>
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          
          <button 
            onClick={() => toggleFavoriteQuestion(currentQuiz.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold ${
              stats.favoriteQuestionIds?.includes(currentQuiz.id)
                ? 'bg-yellow-50 border-yellow-200 text-yellow-600 shadow-sm'
                : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-500'
            }`}
            title="Favoritar Pergunta"
          >
            <Star size={12} className={stats.favoriteQuestionIds?.includes(currentQuiz.id) ? "fill-yellow-400 text-yellow-500" : ""} />
            <span>{stats.favoriteQuestionIds?.includes(currentQuiz.id) ? 'Favoritado' : 'Favoritar'}</span>
          </button>


        </div>

        <div className="flex items-center gap-3 justify-between md:justify-end w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-3 py-1 rounded-full font-mono font-bold text-sm">
            <Clock size={16} />
            {formatTime(timeLeft)}
          </div>
          <div className="flex gap-1">
            {quizzes.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-[#FF6321]' : idx < currentIndex ? 'w-2 bg-[#FF6321]/40' : 'w-2 bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 relative pr-12">
        <button 
          onClick={() => playAudio(currentQuiz.question.es, 'es-ES', audioSpeed)}
          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-[#FF6321] bg-gray-50 hover:bg-orange-50 rounded-full transition-colors"
        >
          <Volume2 size={24} />
        </button>
        <h3 className="text-2xl font-medium text-gray-800 leading-snug">
          {currentQuiz.question.es}
        </h3>
        <HiddenTranslation 
          text={currentQuiz.question.pt}
          className="text-gray-500 mt-2 font-medium italic"
        />
      </div>

      <div className="space-y-4 mb-8">
        {currentQuiz.options.map((option) => {
          const isSelected = selectedOption === option.id;
          let buttonClass = "w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group shadow-sm relative overflow-hidden";
          
          if (!isAnswered) {
             buttonClass += " border-gray-100 hover:border-[#FF6321] hover:bg-orange-50/20 cursor-pointer bg-white hover:shadow-md hover:-translate-y-0.5";
          } else if (option.isCorrect) {
             buttonClass += " border-green-500 bg-green-50/50 shadow-md shadow-green-500/10 z-10";
          } else if (isSelected && !option.isCorrect) {
             buttonClass += " border-red-500 bg-red-50/50 shadow-md shadow-red-500/10";
          } else {
             buttonClass += " border-gray-100 opacity-40 bg-white";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={isAnswered}
              className={buttonClass}
            >
              <div className="flex-1 pr-4 text-left relative z-10">
                <div className="text-gray-800 font-bold mb-1.5 text-base">{option.text.es}</div>
                <HiddenTranslation 
                  text={option.text.pt}
                  className="text-xs text-gray-400 font-bold"
                />
              </div>
              {isAnswered && option.isCorrect && <CheckCircle2 className="text-green-500 shrink-0 relative z-10 animate-bounce" size={24} />}
              {isAnswered && isSelected && !option.isCorrect && <XCircle className="text-red-500 shrink-0 relative z-10" size={24} />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isAnswered && currentQuiz.explanation.pt && !currentQuiz.explanation.pt.includes('Sem explicação disponível') && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50/80 border border-blue-100/80 rounded-2xl p-6 mb-8 text-blue-900 relative shadow-md shadow-blue-500/5 backdrop-blur-sm"
          >
            {currentQuiz.explanation.es && (
              <button 
                onClick={() => playAudio(currentQuiz.explanation.es, 'es-ES', audioSpeed)}
                className="absolute top-5 right-5 p-2 text-blue-400 hover:text-blue-600 bg-white border border-blue-100 rounded-xl transition-all shadow-sm"
              >
                <Volume2 size={18} />
              </button>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6321] mb-2">
              Análise & Explicação
            </p>
            {currentQuiz.explanation.es && (
              <p className="leading-relaxed font-bold text-gray-800 mb-3 pr-10 text-sm md:text-base">
                 {currentQuiz.explanation.es}
              </p>
            )}
            <HiddenTranslation 
              text={currentQuiz.explanation.pt}
              className="leading-relaxed text-xs font-bold text-gray-500 pr-10"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
            isAnswered 
            ? 'bg-[#FF6321] text-white hover:bg-orange-600' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed hidden'
          }`}
        >
          Próximo
          <ArrowRight size={20} />
        </button>
      </div>

    </div>
  );
}
