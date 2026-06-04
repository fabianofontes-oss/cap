import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Flashcards from './components/Flashcards';
import Quiz from './components/Quiz';
import Simulado from './components/Simulado';
import Revision from './components/Revision';
import Profile from './components/Profile';
import Plans from './components/Plans';
import Dashboard from './components/Dashboard';
import { Layers, CheckSquare, User, LogIn, LogOut, Loader2, Timer, Sparkles, CheckCircle2, Bookmark, House } from 'lucide-react';
import { logout } from './lib/firebase';
import { motion } from 'motion/react';

function MainApp() {
  const { 
    user, 
    authReady, 
    showSyncModal, 
    cloudStatsPending, 
    stats, 
    handleSyncAction,
    showUpgradeModal,
    setShowUpgradeModal,
    subscription
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<'home' | 'study' | 'practice' | 'review' | 'simulado' | 'profile' | 'plans'>('home');

  React.useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: string }>).detail?.tab;
      if (tab) setActiveTab(tab as any);
    };
    window.addEventListener('cap_navigate', handler);
    return () => window.removeEventListener('cap_navigate', handler);
  }, []);

  const navItems = [
    { id: 'home',     icon: House,       label: 'Hoje'     },
    { id: 'study',    icon: Layers,      label: 'Estudo'   },
    { id: 'practice', icon: CheckSquare, label: 'Prática'  },
    { id: 'review',   icon: Bookmark,    label: 'Revisão' },
    { id: 'simulado', icon: Timer,       label: 'Simulado' },
    { id: 'plans',    icon: Sparkles,    label: 'Planos'   },
    { id: 'profile',  icon: User,        label: 'Perfil'   },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-gray-50 to-orange-50/30 text-gray-900 font-sans flex flex-col">
      {/* Header with Glassmorphism and vibrant shadow */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6321] to-[#FF8A50] flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-500/30 transition-transform duration-300 group-hover:scale-105">
              C
            </div>
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-gray-900 via-[#FF6321] to-orange-600 bg-clip-text text-transparent">
              CAP Master
            </h1>
          </div>
          
          <div className="flex items-center gap-4 relative">
            {subscription.plan === 'free' && (
              <button
                onClick={() => setActiveTab('plans')}
                className="hidden sm:flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm shadow-[#FF6321]/10 active:scale-95"
              >
                <Sparkles size={11} className="fill-current" />
                <span>Seja Pró</span>
              </button>
            )}

            {!authReady ? (
               <Loader2 className="animate-spin text-gray-400" size={20} />
            ) : user ? (
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('profile')}>
                 <div className="hidden md:flex flex-col text-right">
                   <div className="text-xs font-bold text-gray-800">{user.displayName || 'Piloto'}</div>
                   <div className="text-[10px] text-[#FF6321] font-bold uppercase tracking-wider">
                     {subscription.plan === 'free' ? 'Plano Grátis' : 'Plano Pró'}
                   </div>
                 </div>
                 {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-[#FF6321]/30 hover:border-[#FF6321] transition-colors shadow-sm" referrerPolicy="no-referrer" />
                 ) : (
                    <div className="w-8 h-8 rounded-full bg-[#FF6321]/20 flex items-center justify-center text-[#FF6321] font-bold text-xs border border-[#FF6321]/30">
                      {user.email?.[0].toUpperCase() || 'U'}
                    </div>
                 )}
                 <button 
                   onClick={(e) => { e.stopPropagation(); logout(); }} 
                   className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-gray-100 hover:border-red-100 bg-white shadow-sm" 
                   title="Sair"
                 >
                   <LogOut size={16} />
                 </button>
              </div>
            ) : (
              <button 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:to-black px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-gray-900/10 transition-all hover:-translate-y-0.5 border border-gray-900"
              >
                <LogIn size={14} />
                <span>Sincronizar Nuvem</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 overflow-y-auto">
        <div className="w-full h-full pb-14">
           {activeTab === 'home' && <Dashboard />}
           {activeTab === 'study' && <Flashcards />}
           {activeTab === 'practice' && <Quiz />}
           {activeTab === 'review' && <Revision />}
           {activeTab === 'simulado' && <Simulado />}
           {activeTab === 'plans' && <Plans />}
           {activeTab === 'profile' && <Profile />}
        </div>
      </main>

      {/* Glassmorphic Navigation Module */}
      <div className="bg-white/90 backdrop-blur-md border-t border-gray-200/60 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.04)] sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around p-2">
           {navItems.map(item => {
             const Icon = item.icon;
             const isActive = activeTab === item.id;
             return (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id as any)}
                 className={`flex flex-col items-center justify-center w-full py-2.5 rounded-2xl transition-all duration-300 relative ${
                   isActive 
                     ? 'text-[#FF6321]' 
                     : 'text-gray-400 hover:bg-orange-50/50 hover:text-gray-600'
                 }`}
               >
                 {isActive && (
                   <motion.div 
                     layoutId="activeNavBG"
                     className="absolute inset-0 bg-gradient-to-br from-[#FF6321]/8 to-[#FF8A50]/4 rounded-2xl border border-orange-200/30"
                     transition={{ type: "spring", stiffness: 380, damping: 30 }}
                   />
                 )}
                 <Icon size={22} className={`mb-1 transition-all relative z-10 ${isActive ? 'scale-110 text-[#FF6321] stroke-[2.5px]' : ''}`} />
                 <span className="text-[11px] font-bold relative z-10">{item.label}</span>
               </button>
             );
           })}
        </div>
      </div>

      {/* Premium Upgrade Modal Overlay */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full border border-gray-150 shadow-2xl flex flex-col space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-[#FF6321]">
              <div className="p-3 bg-orange-50 rounded-2xl">
                <Sparkles size={24} className="text-[#FF6321]" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-gray-800">Recurso CAP Master Pró</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Upgrade de Assinatura</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
              Este recurso faz parte do CAP Master Pró. Escolha um plano para liberar simulados completos, revisão de erros e áudio ilimitado.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setActiveTab('plans');
                }}
                className="w-full py-3 bg-[#FF6321] hover:bg-orange-600 text-white font-bold text-xs tracking-wider rounded-xl shadow-md transition-all uppercase text-center active:scale-95 cursor-pointer"
              >
                Ver planos
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs border border-gray-200/50 rounded-xl transition-all uppercase text-center active:scale-95 cursor-pointer"
              >
                Continuar grátis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Sync Decisive Modal Overlay */}
      {showSyncModal && cloudStatsPending && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-100 shadow-2xl flex flex-col space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-[#FF6321]">
              <div className="p-3 bg-orange-50 rounded-2xl">
                <Sparkles className="animate-pulse" size={24} />
               </div>
               <div>
                 <h3 className="text-lg font-black tracking-tight text-gray-800">Sincronizar Progresso</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronização em Nuvem</p>
               </div>
             </div>
 
             <p className="text-sm text-gray-500 leading-relaxed font-medium">
               Detectamos progresso local no seu navegador (<strong className="text-gray-800">{stats.xp} XP</strong>) que difere das estatísticas salvas na sua conta (<strong className="text-gray-800">{cloudStatsPending.xp} XP</strong>). Como deseja prosseguir?
             </p>
 
             <div className="grid grid-cols-1 gap-3 pt-2">
               
               <button
                 onClick={() => handleSyncAction('merge')}
                 className="w-full text-left p-4 rounded-xl border border-orange-100 hover:border-orange-200 hover:bg-orange-50/50 bg-[#FF6321]/5 text-gray-800 transition-all flex items-start gap-3"
               >
                 <CheckCircle2 className="text-[#FF6321] mt-0.5 shrink-0" size={18} />
                 <div>
                   <div className="text-xs font-black uppercase text-gray-800 flex items-center gap-1.5 leading-none mb-1">
                     <span>Mesclar Progresso</span>
                     <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-normal uppercase shrink-0">Recomendado</span>
                   </div>
                   <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                     Soma e combina as respostas corretas, XP, simulados e progressos de cartões.
                   </p>
                 </div>
               </button>
 
               <button
                 onClick={() => handleSyncAction('keep_cloud')}
                 className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-800 transition-all flex items-start gap-3"
               >
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                 <div>
                   <div className="text-xs font-black uppercase text-gray-700 leading-none mb-1">Usar Conta da Nuvem</div>
                   <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                     Mantém os dados salvos anteriormente na nuvem ({cloudStatsPending.xp} XP).
                   </p>
                 </div>
               </button>
 
               <button
                 onClick={() => handleSyncAction('overwrite_cloud')}
                 className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-800 transition-all flex items-start gap-3"
               >
                 <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                 <div>
                   <div className="text-xs font-black uppercase text-gray-700 leading-none mb-1">Substituir Nuvem por Local</div>
                   <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                     Sobrescreve a conta na nuvem usando seu progresso local do navegador ({stats.xp} XP).
                   </p>
                 </div>
               </button>
               
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
