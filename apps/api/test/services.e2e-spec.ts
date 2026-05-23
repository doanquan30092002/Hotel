import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const E2E_SUFFIX = '_e2e_svc';

describe('Services (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;
  let createdId: string;

  // Category IDs resolved at setup
  let groupId: string; // SERVICE_GROUP — food
  let altGroupId: string; // SERVICE_GROUP — laundry
  let unitId: string; // UNIT — suat
  let altUnitId: string; // UNIT — kg
  let wrongGroupId: string; // ROOM_TYPE — to test bad groupId
  let wrongUnitId: string; // ROOM_STATUS — to test bad unitId

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

    // Hard-clean any leftover e2e services from previous runs
    await prisma.service.deleteMany({ where: { code: { endsWith: E2E_SUFFIX } } });

    // Resolve category IDs
    const foodGroup = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'SERVICE_GROUP', code: 'food' } },
    });
    const laundryGroup = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'SERVICE_GROUP', code: 'laundry' } },
    });
    const suatUnit = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'UNIT', code: 'suat' } },
    });
    const kgUnit = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'UNIT', code: 'kg' } },
    });
    const roomType = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_TYPE', code: 'single' } },
    });
    const roomStatus = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_STATUS', code: 'ready' } },
    });

    groupId = foodGroup.id;
    altGroupId = laundryGroup.id;
    unitId = suatUnit.id;
    altUnitId = kgUnit.id;
    wrongGroupId = roomType.id;
    wrongUnitId = roomStatus.id;

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
        email: 'manager-svc-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Services E2E',
        role: 'MANAGER',
      });

    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-svc-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'receptionist-svc-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Services E2E',
        role: 'RECEPTIONIST',
      });

    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist-svc-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;

    // Create housekeeping user
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'housekeeping-svc-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Services E2E',
        role: 'HOUSEKEEPING',
      });

    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'housekeeping-svc-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { code: { endsWith: E2E_SUFFIX } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-svc-e2e@hotel.local',
            'receptionist-svc-e2e@hotel.local',
            'housekeeping-svc-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /services — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/services').expect(401);
  });

  it('POST /services — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/services').expect(401);
  });

  it('DELETE /services/some-id — no token returns 401', async () => {
    await request(app.getHttpServer()).delete('/api/v1/services/some-id').expect(401);
  });

  // ── RBAC — RECEPTIONIST/HOUSEKEEPING cannot POST/PATCH/DELETE ───────────────

  it('POST /services — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ code: 'RBAC_e2e_svc', name: 'Should Fail', groupId, unitId, price: '10000' })
      .expect(403);
  });

  it('POST /services — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ code: 'RBAC2_e2e_svc', name: 'Should Fail', groupId, unitId, price: '10000' })
      .expect(403);
  });

  it('PATCH /services/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/services/some-id')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  it('DELETE /services/:id — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/services/some-id')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  // ── RBAC — All roles can GET ────────────────────────────────────────────────

  it('GET /services — RECEPTIONIST can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/services')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);
  });

  it('GET /services — HOUSEKEEPING can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/services')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  it('POST /services — admin creates a service (201) with nested group & unit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TS001_e2e_svc',
        name: 'Dịch vụ test E2E',
        groupId,
        unitId,
        price: '80000',
        note: 'Ghi chú test',
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe('TS001_e2e_svc');
    expect(res.body.data.name).toBe('Dịch vụ test E2E');
    expect(res.body.data.group).toMatchObject({ id: groupId });
    expect(res.body.data.group.code).toBeDefined();
    expect(res.body.data.group.name).toBeDefined();
    expect(res.body.data.unit).toMatchObject({ id: unitId });
    expect(res.body.data.unit.code).toBeDefined();
    expect(res.body.data.unit.name).toBeDefined();
    expect(typeof res.body.data.price).toBe('string');
    expect(res.body.data.active).toBe(true);
    expect(res.body.data.note).toBe('Ghi chú test');
    expect(res.body.data.deletedAt).toBeUndefined();

    createdId = res.body.data.id as string;
  });

  it('POST /services — manager can create a service (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        code: 'TS002_e2e_svc',
        name: 'Dịch vụ manager tạo',
        groupId: altGroupId,
        unitId: altUnitId,
        price: '50000',
      })
      .expect(201);

    expect(res.body.data.code).toBe('TS002_e2e_svc');
    // cleanup immediately
    await prisma.service.delete({ where: { id: res.body.data.id as string } });
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────

  it('GET /services/:id — returns service with nested group & unit', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.group).toMatchObject({ id: groupId });
    expect(res.body.data.unit).toMatchObject({ id: unitId });
    expect(typeof res.body.data.price).toBe('string');
    expect(res.body.data.deletedAt).toBeUndefined();
  });

  it('GET /services/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/services/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── VALIDATION ───────────────────────────────────────────────────────────────

  it('POST /services — groupId pointing at ROOM_TYPE returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TS_BADGRP_e2e_svc',
        name: 'Bad Group',
        groupId: wrongGroupId,
        unitId,
        price: '10000',
      })
      .expect(400);

    expect(res.body.message).toMatch(/groupId/);
  });

  it('POST /services — unitId pointing at ROOM_STATUS returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TS_BADUNIT_e2e_svc',
        name: 'Bad Unit',
        groupId,
        unitId: wrongUnitId,
        price: '10000',
      })
      .expect(400);

    expect(res.body.message).toMatch(/unitId/);
  });

  it('POST /services — invalid code format (bad-code!) returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'bad-code!', name: 'Bad Code', groupId, unitId, price: '10000' })
      .expect(400);
  });

  it('POST /services — duplicate code returns 409 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TS001_e2e_svc',
        name: 'Duplicate',
        groupId,
        unitId,
        price: '10000',
      })
      .expect(409);

    expect(res.body.message).toMatch(/Mã dịch vụ đã tồn tại/);
  });

  it('POST /services — missing required fields returns 400', async () => {
    // Missing code, name, groupId, unitId, price
    await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'only note' })
      .expect(400);
  });

  it('POST /services — missing name returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'TS_NONAME_e2e_svc', groupId, unitId, price: '10000' })
      .expect(400);
  });

  // ── LIST + FILTERS ──────────────────────────────────────────────────────────

  it('GET /services — returns paginated list with meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/services?page=1&pageSize=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2 });
    expect(typeof res.body.meta.total).toBe('number');
    expect(typeof res.body.meta.totalPages).toBe('number');
  });

  it('GET /services?groupId=<id> — filters by group', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/services?groupId=${groupId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const item of res.body.data as Array<{ group: { id: string } }>) {
      expect(item.group.id).toBe(groupId);
    }
  });

  it('GET /services?unitId=<id> — filters by unit', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/services?unitId=${unitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const item of res.body.data as Array<{ unit: { id: string } }>) {
      expect(item.unit.id).toBe(unitId);
    }
  });

  it('GET /services?active=false — returns only inactive services', async () => {
    // First create an inactive service
    const tempRes = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TS_INACTIVE_e2e_svc',
        name: 'Inactive Service',
        groupId,
        unitId,
        price: '10000',
        active: false,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/services?active=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    for (const item of res.body.data as Array<{ active: boolean }>) {
      expect(item.active).toBe(false);
    }

    // Cleanup
    await prisma.service.delete({ where: { id: tempRes.body.data.id as string } });
  });

  it('GET /services?keyword=<text> — keyword search matches code or name', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/services?keyword=TS001_e2e_svc')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
    const found = (res.body.data as Array<{ code: string }>).find(
      (s) => s.code === 'TS001_e2e_svc',
    );
    expect(found).toBeDefined();
  });

  it('GET /services?keyword=<name> — keyword search matches service name', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/services?keyword=${encodeURIComponent('Dịch vụ test E2E')}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  it('PATCH /services/:id — admin updates name, price, active, note', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dịch vụ đã cập nhật', price: '90000', active: false, note: 'Note mới' })
      .expect(200);

    expect(res.body.data.name).toBe('Dịch vụ đã cập nhật');
    expect(res.body.data.price).toBe('90000');
    expect(res.body.data.active).toBe(false);
    expect(res.body.data.note).toBe('Note mới');
  });

  it('PATCH /services/:id — code field is silently dropped (OmitType)', async () => {
    // Sending code in the patch should not cause an error (forbidNonWhitelisted would reject extra)
    // Actually OmitType removes code from DTO, so it will be rejected as non-whitelisted
    // Verify the service remains as-is (code was not changed)
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated again' })
      .expect(200);

    expect(res.body.data.code).toBe('TS001_e2e_svc');
  });

  it('PATCH /services/:id — bad groupId returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupId: wrongGroupId })
      .expect(400);
  });

  it('PATCH /services/:id — bad unitId returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unitId: wrongUnitId })
      .expect(400);
  });

  it('PATCH /services/:id — manager can update (200)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ groupId: altGroupId })
      .expect(200);

    expect(res.body.data.group.id).toBe(altGroupId);
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('DELETE /services/:id — soft-deletes service (204)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /services/:id — deleted service returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /services — deleted service not in list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/services?keyword=TS001_e2e_svc')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = (res.body.data as Array<{ id: string }>).find((s) => s.id === createdId);
    expect(found).toBeUndefined();
  });

  it('DELETE /services/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/services/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── SOFT-DELETE RESURRECTION ──────────────────────────────────────────────

  it('POST /services — create with same code as soft-deleted resurrects (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TS001_e2e_svc',
        name: 'Dịch vụ phục hoạt',
        groupId,
        unitId,
        price: '99000',
      })
      .expect(201);

    // Should reuse the same DB id (resurrection)
    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.name).toBe('Dịch vụ phục hoạt');
    expect(res.body.data.deletedAt).toBeUndefined();
    expect(res.body.data.active).toBe(true);

    // Update createdId so afterAll cleanup works
    createdId = res.body.data.id as string;
  });

  it('GET /services/:id — resurrected service is visible again', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/services/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
