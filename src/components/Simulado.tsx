import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { QuizQuestion } from '../types';
import { Timer, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Star, AlertOctagon } from 'lucide-react';
import { motion } from 'motion/react';
import DetailedResults from './DetailedResults';

// Randomize array helper
const shuffle = <T,>(array: T[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// isOfficial=true  → shows Aprovado/Reprovado with threshold = totalQuestions / 2
// isOfficial=false → shows "Treino com Regra CAP" (no verdict)
const SIMULADO_CONFIGS = {
  rapido:    { label: 'Rápido',              description: '10 questões · 15 min',   questions: 10,  minutes: 15,  isOfficial: false },
  pratico:   { label: 'Prático',             description: '20 questões · 30 min',   questions: 20,  minutes: 30,  isOfficial: false },
  oficial:   { label: 'CAP Oficial',         description: '100 questões · 120 min', questions: 100, minutes: 120, isOfficial: true  },
  ampliacao: { label: 'Ampliação/Promoção',  description: '25 questões · 30 min',   questions: 25,  minutes: 30,  isOfficial: true  },
} as const;
type SimuladoMode = keyof typeof SIMULADO_CONFIGS;

export default function Simulado() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [timesSpent, setTimesSpent] = useState<Record<string, number>>({});
  const [lastOptionSelectedTime, setLastOptionSelectedTime] = useState<number>(Date.now());
  const [simuladoMode, setSimuladoMode] = useState<SimuladoMode>('rapido');

  const answersRef = React.useRef<Record<string, string>>({});
  React.useEffect(() => { answersRef.current = answers; }, [answers]);

  const finishedRef = React.useRef(false);

  const { 
    quizzes: allQuizzes, 
    dataLoaded, 
    recordSimuladoFinished,
    toggleFavoriteQuestion,
    toggleDifficultQuestion,
    stats,
    canAccessFeature,
    triggerUpgradeModal
  } = useAppContext();

  const startSimulado = () => {
    if (!canAccessFeature('officialMockExam')) {
      triggerUpgradeModal();
      return;
    }
    const config = SIMULADO_CONFIGS[simuladoMode];
    const selected = shuffle(allQuizzes).slice(0, config.questions);
    setQuestions(selected);
    setAnswers({});
    setTimesSpent({});
    setLastOptionSelectedTime(Date.now());
    setTimeLeft(config.minutes * 60);
    finishedRef.current = false;
    setStatus('running');
    setScore(0);
  };

  useEffect(() => {
    if (status !== 'running') return;
    let done = false;

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          if (!done) {
            done = true;
            setTimeout(() => finishSimulado(answersRef.current), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [status]); // only re-runs when exam starts/stops, NOT every second

  const handleSelect = (questionId: string, optionId: string) => {
    if (status !== 'running') return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));

    // Record timing delta spent on this question
    const now = Date.now();
    const elapsed = Math.max(1, Math.round((now - lastOptionSelectedTime) / 1000));
    setTimesSpent(prev => ({
      ...prev,
      [questionId]: (prev[questionId] || 0) + elapsed
    }));
    setLastOptionSelectedTime(now);
  };

  const finishSimulado = (currentAnswers: Record<string, string> = answers) => {
    if (finishedRef.current) return; // guard: prevents double-call (timer race + button click)
    finishedRef.current = true;
    setStatus('finished');
    let correct = 0;
    const wrongAnsweredIds: string[] = [];
    questions.forEach(q => {
      const selected = currentAnswers[q.id];
      if (!selected) return; // unanswered: 0 pts, does NOT go to hospital
      const correctOption = q.options.find(o => o.isCorrect);
      if (correctOption && selected === correctOption.id) {
        correct += 1;
      } else {
        wrongAnsweredIds.push(q.id); // only actually wrong answers go to hospital
      }
    });
    setScore(correct);
    recordSimuladoFinished(correct, questions.length, wrongAnsweredIds);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!dataLoaded) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-pulse space-y-6 p-4">
        <div className="flex flex-col items-center gap-4 pt-8">
          <div className="w-24 h-24 rounded-full bg-red-100" />
          <div className="h-8 w-48 rounded-full bg-gray-200" />
          <div className="h-4 w-64 rounded-full bg-gray-200" />
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-2xl bg-white border border-gray-100" />)}
        </div>
        <div className="h-14 rounded-full bg-orange-100" />
      </div>
    );
  }

  if (status === 'idle') {
     return (
       <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-8 text-center space-y-6">
         <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
           <Timer size={48} />
         </div>
         <h2 className="text-3xl font-bold text-gray-800">Modo Simulado Oficial</h2>
         <p className="text-gray-500 text-lg">
           {SIMULADO_CONFIGS[simuladoMode].isOfficial
             ? `Questões aleatórias com tempo limite. Mínimo ${SIMULADO_CONFIGS[simuladoMode].questions / 2} pts (metade de ${SIMULADO_CONFIGS[simuladoMode].questions}) para aprovação. Regra CAP: +1 certa, −0,5 errada.`
             : 'Treino com regra CAP: +1 certa, −0,5 errada. Sem veredicto oficial — use para calibrar seu desempenho.'
           }
         </p>

         <div className="w-full max-w-xs space-y-2">
           <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Escolha o modo</p>
           {(Object.keys(SIMULADO_CONFIGS) as SimuladoMode[]).map(mode => {
             const cfg = SIMULADO_CONFIGS[mode];
             const isSelected = simuladoMode === mode;
             return (
               <button
                 key={mode}
                 onClick={() => setSimuladoMode(mode)}
                 className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl border-2 transition-all ${
                   isSelected
                     ? 'border-[#FF6321] bg-[#FF6321]/5 shadow-sm'
                     : 'border-gray-100 hover:border-gray-200 bg-white'
                 }`}
               >
                 <span className={`font-bold text-sm ${isSelected ? 'text-[#FF6321]' : 'text-gray-700'}`}>{cfg.label}</span>
                 <span className="text-xs text-gray-400 font-medium">{cfg.description}</span>
               </button>
             );
           })}
         </div>

         <button
            onClick={startSimulado}
            className="bg-[#FF6321] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Começar Simulado
          </button>
       </div>
     );
  }

  if (status === 'finished') {
    return (
      <DetailedResults
        questions={questions}
        answers={answers}
        timesSpent={timesSpent}
        onRestart={startSimulado}
        title={`Simulado ${SIMULADO_CONFIGS[simuladoMode].label}`}
        isSimulado={true}
        isOfficialSimulado={SIMULADO_CONFIGS[simuladoMode].isOfficial}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto pb-20">
      {/* Sticky Header with Timer */}
      <div className="sticky top-16 z-40 bg-slate-50/95 backdrop-blur-md py-4 mb-6 border-b border-gray-200/60 flex items-center justify-between">
         <h2 className="text-xl font-bold text-gray-800">Simulado</h2>
         <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-lg ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white shadow-sm text-gray-800 border border-gray-200'}`}>
           <Timer size={20} />
           {formatTime(timeLeft)}
         </div>
      </div>

      <div className="space-y-12">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative">
             <div className="absolute top-0 left-0 bg-gray-100 text-gray-500 font-bold px-3 py-1 text-sm rounded-tl-3xl rounded-br-2xl">
               {idx + 1}
             </div>

             <div className="absolute top-4 right-4">
                <button 
                  onClick={() => toggleFavoriteQuestion(q.id)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    stats.favoriteQuestionIds?.includes(q.id)
                      ? 'bg-yellow-50 border-yellow-100 text-yellow-600 shadow-sm'
                      : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-500 shadow-sm'
                  }`}
                  title="Favoritar Pergunta"
                >
                  <Star size={14} className={stats.favoriteQuestionIds?.includes(q.id) ? "fill-yellow-400 text-yellow-500" : ""} />
                </button>
             </div>
             
             <h3 className="text-xl md:text-2xl font-medium text-gray-800 mt-6 mb-2 leading-snug">
              {q.question.es}
             </h3>
             <p className="text-gray-500 italic mb-6">
              {q.question.pt}
             </p>

             <div className="space-y-3">
               {q.options.map(option => {
                 const isSelected = answers[q.id] === option.id;
                 return (
                   <button
                     key={option.id}
                     onClick={() => handleSelect(q.id, option.id)}
                     className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                       isSelected 
                         ? 'border-[#FF6321] bg-[#FF6321]/5 shadow-sm' 
                         : 'border-gray-100 hover:border-gray-300'
                     }`}
                   >
                     <div className="flex-1 pr-4">
                        <div className="text-gray-800 font-medium mb-1">{option.text.es}</div>
                        <div className="text-sm text-gray-500 font-medium italic">{option.text.pt}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#FF6321]' : 'border-gray-300'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-[#FF6321] rounded-full" />}
                      </div>
                   </button>
                 )
               })}
             </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-safe bg-white/95 backdrop-blur-sm border-t border-gray-200/60 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50 flex justify-center">
         <div className="w-full max-w-md">
           <button 
             onClick={finishSimulado}
             className="w-full py-4 bg-[#FF6321] text-white rounded-full font-bold text-lg hover:bg-orange-600 transition-colors shadow-lg"
           >
             Finalizar e Ver Nota
           </button>
         </div>
      </div>
    </div>
  );
}
