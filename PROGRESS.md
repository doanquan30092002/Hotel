# Progress

> Cập nhật file này TRƯỚC khi kết thúc 1 task. Dùng skill `update-progress` để giúp tự động.

**Last updated**: 2026-05-21
**Current phase**: Phase 3 — Rooms (Phòng) ✓ (review + test gate PASS — 81/81 e2e + 17/17 Playwright)
**Active branch**: `feat/03-rooms`

## Phase status

- [x] **0. Bootstrap & infra**
  - [x] CLAUDE.md, .mcp.json, .claude/settings.json + settings.local.json (token Telegram đã điền)
  - [x] 5 subagents + agent-memory MEMORY.md (researcher, backend-engineer, frontend-engineer, code-reviewer, tester)
  - [x] 4 rules (coding-style, git-workflow, api-contract, ui-design-system)
  - [x] 2 skills (add-module, update-progress)
  - [x] 2 hooks PowerShell (telegram-notify.ps1, auto-deploy.ps1) — **đã test gửi Telegram OK**
  - [x] package.json root + pnpm-workspace.yaml + docker-compose.yml + .github/workflows/ci.yml
  - [x] apps/api NestJS scaffold (package.json, tsconfig, nest-cli, eslint, prisma schema + seed, main.ts, app.module, health controller, PrismaService, HttpExceptionFilter, PaginatedDto, PageQueryDto, e2e test)
  - [x] apps/web Next.js scaffold (package.json, tsconfig, next.config, tailwind.config, postcss, components.json, globals.css 3-tone, layout/page, lib/utils + api-client, playwright config + home test)
  - [x] Root configs (.prettierrc, .prettierignore, .editorconfig, .husky/pre-commit)
  - [x] Git init + initial commit
- [x] **1. Auth + Users + Settings + Theme**
  - [x] BE: auth module (login/refresh/me), users CRUD, settings GET/PUT singleton
  - [x] FE: shadcn primitives, auth store, refresh-on-401, ThemeProvider
  - [x] FE: login page, (dashboard) layout (Sidebar+Topbar), Cài đặt page, 15 stubs
  - [x] pnpm api:lint / api:typecheck / web:lint / web:typecheck (0 warnings/errors)
  - [x] tester gate: 30/30 e2e PASS fresh (health + auth + users + settings)
  - [x] code-reviewer gate: PASS (3 critical + 4 nit issues đã fix trong session này)
- [x] **2. Categories (Danh mục)**
  - [x] BE: `Category` model + enum `CategoryGroup` (14 values) + migration `02_categories` + seed 63 default rows
  - [x] BE: 8 endpoint `/api/v1/categories` — list/group-counts/get/create/patch/toggle-active/reorder/delete
  - [x] BE: Soft-delete resurrection trong `create()` (xử lý non-partial unique `(group, code)`) + try/catch P2002 defensive
  - [x] FE: 5 primitive mới (dialog, select, switch, badge, skeleton)
  - [x] FE: `/danh-muc` — KPI 4 cards + search debounce + group select + chip row + table + dialog CRUD + delete confirm + RBAC gating
  - [x] Tester gate: 52/52 e2e PASS (5 suites) + 6/6 Playwright PASS
  - [x] Code-reviewer gate: PASS (chỉ 4 nit non-blocking)
