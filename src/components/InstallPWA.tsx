import React, { useState, useEffect } from 'react';
import { Download, Share2, Plus, CheckCircle2, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPWAProps {
  installPromptEvent: Event | null;
  onInstalled: () => void;
}

export default function InstallPWA({ installPromptEvent, onInstalled }: InstallPWAProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isInStandalone) setIsInstalled(true);
    const handler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, [isInStandalone]);

  const handleInstall = async () => {
    if (!installPromptEvent) return;
    const prompt = installPromptEvent as BeforeInstallPromptEvent;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      onInstalled();
      setIsInstalled(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2.5 text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl text-sm font-semibold">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>App instalado na tela de início ✓</span>
      </div>
    );
  }

  if (installPromptEvent) {
    return (
      <button
        onClick={handleInstall}
        className="w-full flex items-center gap-3 bg-[#FF6321] text-white px-4 py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all"
      >
        <Download size={18} className="shrink-0" />
        <span>Instalar app na tela de início</span>
      </button>
    );
  }

  if (isIOS && !isInStandalone) {
    if (showIOSGuide) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-[#FF6321] shrink-0" />
            <p className="font-bold text-gray-800 text-sm">Instalar no iPhone / iPad</p>
          </div>
          <ol className="space-y-2.5 text-gray-600 text-sm font-medium">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-[#FF6321] text-white rounded-full text-[10px] flex items-center justify-center font-black shrink-0 mt-0.5">1</span>
              <span>Toque em <Share2 size={13} className="inline mx-0.5 text-blue-500 align-middle" /> <strong>Compartilhar</strong> na barra do Safari</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-[#FF6321] text-white rounded-full text-[10px] flex items-center justify-center font-black shrink-0 mt-0.5">2</span>
              <span>Role para baixo e toque em <Plus size={13} className="inline mx-0.5 align-middle" /> <strong>Adicionar à Tela de Início</strong></span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-[#FF6321] text-white rounded-full text-[10px] flex items-center justify-center font-black shrink-0 mt-0.5">3</span>
              <span>Confirme tocando em <strong>Adicionar</strong> no canto superior direito</span>
            </li>
          </ol>
          <button
            onClick={() => setShowIOSGuide(false)}
            className="text-xs text-gray-400 font-semibold mt-1"
          >
            Fechar
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setShowIOSGuide(true)}
        className="w-full flex items-center gap-3 bg-white border border-gray-200 text-gray-700 px-4 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all"
      >
        <Plus size={18} className="text-[#FF6321] shrink-0" />
        <span>Instalar no iPhone / iPad</span>
      </button>
    );
  }

  return null;
}
