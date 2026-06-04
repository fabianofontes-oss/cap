import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-[900] flex justify-center px-4 pt-2 pointer-events-none">
      <div className="bg-gray-900/95 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl pointer-events-auto max-w-sm w-full">
        <WifiOff size={15} className="text-orange-400 shrink-0" />
        <p className="text-xs font-semibold flex-1 leading-snug">
          Você está offline. Algumas funções podem estar limitadas.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0"
          aria-label="Fechar aviso"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