- [x] **3. Rooms (Phòng)**
  - [x] BE: `Room` model + 4 named relations Category↔Room (type/area/status/cleaning) + migration `03_rooms` + seed 10 demo rooms (P101..V102)
  - [x] BE: 7 endpoint `/api/v1/rooms` — list (filter typeId/statusId/cleaningStatusId/areaId/keyword + pagination) / get / create / patch / delete (soft) / patch status / patch cleaning
  - [x] BE: Category-group validation cho mọi FK (typeId phải group=ROOM_TYPE,...), Decimal accept number|string, soft-delete resurrection on duplicate code, RBAC: status-flip mở rộng cho RECEPTIONIST, cleaning-flip cho HOUSEKEEPING
  - [x] FE: 1 primitive mới (textarea) + `formatVnd()` helper + `ROOM_KEYS` query-key constants
  - [x] FE: `/phong` — toolbar (search + Bảng/Lưới toggle + 3 filter selects + add btn) + Bảng view (12 cột match `7_15_29`) + Lưới view (4-col cards match `7_15_34`) + dialog create/edit/detail + delete confirm + inline status/cleaning dropdown trên badge (RBAC-aware) + loading/empty/error states
  - [x] FE: Fix Zustand-persist hydration race trong `(dashboard)/layout.tsx` (hydrated flag + 2-stage useEffect)
  - [x] Tester gate: 81/81 e2e PASS (6 suites: health/auth/users/settings/categories/rooms — 29 mới) + 17/17 Playwright PASS (11 mới)
  - [x] Code-reviewer gate: PASS (0 Critical, 0 Major, 6 nit non-blocking — gồm gợi ý gộp 4 reference-category queries, totalCapacity per-page vs all-pages)
- [ ] 4. Customers (Khách hàng)
- [ ] 5. Services + Price Packages
- [ ] 6. Bookings (CORE)
- [ ] 7. Calendar booking
- [ ] 8. Tìm phòng trống nhanh
- [ ] 9. Housekeeping
- [ ] 10. Finance (Thu chi)
- [ ] 11. Staff + Payroll
- [ ] 12. Uploads (Tệp upload)
- [ ] 13. Dashboard
- [ ] 14. Báo cáo & xuất file
- [ ] 15. Polish + deploy

## Currently working on

- **Status**: Phase 3 (Rooms) hoàn tất. Cả 2 gate PASS. Sẵn sàng chuyển sang Phase 4 (Customers / Khách hàng).
- **Phase 3 result**: BE 81/81 e2e PASS (6 suites), FE 17/17 Playwright PASS, lint+typecheck clean cả BE và FE. Code-review PASS với 0 Critical / 0 Major / 6 nit.
- **Next phase prep (Phase 4 — Customers)**: `Customer` model (id, code, fullName, phone unique, idNumber unique, email, address, nationality, sourceId→GUEST_SOURCE, note, docs[]). CRUD + unique constraints + soft-delete. Trang `/khach-hang` list+form. Upload giấy tờ sẽ hoãn sang Phase 12.

### Phase 3 — files (BE)

- `apps/api/src/rooms/rooms.module.ts` / `.service.ts` / `.controller.ts`
- `apps/api/src/rooms/dto/create-room.dto.ts` / `update-room.dto.ts` / `query-room.dto.ts` / `change-status.dto.ts` / `change-cleaning.dto.ts`
- `apps/api/src/rooms/entities/room.entity.ts` — `RoomEntity.from()` strips `deletedAt`, Decimal→string, nests `{type, area, status, cleaningStatus}` với `{id, code, name}` only
- `apps/api/prisma/schema.prisma` — Room model + 4 named relations `RoomType` / `RoomArea` / `RoomStatus` / `RoomCleaningStatus`, FK `onDelete RESTRICT` cho type/status/cleaning, `SET NULL` cho area
- `apps/api/prisma/migrations/20260521161414_03_rooms/migration.sql`
- `apps/api/prisma/seed.ts` — `getCategoryIdByGroupCode()` helper + `ROOM_SEEDS` (10 rooms) + `seedRooms()`
- `apps/api/src/app.module.ts` — registered RoomsModule
- `apps/api/test/rooms.e2e-spec.ts` — 29 tests

### Phase 3 — files (FE)

