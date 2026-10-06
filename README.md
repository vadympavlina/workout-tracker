# Pulse — Workout Tracker

Персональний mobile-first трекер тренувань: плани на тиждень, швидкий запис підходів під час тренування, журнал, статистика, рекорди та вага тіла. Статичний застосунок (React + Vite + TypeScript + Tailwind), розрахований на GitHub Pages. Вхід і синхронізація — Firebase Authentication + Realtime Database; застосунок local-first і працює офлайн.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production-збірка в dist/
npm run preview    # перегляд збірки
npm run typecheck
npm test           # unit-тести (Vitest): статистика, рекорди, формати, імпорт
npm run test:rules # правила безпеки RTDB на емуляторі Firebase
npm run test:e2e   # збірка під емулятори + браузерні тести (Playwright) на шляху /workout-tracker/
```

Емулятори Firebase (`firebase-tools`, ставиться як dev-залежність) потребують Java 21.

### Тести

- `src/**/*.test.ts` — unit-тести логіки (рекорди, обсяг, тижні, плюралізація, валідація імпорту).
- `tests/e2e/*.spec.ts` — сценарії в Chromium з мобільним вʼюпортом: повний цикл план → тренування → журнал → прогрес, запис підходів (−/+, перенесення ваги, видалення з undo, таймер, wake lock), «забуте» тренування, редактор (перетягування, незбережені зміни), онбординг, фото, відсутність горизонтального скролу, PWA.
- `tests/e2e/account.spec.ts` — вхід, скидання пароля, синхронізація між двома «пристроями», ізоляція акаунтів, вихід, перенесення даних, фото за посиланням.
- `tests/rules/` — правила безпеки: чужі дані недоступні, анонімний доступ заборонено, валідація структури й фото.
- E2E-тести працюють проти збірки `vite build --mode emulator` (`dist-e2e/`), яка ходить в емулятори Auth і Database; кожен тест створює власного користувача.
- `scripts/serve-dist.mjs` віддає збірку під `/workout-tracker/`, як GitHub Pages.

## Деплой на GitHub Pages (автоматично)

Workflow `.github/workflows/deploy.yml` на кожен push у `main`: typecheck → unit-тести → правила безпеки → збірка → E2E-тести на емуляторах Firebase → публікація `dist/`. Якщо хоч один тест падає, сайт не оновлюється. На pull request запускаються лише тести.

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

Компоненти ніколи не звертаються до сховища напряму — лише через `dataService`.

## Firebase

- `services/firebase.ts` — конфіг вебзастосунку (публічний за задумом; доступ обмежують правила), підключення до емуляторів у режимі `emulator`.
- `services/auth.ts` + `store/AuthGate.tsx` — обовʼязковий вхід email/пароль (реєстрації немає — користувачів створює власник у консолі), скидання пароля, вихід.
- `services/cloudSync.ts` — Realtime Database: `users/{uid}/data` (профіль, налаштування, колекції як `{id: запис}`), `users/{uid}/active` (поточне тренування), `users/{uid}/media` (стиснуті фото власних вправ).
- **Local-first**: кожна зміна одразу пишеться в `localStorage` (ключі з префіксом `u:{uid}:`, окремо для кожного акаунта) і точково відправляється в хмару. Поки сервер не підтвердив запис, акаунт позначено «брудним» — після офлайну локальні зміни відправляються при наступному запуску. При відкритті та поверненні в застосунок підтягується свіжа копія з хмари (якщо немає невідправлених змін).
- При виході кеш акаунта видаляється з пристрою. Дані, створені до появи акаунтів, при першому вході можна перенести в акаунт.
- `database.rules.json` — кожен користувач читає й пише лише `users/{свій uid}`; структура та розмір фото валідуються.

## Фото вправ

Фото стандартних вправ — [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense / суспільне надбання), по два кадри (початок/кінець руху), перекодовані у WebP: `public/exercises/<id>/{0,1}.webp`. Мапінг вправ і цільових мʼязів — `src/data/exerciseMedia.ts`. Фото власних вправ: або посилання на картинку (`photoUrl`), або завантажене фото — стискається до ~100–200 КБ, зберігається в `users/{uid}/media` і кешується в IndexedDB (`services/mediaStore.ts`); включається в JSON-експорт.

## Дані

Новий акаунт починає з екрана привітання: власний профіль, демо-дані (Вадим Павліна, 198 см, ~2 місяці історії) або відновлення з файлу. У Профілі: експорт/імпорт JSON, відновлення демо-даних, повне очищення.
