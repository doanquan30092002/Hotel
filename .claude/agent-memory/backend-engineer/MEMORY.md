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
  async onModuleInit() { await this.$connect(); }
}
```

### Pagination helper

```ts
export function paginate<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}
```
