import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;

  // Category IDs resolved at setup
  let statusPendingId: string;
  let statusConfirmedId: string;
  let statusCancelledId: string;
  let sourceWalkinId: string;
  let pricePerNightId: string;
  let methodCashId: string;
  let methodBankId: string;
  let wrongGroupId: string; // ROOM_TYPE — to test bad group

  // Room IDs for tests
  let roomP101Id: string;
  let roomP102Id: string;
  let roomB101Id: string;

  // Booking ID for sequential tests
  let createdBookingId: string;

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

    // Clean up e2e bookings from previous runs (any auto-created bookings beyond seed)
    await prisma.booking.deleteMany({
      where: { code: { notIn: ['BK001', 'BK002', 'BK003'] } },
    });
    // Clean up auto-created customers from prior test runs (resolveCustomer auto-creates KH###)
    await prisma.customer.deleteMany({
      where: {
        code: {
          notIn: [
            'KH001',
            'KH002',
            'KH003',
            'KH004',
            'KH005',
            'KH006',
            'KH007',
            'KH008',
            'KH009',
            'KH010',
          ],
        },
      },
    });

    // Resolve category IDs
    const getCatId = async (group: string, code: string) => {
      const cat = await prisma.category.findUniqueOrThrow({
        where: { group_code: { group, code } as never },
        select: { id: true },
      });
      return cat.id;
    };

    statusPendingId = await getCatId('BOOKING_STATUS', 'pending');
    statusConfirmedId = await getCatId('BOOKING_STATUS', 'confirmed');
    statusCancelledId = await getCatId('BOOKING_STATUS', 'cancelled');
    sourceWalkinId = await getCatId('BOOKING_SOURCE', 'walkin');
    pricePerNightId = await getCatId('PRICE_TYPE', 'per_night');
    methodCashId = await getCatId('PAYMENT_METHOD', 'cash');
    methodBankId = await getCatId('PAYMENT_METHOD', 'bank_transfer');
    wrongGroupId = await getCatId('ROOM_TYPE', 'single');

    // Resolve room IDs
    const r101 = await prisma.room.findUniqueOrThrow({
      where: { code: 'P101' },
      select: { id: true },
    });
    const r102 = await prisma.room.findUniqueOrThrow({
      where: { code: 'P102' },
      select: { id: true },
    });
    const rb101 = await prisma.room.findUniqueOrThrow({
      where: { code: 'B101' },
      select: { id: true },
    });
    roomP101Id = r101.id;
    roomP102Id = r102.id;
    roomB101Id = rb101.id;

    // Obtain admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Create and login manager
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'manager-bk-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Bookings E2E',
        role: 'MANAGER',
      });
    // Manager user created for cleanup purposes but token not needed in these tests
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-bk-e2e@hotel.local', password: 'Test1234!' });

    // Create and login receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'receptionist-bk-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Bookings E2E',
        role: 'RECEPTIONIST',
      });
    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist-bk-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;

    // Create and login housekeeping
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'housekeeping-bk-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Bookings E2E',
        role: 'HOUSEKEEPING',
      });
    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'housekeeping-bk-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Clean up e2e fixtures — keep only seed bookings/customers
    await prisma.booking.deleteMany({
      where: { code: { notIn: ['BK001', 'BK002', 'BK003'] } },
    });
    await prisma.customer.deleteMany({
      where: {
        code: {
          notIn: [
            'KH001',
            'KH002',
            'KH003',
            'KH004',
            'KH005',
            'KH006',
            'KH007',
            'KH008',
            'KH009',
            'KH010',
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-bk-e2e@hotel.local',
            'receptionist-bk-e2e@hotel.local',
            'housekeeping-bk-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // Helper: build a minimal valid create booking payload
  function buildCreatePayload(overrides: Record<string, unknown> = {}) {
    return {
      statusId: statusPendingId,
      sourceId: sourceWalkinId,
      priceTypeId: pricePerNightId,
      checkIn: '2026-10-01',
      checkOut: '2026-10-03',
      adults: 2,
      children: 0,
      numRooms: 1,
      customer: {},
      items: [
        {
          kind: 'ROOM',
          roomId: roomB101Id,
          quantity: 2,
          unitPrice: 1800000,
        },
      ],
      ...overrides,
    };
  }

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /bookings — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/bookings').expect(401);
  });

  it('POST /bookings — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/bookings').expect(401);
  });

  // ── RBAC ────────────────────────────────────────────────────────────────────

  it('DELETE /bookings/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/bookings/some-id')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  it('POST /bookings — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send(buildCreatePayload())
      .expect(403);
  });

  it('DELETE /bookings/:bid/payments/:pid — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/bookings/some-bid/payments/some-pid')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  // ── GET LIST ────────────────────────────────────────────────────────────────

  it('GET /bookings — returns paginated list with seed data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('GET /bookings — HOUSEKEEPING can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  it('GET /bookings?statusId=<pendingId> — filter by statusId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/bookings?statusId=${statusPendingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const b of res.body.data as Array<{ status: { id: string } }>) {
      expect(b.status.id).toBe(statusPendingId);
    }
  });

  it('GET /bookings?sourceId=<walkinId> — filter by sourceId returns only walkin', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/bookings?sourceId=${sourceWalkinId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const b of res.body.data as Array<{ source: { id: string } | null }>) {
      if (b.source) expect(b.source.id).toBe(sourceWalkinId);
    }
  });

  it('GET /bookings?keyword=BK001 — keyword search hits booking code', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/bookings?keyword=BK001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = (res.body.data as Array<{ code: string }>).find((b) => b.code === 'BK001');
    expect(found).toBeDefined();
  });

  it('GET /bookings — list includes itemCount and paymentCount', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/bookings?keyword=BK001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const bk001 = (
      res.body.data as Array<{ code: string; itemCount: number; paymentCount: number }>
    ).find((b) => b.code === 'BK001');
    expect(bk001).toBeDefined();
    expect(bk001?.itemCount).toBe(2);
    expect(bk001?.paymentCount).toBe(1);
  });

  // ── GET DETAIL ──────────────────────────────────────────────────────────────

  it('GET /bookings/:id — detail includes nested items and payments', async () => {
    const bk001 = await prisma.booking.findUniqueOrThrow({ where: { code: 'BK001' } });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bk001.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.code).toBe('BK001');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.data.payments)).toBe(true);
    expect(res.body.data.payments.length).toBeGreaterThanOrEqual(1);
    // Check nested room ref
    const roomItem = (
      res.body.data.items as Array<{ kind: string; room: { code: string } | null }>
    ).find((i) => i.kind === 'ROOM');
    expect(roomItem?.room?.code).toBe('P101');
    // Check money fields are strings
    expect(typeof res.body.data.totalAmount).toBe('string');
  });

  it('GET /bookings/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/bookings/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /bookings/:id — checkIn serialized as YYYY-MM-DD', async () => {
    const bk001 = await prisma.booking.findUniqueOrThrow({ where: { code: 'BK001' } });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bk001.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.checkIn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.data.checkOut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  it('POST /bookings — create with new customer (auto-code KH###)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          customer: {
            fullName: 'Khách Mới E2E',
            phone: '0987001001',
          },
          items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 2, unitPrice: 1800000 }],
        }),
      )
      .expect(201);

    expect(res.body.data.code).toBeDefined();
    expect(res.body.data.code).toMatch(/^BK\d{3}$/);
    expect(res.body.data.customer).toBeDefined();
    expect(res.body.data.customer.fullName).toBe('Khách Mới E2E');
    expect(res.body.data.totalAmount).toBe('3600000');
    expect(res.body.data.paidAmount).toBe('0');
    expect(res.body.data.remainingAmount).toBe('3600000');
    createdBookingId = res.body.data.id as string;

    // Override code for tracking (update to TEST_ prefix)
    await prisma.booking.update({
      where: { id: createdBookingId },
      data: { code: `TEST_${res.body.data.code as string}` },
    });
  });

  it('POST /bookings — create linking to existing customerId', async () => {
    const kh001 = await prisma.customer.findUniqueOrThrow({
      where: { code: 'KH001' },
      select: { id: true },
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-11-01',
          checkOut: '2026-11-03',
          customer: { customerId: kh001.id },
          items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 2, unitPrice: 1800000 }],
        }),
      )
      .expect(201);

    expect(res.body.data.customer.id).toBe(kh001.id);
    // cleanup
    await prisma.booking.update({
      where: { id: res.body.data.id as string },
      data: { code: `TEST_cust_link_${Date.now()}` },
    });
  });

  it('POST /bookings — create with existing phone matches existing customer', async () => {
    // KH001 has phone 0901234001
    const kh001 = await prisma.customer.findUniqueOrThrow({
      where: { code: 'KH001' },
      select: { id: true },
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-12-01',
          checkOut: '2026-12-03',
          customer: { phone: '0901234001' },
          items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 2, unitPrice: 1800000 }],
        }),
      )
      .expect(201);

    // Should have matched KH001
    expect(res.body.data.customer.id).toBe(kh001.id);
    await prisma.booking.update({
      where: { id: res.body.data.id as string },
      data: { code: `TEST_phone_match_${Date.now()}` },
    });
  });

  it('POST /bookings — create with embedded payment computes correct totals', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-10-05',
          checkOut: '2026-10-07',
          customer: {},
          items: [{ kind: 'ROOM', roomId: roomP102Id, quantity: 2, unitPrice: 850000 }],
          payments: [{ methodId: methodCashId, amount: 500000 }],
        }),
      )
      .expect(201);

    expect(res.body.data.totalAmount).toBe('1700000');
    expect(res.body.data.paidAmount).toBe('500000');
    expect(res.body.data.remainingAmount).toBe('1200000');
    await prisma.booking.update({
      where: { id: res.body.data.id as string },
      data: { code: `TEST_pay_${Date.now()}` },
    });
  });

  it('POST /bookings — RECEPTIONIST can create (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-10-10',
          checkOut: '2026-10-12',
          items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 2, unitPrice: 1800000 }],
        }),
      )
      .expect(201);

    await prisma.booking.update({
      where: { id: res.body.data.id as string },
      data: { code: `TEST_recept_${Date.now()}` },
    });
  });

  // ── VALIDATION ───────────────────────────────────────────────────────────────

  it('POST /bookings — checkOut <= checkIn returns 422', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-10-05',
          checkOut: '2026-10-05', // same day
        }),
      )
      .expect(422);

    expect(res.body.message).toMatch(/checkOut/);
  });

  it('POST /bookings — invalid statusId group returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          statusId: wrongGroupId, // ROOM_TYPE, not BOOKING_STATUS
        }),
      )
      .expect(400);

    expect(res.body.message).toMatch(/statusId/);
  });

  it('POST /bookings — empty items array allowed (totals = 0)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-10-15',
          checkOut: '2026-10-17',
          items: [],
        }),
      )
      .expect(201);

    expect(res.body.data.totalAmount).toBe('0');
    await prisma.booking.update({
      where: { id: res.body.data.id as string },
      data: { code: `TEST_empty_${Date.now()}` },
    });
  });

  it('POST /bookings — multi-item with discount computes total correctly', async () => {
    const serviceBreakfast = await prisma.service.findUniqueOrThrow({
      where: { code: 'DV001' },
      select: { id: true },
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-10-20',
          checkOut: '2026-10-22',
          items: [
            { kind: 'ROOM', roomId: roomP102Id, quantity: 2, unitPrice: 850000 },
            { kind: 'SERVICE', serviceId: serviceBreakfast.id, quantity: 2, unitPrice: 80000 },
            { kind: 'DISCOUNT', quantity: 1, unitPrice: 100000 },
          ],
        }),
      )
      .expect(201);

    // total = 1700000 + 160000 - 100000 = 1760000
    expect(res.body.data.totalAmount).toBe('1760000');
    await prisma.booking.update({
      where: { id: res.body.data.id as string },
      data: { code: `TEST_multi_${Date.now()}` },
    });
  });

  // ── ANTI-OVERLAP ─────────────────────────────────────────────────────────────

  it('POST /bookings — overlap with BK001 P101 (2026-05-20 to 2026-05-22) returns 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-05-21', // overlaps BK001 which uses P101
          checkOut: '2026-05-23',
          items: [{ kind: 'ROOM', roomId: roomP101Id, quantity: 2, unitPrice: 850000 }],
        }),
      )
      .expect(409);

    expect(res.body.message).toMatch(/BK001/);
  });

  it('POST /bookings — non-overlapping range on same room succeeds (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-05-23', // starts on BK001 checkOut day — no overlap
          checkOut: '2026-05-25',
          items: [{ kind: 'ROOM', roomId: roomP101Id, quantity: 2, unitPrice: 850000 }],
        }),
      )
      .expect(201);

    await prisma.booking.update({
      where: { id: res.body.data.id as string },
      data: { code: `TEST_nooverlap_${Date.now()}` },
    });
  });

  it('POST /bookings — cancelled booking does not block overlap (201)', async () => {
    // Create a booking, then cancel it, then try to book the same room same dates
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-09-01',
          checkOut: '2026-09-03',
          items: [{ kind: 'ROOM', roomId: roomP102Id, quantity: 2, unitPrice: 850000 }],
        }),
      )
      .expect(201);

    const cancelledId = createRes.body.data.id as string;

    // Cancel it
    await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${cancelledId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusCancelledId })
      .expect(200);

    await prisma.booking.update({
      where: { id: cancelledId },
      data: { code: `TEST_cancel_${Date.now()}` },
    });

    // Now book the same room+dates — should succeed
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-09-01',
          checkOut: '2026-09-03',
          items: [{ kind: 'ROOM', roomId: roomP102Id, quantity: 2, unitPrice: 850000 }],
        }),
      )
      .expect(201);

    await prisma.booking.update({
      where: { id: res2.body.data.id as string },
      data: { code: `TEST_aftercancel_${Date.now()}` },
    });
  });

  // ── PATCH ───────────────────────────────────────────────────────────────────

  it('PATCH /bookings/:id — update top-level note', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Khách cần phòng yên tĩnh' })
      .expect(200);

    expect(res.body.data.note).toBe('Khách cần phòng yên tĩnh');
  });

  it('PATCH /bookings/:id — replacement of items recomputes totals', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 1, unitPrice: 1800000 }],
      })
      .expect(200);

    expect(res.body.data.totalAmount).toBe('1800000');
  });

  it('PATCH /bookings/:id — same room+range on same booking allowed (excludeBookingId)', async () => {
    // Re-updating with same room should not trigger overlap error
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 2, unitPrice: 1800000 }],
      })
      .expect(200);

    expect(res.body.data.totalAmount).toBe('3600000');
  });

  it('PATCH /bookings/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/bookings/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'test' })
      .expect(404);
  });

  // ── PATCH STATUS ─────────────────────────────────────────────────────────────

  it('PATCH /bookings/:id/status — flips status only', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusConfirmedId })
      .expect(200);

    expect(res.body.data.status.id).toBe(statusConfirmedId);
  });

  it('PATCH /bookings/:id/status — validation rejects wrong group statusId', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: wrongGroupId })
      .expect(400);

    expect(res.body.message).toMatch(/statusId/);
  });

  // ── ADD PAYMENT ──────────────────────────────────────────────────────────────

  it('POST /bookings/:id/payments — adds payment, recomputes paid+remaining', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${createdBookingId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ methodId: methodCashId, amount: 1000000 })
      .expect(201);

    expect(res.body.data.paidAmount).toBe('1000000');
    expect(res.body.data.payments?.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /bookings/:id/payments — second payment accumulates', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${createdBookingId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ methodId: methodBankId, amount: 2000000 })
      .expect(201);

    expect(res.body.data.paidAmount).toBe('3000000');
    expect(res.body.data.remainingAmount).toBe('600000');
  });

  // ── DELETE PAYMENT ───────────────────────────────────────────────────────────

  it('DELETE /bookings/:bid/payments/:pid — soft-deletes payment and recomputes totals', async () => {
    // Get current payments
    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const payments = detailRes.body.data.payments as Array<{ id: string; amount: string }>;
    expect(payments.length).toBeGreaterThanOrEqual(2);

    // Delete the first payment (1,000,000)
    const firstPayment = payments.find((p) => p.amount === '1000000');
    expect(firstPayment).toBeDefined();

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/bookings/${createdBookingId}/payments/${firstPayment!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // paidAmount should now be 2,000,000
    expect(res.body.data.paidAmount).toBe('2000000');
    expect(res.body.data.remainingAmount).toBe('1600000');
  });

  // ── CHECK-IN / CHECK-OUT ──────────────────────────────────────────────────────

  it('POST /bookings/:id/check-in — updates checkInTime and flips to checked_in', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${createdBookingId}/check-in`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ checkInTime: '14:00' })
      .expect(201);

    expect(res.body.data.checkInTime).toBe('14:00');
    expect(res.body.data.status.code).toBe('checked_in');
  });

  it('POST /bookings/:id/check-out — updates checkOutTime and flips to checked_out', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${createdBookingId}/check-out`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ checkOutTime: '11:30' })
      .expect(201);

    expect(res.body.data.checkOutTime).toBe('11:30');
    expect(res.body.data.status.code).toBe('checked_out');
  });

  // ── DELETE ───────────────────────────────────────────────────────────────────

  it('DELETE /bookings/:id — soft-deletes booking (204)', async () => {
    // Create a temp booking
    const temp = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-08-01',
          checkOut: '2026-08-03',
          items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 1, unitPrice: 1800000 }],
        }),
      )
      .expect(201);

    const tempId = temp.body.data.id as string;
    await prisma.booking.update({
      where: { id: tempId },
      data: { code: `TEST_del_${Date.now()}` },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/bookings/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /bookings/:id — deleted booking returns 404', async () => {
    // Create and immediately delete
    const temp = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          checkIn: '2026-08-05',
          checkOut: '2026-08-07',
          items: [{ kind: 'ROOM', roomId: roomB101Id, quantity: 1, unitPrice: 1800000 }],
        }),
      )
      .expect(201);

    const tempId = temp.body.data.id as string;
    await prisma.booking.update({
      where: { id: tempId },
      data: { code: `TEST_del2_${Date.now()}` },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/bookings/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/bookings/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /bookings/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/bookings/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── BK001-based detail tests (seed data validation) ──────────────────────────

  it('GET /bookings?keyword=<customer name> — searches customer fullName', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/bookings?keyword=${encodeURIComponent('Hoàng Gia Linh')}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('GET /bookings — pagination meta is correct', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/bookings?page=1&pageSize=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.pageSize).toBe(2);
    expect((res.body.data as unknown[]).length).toBeLessThanOrEqual(2);
  });
});
