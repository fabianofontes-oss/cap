import React from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Flame, ArrowRight, CheckSquare, Timer,
  Bookmark, AlertOctagon, Award, Star,
  TrendingDown, BookOpen, Layers
} from 'lucide-react';

export default function Dashboard() {
  const { stats, quizzes, user, dataLoaded } = useAppContext();

  const goTo = (tab: string) =>
    window.dispatchEvent(new CustomEvent('cap_navigate', { detail: { tab } }));

  if (!dataLoaded) {
    return <div className="text-center p-8 text-gray-500">Sincronizando com o banco oficial...</div>;
  }

  // ── Progress ────────────────────────────────────────────────────────────────
  const xpInLevel = (stats.xp || 0) % 100;
  const accuracy =
    (stats.totalAnswers || 0) > 0
      ? Math.round(((stats.correctAnswers || 0) / stats.totalAnswers) * 100)
      : 0;

  // ── Counters ────────────────────────────────────────────────────────────────
  const hospitalCount = Object.keys(stats.errorCounts || {}).filter(
    k => (stats.errorCounts?.[k] || 0) >= 2
  ).length;
  const favoritesCount =
    (stats.favoriteQuestionIds?.length || 0) + (stats.favoriteCardIds?.length || 0);
  const difficultCount =
    (stats.difficultQuestionIds?.length || 0) + (stats.difficultCardIds?.length || 0);

  // ── Weak categories (from errorCounts × quizzes) ────────────────────────────
  const errorsByCategory: Record<string, number> = {};
  const errorCounts: Record<string, number> = stats.errorCounts || {};
  Object.entries(errorCounts).forEach(([qId, count]) => {
    const q = quizzes.find(q => q.id === qId);
    if (q) errorsByCategory[q.category] = (errorsByCategory[q.category] || 0) + count;
  });
  const weakCats = Object.entries(errorsByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);
  const hasWeakData = weakCats.length > 0;

  // ── Smart next step ─────────────────────────────────────────────────────────
  const isNew = !(stats.quizzesTaken || 0) && !(stats.cardsStudied || 0);
  const nextTab = hospitalCount > 0 ? 'review' : isNew ? 'study' : 'practice';
  const nextLabel =
    hospitalCount > 0
      ? `Revisar ${hospitalCount} erro${hospitalCount !== 1 ? 's' : ''} no Hospital`
      : isNew
      ? 'Começar com Flashcards'
      : 'Continuar no Quiz';
  const nextSub =
    hospitalCount > 0
      ? 'Hospital de Erros · Aba Revisão'
      : isNew
      ? 'Estudo de flashcards básicos'
      : `${stats.quizzesTaken || 0} treino${(stats.quizzesTaken || 0) !== 1 ? 's' : ''} completo${(stats.quizzesTaken || 0) !== 1 ? 's' : ''}`;

  // ── Greeting ────────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const name = user?.displayName?.split(' ')[0] || 'Piloto';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-4">

      {/* Greeting */}
      <div className="pt-1">
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Painel do Aluno</p>
        <h2 className="text-2xl font-black text-gray-800">{greeting}, {name}! 👋</h2>
        <p className="text-sm text-gray-400 font-medium mt-0.5">Pronto para estudar CAP hoje?</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Award size={18} className="text-[#FF6321]" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nível</p>
              <p className="text-xl font-black text-gray-800">{stats.level || 1}</p>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1">
              <span>{xpInLevel} XP</span>
              <span>100 XP</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6321] to-orange-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(xpInLevel, 100)}%` }}
              />
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] text-gray-400 font-bold">Total</p>
            <p className="text-lg font-black text-[#FF6321]">{stats.xp || 0} XP</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame size={15} className="text-orange-500" />
              <span className="text-lg font-black text-gray-800">{stats.streak || 0}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Dias seguidos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-gray-800 mb-1">{stats.totalAnswers || 0}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Questões</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-black mb-1 ${accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
              {accuracy}%
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Acerto geral</p>
          </div>
        </div>
      </div>

      {/* Main CTA */}
      <button
        onClick={() => goTo(nextTab)}
        className="w-full flex items-center justify-between bg-[#FF6321] hover:bg-orange-600 text-white px-6 py-5 rounded-3xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] hover:-translate-y-0.5"
      >
        <div className="text-left">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-75 mb-0.5">Próximo passo</p>
          <p className="text-lg font-black leading-tight">{nextLabel}</p>
          <p className="text-xs opacity-70 font-medium mt-0.5">{nextSub}</p>
        </div>
        <div className="p-3 bg-white/20 rounded-2xl shrink-0 ml-4">
          <ArrowRight size={22} />
        </div>
      </button>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Atalhos rápidos</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Fazer Quiz', sub: 'Prática com questões', icon: CheckSquare, tab: 'practice', color: 'bg-blue-50 text-blue-600', ring: 'border-blue-100' },
            { label: 'Simulado Rápido', sub: '10 questões · 15 min', icon: Timer, tab: 'simulado', color: 'bg-purple-50 text-purple-600', ring: 'border-purple-100' },
            { label: 'Revisar Erros', sub: `${hospitalCount} no Hospital`, icon: AlertOctagon, tab: 'review', color: 'bg-red-50 text-red-500', ring: 'border-red-100' },
            { label: 'Flashcards', sub: 'Estudo por cartões', icon: Layers, tab: 'study', color: 'bg-emerald-50 text-emerald-600', ring: 'border-emerald-100' },
          ].map(({ label, sub, icon: Icon, tab, color, ring }) => (
            <button
              key={tab + label}
              onClick={() => goTo(tab)}
              className={`flex items-center gap-3 p-4 bg-white rounded-2xl border ${ring} hover:shadow-sm transition-all active:scale-[0.97] text-left`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-black text-xs text-gray-800 truncate">{label}</p>
                <p className="text-[10px] text-gray-400 font-medium truncate">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Extras: Favoritos + Difíceis */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => goTo('review')}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-yellow-100 hover:shadow-sm transition-all active:scale-[0.97] text-left"
          >
            <div className="p-2 rounded-xl shrink-0 bg-yellow-50 text-yellow-500">
              <Star size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-xs text-gray-800">Favoritos</p>
              <p className="text-[10px] text-gray-400 font-medium">{favoritesCount} itens salvos</p>
            </div>
          </button>
          <button
            onClick={() => goTo('review')}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-red-100 hover:shadow-sm transition-all active:scale-[0.97] text-left"
          >
            <div className="p-2 rounded-xl shrink-0 bg-red-50 text-red-500">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-xs text-gray-800">Difíceis</p>
              <p className="text-[10px] text-gray-400 font-medium">{difficultCount} marcados</p>
            </div>
          </button>
        </div>
      </div>

      {/* Weak Categories */}
      <div className={`rounded-3xl border p-5 space-y-3 ${hasWeakData ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <TrendingDown size={16} className={hasWeakData ? 'text-orange-500' : 'text-gray-400'} />
          <p className="text-xs font-black text-gray-800 uppercase tracking-wider">Temas para Reforçar</p>
        </div>
        {hasWeakData ? (
          <>
            <div className="flex flex-wrap gap-2">
              {weakCats.map(cat => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-white text-orange-700 border border-orange-200 rounded-full text-xs font-bold shadow-xs"
                >
                  {cat}
                </span>
              ))}
            </div>
            <button
              onClick={() => goTo('practice')}
              className="flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-600 transition-colors"
            >
              Praticar estas categorias <ArrowRight size={12} />
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            Responda alguns quizzes para descobrir seus temas fracos.
          </p>
        )}
      </div>

      {/* Revision Counters */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Revisão</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => goTo('review')}
            className="flex flex-col items-center gap-1.5 p-4 bg-white rounded-2xl border border-red-100 hover:shadow-sm transition-all active:scale-[0.97]"
          >
            <AlertOctagon size={20} className="text-red-500" />
            <p className="text-lg font-black text-gray-800">{hospitalCount}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight text-center">Hospital de Erros</p>
          </button>
          <button
            onClick={() => goTo('review')}
            className="flex flex-col items-center gap-1.5 p-4 bg-white rounded-2xl border border-yellow-100 hover:shadow-sm transition-all active:scale-[0.97]"
          >
            <Star size={20} className="text-yellow-500" />
            <p className="text-lg font-black text-gray-800">{favoritesCount}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight text-center">Favoritos</p>
          </button>
          <button
            onClick={() => goTo('review')}
            className="flex flex-col items-center gap-1.5 p-4 bg-white rounded-2xl border border-red-100 hover:shadow-sm transition-all active:scale-[0.97]"
          >
            <Bookmark size={20} className="text-red-400" />
            <p className="text-lg font-black text-gray-800">{difficultCount}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight text-center">Difíceis</p>
          </button>
        </div>
      </div>

    </div>
  );
}
