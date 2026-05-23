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

## Patterns added in Phase 4

### Type-safe unique-field lookup (avoid computed key casting)

When querying `findUnique` on a field that is one of several unique columns, use a conditional
expression rather than a dynamic computed key cast, to satisfy Prisma's strict union type:

```ts
const where: Prisma.CustomerWhereUniqueInput =
  field === 'phone' ? { phone: value } : { idNumber: value };
const existing = await this.prisma.customer.findUnique({
  where,
  select: { id: true, deletedAt: true },
});
```

### Resurrection pattern with phone/idNumber soft-delete

When `phone` and `idNumber` are `@unique` and nullable, a soft-deleted row still occupies the
unique index. Strategy:

1. Pre-check phone/idNumber with `assertUniqueField()` — if the conflicting row has `deletedAt !== null` it is NOT a live conflict (skip).
2. Check code uniqueness: if soft-deleted with same code → resurrect (update + clear deletedAt). If active with same code → 409.
3. If phone/idNumber conflict is a LIVE row (different code) → 409 with Vietnamese message.
4. Keep P2002 catch as a defensive fallback, inspecting `err.meta.target[]` to identify which field.

### Keyword search across multiple nullable string fields

```ts
OR: [
  { fullName: { contains: keyword, mode: 'insensitive' } },
  { phone:    { contains: keyword, mode: 'insensitive' } },
  { idNumber: { contains: keyword, mode: 'insensitive' } },
  { email:    { contains: keyword, mode: 'insensitive' } },
  { code:     { contains: keyword, mode: 'insensitive' } },
],
```

Prisma handles nullable fields gracefully — `contains` on a null column simply doesn't match.

### URL-encoding in e2e tests

When a keyword or query param contains non-ASCII characters (Vietnamese), supertest/superagent
throws "Request path contains unescaped characters". Always wrap with `encodeURIComponent()`:

```ts
.get(`/api/v1/customers?keyword=${encodeURIComponent('Nguyễn Minh Anh')}`)
```

## Patterns added in Phase 6

### Auto-code generator pattern (BK### / KH###)

```ts
private async nextCode(): Promise<string> {
  const count = await this.prisma.booking.count({ where: { deletedAt: null } });
  const candidate = `BK${String(count + 1).padStart(3, '0')}`;
  const exists = await this.prisma.booking.findUnique({ where: { code: candidate } });
  if (!exists) return candidate;
  // Fallback: find max existing code and increment
  const last = await this.prisma.booking.findFirst({
    where: { code: { startsWith: 'BK' } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  if (!last) return candidate;
  const num = parseInt(last.code.replace('BK', ''), 10);
  return `BK${String(num + 1).padStart(3, '0')}`;
}
```

