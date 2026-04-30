# 🗂 Messenger Project State

## 🏷 Текущая версия
- **Архитектура**: `v5.0` (React Components + Zustand + Socket.IO)
- **Дата обновления**: 2026-04-30
- **Статус**: ✅ Стабильно (критические ошибки исправлены)
- **Репозиторий**: https://github.com/maxforaik-ui/messenger

## 📦 Стек
| Слой | Технологии |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + Zustand + Socket.IO-client |
| Backend | Express + Prisma + PostgreSQL + Redis + Socket.IO + Zod + JWT |
| Auth | JWT + bcryptjs |
| UI/Styles | Inline CSS + Theme Tokens (Light/Dark) |

## 🗂 Ключевые файлы & Raw Links
### Frontend
- `src/main.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/main.tsx)
- `src/App.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/App.tsx)
- `src/store/useAppStore.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/store/useAppStore.ts)
- `src/lib/api.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/lib/api.ts)
- `src/lib/socket.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/lib/socket.ts)
- `src/styles/theme.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/styles/theme.ts)
- `src/components/AuthScreen.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/AuthScreen.tsx)
- `src/components/Sidebar.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/Sidebar.tsx)
- `src/components/ChatWindow.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/ChatWindow.tsx)
- `src/components/SettingsModal.tsx` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/frontend/src/components/SettingsModal.tsx)

### Backend
- `src/main.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/main.ts)
- `src/db.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/db.ts)
- `src/auth.ts` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/src/auth.ts)
- `prisma/schema.prisma` → [Raw](https://raw.githubusercontent.com/maxforaik-ui/messenger/main/backend/prisma/schema.prisma)

## 🛠 Применённые критические фиксы (v5.0 Stable)
- [x] `package.json`: Убраны пробелы в ключах, `& &` → `&&`
- [x] `frontend/main.tsx`: Добавлен `<App />` в `ReactDOM.createRoot`
- [x] `Sidebar.tsx`: Добавлен `setUsers` в деструктуризацию `useAppStore()`
- [x] `ChatWindow.tsx`: Убрано ручное `setMessages` после отправки (убраны дубликаты)
- [x] `App.tsx`: Toast теперь реактивный (`ui.toast` из хука, не `getState()`)
- [x] `backend/main.ts`: Добавлен ключ `data:` во все Prisma `create/update`, `pinnedMessages` → `pins`
- [x] Синтаксис: Заменены все `() = >` → `() =>` по всему проекту

## 🐛 Известные проблемы / Тех. долг
- [ ] Пагинация сообщений в чате (загрузка всей истории сразу)
- [ ] Обработка офлайн-режима и переподключение сокетов
- [ ] Soft delete для пользователей/сообщений (сейчас `Cascade`)
- [ ] Типизация `formatMessage(message: any)` → вынести в общий `types.ts`

## 🎯 Следующие задачи (Roadmap v5.1)
1. [ ] Маршрутизация через `react-router-dom` (глубокие ссылки `/chat/:id`)
2. [ ] Infinite scroll для сообщений (`?limit=50&before=cursor`)
3. [ ] Drag & Drop загрузка файлов в чат
4. [ ] PWA: манифест, service worker, иконки
5. [ ] CI/CD: GitHub Actions для авто-деплоя

## 📋 Протокол отправки кода в чат
Чтобы я мог быстро помогать, используй этот формат: