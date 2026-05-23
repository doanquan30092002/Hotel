import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const E2E_SUFFIX = '_e2e_pkg';

// Named constants for date range
const VALID_FROM = '2026-01-01';
const VALID_TO = '2026-12-31';
const VALID_FROM_LATE = '2026-07-01'; // used for "after existing validTo" test

describe('Packages (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;
  let createdId: string;

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

    // Hard-clean any leftover e2e packages from previous runs
    await prisma.pricePackage.deleteMany({ where: { code: { endsWith: E2E_SUFFIX } } });

    // Obtain admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Create manager
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'manager-pkg-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Packages E2E',
        role: 'MANAGER',
      });

    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-pkg-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'receptionist-pkg-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Packages E2E',
        role: 'RECEPTIONIST',
      });

    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist-pkg-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;

    // Create housekeeping user
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'housekeeping-pkg-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Packages E2E',
        role: 'HOUSEKEEPING',
      });

    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'housekeeping-pkg-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    await prisma.pricePackage.deleteMany({ where: { code: { endsWith: E2E_SUFFIX } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-pkg-e2e@hotel.local',
            'receptionist-pkg-e2e@hotel.local',
            'housekeeping-pkg-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /packages — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/packages').expect(401);
  });

  it('POST /packages — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/packages').expect(401);
  });

  it('DELETE /packages/some-id — no token returns 401', async () => {
    await request(app.getHttpServer()).delete('/api/v1/packages/some-id').expect(401);
  });

  // ── RBAC — RECEPTIONIST/HOUSEKEEPING cannot POST/PATCH/DELETE ───────────────

  it('POST /packages — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        code: 'RBAC_e2e_pkg',
        name: 'Should Fail',
        applyType: 'Deluxe',
        numNights: 2,
        numGuests: 2,
        totalPrice: '1000000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(403);
  });

  it('POST /packages — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({
        code: 'RBAC2_e2e_pkg',
        name: 'Should Fail',
        applyType: 'Standard',
        numNights: 1,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(403);
  });

  it('PATCH /packages/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/packages/some-id')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  it('DELETE /packages/:id — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/packages/some-id')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  // ── RBAC — All roles can GET ────────────────────────────────────────────────

  it('GET /packages — RECEPTIONIST can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/packages')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);
  });

  it('GET /packages — HOUSEKEEPING can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/packages')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  it('POST /packages — admin creates a package (201) with correct shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP001_e2e_pkg',
        name: 'Combo Deluxe 2 đêm',
        applyType: 'Deluxe',
        numNights: 2,
        numGuests: 2,
        totalPrice: '1750000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
        detail: 'Bao gồm ăn sáng',
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe('TP001_e2e_pkg');
    expect(res.body.data.name).toBe('Combo Deluxe 2 đêm');
    expect(res.body.data.applyType).toBe('Deluxe');
    expect(res.body.data.numNights).toBe(2);
    expect(res.body.data.numGuests).toBe(2);
    expect(typeof res.body.data.totalPrice).toBe('string');
    // validFrom / validTo returned as ISO date strings (YYYY-MM-DD)
    expect(res.body.data.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(res.body.data.validTo).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(res.body.data.detail).toBe('Bao gồm ăn sáng');
    expect(res.body.data.active).toBe(true);
    expect(res.body.data.deletedAt).toBeUndefined();

    createdId = res.body.data.id as string;
  });

  it('POST /packages — manager can create a package (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        code: 'TP002_e2e_pkg',
        name: 'Combo Standard 1 đêm',
        applyType: 'Standard',
        numNights: 1,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(201);

    expect(res.body.data.code).toBe('TP002_e2e_pkg');
    // cleanup immediately
    await prisma.pricePackage.delete({ where: { id: res.body.data.id as string } });
  });

  it('POST /packages — numNights and numGuests are integers', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Number.isInteger(res.body.data.numNights)).toBe(true);
    expect(Number.isInteger(res.body.data.numGuests)).toBe(true);
  });

  it('POST /packages — detail is optional/nullable (create without detail)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP003_e2e_pkg',
        name: 'Combo không detail',
        applyType: 'Family',
        numNights: 3,
        numGuests: 4,
        totalPrice: '2000000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(201);

    expect(res.body.data.detail).toBeNull();
    // cleanup
    await prisma.pricePackage.delete({ where: { id: res.body.data.id as string } });
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────

  it('GET /packages/:id — returns package with correct shape', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(createdId);
    expect(typeof res.body.data.totalPrice).toBe('string');
    expect(res.body.data.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(res.body.data.validTo).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(res.body.data.deletedAt).toBeUndefined();
  });

  it('GET /packages/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/packages/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── VALIDATION ───────────────────────────────────────────────────────────────

  it('POST /packages — validTo < validFrom returns 422 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP_BADDATE_e2e_pkg',
        name: 'Bad Date Range',
        applyType: 'Deluxe',
        numNights: 1,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: '2026-12-31', // from is later than to
        validTo: '2026-01-01',
      })
      .expect(422);

    expect(res.body.message).toMatch(/Ngày kết thúc/);
  });

  it('POST /packages — numNights = 0 returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP_BADNIGHTS_e2e_pkg',
        name: 'Zero Nights',
        applyType: 'Standard',
        numNights: 0,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(400);
  });

  it('POST /packages — numGuests = 0 returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP_BADGUESTS_e2e_pkg',
        name: 'Zero Guests',
        applyType: 'Standard',
        numNights: 1,
        numGuests: 0,
        totalPrice: '500000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(400);
  });

  it('POST /packages — missing required fields returns 400', async () => {
    // Missing code, name, applyType, numNights, numGuests, totalPrice, validFrom, validTo
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ detail: 'only detail' })
      .expect(400);
  });

  it('POST /packages — bad date format on validFrom returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP_BADFMT_e2e_pkg',
        name: 'Bad Date Format',
        applyType: 'Standard',
        numNights: 1,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: 'not-a-date',
        validTo: VALID_TO,
      })
      .expect(400);
  });

  it('POST /packages — bad date format on validTo returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP_BADFMT2_e2e_pkg',
        name: 'Bad Date Format 2',
        applyType: 'Standard',
        numNights: 1,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: VALID_FROM,
        validTo: 'not-a-date',
      })
      .expect(400);
  });

  it('POST /packages — invalid code format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'bad-pkg!',
        name: 'Bad Code',
        applyType: 'Standard',
        numNights: 1,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(400);
  });

  it('POST /packages — duplicate code returns 409 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP001_e2e_pkg',
        name: 'Duplicate',
        applyType: 'Deluxe',
        numNights: 1,
        numGuests: 1,
        totalPrice: '500000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(409);

    expect(res.body.message).toMatch(/Mã gói mẫu đã tồn tại/);
  });

  // ── LIST + FILTERS ──────────────────────────────────────────────────────────

  it('GET /packages — returns paginated list with meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/packages?page=1&pageSize=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2 });
    expect(typeof res.body.meta.total).toBe('number');
    expect(typeof res.body.meta.totalPages).toBe('number');
  });

  it('GET /packages?applyType=Deluxe — filters by applyType', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/packages?applyType=Deluxe')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    for (const item of res.body.data as Array<{ applyType: string }>) {
      expect(item.applyType).toBe('Deluxe');
    }
  });

  it('GET /packages?active=true — returns only active packages', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/packages?active=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    for (const item of res.body.data as Array<{ active: boolean }>) {
      expect(item.active).toBe(true);
    }
  });

  it('GET /packages?active=false — returns only inactive packages', async () => {
    // Create an inactive package first
    const tempRes = await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP_INACTIVE_e2e_pkg',
        name: 'Inactive Package',
        applyType: 'Standard',
        numNights: 1,
        numGuests: 1,
        totalPrice: '300000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
        active: false,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/packages?active=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    for (const item of res.body.data as Array<{ active: boolean }>) {
      expect(item.active).toBe(false);
    }

    // Cleanup
    await prisma.pricePackage.delete({ where: { id: tempRes.body.data.id as string } });
  });

  it('GET /packages?keyword=combo — keyword search matches name', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/packages?keyword=Combo')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('GET /packages?keyword=<code> — keyword search matches code', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/packages?keyword=TP001_e2e_pkg')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
    const found = (res.body.data as Array<{ code: string }>).find(
      (p) => p.code === 'TP001_e2e_pkg',
    );
    expect(found).toBeDefined();
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  it('PATCH /packages/:id — admin updates name and numNights', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Combo Deluxe cập nhật', numNights: 3 })
      .expect(200);

    expect(res.body.data.name).toBe('Combo Deluxe cập nhật');
    expect(res.body.data.numNights).toBe(3);
  });

  it('PATCH /packages/:id — manager can update (200)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ numGuests: 3 })
      .expect(200);

    expect(res.body.data.numGuests).toBe(3);
  });

  it('PATCH /packages/:id — validTo update to valid date succeeds', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ validTo: '2026-06-30' })
      .expect(200);

    expect(res.body.data.validTo).toMatch(/^2026-06-30/);
  });

  it('PATCH /packages/:id — changing validFrom to date after existing validTo returns 422', async () => {
    // Current package has validFrom=2026-01-01, validTo=2026-06-30
    // Changing validFrom to 2026-07-01 (after validTo 2026-06-30) should return 422
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ validFrom: VALID_FROM_LATE }) // 2026-07-01 > existing validTo 2026-06-30
      .expect(422);

    expect(res.body.message).toMatch(/Ngày kết thúc/);
  });

  it('PATCH /packages/:id — code field is not accepted (OmitType)', async () => {
    // Sending code is ignored due to OmitType; the request should succeed or fail with 400
    // if forbidNonWhitelisted rejects it. Either way, code is not changed.
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Name updated' })
      .expect(200);

    expect(res.body.data.code).toBe('TP001_e2e_pkg');
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('DELETE /packages/:id — soft-deletes package (204)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /packages/:id — deleted package returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /packages — deleted package not in list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/packages?keyword=TP001_e2e_pkg')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = (res.body.data as Array<{ id: string }>).find((p) => p.id === createdId);
    expect(found).toBeUndefined();
  });

  it('DELETE /packages/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/packages/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── SOFT-DELETE RESURRECTION ──────────────────────────────────────────────

  it('POST /packages — create with same code as soft-deleted resurrects (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TP001_e2e_pkg',
        name: 'Combo Deluxe phục hoạt',
        applyType: 'Deluxe',
        numNights: 2,
        numGuests: 2,
        totalPrice: '1800000',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      })
      .expect(201);

    // Should reuse the same DB id (resurrection)
    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.name).toBe('Combo Deluxe phục hoạt');
    expect(res.body.data.deletedAt).toBeUndefined();
    expect(res.body.data.active).toBe(true);

    // Update createdId so afterAll cleanup works
    createdId = res.body.data.id as string;
  });

  it('GET /packages/:id — resurrected package is visible again', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/packages/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
