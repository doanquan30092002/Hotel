import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Calendar (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  // Category IDs resolved at setup
  let statusCheckedInId: string;
  let statusCancelledId: string;
  let sourceWalkinId: string;
  let sourceBookingDotComId: string;
  let roomTypeVipId: string;
  let roomTypeSingleId: string;

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

    // Resolve category IDs
    const getCatId = async (group: string, code: string) => {
      const cat = await prisma.category.findUniqueOrThrow({
        where: { group_code: { group, code } as never },
        select: { id: true },
      });
      return cat.id;
    };

    statusCheckedInId = await getCatId('BOOKING_STATUS', 'checked_in');
    statusCancelledId = await getCatId('BOOKING_STATUS', 'cancelled');
    sourceWalkinId = await getCatId('BOOKING_SOURCE', 'walkin');
    sourceBookingDotComId = await getCatId('BOOKING_SOURCE', 'bookingdotcom');
    roomTypeVipId = await getCatId('ROOM_TYPE', 'vip');
    roomTypeSingleId = await getCatId('ROOM_TYPE', 'single');

    // Obtain admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── 1. Auth guard ──────────────────────────────────────────────────────────

  it('GET /calendar without auth → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .expect(401);
  });

  // ── 2. Basic response shape ────────────────────────────────────────────────

  it('GET /calendar?from=2026-05-01&to=2026-05-31 returns rooms + bookings + stats', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    const data = res.body.data as {
      view: string;
      from: string;
      to: string;
      rooms: unknown[];
      bookings: unknown[];
      stats: { totalBookings: number; occupancyPercent: number; relatedShifts: number };
    };

    expect(data.view).toBe('month'); // default
    expect(data.from).toBe('2026-05-01');
    expect(data.to).toBe('2026-05-31');
    expect(Array.isArray(data.rooms)).toBe(true);
    expect(Array.isArray(data.bookings)).toBe(true);
    expect(typeof data.stats.totalBookings).toBe('number');
    expect(typeof data.stats.occupancyPercent).toBe('number');
    expect(typeof data.stats.relatedShifts).toBe('number');
  });

  // ── 3. Room count matches seed ─────────────────────────────────────────────

  it('rooms count matches total seeded rooms (10)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as { rooms: unknown[] };
    expect(data.rooms.length).toBe(10);
  });

  // ── 4. BK001 appears in May range ─────────────────────────────────────────

  it('booking BK001 (checkIn 2026-05-20, checkOut 2026-05-22) appears in May query', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as { bookings: Array<{ code: string }> };
    const bk001 = data.bookings.find((b) => b.code === 'BK001');
    expect(bk001).toBeDefined();
  });

  // ── 5. BK001 does NOT appear in July range ────────────────────────────────

  it('booking BK001 does NOT appear when querying July range', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-07-01&to=2026-07-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as { bookings: Array<{ code: string }> };
    const bk001 = data.bookings.find((b) => b.code === 'BK001');
    expect(bk001).toBeUndefined();
  });

  // ── 6. Filter typeId returns only rooms of that type ─────────────────────

  it('filter typeId=vip returns only VIP rooms in rooms array (V101, V102)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/calendar?from=2026-05-01&to=2026-05-31&typeId=${roomTypeVipId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      rooms: Array<{ code: string; type: { id: string } }>;
    };
    expect(data.rooms.length).toBeGreaterThan(0);
    for (const room of data.rooms) {
      expect(room.type.id).toBe(roomTypeVipId);
    }
    // V101 and V102 are VIP rooms
    const codes = data.rooms.map((r) => r.code);
    expect(codes).toContain('V101');
    expect(codes).toContain('V102');
  });

  it('filter typeId=single returns only single rooms', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/calendar?from=2026-05-01&to=2026-05-31&typeId=${roomTypeSingleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      rooms: Array<{ code: string; type: { id: string } }>;
    };
    for (const room of data.rooms) {
      expect(room.type.id).toBe(roomTypeSingleId);
    }
  });

  // ── 7. Filter statusId returns only bookings with that status ─────────────

  it('filter statusId=checked_in returns only checked_in bookings', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/calendar?from=2026-05-01&to=2026-05-31&statusId=${statusCheckedInId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      bookings: Array<{ code: string; status: { id: string } }>;
    };
    for (const b of data.bookings) {
      expect(b.status.id).toBe(statusCheckedInId);
    }
    // BK001 is checked_in in May
    const codes = data.bookings.map((b) => b.code);
    expect(codes).toContain('BK001');
  });

  it('filter statusId=cancelled returns only cancelled bookings', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/calendar?from=2026-01-01&to=2026-12-31&statusId=${statusCancelledId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      bookings: Array<{ status: { id: string } }>;
    };
    for (const b of data.bookings) {
      expect(b.status.id).toBe(statusCancelledId);
    }
  });

  // ── 8. Filter sourceId returns only bookings with that source ────────────

  it('filter sourceId=walkin returns only walkin bookings', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/calendar?from=2026-05-01&to=2026-05-31&sourceId=${sourceWalkinId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      bookings: Array<{ source: { id: string } | null }>;
    };
    for (const b of data.bookings) {
      expect(b.source?.id).toBe(sourceWalkinId);
    }
    // BK001 source is walkin
    const bkRes = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const allCount = (bkRes.body.data as { bookings: unknown[] }).bookings.length;
    expect(allCount).toBeGreaterThanOrEqual(data.bookings.length);
  });

  it('filter sourceId=bookingdotcom returns bookings from bookingdotcom source', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/calendar?from=2026-01-01&to=2026-12-31&sourceId=${sourceBookingDotComId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      bookings: Array<{ source: { id: string } | null }>;
    };
    for (const b of data.bookings) {
      expect(b.source?.id).toBe(sourceBookingDotComId);
    }
  });

  // ── 9. Filter keyword matches booking code ────────────────────────────────

  it('filter keyword=BK001 returns only BK001 booking', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31&keyword=BK001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as { bookings: Array<{ code: string }> };
    expect(data.bookings.length).toBe(1);
    expect(data.bookings[0]?.code).toBe('BK001');
  });

  // ── 10. Filter keyword matches customer name ──────────────────────────────

  it('filter keyword matches customer fullName (KH006 — Hoàng Gia Linh)', async () => {
    // KH006 = Hoàng Gia Linh is linked to BK001 in seed
    const res = await request(app.getHttpServer())
      .get(
        `/api/v1/calendar?from=2026-05-01&to=2026-05-31&keyword=${encodeURIComponent('Hoàng Gia Linh')}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      bookings: Array<{ code: string; customer: { fullName: string } | null }>;
    };
    expect(data.bookings.length).toBeGreaterThan(0);
    const bk001 = data.bookings.find((b) => b.code === 'BK001');
    expect(bk001).toBeDefined();
    expect(bk001?.customer?.fullName).toContain('Hoàng');
  });

  // ── 11. from >= to → 422 ──────────────────────────────────────────────────

  it('from >= to → 422', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-31&to=2026-05-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);
  });

  it('from == to → 422', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-15&to=2026-05-15')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);
  });

  // ── 12. Invalid date format → 400 ─────────────────────────────────────────

  it('invalid date format for from → 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/calendar?from=not-a-date&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('invalid date format for to → 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=bad-date')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  // ── 13. View param passes through ─────────────────────────────────────────

  it('view=week is accepted and passes through to response', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-19&to=2026-05-25&view=week')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.view).toBe('week');
  });

  it('view=day is accepted and passes through to response', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-20&to=2026-05-21&view=day')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.view).toBe('day');
  });

  it('invalid view value → 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31&view=yearly')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  // ── 14. Booking entity shape includes rooms array ─────────────────────────

  it('booking entity includes rooms array derived from ROOM items', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      bookings: Array<{
        code: string;
        rooms: Array<{ roomId: string; roomCode: string; roomName: string }>;
      }>;
    };
    const bk001 = data.bookings.find((b) => b.code === 'BK001');
    expect(bk001).toBeDefined();
    expect(Array.isArray(bk001?.rooms)).toBe(true);
    expect(bk001?.rooms.length).toBeGreaterThan(0);
    // Each room entry should have required fields
    const roomEntry = bk001?.rooms[0];
    expect(roomEntry?.roomId).toBeDefined();
    expect(roomEntry?.roomCode).toBeDefined();
    expect(roomEntry?.roomName).toBeDefined();
  });

  // ── 15. Occupancy percent computed for known range ────────────────────────

  it('occupancyPercent is a number between 0 and 100', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { occupancyPercent } = res.body.data.stats as { occupancyPercent: number };
    expect(occupancyPercent).toBeGreaterThanOrEqual(0);
    expect(occupancyPercent).toBeLessThanOrEqual(100);
  });

  it('occupancyPercent > 0 when BK001 (2 nights, 1 room) is in range of 10 rooms × 30 days', async () => {
    // BK001: checkIn=2026-05-20, checkOut=2026-05-22 → 2 nights × 1 room = 2 booked slots
    // Total slots = 10 rooms × 30 days = 300 (for May 1–31 range = 30 days)
    // At least 2/300 ≈ 1% — round(2/300*100)=1 but BK002/BK003 also exist in May
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { occupancyPercent } = res.body.data.stats as { occupancyPercent: number };
    expect(occupancyPercent).toBeGreaterThan(0);
  });

  // ── 16. Room entity shape ─────────────────────────────────────────────────

  it('room entity has expected fields: id, code, name, type, area', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as {
      rooms: Array<{
        id: string;
        code: string;
        name: string;
        type: { id: string; code: string; name: string };
        area: { id: string; code: string; name: string } | null;
      }>;
    };
    const firstRoom = data.rooms[0];
    expect(firstRoom?.id).toBeDefined();
    expect(firstRoom?.code).toBeDefined();
    expect(firstRoom?.name).toBeDefined();
    expect(firstRoom?.type.id).toBeDefined();
    expect(firstRoom?.type.code).toBeDefined();
    expect(firstRoom?.type.name).toBeDefined();
  });

  // ── 17. rooms ordered by code ─────────────────────────────────────────────

  it('rooms are ordered by code ascending', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = res.body.data as { rooms: Array<{ code: string }> };
    const codes = data.rooms.map((r) => r.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });
});
