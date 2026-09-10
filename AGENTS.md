# TLITODOS frontend implementation context

## Product sources

- Figma: `https://www.figma.com/design/6mBMtcwDlauTX5Gipia3Ua/TLITODOS-Design?m=dev`
- Figma page: `7:2` (`Design`)
- The file is split into two sections: `my` `167:891` and `group` `167:892`
- `my` screens: main/today `832:899`, detail `68:512`, diary `157:1451`, profile `157:1873`, alarm `139:492`
- `my` modals: insert/update `1023:2502`, deadline day `96:393`, deadline time `141:1044`, routine `140:898`, category `1815:1536`, bet `167:878` / `1815:1569` (non-MVP)
- API contract: the deployed dev API's own `/openapi.json` is the freshest source (`curl https://api-tlitodos.parafara.cloud/openapi.json`); the local `~/Desktop/TLITODOS-Backend` checkout is often behind. Keep the repository copy `openapi.json` synchronized with it. The backend copy is FastAPI's generated output; the repository copy is hand-curated with named response schemas, English descriptions and `x-ai-agent-notes` that the frontend types follow. Sync by porting operations into the repository copy's style — never by overwriting it. It is not Prettier-formatted (`pnpm format` only covers `*.ts`/`*.tsx`), so keep it out of Prettier runs. Round-trip it with `json.dumps(indent=2, ensure_ascii=False)` plus a trailing newline to keep the diff small.
- Development API: `http://localhost:8000`
- Stack: React, TypeScript, Emotion, TanStack Query, Zustand, React Router, pnpm workspace

## Product invariants

- Category order is the `해야할 일` slot -> custom category 1 -> custom category 2 -> the `취미` slot, and `sortCategories` is the single source of it. A slot is never decided by a name, because all four can be renamed: the category the server locked (`isDeletable: false`) takes the last slot and the rest fill the front in `categoryId` order. An account with nothing locked is already in creation order, since the bootstrap creates 취미 last. Anything that depends on the 취미 slot asks `hobbyCategoryId`, not the name.
- A category's accent is the `color` the server returns for it, used for the label, the completion mark and the calendar dots; dots and completion marks render it at 80% opacity. Figma draws the calendar dots in other colours — that is deliberately ignored.
- A calendar quadrant is filled with its category's accent only when that category is fully done for the day; a category with anything left stays `gray/200`.
- Once every category *used* that day is done, `stashFills` shares the four quadrants out among them so no grey is left: `floor(4 / N)` each, and the remainder goes one apiece to distinct categories picked from a seed. N=4 is one each as before, N=3 gives (2,1,1), N=2 gives (2,2), N=1 fills all four. A category with no todo that day is not used and takes no share. The seed is the date plus the day's incomplete count, so the arrangement never shifts between renders.
- A calendar day carries the number of that day's incomplete todos, or a check when nothing is left. The number and the check are always white, whatever the quadrants behind them hold.
- Todos are fetched one day at a time: `GET /api/v1/todos?date={selectedDate}` (plus `groupId`/`userId` for another member). Moving the calendar to another month refetches only the month summary, not the todos.
- A todo spans `startDate`..`dueDate` with both ends included, so it appears on every day in that range; `coversDate`/`todoDates` in `packages/core` are the single source of that rule. One completion state is shared across the range, and routine occurrences complete independently.
- Calendar dots and day counts come from `GET /api/v1/todos/daily-status?month=YYYY-MM`, which also takes `userId`/`groupId`, so another member's whole month is marked too. The selected day is always recomputed from the day's own list with `buildDailyStatuses`, so an optimistic completion shows on the calendar immediately.
- The daily-status cache lives under `["todos-daily-status", month]`, deliberately outside the `["todos", ...]` prefix that `writeBack.todos` rewrites as `Todo[]`. Everything that invalidates todos invalidates it too.
- `strong` in `CATEGORY_PRESETS` is only the seed: it is stored when the four categories are created, and it is the fallback when the server value is missing or not a colour.
  - 해야할 일: `#ff5e9a`, custom 1: `#ff00a2`, custom 2: `#ff8cb6`, 취미: `#ff3959`
