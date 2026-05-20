# Hotel Management Web App — Implementation Plan

## Context

Người dùng cần xây dựng một web app quản lý khách sạn / homestay đầy đủ 14 module (Dashboard, Lịch booking, Phòng trống nhanh, Booking, Phòng, Khách hàng, Dịch vụ, Gói mẫu, Dọn phòng, Thu chi, Nhân sự, Bảng lương, Tệp upload, Danh mục, Báo cáo, Cài đặt) dựa trên 23 ảnh template trong [TemplateImage/](TemplateImage/). Đây là dự án mới (chưa có code, chưa init git). Mục tiêu: dựng MVP single-tenant deploy Vercel + Railway, đồng thời thiết lập toàn bộ hệ thống Claude Code (CLAUDE.md, MCP, hooks, subagents, agent-memory) ngay từ đầu để các session sau không mất ngữ cảnh và mọi task hoàn thành đều có thông báo về Telegram.

**Stack đã chốt:**
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts + TanStack Query + React Hook Form + Zod
- Backend: NestJS + PostgreSQL + Prisma + JWT (access + refresh) + class-validator + Swagger
- Storage: Local disk (dev) → S3-compatible (prod, ví dụ Cloudflare R2 hoặc Supabase Storage)
- Deploy: Vercel (FE) + Railway hoặc Render (BE + Postgres)
- Roles: `ADMIN`, `MANAGER`, `RECEPTIONIST`, `HOUSEKEEPING`
- Hooks Telegram: `Stop`, `SubagentStop`, `Notification`

---

## 1. Monorepo Structure

Dùng pnpm workspaces (đơn giản, không cần Turborepo cho MVP).

```
Hotel/
├── CLAUDE.md                       # Project memory (luôn nạp)
├── PROGRESS.md                     # State tracker giữa các session
├── PLAN.md                         # Bản copy của plan này (cho team đọc)
├── README.md
├── .mcp.json                       # MCP servers (postgres, filesystem)
├── .gitignore
├── .env.example
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── docker-compose.yml              # Postgres + pgAdmin cho dev
├── .claude/
│   ├── settings.json               # Hooks + permissions (commit được)
│   ├── settings.local.json         # TELEGRAM_BOT_TOKEN, CHAT_ID (gitignore)
│   ├── rules/
│   │   ├── coding-style.md
│   │   ├── git-workflow.md
│   │   ├── api-contract.md
│   │   └── ui-design-system.md
│   ├── skills/
│   │   ├── add-module/SKILL.md     # Skill scaffolding 1 module BE+FE
│   │   └── update-progress/SKILL.md
│   ├── agents/
│   │   ├── researcher.md
│   │   ├── backend-engineer.md
│   │   ├── frontend-engineer.md
│   │   ├── code-reviewer.md
│   │   └── tester.md
│   ├── agent-memory/
│   │   ├── researcher/MEMORY.md
│   │   ├── backend-engineer/MEMORY.md
│   │   ├── frontend-engineer/MEMORY.md
│   │   ├── code-reviewer/MEMORY.md
│   │   └── tester/MEMORY.md
│   └── hooks/
│       └── telegram-notify.ps1     # PowerShell hook script
├── TemplateImage/                  # 23 ảnh tham chiếu (đã có)
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/             # guards, interceptors, decorators, filters
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── rooms/
│   │   │   ├── customers/
│   │   │   ├── bookings/
│   │   │   ├── services/
│   │   │   ├── packages/
│   │   │   ├── housekeeping/
│   │   │   ├── finance/
│   │   │   ├── staff/
│   │   │   ├── payroll/
│   │   │   ├── uploads/
│   │   │   ├── categories/
│   │   │   ├── reports/
│   │   │   ├── dashboard/
│   │   │   └── settings/
│   │   └── test/                   # e2e tests
│   └── web/                        # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/login/
│       │   │   └── (dashboard)/
│       │   │       ├── layout.tsx              # sidebar + topbar
│       │   │       ├── dashboard/              # 4 tabs: tổng quan / booking & công suất / tài chính / buồng phòng
│       │   │       ├── lich/                   # Calendar booking (tháng/tuần/ngày)
│       │   │       ├── phong-trong/            # Tìm phòng trống nhanh
│       │   │       ├── booking/                # CRUD + modal tạo
│       │   │       ├── phong/                  # 3 view: bảng / lưới / list
│       │   │       ├── khach-hang/
│       │   │       ├── dich-vu/
│       │   │       ├── goi-mau/
│       │   │       ├── don-phong/              # Buồng phòng
│       │   │       ├── thu-chi/
│       │   │       ├── nhan-su/
│       │   │       ├── luong/
│       │   │       ├── tep-upload/
│       │   │       ├── danh-muc/
│       │   │       ├── bao-cao/
│       │   │       └── cai-dat/
│       │   ├── components/
│       │   │   ├── ui/             # shadcn/ui components
│       │   │   ├── layout/         # Sidebar, Topbar
│       │   │   ├── charts/         # Recharts wrappers (Area, Donut, Gauge, Heatmap, Bar)
│       │   │   ├── booking/
│       │   │   ├── calendar/       # Tháng/Tuần/Ngày views
│       │   │   └── tables/         # DataTable, FilterBar
│       │   ├── lib/
│       │   │   ├── api-client.ts   # axios instance + auth interceptor
│       │   │   ├── hooks/
│       │   │   └── utils.ts
│       │   ├── types/              # shared types (mirror BE DTOs)
│       │   └── styles/globals.css  # 3 tone theme variables
│       └── public/
└── packages/
    └── shared-types/               # Optional: zod schemas dùng chung BE+FE
```

