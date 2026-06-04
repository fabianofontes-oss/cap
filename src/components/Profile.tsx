import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { signUpWithEmail, signInWithEmail, signInWithGoogle, logout } from '../lib/firebase';
import { 
  User, Mail, Lock, LogIn, Sparkles, LogOut, Trash2, 
  Settings, Languages, Volume2, VolumeX, Gauge, 
  Flame, Trophy, CheckCircle, AlertCircle, BarChart2, Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

const translations = {
  pt: {
    title: 'Seu Perfil de Piloto',
    settings: 'Configurações do Sistema',
    login: 'Entrar na Conta',
    signup: 'Criar Conta',
    name: 'Nome Completo',
    email: 'Endereço de E-mail',
    password: 'Senha de Acesso',
    created: 'Membro desde',
    stats: 'Suas Estatísticas',
    accuracy: 'Porcentagem de Acerto',
    streak: 'Dias de Ofensiva',
    xp: 'XP Acumulado',
    level: 'Nível Atual',
    simulados: 'Simulados Concluídos',
    answered: 'Questões Respondidas',
    correct: 'Acertos',
    incorrect: 'Erros',
    lang: 'Idioma da Interface',
    audio: 'Áudio & Sons',
    audioOn: 'Ativar Áudio',
    audioOff: 'Desativar Áudio',
    voiceSpeed: 'Velocidade da fala (Espanhol)',
    reset: 'Resetar Progresso',
    resetConfirm: 'Você realmente deseja resetar todo o seu progresso? Essa ação irá redefinir suas estatísticas para zero tanto localmente quanto na nuvem permanentemente.',
    resetBtn: 'Zerar Progresso',
    logout: 'Sair da Conta',
    googleSignIn: 'Conectar com Google',
    haveAccount: 'Já tem uma conta? Conectar',
    needAccount: 'Não tem uma conta? Cadastre-se',
    or: 'ou',
  },
  es: {
    title: 'Su Perfil de Piloto',
    settings: 'Configuraciones del Sistema',
    login: 'Iniciar Sesión',
    signup: 'Crear Cuenta',
    name: 'Nombre Completo',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    created: 'Miembro desde',
    stats: 'Sus Estadísticas',
    accuracy: 'Porcentaje de Aciertos',
    streak: 'Días de Racha',
    xp: 'XP Acumulado',
    level: 'Nivel Actual',
    simulados: 'Simulacros Completados',
    answered: 'Preguntas Respondidas',
    correct: 'Aciertos',
    incorrect: 'Errores',
    lang: 'Idioma de la Interfaz',
    audio: 'Audio y Sonido',
    audioOn: 'Activar Audio',
    audioOff: 'Desactivar Audio',
    voiceSpeed: 'Velocidad de la voz (Español)',
    reset: 'Restablecer Progreso',
    resetConfirm: '¿De verdad quiere reiniciar su progreso? Esta acción pondrá sus estadísticas en cero tanto local como en la nube de manera permanente.',
    resetBtn: 'Zerar Progreso',
    logout: 'Cerrar Sesión',
    googleSignIn: 'Conectarse con Google',
    haveAccount: '¿Ya tiene cuenta? Conectarse',
    needAccount: '¿No tiene cuenta? Regístrese',
    or: 'o',
  },
  en: {
    title: 'Your Pilot Profile',
    settings: 'System Settings',
    login: 'Sign In',
    signup: 'Create Account',
    name: 'Full Name',
    email: 'Email Address',
    password: 'Password',
    created: 'Member since',
    stats: 'Your Statistics',
    accuracy: 'Accuracy Rate',
    streak: 'Streak Days',
    xp: 'XP Gained',
    level: 'Current Level',
    simulados: 'Mock Exams Taken',
    answered: 'Questions Answered',
    correct: 'Corrects',
    incorrect: 'Incorrects',
    lang: 'Interface Language',
    audio: 'Audio & Sound',
    audioOn: 'Enable Audio',
    audioOff: 'Disable Audio',
    voiceSpeed: 'Spanish speech speed',
    reset: 'Reset Progress',
    resetConfirm: 'Are you sure you want to reset all your progress? This action will set your stats to zero locally and in the cloud permanently.',
    resetBtn: 'Reset Progress',
    logout: 'Sign Out',
    googleSignIn: 'Sign In with Google',
    haveAccount: 'Already have an account? Sign In',
    needAccount: "Don't have an account? Sign Up",
    or: 'or',
  }
};

export default function Profile() {
  const { 
    user, 
    stats, 
    audioSpeed, 
    setAudioSpeed, 
    audioEnabled, 
    setAudioEnabled,
    interfaceLanguage, 
    setInterfaceLanguage,
    resetAllProgress 
  } = useAppContext();

  // Auth local form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const t = translations[interfaceLanguage] || translations.pt;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name) {
          setErrorMsg('O nome é necessário para o cadastro.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao conectar via Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetProgress = async () => {
    setShowConfirmReset(false);
    try {
      await resetAllProgress();
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erro ao resetar progresso.');
    }
  };

  // Display calculations
  const errorsCount = Math.max(0, (stats.totalAnswers || 0) - (stats.correctAnswers || 0));
  const accuracy = stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : 0;
  
  const formattedCreationDate = () => {
    if (user?.metadata?.creationTime) {
      const date = new Date(user.metadata.creationTime);
      return date.toLocaleDateString(interfaceLanguage === 'pt' ? 'pt-BR' : interfaceLanguage === 'es' ? 'es-ES' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return '';
  };

  // Unauthenticated State View
  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto py-4">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.03)] space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-800">
              {isSignUp ? t.signup : t.login}
            </h2>
            <p className="text-xs text-gray-400 font-medium tracking-wide prose uppercase">
              Piloto CAP Master
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-semibold flex items-start gap-3 border border-red-100 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.name}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#FF6321]/20 outline-none transition-all duration-200"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.email}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#FF6321]/20 outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#FF6321]/20 outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#FF6321] text-white rounded-xl font-bold text-sm tracking-wide shadow-md shadow-orange-500/10 hover:bg-orange-600 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              <span>{isSignUp ? t.signup : t.login}</span>
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200/80 w-full"></div>
            <span className="absolute px-4 bg-white text-xs text-gray-400 font-semibold">{t.or}</span>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>{t.googleSignIn}</span>
          </button>

          <div className="text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
              }}
              className="text-xs font-bold text-[#FF6321] hover:underline"
            >
              {isSignUp ? t.haveAccount : t.needAccount}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Profile Dashboard View
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-10">
      
      {/* Profile/User Identity Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Avatar" 
              className="w-16 h-16 rounded-full border-4 border-orange-500/10 shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6321] to-[#FF8A50] text-white flex items-center justify-center font-black text-2xl shadow-md border border-orange-400/20">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
              {user.displayName || 'Piloto CAP'}
            </h2>
            <p className="text-sm text-gray-400 font-medium flex items-center gap-2 justify-center md:justify-start">
              <Mail size={14} />
              <span>{user.email}</span>
            </p>
            {formattedCreationDate() && (
              <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5 justify-center md:justify-start pt-1">
                <Calendar size={13} />
                <span>{t.created}: {formattedCreationDate()}</span>
              </p>
            )}
          </div>
        </div>

        <button 
          onClick={logout}
          className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs tracking-wide border border-red-100 transition-all flex items-center gap-2 active:scale-95"
        >
          <LogOut size={14} />
          <span>{t.logout}</span>
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-2">
          <BarChart2 size={18} className="text-[#FF6321]" />
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-wider">{t.stats}</h3>
        </div>

        {/* Stats Grid Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Level Card */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100/80 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-3">
              <Trophy size={18} />
            </div>
            <span className="text-2xl md:text-3xl font-black text-gray-800">{stats.level || 1}</span>
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{t.level}</span>
          </div>

          {/* XP Accumulated Card */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100/80 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-3">
              <Sparkles size={18} />
            </div>
            <span className="text-2xl md:text-3xl font-black text-gray-800">{stats.xp || 0}</span>
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{t.xp}</span>
          </div>

          {/* Streak Flame Card */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100/80 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-3">
              <Flame size={18} className="fill-red-500" />
            </div>
            <span className="text-2xl md:text-3xl font-black text-gray-800">{stats.streak || 0}</span>
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{t.streak}</span>
          </div>

          {/* Accuracy Matrix */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100/80 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle size={18} />
            </div>
            <span className="text-2xl md:text-3xl font-black text-gray-800">{accuracy}%</span>
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{t.accuracy}</span>
          </div>

        </div>

        {/* Breakdown Answers & Quizzes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Questões e Simulados</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">{t.answered}</span>
                <span className="font-bold text-gray-800">{stats.totalAnswers || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-green-600 font-medium flex items-center gap-1">● {t.correct}</span>
                <span className="font-bold text-gray-800">{stats.correctAnswers || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-red-500 font-medium flex items-center gap-1">● {t.incorrect}</span>
                <span className="font-bold text-gray-800">{errorsCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">{t.simulados}</span>
                <span className="font-bold text-[#FF6321]">{stats.simuladosTaken || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Itens Salvos & Revisão</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">⭐ Questões Favoritas</span>
                <span className="font-bold text-gray-800">{stats.favoriteQuestionIds?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">⭐ Cartões Favoritos</span>
                <span className="font-bold text-gray-800">{stats.favoriteCardIds?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">🔴 Questões Difíceis</span>
                <span className="font-bold text-gray-800">{stats.difficultQuestionIds?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">🔴 Cartões Difíceis</span>
                <span className="font-bold text-gray-800">{stats.difficultCardIds?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FF6321]/5 via-orange-50/20 to-transparent p-6 rounded-3xl border border-orange-100/40 flex flex-col justify-center space-y-3">
            <h4 className="font-bold text-[#FF6321] flex items-center gap-2 text-sm">
              <Sparkles size={16} />
              <span>Status da Credencial</span>
            </h4>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Você acumulou um total de <strong className="text-gray-800">{stats.xp} XP</strong> ao longo dos seus estudos de CAP espanhol e português. Continue respondendo simulados para manter sua sequência!
            </p>
            <div className="pt-2">
              <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF6321] to-[#FF8A50] rounded-full"
                  style={{ width: `${Math.min(100, (stats.xp % 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1 uppercase">
                <span>Nível {stats.level}</span>
                <span>{stats.xp % 100} / 100 XP para Nível {stats.level + 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Module */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-2">
          <Settings size={18} className="text-gray-600" />
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-wider">{t.settings}</h3>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          
          {/* Interface Language Chooser */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-700 text-sm">
                <Languages size={16} className="text-gray-400" />
                <span>{t.lang}</span>
              </div>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1 shrink-0 self-start md:self-auto">
              {[
                { code: 'pt', label: '🇵🇹 PT' },
                { code: 'es', label: '🇪🇸 ES' },
                { code: 'en', label: '🇬🇧 EN' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setInterfaceLanguage(lang.code as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    interfaceLanguage === lang.code 
                      ? 'bg-gradient-to-r from-[#FF6321] to-[#FF8A50] text-white shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Enabled / Sounds Mute option */}
          <div className="flex items-center justify-between border-b border-gray-50 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-700 text-sm">
                {audioEnabled ? <Volume2 size={16} className="text-green-500" /> : <VolumeX size={16} className="text-red-400" />}
                <span>{t.audio}</span>
              </div>
            </div>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all border ${
                audioEnabled 
                  ? 'bg-green-50 text-green-700 border-green-200/40 hover:bg-green-100/60' 
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {audioEnabled ? t.audioOn : t.audioOff}
            </button>
          </div>

          {/* Audio voice speed rate slider */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-700 text-sm">
                <Gauge size={16} className="text-gray-400" />
                <span>{t.voiceSpeed}</span>
              </div>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1 shrink-0 self-start md:self-auto">
              {[0.5, 0.75, 0.9, 1.1, 1.3].map(speed => (
                <button
                  key={speed}
                  onClick={() => setAudioSpeed(speed)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    audioSpeed === speed 
                      ? 'bg-gradient-to-r from-[#FF6321] to-[#FF8A50] text-white shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Dangerous / Wipe progress area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-700 text-sm">
                <Trash2 size={16} className="text-red-400" />
                <span>{t.reset}</span>
              </div>
              <p className="text-xs text-gray-400 font-medium max-w-lg leading-relaxed">
                Essa ação é permanente. Suas respostas corretas, XP e sequências diárias serão zerados do seu login atual.
              </p>
            </div>
            
            {!showConfirmReset ? (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl font-bold text-xs shrink-0 self-start md:self-auto transition-colors"
              >
                Zeramento
              </button>
            ) : (
              <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl md:ml-4 space-y-3 shrink-0 max-w-sm self-start md:self-auto text-left">
                <p className="text-xs text-red-800 font-medium leading-relaxed">
                  {t.resetConfirm}
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResetProgress}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    {t.resetBtn}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
