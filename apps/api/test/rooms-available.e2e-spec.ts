import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rooms Available (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  // Category IDs resolved at setup
  let roomTypeSingleId: string;
  let statusCancelledId: string;
  let pricePerNightId: string;
  let sourceWalkinId: string;

  // Room IDs
  let roomP101Id: string;
  let roomP102Id: string;

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

    // Clean up e2e bookings from previous runs
    await prisma.booking.deleteMany({ where: { code: { startsWith: 'AVAIL_TEST_' } } });

    // Resolve category IDs
    const getCatId = async (group: string, code: string): Promise<string> => {
      const cat = await prisma.category.findUniqueOrThrow({
        where: { group_code: { group, code } as never },
        select: { id: true },
      });
      return cat.id;
    };

    roomTypeSingleId = await getCatId('ROOM_TYPE', 'single');
    statusCancelledId = await getCatId('BOOKING_STATUS', 'cancelled');
    pricePerNightId = await getCatId('PRICE_TYPE', 'per_night');
    sourceWalkinId = await getCatId('BOOKING_SOURCE', 'walkin');

    // Resolve room IDs
    const p101 = await prisma.room.findUniqueOrThrow({
      where: { code: 'P101' },
      select: { id: true },
    });
    const p102 = await prisma.room.findUniqueOrThrow({
      where: { code: 'P102' },
      select: { id: true },
    });
    roomP101Id = p101.id;
    roomP102Id = p102.id;

    // Obtain admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Cleanup e2e bookings
    await prisma.booking.deleteMany({ where: { code: { startsWith: 'AVAIL_TEST_' } } });
    await app.close();
  });

  // ── 1. Auth guard ────────────────────────────────────────────────────────────

  it('GET /rooms/available without auth → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2026-09-01&checkOut=2026-09-03')
      .expect(401);
  });

  // ── 2. Valid range → 200 ─────────────────────────────────────────────────────

  it('GET /rooms/available with valid range → 200 with data + meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2026-09-01&checkOut=2026-09-03')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta).toHaveProperty('checkIn', '2026-09-01');
    expect(res.body.meta).toHaveProperty('checkOut', '2026-09-03');
    expect(res.body.meta).toHaveProperty('totalRooms');
    expect(res.body.meta).toHaveProperty('totalAvailable');
    expect(res.body.meta).toHaveProperty('totalBooked');
  });

  // ── 3. Returns all rooms when no bookings overlap ────────────────────────────

  it('Returns all 10 rooms when range has no overlapping bookings', async () => {
    // Far future date with no seeded bookings
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2027-01-01&checkOut=2027-01-03')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.totalRooms).toBe(10);
    expect(res.body.meta.totalAvailable).toBe(10);
    expect(res.body.meta.totalBooked).toBe(0);
    expect(res.body.data).toHaveLength(10);
  });

  // ── 4. BK001 blocks P101 (checkIn=2026-05-20, checkOut=2026-05-22, checked_in) ──

  it('Excludes P101 blocked by BK001 (checked_in 2026-05-20 to 2026-05-22)', async () => {
    // Range that overlaps BK001: 2026-05-21 to 2026-05-23
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2026-05-21&checkOut=2026-05-23')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const returnedIds = (res.body.data as Array<{ id: string }>).map((r) => r.id);
    expect(returnedIds).not.toContain(roomP101Id);
    // P102 (same type, not booked) should still appear
    expect(returnedIds).toContain(roomP102Id);
    expect(res.body.meta.totalBooked).toBeGreaterThanOrEqual(1);
  });

  // ── 5. typeId filter narrows results ─────────────────────────────────────────

  it('typeId filter returns only rooms of that type', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/v1/rooms/available?checkIn=2027-02-01&checkOut=2027-02-03&typeId=${roomTypeSingleId}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const rooms = res.body.data as Array<{ type: { id: string } }>;
    expect(rooms.length).toBeGreaterThan(0);
    for (const room of rooms) {
      expect(room.type.id).toBe(roomTypeSingleId);
    }
  });

  // ── 6. capacity filter excludes small rooms ──────────────────────────────────

  it('capacity=4 filter excludes rooms with capacity < 4 (single/double rooms)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2027-03-01&checkOut=2027-03-03&capacity=4')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const rooms = res.body.data as Array<{ capacity: number }>;
    expect(rooms.length).toBeGreaterThan(0);
    for (const room of rooms) {
      expect(room.capacity).toBeGreaterThanOrEqual(4);
    }
    // Rooms P101, P102, P201, P202 all have capacity 2 — none should appear
    const returnedIds = (res.body.data as Array<{ id: string }>).map((r) => r.id);
    expect(returnedIds).not.toContain(roomP101Id);
    expect(returnedIds).not.toContain(roomP102Id);
  });

  // ── 7. keyword=V matches villa codes (V101, V102) ───────────────────────────

  it('keyword=V matches only rooms whose code/name contains V', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2027-04-01&checkOut=2027-04-03&keyword=V')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const codes = (res.body.data as Array<{ code: string }>).map((r) => r.code);
    expect(codes).toContain('V101');
    expect(codes).toContain('V102');
    // P101, P102 etc should not appear (no "V" in code/name ... except "VIP" in name)
    // V101, V102 have "V" prefix in code AND "Villa VIP" in name
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });

  // ── 8. checkIn >= checkOut → 422 ─────────────────────────────────────────────

  it('checkIn === checkOut → 422 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2027-05-01&checkOut=2027-05-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);

    expect(res.body.message).toMatch(/checkOut phải sau checkIn/);
  });

  it('checkIn after checkOut → 422', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2027-05-03&checkOut=2027-05-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);

    expect(res.body.message).toMatch(/checkOut phải sau checkIn/);
  });

  // ── 9. Invalid date format → 400 ─────────────────────────────────────────────

  it('Invalid checkIn format → 400 with validation message', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=not-a-date&checkOut=2027-05-03')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    const msg = Array.isArray(res.body.message)
      ? (res.body.message as string[]).join(' ')
      : String(res.body.message);
    expect(msg).toMatch(/checkIn phải đúng định dạng ngày YYYY-MM-DD/);
  });

  it('Missing checkIn → 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkOut=2027-05-03')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  // ── 10. Cancelled booking does NOT block room ─────────────────────────────────

  it('Cancelled booking does not block P102 from being available', async () => {
    // Create a cancelled booking for P102 in range 2027-06-01 to 2027-06-03
    const createdBooking = await prisma.booking.create({
      data: {
        code: 'AVAIL_TEST_001',
        sourceId: sourceWalkinId,
        statusId: statusCancelledId,
        priceTypeId: pricePerNightId,
        checkIn: new Date('2027-06-01'),
        checkOut: new Date('2027-06-03'),
        adults: 1,
        children: 0,
        numRooms: 1,
        totalAmount: new Prisma.Decimal(850000),
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: new Prisma.Decimal(850000),
        items: {
          create: {
            kind: 'ROOM',
            roomId: roomP102Id,
            refCode: 'P102',
            refName: 'Phòng 102 – Standard',
            quantity: new Prisma.Decimal(2),
            unitPrice: new Prisma.Decimal(850000),
            amount: new Prisma.Decimal(1700000),
          },
        },
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2027-06-01&checkOut=2027-06-03')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const returnedIds = (res.body.data as Array<{ id: string }>).map((r) => r.id);
    // P102 should still appear because the booking is cancelled (non-blocking)
    expect(returnedIds).toContain(roomP102Id);

    // Cleanup
    await prisma.booking.delete({ where: { id: createdBooking.id } });
  });

  // ── 10b. Rooms with status=disabled are excluded ─────────────────────────────

  it('Rooms with status=disabled are excluded from /rooms/available', async () => {
    const disabledStatus = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_STATUS', code: 'disabled' } as never },
      select: { id: true },
    });
    const original = await prisma.room.findUniqueOrThrow({
      where: { id: roomP102Id },
      select: { statusId: true },
    });
    await prisma.room.update({
      where: { id: roomP102Id },
      data: { statusId: disabledStatus.id },
    });
    try {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rooms/available?checkIn=2027-07-01&checkOut=2027-07-03')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const ids = (res.body.data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).not.toContain(roomP102Id);
    } finally {
      await prisma.room.update({
        where: { id: roomP102Id },
        data: { statusId: original.statusId },
      });
    }
  });

  // ── 11. meta fields: totalRooms, totalAvailable, totalBooked ─────────────────

  it('meta returns correct totalRooms, totalAvailable, totalBooked', async () => {
    // BK001: P101, checked_in, 2026-05-20 to 2026-05-22 — overlaps 2026-05-20 to 2026-05-22
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms/available?checkIn=2026-05-20&checkOut=2026-05-22')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const meta = res.body.meta as {
      totalRooms: number;
      totalAvailable: number;
      totalBooked: number;
    };

    expect(meta.totalRooms).toBe(10);
    // P101 is booked by BK001 — so 1 room is booked, 9 available
    expect(meta.totalBooked).toBe(1);
    expect(meta.totalAvailable).toBe(9);
    expect(meta.totalRooms).toBe(meta.totalAvailable + meta.totalBooked);
  });
});