---

## 2. Database Schema (Prisma — high level)

Chỉ liệt kê các entity chính. Đầy đủ field sẽ viết khi thực thi.

- `User` (id, email, passwordHash, fullName, role enum, status, avatar) — 4 role.
- `Setting` (single row: ten cơ sở, mã số thuế, địa chỉ, email, website, hotline, theme, target doanh thu/tháng, ghi chú).
- `Category` (id, group: roomType|roomArea|priceType|paymentMethod|bookingSource|guestSource|housekeepingTaskStatus|cleaningStatus|bookingStatus|roomStatus, code, name, sortOrder, active) — module Danh mục.
- `Room` (id, code, name, typeId→Category, areaId→Category, capacity, basePrice, weekendPrice, holidayPrice, statusId, cleaningStatusId, defaultCheckIn, defaultCheckOut, images[]).
- `Customer` (id, code, fullName, phone, idNumber, email, address, nationality, sourceId, note, docs[]). Unique: phone, idNumber.
- `Booking` (id, code, customerId, sourceId, statusId, priceTypeId, checkIn, checkOut, checkInTime, checkOutTime, adults, children, note, total, paid, remaining, createdById).
- `BookingItem` (id, bookingId, kind: room|service|surcharge|discount, refId, name, unitPrice, quantity, unit, amount).
- `Payment` (id, bookingId, methodId, amount, paidAt, note).
- `Service` (id, code, name, groupId, unit, price, status).
- `PricePackage` (id, code, name, applyType, numNights, numGuests, totalPrice, validFrom, validTo, detail, status).
- `HousekeepingTask` (id, code, date, roomId, bookingId?, taskType, priority, assignedToId→Staff, startAt, endAt, statusId).
- `FinanceTx` (id, code, date, kind: income|expense, groupId, linkBookingId?, description, amount, methodId, performedBy).
- `Staff` (id, code, fullName, position, role, account, phone, shift, startDate, baseSalary, allowance, status).
- `Payroll` (id, code, month, staffId, baseSalary, workdays, baseEarned, allowance, bonus, penalty, advance, finalAmount, status).
- `Upload` (id, refType: room|customer|staff|booking, refId, fileName, mimeType, size, url, uploadedById).
- `AuditLog` (id, userId, action, entity, entityId, payload jsonb, createdAt).

Index quan trọng: `Booking(checkIn, checkOut)`, `BookingItem(bookingId, kind)`, `Room(typeId, statusId)`, `Payment(bookingId)`, `FinanceTx(date, kind)`.

---

## 3. Module Implementation Order (theo nghiệp vụ)