- `apps/web/src/types/room.ts`
- `apps/web/src/lib/hooks/use-rooms.ts` — `ROOM_KEYS` + 7 hooks
- `apps/web/src/lib/format.ts` — `formatVnd(n)`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/app/(dashboard)/phong/page.tsx` — full implementation (replaced ComingSoon)
- `apps/web/src/app/(dashboard)/layout.tsx` — hydration guard
- `apps/web/tests/phong.spec.ts` — 11 offline Playwright tests
- **Completed this session (FE)**:
  - UI primitives: button (CVA variants), input, label, card, use-toast/toast/toaster, dropdown-menu, avatar.
  - Auth: zustand persist store (`hotel.auth`), `use-auth` hook (`isAuthenticated`, `hasRole`).
  - api-client: refresh-on-401 interceptor with queue, fallback redirect to `/dang-nhap`.
  - ThemeProvider + `useTheme()`: reads localStorage `hotel.themeTone`, sets `document.documentElement.dataset.tone`, calls `PUT /settings` when authenticated.
  - Providers wrapper (QueryClient + ThemeProvider + Toaster).
  - Root layout updated with `<Providers>`.
  - Homepage redirect: checks auth store, sends to `/dang-nhap` or `/tong-quan`.
  - `(auth)` route group: centered card layout, login page with React Hook Form + Zod, show/hide password toggle, dev credentials hint.
  - `(dashboard)` route group: auth guard on mount (calls `/auth/me`), Sidebar 240px/64px collapsible, Topbar 56px with page title + buttons + user dropdown.
  - Cài đặt page: 2 tabs — "Thông tin cơ sở" form (PUT /settings) + "Giao diện" theme switcher (3 tone cards with apply). RBAC: RECEPTIONIST/HOUSEKEEPING see read-only form.
  - 15 stub pages with `<ComingSoon phase title />`.
  - Playwright tests: updated home.spec.ts + new auth.spec.ts.

- **Completed this session (BE)**:
  - Common auth infra: `roles.decorator`, `current-user.decorator`, `public.decorator`, `JwtAuthGuard`, `RolesGuard`, `AuditLogInterceptor`.
  - `AuthModule`: login, refresh token, /me — JWT access+refresh (separate secrets).
  - `UsersModule`: CRUD with soft-delete, pagination+filter, argon2 password hashing.
  - `SettingsModule`: singleton GET/PUT.
  - Global guards + interceptor registered in `AppModule` via `APP_GUARD` / `APP_INTERCEPTOR`.

- **Next actions (Phase 2 — Categories / Danh mục)**:
  - [x] `backend-engineer`: model + migration + CRUD + seed (done).
  - [x] `frontend-engineer`: trang `/danh-muc` (ảnh `7_16_07`) — KPI, group chips, table with CRUD/toggle, form dialog, delete dialog.
  - [ ] `tester` + `code-reviewer`: gate cuối phase 2 (integration test with live BE).

- **Phase 2 FE files created**:
  - `apps/web/src/types/category.ts` — CategoryGroup, Category, GroupCount, CATEGORY_GROUP_LABEL
  - `apps/web/src/lib/hooks/use-debounced-value.ts`
  - `apps/web/src/lib/hooks/use-categories.ts` — useCategories, useGroupCounts, useCreateCategory, useUpdateCategory, useDeleteCategory, useToggleActive
  - `apps/web/src/components/ui/dialog.tsx` — Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
  - `apps/web/src/components/ui/select.tsx` — Select, SelectTrigger, SelectValue, SelectContent, SelectItem
  - `apps/web/src/components/ui/switch.tsx` — Switch (radix-based)
  - `apps/web/src/components/ui/badge.tsx` — Badge (CVA variants: emerald/sky/amber/orange/rose/zinc/outline)
  - `apps/web/src/components/ui/skeleton.tsx` — Skeleton (animate-pulse)
  - `apps/web/src/app/(dashboard)/danh-muc/page.tsx` — full implementation replacing ComingSoon
  - `apps/web/tests/danh-muc.spec.ts` — Playwright offline-friendly tests
  - Fixed: `apps/web/src/components/layout/Sidebar.tsx` — href type cast for Next.js strict route typing
  - Fixed: `apps/web/tests/auth.spec.ts` — getByLabel('Mật khẩu').first() to avoid strict mode violation

- **Pre-requisites for running**:
  1. `docker compose up -d` (Postgres).
  2. `Copy-Item .env.example .env` rồi điền `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
  3. `pnpm api:prisma:migrate` (tên migration `01_init` hoặc `01_auth`).
  4. `pnpm api:prisma:seed` (seed admin@hotel.local / ChangeMe123!).
  5. `pnpm api:dev` → http://localhost:3001/docs.

