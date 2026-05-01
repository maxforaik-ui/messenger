import React, { useState, useEffect } from 'react';
import { themeTokens } from '../styles/theme';

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
  const p = themeTokens.light;

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
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#111827', color: '#f9fafb', padding: '14px 20px', borderRadius: 16,
      boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', gap: 12, alignItems: 'center', zIndex: 1000,
      maxWidth: '90vw', fontFamily: 'system-ui, sans-serif'
    }}>
      <span style={{ fontSize: 14 }}>📲 Установить Messenger</span>
      <button onClick={install} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: p.accent, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Установить</button>
      <button onClick={() => setVisible(false)} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
    </div>
  );
}