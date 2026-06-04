import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Layers, CheckSquare, Tag, Star, Bookmark, ChevronRight } from 'lucide-react';

const goTo = (tab: string) =>
  window.dispatchEvent(new CustomEvent('cap_navigate', { detail: { tab } }));

export default function Estudar() {
  const { stats } = useAppContext();

  const favCount =
    (stats.favoriteQuestionIds?.length || 0) + (stats.favoriteCardIds?.length || 0);
  const difficultCount =
    (stats.difficultQuestionIds?.length || 0) + (stats.difficultCardIds?.length || 0);

  const cards = [
    {
      tab: 'study',
      icon: Layers,
      label: 'Flashcards',
      description: 'Aprenda vocabulário e conceitos em espanhol',
      bg: 'bg-emerald-50',
      color: 'text-emerald-600',
      badge: null as number | null,
    },
    {
      tab: 'practice',
      icon: CheckSquare,
      label: 'Quiz',
      description: 'Pratique com questões reais do CAP',
      bg: 'bg-blue-50',
      color: 'text-blue-600',
      badge: null as number | null,
    },
    {
      tab: 'practice',
      icon: Tag,
      label: 'Por Categoria',
      description: 'Escolha um tema e treine focado',
      bg: 'bg-indigo-50',
      color: 'text-indigo-600',
      badge: null as number | null,
    },
    {
      tab: 'review',
      icon: Star,
      label: 'Favoritos',
      description: 'Questões e cartões que você salvou',
      bg: 'bg-yellow-50',
      color: 'text-yellow-600',
      badge: favCount > 0 ? favCount : null,
    },
    {
      tab: 'review',
      icon: Bookmark,
      label: 'Difíceis',
      description: 'Cartões e questões marcados como difíceis',
      bg: 'bg-red-50',
      color: 'text-red-500',
      badge: difficultCount > 0 ? difficultCount : null,
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Estudar</h2>
        <p className="text-sm text-gray-500 font-medium mt-0.5">Escolha como quer praticar hoje</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              onClick={() => goTo(card.tab)}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all text-left"
            >
              <div className={`p-3 ${card.bg} ${card.color} rounded-xl shrink-0`}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{card.label}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
                  {card.description}
                </p>
              </div>
              {card.badge !== null && (
                <span className="bg-[#FF6321] text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                  {card.badge}
                </span>
              )}
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