## Files created in Phase 1 (FE)

### Types

- `apps/web/src/types/index.ts` — User, Setting, LoginResponse, ApiResponse, ApiError

### Auth

- `apps/web/src/lib/auth/auth-store.ts` — zustand persist store (`hotel.auth`)
- `apps/web/src/lib/auth/use-auth.ts` — isAuthenticated, hasRole helper

### Lib updates

- `apps/web/src/lib/api-client.ts` — refresh-on-401 interceptor with queue

### Components

- `apps/web/src/components/theme-provider.tsx`
- `apps/web/src/components/providers.tsx`
- `apps/web/src/components/ComingSoon.tsx`
- `apps/web/src/components/layout/sidebar-nav.ts`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/Topbar.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/label.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/use-toast.ts`
- `apps/web/src/components/ui/toast.tsx`
- `apps/web/src/components/ui/toaster.tsx`
- `apps/web/src/components/ui/dropdown-menu.tsx`
- `apps/web/src/components/ui/avatar.tsx`

### App routes (updated + new)

- `apps/web/src/app/layout.tsx` — Providers wrapper
- `apps/web/src/app/page.tsx` — redirect to /dang-nhap or /tong-quan
- `apps/web/src/app/(auth)/layout.tsx`
- `apps/web/src/app/(auth)/dang-nhap/page.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/cai-dat/page.tsx`
- 15 stubs: tong-quan, lich, phong-trong, booking, phong, khach-hang, dich-vu, goi-mau, don-phong, thu-chi, nhan-su, luong, tep-upload, danh-muc, bao-cao

### Tests

- `apps/web/tests/home.spec.ts` — updated
- `apps/web/tests/auth.spec.ts` — new

## Files created in Phase 1 (BE)

### Common infra

- `apps/api/src/common/decorators/roles.decorator.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/interceptors/audit-log.interceptor.ts`

### Auth module

- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/auth/dto/login.dto.ts`
- `apps/api/src/auth/dto/refresh.dto.ts`
- `apps/api/src/auth/entities/auth-tokens.entity.ts`

### Users module

- `apps/api/src/users/users.module.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/dto/create-user.dto.ts`
- `apps/api/src/users/dto/update-user.dto.ts`
- `apps/api/src/users/dto/query-user.dto.ts`
- `apps/api/src/users/entities/user.entity.ts`

### Settings module

- `apps/api/src/settings/settings.module.ts`
- `apps/api/src/settings/settings.service.ts`
- `apps/api/src/settings/settings.controller.ts`
- `apps/api/src/settings/dto/update-settings.dto.ts`
- `apps/api/src/settings/entities/setting.entity.ts`

### Modified

- `apps/api/src/app.module.ts` — added AuthModule, UsersModule, SettingsModule, APP_GUARD, APP_INTERCEPTOR
- `apps/api/test/health.e2e-spec.ts` — fixed `import request from 'supertest'`

## Decisions log

