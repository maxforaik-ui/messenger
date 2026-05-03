# 🗂 Messenger Project State

## 🏷 Текущая версия
- **Архитектура**: `v5.4` (Tailwind CSS v4 Integration)
- **Дата обновления**: 2026-05-02
- **Статус**: ✅ Миграция стилей завершена (Inline styles заменены на Tailwind)
- **Репозиторий**: https://github.com/maxforaik-ui/messenger

## 📦 Стек
| Слой | Технологии |
|------|-----------|
| Frontend | React 18 + Vite + **Tailwind CSS v4** + Zustand + Socket.IO-client + @emoji-mart |
| Backend | Express + Prisma + PostgreSQL + Redis + Socket.IO + web-push + Zod + JWT |
| Auth/Security | JWT + bcryptjs + VAPID (Push) + Rate Limiting + Idempotency |
| UI/Styles | **Utility Classes (Tailwind)** + CSS Variables (Theming) + PWA + Service Worker |

## 🗂 Ключевые файлы & Raw Links

### Frontend
- `src/main.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/main.tsx)
- `src/index.css` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/index.css) (⚠️ **Новый файл с темами Tailwind**)
- `src/App.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/App.tsx)
- `src/store/useAppStore.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/store/useAppStore.ts)
- `src/components/AuthScreen.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/AuthScreen.tsx)
- `src/components/Sidebar.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/Sidebar.tsx)
- `src/components/ChatWindow.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/ChatWindow.tsx)
- `src/components/SettingsModal.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/SettingsModal.tsx)
- `src/components/PasswordModal.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/PasswordModal.tsx)
- `src/components/InstallPrompt.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/InstallPrompt.tsx)
- `src/styles/theme.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/styles/theme.ts) (⚠️ **Deprecated**, можно удалить)
- `vite.config.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/vite.config.ts)
- `package.json` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/package.json)

### Backend
- `src/main.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/main.ts)
- `src/db.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/db.ts)
- `src/auth.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/auth.ts)
- `src/push.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/push.ts)
- `src/redis.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/redis.ts)
- `prisma/schema.prisma` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/prisma/schema.prisma)
- `package.json` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/package.json)

## 🛠 Применённые критические фиксы (v5.4)

### v5.4 Tailwind Migration
- [x] **Tailwind CSS v4**: Интегрирован через `@tailwindcss/vite`
- [x] **CSS Variables**: Темизация перенесена в `index.css` (`--color-bg`, `--color-accent` и т.д.)
- [x] **Dark Mode**: Переключение через класс `.dark` на `<html>`
- [x] **Components Refactor**: `AuthScreen`, `App`, `Sidebar`, `ChatWindow`, `Modals` переведены на классы
- [x] **Удаление Inline Styles**: Убраны громоздкие объекты `themeTokens` и `createStyles`
- [x] **Состояние**: Код стал чище, объем файлов уменьшен

### v5.3 Fixes (Накопительно)
- [x] Статусы прочтения: Исправлена логика `POST /chats/read` (сохранение в БД + сокет)
- [x] Верстка Composer: Иконки и поле ввода выстроены в ряд (Flexbox)
- [x] Синтаксис: Убраны артефакты копирования (`& &`, `= >`)

## 📊 Структура базы данных (Prisma)
- **Soft Delete**: Используется поле `deletedAt` для Users, Chats, Messages.
- **Read Receipts**: Таблица `MessageRead` (составной ключ `[messageId, userId]`) для статусов прочтения.
- **Presence**: Статусы пользователей отслеживаются через Redis/Socket.

## 🧹 Технический долг / Cleanup
- [ ] **Удаление `theme.ts`**: Файл `frontend/src/styles/theme.ts` больше не используется компонентами. Рекомендуется удалить его и импорты из `useAppStore.ts` (если они есть).
- [ ] **Cleanup Imports**: Проверить, не осталось ли в компонентах импортов `themeTokens` и `createStyles`.

## 🎯 Roadmap v5.5 (Следующая версия)
- [ ] Оптимистичные обновления (Optimistic UI) для мгновенной реакции интерфейса.
- [ ] Улучшение поиска (PostgreSQL Full Text Search).
- [ ] Drag & Drop для файлов.
- [ ] CI/CD и E2E тесты.

## 🚀 Команды запуска

### Backend
```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
npm run dev