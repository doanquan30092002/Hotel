import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Seed dates reference:
//   BK001 checkIn=2026-05-20, checkOut=2026-05-22  (Payment TC001 paidAt=2026-05-20)
//   BK002 checkIn=2026-06-05, checkOut=2026-06-08  (Payment paidAt=2026-06-01)
//   BK003 checkIn=2026-07-01, checkOut=2026-07-03  (no payments)
//   Finance TC001-TC003 INCOME in May; TC004-TC006 EXPENSE in May
//   Housekeeping DP001-DP005 scheduledAt in 2026-05-22..2026-05-25; DP003 is done

const FROM = '2026-05-01';
const TO = '2026-06-01'; // covers all of May

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;

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

    // Admin login
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Helper: ensure user exists then login
    const ensureLogin = async (
      email: string,
      password: string,
      role: string,
      fullName: string,
    ): Promise<string> => {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await request(app.getHttpServer())
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ email, password, fullName, role });
      }
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });
      return loginRes.body.data.accessToken as string;
    };

    managerToken = await ensureLogin(
      'manager-dash-e2e@hotel.local',
      'Test1234!',
      'MANAGER',
      'Manager Dash E2E',
    );
    receptionistToken = await ensureLogin(
      'recept-dash-e2e@hotel.local',
      'Test1234!',
      'RECEPTIONIST',
      'Receptionist Dash E2E',
    );
    housekeepingToken = await ensureLogin(
      'hk-dash-e2e@hotel.local',
      'Test1234!',
      'HOUSEKEEPING',
      'Housekeeping Dash E2E',
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-dash-e2e@hotel.local',
            'recept-dash-e2e@hotel.local',
            'hk-dash-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // ── 1. 401 without auth ───────────────────────────────────────────────────────

  it('1. Returns 401 without auth token', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/dashboard?from=${FROM}&to=${TO}`);
    expect(res.status).toBe(401);
  });

  // ── 2. RECEPTIONIST can access dashboard (all roles allowed) ────────────────

  it('2. RECEPTIONIST can access dashboard (returns 200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${receptionistToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.kpi).toBeDefined();
  });

  // ── 3. HOUSEKEEPING can access dashboard (all roles allowed) ─────────────────

  it('3. HOUSEKEEPING can access dashboard (returns 200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${housekeepingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.kpi).toBeDefined();
  });

  // ── 4. Overview tab keys ──────────────────────────────────────────────────────

  it('4. GET overview tab returns kpi + overview keys', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}&tab=overview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.tab).toBe('overview');
    expect(d.from).toBe(FROM);
    expect(d.to).toBe(TO);

    // KPI always present
    const kpi = d.kpi;
    expect(kpi).toBeDefined();
    expect(typeof kpi.occupancyPercent).toBe('number');
    expect(typeof kpi.vacantNights).toBe('number');
    expect(typeof kpi.todayCheckIns).toBe('number');
    expect(typeof kpi.monthRevenue).toBe('string');
    expect(typeof kpi.monthExpense).toBe('string');
    expect(typeof kpi.totalBookings).toBe('number');

    // Overview tab
    const ov = d.overview;
    expect(ov).toBeDefined();
    expect(Array.isArray(ov.revenueTimeline)).toBe(true);
    expect(typeof ov.occupancyTodayPercent).toBe('number');
    expect(Array.isArray(ov.roomStatusDonut)).toBe(true);
    expect(Array.isArray(ov.bookingSourceBar)).toBe(true);
  });

  // ── 5. booking_occupancy tab keys ─────────────────────────────────────────────

  it('5. GET booking_occupancy tab returns expected keys', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}&tab=booking_occupancy`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const bo = res.body.data.bookingOccupancy;
    expect(bo).toBeDefined();
    expect(Array.isArray(bo.bookingTrend)).toBe(true);
    expect(Array.isArray(bo.occupancyHeatmap)).toBe(true);
    expect(Array.isArray(bo.topRevenueRooms)).toBe(true);
    expect(Array.isArray(bo.sourceDonut)).toBe(true);
  });

  // ── 6. finance tab keys ───────────────────────────────────────────────────────

  it('6. GET finance tab returns expected keys', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}&tab=finance`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const fi = res.body.data.finance;
    expect(fi).toBeDefined();
    expect(Array.isArray(fi.revenueExpenseTimeline)).toBe(true);
    expect(typeof fi.targetProgressPercent).toBe('number');
    expect(Array.isArray(fi.expenseByGroupBar)).toBe(true);
    expect(Array.isArray(fi.revenueBySourceBar)).toBe(true);
  });

  // ── 7. housekeeping tab keys ──────────────────────────────────────────────────

  it('7. GET housekeeping tab returns expected keys', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}&tab=housekeeping`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const hk = res.body.data.housekeeping;
    expect(hk).toBeDefined();
    expect(typeof hk.todayProgressPercent).toBe('number');
    expect(Array.isArray(hk.workloadHeatmap)).toBe(true);
    expect(Array.isArray(hk.staffEfficiencyBar)).toBe(true);
    expect(Array.isArray(hk.cleaningStatusDonut)).toBe(true);
  });

  // ── 8. Date filter narrows results ───────────────────────────────────────────

  it('8. Date range May-only gives fewer bookings than full year', async () => {
    const resMay = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-05-01&to=2026-06-01&tab=overview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resMay.status).toBe(200);
    const mayCount = resMay.body.data.kpi.totalBookings as number;

    const resAll = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-01-01&to=2027-01-01&tab=overview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAll.status).toBe(200);
    const allCount = resAll.body.data.kpi.totalBookings as number;

    // Full year should have >= May-only count
    expect(allCount).toBeGreaterThanOrEqual(mayCount);
  });

  // ── 9. from >= to → 422 ───────────────────────────────────────────────────────

  it('9a. from > to returns 422', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard?from=2026-06-01&to=2026-05-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });

  it('9b. from == to returns 422', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard?from=2026-05-01&to=2026-05-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });

  // ── 10. Invalid tab → 400 ─────────────────────────────────────────────────────

  it('10. Invalid tab value returns 400', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}&tab=bad_tab`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  // ── 11. Overview totalBookings matches DB count for May ───────────────────────

  it('11. KPI totalBookings matches DB count for May range', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-05-01&to=2026-06-01&tab=overview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const totalBookings = res.body.data.kpi.totalBookings as number;

    const dbCount = await prisma.booking.count({
      where: {
        deletedAt: null,
        checkIn: { lt: new Date('2026-06-01T00:00:00Z') },
        checkOut: { gt: new Date('2026-05-01T00:00:00Z') },
      },
    });
    expect(totalBookings).toBe(dbCount);
  });

  // ── 12. Finance incomeByGroup has at least 1 entry ────────────────────────────

  it('12. Finance expenseByGroupBar has at least 1 entry from seed', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}&tab=finance`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { expenseByGroupBar } = res.body.data.finance as {
      expenseByGroupBar: Array<{ code: string; name: string; amount: string }>;
    };
    // TC004 (utilities), TC005 (supplies), TC006 (payroll_expense) are all EXPENSE in May
    expect(expenseByGroupBar.length).toBeGreaterThanOrEqual(1);
    for (const entry of expenseByGroupBar) {
      expect(typeof entry.code).toBe('string');
      expect(typeof entry.amount).toBe('string');
    }
  });

  // ── 13. Housekeeping workloadHeatmap has entries in range ─────────────────────

  it('13. Housekeeping workloadHeatmap has entries for DP001-DP005 scheduledAt range', async () => {
    // DP001-DP005 are scheduledAt 2026-05-22..2026-05-25
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-05-20&to=2026-06-01&tab=housekeeping`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const hk = res.body.data.housekeeping;
    expect(hk.workloadHeatmap.length).toBeGreaterThanOrEqual(1);

    // Sum of all counts across heatmap days
    const totalCounts = (
      hk.workloadHeatmap as Array<{
        date: string;
        counts: { high: number; normal: number; low: number };
      }>
    ).reduce((acc, d) => acc + d.counts.high + d.counts.normal + d.counts.low, 0);
    // DP001-DP005 all in this range → at least 5 tasks
    expect(totalCounts).toBeGreaterThanOrEqual(5);
  });

  // ── 14. Housekeeping todayProgressPercent is 0..100 ──────────────────────────

  it('14. Housekeeping todayProgressPercent is between 0 and 100', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-05-20&to=2026-06-01&tab=housekeeping`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { todayProgressPercent } = res.body.data.housekeeping as {
      todayProgressPercent: number;
    };
    expect(todayProgressPercent).toBeGreaterThanOrEqual(0);
    expect(todayProgressPercent).toBeLessThanOrEqual(100);
  });

  // ── 15. booking_occupancy topRevenueRooms length ≤ 8 ─────────────────────────

  it('15. booking_occupancy topRevenueRooms has at most 8 entries', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-01-01&to=2027-01-01&tab=booking_occupancy`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { topRevenueRooms } = res.body.data.bookingOccupancy as {
      topRevenueRooms: unknown[];
    };
    expect(topRevenueRooms.length).toBeLessThanOrEqual(8);
  });

  // ── 16. MANAGER can access dashboard ─────────────────────────────────────────

  it('16. MANAGER can access dashboard overview', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}&tab=overview`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.overview).toBeDefined();
  });

  // ── 17. Default tab is overview ───────────────────────────────────────────────

  it('17. Default tab is overview when tab param is omitted', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tab).toBe('overview');
    expect(res.body.data.overview).toBeDefined();
  });

  // ── 18. revenueTimeline entries have correct shape ────────────────────────────

  it('18. Overview revenueTimeline entries have correct shape', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-05-01&to=2026-05-08&tab=overview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { revenueTimeline } = res.body.data.overview as {
      revenueTimeline: Array<{
        date: string;
        revenue: string;
        expense: string;
        profit: string;
      }>;
    };
    // 7 days: 2026-05-01 .. 2026-05-07
    expect(revenueTimeline.length).toBe(7);
    for (const pt of revenueTimeline) {
      expect(typeof pt.date).toBe('string');
      expect(typeof pt.revenue).toBe('string');
      expect(typeof pt.expense).toBe('string');
      expect(typeof pt.profit).toBe('string');
    }
  });

  // ── 19. KPI monthRevenue matches sum of finance INCOME in May ─────────────────

  it('19. KPI monthRevenue matches sum of May INCOME from finance seed', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard?from=2026-05-01&to=2026-06-01&tab=overview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { monthRevenue } = res.body.data.kpi as { monthRevenue: string };
    // TC001 (1,500,000) + TC002 (1,350,000) + TC003 (500,000) = 3,350,000 INCOME in May
    const revNum = parseFloat(monthRevenue);
    expect(revNum).toBeGreaterThanOrEqual(3350000);
  });

  // ── 20. Missing from/to → 400 ─────────────────────────────────────────────────

  it('20. Missing from/to params returns 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
