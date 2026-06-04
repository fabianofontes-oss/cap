import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { QuizQuestion } from '../types';
import { 
  Award, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Star, 
  Bookmark, 
  Volume2, 
  Target, 
  TrendingUp,
  AlertTriangle,
  Home,
  ListChecks,
  GraduationCap
} from 'lucide-react';
import { playAudio } from '../lib/audio';
import { HiddenTranslation } from './HiddenTranslation';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

interface DetailedResultsProps {
  questions: QuizQuestion[];
  answers: Record<string, string>; // questionId -> optionId
  timesSpent: Record<string, number>; // questionId -> seconds
  onRestart: () => void;
  title: string;
  isSimulado?: boolean;
  isOfficialSimulado?: boolean;
}

export default function DetailedResults({
  questions,
  answers,
  timesSpent,
  onRestart,
  title,
  isSimulado = false,
  isOfficialSimulado = false
}: DetailedResultsProps) {
  const { 
    stats, 
    toggleFavoriteQuestion, 
    toggleDifficultQuestion, 
    audioSpeed 
  } = useAppContext();

  // 1. Calculate general statistics
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const goTo = (tab: string) => {
    window.dispatchEvent(new CustomEvent('cap_navigate', { detail: { tab } }));
  };

  const totalQuestions = questions.length;
  let correctCount = 0;
  questions.forEach(q => {
    const selectedOptionId = answers[q.id];
    const correctOption = q.options.find(o => o.isCorrect);
    if (correctOption && selectedOptionId === correctOption.id) {
      correctCount += 1;
    }
  });

  const unansweredCount = questions.filter(q => !answers[q.id]).length;
  const wrongCount = totalQuestions - correctCount - unansweredCount;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // CAP scoring: +1 correct, -0.5 wrong, 0 unanswered
  // Max score = totalQuestions; pass threshold = half of max (official rule)
  const capMax = totalQuestions;
  const capThreshold = capMax / 2;
  const capScore = parseFloat((correctCount * 1 + wrongCount * -0.5).toFixed(2));
  const capPassed = capScore >= capThreshold;

  // pass/fail verdict only applies to quiz (80%) and official simulado (≥ 50 pts)
  // non-official simulado = training mode, no verdict
  const showPassFail = !isSimulado || isOfficialSimulado;
  const isPassed = isOfficialSimulado ? capPassed : (!isSimulado && accuracy >= 80);

  const totalTimeSeconds = Object.values(timesSpent).reduce((acc, curr) => acc + curr, 0);
  const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTimeSeconds / totalQuestions) : 0;

  // Format total study time
  const formatTotalTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  // 2. Performance by Category Calculations
  const categoryStats: Record<string, { total: number; correct: number }> = {};
  questions.forEach(q => {
    const cat = q.category || 'Geral';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, correct: 0 };
    }
    categoryStats[cat].total += 1;
    
    const selectedOptionId = answers[q.id];
    const correctOption = q.options.find(o => o.isCorrect);
    if (correctOption && selectedOptionId === correctOption.id) {
      categoryStats[cat].correct += 1;
    }
  });

  const categoryChartData = Object.entries(categoryStats).map(([name, s]) => {
    const rate = Math.round((s.correct / s.total) * 100);
    return {
      name,
      'Acerto (%)': rate,
      total: s.total,
      correct: s.correct
    };
  });

  // Pie chart data: Correct / Wrong / Unanswered
  const pieChartData = [
    { name: 'Corretas', value: correctCount, color: '#10B981' },
    { name: 'Incorretas', value: wrongCount, color: '#EF4444' },
    { name: 'Não respondidas', value: unansweredCount, color: '#D1D5DB' }
  ].filter(d => d.value > 0);

  // Weak categories: accuracy < 60%
  const weakCategories = categoryChartData.filter(c => c['Acerto (%)'] < 60);

  // Helper to color time spent badge
  const getTimeBadgeColor = (seconds: number) => {
    if (seconds === 0) return 'bg-gray-100 text-gray-400';
    if (seconds < 10) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (seconds < 30) return 'bg-orange-50 text-orange-700 border border-orange-200';
    return 'bg-red-50 text-red-700 border border-red-200';
  };

  const getTimeBadgeLabel = (seconds: number) => {
    if (seconds === 0) return 'N/I';
    if (seconds < 10) return `${seconds}s (Rápido)`;
    if (seconds < 30) return `${seconds}s (Ideal)`;
    return `${seconds}s (Lento)`;
  };

  return (
    <div id="detailed-results-container" className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div 
        id="results-header-banner"
        className={`p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-md ${
          !showPassFail
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
            : isPassed
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
              : 'bg-gradient-to-br from-red-500 to-orange-600 text-white'
        }`}
      >
        <div className="space-y-2 text-center md:text-left z-10">
          <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white">
            {title}
          </span>
          <h2 className="text-3xl font-black tracking-tight">
            {!showPassFail
              ? 'Treino com Regra CAP'
              : isPassed
                ? '¡Enhorabuena! Aprovado'
                : 'Resultado Insuficiente'}
          </h2>
          <p className="text-sm opacity-90 max-w-md font-medium">
            {!showPassFail
              ? `Pontuação estimada pela regra CAP: ${capScore} de ${capMax} pts possíveis. Referência: média mínima seria ${capThreshold} pts. Use este treino para calibrar seu desempenho.`
              : isOfficialSimulado
                ? isPassed
                  ? `Você atingiu ${capScore} pts — acima do mínimo de ${capThreshold} pts (metade de ${capMax}) para aprovação oficial.`
                  : `Você atingiu ${capScore} pts. São necessários ≥ ${capThreshold} pts (metade de ${capMax}). Continue treinando!`
                : isPassed
                  ? 'Você alcançou os critérios mínimos oficiais de aprovação da Espanha (mínimo de 80% de acertos).'
                  : 'Você precisa de pelo menos 80% de acertos para ser aprovado na Espanha. Continue treinando para alcançar o objetivo!'}
          </p>
          {isSimulado && (
            <p className="text-[10px] opacity-70 font-semibold">
              Regra CAP: +1 certa · −0,5 errada · 0 não respondida
            </p>
          )}
        </div>

        <div className="flex flex-col items-center shrink-0 z-10 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center">
          {isSimulado ? (
            <>
              <span className="text-sm font-bold uppercase tracking-wider opacity-85">
                {isOfficialSimulado ? 'Pontos CAP' : 'Pontuação (est.)'}
              </span>
              <span className="text-5xl font-black">{capScore}</span>
              <span className="text-xs font-semibold mt-1 opacity-75">
                {isOfficialSimulado ? `mín ${capThreshold} · máx ${capMax}` : `ref: ${capThreshold} · máx ${capMax}`}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold uppercase tracking-wider opacity-85">Nota Final</span>
              <span className="text-5xl font-black">{accuracy}%</span>
              <span className="text-xs font-semibold mt-1 opacity-75">{correctCount} de {totalQuestions} acertos</span>
            </>
          )}
        </div>

        {/* Floating circles decor */}
        <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-36 h-36 rounded-full bg-white/5 blur-lg pointer-events-none" />
      </div>

      {/* Stats Cards Bento Matrix */}
      <div id="results-stats-cards" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Acertos</p>
            <p className="text-xl font-black text-gray-800">{correctCount} <span className="text-xs text-gray-400 font-bold">/ {totalQuestions}</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-xl">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Erros</p>
            <p className="text-xl font-black text-gray-800">
              {wrongCount}
              {unansweredCount > 0 && (
                <span className="text-xs text-gray-400 font-bold ml-1">+ {unansweredCount} N/R</span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tempo Total</p>
            <p className="text-xl font-black text-gray-800">{formatTotalTime(totalTimeSeconds)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          {isSimulado ? (
            <>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <GraduationCap size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isOfficialSimulado ? 'Pontos CAP' : 'Pontuação (est.)'}
                </p>
                <p className="text-xl font-black text-gray-800">{capScore} <span className="text-xs text-gray-400 font-bold">/ {capMax}</span></p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Target size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aproveitamento</p>
                <p className="text-xl font-black text-gray-800">{accuracy}%</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Visualizations Matrix */}
      <div id="results-charts-container" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Performance by Category Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#FF6321]" />
            <h3 className="font-extrabold text-gray-800 text-base">Precisão por Categoria</h3>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Acerto']}
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    borderRadius: '12px', 
                    color: '#fff',
                    border: 'none',
                    fontSize: '11px'
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="Acerto (%)" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry['Acerto (%)'] >= 80 ? '#10B981' : entry['Acerto (%)'] >= 50 ? '#F97316' : '#EF4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Distribution Card Pie */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-[#FF6321]" />
              <h3 className="font-extrabold text-gray-800 text-base">Distribuição de Respostas</h3>
            </div>

            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      borderRadius: '12px', 
                      color: '#fff',
                      border: 'none',
                      fontSize: '11px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-gray-800">{correctCount}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Corretas</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-50 pt-4">
            <div className="flex justify-between items-center text-xs font-semibold">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Corretas</span>
              </div>
              <span className="font-extrabold">{correctCount} ({accuracy}%)</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Incorretas</span>
              </div>
              <span className="font-extrabold">{wrongCount} ({totalQuestions > 0 ? Math.round(wrongCount / totalQuestions * 100) : 0}%)</span>
            </div>
            {unansweredCount > 0 && (
              <div className="flex justify-between items-center text-xs font-semibold">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span>Não respondidas</span>
                </div>
                <span className="font-extrabold">{unansweredCount}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Category Breakdown list details */}
      <div id="results-category-breakdown-list" className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
        <h3 className="font-extrabold text-gray-850 text-base">Desempenho Detalhado por Categoria</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categoryChartData.map((cat, idx) => {
            const hasGoodRate = cat['Acerto (%)'] >= 80;
            return (
              <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wide truncate max-w-[70%]">
                    {cat.name}
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                    hasGoodRate ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {cat['Acerto (%)']}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      hasGoodRate ? 'bg-emerald-500' : cat['Acerto (%)'] >= 50 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${cat['Acerto (%)']}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {cat.correct} de {cat.total} acertos
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weak Categories Summary */}
      {weakCategories.length > 0 && (
        <div id="results-weak-categories" className="bg-orange-50 border border-orange-100 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500 shrink-0" />
            <h3 className="font-extrabold text-gray-800 text-base">Categorias para Reforçar</h3>
            <span className="text-[10px] font-black bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              abaixo de 60%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weakCategories.map((cat, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 flex items-center justify-between border border-orange-100 shadow-xs">
                <div>
                  <p className="text-xs font-black text-gray-800 truncate max-w-[160px]">{cat.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{cat.correct}/{cat.total} acertos</p>
                </div>
                <span className="text-sm font-black text-red-500">{cat['Acerto (%)']}%</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => goTo('practice')}
            className="flex items-center gap-2 text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-xl transition-colors"
          >
            <GraduationCap size={14} />
            Praticar essas categorias no Quiz
          </button>
        </div>
      )}

      {/* Review Answers (Individual Timing + Accuracy Details) */}
      <div id="results-answers-review-container" className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xl font-bold text-gray-800">Revisão Completa de Perguntas</h3>
          <div className="flex items-center gap-2">
            {wrongCount > 0 && (
              <button
                onClick={() => setShowOnlyErrors(v => !v)}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
                  showOnlyErrors
                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-500'
                }`}
              >
                {showOnlyErrors ? '✕ Só Erros' : `Ver Só Erros (${wrongCount})`}
              </button>
            )}
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total {totalQuestions}</span>
          </div>
        </div>

        <div className="space-y-6">
          {questions.filter(q => {
            if (!showOnlyErrors) return true;
            const selectedOptionId = answers[q.id];
            const correctOption = q.options.find(o => o.isCorrect);
            return !(correctOption && selectedOptionId === correctOption.id);
          }).map((q, idx) => {
            const selectedOptionId = answers[q.id];
            const correctOption = q.options.find(o => o.isCorrect);
            const isCorrect = correctOption && selectedOptionId === correctOption.id;
            const timeSpent = timesSpent[q.id] || 0;

            const isFavorited = stats.favoriteQuestionIds?.includes(q.id);
            const isDifficult = stats.difficultQuestionIds?.includes(q.id);

            return (
              <div 
                key={q.id} 
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs relative space-y-4"
              >
                {/* Header indicators */}
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-gray-100 text-gray-500 font-black px-2.5 py-1 rounded-lg">
                      Questão {idx + 1}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${getTimeBadgeColor(timeSpent)}`}>
                        ⏱️ {getTimeBadgeLabel(timeSpent)}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {/* Favorite and Difficult togglers inside Results Review */}
                    <button
                      onClick={() => toggleFavoriteQuestion(q.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isFavorited
                          ? 'bg-yellow-50 border-yellow-250 text-yellow-600 shadow-xs'
                          : 'bg-white hover:bg-gray-50 border-gray-150 text-gray-400'
                      }`}
                      title={isFavorited ? 'Remover dos favoritos' : 'Favoritar pergunta'}
                    >
                      <Star size={13} className={isFavorited ? "fill-yellow-400 text-yellow-500" : ""} />
                    </button>
                    <button
                      onClick={() => toggleDifficultQuestion(q.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isDifficult
                          ? 'bg-red-50 border-red-250 text-red-600 shadow-xs'
                          : 'bg-white hover:bg-gray-50 border-gray-150 text-gray-400'
                      }`}
                      title={isDifficult ? 'Remover das difíceis' : 'Marcar como difícil'}
                    >
                      <Bookmark size={13} className={isDifficult ? "fill-red-400 text-red-500" : ""} />
                    </button>
                    <button
                      onClick={() => playAudio(q.question.es, 'es-ES', audioSpeed)}
                      className="p-1.5 text-gray-400 hover:text-[#FF6321] hover:bg-orange-50 bg-white border border-gray-150 rounded-lg transition-colors"
                      title="Ouvir Pergunta"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div className="space-y-1">
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {isCorrect ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : (
                        <XCircle className="text-red-500" size={20} />
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="text-gray-800 font-semibold text-base leading-relaxed">
                        {q.question.es}
                      </p>
                      <HiddenTranslation 
                        text={q.question.pt}
                        className="text-gray-400 text-xs italic font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Options Review Display */}
                <div className="space-y-2 pt-2 pl-8">
                  {q.options.map(option => {
                    const isSelected = selectedOptionId === option.id;
                    let optionClass = "p-3 rounded-xl border text-sm font-semibold flex justify-between items-center ";
                    
                    if (option.isCorrect) {
                      optionClass += "bg-green-50 border-green-200 text-green-800 shadow-xs";
                    } else if (isSelected && !option.isCorrect) {
                      optionClass += "bg-red-50 border-red-200 text-red-800 shadow-xs";
                    } else {
                      optionClass += "bg-white border-gray-100 text-gray-600 opacity-80";
                    }

                    return (
                      <div key={option.id} className={optionClass}>
                        <div className="flex-1">
                          <p>{option.text.es}</p>
                          <p className="text-[11px] text-gray-400 italic mt-0.5">{option.text.pt}</p>
                        </div>
                        {isSelected && !option.isCorrect && <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Sua escolha</span>}
                        {option.isCorrect && <span className="text-[10px] font-black bg-green-105 text-green-700 px-1.5 py-0.5 rounded uppercase">Correta</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Explanations block */}
                {q.explanation.pt && !q.explanation.pt.includes('Sem explicação disponível') && (
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4 ml-8 space-y-1">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                      Explicação Oficial
                    </p>
                    <p className="text-xs text-gray-605 font-bold">
                      {q.explanation.es}
                    </p>
                    <p className="text-xs text-gray-400 italic">
                      {q.explanation.pt}
                    </p>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div id="results-footer-actions" className="border-t border-gray-100 pt-8 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">O que fazer agora?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {wrongCount > 0 && (
            <button
              onClick={() => goTo('review')}
              className="flex items-center gap-3 px-5 py-4 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 rounded-2xl font-bold text-sm transition-all active:scale-95"
            >
              <div className="p-2 bg-red-100 rounded-xl shrink-0">
                <ListChecks size={16} className="text-red-600" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm">Revisar Erros</p>
                <p className="text-[10px] font-semibold text-red-400">{wrongCount} questão{wrongCount !== 1 ? 'es' : ''} no Hospital de Erros</p>
              </div>
            </button>
          )}
          {weakCategories.length > 0 && (
            <button
              onClick={() => goTo('practice')}
              className="flex items-center gap-3 px-5 py-4 bg-orange-50 hover:bg-orange-100 border border-orange-100 text-orange-700 rounded-2xl font-bold text-sm transition-all active:scale-95"
            >
              <div className="p-2 bg-orange-100 rounded-xl shrink-0">
                <GraduationCap size={16} className="text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm">Estudar Categorias Fracas</p>
                <p className="text-[10px] font-semibold text-orange-400">{weakCategories.length} categoria{weakCategories.length !== 1 ? 's' : ''} abaixo de 60%</p>
              </div>
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex items-center gap-3 px-5 py-4 bg-[#FF6321] hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-orange-500/15"
          >
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <RotateCcw size={16} />
            </div>
            <div className="text-left">
              <p className="font-black text-sm">Refazer Teste</p>
              <p className="text-[10px] font-semibold opacity-80">Novo embaralhamento de questões</p>
            </div>
          </button>
          <button
            onClick={() => goTo('study')}
            className="flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-600 rounded-2xl font-bold text-sm transition-all active:scale-95"
          >
            <div className="p-2 bg-gray-100 rounded-xl shrink-0">
              <Home size={16} className="text-gray-500" />
            </div>
            <div className="text-left">
              <p className="font-black text-sm">Voltar ao Início</p>
              <p className="text-[10px] font-semibold text-gray-400">Ir para os flashcards</p>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}