- Users pick a category's colour on the profile screen from `CATEGORY_SWATCHES` (24 colours from Figma).
- The category label sits on a neutral `#eef1f6` pill; there is no per-category background any more.
- Every category can be renamed — tapping its pill on the board opens `카테고리 이름 변경`. None can be deleted in the UI, and the server refuses to delete the locked one anyway.
- Create exactly four categories for a newly created user in the order above. The backend seeds `취미` (locked) and `할일`, so the login bootstrap renames the front slot to `해야할 일`, adds the two custom ones and leaves the locked one last. It counts the slots it has to fill by position, not by name, so a returning user who renamed everything is never given duplicates.
- Todos have no visibility. Any logged-in user can read another user's todos; editing, completing and deleting stay owner-only, which is what keeps friend pages read-only. Diary visibility is separate: 전체 공개 sends `PUBLIC` (fellow group members), 비밀 sends `PRIVATE`, and `GROUP` (일부 공개) is on hold server-side so the pill stays disabled.
- A todo's title is capped at 40 characters and `description` at 100. `description` is a real field — nothing is packed into the title any more.
- `time` is a separate `HH:MM` field in five-minute steps, with `timezone` defaulting to `Asia/Seoul`. `dueDate` is date-only.
- `TodoCreateRequest`/`TodoPatchRequest` are `additionalProperties: false`. Sending the removed `groupId`, `visibility` or `isRoutine` keys is a 422.
- Own todo pages allow adding, editing, and completing todos for any selected date.
- Friend todo pages are read-only. Bet UI is intentionally present only as commented/non-MVP code.
- A todo dependency can only be a todo outside the `취미` slot (`hobbyCategoryId`) on the todo's selected date. Incomplete dependencies block completion and must be named in the feedback modal.
- Partial visibility and active bet flows are non-MVP and stay commented out.
- Alerts read `GET /api/v1/notifications` with the design's filter pills (`친구의 할 일 완료` -> `TODO_COMPLETED`, `친구의 일기` -> `DIARY_CREATED`); the bet pill stays commented out. Tapping a row marks it read, and `nextCursor` drives a `더 보기` button.
- The group screen is one page: a top bar (`뒤로가기` / group name / `그룹 설정`, the last shown only to the leader since every action in that sheet is leader-only), a member row, then the same two-column workspace. Selecting yourself shows your own full todo list; selecting anyone else shows that member's group-visible todos, read-only.
- In the group settings sheet, `그룹명 수정` (`PATCH /api/v1/groups/{groupId}`), `그룹 삭제` (`DELETE /api/v1/groups/{groupId}`) and bulk kicking (`POST /api/v1/groups/{groupId}/members/remove`) all work and are leader-only. `POST /api/v1/groups/{groupId}/leave` exists but has no place in the design, so it is unused.
- The member row carries a `초대코드 공유하기` button styled like `초대코드로 참여하기`; the code comes from the group detail response, so nothing extra is fetched.
- Signing up no longer creates a personal group, so `GET /api/v1/groups` can be an empty array. Never assume a first group exists — the home screen needs only a `categoryId`.
- Routines repeat 매일/매주/격주/매월/매년 and 매주/격주 also pick weekdays (월=1 ~ 일=7). One request creates them: `toRecurrence` maps the five UI choices onto the server's `frequency`/`interval`/`weekdays`, and the server expands the dates — never loop a POST per date. 매월/매년 skip months that lack the start day.
- The routine sheet holds one `requestId` for as long as it is mounted. A retry must reuse the same key and the same body: a new UUID creates a second routine, a changed body is a 409, and a deleted routine's key is a 410.
- `DELETE /api/v1/todos/{todoId}` deletes only that todo — for a routine that is the one occurrence, a completed one included, while the routine definition and the other dates stay. `DELETE /api/v1/todos/routines/{routineId}` is what deletes a whole routine, completed occurrences and the original todo included. Neither frees the `requestId`: a create retry after deleting occurrences returns the original 201 record, whose `occurrences` is the creation history rather than the current list, so read the list back from `GET /api/v1/todos`; after a whole-routine delete the retry is a 410.
- Every destructive action confirms through `ConfirmMenu`, a dropdown under the button it belongs to — `할 일 삭제하기`, `루틴 전체 삭제하기`, `그룹 삭제` and `선택한 멤버 강퇴`. `window.confirm` is not used anywhere: it blocks the page, it cannot say which group or which members are about to go, and it offers only two answers, while a routine occurrence has to choose between `이 할 일만 삭제` and `루틴 전체 삭제`. Clicking anywhere outside the dropdown or pressing Esc is a cancel, and the trigger counts as "inside" so pressing it again just closes the dropdown. A trigger near the bottom of a sheet passes `above` so the dropdown opens upward and stays on screen.
- Profile edits save only through the explicit completion button. Enter never saves, and route changes cancel drafts.
- Login blocks every route and uses an overlay 1.5 times darker than ordinary modal overlays.
- Files under `/uploads` require `Authorization: Bearer`, so an `<img src>` with the raw path 401s. `useAssetObjectUrl` fetches the bytes through the API client and renders an object URL; avatars in lists need one small component per row because it is a hook.
- The bottom navigation is fixed to the bottom of the viewport, and the chip row at the top of a page (`HeaderRow` on home, `MemberBar` in a group, `AlarmFilters` on alerts) is sticky at `top: 0`, with the page title above it left to scroll away. The 12px that keeps a stuck row off the screen edge is padding, cancelled by an equal negative margin so the resting layout keeps its original spacing. Both need an opaque background; `AppShell`'s bottom padding is what keeps content clear of the nav. A chip row that runs off the side (`HeaderRow` below 800px, the group's member row) scrolls with `hoverScrollbarX`: the bar is transparent at rest and only its thumb takes a faint ink on hover or focus. That needs `::-webkit-scrollbar`, because the overlay bar macOS and iOS draw over the content shows up only while a scroll is happening — with `scrollbar-color` alone nothing appears under the pointer until the row has been scrolled once. The styled bar always holds `SCROLLBAR_GUTTER` of the row's height, so whatever uses it takes the same amount back below: `hoverScrollbarPull`, or `HeaderRow`'s bottom margin minus the gutter. All of it, the pull included, sits behind `@media (hover: hover) and (pointer: fine)` — a touch device has no pointer to hover with and keeps its own overlay bar, which costs no height and needs no pull. Its icons are drawn as CSS masks so the colour comes from code, not from the exported file: the selected tab is `ink`, the rest `gray/400`. Exported SVGs carry mismatched fills, so anywhere an icon needs a colour of its own, mask it rather than trusting the file.

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
