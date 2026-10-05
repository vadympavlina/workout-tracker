# Pulse — Workout Tracker

Персональний mobile-first трекер тренувань: плани на тиждень, швидкий запис підходів під час тренування, журнал, статистика, рекорди та вага тіла. Статичний застосунок (React + Vite + TypeScript + Tailwind), розрахований на GitHub Pages; дані зберігаються в `localStorage`.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production-збірка в dist/
npm run preview    # перегляд збірки
npm run typecheck
```

## Деплой на GitHub Pages (вручну)

1. `npm run build`
2. Опублікуй вміст `dist/` — наприклад, у гілку `gh-pages`:
   ```bash
   git subtree push --prefix dist origin gh-pages   # або скопіюй dist/ у гілку вручну
   ```
   (`dist/` у `.gitignore`, тож для subtree спершу зроби `git add -f dist && git commit`.)
3. Settings → Pages → Source: *Deploy from a branch* → `gh-pages` / root.

Збірка не залежить від назви репозиторію:

- `base: './'` у `vite.config.ts` — усі шляхи до ресурсів відносні;
- `HashRouter` (`/#/plan`) — оновлення сторінки та глибокі посилання не дають 404;
- manifest, іконки та service worker підключені відносно сторінки, scope = папка застосунку;
- `.nojekyll` у `public/`.

## Архітектура

```
src/
  types/        доменні моделі (AppData, WorkoutPlan, WorkoutSession, ActiveWorkout…)
  services/     storage.ts — StorageAdapter (localStorage), dataService.ts — завантаження,
                збереження, демо-дані, експорт/імпорт з валідацією
  store/        DataContext (усі дані + дії), ActiveWorkoutContext (активне тренування)
  data/         бібліотека вправ, підписи, генератор демо-даних
  utils/        дати, форматування (uk-UA), статистика/рекорди, іконки, файли
  hooks/        useNow, useStartWorkout, useTheme, useTodayPlans…
  components/   ui/ (Button, Card, Modal/bottom sheet, Toast, ConfirmDialog, NumberInput…),
                workout/ (SetTable, ExercisePicker, WorkoutCard…), charts/, navigation/
  layouts/      AppLayout (sidebar / bottom nav), FocusLayout (тренування без навігації)
  pages/        екрани
```

Компоненти ніколи не звертаються до `localStorage` напряму. Ключі: `workout_user`, `workout_plans`, `workout_exercises`, `workout_sessions`, `workout_body_weight`, `workout_settings`, `workout_active`, `workout_meta`.

### Перехід на Firebase

`StorageAdapter` — асинхронний інтерфейс (`read` / `write` / `remove`). Для Firebase достатньо реалізувати його (або замінити `createDataService` на Firestore-виклики) і передати в `createDataService(adapter)` у `services/dataService.ts`. UI та store не змінюються.

## Дані

При першому запуску створюються демо-дані (Вадим Павліна, 198 см, ~2 місяці історії). У Профілі: експорт/імпорт JSON, відновлення демо-даних, повне очищення.
