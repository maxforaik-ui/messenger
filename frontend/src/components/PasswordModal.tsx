import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch } from '../lib/api';

export function PasswordModal() {
  const { theme, ui, setUi } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  
  const [form, setForm] = React.useState({ curr: '', next: '', conf: '' });
  const [status, setStatus] = React.useState({ error: '', success: '' });
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.conf) {
      return setStatus({ error: 'Пароли не совпадают', success: '' });
    }
    setLoading(true);
    try {
      const res = await authFetch('/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.curr, nextPassword: form.next, confirmPassword: form.conf })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Ошибка');
      setStatus({ success: 'Пароль успешно изменен', error: '' });
      setForm({ curr: '', next: '', conf: '' });
      setTimeout(() => {
        setUi({ showPasswordModal: false });
        setStatus({ error: '', success: '' });
      }, 1500);
    } catch (e: any) {
      setStatus({ error: e.message, success: '' });
    } finally {
      setLoading(false);
    }
  };

  if (!ui.showPasswordModal) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={s.settingsCard}>
        <div style={s.settingsTitle}>Смена пароля</div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div style={s.settingsSection}>
            <input 
              type="password" 
              placeholder="Текущий пароль" 
              value={form.curr} 
              onChange={e => setForm({ ...form, curr: e.target.value })} 
              style={s.input} 
              required 
            />
            <input 
              type="password" 
              placeholder="Новый пароль" 
              value={form.next} 
              onChange={e => setForm({ ...form, next: e.target.value })} 
              style={s.input} 
              required 
            />
            <input 
              type="password" 
              placeholder="Повторите новый пароль" 
              value={form.conf} 
              onChange={e => setForm({ ...form, conf: e.target.value })} 
              style={s.input} 
              required 
            />
          </div>
          
          {status.error && <div style={s.errorBox}>{status.error}</div>}
          {status.success && <div style={s.successBox}>{status.success}</div>}
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setUi({ showPasswordModal: false })} style={s.secondaryBtn}>Отмена</button>
            <button type="submit" style={s.primaryBtn} disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}