| Phase | Module | BE | FE | Phụ thuộc |
|------:|--------|----|----|-----------|
| 0 | **Bootstrap & infra** | docker-compose, Prisma init, NestJS skeleton, Next.js skeleton, shadcn setup, layout shell | — | — |
| 1 | **Auth + Users + Settings + Theme** | JWT access/refresh, RolesGuard, /me, settings CRUD | Login, layout (sidebar + topbar), trang Cài đặt, theme switcher (Tone 1/2/3) | Phase 0 |
| 2 | **Categories (Danh mục)** | CRUD theo group | Tab group + table CRUD | Phase 1 |
| 3 | **Rooms (Phòng)** | CRUD, upload ảnh, filter | 3 view (bảng/lưới/list), upload, status badges | Phase 2 |
| 4 | **Customers (Khách hàng)** | CRUD, unique phone/idNumber, upload giấy tờ | List + form + giấy tờ | Phase 2 |
| 5 | **Services + Price Packages** | CRUD | List + form | Phase 2 |
| 6 | **Bookings (CORE)** | CRUD đa dòng (room+service+surcharge+discount), auto-create/link customer theo phone/idNumber, tính total/paid/remaining, payments, anti-overlap | Modal tạo booking đa dòng (theo ảnh `7_15_50`), list, search, edit | Phase 3, 4, 5 |
| 7 | **Calendar booking** | endpoint /calendar?from&to&view + filter | View Tháng / Tuần / Ngày + filter loại phòng/trạng thái/nguồn/keyword | Phase 6 |
| 8 | **Tìm phòng trống nhanh** | endpoint /rooms/available?checkIn&checkOut&typeId | Form + grid kết quả + nút "Tạo booking" mở modal Phase 6 | Phase 6 |
| 9 | **Housekeeping (Dọn phòng / Buồng phòng)** | CRUD, auto-create task khi booking check-out, đồng bộ trạng thái vệ sinh phòng | List + filter + assign | Phase 6 |
| 10 | **Finance (Thu chi)** | CRUD, auto-tạo income từ Payment booking, panel "Thanh toán booking" | List + summary card + side panel | Phase 6 |
| 11 | **Staff + Payroll** | CRUD nhân sự, sinh bảng lương theo tháng, trạng thái chi | List nhân sự + list bảng lương + modal sinh | Phase 1 |
| 12 | **Uploads (Tệp upload)** | trung tâm liệt kê + thay/xoá | Bảng tổng hợp filter theo loại | Phase 3, 4, 11 |
| 13 | **Dashboard** | endpoint /dashboard?from&to&tab (4 tab: Tổng quan / Booking & Công suất / Tài chính / Buồng phòng) | 4 tab + cards + charts (Area / Donut / Gauge / Heatmap / Bar) — Recharts | All |
| 14 | **Báo cáo & xuất file** | endpoint export XLSX (sheetjs / exceljs) | Trang Báo cáo + nút "In báo cáo" + "Xuất XLSX" | Phase 13 |
| 15 | **Polish + deploy** | Health check, rate-limit, audit log middleware | Empty state, loading skeleton, responsive, accessibility | All |

Mỗi phase: viết Prisma model → migration → service + controller + DTO + RBAC → e2e test → FE page + hooks → review.

---

## 4. Claude Code Configuration Files

### 4.1 [CLAUDE.md](CLAUDE.md)

Project memory luôn nạp. Nội dung:
- Stack chốt + lý do
- Cấu trúc thư mục
- Lệnh dev hay dùng (`pnpm dev`, `pnpm api:dev`, `pnpm web:dev`, `pnpm prisma:migrate`, `pnpm test`)
- Convention: tên file kebab-case, component PascalCase, API path `/api/v1/<resource>`, response shape `{ data, meta }`, error shape `{ statusCode, message, error }`
- Sidebar order (khớp template)
- Theme tokens (3 tone purple/boutique/organic — đọc từ ảnh `7_16_12`)
- Liệt kê 14 module + status (link tới `PROGRESS.md`)
- Quy ước commit: conventional commit
- Một dòng: "Mọi task xong → cập nhật `PROGRESS.md` rồi mới dừng."

### 4.2 [PROGRESS.md](PROGRESS.md) — state tracker giữa session

