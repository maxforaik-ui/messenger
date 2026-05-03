import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { authFetch } from '../lib/api';

export function SettingsModal() {
  const { theme, toggleTheme, ui, setUi, me, setMe, reset } = useAppStore();
  const [name, setName] = React.useState(me?.name || '');
  const [pw, setPw] = React.useState({ curr: '', next: '', conf: '' });
  const [msg, setMsg] = React.useState({ error: '', success: '' });

  if (!ui.showSettings) return null;

  const saveName = async () => {
    try {
      const res = await authFetch('/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error((await res.json()).message);
      const updated = await res.json();
      setMe(updated);
      setMsg({ success: 'Имя обновлено', error: '' });
    } catch (e: any) {
      setMsg({ error: e.message, success: '' });
    }
  };

  const changePw = async () => {
    if (pw.next !== pw.conf) return setMsg({ error: 'Пароли не совпадают', success: '' });
    try {
      const res = await authFetch('/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.curr, nextPassword: pw.next, confirmPassword: pw.conf })
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setMsg({ success: 'Пароль изменён', error: '' });
      setPw({ curr: '', next: '', conf: '' });
    } catch (e: any) {
      setMsg({ error: e.message, success: '' });
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await authFetch('/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
      if (!res.ok) throw new Error((await res.json()).message);
      reset();
    } catch (e: any) {
      setMsg({ error: e.message, success: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-[100]">
      <div className="mx-[14px] mb-[14px] p-[14px] rounded-[16px] bg-[var(--color-sidebar-alt)] border border-[var(--color-border)] grid gap-3 w-[340px]">
        
        <div className="font-bold text-[var(--color-text)]">Настройки</div>
        
        {/* Тема */}
        <div className="flex gap-2">
          <button 
            onClick={toggleTheme} 
            className={`flex-1 py-2.5 px-3 rounded-xl border cursor-pointer text-sm ${
              theme === 'light' 
                ? 'border-none bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold' 
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          >
            ☀️ Светлая
          </button>
          <button 
            onClick={toggleTheme} 
            className={`flex-1 py-2.5 px-3 rounded-xl border cursor-pointer text-sm ${
              theme === 'dark' 
                ? 'border-none bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold' 
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          >
            🌙 Тёмная
          </button>
        </div>
        
        {/* Имя */}
        <div className="grid gap-2">
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" 
          />
          <button onClick={saveName} className="py-2.5 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer font-semibold">
            Сохранить имя
          </button>
        </div>

        {/* Пароль */}
        <div className="grid gap-2">
          <input 
            type="password" placeholder="Текущий" 
            value={pw.curr} onChange={e => setPw({ ...pw, curr: e.target.value })} 
            className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" 
          />
          <input 
            type="password" placeholder="Новый" 
            value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} 
            className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" 
          />
          <input 
            type="password" placeholder="Повтор" 
            value={pw.conf} onChange={e => setPw({ ...pw, conf: e.target.value })} 
            className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" 
          />
          <button onClick={changePw} className="py-2.5 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer font-semibold">
            Сменить пароль
          </button>
        </div>

        {/* Удаление */}
        <div className="grid gap-2 pt-2 border-t border-dashed border-[var(--color-border)]">
          <button onClick={deleteAccount} className="py-2.5 px-3.5 rounded-xl border-none bg-[#dc2626] text-white cursor-pointer font-bold">
            Удалить аккаунт
          </button>
        </div>

        {msg.error && <div className="bg-[#fff1f2] text-[#be123c] border border-[#fecdd3] rounded-xl p-2.5 text-sm">{msg.error}</div>}
        {msg.success && <div className="bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] rounded-xl p-2.5 text-sm">{msg.success}</div>}

        <button 
          onClick={() => setUi({ showSettings: false })} 
          className="py-2.5 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer font-semibold"
        >
          Закрыть
        </button>

      </div>
    </div>
  );
}