import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { authFetch } from '../lib/api';

export function AuthScreen() {
  const { me, token, setMe, setToken } = useAppStore();
  const [mode, setMode] = React.useState<'login' | 'register'>('register');
  const [form, setForm] = React.useState({ email: '', name: '', password: '' });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  if (me && token) return null;

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await authFetch(`/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { email: form.email, name: form.name, password: form.password } : { email: form.email, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setToken(data.token);
      setMe(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-chat-bg)] p-4">
      <div className="w-full max-w-[420px] bg-[var(--color-surface)] p-7 rounded-[20px] shadow-[var(--shadow-custom)] grid gap-3.5">
        
        <div className="w-14 h-14 rounded-xl bg-[var(--color-accent)] text-white grid place-items-center text-2xl font-bold">
          ✈️
        </div>
        
        <h1 className="m-0 text-[var(--color-text)]">Messenger 5.4</h1>
        {/*<p className="m-0 text-[var(--color-text-muted)]">Tailwind v4 + Zustand</p>*/}
        
        {/* Переключатель Вход / Регистрация */}
        <div className="flex gap-2">
          <button 
            onClick={() => setMode('register')} 
            className={`flex-1 py-2.5 px-3 rounded-xl border cursor-pointer text-sm ${
              mode === 'register' 
                ? 'border-none bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold' 
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          >
            Регистрация
          </button>
          <button 
            onClick={() => setMode('login')} 
            className={`flex-1 py-2.5 px-3 rounded-xl border cursor-pointer text-sm ${
              mode === 'login' 
                ? 'border-none bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold' 
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          >
            Вход
          </button>
        </div>

        {mode === 'register' && (
          <input 
            placeholder="Имя" 
            value={form.name} 
            onChange={e => setForm({ ...form, name: e.target.value })} 
            className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" 
          />
        )}
        
        <input 
          placeholder="Email" 
          value={form.email} 
          onChange={e => setForm({ ...form, email: e.target.value })} 
          className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" 
        />
        
        <input 
          placeholder="Пароль" 
          type="password" 
          value={form.password} 
          onChange={e => setForm({ ...form, password: e.target.value })} 
          className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" 
        />
        
        {error && (
          <div className="bg-[#fff1f2] text-[#be123c] border border-[#fecdd3] rounded-xl p-2.5 text-sm">
            {error}
          </div>
        )}
        
        <button 
          onClick={submit} 
          disabled={loading}
          className="py-3 px-4 rounded-xl border-none bg-[var(--color-accent)] text-white cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Загрузка...' : (mode === 'register' ? 'Создать аккаунт' : 'Войти')}
        </button>
      </div>
    </div>
  );
}