Bảng + checklist:
```markdown
# Progress

Last updated: <ISO date>
Current phase: <Phase N — Module>
Active branch: <branch>

## Phase status
- [ ] 0. Bootstrap
- [ ] 1. Auth + Users + Settings + Theme
- [ ] 2. Categories
... (15 phase)

## Currently working on
- File(s): apps/api/src/bookings/bookings.service.ts (line 120: tính remaining)
- Next action: viết e2e test cho booking nhiều dòng
- Blockers: chưa quyết định cách giữ phòng tạm thời khi đang chọn

## Decisions log
- 2026-05-20: chọn Recharts thay vì Chart.js vì native React + tốt cho dashboard
- 2026-05-20: Booking dùng `BookingItem` (polymorphic kind) thay vì 4 bảng riêng
```

Quy ước: mỗi khi kết thúc 1 task chính, agent phải edit file này. Có 1 skill `update-progress` để gọi nhanh.

### 4.3 [.mcp.json](.mcp.json) — MCP servers

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://postgres:postgres@localhost:5432/hotel_dev"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "d:\\AI\\Project_AI\\Hotel"]
    }
  }
}
```

Lý do: postgres MCP giúp Claude tự query DB lúc debug; filesystem MCP cho phép subagent đọc/ghi an toàn trong scope dự án.

### 4.4 [.claude/settings.json](.claude/settings.json) — commit được

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(npx prisma *)",
      "Bash(git status)", "Bash(git diff*)", "Bash(git log*)", "Bash(git add*)", "Bash(git commit*)", "Bash(git branch*)", "Bash(git checkout*)",
      "Bash(docker compose *)",
      "Read(*)", "Edit(*)", "Write(*)", "Glob(*)", "Grep(*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Bash(prisma migrate reset*)"
    ]
  },
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/telegram-notify.ps1 -Event Stop" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/telegram-notify.ps1 -Event SubagentStop" }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/telegram-notify.ps1 -Event Notification" }
        ]
      }
    ]
  }
}
```

### 4.5 [.claude/settings.local.json](.claude/settings.local.json) — **gitignore**

Chứa secrets. Hook script sẽ đọc từ env (set bởi shell) hoặc fallback đọc file này:
```json
{
  "env": {
    "TELEGRAM_BOT_TOKEN": "<paste-token-bot-mới-tạo-cho-dự-án>",
    "TELEGRAM_CHAT_ID": "<chat-id-của-bạn>"
  }
}
```

Hướng dẫn tạo bot mới (sẽ ghi vào `README.md` mục "Telegram setup"):
1. Chat `@BotFather` → `/newbot` → đặt tên "Hotel Dev Notifier" → nhận token.
2. Start bot vừa tạo bằng cách nhắn `/start` từ tài khoản của bạn.
3. Truy cập `https://api.telegram.org/bot<TOKEN>/getUpdates` → copy `chat.id` ở phản hồi.
4. Điền vào `.claude/settings.local.json` (không commit).

### 4.6 [.claude/hooks/telegram-notify.ps1](.claude/hooks/telegram-notify.ps1)

Script PowerShell:
- Đọc stdin (Claude Code hook payload JSON).
- Parse trường `session_id`, `transcript_path`, `stop_hook_active`, `tool_name` (tuỳ event).
- Đọc `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` từ `$env` hoặc fallback `.claude/settings.local.json`.
- Lấy 1-2 dòng cuối trong transcript làm tóm tắt (tail nhẹ, không spam).
- POST `https://api.telegram.org/bot<TOKEN>/sendMessage` với body:
  ```
  [Hotel] <Event> | session=<short id>
  Project: Hotel
  Phase: <đọc dòng "Current phase" từ PROGRESS.md>
  Summary: <tóm tắt>
  Time: <yyyy-MM-dd HH:mm>
  ```
- Trả exit code 0 luôn (không chặn Claude khi Telegram fail).
- Có flag `-Event` để format khác nhau (Stop / SubagentStop / Notification).

### 4.7 [.claude/rules/](.claude/rules/)

