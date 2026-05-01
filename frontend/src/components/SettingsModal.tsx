import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch } from '../lib/api';

export function SettingsModal() {
  const { theme, toggleTheme, ui, setUi, me, setMe, reset } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  const [name, setName] = React.useState(me?.name || '');
  const [pw, setPw] = React.useState({ curr: '', next: '', conf: '' });
  const [msg, setMsg] = React.useState({ error: '', success: '' });

  if (!ui.showSettings) return null;

  const saveName = async () => {
    try {
      const res = await authFetch('/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error((await res.json()).message);
      const updated = await res.json(); setMe(updated); setMsg({ success: 'Имя обновлено', error: '' });
    } catch (e: any) { setMsg({ error: e.message, success: '' }); }
  };

  const changePw = async () => {
    if (pw.next !== pw.conf) return setMsg({ error: 'Пароли не совпадают', success: '' });
    try {
      const res = await authFetch('/me/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: pw.curr, nextPassword: pw.next, confirmPassword: pw.conf }) });
      if (!res.ok) throw new Error((await res.json()).message);
      setMsg({ success: 'Пароль изменён', error: '' }); setPw({ curr: '', next: '', conf: '' });
    } catch (e: any) { setMsg({ error: e.message, success: '' }); }
  };

  const deleteAccount = async () => {
    try {
      const res = await authFetch('/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
      if (!res.ok) throw new Error((await res.json()).message);
      reset();
    } catch (e: any) { setMsg({ error: e.message, success: '' }); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
      <div style={s.settingsCard}>
        <div style={s.settingsTitle}>Настройки</div>
        <div style={s.segmentedRow}>
          <button style={theme === 'light' ? s.segmentedActive : s.segmentedBtn} onClick={toggleTheme}>Светлая</button>
          <button style={theme === 'dark' ? s.segmentedActive : s.segmentedBtn} onClick={toggleTheme}>Тёмная</button>
        </div>
        <div style={s.settingsSection}>
          {/* ✅ FIX: e => */}
          <input value={name} onChange={e => setName(e.target.value)} style={s.input} />
          <button onClick={saveName} style={s.secondaryBtn}>Сохранить имя</button>
        </div>
        <div style={s.settingsSection}>
          <input type="password" placeholder="Текущий" value={pw.curr} onChange={e => setPw({ ...pw, curr: e.target.value })} style={s.input} />
          <input type="password" placeholder="Новый" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} style={s.input} />
          <input type="password" placeholder="Повтор" value={pw.conf} onChange={e => setPw({ ...pw, conf: e.target.value })} style={s.input} />
          <button onClick={changePw} style={s.secondaryBtn}>Сменить пароль</button>
        </div>
        <div style={s.settingsSectionDanger}>
          <button onClick={deleteAccount} style={s.dangerBtn}>Удалить аккаунт</button>
        </div>
        {msg.error && <div style={s.errorBox}>{msg.error}</div>}
        {msg.success && <div style={s.successBox}>{msg.success}</div>}
        {/* ✅ FIX: () => */}
        <button onClick={() => setUi({ showSettings: false })} style={s.secondaryBtn}>Закрыть</button>
      </div>
    </div>
  );
}