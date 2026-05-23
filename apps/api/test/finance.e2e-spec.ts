import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Finance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;

  // Category IDs resolved at setup
  let financeGroupRoomRevenue: string;
  let financeGroupServiceRevenue: string;
  let financeGroupPayrollExpense: string;
  let financeGroupUtilities: string;
  let methodCashId: string;
  let methodBankTransferId: string;
  let wrongGroupId: string; // ROOM_TYPE — to test wrong group

  // Booking ID for tests
  let bk001Id: string;
  let bk002Id: string;

  // Created tx ID for sequential tests
  let createdTxId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? '/api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up e2e txs from previous runs
    await prisma.financeTx.deleteMany({ where: { code: { startsWith: 'TSTE2E' } } });

    // Helper to get category ID
    const getCatId = async (group: string, code: string) => {
      const cat = await prisma.category.findUniqueOrThrow({
        where: { group_code: { group, code } as never },
        select: { id: true },
      });
      return cat.id;
    };

    financeGroupRoomRevenue = await getCatId('FINANCE_GROUP', 'room_revenue');
    financeGroupServiceRevenue = await getCatId('FINANCE_GROUP', 'service_revenue');
    financeGroupPayrollExpense = await getCatId('FINANCE_GROUP', 'payroll_expense');
    financeGroupUtilities = await getCatId('FINANCE_GROUP', 'utilities');
    methodCashId = await getCatId('PAYMENT_METHOD', 'cash');
    methodBankTransferId = await getCatId('PAYMENT_METHOD', 'bank_transfer');
    wrongGroupId = await getCatId('ROOM_TYPE', 'single');

    // Resolve booking IDs
    const bk001 = await prisma.booking.findUniqueOrThrow({
      where: { code: 'BK001' },
      select: { id: true },
    });
    bk001Id = bk001.id;

    const bk002 = await prisma.booking.findUniqueOrThrow({
      where: { code: 'BK002' },
      select: { id: true },
    });
    bk002Id = bk002.id;

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Create and login manager
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'manager-finance-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Finance E2E',
        role: 'MANAGER',
      });
    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-finance-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create and login receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'recept-finance-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Finance E2E',
        role: 'RECEPTIONIST',
      });
    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recept-finance-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;

    // Create and login housekeeping
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'hk-finance-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Finance E2E',
        role: 'HOUSEKEEPING',
      });
    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hk-finance-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Clean up test fixtures
    await prisma.financeTx.deleteMany({ where: { code: { startsWith: 'TSTE2E' } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-finance-e2e@hotel.local',
            'recept-finance-e2e@hotel.local',
            'hk-finance-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // Helper: build a minimal valid create payload
  function buildCreatePayload(overrides: Record<string, unknown> = {}) {
    return {
      type: 'INCOME',
      groupId: financeGroupRoomRevenue,
      description: 'Test income transaction',
      amount: 100000,
      occurredAt: '2026-05-20',
      ...overrides,
    };
  }

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /finance — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/finance').expect(401);
  });

  it('POST /finance — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/finance').expect(401);
  });

  it('DELETE /finance/:id — no token returns 401', async () => {
    await request(app.getHttpServer()).delete('/api/v1/finance/some-id').expect(401);
  });

  // ── RBAC ────────────────────────────────────────────────────────────────────

  it('GET /finance — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  it('GET /finance — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  it('POST /finance — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send(buildCreatePayload())
      .expect(403);
  });

  it('POST /finance — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send(buildCreatePayload())
      .expect(403);
  });

  it('GET /finance/summary — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance/summary?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  it('GET /finance/booking-payments — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance/booking-payments')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  // ── GET LIST ─────────────────────────────────────────────────────────────────

  it('GET /finance — returns seed 6 transactions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(6);
    expect(res.body.meta.total).toBe(6);
    expect(res.body.meta.page).toBe(1);
  });

  it('GET /finance — MANAGER can access list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
  });

  // ── FILTER BY TYPE ────────────────────────────────────────────────────────────

  it('GET /finance?type=INCOME — returns 3 income transactions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance?type=INCOME')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(3);
    for (const tx of res.body.data as { type: string }[]) {
      expect(tx.type).toBe('INCOME');
    }
  });

  it('GET /finance?type=EXPENSE — returns 3 expense transactions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance?type=EXPENSE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(3);
    for (const tx of res.body.data as { type: string }[]) {
      expect(tx.type).toBe('EXPENSE');
    }
  });

  // ── FILTER BY GROUP ───────────────────────────────────────────────────────────

  it('GET /finance?groupId=<payroll> — returns TC006', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/finance?groupId=${financeGroupPayrollExpense}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    const firstTc006 = (res.body.data as { code: string }[])[0];
    expect(firstTc006?.code).toBe('TC006');
  });

  it('GET /finance?groupId=<utilities> — returns TC004', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/finance?groupId=${financeGroupUtilities}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    const firstTc004 = (res.body.data as { code: string }[])[0];
    expect(firstTc004?.code).toBe('TC004');
  });

  // ── FILTER BY DATE RANGE ──────────────────────────────────────────────────────

  it('GET /finance?from=2026-05-20&to=2026-05-22 — returns only transactions in range', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance?from=2026-05-20&to=2026-05-22')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // TC001 (2026-05-20), TC002 (2026-05-21) should match; TC003 (2026-05-22) also matches since lte
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    for (const tx of res.body.data as { occurredAt: string }[]) {
      expect(tx.occurredAt >= '2026-05-20').toBe(true);
      expect(tx.occurredAt <= '2026-05-22').toBe(true);
    }
  });

  // ── KEYWORD SEARCH ────────────────────────────────────────────────────────────

  it('GET /finance?keyword=BK001 — returns TC001', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance?keyword=BK001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    const firstTc001 = (res.body.data as { code: string }[])[0];
    expect(firstTc001?.code).toBe('TC001');
  });

  it('GET /finance?keyword=TC00 — returns multiple matching codes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance?keyword=TC00')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  // ── GET DETAIL ────────────────────────────────────────────────────────────────

  it('GET /finance/:id — returns detail for TC001', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/finance?type=INCOME')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const tc001 = (listRes.body.data as { code: string; id: string }[]).find(
      (t) => t.code === 'TC001',
    );
    expect(tc001).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/finance/${tc001!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.code).toBe('TC001');
    expect(res.body.data.type).toBe('INCOME');
    expect(res.body.data.group).toBeDefined();
    expect(res.body.data.group.code).toBe('room_revenue');
    expect(res.body.data.amount).toBe('1500000');
    expect(res.body.data.occurredAt).toBe('2026-05-20');
  });

  // ── POST CREATE ───────────────────────────────────────────────────────────────

  it('POST /finance — creates INCOME transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          type: 'INCOME',
          groupId: financeGroupServiceRevenue,
          description: 'E2E test income',
          amount: 200000,
          methodId: methodCashId,
          occurredAt: '2026-05-23',
        }),
      )
      .expect(201);

    expect(res.body.data.type).toBe('INCOME');
    expect(res.body.data.description).toBe('E2E test income');
    expect(res.body.data.amount).toBe('200000');
    expect(res.body.data.group.code).toBe('service_revenue');
    expect(res.body.data.method).toBeDefined();
    expect(res.body.data.method.code).toBe('cash');
    expect(res.body.data.createdBy).toBeDefined();

    createdTxId = res.body.data.id as string;
  });

  it('POST /finance — creates EXPENSE transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          type: 'EXPENSE',
          groupId: financeGroupUtilities,
          description: 'E2E test expense',
          amount: 75000,
          occurredAt: '2026-05-22',
        }),
      )
      .expect(201);

    expect(res.body.data.type).toBe('EXPENSE');
    expect(res.body.data.amount).toBe('75000');

    // Clean up
    await prisma.financeTx.delete({ where: { id: res.body.data.id as string } });
  });

  it('POST /finance — with bookingId links to booking', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          type: 'INCOME',
          groupId: financeGroupRoomRevenue,
          description: 'E2E test with booking',
          amount: 500000,
          bookingId: bk001Id,
          occurredAt: '2026-05-22',
        }),
      )
      .expect(201);

    expect(res.body.data.booking).toBeDefined();
    expect(res.body.data.booking.code).toBe('BK001');

    // Clean up
    await prisma.financeTx.delete({ where: { id: res.body.data.id as string } });
  });

  // ── POST VALIDATION ───────────────────────────────────────────────────────────

  it('POST /finance — invalid type returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ type: 'INVALID_TYPE' }))
      .expect(400);
  });

  it('POST /finance — missing amount returns 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { amount: _amount, ...rest } = buildCreatePayload();
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(rest)
      .expect(400);
  });

  it('POST /finance — missing description returns 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description: _desc, ...rest } = buildCreatePayload();
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(rest)
      .expect(400);
  });

  it('POST /finance — groupId must be FINANCE_GROUP (not PAYMENT_METHOD) returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ groupId: methodCashId }))
      .expect(400);
  });

  it('POST /finance — groupId must be FINANCE_GROUP (not ROOM_TYPE) returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ groupId: wrongGroupId }))
      .expect(400);
  });

  it('POST /finance — methodId must be PAYMENT_METHOD returns 400 if wrong group', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ methodId: wrongGroupId }))
      .expect(400);
  });

  it('POST /finance — non-existent bookingId returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ bookingId: 'nonexistent-booking-id' }))
      .expect(400);
  });

  it('POST /finance — invalid occurredAt format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ occurredAt: 'not-a-date' }))
      .expect(400);
  });

  // ── PATCH UPDATE ──────────────────────────────────────────────────────────────

  it('PATCH /finance/:id — updates amount and description', async () => {
    expect(createdTxId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/finance/${createdTxId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 250000,
        description: 'Updated E2E income',
      })
      .expect(200);

    expect(res.body.data.amount).toBe('250000');
    expect(res.body.data.description).toBe('Updated E2E income');
  });

  it('PATCH /finance/:id — update methodId to bank_transfer', async () => {
    expect(createdTxId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/finance/${createdTxId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ methodId: methodBankTransferId })
      .expect(200);

    expect(res.body.data.method.code).toBe('bank_transfer');
  });

  it('PATCH /finance/:id — non-existent ID returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/finance/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'does not matter' })
      .expect(404);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────────

  it('DELETE /finance/:id — soft deletes and returns 204', async () => {
    expect(createdTxId).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/v1/finance/${createdTxId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /finance/:id — after soft delete returns 404', async () => {
    expect(createdTxId).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/v1/finance/${createdTxId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /finance/:id — non-existent ID returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/finance/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── SUMMARY ENDPOINT ──────────────────────────────────────────────────────────

  it('GET /finance/summary — returns correct totals for May 2026', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance/summary?from=2026-05-01&to=2026-06-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const summary = res.body.data as {
      totalIncome: string;
      totalExpense: string;
      payrollExpense: string;
      netProfit: string;
      countTransactions: number;
      byGroup: { groupCode: string; type: string; amount: string; count: number }[];
    };

    // Seed income: TC001 (1500000) + TC002 (1350000) + TC003 (500000) = 3350000
    expect(parseFloat(summary.totalIncome)).toBeCloseTo(3350000, 0);
    // Seed expense: TC004 (850000) + TC005 (1200000) + TC006 (27300000) = 29350000
    expect(parseFloat(summary.totalExpense)).toBeCloseTo(29350000, 0);
    // Payroll only TC006 = 27300000
    expect(parseFloat(summary.payrollExpense)).toBeCloseTo(27300000, 0);
    // Net = 3350000 - 29350000 = -26000000
    expect(parseFloat(summary.netProfit)).toBeCloseTo(-26000000, 0);
    // 6 seed txs
    expect(summary.countTransactions).toBe(6);
    // byGroup should be non-empty
    expect(summary.byGroup.length).toBeGreaterThan(0);
  });

  it('GET /finance/summary — from >= to returns 422', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance/summary?from=2026-05-31&to=2026-05-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);
  });

  it('GET /finance/summary — from = to returns 422', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance/summary?from=2026-05-01&to=2026-05-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);
  });

  it('GET /finance/summary — missing from returns 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance/summary?to=2026-06-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /finance/summary — byGroup includes all groups present in range', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance/summary?from=2026-05-01&to=2026-06-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const byGroup = res.body.data.byGroup as {
      groupCode: string;
      type: string;
      amount: string;
    }[];
    const groupCodes = byGroup.map((g) => g.groupCode);

    expect(groupCodes).toContain('room_revenue');
    expect(groupCodes).toContain('service_revenue');
    expect(groupCodes).toContain('payroll_expense');
    expect(groupCodes).toContain('utilities');
    expect(groupCodes).toContain('supplies');
  });

  it('GET /finance/summary — MANAGER can access summary', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance/summary?from=2026-05-01&to=2026-06-01')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  // ── BOOKING PAYMENTS ENDPOINT ─────────────────────────────────────────────────

  it('GET /finance/booking-payments — returns payments with method/customer/room', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance/booking-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    if ((res.body.data as unknown[]).length > 0) {
      const payment = res.body.data[0] as {
        paymentId: string;
        bookingCode: string;
        amount: string;
        method: { code: string };
        roomLabel: string;
      };
      expect(payment.paymentId).toBeDefined();
      expect(payment.bookingCode).toBeDefined();
      expect(payment.amount).toBeDefined();
      expect(payment.method).toBeDefined();
      expect(payment.roomLabel).toBeDefined();
    }
  });

  it('GET /finance/booking-payments?limit=1 — respects limit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance/booking-payments?limit=1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeLessThanOrEqual(1);
  });

  it('GET /finance/booking-payments?from=2026-05-20&to=2026-05-22 — filters by date', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance/booking-payments?from=2026-05-20&to=2026-05-22')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // BK001 payment (paidAt: 2026-05-20) should be included
    const data = res.body.data as { bookingCode: string }[];
    expect(data.some((p) => p.bookingCode === 'BK001')).toBe(true);
  });

  it('GET /finance/booking-payments — seed BK002 payment has correct fields', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance/booking-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const bk002Payment = (
      res.body.data as { bookingCode: string; customerName: string | null }[]
    ).find((p) => p.bookingCode === 'BK002');
    expect(bk002Payment).toBeDefined();
    // BK002 customer is KH001 (Nguyễn Minh Anh)
    expect(bk002Payment?.customerName).toBe('Nguyễn Minh Anh');
  });

  // ── PAGINATION ────────────────────────────────────────────────────────────────

  it('GET /finance?page=1&pageSize=3 — returns 3 items with correct meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance?page=1&pageSize=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(3);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
    expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('GET /finance?page=2&pageSize=3 — returns remaining items', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance?page=2&pageSize=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.page).toBe(2);
  });

  // ── FILTER BY BOOKING ─────────────────────────────────────────────────────────

  it('GET /finance?bookingId=<bk001> — returns only BK001 transactions', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/finance?bookingId=${bk001Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    for (const tx of res.body.data as { booking: { code: string } | null }[]) {
      expect(tx.booking?.code).toBe('BK001');
    }
  });

  it('GET /finance?bookingId=<bk002> — returns only BK002 transactions', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/finance?bookingId=${bk002Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    for (const tx of res.body.data as { booking: { code: string } | null }[]) {
      expect(tx.booking?.code).toBe('BK002');
    }
  });
});
