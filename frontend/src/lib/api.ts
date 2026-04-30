import { useAppStore } from '../store/useAppStore';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function authFetch(path: string, init?: RequestInit) {
  const token = useAppStore.getState().token;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) }
  });
  if (res.status === 401) { 
    useAppStore.getState().reset(); 
    window.location.reload(); 
  }
  return res;
}
export const createIdempotencyKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;