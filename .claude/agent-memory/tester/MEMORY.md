# Tester Memory

## Conventions

- Output LUÔN kết thúc bằng `TEST_RESULT: PASS|FAIL — <reason>`.
- E2E hit real Postgres test DB, reset bằng TRUNCATE CASCADE.

## Test DB setup

- Tạo schema riêng: `DATABASE_URL=postgresql://...?schema=test` trong `.env.test`.
- Trước test suite: chạy migration lên schema `test`.
- Trước mỗi test: `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`.

## Fixture pattern

```ts
// apps/api/test/fixtures/users.ts
export async function seedAdmin(prisma: PrismaService) {
  return prisma.user.create({ data: { email: 'admin@test', passwordHash: '...', role: 'ADMIN', fullName: 'Test Admin' } });
}
```

## Playwright pattern

```ts
test.beforeAll(async ({ request }) => {
  await request.post('/api/v1/auth/login', { data: { email, password } });
});
```

Lưu auth state qua `storageState` để không phải login lại.

## Gotchas

- _(trống)_

## Decisions

- 2026-05-21: e2e không mock DB (user yêu cầu chính xác, tránh mismatch migration).
