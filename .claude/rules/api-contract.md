# API Contract

## Base

- Prefix: `/api/v1`
- Versioning: thêm prefix mới `/api/v2` khi breaking change. Không bao giờ thay đổi shape của `/api/v1`.
- Auth: `Authorization: Bearer <accessToken>` (JWT). Refresh qua `/auth/refresh`.

## Response shape

### Success — single

```json
{
  "data": { ... }
}
```

### Success — list / paginated

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 137,
    "totalPages": 7
  }
}
```

### Error (từ global `HttpExceptionFilter`)

```json
{
  "statusCode": 400,
  "message": "Email không hợp lệ" ,
  "error": "Bad Request",
  "details": { "field": "email" }
}
```

`message` có thể là string hoặc string[] (validation pipe). `details` tùy chọn.

## Query

- Pagination: `?page=1&pageSize=20` (mặc định 1/20, tối đa 100).
- Sort: `?sort=createdAt:desc,name:asc`.
- Filter: tên field cụ thể, vd `?statusId=...&from=2026-05-01&to=2026-05-31&keyword=...`.

## DTO

- BE: class-validator + class-transformer. `whitelist: true`, `forbidNonWhitelisted: true` ở `ValidationPipe`.
- FE: zod schema mirror DTO.

## Status codes

| Code | Khi nào |
|---|---|
| 200 | GET / PUT / PATCH thành công |
| 201 | POST thành công, có resource mới |
| 204 | DELETE thành công, không body |
| 400 | Validation fail |
| 401 | Thiếu / sai token |
| 403 | RBAC chặn |
| 404 | Resource không tồn tại |
| 409 | Conflict (vd: phone trùng, booking overlap) |
| 422 | Business rule fail (vd: check-out trước check-in) |
| 500 | Server error |

## Naming

- Resource path: noun plural lowercase: `/rooms`, `/bookings`, `/customers`.
- Nested: `/bookings/:id/payments`, `/rooms/:id/uploads`.
- Action endpoint (hiếm dùng): POST `/bookings/:id/check-in`, `/bookings/:id/check-out`.

## Idempotency

- POST `/payments`, `/bookings` chấp nhận header `Idempotency-Key` để tránh double submit từ FE.

## Audit

- Mọi mutation (POST/PUT/PATCH/DELETE) trên business entity ghi `AuditLog`. Interceptor làm tự động — không cần code thủ công.