- 2026-05-21: Stack chốt — Next.js 14 + NestJS + PostgreSQL + Prisma. Single-tenant, deploy Vercel + Railway preview-per-branch.
- 2026-05-21: 4 role: ADMIN / MANAGER / RECEPTIONIST / HOUSEKEEPING.
- 2026-05-21: Hooks Telegram (Stop / SubagentStop / Notification) + auto-deploy hook khi review+test cùng PASS — KHÔNG push main, KHÔNG promote production.
- 2026-05-21: Kill switch auto-deploy: tạo file rỗng `.claude/state/auto-deploy.disabled`. Feature flag `AUTO_DEPLOY_ENABLED=true` trong settings.local.json.
- 2026-05-21: Bookings dùng `BookingItem` polymorphic theo `kind` (room|service|surcharge|discount) thay vì 4 bảng riêng — sẽ implement ở Phase 6.
- 2026-05-21: Categories tập trung 1 bảng phân biệt bằng `group` (roomType, roomStatus, paymentMethod, ...) — Phase 2.
- 2026-05-21: PowerShell hook viết ASCII-only (PS 5.1 không đọc được UTF-8 không BOM). Stdin đọc async với 500ms timeout để không treo khi gọi trực tiếp.
- 2026-05-21: Bot Telegram `@HotelDevNotifierBot`, chat_id `5500596513`. Token lưu trong `.claude/settings.local.json` (gitignore).
- 2026-05-21: Phase 0 cài thủ công package.json + scaffold thay vì `nest new` / `create-next-app` để deterministic và không phụ thuộc prompt interactive.
- 2026-05-21: Phase 1 — JWT refresh token KHÔNG rotate (MVP scope). Refresh chỉ issue new access token.
- 2026-05-21: Phase 1 — JWT payload chứa `typ: 'access'|'refresh'`; `JwtStrategy.validate()` reject nếu `typ !== 'access'` để chặn refresh-as-access attack.
- 2026-05-21: Phase 1 — `email` của User là immutable sau khi tạo (UpdateUserDto không có email field).
- 2026-05-21: Phase 1 — AuditLog interceptor best-effort (no crash on failure), entity extracted từ URL path segment.
- 2026-05-21: Phase 1 — `import request from 'supertest'` (không dùng `import *`) để tương thích TS types mới.
- 2026-05-21: Phase 1 — Soft-delete user qua `deletedAt` (không hard-delete) để giữ AuditLog reference.
- 2026-05-21: Phase 1 — Theme persist 2 tầng: `localStorage.hotel.themeTone` (luôn) + `PUT /settings.themeTone` (chỉ ADMIN/MANAGER). RECEPTIONIST/HOUSEKEEPING chỉ persist local để tránh 403.
- 2026-05-21: Phase 1 — `ConfigModule.envFilePath: ['../../.env', '../../.env.local', '.env']` để cả `pnpm api:dev` lẫn `jest e2e` (cwd = apps/api) đều đọc được `.env` ở root.
- 2026-05-21: Phase 1 — `monthlyRevenueTarget` truyền dạng string (Prisma `Decimal`). DTO dùng `@Transform` coerce number→string + `@ValidateIf` cho null để cho phép xoá target.
- 2026-05-21: Phase 1 — `jest test`/`test:e2e` thêm `--passWithNoTests` để module BE chưa có unit spec không làm fail gate.
- 2026-05-21: Phase 3 — Room ↔ Category dùng 4 named relations (`RoomType` / `RoomArea` / `RoomStatus` / `RoomCleaningStatus`) vì Category được reference 4× từ Room. Inverse arrays bắt buộc trên Category.
- 2026-05-21: Phase 3 — FK `onDelete RESTRICT` cho typeId/statusId/cleaningStatusId (luôn cần category để hiển thị), `SET NULL` cho areaId (optional).
- 2026-05-21: Phase 3 — Category-group validation ở service layer: `assertCategoryGroup(id, expectedGroup)` chạy trước mọi create/update/status-flip/cleaning-flip để chặn việc gán nhầm group (vd typeId trỏ vào PAYMENT_METHOD).
- 2026-05-21: Phase 3 — `code` của Room immutable post-creation (UpdateRoomDto vẫn nhận nhưng dialog FE hiển thị read-only) — giữ nhất quán mã phòng đã in trên giấy tờ.
- 2026-05-21: Phase 3 — Status/Cleaning flip dùng endpoint riêng (`PATCH /rooms/:id/status`, `PATCH /rooms/:id/cleaning`) thay vì PATCH general, để RBAC cho phép RECEPTIONIST đổi status và HOUSEKEEPING đổi cleaning mà không mở quyền edit toàn bộ Room.
- 2026-05-21: Phase 3 — Inline status/cleaning UX: click badge → DropdownMenu các option của group → mutation. Badge không có quyền render plain (no cursor-pointer).
- 2026-05-21: Phase 3 — Zustand-persist hydration race trong `(dashboard)/layout.tsx`: thêm `hydrated` flag + 2-stage useEffect. Pattern này áp dụng cho mọi protected layout sau này.

