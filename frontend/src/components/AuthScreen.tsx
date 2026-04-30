import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch } from '../lib/api';

export function AuthScreen() {
  const { me, token, theme } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  const [mode, setMode] = React.useState<'login'|'register'>('register');
  const [form, setForm] = React.useState({ email:'', name:'', password:'' });
  const [error, setError] = React.useState('');

  if (me && token) return null;

  const submit = async () => {
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(mode === 'register' ? { email: form.email, name: form.name, password: form.password } : { email: form.email, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      useAppStore.setState({ token: data.token, me: data.user });
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={s.authLogo}>✈️</div>
        <h1 style={{ margin:0, color:p.text }}>Messenger 5.0</h1>
        <p style={{ margin:0, color:p.muted }}>Zustand + Компоненты + PWA база</p>
        <div style={s.switcher}>
          <button onClick={() => setMode('register')} style={mode==='register' ? s.switchActive : s.switchBtn}>Регистрация</button>
          <button onClick={() => setMode('login')} style={mode==='login' ? s.switchActive : s.switchBtn}>Вход</button>
        </div>
        {mode==='register' && <input placeholder="Имя" value={form.name} onChange={e => setForm({...form, name:e.target.value})} style={s.input} />}
        <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} style={s.input} />
        <input placeholder="Пароль" type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} style={s.input} />
        {error && <div style={s.errorBox}>{error}</div>}
        <button onClick={submit} style={s.primaryBtn}>{mode==='register'?'Создать аккаунт':'Войти'}</button>
      </div>
    </div>
  );
}