4 file rule ngắn (mỗi cái 20-40 dòng):
- **coding-style.md**: TypeScript strict, prettier, eslint config, no `any`, prefer functional, đặt tên i18n VN cho UI label nhưng code tiếng Anh.
- **git-workflow.md**: branch `feat/<phase>-<module>`, commit conventional, không push thẳng main, mỗi PR phải qua code-reviewer agent.
- **api-contract.md**: REST `/api/v1/...`, response `{data, meta}`, lỗi `{statusCode, message, error}`, DTO class-validator, không trả entity Prisma trần.
- **ui-design-system.md**: spacing 4px scale, radius 12px, font Inter, sidebar 240px collapsed 64px, 3 theme tone (đọc từ ảnh `7_16_12`), trạng thái phòng dùng badge màu cố định (xem ảnh `7_15_15`, `7_15_29`), chart palette = purple primary + supporting.

### 4.8 [.claude/skills/](.claude/skills/)

- **add-module/SKILL.md**: Hướng dẫn scaffold 1 module mới (Prisma model → migration → NestJS module/service/controller/dto → e2e test stub → Next.js page → menu entry → update PROGRESS). Có template snippet.
- **update-progress/SKILL.md**: Đọc git status + diff hiện tại, tóm tắt vào PROGRESS.md (cập nhật "Currently working on" + "Decisions log" nếu có), commit hoặc không tuỳ user.

### 4.9 [.claude/agents/](.claude/agents/)

5 subagent, mỗi file frontmatter `name`, `description`, `tools`, `model` (sonnet cho 4 agent thường, opus cho reviewer):

| Agent | Tools | Vai trò |
|-------|-------|---------|
| **researcher** | Read, Grep, Glob, WebFetch, WebSearch | Read-only. Tìm pattern, đọc docs Prisma/NestJS/Next.js, khảo sát thư viện. Không edit code. |
| **backend-engineer** | Read, Edit, Write, Bash, Grep, Glob | Viết NestJS module + Prisma + migration + DTO + service test. Tuân `api-contract.md`. |
| **frontend-engineer** | Read, Edit, Write, Bash, Grep, Glob | Viết Next.js page + component + hook + form. Tuân `ui-design-system.md`. Phải so sánh với ảnh template tương ứng trong [TemplateImage/](TemplateImage/). |
| **code-reviewer** (opus) | Read, Grep, Glob, Bash (chỉ chạy lint/typecheck/test) | Đọc diff, không edit. Output checklist pass/fail + nhận xét. Chạy `pnpm lint && pnpm typecheck` trước khi báo OK. |
| **tester** | Read, Edit, Write, Bash | Viết & chạy Jest unit test + Supertest e2e cho BE, Playwright cho FE happy path. |

### 4.10 [.claude/agent-memory/<agent>/MEMORY.md](.claude/agent-memory/)

Mỗi agent có file MEMORY.md riêng để tích luỹ kiến thức:
- `researcher/MEMORY.md`: ghi quyết định thư viện, link docs hay dùng, gotcha về Prisma/NestJS.
- `backend-engineer/MEMORY.md`: convention DTO/Service, mẫu RBAC decorator, mẫu pagination.
- `frontend-engineer/MEMORY.md`: snippet shadcn hay dùng, palette 3 tone, layout sidebar.
- `code-reviewer/MEMORY.md`: checklist review, lỗi đã bắt được lặp lại.
- `tester/MEMORY.md`: pattern test fixture, cách seed DB cho e2e.

Khởi tạo mỗi file với 1 dòng `# <Agent> Memory` + heading section trống `## Conventions` `## Gotchas` `## Decisions`.

---

## 5. Critical files to create (tóm tắt thứ tự)

Bootstrap step (Phase 0) sẽ tạo theo thứ tự:
1. `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`, `docker-compose.yml`
2. `CLAUDE.md`, `PROGRESS.md`, `PLAN.md` (copy plan này), `README.md`
3. `.mcp.json`
4. `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/telegram-notify.ps1`
5. `.claude/rules/*.md` (4 files)
6. `.claude/skills/{add-module,update-progress}/SKILL.md`
7. `.claude/agents/{researcher,backend-engineer,frontend-engineer,code-reviewer,tester}.md`
8. `.claude/agent-memory/<5 agents>/MEMORY.md`
9. `apps/api/` — `nest new` skeleton + Prisma init
10. `apps/web/` — `create-next-app` + Tailwind + shadcn init
11. `git init` + first commit "chore: bootstrap"

