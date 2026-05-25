# Deploy Guide — Hotel Management

Hướng dẫn deploy production / preview cho project:

- **Frontend (`apps/web`)** → Vercel
- **Backend (`apps/api`) + PostgreSQL** → Railway

Cấu hình ban đầu chỉ cần làm **1 lần**. Sau đó mọi push lên `master` (hoặc bất kỳ branch nào) sẽ tự động deploy preview qua GitHub integration.

---

## 1. Backend — Railway

### 1.1. Tạo project + service Postgres

1. Vào https://railway.com → **New Project** → **Deploy from GitHub repo** → chọn `doanquan30092002/Hotel`.
2. Sau khi Railway clone xong, **Add Service → Database → PostgreSQL**.
3. Railway tự tạo biến `DATABASE_URL` ở scope project (bạn không cần copy thủ công).

### 1.2. Cấu hình service API

Trên service deploy từ repo:

- **Settings → Source → Root Directory**: để trống (`/`) — `railway.json` đã ở root.
- **Settings → Networking → Generate Domain** → ghi nhớ domain (vd: `hotel-api-production.up.railway.app`).

**Variables** (Settings → Variables) — thêm các biến sau:

| Key                   | Value                        | Ghi chú                                   |
| --------------------- | ---------------------------- | ----------------------------------------- |
| `DATABASE_URL`        | `${{Postgres.DATABASE_URL}}` | Reference biến của Postgres service       |
| `JWT_ACCESS_SECRET`   | `<random ≥ 32 chars>`        | `openssl rand -hex 32`                    |
| `JWT_ACCESS_TTL`      | `15m`                        |                                           |
| `JWT_REFRESH_SECRET`  | `<random ≥ 32 chars khác>`   |                                           |
| `JWT_REFRESH_TTL`     | `7d`                         |                                           |
| `API_PREFIX`          | `/api/v1`                    |                                           |
| `CORS_ORIGIN`         | `https://<vercel-domain>`    | Điền sau khi Vercel deploy xong (mục 2.3) |
| `UPLOAD_DRIVER`       | `local`                      | Hoặc `s3` nếu dùng S3                     |
| `UPLOAD_MAX_MB`       | `10`                         |                                           |
| `SEED_ADMIN_EMAIL`    | `admin@hotel.local`          |                                           |
| `SEED_ADMIN_PASSWORD` | `<đặt mật khẩu mạnh>`        |                                           |

> Railway tự inject `PORT` — code đã ưu tiên `PORT` trước `API_PORT`.

### 1.3. Trigger deploy

Sau khi save Variables, Railway sẽ tự build theo `railway.json`:

```
build:  pnpm install --frozen-lockfile && prisma generate && nest build
deploy: prisma migrate deploy && node dist/main.js
health: GET /api/v1/health
```

Kiểm tra **Deploy logs** → khi thấy `API on http://localhost:<PORT>/api/v1` là OK.

### 1.4. Seed dữ liệu (1 lần duy nhất)

Vào **Deployments → … → Open Shell** trên Railway, chạy:

```bash
pnpm --filter @hotel/api prisma:seed
```

→ Tạo admin user + 63 category + 10 phòng + 10 khách + … (xem `apps/api/prisma/seed.ts`).

---

## 2. Frontend — Vercel

### 2.1. Import project

1. Vào https://vercel.com → **Add New… → Project** → import `doanquan30092002/Hotel`.
2. **Framework Preset**: Next.js (auto-detect).
3. **Root Directory**: chọn **`apps/web`** (quan trọng — đây là monorepo).
4. Build & Output Settings: **để mặc định** — `vercel.json` ở `apps/web/` đã override với `cd ../..` để pnpm cài deps cả workspace.

### 2.2. Environment Variables

Production + Preview cùng giá trị:

| Key                        | Value                                 |
| -------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<railway-api-domain>/api/v1` |

> Nhớ hậu tố `/api/v1`.

### 2.3. Deploy + lấy domain

Bấm **Deploy**. Vercel build → khi xong sẽ có domain dạng `hotel-web.vercel.app`.

**Quay lại Railway** (mục 1.2 — Variables), set:

```
CORS_ORIGIN = https://hotel-web.vercel.app
```

Railway sẽ auto-redeploy với CORS mới.

---

## 3. Smoke test (theo PLAN.md Phase 15)

Mở `https://hotel-web.vercel.app` và chạy full luồng:

1. ✅ Login (admin@hotel.local / password đã set ở seed).
2. ✅ Trang `/phong` — tạo 1 phòng mới.
3. ✅ Trang `/khach-hang` — tạo 1 khách mới.
4. ✅ Trang `/booking` → "Tạo booking" — book phòng mới cho khách mới.
5. ✅ Check-in booking → status đổi `checked_in`.
6. ✅ Check-out booking → status `checked_out` + auto tạo task ở `/don-phong`.
7. ✅ Ghi nhận thanh toán đầy đủ → `remainingAmount = 0`.
8. ✅ Trang `/tong-quan` (dashboard) — xem KPI cập nhật.
9. ✅ Trang `/bao-cao` — bấm "Xuất XLSX" → file tải về, đối chiếu với ảnh `TemplateImage/Homestay-Hotel-Workspace-Google-Chrome-5_6_2026-7_16_10-PM.png`.

---

## 4. Auto-deploy hook (Claude Code)

Hook `.claude/hooks/auto-deploy.ps1` tự push branch hiện tại khi `code-reviewer` + `tester` cùng PASS. Hook **KHÔNG** push `master`/`main`, **KHÔNG** promote production.

Để bật:

```jsonc
// .claude/settings.local.json
{
  "env": {
    "AUTO_DEPLOY_ENABLED": "true",
  },
}
```

Kill switch: tạo file rỗng `.claude/state/auto-deploy.disabled`.

---

## 5. Troubleshooting

**Vercel build fail "Module not found"**

- Kiểm tra Root Directory = `apps/web` (KHÔNG phải `/`).
- `vercel.json` đang có `cd ../..` để pnpm thấy `pnpm-workspace.yaml` ở root.

**Railway: `prisma migrate deploy` fail trên cold start**

- Postgres service chưa sẵn sàng. Vào logs xem; restart service hoặc đợi 30s.

**FE gọi BE bị CORS error**

- Vào Railway → Variables → `CORS_ORIGIN` — phải khớp **chính xác** scheme + domain Vercel (không có dấu `/` cuối).
- Nếu nhiều preview URL: ngăn cách bằng `,` (vd: `https://hotel-web.vercel.app,https://hotel-web-git-feat-xxx.vercel.app`).

**Login 401 sau deploy**

- Chưa seed admin. Mở Railway shell và chạy `pnpm --filter @hotel/api prisma:seed`.
