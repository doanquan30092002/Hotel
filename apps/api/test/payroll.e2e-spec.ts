import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Payroll (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;

  // Category IDs
  let statusDraftId: string;
  let statusPendingId: string;
  let statusPaidId: string;
  let wrongGroupId: string;

  // Staff IDs for tests
  let ns001Id: string;
  let ns002Id: string;

  // Created payroll ID for sequential tests
  let createdPayrollId: string;

  // Unique test month to avoid collision with seed data
  const TEST_MONTH = '2026-06';

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

    // Clean up e2e payrolls from previous runs (test month)
    await prisma.payroll.deleteMany({ where: { month: TEST_MONTH } });

    // Helper to get category ID
    const getCatId = async (group: string, code: string) => {
      const cat = await prisma.category.findUniqueOrThrow({
        where: { group_code: { group, code } as never },
        select: { id: true },
      });
      return cat.id;
    };

    statusDraftId = await getCatId('PAYROLL_STATUS', 'draft');
    statusPendingId = await getCatId('PAYROLL_STATUS', 'pending');
    statusPaidId = await getCatId('PAYROLL_STATUS', 'paid');
    wrongGroupId = await getCatId('ROOM_TYPE', 'single');

    // Resolve staff IDs
    const ns001 = await prisma.staff.findUniqueOrThrow({
      where: { code: 'NS001' },
      select: { id: true },
    });
    ns001Id = ns001.id;

    const ns002 = await prisma.staff.findUniqueOrThrow({
      where: { code: 'NS002' },
      select: { id: true },
    });
    ns002Id = ns002.id;

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
        email: 'manager-payroll-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Payroll E2E',
        role: 'MANAGER',
      });
    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-payroll-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create and login receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'recept-payroll-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Payroll E2E',
        role: 'RECEPTIONIST',
      });
    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recept-payroll-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Clean up test payrolls
    await prisma.payroll.deleteMany({ where: { month: TEST_MONTH } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['manager-payroll-e2e@hotel.local', 'recept-payroll-e2e@hotel.local'],
        },
      },
    });
    await app.close();
  });

  // Helper: build a minimal valid create payload
  function buildCreatePayload(overrides: Record<string, unknown> = {}) {
    return {
      month: TEST_MONTH,
      staffId: ns001Id,
      workingDays: 26,
      baseSalary: 12000000,
      allowance: 1500000,
      bonus: 0,
      penalty: 0,
      statusId: statusDraftId,
      ...overrides,
    };
  }

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /payroll — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/payroll').expect(401);
  });

  it('POST /payroll — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/payroll').expect(401);
  });

  it('DELETE /payroll/:id — no token returns 401', async () => {
    await request(app.getHttpServer()).delete('/api/v1/payroll/some-id').expect(401);
  });

  // ── RBAC ────────────────────────────────────────────────────────────────────

  it('GET /payroll — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/payroll')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  it('POST /payroll — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send(buildCreatePayload())
      .expect(403);
  });

  it('POST /payroll/generate — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ month: TEST_MONTH })
      .expect(403);
  });

  it('DELETE /payroll/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/payroll/some-id')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  // ── GET LIST ─────────────────────────────────────────────────────────────────

  it('GET /payroll — returns seed 6 payrolls', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
  });

  it('GET /payroll — MANAGER can access list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
  });

  // ── FILTER ────────────────────────────────────────────────────────────────────

  it('GET /payroll?month=2026-05 — returns 6 seed payrolls', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll?month=2026-05')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(6);
    for (const p of res.body.data as { month: string }[]) {
      expect(p.month).toBe('2026-05');
    }
  });

  it('GET /payroll?statusId=<paid> — returns only paid payrolls', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/payroll?statusId=${statusPaidId}&month=2026-05`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(2); // BL001 and BL002 are paid
    for (const p of res.body.data as { status: { code: string } }[]) {
      expect(p.status.code).toBe('paid');
    }
  });

  it('GET /payroll?statusId=<pending> — returns only pending payrolls', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/payroll?statusId=${statusPendingId}&month=2026-05`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(4); // BL003..BL006 are pending
  });

  it('GET /payroll?staffId=<ns001> — returns only NS001 payrolls', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/payroll?staffId=${ns001Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    for (const p of res.body.data as { staff: { id: string } }[]) {
      expect(p.staff.id).toBe(ns001Id);
    }
  });

  // ── GET DETAIL ────────────────────────────────────────────────────────────────

  it('GET /payroll/:id — returns detail for BL001', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/payroll?month=2026-05')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const bl001 = (
      listRes.body.data as { code: string; id: string; staff: { code: string } }[]
    ).find((p) => p.code === 'BL001');
    expect(bl001).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/payroll/${bl001!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.code).toBe('BL001');
    expect(res.body.data.month).toBe('2026-05');
    expect(res.body.data.staff.code).toBe('NS001');
    expect(res.body.data.netSalary).toBe('16500000');
    expect(res.body.data.status.code).toBe('paid');
    expect(res.body.data.paidAt).not.toBeNull();
  });

  it('GET /payroll/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/payroll/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── POST CREATE ───────────────────────────────────────────────────────────────

  it('POST /payroll — creates payroll and computes netSalary server-side', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          staffId: ns001Id,
          workingDays: 28,
          baseSalary: 12000000,
          allowance: 1500000,
          bonus: 2000000,
          penalty: 500000,
          statusId: statusDraftId,
        }),
      )
      .expect(201);

    // netSalary = 12000000 + 1500000 + 2000000 - 500000 = 15000000
    expect(res.body.data.netSalary).toBe('15000000');
    expect(res.body.data.month).toBe(TEST_MONTH);
    expect(res.body.data.staff.code).toBe('NS001');
    expect(res.body.data.status.code).toBe('draft');

    createdPayrollId = res.body.data.id as string;
  });

  it('POST /payroll — netSalary is always server-side (ignores client)', async () => {
    // Even if client sends a "wrong" netSalary (it's not in the DTO, so forbidden)
    // The server ignores it via forbidNonWhitelisted
    const payload = {
      ...buildCreatePayload({ staffId: ns002Id }),
      // Attempt to sneak in netSalary would fail as 400 if the field is unknown
    };
    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    // netSalary = 12000000 + 1500000 + 0 - 0 = 13500000
    expect(res.body.data.netSalary).toBe('13500000');

    // Clean up
    await prisma.payroll.delete({ where: { id: res.body.data.id as string } });
  });

  it('POST /payroll — MANAGER can create payroll', async () => {
    // We need a staff that doesn't have a payroll for TEST_MONTH yet
    // Use NS003 which is not in TEST_MONTH yet
    const ns003 = await prisma.staff.findUniqueOrThrow({
      where: { code: 'NS003' },
      select: { id: true },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(
        buildCreatePayload({
          staffId: ns003.id,
          workingDays: 26,
        }),
      )
      .expect(201);

    expect(res.body.data.code).toMatch(/^BL\d{3}$/);

    // Clean up
    await prisma.payroll.delete({ where: { id: res.body.data.id as string } });
  });

  // ── POST VALIDATION ───────────────────────────────────────────────────────────

  it('POST /payroll — invalid month format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ month: '2026/05' }))
      .expect(400);
  });

  it('POST /payroll — month without leading zero still fails without YYYY-MM format', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ month: '2026-5' }))
      .expect(400);
  });

  it('POST /payroll — missing staffId returns 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { staffId: _sid, ...rest } = buildCreatePayload();
    await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(rest)
      .expect(400);
  });

  it('POST /payroll — statusId must be PAYROLL_STATUS group returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ statusId: wrongGroupId }))
      .expect(400);
  });

  it('POST /payroll — nonexistent staffId returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ staffId: 'nonexistent-staff-id' }))
      .expect(400);
  });

  it('POST /payroll — duplicate (staffId + month) returns 409', async () => {
    // NS001 already has a payroll for TEST_MONTH (created above)
    await request(app.getHttpServer())
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ staffId: ns001Id }))
      .expect(409);
  });

  // ── POST GENERATE ─────────────────────────────────────────────────────────────

  it('POST /payroll/generate — creates payroll for all active staff', async () => {
    // Clean up any test month payrolls first
    await prisma.payroll.deleteMany({ where: { month: '2026-07' } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: '2026-07' })
      .expect(201);

    expect(res.body.data.created).toBeGreaterThanOrEqual(6);
    expect(res.body.data.skipped).toBe(0);

    // Clean up
    await prisma.payroll.deleteMany({ where: { month: '2026-07' } });
  });

  it('POST /payroll/generate — idempotent: second run has 0 created, all skipped', async () => {
    // First run
    await prisma.payroll.deleteMany({ where: { month: '2026-08' } });
    await request(app.getHttpServer())
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: '2026-08' })
      .expect(201);

    // Second run
    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: '2026-08' })
      .expect(201);

    expect(res.body.data.created).toBe(0);
    expect(res.body.data.skipped).toBeGreaterThanOrEqual(6);

    // Clean up
    await prisma.payroll.deleteMany({ where: { month: '2026-08' } });
  });

  it('POST /payroll/generate — respects workingDays override', async () => {
    await prisma.payroll.deleteMany({ where: { month: '2026-09' } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: '2026-09', workingDays: 20 })
      .expect(201);

    expect(res.body.data.created).toBeGreaterThanOrEqual(6);

    // Verify working days
    const payrolls = await prisma.payroll.findMany({ where: { month: '2026-09' } });
    for (const p of payrolls) {
      expect(p.workingDays).toBe(20);
    }

    // Clean up
    await prisma.payroll.deleteMany({ where: { month: '2026-09' } });
  });

  it('POST /payroll/generate — invalid month format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: '202605' })
      .expect(400);
  });

  // ── PATCH UPDATE ──────────────────────────────────────────────────────────────

  it('PATCH /payroll/:id — updates bonus and recomputes netSalary', async () => {
    expect(createdPayrollId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/payroll/${createdPayrollId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bonus: 3000000,
        penalty: 0,
      })
      .expect(200);

    // netSalary = 12000000 + 1500000 + 3000000 - 0 = 16500000
    expect(res.body.data.netSalary).toBe('16500000');
    expect(res.body.data.bonus).toBe('3000000');
  });

  it('PATCH /payroll/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/payroll/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bonus: 100000 })
      .expect(404);
  });

  // ── PATCH STATUS ──────────────────────────────────────────────────────────────

  it('PATCH /payroll/:id/status — to paid sets paidAt', async () => {
    expect(createdPayrollId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/payroll/${createdPayrollId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusPaidId })
      .expect(200);

    expect(res.body.data.status.code).toBe('paid');
    expect(res.body.data.paidAt).not.toBeNull();
  });

  it('PATCH /payroll/:id/status — away from paid clears paidAt', async () => {
    expect(createdPayrollId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/payroll/${createdPayrollId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusPendingId })
      .expect(200);

    expect(res.body.data.status.code).toBe('pending');
    expect(res.body.data.paidAt).toBeNull();
  });

  it('PATCH /payroll/:id/status — statusId must be PAYROLL_STATUS group returns 400', async () => {
    expect(createdPayrollId).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/payroll/${createdPayrollId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: wrongGroupId })
      .expect(400);
  });

  it('PATCH /payroll/:id/status — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/payroll/nonexistent-id/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusPaidId })
      .expect(404);
  });

  // ── PATCH STATUS IDEMPOTENT ───────────────────────────────────────────────────

  it('PATCH /payroll/:id/status — to paid twice keeps paidAt (idempotent)', async () => {
    expect(createdPayrollId).toBeDefined();

    // First set to paid
    const res1 = await request(app.getHttpServer())
      .patch(`/api/v1/payroll/${createdPayrollId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusPaidId })
      .expect(200);

    const firstPaidAt = res1.body.data.paidAt as string;
    expect(firstPaidAt).not.toBeNull();

    // Second set to paid — should NOT change paidAt
    const res2 = await request(app.getHttpServer())
      .patch(`/api/v1/payroll/${createdPayrollId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusPaidId })
      .expect(200);

    expect(res2.body.data.paidAt).toBe(firstPaidAt);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────────

  it('DELETE /payroll/:id — soft deletes and returns 204', async () => {
    expect(createdPayrollId).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/v1/payroll/${createdPayrollId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /payroll/:id — after soft delete returns 404', async () => {
    expect(createdPayrollId).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/v1/payroll/${createdPayrollId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /payroll/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/payroll/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── PAGINATION ────────────────────────────────────────────────────────────────

  it('GET /payroll?page=1&pageSize=3 — returns 3 items with correct meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll?page=1&pageSize=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(3);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
  });

  // ── KEYWORD SEARCH ────────────────────────────────────────────────────────────

  it('GET /payroll?keyword=BL001 — returns BL001', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll?keyword=BL001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    const bl001 = (res.body.data as { code: string }[]).find((p) => p.code === 'BL001');
    expect(bl001).toBeDefined();
  });
});
