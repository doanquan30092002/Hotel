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

- Prisma `Json?` nullable field: use `Prisma.JsonNull` instead of `null` literal when creating records (type mismatch otherwise). Cast custom object as `Prisma.InputJsonValue`.
- `prisma generate` may throw `EPERM` on Windows when the DLL is locked by a running process — migration still applies; types are already generated.
- `jest --testPathPattern` does not work when `rootDir` in jest config is a subdirectory (e.g. `test/`). Run `npx jest --config ./test/jest-e2e.json <pattern>` directly from `apps/api` instead.

## Patterns added in Phase 2

### GroupBy / group counts (two-query pattern)

```ts
const [totalCounts, activeCounts] = await Promise.all([
  prisma.category.groupBy({ by: ['group'], where: { deletedAt: null }, _count: { _all: true } }),
  prisma.category.groupBy({
    by: ['group'],
    where: { deletedAt: null, active: true },
    _count: { _all: true },
  }),
]);
const activeMap = new Map(activeCounts.map((r) => [r.group, r._count._all]));
// Fill all enum values with 0 for groups with no rows
const data = Object.values(CategoryGroup).map((group) => ({
  group,
  total: totalMap.get(group) ?? 0,
  active: activeMap.get(group) ?? 0,
}));
```

### Reorder transaction pattern

```ts
await prisma.$transaction(async (tx) => {
  const rows = await tx.category.findMany({
    where: { group, deletedAt: null },
    select: { id: true },
  });
  const validIds = new Set(rows.map((r) => r.id));
  const updates = orderedIds
    .filter((id) => validIds.has(id))
    .map((id, index) => tx.category.update({ where: { id }, data: { sortOrder: index } }));
  await Promise.all(updates);
  affected = updates.length;
});
```

### Soft-delete for lookup/category tables

- Same `deletedAt` pattern as business entities.
- `list()` and `findOne()` both filter `deletedAt: null`.
- Seed uses `upsert` keyed on composite unique `(group, code)` — idempotent re-run safe.
- `group` field is immutable after creation (422 if attempted via service guard).

## Patterns added in Phase 3

### Named Prisma relations (multiple FK to same table)

When a model references the same table multiple times, use named relations on both sides:

```prisma
// On the "many" side:
type    Category @relation("RoomType",          fields: [typeId],           references: [id])
status  Category @relation("RoomStatus",        fields: [statusId],         references: [id])

// On the "one" side (Category model):
roomsAsType     Room[] @relation("RoomType")
roomsAsStatus   Room[] @relation("RoomStatus")
```

### Category group validation helper (service pattern)

```ts
private async assertCategoryGroup(
  id: string,
  expectedGroup: CategoryGroup,
  fieldLabel: string,
): Promise<void> {
  const cat = await this.prisma.category.findFirst({
    where: { id, deletedAt: null },
    select: { group: true },
  });
  if (!cat) throw new BadRequestException(`${fieldLabel} không tìm thấy danh mục tương ứng`);
  if (cat.group !== expectedGroup)
    throw new BadRequestException(`${fieldLabel} phải thuộc nhóm danh mục ${expectedGroup}`);
}
```

### Decimal → string in entity (money fields)

```ts
entity.basePrice = room.basePrice.toString();
entity.weekendPrice = room.weekendPrice ? room.weekendPrice.toString() : null;
```

### Nested include constant (type-safe)

```ts
const ROOM_INCLUDE = {
  type: { select: { id: true, code: true, name: true } },
  area: { select: { id: true, code: true, name: true } },
  status: { select: { id: true, code: true, name: true } },
  cleaningStatus: { select: { id: true, code: true, name: true } },
} as const;
```

Pass as `include: ROOM_INCLUDE` on every query to get nested `{ id, code, name }` objects — never expose raw FK strings alone.

### Partial-update guard pattern (avoid overwriting with undefined)

```ts
...(dto.code  !== undefined ? { code: dto.code } : {}),
...('areaId'  in dto        ? { areaId: dto.areaId ?? null } : {}),
```

Use `'field' in dto` (not `!== undefined`) for optional nullable fields that the client can explicitly set to null.

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