Use the same pattern for any entity that needs sequential human-readable codes (KH### for customers, etc.).

### Anti-overlap room booking check

```ts
private async assertNoRoomOverlap(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
): Promise<void> {
  const nonBlockingStatuses = await this.prisma.category.findMany({
    where: { group: CategoryGroup.BOOKING_STATUS, code: { in: ['cancelled', 'checked_out'] }, deletedAt: null },
    select: { id: true },
  });
  const nonBlockingIds = nonBlockingStatuses.map((s) => s.id);

  const overlap = await this.prisma.booking.findFirst({
    where: {
      deletedAt: null,
      statusId: { notIn: nonBlockingIds },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      items: { some: { kind: BookingItemKind.ROOM, roomId } },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { code: true },
  });
  if (overlap) throw new ConflictException(`Phòng đã được đặt (booking ${overlap.code})`);
}
```

- Always pass `excludeBookingId=id` when checking during PATCH to allow updating the same booking.
- Non-blocking statuses fetched dynamically by code (not hardcoded ID) to survive re-seeding.

### Transactional create-with-nested pattern

```ts
const booking = await this.prisma.$transaction(async (tx) => {
  return tx.booking.create({
    data: {
      ...topLevelFields,
      items: { createMany: { data: itemsData } },
      payments: { createMany: { data: paymentsData } },
    },
    include: BOOKING_INCLUDE_DETAIL,
  });
});
```

For update with full replacement of nested collections:

1. `deleteMany` all old items (or `updateMany` with `deletedAt` for soft-delete).
2. `createMany` new items.
3. `update` top-level booking fields.
4. Call `recomputeAndSave(bookingId, tx)` to recalculate totals from DB.
5. After transaction, call `findOne(id)` to get fresh data with all includes.

### `recomputeAndSave` pattern (recalc totals after mutation)

```ts
private async recomputeAndSave(bookingId: string, tx: Prisma.TransactionClient): Promise<void> {
  const items = await tx.bookingItem.findMany({ where: { bookingId }, select: { kind: true, amount: true } });
  const payments = await tx.payment.findMany({ where: { bookingId, deletedAt: null }, select: { amount: true } });
  let total = new Prisma.Decimal(0);
  for (const item of items) {
    total = item.kind === 'DISCOUNT' ? total.sub(item.amount) : total.add(item.amount);
  }
  if (total.lessThan(0)) total = new Prisma.Decimal(0);
  let paid = payments.reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
  const remaining = total.sub(paid).lessThan(0) ? new Prisma.Decimal(0) : total.sub(paid);
  await tx.booking.update({ where: { id: bookingId }, data: { totalAmount: total, paidAmount: paid, remainingAmount: remaining } });
}
```

Call this at the end of any transaction that mutates items or payments.

### resolveCustomer pattern (auto-create / match existing)

Priority: `customerId` (explicit link) > phone match > idNumber match > auto-create new customer with `nextCustomerCode()`. Returns `null` if no customer info at all.

### Date serialization for @db.Date fields

```ts
// In entity.fromList():
e.checkIn = b.checkIn.toISOString().slice(0, 10); // "YYYY-MM-DD"
```

Prisma `@db.Date` fields come back as `Date` objects midnight UTC. `.toISOString().slice(0, 10)` gives consistent YYYY-MM-DD format regardless of server timezone.

## Patterns added in Phase 7

### Read-only endpoint with no new model (calendar pattern)

When a feature needs a read-only computed view over existing data (no new DB tables):

1. Create module, service, controller, dto, entity as usual.
2. No Prisma migration needed — the service queries existing models (`Room`, `Booking`, `BookingItem`).
3. Controller has a single `@Get()` endpoint returning `{ data: CalendarResponse }`.
4. The entity file defines both the Prisma input shape (private interfaces) and the public output shape (exported interfaces + a `CalendarResponseEntity` class with a static `from()` mapper).

```ts
// calendar.service.ts pattern
const rooms = await this.prisma.room.findMany({
  where: { deletedAt: null, ...(query.typeId ? { typeId: query.typeId } : {}) },
  include: { type: { select: {...} }, area: { select: {...} } },
  orderBy: [{ code: 'asc' }],
});

const bookings = await this.prisma.booking.findMany({
  where: {
    deletedAt: null,
    checkIn: { lt: to },   // interval-overlap formula reused from Phase 6
    checkOut: { gt: from },
    ...(query.statusId ? { statusId: query.statusId } : {}),
    // keyword → OR[code, customer.fullName, customer.phone, customer.code]
  },
  include: {
    items: { where: { kind: BookingItemKind.ROOM }, include: { room: {...} } },
  },
});
```

### Occupancy percent formula

```
totalDays = ceil((to - from) / MS_PER_DAY)   // min 1
totalSlots = rooms.length * totalDays

for each booking b:
  start = max(from, b.checkIn)
  end   = min(to, b.checkOut)
  nights = ceil((end - start) / MS_PER_DAY)   // 0 if no overlap
  roomCount = b.items.filter(i => i.roomId !== null).length
  bookedNights += nights * roomCount

  if b.checkIn in [from, to) → shifts++
  if b.checkOut in (from, to] → shifts++

occupancyPercent = totalSlots > 0 ? round(bookedNights / totalSlots * 100) : 0
```

### relatedShifts computation

Count of check-in/check-out events that fall within the query range. Useful for the front-end to show activity volume in the calendar.

### CalendarView enum in DTO

```ts
export enum CalendarView {
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day',
}
```

`view` defaults to `MONTH`. The service passes it through to the response shape; no server-side behaviour changes per view (the FE renders differently based on it).

### Customer seed lookup correction

Always verify actual seed data for e2e tests. KH006 = "Hoàng Gia Linh" (not "Trần Thị Mai"). When writing tests based on seeded data, cross-check `prisma/seed.ts` for exact field values.

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
