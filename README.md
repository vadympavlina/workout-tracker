# Pulse — Workout Tracker

Персональний mobile-first трекер тренувань: плани на тиждень, швидкий запис підходів під час тренування, журнал, статистика, рекорди та вага тіла. Статичний застосунок (React + Vite + TypeScript + Tailwind), розрахований на GitHub Pages; дані зберігаються в `localStorage`.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production-збірка в dist/
npm run preview    # перегляд збірки
npm run typecheck
npm test           # unit-тести (Vitest): статистика, рекорди, формати, імпорт
npm run test:e2e   # збірка + браузерні тести (Playwright) на шляху /workout-tracker/
```

### Тести

- `src/**/*.test.ts` — unit-тести логіки (рекорди, обсяг, тижні, плюралізація, валідація імпорту).
- `tests/e2e/*.spec.ts` — сценарії в Chromium з мобільним вʼюпортом: повний цикл план → тренування → журнал → прогрес, запис підходів (−/+, перенесення ваги, видалення з undo, таймер, wake lock), «забуте» тренування, редактор (перетягування, незбережені зміни), онбординг, фото, відсутність горизонтального скролу, PWA.
- `scripts/serve-dist.mjs` віддає `dist/` під `/workout-tracker/`, як GitHub Pages.

## Деплой на GitHub Pages (автоматично)

Workflow `.github/workflows/deploy.yml` на кожен push у `main`: typecheck → unit-тести → збірка → E2E-тести → публікація `dist/`. Якщо хоч один тест падає, сайт не оновлюється. На pull request запускаються лише тести.

Одноразове налаштування: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Адреса сайту: `https://<user>.github.io/<repo>/`.

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

## Фото вправ

Фото стандартних вправ — [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense / суспільне надбання), по два кадри (початок/кінець руху), перекодовані у WebP: `public/exercises/<id>/{0,1}.webp`. Мапінг вправ і цільових мʼязів — `src/data/exerciseMedia.ts`. Фото власних вправ зберігаються в IndexedDB (`services/mediaStore.ts`) і включаються в JSON-експорт.

## Дані

При першому запуску створюються демо-дані (Вадим Павліна, 198 см, ~2 місяці історії). У Профілі: експорт/імпорт JSON, відновлення демо-даних, повне очищення.
