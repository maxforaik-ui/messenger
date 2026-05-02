import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { trpc } from '../lib/trpc';
import { themeTokens, createStyles } from '../styles/theme';

export function AuthScreen() {
  const { me, token, theme } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  const [mode, setMode] = React.useState<'login' | 'register'>('register');
  const [form, setForm] = React.useState({ email: '', name: '', password: '' });
  const [error, setError] = React.useState('');

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      useAppStore.setState({ token: data.token, me: data.user });
    },
    onError: (err) => {
      setError(err.message);
    }
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      useAppStore.setState({ token: data.token, me: data.user });
    },
    onError: (err) => {
      setError(err.message);
    }
  });

  if (me && token) return null;

  const submit = async () => {
    setError('');
    if (mode === 'register') {
      registerMutation.mutate({ email: form.email, name: form.name, password: form.password });
    } else {
      loginMutation.mutate({ email: form.email, password: form.password });
    }
  };

  return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={s.authLogo}>✈️</div>
        <h1 style={{ margin: 0, color: p.text }}>Messenger 5.0</h1>
        <p style={{ margin: 0, color: p.muted }}>Zustand + Компоненты</p>
        <div style={s.switcher}>
          <button onClick={() => setMode('register')} style={mode === 'register' ? s.switchActive : s.switchBtn}>Регистрация</button>
          <button onClick={() => setMode('login')} style={mode === 'login' ? s.switchActive : s.switchBtn}>Вход</button>
        </div>
        {/* ✅ FIX: &&, e => */}
        {mode === 'register' && <input placeholder="Имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={s.input} />}
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={s.input} />
        <input placeholder="Пароль" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={s.input} />
        {error && <div style={s.errorBox}>{error}</div>}
        <button onClick={submit} style={s.primaryBtn}>{mode === 'register' ? 'Создать аккаунт' : 'Войти'}</button>
      </div>
    </div>
  );
}