---

## 6. Verification

Sau Phase 0:
- `docker compose up -d` lên Postgres → `pnpm api:prisma:migrate` chạy ok.
- `pnpm api:dev` lên port 3001, `pnpm web:dev` lên port 3000.
- Mở `http://localhost:3000` thấy layout sidebar khớp ảnh `7_15_02`.
- Stop hook test: kết thúc 1 turn → nhận message Telegram trong < 5s.

Sau mỗi phase nghiệp vụ (1-14):
- BE: `pnpm api:test:e2e` toàn pass; mở `http://localhost:3001/docs` (Swagger) thấy endpoint module mới.
- FE: thao tác đúng theo ảnh template tương ứng trên trình duyệt; chạy `pnpm web:typecheck` pass; Playwright happy path pass.
- Cập nhật `PROGRESS.md` (checklist + Currently working on + Decisions log).
- code-reviewer agent chạy lint + typecheck + test, output checklist.

Cuối cùng (Phase 15):
- Deploy preview Vercel (FE) + Railway (BE + Postgres).
- Smoke test full luồng: login → tạo phòng → tạo khách → tạo booking → check-in → check-out → auto tạo task dọn phòng → ghi nhận thanh toán → xem dashboard.
- Xuất 1 báo cáo XLSX và đối chiếu với ảnh `7_16_10`.

---

## 7. Auto push + deploy khi review + test pass

Mục tiêu: mỗi khi 1 task hoàn thành mà **code-reviewer agent báo PASS** và **tester agent báo all green**, hệ thống tự động commit → push → deploy → báo Telegram kèm link preview.

### 7.1 Cơ chế kích hoạt

Dùng kết hợp **agent output convention** + **SubagentStop hook**:

1. **Convention**: code-reviewer và tester agent kết thúc bằng 1 dòng marker chuẩn:
   - Reviewer: `REVIEW_RESULT: PASS` hoặc `REVIEW_RESULT: FAIL — <reason>`
   - Tester: `TEST_RESULT: PASS` hoặc `TEST_RESULT: FAIL — <reason>`

2. **State file** `.claude/state/last-checks.json` ghi lại 2 kết quả gần nhất:
   ```json
   { "review": { "status": "PASS", "at": "2026-05-20T10:00:00Z", "phase": "Phase 6 — Bookings" },
     "test":   { "status": "PASS", "at": "2026-05-20T10:01:00Z", "phase": "Phase 6 — Bookings" } }
   ```

3. **SubagentStop hook** (đã có ở mục 4.4) gọi `telegram-notify.ps1` với `-Event SubagentStop`. Script đó:
   - Parse transcript của subagent, tìm marker → cập nhật `last-checks.json`.
   - Nếu **cả review lẫn test cùng PASS cho cùng 1 phase** và phase này chưa được auto-deploy (so với `last-checks.json.lastDeployedPhase`) → chạy `auto-deploy.ps1`.
   - Gửi Telegram báo trạng thái 2 check.

4. **Script** [.claude/hooks/auto-deploy.ps1](.claude/hooks/auto-deploy.ps1) thực hiện:
   - `git status --porcelain` → nếu có file modified/untracked → `git add -A`.
   - Đọc phase hiện tại từ `PROGRESS.md` để tạo commit message: `feat(<phase-slug>): <summary> [auto: review+test pass]`.
   - `git commit` (không `--no-verify` — để pre-commit hook chạy lint/typecheck).
   - `git push origin <current-branch>`.
   - Trigger deploy:
     - **FE (Vercel)**: push lên branch là đủ vì Vercel auto-deploy preview. Lấy URL preview từ `vercel ls --json` hoặc Vercel API.
     - **BE (Railway)**: `railway up --service api` hoặc dùng Railway GitHub auto-deploy (khuyến nghị bật webhook để khỏi cần CLI).
   - Chờ deploy xong (poll Vercel API / Railway API tối đa 5 phút).
   - Cập nhật `last-checks.json.lastDeployedPhase` + `lastDeployUrl`.
   - Gọi Telegram báo:
     ```
     [Hotel] ✓ Auto-deployed
     Phase: <phase>
     Branch: <branch>
     Commit: <short-sha> <message>
     Web:  <vercel-preview-url>
     API:  <railway-url>
     Time: <yyyy-MM-dd HH:mm>
     ```
   - Exit 0 luôn; nếu fail bước nào thì gửi Telegram lỗi kèm log tail.

