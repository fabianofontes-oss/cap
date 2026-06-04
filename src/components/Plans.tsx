import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Sparkles, Check, Zap, Calendar, Volume2, ShieldAlert, Timer, Award, User, RefreshCw, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Plans() {
  const { subscription, activatePlan, user } = useAppContext();
  const [loading, setLoading] = useState<string | null>(null);
  const [simulatedState, setSimulatedState] = useState<'active' | 'expired' | 'trial'>('active');

  const handleSimulateUpgrade = async (plan: 'free' | 'pro_6_months' | 'pro_annual') => {
    setLoading(plan);
    try {
      // Simulate backend server latency
      await new Promise((resolve) => setTimeout(resolve, 650));
      await activatePlan(plan, plan === 'free' ? 'free' : simulatedState);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  // Humanize subscription status
  const getSubStatusLabel = () => {
    if (subscription.status === 'free') return 'Plano Gratuito';
    if (subscription.status === 'expired') return 'Inativo / Expirado';
    if (subscription.status === 'trial') return 'Período de Demonstração';
    return 'Assinatura Ativa';
  };

  const getPlanName = () => {
    if (subscription.plan === 'pro_6_months') return 'CAP Master 6 Meses';
    if (subscription.plan === 'pro_annual') return 'CAP Master Anual';
    return 'CAP Master Grátis';
  };

  const calculateDaysRemaining = () => {
    if (!subscription.expiresAt) return 0;
    const expiry = new Date(subscription.expiresAt).getTime();
    const diff = expiry - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 pb-12 animate-in fade-in duration-300">
      
      {/* Dynamic Subscriber Management Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${subscription.status === 'active' || subscription.status === 'trial' ? 'bg-orange-50 text-[#FF6321]' : 'bg-gray-50 text-gray-400'}`}>
              <Award size={32} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#FF6321] uppercase tracking-widest">Seu Status Atual</span>
              <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
                {getSubStatusLabel()}
              </h2>
              <p className="text-xs text-gray-400 font-semibold">
                Plano: <span className="text-gray-600 font-bold">{getPlanName()}</span>
                {subscription.expiresAt && ` • Expira em: ${new Date(subscription.expiresAt).toLocaleDateString()}`}
                {subscription.status === 'active' && ` (${calculateDaysRemaining()} dias restantes)`}
              </p>
            </div>
          </div>

          {/* Quick Simulation Dashboard console for fast state shifts */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-2 max-w-sm w-full md:w-auto">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Consola de Simulação (Testes)</span>
            <div className="flex gap-1">
              {(['active', 'expired', 'trial'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSimulatedState(st)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    simulatedState === st 
                      ? 'bg-gray-800 text-white shadow-sm' 
                      : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  {st === 'active' ? 'Ativo' : st === 'expired' ? 'Expirado' : 'Teste'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 leading-normal font-medium">
              Ajuste o estado de simulação ao lado antes de clicar em <strong>"Ativar teste/manual"</strong> para testar suspensões ou avaliações.
            </p>
          </div>
        </div>
      </div>

      {/* Plans Presentation Title */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-black tracking-tight text-gray-800">
          Escolha o Plano Ideal para seu CAP
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed font-medium">
          Acesse simulados oficiais da Espanha, Hospital de Erros completo, áudio ilimitado em espanhol e passe de primeira.
        </p>
      </div>

      {/* Subscription Plans Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* plan 1: CAP Master Grátis */}
        <div className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between transition-all relative overflow-hidden ${subscription.plan === 'free' ? 'ring-2 ring-[#FF6321]/30 border-orange-100 shadow-lg' : ''}`}>
          <div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Início Rápido</span>
              <h4 className="text-xl font-extrabold text-gray-800">CAP Master Grátis</h4>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">Avalie o aplicativo e treine conhecimentos fundamentais.</p>
            </div>

            <div className="py-6 flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-800">€0</span>
              <span className="text-xs text-gray-400 font-bold uppercase">/ grátis</span>
            </div>

            <div className="border-t border-gray-50 pt-5 space-y-4">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">O que inclui:</p>
              <ul className="space-y-2.5">
                {[
                  { text: 'Acesso limitado ao banco de questões', highlight: false },
                  { text: 'Apenas algumas categorias básicas', highlight: false },
                  { text: 'Teste rápido e prático', highlight: false },
                  { text: 'Áudio limitado (máx. 10 reproduções)', highlight: true },
                  { text: 'Favoritos limitados (máx. 5 itens)', highlight: true },
                  { text: 'Zerar erros com limites diários', highlight: false },
                  { text: 'Estatísticas de estudo básicas', highlight: false }
                ].map((feat, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-xs font-semibold text-gray-500">
                    <Check size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className={feat.highlight ? 'text-gray-900 font-bold' : ''}>{feat.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8">
            {subscription.plan === 'free' ? (
              <button
                disabled
                className="w-full py-3.5 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs tracking-wider uppercase border border-gray-200/50 cursor-not-allowed text-center"
              >
                Plano atual
              </button>
            ) : (
              <button
                onClick={() => handleSimulateUpgrade('free')}
                disabled={loading !== null}
                className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100 hover:border-gray-200 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {loading === 'free' ? <RefreshCw size={14} className="animate-spin text-gray-400" /> : null}
                <span>Ativar teste/manual</span>
              </button>
            )}
          </div>
        </div>

        {/* plan 2: CAP Master 6 meses */}
        <div className={`bg-white rounded-3xl p-6 border border-gray-200/60 shadow-md flex flex-col justify-between transition-all relative overflow-hidden ${subscription.plan === 'pro_6_months' ? 'ring-2 ring-[#FF6321]/40 border-[#FF6321]/20 shadow-lg' : ''}`}>
          
          <div className="absolute top-3 right-3 bg-orange-100 text-[#FF6321] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
            Mais Vendido
          </div>

          <div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#FF6321] uppercase tracking-widest block">Recomendado</span>
              <h4 className="text-xl font-extrabold text-gray-800">CAP Master 6 meses</h4>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">Ideal para quem já está na Espanha ou vai iniciar o curso presencial.</p>
            </div>

            <div className="py-6 flex items-baseline gap-1">
              <span className="text-3xl font-black bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent">€29</span>
              <span className="text-xs text-gray-400 font-bold uppercase">/ 6 meses unificados</span>
            </div>

            <div className="border-t border-gray-50 pt-5 space-y-4">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Acesso total e amplo:</p>
              <ul className="space-y-2.5">
                {[
                  { text: 'Todas as perguntas do banco de exames', highlight: true },
                  { text: 'Todas as categorias e normas oficiais', highlight: false },
                  { text: 'Simulados de prova oficiais completes', highlight: true },
                  { text: 'Hospital de erros completo e avançado', highlight: true },
                  { text: 'Favoritos e difíceis ilimitados', highlight: false },
                  { text: 'Áudio espanhol de voz ilimitado', highlight: false },
                  { text: 'Estatísticas completas e gráficos de progresso', highlight: false },
                  { text: 'Estudo com repetição até a aprovação', highlight: false }
                ].map((feat, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-xs font-semibold text-gray-600">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className={feat.highlight ? 'text-gray-900 font-bold' : ''}>{feat.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8">
            {subscription.plan === 'pro_6_months' ? (
              <button
                disabled
                className="w-full py-3.5 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs tracking-wider uppercase border border-gray-200/50 cursor-not-allowed text-center"
              >
                Plano atual
              </button>
            ) : (
              <button
                onClick={() => handleSimulateUpgrade('pro_6_months')}
                disabled={loading !== null}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF6321] to-[#FF8A50] hover:from-orange-600 hover:to-orange-500 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/10 active:scale-95"
              >
                {loading === 'pro_6_months' ? <RefreshCw size={14} className="animate-spin text-white" /> : null}
                <span>Ativar teste/manual</span>
              </button>
            )}
          </div>
        </div>

        {/* plan 3: CAP Master Anual */}
        <div className={`bg-gradient-to-b from-gray-950 to-gray-900 rounded-3xl p-6 border border-gray-800 shadow-2xl flex flex-col justify-between transition-all relative ${subscription.plan === 'pro_annual' ? 'ring-2 ring-orange-500' : ''}`}>
          
          <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
            Melhor Preço
          </div>

          <div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block">Premium Total</span>
              <h4 className="text-xl font-extrabold text-white">CAP Master Anual</h4>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">Perfeito para quem ainda está no Brasil e se prepara antes com tranquilidade.</p>
            </div>

            <div className="py-6 flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">€49</span>
              <span className="text-xs text-gray-400 font-bold uppercase">/ 12 meses completos</span>
            </div>

            <div className="border-t border-gray-800/80 pt-5 space-y-4">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">O pacote definitivo:</p>
              <ul className="space-y-2.5">
                {[
                  { text: 'Acesso completo por 12 meses unificados', highlight: true },
                  { text: 'Inclui TUDO das modalidades de 6 meses', highlight: false },
                  { text: 'Garante estudo com extrema calma e foco', highlight: false },
                  { text: 'Melhor custo-benefício diário do mercado', highlight: true },
                  { text: 'Garantia de atualização das novas leis espanholas', highlight: false }
                ].map((feat, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-xs font-semibold text-gray-300">
                    <Check size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <span className={feat.highlight ? 'text-white font-bold' : ''}>{feat.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8">
            {subscription.plan === 'pro_annual' ? (
              <button
                disabled
                className="w-full py-3.5 bg-gray-800 text-gray-500 rounded-xl font-bold text-xs tracking-wider uppercase border border-gray-700 cursor-not-allowed text-center"
              >
                Plano atual
              </button>
            ) : (
              <button
                onClick={() => handleSimulateUpgrade('pro_annual')}
                disabled={loading !== null}
                className="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg border border-gray-100"
              >
                {loading === 'pro_annual' ? <RefreshCw size={14} className="animate-spin text-gray-700" /> : null}
                <span>Ativar teste/manual</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Coming Soon Announcement Section  "Em breve" */}
      <div className="border border-dashed border-gray-200 rounded-3xl p-6 text-center space-y-2 bg-gray-50/40">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Zap size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Dúvidas Frequentes & Métodos de Pagamento</span>
        </div>
        <p className="text-xs text-gray-500 max-w-xl mx-auto font-medium leading-relaxed">
          Pagamento direto com cartões europeus e brasileiros estará disponível <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-bold uppercase text-[9px]">Em breve</span>. Por enquanto, use o botão <strong>Ativar teste/manual</strong> para simular qualquer plano.
        </p>
      </div>

    </div>
  );
}
