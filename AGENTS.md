# TLITODOS frontend implementation context

## Product sources

- Figma: `https://www.figma.com/design/6mBMtcwDlauTX5Gipia3Ua/TLITODOS-Design?m=dev`
- Figma page: `7:2` (`Design`)
- The file is split into two sections: `my` `167:891` and `group` `167:892`
- `my` screens: main/today `832:899`, detail `68:512`, diary `157:1451`, profile `157:1873`, alarm `139:492`
- `my` modals: insert/update `1023:2502`, deadline day `96:393`, deadline time `141:1044`, routine `140:898`, category `1815:1536`, bet `167:878` / `1815:1569` (non-MVP)
- API contract: `~/Desktop/TLITODOS-Backend/docs/openapi.json` (keep the repository copy `openapi.json` synchronized)
- Development API: `http://localhost:8000`
- Stack: React, TypeScript, Emotion, TanStack Query, Zustand, React Router, pnpm workspace

## Product invariants

- Category order is `해야할 일` -> custom category 1 -> custom category 2 -> `취미`.
- A category's accent is the `color` the server returns for it, used for the label, the completion mark and the calendar dots; dots and completion marks render it at 80% opacity. Figma draws the calendar dots in other colours — that is deliberately ignored.
- `strong` in `CATEGORY_PRESETS` is only the seed: it is stored when the four categories are created, and it is the fallback when the server value is missing or not a colour.
  - 해야할 일: `#ff5e9a`, custom 1: `#ff00a2`, custom 2: `#ff8cb6`, 취미: `#ff3959`
- Users pick a category's colour on the profile screen from `CATEGORY_SWATCHES` (24 colours from Figma).
- The category label sits on a neutral `#eef1f6` pill; there is no per-category background any more.
- `해야할 일` and `취미` are locked. Custom categories can be renamed but cannot be deleted in the UI.
- Create exactly four categories for a newly created user in the order above.
- Own todo pages allow adding, editing, and completing todos for any selected date.
- Friend todo pages are read-only. Bet UI is intentionally present only as commented/non-MVP code.
- A todo dependency can only be a non-hobby todo on the todo's selected date. Incomplete dependencies block completion and must be named in the feedback modal.
- Partial visibility and active bet flows are non-MVP and stay commented out.
- Alerts shows the design's filter pills (`친구의 할 일 완료`, `친구의 일기`) over an empty list. The bet pill stays commented out, and the list stays empty until the backend gains a notification-list endpoint — `GET /api/v1/diaries` returns only the current user's diaries and friend todos are reachable only per group and per date.
- The group screen is one page: a top bar (`뒤로가기` / group name / `그룹 설정`), a member row, then the same two-column workspace. Selecting yourself shows your own full todo list; selecting anyone else shows that member's group-visible todos, read-only.
- `그룹명 수정` and `그룹 삭제` in the group settings sheet are disabled: the backend has no `PATCH`/`DELETE /api/v1/groups/{groupId}`. Kicking a member works through `DELETE /api/v1/groups/{groupId}/members/{userId}`.
- Routines repeat 매일/매주/격주/매월/매년. The backend has no routine endpoint, so the dates are expanded in `buildRoutineDates` and created one todo at a time; 매월/매년 skip months that lack the start day.
- Profile edits save only through the explicit completion button. Enter never saves, and route changes cancel drafts.
- Login blocks every route and uses an overlay 1.5 times darker than ordinary modal overlays.
- The bottom navigation remains at the bottom of authenticated pages.

## Engineering conventions

- Keep transport in `packages/api-client`, server state hooks in `packages/hooks`, pure rules/date helpers in `packages/core`, reusable visuals in `packages/ui`, and route composition in `apps/web`.
- Treat calendar dates as local `YYYY-MM-DD` strings. Do not use UTC conversion for user-facing dates.
- Keep TanStack Query keys stable and invalidate the narrowest relevant prefix after mutations.
- Preserve the API contract's request/response casing and nullability.
- Run typecheck and production build after each functional batch, then commit that batch.

## Commands

- Install: `pnpm install`
- Web development: `pnpm dev:web`
- Web build: `pnpm build:web` (`pnpm build` is the same thing)
- Web typecheck: `pnpm --filter web exec tsc -b`