### 7.2 Safety guards (quan trọng)

- **Không auto-push lên `main`**: chỉ push lên branch hiện tại (`feat/...`). Merge vào `main` vẫn thủ công qua PR để có review của bạn.
- **Không auto-deploy production**: Vercel/Railway "preview deploy" theo branch, KHÔNG promote production. Tạo PR vào `main` mới promote.
- **Kill switch**: file `.claude/state/auto-deploy.disabled` tồn tại → skip toàn bộ auto-push-deploy (cho lúc bạn muốn pause).
- **Cooldown**: không auto-deploy nếu lần deploy gần nhất < 60 giây trước (tránh loop).
- **Phải có pre-commit hook**: `pnpm lint && pnpm typecheck` chạy trước commit; nếu fail → không push, gửi Telegram báo "commit blocked".
- **Branch protection (main)**: ghi rõ trong README, set GitHub setting bật "require PR + 1 review" cho `main`.

### 7.3 Credentials & config

Bổ sung vào `.claude/settings.local.json` (gitignore):
```json
{
  "env": {
    "TELEGRAM_BOT_TOKEN": "...",
    "TELEGRAM_CHAT_ID": "...",
    "GIT_REMOTE": "origin",
    "VERCEL_TOKEN": "<vercel-token>",
    "VERCEL_PROJECT_ID": "<...>",
    "RAILWAY_TOKEN": "<railway-token>",
    "AUTO_DEPLOY_ENABLED": "true"
  }
}
```

`auto-deploy.ps1` kiểm tra `AUTO_DEPLOY_ENABLED=true` mới chạy, mặc định OFF nếu thiếu.

### 7.4 Files thêm vào (so với mục 4)

- `.claude/hooks/auto-deploy.ps1` — script push + deploy + notify
- `.claude/state/last-checks.json` — state (gitignore)
- `.claude/state/auto-deploy.disabled` — file flag rỗng (không tồn tại = bật)
- `.github/workflows/ci.yml` — CI lint + typecheck + test khi push (bảo hiểm thứ 2 nếu Vercel/Railway dùng Git integration)
- `apps/api/.husky/pre-commit` & `apps/web/.husky/pre-commit` — pre-commit hook: `pnpm lint && pnpm typecheck`

### 7.5 Cập nhật subagent prompt

- `code-reviewer.md`: yêu cầu LUÔN kết thúc bằng dòng marker `REVIEW_RESULT: PASS|FAIL — <reason>` (1 dòng cuối cùng, không có gì khác sau đó).
- `tester.md`: yêu cầu chạy đầy đủ `pnpm test` + `pnpm test:e2e`, kết thúc bằng `TEST_RESULT: PASS|FAIL — <reason>`.

### 7.6 Verification cho luồng auto

- Test thủ công lần đầu: tạo 1 commit nhỏ giả, gọi reviewer + tester trên đó, đảm bảo cả 2 ghi marker đúng → state file cập nhật → auto-deploy.ps1 chạy → nhận Telegram với link preview Vercel mở được.
- Test kill switch: tạo file `.claude/state/auto-deploy.disabled` → chạy lại → script skip, không push.
- Test fail case: ép tester báo FAIL → script không push, Telegram báo "skipped: test failed".

---

## 8. Out of scope (cho MVP này)

- Multi-tenant / multi-property (đã đồng ý single-tenant trước).
- Mobile app native.
- Channel manager (Booking.com/Agoda sync) — chỉ ghi `sourceId` thủ công.
- POS / F&B / kho — chỉ có `Service` đơn giản.
- I18n đa ngôn ngữ — chỉ tiếng Việt.

Khi cần, mỗi mục trên đều có thể nâng cấp sau Phase 15.
