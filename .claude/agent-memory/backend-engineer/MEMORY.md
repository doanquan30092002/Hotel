# Backend Engineer Memory

> Bộ nhớ tích luỹ. Cập nhật khi học pattern hay tránh lỗi lặp.

## Conventions

- DTO file name: `create-<name>.dto.ts`, `update-<name>.dto.ts`, `query-<name>.dto.ts`.
- Response entity: `<name>.entity.ts` định nghĩa shape trả về cho FE, KHÔNG xuất Prisma type trực tiếp.
- Pagination DTO chung `PageQueryDto { page?: number; pageSize?: number }`, max pageSize = 100.
- Trả về list: `{ data: T[], meta: { page, pageSize, total, totalPages } }`.
- Audit interceptor ghi `AuditLog` cho mọi mutation business entity (Booking, Customer, Room, Service, Staff, Payroll, FinanceTx).

## RBAC pattern

```ts
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  @Get()
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  findAll(@Query() q: QueryBookingDto) { ... }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string) { ... }
}
```

## Gotchas

- _(trống — cập nhật khi gặp)_

## Decisions

- 2026-05-21: Booking dùng `BookingItem` polymorphic theo `kind` (room|service|surcharge|discount) thay vì 4 bảng riêng.
- 2026-05-21: Customer unique trên `phone` và `idNumber` (cả 2 đều nullable, dùng partial index).
- 2026-05-21: Money fields `Decimal(15, 2)`. JSON output stringify.
- 2026-05-21: Soft delete cho Booking/Customer/Room/Staff bằng cột `deletedAt` + Prisma extension filter.

## Reusable snippets

### PrismaService

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### Pagination helper

```ts
export function paginate<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}
```

### JWT strategy pattern (Phase 1)

- `PassportStrategy(Strategy)` with `ExtractJwt.fromAuthHeaderAsBearerToken()` + `JWT_ACCESS_SECRET`.
- `validate(payload)` checks `payload.typ === 'access'` to reject refresh tokens used as access.
- Returns `{ id: payload.sub, email, role }` — stored as `req.user`.
- Refresh token uses separate secret `JWT_REFRESH_SECRET` and is verified manually in `AuthService.refresh()`.
- Payload shape: `{ sub, email, role, typ: 'access' | 'refresh' }`.

### RBAC decorator usage (Phase 1)

- `@Roles(...UserRole[])` sets metadata key `'roles'` via `SetMetadata`.
- `@Public()` sets `'isPublic'` metadata — `JwtAuthGuard` skips auth if present.
- `JwtAuthGuard` extends `AuthGuard('jwt')` and checks `'isPublic'` via Reflector.
- `RolesGuard` reads `'roles'` metadata; absent = allow any authenticated user; present = must match.
- Global guards registered in `AppModule` via `APP_GUARD` token.
- Per-controller `@UseGuards(JwtAuthGuard, RolesGuard)` is redundant but acceptable for documentation clarity.

### Soft-delete pattern (Phase 1)

- Soft-delete: set `deletedAt = new Date()` on PATCH, never hard DELETE.
- All list/get queries: `where: { deletedAt: null }`.
- `findOne()` helper in service throws `NotFoundException` if `deletedAt` is set.
- Controller DELETE returns `204 No Content` (no body).

### Settings singleton pattern (Phase 1)

- `Setting` model has fixed `id = "singleton"`. Enforced at service layer.
- `get()` is defensive: creates the singleton if somehow missing.
- `update()` calls `get()` first to ensure row exists, then `prisma.setting.update()`.
- Decimal fields returned as `string` (`.toString()`) in entity to avoid JS float precision loss.

### AuditLog interceptor pattern (Phase 1)

- Registered globally as `APP_INTERCEPTOR`.
- Fires on POST/PATCH/PUT/DELETE only, after response (using `tap`).
- Extracts `entity` from URL segment `/api/v1/<resource>` — singularises by stripping trailing `s`.
- Best-effort: `.catch()` on auditLog.create to avoid crashing on failure.
- `payload` cast: `(body ?? undefined) as Prisma.InputJsonValue | undefined`.

### ESLint/Prettier gotcha

- `import * as request from 'supertest'` causes TS error with newer supertest types — use `import request from 'supertest'` instead.
- Always run `npx eslint --fix` before typecheck to avoid Prettier formatting errors counted as lint errors.
