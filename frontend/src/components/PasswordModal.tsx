import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { authFetch } from '../lib/api';

export function PasswordModal() {
  const { ui, setUi } = useAppStore();
  const [form, setForm] = React.useState({ curr: '', next: '', conf: '' });
  const [status, setStatus] = React.useState({ error: '', success: '' });
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.conf) return setStatus({ error: 'Пароли не совпадают', success: '' });
    setLoading(true);
    try {
      const res = await authFetch('/me/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-[200]">
      <div className="mx-[14px] mb-[14px] p-[14px] rounded-[16px] bg-[var(--color-sidebar-alt)] border border-[var(--color-border)] grid gap-3 w-[340px]">
        <div className="font-bold text-[var(--color-text)]">Смена пароля</div>
        
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <input
              type="password" placeholder="Текущий пароль" value={form.curr}
              onChange={e => setForm({ ...form, curr: e.target.value })}
              className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" required
            />
            <input
              type="password" placeholder="Новый пароль" value={form.next}
              onChange={e => setForm({ ...form, next: e.target.value })}
              className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" required
            />
            <input
              type="password" placeholder="Повторите новый пароль" value={form.conf}
              onChange={e => setForm({ ...form, conf: e.target.value })}
              className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border" required
            />
          </div>
          
          {status.error && <div className="bg-[#fff1f2] text-[#be123c] border border-[#fecdd3] rounded-xl p-2.5 text-sm">{status.error}</div>}
          {status.success && <div className="bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] rounded-xl p-2.5 text-sm">{status.success}</div>}
          
          <div className="flex gap-3">
            <button type="button" onClick={() => setUi({ showPasswordModal: false })} className="flex-1 py-2.5 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer font-semibold">Отмена</button>
            <button type="submit" className="flex-1 py-2.5 px-3.5 rounded-xl border-none bg-[var(--color-accent)] text-white cursor-pointer font-bold disabled:opacity-60" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}