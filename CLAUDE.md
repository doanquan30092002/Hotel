# Hotel Management — CLAUDE Project Memory

> Đây là file luôn được Claude Code nạp vào context. Giữ ngắn, đúng trọng tâm. Chi tiết dài đặt trong [PLAN.md](PLAN.md) và [PROGRESS.md](PROGRESS.md).

## Project at a glance

Web app quản lý khách sạn / homestay single-tenant. Giao diện tham chiếu trong [TemplateImage/](TemplateImage/) (23 ảnh, đã chốt với user).

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript strict + Tailwind + shadcn/ui + Recharts + TanStack Query + React Hook Form + Zod
- **Backend**: NestJS + PostgreSQL + Prisma + JWT (access + refresh) + class-validator + Swagger
- **Storage**: Local disk (dev), S3-compatible (prod)
- **Deploy**: Vercel (FE) + Railway (BE + Postgres) — preview deploy theo branch, production chỉ qua PR vào `main`
- **Package manager**: pnpm workspaces

## Repo layout

```
apps/api/        # NestJS
apps/web/        # Next.js
packages/        # shared (optional)
.claude/         # agents, rules, skills, hooks, agent-memory
TemplateImage/   # 23 ảnh UI tham chiếu
PLAN.md          # plan đầy đủ
PROGRESS.md      # state giữa các session — LUÔN cập nhật trước khi dừng
```

## Roles

`ADMIN`, `MANAGER`, `RECEPTIONIST`, `HOUSEKEEPING`. RBAC dùng `RolesGuard` + `@Roles()` decorator ở BE.

## Conventions (bắt buộc)

- Code: TypeScript strict, không `any`. Tên file kebab-case. Component PascalCase.
- API path: `/api/v1/<resource>`. Response: `{ data, meta }`. Lỗi: `{ statusCode, message, error }`.
- Không trả Prisma entity trần — luôn map qua DTO.
- UI label tiếng Việt, code/identifier tiếng Anh.
- Commit: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- Branch: `feat/<phase>-<slug>`. Không push thẳng `main`.
- Mỗi PR phải qua `code-reviewer` subagent + `tester` subagent.

## Common dev commands

```powershell
# Dev (chạy song song BE + FE)
pnpm dev

# BE
pnpm api:dev               # NestJS watch
pnpm api:prisma:migrate    # migrate dev
pnpm api:prisma:studio
pnpm api:test
pnpm api:test:e2e

# FE
pnpm web:dev
pnpm web:build
pnpm web:typecheck
pnpm web:test              # Playwright

# Docker Postgres dev
docker compose up -d
docker compose down
```

## Sidebar order (khớp template)

Dashboard · Lịch · Phòng trống · Booking · Phòng · Khách hàng · Dịch vụ · Gói mẫu · Dọn phòng · Thu chi · Nhân sự · Lương · Tệp upload · Danh mục · Báo cáo · Cài đặt

## Theme

3 tone (Pink Boutique / Boutique Vibe / Olive Organic) — xem ảnh `Homestay-Hotel-Workspace-Google-Chrome-5_6_2026-7_16_12-PM.png`. CSS variables trong `apps/web/src/styles/globals.css`, switch tại trang Cài đặt.

## Subagent usage

Dùng đúng vai trò (chi tiết trong `.claude/agents/`):
- **researcher** — đọc docs / khảo sát, không edit code
- **backend-engineer** — viết NestJS + Prisma
- **frontend-engineer** — viết Next.js (phải đối chiếu ảnh template tương ứng)
- **code-reviewer** — chỉ review, output kết thúc bằng `REVIEW_RESULT: PASS|FAIL — <reason>`
- **tester** — chạy test, output kết thúc bằng `TEST_RESULT: PASS|FAIL — <reason>`

## Auto push + deploy

Khi cả `code-reviewer` và `tester` cùng PASS cho 1 phase, hook `.claude/hooks/auto-deploy.ps1` sẽ tự `git add → commit → push branch hiện tại` (KHÔNG push main, KHÔNG promote production), Vercel/Railway tự tạo preview, Telegram báo link. Kill switch: tạo file rỗng `.claude/state/auto-deploy.disabled`.

## Telegram notifications

`Stop` / `SubagentStop` / `Notification` hook → `.claude/hooks/telegram-notify.ps1`. Token + chat_id trong `.claude/settings.local.json` (gitignore).

## ⚠️ Always-on rules

1. **Trước khi dừng một task**: cập nhật [PROGRESS.md](PROGRESS.md) (mục `Currently working on`, tick checklist, thêm `Decisions log` nếu có quyết định mới).
2. **Trước khi viết code module mới**: đọc ảnh template tương ứng trong `TemplateImage/` + đọc `.claude/rules/ui-design-system.md`.
3. **Trước khi tạo endpoint mới**: đọc `.claude/rules/api-contract.md`.
4. **Không** dùng `prisma migrate reset`, `rm -rf`, `git push --force`, `--no-verify`. Đã deny trong settings.
5. Khi không chắc, tham khảo agent-memory tương ứng trong `.claude/agent-memory/<agent>/MEMORY.md`.