## Notes for next session

Khi mở session mới, đọc theo thứ tự:

1. `CLAUDE.md` (đã được nạp sẵn)
2. File này (`PROGRESS.md`)
3. `PLAN.md` mục "Phase 4 — Customers" để xem chi tiết
4. `.claude/agents/backend-engineer.md` + `.claude/agent-memory/backend-engineer/MEMORY.md`
5. Template image cho Customers (sẽ chọn khi bắt đầu — likely `7_15_37` hoặc `7_15_40`).

## Files đã tạo trong Phase 0

### Claude infra

- [CLAUDE.md](CLAUDE.md), [PLAN.md](PLAN.md), [README.md](README.md), [PROGRESS.md](PROGRESS.md)
- [.mcp.json](.mcp.json), [.gitignore](.gitignore), [.env.example](.env.example)
- [.prettierrc](.prettierrc), [.prettierignore](.prettierignore), [.editorconfig](.editorconfig)
- [.husky/pre-commit](.husky/pre-commit)
- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [package.json](package.json), [pnpm-workspace.yaml](pnpm-workspace.yaml), [docker-compose.yml](docker-compose.yml)

### Claude `.claude/`

- [settings.json](.claude/settings.json), [settings.local.json](.claude/settings.local.json)
- [rules/](.claude/rules/) — coding-style, git-workflow, api-contract, ui-design-system
- [skills/](.claude/skills/) — add-module, update-progress
- [agents/](.claude/agents/) — researcher, backend-engineer, frontend-engineer, code-reviewer (opus), tester
- [agent-memory/](.claude/agent-memory/) — 5 MEMORY.md
- [hooks/](.claude/hooks/) — telegram-notify.ps1, auto-deploy.ps1

### Backend `apps/api/`

- [package.json](apps/api/package.json), [tsconfig.json](apps/api/tsconfig.json), [tsconfig.build.json](apps/api/tsconfig.build.json), [nest-cli.json](apps/api/nest-cli.json), [.eslintrc.cjs](apps/api/.eslintrc.cjs)
- [prisma/schema.prisma](apps/api/prisma/schema.prisma) — User, Setting, AuditLog (Phase 1 base)
- [prisma/seed.ts](apps/api/prisma/seed.ts) — seed admin + setting singleton
- [src/main.ts](apps/api/src/main.ts), [src/app.module.ts](apps/api/src/app.module.ts), [src/health.controller.ts](apps/api/src/health.controller.ts)
- [src/prisma/](apps/api/src/prisma/) — module + service
- [src/common/filters/http-exception.filter.ts](apps/api/src/common/filters/http-exception.filter.ts)
- [src/common/dto/](apps/api/src/common/dto/) — PaginatedDto + PageQueryDto helpers
- [test/jest-e2e.json](apps/api/test/jest-e2e.json), [test/health.e2e-spec.ts](apps/api/test/health.e2e-spec.ts)

### Frontend `apps/web/`

- [package.json](apps/web/package.json), [tsconfig.json](apps/web/tsconfig.json), [next.config.mjs](apps/web/next.config.mjs)
- [tailwind.config.ts](apps/web/tailwind.config.ts), [postcss.config.mjs](apps/web/postcss.config.mjs), [components.json](apps/web/components.json)
- [src/app/globals.css](apps/web/src/app/globals.css) — 3 tone CSS variables
- [src/app/layout.tsx](apps/web/src/app/layout.tsx), [src/app/page.tsx](apps/web/src/app/page.tsx)
- [src/lib/utils.ts](apps/web/src/lib/utils.ts), [src/lib/api-client.ts](apps/web/src/lib/api-client.ts)
- [playwright.config.ts](apps/web/playwright.config.ts), [tests/home.spec.ts](apps/web/tests/home.spec.ts)
