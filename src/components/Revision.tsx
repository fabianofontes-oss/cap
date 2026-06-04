import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Star, AlertOctagon, HelpCircle, Volume2, Trash2, Check, BookOpen, Layers, Sparkles } from 'lucide-react';
import { playAudio } from '../lib/audio';
import { HiddenTranslation } from './HiddenTranslation';

export default function Revision() {
  const {
    stats,
    flashcards,
    quizzes,
    audioSpeed,
    toggleFavoriteQuestion,
    toggleFavoriteCard,
    toggleDifficultCard,
    recordCardProgress,
    canAccessFeature,
    triggerUpgradeModal
  } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState<'questions_fav' | 'cards_fav' | 'cards_diff' | 'hospital'>('questions_fav');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter items based on stats arrays
  const favoriteQuestions = quizzes.filter(q => stats.favoriteQuestionIds?.includes(q.id));
  const favoriteCards = flashcards.filter(c => stats.favoriteCardIds?.includes(c.id));
  const difficultCards = flashcards.filter(c => stats.difficultCardIds?.includes(c.id));
  
  // Hospital of errors: errorCounts is Record<questionId, count>
  const errorCounts = (stats.errorCounts || {}) as Record<string, number>;
  const errorEntries = Object.entries(errorCounts).filter(([_, count]) => count > 0);
  const hospitalQuestions = quizzes.filter(q => (errorCounts[q.id] || 0) > 0);

  const isPremiumErrors = canAccessFeature('fullErrorReview');
  const displayedHospitalQuestions = isPremiumErrors ? hospitalQuestions : hospitalQuestions.slice(0, 3);

  // Helper count badges
  const countStats = {
    questions_fav: favoriteQuestions.length,
    cards_fav: favoriteCards.length,
    cards_diff: difficultCards.length,
    hospital: hospitalQuestions.length,
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Dynamic revision header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-gray-800 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-gray-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#FF6321]/10 rounded-full blur-3xl"></div>
        <div className="space-y-2 relative z-10">
          <span className="text-[10px] uppercase font-black tracking-widest bg-[#FF6321] text-white px-3 py-1 rounded-full border border-orange-500/10">
            Painel de Revisão
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consolide seu Aprendizado</h2>
          <p className="text-gray-300 text-xs md:text-sm font-medium">Revisar erros, itens salvos e difíceis regularmente acelera a sua aprovação no CAP.</p>
        </div>
        <div className="flex items-center gap-4 relative z-10 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl shrink-0 backdrop-blur-sm">
          <div className="text-center px-2">
            <div className="text-2xl font-black text-yellow-400">{countStats.questions_fav + countStats.cards_fav}</div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Favoritos</div>
          </div>
          <div className="w-px h-8 bg-white/15"></div>
          <div className="text-center px-2">
            <div className="text-2xl font-black text-red-400">{countStats.cards_diff}</div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Difíceis</div>
          </div>
          <div className="w-px h-8 bg-white/15"></div>
          <div className="text-center px-2">
            <div className="text-2xl font-black text-orange-400">{countStats.hospital}</div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-sans">Hospital</div>
          </div>
        </div>
      </div>

      {/* Revision Dashboard Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'questions_fav', count: countStats.questions_fav, label: 'Questões Fav.', icon: Star, color: 'text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 active:border-yellow-300', borderColor: 'border-yellow-200' },
          { id: 'cards_fav', count: countStats.cards_fav, label: 'Cards Fav.', icon: Star, color: 'text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 active:border-amber-300', borderColor: 'border-amber-200' },
          { id: 'cards_diff', count: countStats.cards_diff, label: 'Cards Difíceis', icon: AlertOctagon, color: 'text-red-500 bg-red-500/5 hover:bg-red-500/10 active:border-red-300', borderColor: 'border-red-200' },
          { id: 'hospital', count: countStats.hospital, label: 'Erradas / Hospital', icon: HelpCircle, color: 'text-orange-500 bg-[#FF6321]/5 hover:bg-orange-500/10 active:border-orange-300', borderColor: 'border-orange-100' },
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer ${
                isSelected 
                  ? `bg-white shadow-md ${tab.borderColor} ring-2 ring-offset-2 ring-[#FF6321]/15` 
                  : 'bg-white border-gray-100/90 hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className={`p-2 rounded-xl ${tab.color}`}>
                  <Icon size={18} className={isSelected && tab.id.includes('fav') ? "fill-current" : ""} />
                </span>
                <span className={`text-2xl font-black ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                  {tab.count}
                </span>
              </div>
              <div className="space-y-0.5">
                <p className={`text-xs font-bold leading-none ${isSelected ? 'text-gray-900 font-extrabold' : 'text-gray-500'}`}>
                  {tab.label}
                </p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ver itens</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Revision Area Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 min-h-[300px] flex flex-col">
        <AnimatePresence mode="wait">
          {activeSubTab === 'questions_fav' && (
            <motion.div
              key="questions_fav"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 flex-1"
            >
              <div className="border-b border-gray-50 pb-4">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <Star size={20} className="fill-yellow-400 text-yellow-500" />
                  Questões Favoritadas
                </h3>
                <p className="text-gray-400 text-xs mt-1">Sua seleção de perguntas marcadas com estrela durante Simulados e Práticas.</p>
              </div>

              {favoriteQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                  <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-100">
                    <Star size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">Você ainda não salvou nenhum item.</h4>
                    <p className="text-gray-500 text-sm max-w-sm mt-1">Toque na estrela durante o estudo para guardar.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {favoriteQuestions.map(q => {
                    const isExpanded = !!expandedItems[q.id];
                    return (
                      <div key={q.id} className="border border-gray-100 rounded-2xl p-4 md:p-5 transition-shadow hover:shadow-xs space-y-3 bg-gray-50/30">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            <span className="text-[9px] font-black uppercase text-[#FF6321] tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                              {q.category}
                            </span>
                            <h4 className="font-bold text-gray-800 text-base mt-2">{q.question.es}</h4>
                            <p className="text-gray-500 text-xs italic">{q.question.pt}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleExpand(q.id)}
                              className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-gray-600 text-xs font-bold px-2.5 shadow-xs"
                            >
                              {isExpanded ? 'Esconder' : 'Ver Resposta'}
                            </button>
                            <button
                              onClick={() => toggleFavoriteQuestion(q.id)}
                              className="p-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 shadow-xs"
                              title="Remover dos favoritos"
                            >
                              <Star size={14} className="fill-yellow-400" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white p-4 rounded-xl border border-gray-100 mt-4 space-y-4 text-sm"
                          >
                            <div className="space-y-2">
                              <p className="text-xs font-black uppercase tracking-wider text-gray-450">Opções Disponíveis:</p>
                              {q.options.map(option => (
                                <div 
                                  key={option.id} 
                                  className={`p-3 rounded-xl border flex items-center justify-between ${
                                    option.isCorrect 
                                      ? 'bg-green-50 border-green-200 text-green-800 font-semibold' 
                                      : 'bg-white border-gray-150 text-gray-600'
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium text-xs md:text-sm">{option.text.es}</p>
                                    <p className="text-[11px] opacity-85">{option.text.pt}</p>
                                  </div>
                                  {option.isCorrect && <Check size={16} className="text-green-600 shrink-0 ml-2" />}
                                </div>
                              ))}
                            </div>

                            {q.explanation && (
                              <div className="bg-orange-50/30 border border-orange-100/60 p-4 rounded-xl space-y-2">
                                <h5 className="text-xs font-black uppercase text-[#FF6321] tracking-widest">Explicação Oficial:</h5>
                                <p className="text-gray-700 text-xs md:text-sm font-medium leading-relaxed">{q.explanation.es}</p>
                                <p className="text-gray-500 text-xs leading-relaxed italic">{q.explanation.pt}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'cards_fav' && (
            <motion.div
              key="cards_fav"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 flex-1"
            >
              <div className="border-b border-gray-50 pb-4">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <Star size={20} className="fill-amber-400 text-amber-500" />
                  Flashcards Favoritados
                </h3>
                <p className="text-gray-400 text-xs mt-1 font-medium">Sua seleção de cartões de repetição espaçada favoritos.</p>
              </div>

              {favoriteCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100">
                    <Star size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">Você ainda não salvou nenhum item.</h4>
                    <p className="text-gray-500 text-sm max-w-sm mt-1">Toque na estrela durante o estudo para guardar.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {favoriteCards.map(c => {
                    const isExpanded = !!expandedItems[c.id];
                    return (
                      <div key={c.id} className="border border-gray-100 rounded-2xl p-4 md:p-5 transition-shadow hover:shadow-xs space-y-2 bg-gray-50/30">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              {c.category}
                            </span>
                            <h4 className="font-bold text-gray-805 text-base mt-2">{c.front.es}</h4>
                            <p className="text-gray-500 text-xs italic">{c.front.pt}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleExpand(c.id)}
                              className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-450 hover:text-gray-600 text-xs font-bold px-2.5 shadow-xs"
                            >
                              {isExpanded ? 'Ocultar' : 'Revelar Verso'}
                            </button>
                            <button
                              onClick={() => toggleFavoriteCard(c.id)}
                              className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 shadow-xs"
                              title="Remover dos favoritos"
                            >
                              <Star size={14} className="fill-amber-400" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white p-4 rounded-xl border border-gray-100 mt-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Resposta</span>
                                <p className="font-bold text-gray-800 text-sm md:text-base mt-1">{c.back.es}</p>
                                <p className="text-gray-500 text-xs italic">{c.back.pt}</p>
                              </div>
                              <button
                                onClick={() => playAudio(c.back.es, 'es-ES', audioSpeed)}
                                className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50 text-[#FF6321] shrink-0"
                                title="Ouvir Resposta"
                              >
                                <Volume2 size={16} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'cards_diff' && (
            <motion.div
              key="cards_diff"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 flex-1"
            >
              <div className="border-b border-gray-50 pb-4">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <AlertOctagon size={20} className="text-red-500" />
                  Flashcards Inteligentes: Difíceis
                </h3>
                <p className="text-gray-400 text-xs mt-1 font-medium">Estes cartões de repetição automática foram sinalizados como desafiadores por você.</p>
              </div>

              {difficultCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                  <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 border border-red-100">
                    <AlertOctagon size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">Você ainda não marcou nenhum card como difícil.</h4>
                    <p className="text-gray-500 text-sm max-w-sm mt-1">Ao estudar flashcards, toque em Difícil para revisar depois.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {difficultCards.map(c => {
                    const isExpanded = !!expandedItems[c.id];
                    return (
                      <div key={c.id} className="border border-red-100/60 rounded-2xl p-4 md:p-5 transition-shadow hover:shadow-xs space-y-2 bg-red-50/5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            <span className="text-[9px] font-black uppercase text-red-650 tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-100/50">
                              {c.category}
                            </span>
                            <h4 className="font-bold text-gray-850 text-base mt-2">{c.front.es}</h4>
                            <p className="text-gray-500 text-xs italic">{c.front.pt}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleExpand(c.id)}
                              className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-450 hover:text-gray-650 text-xs font-bold px-2.5 shadow-xs"
                            >
                              {isExpanded ? 'Esconder' : 'Ver Resposta'}
                            </button>
                            <button
                              onClick={() => recordCardProgress(c.id, true)}
                              className="p-2 rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 shadow-xs flex items-center gap-1 text-xs font-black uppercase tracking-wider"
                              title="Marcar como Fácil (remover da lista difícil)"
                            >
                              <Check size={14} />
                              <span>Fácil!</span>
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white p-4 rounded-xl border border-gray-100 mt-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Resposta</span>
                                <p className="font-bold text-gray-820 text-sm md:text-base mt-1">{c.back.es}</p>
                                <p className="text-gray-500 text-xs italic">{c.back.pt}</p>
                              </div>
                              <button
                                onClick={() => playAudio(c.back.es, 'es-ES', audioSpeed)}
                                className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50 text-[#FF6321] shrink-0"
                                title="Ouvir Resposta"
                              >
                                <Volume2 size={16} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'hospital' && (
            <motion.div
              key="hospital"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 flex-1"
            >
              <div className="border-b border-gray-50 pb-4">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <HelpCircle size={20} className="text-orange-500" />
                  Hospital de Erros (Simulados & Práticas)
                </h3>
                <p className="text-gray-400 text-xs mt-1 font-medium">As perguntas que você já errou em testes. Elas são removidas conforme você as acerta novamente nos treinos.</p>
              </div>

              {displayedHospitalQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                  <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-100">
                    <Check size={32} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#FF6321] text-lg">Você ainda não tem questões no Hospital de Erros.</h4>
                    <p className="text-gray-500 text-sm max-w-sm mt-1">Continue praticando.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedHospitalQuestions.map(q => {
                    const isExpanded = !!expandedItems[q.id];
                    const errorCount = stats.errorCounts?.[q.id] || 0;
                    return (
                      <div key={q.id} className="border border-orange-100 rounded-2xl p-4 md:p-5 transition-shadow hover:shadow-xs space-y-2 bg-orange-50/5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase text-orange-600 tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                {q.category}
                              </span>
                              <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse">
                                Erros: {errorCount}x
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-800 text-base mt-2">{q.question.es}</h4>
                            <p className="text-gray-500 text-xs italic">{q.question.pt}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleExpand(q.id)}
                              className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-450 hover:text-gray-650 text-xs font-bold px-2.5 shadow-xs"
                            >
                              {isExpanded ? 'Ocultar' : 'Ver Resposta'}
                            </button>
                            <button
                              onClick={() => playAudio(q.question.es, 'es-ES', audioSpeed)}
                              className="p-2 rounded-lg border border-gray-100 bg-white text-gray-450 hover:text-[#FF6321] shadow-xs"
                              title="Ouvir Pergunta"
                            >
                              <Volume2 size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white p-4 rounded-xl border border-gray-100 mt-4 space-y-4 text-sm"
                          >
                            <div className="space-y-2">
                              <p className="text-xs font-black uppercase tracking-wider text-gray-450">Alternativas do Treino:</p>
                              {q.options.map(option => (
                                <div 
                                  key={option.id} 
                                  className={`p-3 rounded-xl border flex items-center justify-between ${
                                    option.isCorrect 
                                      ? 'bg-green-50 border-green-200 text-green-800 font-semibold shadow-xs' 
                                      : 'bg-white border-gray-150 text-gray-600'
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium text-xs md:text-sm">{option.text.es}</p>
                                    <p className="text-[11px] opacity-85">{option.text.pt}</p>
                                  </div>
                                  {option.isCorrect && <Check size={16} className="text-green-600 shrink-0 ml-2" />}
                                </div>
                              ))}
                            </div>

                            {q.explanation && (
                              <div className="bg-orange-50/30 border border-orange-100/65 p-4 rounded-xl space-y-2">
                                <h5 className="text-xs font-black uppercase text-[#FF6321] tracking-widest">Explicação Oficial:</h5>
                                <p className="text-gray-700 text-xs md:text-sm font-medium leading-relaxed">{q.explanation.es}</p>
                                <p className="text-gray-500 text-xs leading-relaxed italic">{q.explanation.pt}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}

                  {hospitalQuestions.length > 3 && !isPremiumErrors && (
                    <div className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100/30 border border-orange-200/40 text-center space-y-4">
                      <Sparkles className="mx-auto text-[#FF6321] animate-pulse" size={28} />
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-gray-805">Hospital de Erros Limitador ({hospitalQuestions.length - 3} mais questões ocultas)</h4>
                        <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
                          Você está visualizando apenas os primeiros 3 erros cometidos. O Hospital de Erros Completo e Ilimitado é um recurso exclusivo do CAP Master Pró.
                        </p>
                      </div>
                      <button 
                        onClick={() => triggerUpgradeModal()}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#FF6321] to-[#FF8A50] text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-md hover:bg-orange-600 transition-all active:scale-95 text-center block mx-auto"
                      >
                        Ver planos do CAP Master
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
