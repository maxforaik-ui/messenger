import React, { useState, useEffect } from 'react';

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
  interface WindowEventMap { beforeinstallprompt: BeforeInstallPromptEvent; }
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setPrompt(null);
  };

  if (!visible || !prompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111827] text-[#f9fafb] px-5 py-3.5 rounded-2xl shadow-lg flex gap-3 items-center z-[1000] max-w-[90vw] font-sans">
      <span className="text-sm">📲 Установить Messenger</span>
      <button onClick={install} className="px-3.5 py-2 rounded-lg border-none bg-[var(--color-accent)] text-white cursor-pointer font-semibold text-sm">
        Установить
      </button>
      <button onClick={() => setVisible(false)} className="px-2.5 py-2 rounded-lg border-none bg-transparent text-[#9ca3af] cursor-pointer">
        ✕
      </button>
    </div>
  );
}