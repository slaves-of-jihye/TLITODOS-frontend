# TLITODOS frontend implementation context

## Product sources

- Figma: `https://www.figma.com/design/6mBMtcwDlauTX5Gipia3Ua/TLITODOS-Design?m=dev`
- Figma page: `7:2` (`Design`)
- Main screen nodes: my today `25:418`, my date `56:262`, diary `157:1451`, profile `157:1873`, group `137:552`, friend `157:664`
- Modal nodes: insert `68:512`, update `140:815`, deadline `96:393` / `141:1044`, routine `140:898`, friend diary `157:1803`
- API contract: `~/Desktop/TLITODOS-Backend/docs/openapi.json` (keep the repository copy `openapi.json` synchronized)
- Development API: `http://localhost:8000`
- Stack: React, TypeScript, Emotion, TanStack Query, Zustand, React Router, pnpm workspace

## Product invariants

- Category order is `해야할 일` -> custom category 1 -> custom category 2 -> `취미`.
- Category colors read from Figma:
  - 해야할 일: background `#f4fce6`, control `#ddf5b0`
  - custom 1: background `#e6f9f2`, control `#b0ecd8`
  - custom 2: background `#e6f6e8`, control `#b0e4b9`
  - 취미: background `#e6fcfa`, control `#b0f5f1`
- `해야할 일` and `취미` are locked. Custom categories can be renamed but cannot be deleted in the UI.
- Create exactly four categories for a newly created user in the order above.
- Own todo pages allow adding, editing, and completing todos for any selected date.
- Friend todo pages are read-only. Bet UI is intentionally present only as commented/non-MVP code.
- A todo dependency can only be a non-hobby todo on the todo's selected date. Incomplete dependencies block completion and must be named in the feedback modal.
- Partial visibility and active bet flows are non-MVP and stay commented out.
- Alerts is an empty MVP page with only the `알림` title.
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
- Web build: `pnpm build:web`
- All builds: `pnpm build`
- Web typecheck: `pnpm --filter web exec tsc -b`
