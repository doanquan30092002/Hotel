# Progress

> Cập nhật file này TRƯỚC khi kết thúc 1 task. Dùng skill `update-progress` để giúp tự động.

**Last updated**: 2026-05-21
**Current phase**: Phase 0 — Bootstrap & infra ✓ (hoàn thành toàn bộ scaffold)
**Active branch**: `main` (initial commit)

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
- [ ] 1. Auth + Users + Settings + Theme
- [ ] 2. Categories (Danh mục)
- [ ] 3. Rooms (Phòng)
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

- **Status**: Phase 0 hoàn tất. Sẵn sàng vào Phase 1 trong session sau.
- **Việc user cần làm trước session sau**:
  1. **Cài deps**: mở PowerShell tại `d:\AI\Project_AI\Hotel`, chạy:
     ```powershell
     corepack enable
     corepack prepare pnpm@9.0.0 --activate
     pnpm install
     ```
  2. **Khởi tạo husky** (lần đầu): `pnpm exec husky init` (hoặc dùng file `.husky/pre-commit` đã tạo sẵn).
  3. **Start Postgres**: `docker compose up -d`.
  4. **Copy env**: `Copy-Item .env.example .env` rồi đổi `JWT_*_SECRET`.
  5. **Migrate**: `pnpm api:prisma:migrate` (lần đầu chọn tên migration `0_init`).
  6. **Seed admin**: `pnpm api:prisma:seed` (tạo admin@hotel.local / ChangeMe123!).
  7. **Chạy thử**: `pnpm dev` → mở http://localhost:3000 và http://localhost:3001/docs.

- **Next action (Phase 1)**:
  - `backend-engineer`: tạo module `auth` (login, refresh, /me) + `users` CRUD + `settings` GET/PUT singleton.
  - `frontend-engineer`: trang `/login`, layout `(dashboard)` với Sidebar + Topbar, trang `/cai-dat` (chứa theme switcher 3 tone).
  - `tester`: e2e auth + RBAC.
  - `code-reviewer`: gate cuối phase 1.

- **Blockers**: Không. Telegram đã verify OK.

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

## Notes for next session

Khi mở session mới, đọc theo thứ tự:
1. `CLAUDE.md` (đã được nạp sẵn)
2. File này (`PROGRESS.md`)
3. `PLAN.md` mục "Phase 1" để xem chi tiết
4. `.claude/agents/backend-engineer.md` + `.claude/agent-memory/backend-engineer/MEMORY.md` trước khi bắt đầu code BE
5. Mở ảnh `TemplateImage/Homestay-Hotel-Workspace-Google-Chrome-5_6_2026-7_16_12-PM.png` (Cài đặt / theme) để FE Phase 1 đối chiếu

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
