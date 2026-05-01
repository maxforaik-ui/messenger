# 🗂 Messenger Project State

## 🏷 Текущая версия
- **Архитектура**: `v5.2` (React Components + Zustand + Socket.IO + PWA)
- **Дата обновления**: 2026-05-01
- **Статус**: ✅ Стабильно (Push-уведомления, пагинация, статусы пользователей)
- **Репозиторий**: https://github.com/maxforaik-ui/messenger

## 📦 Стек
| Слой | Технологии |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + Zustand + Socket.IO-client + VitePWA |
| Backend | Express + Prisma + PostgreSQL + Socket.IO + Zod + JWT |
| Auth | JWT + bcryptjs |
| UI/Styles | Inline CSS + Theme Tokens (Light/Dark) |
| PWA | Service Worker + Push API + Manifest |

## 🗂 Ключевые файлы & Raw Links
### Frontend
- `src/main.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/main.tsx)
- `src/App.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/App.tsx)
- `src/types.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/types.ts)
- `src/store/useAppStore.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/store/useAppStore.ts)
- `src/lib/api.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/lib/api.ts)
- `src/lib/socket.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/lib/socket.ts)
- `src/lib/push.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/lib/push.ts)
- `src/styles/theme.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/styles/theme.ts)
- `src/components/AuthScreen.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/AuthScreen.tsx)
- `src/components/Sidebar.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/Sidebar.tsx)
- `src/components/ChatWindow.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/ChatWindow.tsx)
- `src/components/SettingsModal.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/SettingsModal.tsx)
- `sw.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/sw.ts)
- `vite.config.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/vite.config.ts)

### Backend
- `src/main.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/main.ts)
- `src/db.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/db.ts)
- `src/auth.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/auth.ts)
- `prisma/schema.prisma` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/prisma/schema.prisma)

## 🛠 Применённые критические фиксы (v5.0 - v5.2)
### v5.0 Stable
- [x] `package.json`: Убраны пробелы в ключах, `& &` → `&&`
- [x] `frontend/main.tsx`: Добавлен `<App />` в `ReactDOM.createRoot`
- [x] `Sidebar.tsx`: Добавлен `setUsers` в деструктуризацию `useAppStore()`
- [x] `ChatWindow.tsx`: Убрано ручное `setMessages` после отправки (убраны дубликаты)
- [x] `App.tsx`: Toast теперь реактивный (`ui.toast` из хука, не `getState()`)
- [x] `backend/main.ts`: Добавлен ключ `data:` во все Prisma `create/update`, `pinnedMessages` → `pins`
- [x] Синтаксис: Заменены все `() = >` → `() =>` по всему проекту

### v5.1 Updates
- [x] Исправлена типизация `import.meta.env` через `vite-env.d.ts`
- [x] Удалён дублирующийся `src/vite.config.ts`
- [x] Закомментирован импорт i18next (библиотека не установлена)
- [x] Исправлен тип `Chat` в `socket.ts` (удалено несуществующее свойство `messages`)

### v5.2 Features
- [x] **Push-уведомления**: Настроен VitePWA с кастомным `sw.ts`, обработка push-событий
- [x] **Пагинация сообщений**: Реализована загрузка по 50 сообщений с сохранением позиции скролла
- [x] **Статусы пользователей**: Добавлен `UserStatus` ('online' | 'offline' | 'away' | 'dnd') в типы
- [x] **Soft Delete**: В `schema.prisma` добавлено поле `deletedAt` для `User`, `Chat`, `Message`
- [x] **Настройки уведомлений**: В `SettingsModal` добавлены переключатели (звук, упоминания, mute)
- [x] **Оптимистичные обновления**: Реакции и удаления обновляют UI мгновенно до ответа сервера
- [x] **Изолированный скролл**: Область сообщений имеет фиксированную высоту, страница не прокручивается

## 📊 Структура базы данных (Prisma)
### Основные модели с Soft Delete
- **User**: `id`, `email`, `name`, `passwordHash`, `deletedAt?`
- **Chat**: `id`, `isDirect`, `title?`, `deletedAt?`
- **Message**: `id`, `chatId`, `senderId`, `body?`, `reactions`, `deletedAt?`
- **ChatMember**: Составной ключ `[userId, chatId]`, роль, `lastReadAt`
- **MessageRead**: Составной ключ `[messageId, userId]`
- **Attachment**: `url`, `storagePath`, `uploaderId?` (SetNull при удалении)
- **PinnedMessage**: 1:1 связь с `Message`, составной ключ `[chatId, messageId]`
- **PushSubscription**: `endpoint`, `keys` (JSON), `userAgent?`

## 🐛 Известные проблемы / Тех. долг
### Критические
- [ ] **PWA Install Prompt**: Нет UI-баннера "Установить приложение" (требует обработки `beforeinstallprompt`)
- [ ] **Offline fallback**: Отсутствует страница `offline.html` для режима без сети
- [ ] **Desktop Chrome Push**: Не работает при полностью закрытой вкладке (ограничение браузера, требует установки PWA)
- [ ] **iOS Safari Push**: Не поддерживает стандартный Push API без установки на домашний экран

### Средние
- [ ] **IntersectionObserver**: Пагинация использует `onScroll`, нужно заменить на Observer для производительности
- [ ] **Редактирование сообщений**: Нет UI для редактирования отправленных сообщений
- [ ] **Цитирование**: Отсутствует функционал цитирования и тредов
- [ ] **Drag & Drop**: Загрузка файлов только через input, нет drag-drop зоны

### Низкие
- [ ] **Виртуализация списков**: При 1000+ сообщений может быть медленно (требуется react-window)
- [ ] **E2E тесты**: Отсутствуют автотесты (Playwright/Cypress)
- [ ] **CI/CD**: Нет GitHub Actions для авто-тестов и деплоя
- [ ] **Storybook**: Нет документации компонентов

## 🎯 Roadmap v5.3 (Следующая версия)
### Приоритет 1 (UX/UI)
1. [ ] Компонент `InstallPrompt.tsx` с баннером установки PWA
2. [ ] Страница `offline.html` с кэшированием в Service Worker
3. [ ] Замена `onScroll` на `IntersectionObserver` в `ChatWindow.tsx`
4. [ ] Drag & Drop зона для загрузки файлов

### Приоритет 2 (Функционал)
5. [ ] Редактирование отправленных сообщений (UI + API)
6. [ ] Цитирование сообщений и треды
7. [ ] Статусы прочтения в реальном времени (typing indicators уже есть)
8. [ ] Расширенные реакции (выбор эмодзи через Picker)

### Приоритет 3 (Инфраструктура)
9. [ ] GitHub Actions: линтер, типизация, тесты при PR
10. [ ] E2E тесты на Playwright (аутентификация, отправка сообщения)
11. [ ] Мониторинг ошибок (Sentry или аналог)

## 🔧 Переменные окружения
### Frontend (.env)
```bash
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/messenger
JWT_SECRET=your_secret_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_PUBLIC_KEY=your_public_key
```

## 📋 Генерация VAPID ключей
```bash
npx web-push generate-vapid-keys
# Сохраните вывод в .env frontend и backend
```

## 🚀 Команды запуска
```bash
# Backend
cd backend
npm run db:migrate
npm run start

# Frontend
cd frontend
npm install
npm run build
npm run preview
```