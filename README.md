# Hotel Management

Web app quản lý khách sạn / homestay. 14+ module: Dashboard, Lịch booking, Phòng trống, Booking, Phòng, Khách hàng, Dịch vụ, Gói mẫu, Dọn phòng, Thu chi, Nhân sự, Bảng lương, Tệp upload, Danh mục, Báo cáo, Cài đặt.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts + TanStack Query
- **Backend**: NestJS + PostgreSQL + Prisma + JWT
- **Deploy**: Vercel (FE) + Railway (BE + Postgres)

## Quick start (sau khi đã scaffold xong Phase 0)

```powershell
# 1. Cài dependencies
pnpm install

# 2. Copy env
Copy-Item .env.example .env

# 3. Start Postgres
docker compose up -d

# 4. Migrate + seed
pnpm api:prisma:migrate
pnpm api:prisma:seed

# 5. Dev (chạy song song BE + FE)
pnpm dev
# BE: http://localhost:3001/api/v1
# Swagger: http://localhost:3001/docs
# FE: http://localhost:3000
```

## Telegram setup (BẮT BUỘC trước khi code)

Hook Claude Code (`Stop` / `SubagentStop` / `Notification`) gửi thông báo về Telegram khi 1 task xong, subagent xong, hoặc cần phê duyệt. Auto-deploy hook cũng gửi link preview Vercel/Railway sau khi review+test PASS.

### Tạo bot mới riêng cho dự án

1. Mở Telegram → chat với [@BotFather](https://t.me/BotFather).
2. Gửi lệnh `/newbot`.
3. Đặt tên hiển thị: `Hotel Dev Notifier` (hoặc tuỳ ý).
4. Đặt username (phải kết thúc bằng `bot`): `hotel_dev_notifier_bot` (hoặc tương tự, phải unique).
5. BotFather trả về **HTTP API token** dạng `1234567890:ABCdef...`. Copy lại.

### Lấy chat_id của bạn

1. Mở chat với bot vừa tạo → bấm `Start` (hoặc gửi 1 tin nhắn bất kỳ).
2. Mở trình duyệt truy cập:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   (thay `<TOKEN>` bằng token vừa lấy).
3. Trong JSON trả về, tìm `result[0].message.chat.id` — đó là `chat_id` của bạn.

### Điền vào settings.local.json

Mở [.claude/settings.local.json](.claude/settings.local.json) (đã có sẵn template), điền 2 giá trị:

```json
{
  "env": {
    "TELEGRAM_BOT_TOKEN": "1234567890:ABCdef...",
    "TELEGRAM_CHAT_ID": "123456789",
    "AUTO_DEPLOY_ENABLED": "false"
  }
}
```

File này đã được gitignore — sẽ không commit lên repo.

### Test hook đã hoạt động chưa

```powershell
# Chạy script trực tiếp để kiểm tra
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/telegram-notify.ps1 -Event Test
```

Nếu nhận được tin nhắn `[Hotel] Test | ...` trong Telegram → hook OK. Nếu lỗi → kiểm tra token/chat_id.

## Auto deploy setup (làm sau khi đã có Vercel + Railway project)

1. Tạo project Vercel: `vercel link` trong `apps/web/` → lấy `VERCEL_PROJECT_ID` và `VERCEL_ORG_ID`.
2. Tạo personal token Vercel: <https://vercel.com/account/tokens>.
3. Tạo project Railway, lấy `RAILWAY_TOKEN` và `RAILWAY_SERVICE_ID`.
4. Điền vào `.claude/settings.local.json`.
5. Đặt `AUTO_DEPLOY_ENABLED: "true"` để bật.
6. Kill switch: tạo file rỗng `.claude/state/auto-deploy.disabled` để tạm tắt.

## Module status

Xem [PROGRESS.md](PROGRESS.md). Plan đầy đủ trong [PLAN.md](PLAN.md). Giao diện tham chiếu trong [TemplateImage/](TemplateImage/).

## Sub-agents

Khi làm việc với Claude Code, dùng đúng vai trò (đã định nghĩa trong `.claude/agents/`):

- `researcher` — đọc docs, khảo sát code (read-only)
- `backend-engineer` — NestJS + Prisma
- `frontend-engineer` — Next.js + shadcn
- `code-reviewer` — review diff, output `REVIEW_RESULT: PASS|FAIL`
- `tester` — viết & chạy test, output `TEST_RESULT: PASS|FAIL`

## Branch policy

- `main`: protected. Chỉ merge qua PR.
- `feat/<phase>-<slug>`: branch làm việc, auto-deploy preview Vercel + Railway theo branch.
- Không `git push --force`, không `--no-verify` (đã deny trong `.claude/settings.json`).
