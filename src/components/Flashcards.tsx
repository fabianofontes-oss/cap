import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { Flashcard } from '../types';
import { ChevronRight, ChevronLeft, Check, X, RotateCcw, Volume2, Filter, Star, AlertOctagon } from 'lucide-react';
import { playAudio } from '../lib/audio';
import { HiddenTranslation } from './HiddenTranslation';

export default function Flashcards() {
  const { 
    recordStudySession, 
    recordCardProgress, 
    stats, 
    flashcards, 
    dataLoaded, 
    audioSpeed,
    toggleFavoriteCard,
    toggleDifficultCard,
    favoriteLimitReached,
    setFavoriteLimitReached
  } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsStudiedThisSession, setCardsStudiedThisSession] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [deckKey, setDeckKey] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    if (!dataLoaded) return;
    const today = new Date().toISOString().split('T')[0];
    const dueCards = flashcards.filter(card => {
      // Category filter
      if (selectedCategory === '⭐ Favoritos') {
         return stats.favoriteCardIds?.includes(card.id);
      }
      if (selectedCategory === '🔴 Difíceis') {
         return stats.difficultCardIds?.includes(card.id);
      }
      if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
      
      // Spaced repetition check
      const cardProgress = stats.cardProgress?.[card.id];
      if (!cardProgress) return true; // New card
      return cardProgress.nextReview <= today; // Due for review
    });

    const shuffled = [...dueCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCardsStudiedThisSession(0);
    // We intentionally exclude stats.cardProgress from dependencies 
    // to prevent reshuffling the current deck while studying
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, dataLoaded, deckKey, flashcards, stats.favoriteCardIds, stats.difficultCardIds]);

  const categories = ['All', '⭐ Favoritos', '🔴 Difíceis', ...Array.from(new Set(flashcards.map(c => c.category)))];

  if (!dataLoaded) {
    return <div className="text-center p-8 text-gray-500">Sincronizando com o banco oficial...</div>;
  }

  if (cards.length === 0 && currentIndex !== -1) {
     let title = "Tudo em dia!";
     let desc = `Você não tem cartões pendentes de revisão ${selectedCategory !== 'All' ? `em ${selectedCategory}` : 'agora'}.`;
     
     if (selectedCategory === '⭐ Favoritos') {
       title = "Sem Favoritos";
       desc = "Você ainda não salvou nenhum item. Toque na estrela durante o estudo para guardar.";
     } else if (selectedCategory === '🔴 Difíceis') {
       title = "Sem Cartões Difíceis";
       desc = "Você ainda não marcou nenhum card como difícil. Ao estudar flashcards, toque em Difícil para revisar depois.";
     }

     return (
       <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-4">
            <Check size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">
            {title}
          </h2>
          <p className="text-gray-500 text-lg max-w-sm">
            {desc}
          </p>
          <button
            onClick={() => setSelectedCategory('All')}
            className="flex items-center gap-2 bg-[#FF6321] text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            Ver Todas Categorias
          </button>
       </div>
     )
  }

  const currentCard = cards[currentIndex];

  const handleNext = (isEasy?: boolean) => {
    if (isEasy !== undefined && currentCard) {
      recordCardProgress(currentCard.id, isEasy);
    }

    setIsFlipped(false);
    setCardsStudiedThisSession(prev => prev + 1);
    
    if (currentIndex < cards.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      // Session complete
      recordStudySession(cardsStudiedThisSession + 1);
      setCurrentIndex(-1); // Signifies completion state
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const restart = () => {
    setDeckKey(prev => prev + 1);
    setCurrentIndex(0);
  };

  if (currentIndex === -1) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4">
          <Check size={48} />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">
          Sessão Concluída!
        </h2>
        <p className="text-gray-500 text-lg">
          Você estudou {cardsStudiedThisSession} cartões.
        </p>
        <button
          onClick={restart}
          className="flex items-center gap-2 bg-[#FF6321] text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
        >
          <RotateCcw size={20} />
          Recomeçar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Category Filter */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-4 mb-4 hide-scrollbar">
         <div className="flex items-center text-gray-400 shrink-0 mr-2">
           <Filter size={18} />
         </div>
         {categories.map(cat => (
           <button
             key={cat}
             onClick={() => setSelectedCategory(cat)}
             className={`px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-colors ${
               selectedCategory === cat 
                 ? 'bg-[#FF6321] text-white shadow-sm' 
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

      <div className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-6 text-sm text-gray-500 font-medium px-4">
        <span className="uppercase tracking-widest font-bold text-gray-400">{currentCard.category}</span>
        <span className="font-mono text-xs font-bold">{currentIndex + 1} / {cards.length}</span>
      </div>

      <div 
        className="relative w-full aspect-[4/3] md:aspect-[3/2] cursor-pointer group perspective-1000"
        onClick={handleFlip}
      >
        <motion.div
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          className="w-full h-full relative preserve-3d"
        >
          {/* Front of card */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white border border-gray-100 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] p-8 flex flex-col items-center justify-center text-center transition-all duration-300 group-hover:shadow-[0_12px_45px_rgba(255,100,33,0.06)] group-hover:border-orange-100">
            <span className="absolute top-6 left-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
              Pergunta
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFavoriteCard(currentCard.id); }}
              className={`absolute top-5 right-[68px] p-2.5 rounded-xl shadow-sm border transition-all ${
                stats.favoriteCardIds?.includes(currentCard.id)
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-500 hover:bg-yellow-100'
                  : 'bg-white border-gray-100 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
              title="Favoritar Cartão"
            >
               <Star size={20} className={stats.favoriteCardIds?.includes(currentCard.id) ? "fill-yellow-400" : ""} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); playAudio(currentCard.front.es, 'es-ES', audioSpeed); }}
              className="absolute top-5 right-5 p-2.5 rounded-xl text-gray-400 hover:text-[#FF6321] hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm border border-gray-100/80 bg-white"
            >
               <Volume2 size={20} />
            </button>
            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-800 leading-tight tracking-tight">
              {currentCard.front.es}
            </h3>
            <HiddenTranslation 
              text={currentCard.front.pt}
              className="text-sm md:text-base text-gray-400 mt-6 font-bold"
            />
            <div className="absolute bottom-6 flex items-center gap-1 text-[#FF6321] opacity-70">
              <span className="text-xs font-bold uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full border border-orange-200/50">Toque para Girar</span>
            </div>
          </div>

          {/* Back of card with beautiful warm gradient */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-[#FF6321] to-[#E54800] text-white rounded-3xl shadow-[0_12px_40px_rgba(255,100,33,0.2)] p-8 flex flex-col items-center justify-center text-center [transform:rotateY(180deg)] border border-[#E54800]/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            <span className="absolute top-6 left-6 text-[10px] font-black text-white/70 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-md border border-white/10">
              Resposta
            </span>
             <button 
              onClick={(e) => { e.stopPropagation(); toggleFavoriteCard(currentCard.id); }}
              className={`absolute top-5 right-[68px] p-2.5 rounded-xl transition-all shadow-sm bg-white/5 ${
                stats.favoriteCardIds?.includes(currentCard.id)
                  ? 'border border-yellow-300 text-yellow-300 bg-white/10'
                  : 'border border-white/15 text-white/70 hover:text-yellow-300 hover:bg-white/10'
              }`}
              title="Favoritar Cartão"
             >
                <Star size={20} className={stats.favoriteCardIds?.includes(currentCard.id) ? "fill-yellow-300" : ""} />
             </button>
             <button 
              onClick={(e) => { e.stopPropagation(); playAudio(currentCard.back.es, 'es-ES', audioSpeed); }}
              className="absolute top-5 right-5 p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-all shadow-sm border border-white/15 bg-white/5"
            >
               <Volume2 size={20} />
            </button>
            <p className="text-xl md:text-2xl font-black leading-relaxed tracking-tight">
              {currentCard.back.es.replace(/Sem explicação disponível\./g, '').trim()}
            </p>
            <HiddenTranslation 
              text={currentCard.back.pt.replace(/Sem explicação disponível\./g, '').trim()}
              className="text-md md:text-lg text-white/90 mt-6 italic font-bold leading-relaxed"
            />
          </div>
        </motion.div>
      </div>

      <div className="flex gap-4 mt-8 w-full justify-center items-center">
        {isFlipped ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4 w-full max-w-sm">
            <button onClick={() => handleNext(false)} className="flex-1 bg-red-100 text-red-600 px-6 py-4 rounded-2xl font-bold hover:bg-red-200 transition-colors">
              Difícil
            </button>
            <button onClick={() => handleNext(true)} className="flex-1 bg-green-100 text-green-600 px-6 py-4 rounded-2xl font-bold hover:bg-green-200 transition-colors">
              Fácil
            </button>
          </motion.div>
        ) : (
           <div className="h-14"></div> // Spacer to prevent layout shift
        )}
      </div>
    </div>
  );
}
