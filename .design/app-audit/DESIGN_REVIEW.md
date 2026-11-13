# Design Review: Pulse — every screen, sheet and menu

Reviewed against: the current product (no separate brief) — dark, mobile-first PWA, Liquid Glass (glisse) controls, lime accent.
Method: `designer-skills/design-review` (+ `information-architecture`, `frontend-design` mobile-first rules).
Date: 2026-11-13

## How it was checked

- **Screenshots:** 39 states × 3 widths (375×812, 768×1024, 1280×800), full page — login/reset, welcome, onboarding, empty states,
  every tab, exercise library + detail, muscle picker, plan view/editor, picker + preview, session + ⋯ menu, all profile sheets,
  active workout (rest, media sheet, swap, confirm), summary, help, 404. Captured with Playwright against the Firebase emulators.
- **Automated:** axe-core on every mobile state; custom checks for tap targets < 40px and text < 11.5px; horizontal-overflow test (already in CI).
- **Code:** UI primitives (`components/ui`), pages, tokens in `index.css` / Tailwind, duplicate patterns, naming.

## Summary

The product is consistent and readable after the glisse migration; layouts adapt properly at all three widths and nothing overflows.
The audit found two real bugs (a fresh account saw its first days as «Пропущено»; bodyweight sets showed «0 кг × 17»), a handful of
critical ARIA errors in the calendar and year heatmap, and several "rough edges" in dense screens (plan editor, progress, help).
All Must-fix and most Should-fix items are fixed in this pass; the rest are listed below for a decision.

## Must Fix — fixed

1. **Fresh account sees «Пропущено» for days before it existed** (`Dashboard › WeekPlan`). Plans scheduled before the account's
   creation day are no longer shown as missed.
2. **Bodyweight sets as «0 кг × 17», «Обсяг 0 кг»** (session, records, summary, home, exercise page, record toast). New
   `formatSet()` shows «17 повт.»; zero volume lines are hidden.
3. **Critical ARIA in the month calendar and year heatmap** (`HistoryPage`, `ActivityHeatmap`): `grid/row/gridcell` roles
   without the required structure and `aria-pressed` on gridcells. Now groups of buttons.
4. **Accessible names that don't contain the visible text** (plan-editor days «Пн», RIR chips «0…4+», rest timer, home avatar).
5. **Invalid `<dl>`** in the weekly summary; **missing h1** on 404; **heading jumps** (h1 → h3) on empty pages.
6. **Contrast 4.4:1** of «Спереду / Ззаду» captions → raised to the muted tone (≥ 4.5:1).

axe now reports nothing except `meta-viewport` — zoom is disabled on purpose (requested earlier).

## Should Fix — fixed

1. **Rings on Welcome and Summary** (disliked, removed from Home earlier) → anatomical body: a "full week" figure on Welcome,
   the muscles of *this* workout on Summary.
2. **Plan editor:** rest presets were a cut-off horizontal strip («3 >») with an ambiguous «1,5» and 32px chips → a 6-column
   glass grid, «1,5 хв», 36px; exercise names wrap to two lines instead of «Жим грудей у тре…»; day toggles use glass.
3. **Plan page header had three loose icons** (edit, duplicate, delete) → «Редагувати» + a glisse ⋯ menu (Дублювати, Видалити),
   same pattern as a finished workout.
4. **Confirm dialogs:** «Скасувати тренування» wrapped onto two lines inside a half-width button → buttons stack on phones
   (action on top), side by side from `sm`.
5. **Progress was 5000px long** — 17 records always open → newest 5 + «Показати всі (17)»; volume axis mixed «38k» and «9500» → one format.
6. **Help was a wall of text** → collapsible topics (first open), text uses the full card width.
7. **Home tiles:** «13 225 кг» wrapped under its tile → «13,2 т»; «ще немає середньо…» truncated → «немає даних».
8. **Naming:** Summary said «Загальна вага» while the rest of the app says «Обсяг» → «Обсяг».
9. **Equipment chips 32px** → 36px.

## Could Improve — open (needs a decision or a bigger pass)

1. **Type scale sprawl:** 25 distinct `text-[Npx]` sizes and 10 radii in components. Suggest 7 named sizes
   (11/13/15/17/20/26/34) and 4 radii (12/16/22/full) as Tailwind tokens, then replace the one-offs.
2. **36px icon buttons** (calendar arrows, weight-row delete, photo pause, reorder ↑↓): usable, but below the 44px guideline.
   Could grow to 44 where there's room.
3. **Year heatmap cells are 12×12** — fine as a chart, small as buttons; tapping a day could open a larger popover.
4. **Desktop home:** the 7-day muscle card is wide with small figures and a lot of empty space; a two-column card
   (figures + ranking) like on Progress would use it better.
5. **Plan editor on desktop:** the sticky Cancel/Save bar floats over the exercise list; on wide screens it could live in the header.
6. **Empty home for a new user** shows four empty cards (workout, week, last workout, records) with repeated «Почати тренування»;
   a single "first steps" card would be calmer.

## What Works Well

- Layouts reorganise (not just shrink) at 768 and 1280: sidebar on desktop, two-column library, multi-column stats.
- Liquid Glass controls are consistent: one button system, one segmented bar, one menu, one search field.
- Every destructive action has a confirmation or «Повернути»; nothing scrolls sideways at 320–1280px (CI test).
- Muscle maps (thumbnails, week map, picker, summary) give the app a recognisable visual language instead of generic charts.
