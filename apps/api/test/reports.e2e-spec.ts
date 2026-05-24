import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;

  const FROM = '2026-01-01';
  const TO = '2026-12-31';

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

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Create and login as manager
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'manager-reports-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Reports E2E',
        role: 'MANAGER',
      });
    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-reports-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create and login as receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'recept-reports-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Reports E2E',
        role: 'RECEPTIONIST',
      });
    const receptionistLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recept-reports-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptionistLogin.body.data.accessToken as string;

    // Create and login as housekeeping
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'hk-reports-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Reports E2E',
        role: 'HOUSEKEEPING',
      });
    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hk-reports-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-reports-e2e@hotel.local',
            'recept-reports-e2e@hotel.local',
            'hk-reports-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // ── 1. GET /reports/summary without auth → 401 ────────────────────────────
  it('GET /reports/summary without auth → 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .expect(401);
  });

  // ── 2. GET /reports/summary with HOUSEKEEPING role → 403 ─────────────────
  it('GET /reports/summary with HOUSEKEEPING role → 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  // ── 3. GET /reports/summary valid → 200 + correct shape ──────────────────
  it('GET /reports/summary valid → 200 + has totals, topRooms, topSources, byStatusBookings, rows', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { data } = res.body as {
      data: {
        from: string;
        to: string;
        totals: Record<string, unknown>;
        topRooms: unknown[];
        topSources: unknown[];
        byStatusBookings: unknown[];
        rows: unknown[];
      };
    };

    expect(data).toBeDefined();
    expect(data.from).toBe(FROM);
    expect(data.to).toBe(TO);
    expect(data.totals).toBeDefined();
    expect(Array.isArray(data.topRooms)).toBe(true);
    expect(Array.isArray(data.topSources)).toBe(true);
    expect(Array.isArray(data.byStatusBookings)).toBe(true);
    expect(Array.isArray(data.rows)).toBe(true);
  });

  // ── 4. totals.totalRoomRevenue is numeric string ──────────────────────────
  it('totals.totalRoomRevenue is numeric string', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { totals } = res.body.data as { totals: Record<string, unknown> };
    const roomRev = totals.totalRoomRevenue as string;
    expect(typeof roomRev).toBe('string');
    expect(isNaN(Number(roomRev))).toBe(false);
  });

  // ── 5. totals.netProfit = totalIncomeFinance - totalExpenseFinance ─────────
  it('totals.netProfit is totalIncomeFinance - totalExpenseFinance', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { totals } = res.body.data as {
      totals: {
        totalIncomeFinance: string;
        totalExpenseFinance: string;
        netProfit: string;
      };
    };

    const income = parseFloat(totals.totalIncomeFinance);
    const expense = parseFloat(totals.totalExpenseFinance);
    const netProfit = parseFloat(totals.netProfit);
    expect(netProfit).toBeCloseTo(income - expense, 2);
  });

  // ── 6. topRooms length ≤ 10, each item shape ─────────────────────────────
  it('topRooms length ≤ 10, each item has code, name, revenue string, nights number', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { topRooms } = res.body.data as {
      topRooms: Array<{ code: string; name: string; revenue: string; nights: number }>;
    };

    expect(topRooms.length).toBeLessThanOrEqual(10);
    for (const room of topRooms) {
      expect(typeof room.code).toBe('string');
      expect(typeof room.name).toBe('string');
      expect(typeof room.revenue).toBe('string');
      expect(isNaN(Number(room.revenue))).toBe(false);
      expect(typeof room.nights).toBe('number');
    }
  });

  // ── 7. topSources includes one with code matching seeded sources ──────────
  it('topSources includes entry with code matching a seeded BOOKING_SOURCE', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { topSources } = res.body.data as {
      topSources: Array<{ code: string; name: string; bookings: number; revenue: string }>;
    };

    // Seeded booking sources: walkin, hotline, website, bookingdotcom, agoda, other
    const seededCodes = new Set([
      'walkin',
      'hotline',
      'website',
      'bookingdotcom',
      'agoda',
      'other',
      'unknown',
    ]);

    // There should be at least one source in the list
    expect(topSources.length).toBeGreaterThan(0);

    // All sources should have the required fields
    for (const src of topSources) {
      expect(typeof src.code).toBe('string');
      expect(typeof src.name).toBe('string');
      expect(typeof src.bookings).toBe('number');
      expect(typeof src.revenue).toBe('string');
    }

    // At least one source should match a seeded code (BK001/BK002/BK003 have sources)
    const hasSeededSource = topSources.some((s) => seededCodes.has(s.code));
    expect(hasSeededSource).toBe(true);
  });

  // ── 8. byStatusBookings non-empty ────────────────────────────────────────
  it('byStatusBookings is non-empty (seeded bookings exist in range)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { byStatusBookings } = res.body.data as {
      byStatusBookings: Array<{ code: string; name: string; count: number }>;
    };

    expect(byStatusBookings.length).toBeGreaterThan(0);
    for (const status of byStatusBookings) {
      expect(typeof status.code).toBe('string');
      expect(typeof status.name).toBe('string');
      expect(typeof status.count).toBe('number');
      expect(status.count).toBeGreaterThan(0);
    }
  });

  // ── 9. rows contains entry with label "Số booking" ───────────────────────
  it('rows contains entry with label "Số booking"', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { rows } = res.body.data as {
      rows: Array<{ label: string; value: string; note: string }>;
    };

    const soBookingRow = rows.find((r) => r.label === 'Số booking');
    expect(soBookingRow).toBeDefined();
    expect(soBookingRow?.value).toBeDefined();
    expect(soBookingRow?.note).toBeDefined();
  });

  // ── 10. GET /reports/summary missing from → 400 ───────────────────────────
  it('GET /reports/summary missing from → 400', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?to=${TO}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  // ── 11. GET /reports/summary from >= to → 422 ─────────────────────────────
  it('GET /reports/summary from >= to → 422', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/summary?from=2026-06-01&to=2026-05-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);
  });

  // ── 12. GET /reports/export without auth → 401 ───────────────────────────
  it('GET /reports/export without auth → 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/reports/export?from=${FROM}&to=${TO}`)
      .expect(401);
  });

  // ── 13. GET /reports/export with RECEPTIONIST → 403 ─────────────────────
  it('GET /reports/export with RECEPTIONIST → 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/reports/export?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  // ── 14. GET /reports/export valid XLSX → 200 + correct headers + binary ──
  it('GET /reports/export valid XLSX → 200 + spreadsheetml Content-Type + attachment + non-empty body', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/export?from=${FROM}&to=${TO}&format=xlsx`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('.xlsx');

    // Body should be a non-empty binary buffer (XLSX is at least a few KB)
    const body = res.body as Buffer;
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.length).toBeGreaterThan(1000);
  });

  // ── 15. GET /reports/export?format=csv → 200 + text/csv + BOM ────────────
  it('GET /reports/export?format=csv → 200 + text/csv Content-Type + BOM or CSV header', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/export?from=${FROM}&to=${TO}&format=csv`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('.csv');

    // Body should contain the CSV content (with BOM or at least CSV header)
    const bodyStr = (res.body as Buffer).toString('utf-8');
    // Either starts with BOM (﻿) or contains "label,value,note"
    const hasBomOrHeader = bodyStr.startsWith('﻿') || bodyStr.includes('label,value,note');
    expect(hasBomOrHeader).toBe(true);
  });

  // ── Bonus: manager can access summary ────────────────────────────────────
  it('GET /reports/summary with MANAGER role → 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
  });

  // ── Bonus: manager can export ─────────────────────────────────────────────
  it('GET /reports/export with MANAGER role → 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/export?from=${FROM}&to=${TO}&format=xlsx`)
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  // ── Bonus: RECEPTIONIST can access summary ────────────────────────────────
  it('GET /reports/summary with RECEPTIONIST role → 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
  });

  // ── Bonus: equal dates (from == to) → 422 ────────────────────────────────
  it('GET /reports/summary from == to → 422', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/summary?from=2026-05-01&to=2026-05-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);
  });

  // ── Bonus: missing to param → 400 ────────────────────────────────────────
  it('GET /reports/summary missing to → 400', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/reports/summary?from=${FROM}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
