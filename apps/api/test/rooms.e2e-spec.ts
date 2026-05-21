import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rooms (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;
  let createdId: string;

  // Category IDs resolved once at setup
  let typeId: string; // ROOM_TYPE
  let areaId: string; // ROOM_AREA
  let statusId: string; // ROOM_STATUS
  let cleaningStatusId: string; // CLEANING_STATUS
  let altStatusId: string; // different ROOM_STATUS for flip test
  let altCleaningId: string; // different CLEANING_STATUS for flip test

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

    // Hard-clean any leftover e2e rooms from previous runs.
    await prisma.room.deleteMany({ where: { code: { endsWith: '_e2e' } } });

    // Resolve category IDs by (group, code) — seeded in seedCategories().
    const roomType = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_TYPE', code: 'single' } },
    });
    const roomArea = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_AREA', code: 'f1' } },
    });
    const roomStatus = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_STATUS', code: 'ready' } },
    });
    const cleaningSt = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'CLEANING_STATUS', code: 'clean' } },
    });
    const altRoomStatus = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_STATUS', code: 'occupied' } },
    });
    const altCleaning = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'CLEANING_STATUS', code: 'dirty' } },
    });

    typeId = roomType.id;
    areaId = roomArea.id;
    statusId = roomStatus.id;
    cleaningStatusId = cleaningSt.id;
    altStatusId = altRoomStatus.id;
    altCleaningId = altCleaning.id;

    // Obtain admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Create a manager for RBAC tests
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'manager-rooms-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Rooms E2E',
        role: 'MANAGER',
      });

    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-rooms-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create a receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'receptionist-rooms-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Rooms E2E',
        role: 'RECEPTIONIST',
      });

    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist-rooms-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;

    // Create a housekeeping user
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'housekeeping-rooms-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Rooms E2E',
        role: 'HOUSEKEEPING',
      });

    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'housekeeping-rooms-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Hard-clean e2e fixtures.
    await prisma.room.deleteMany({ where: { code: { endsWith: '_e2e' } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-rooms-e2e@hotel.local',
            'receptionist-rooms-e2e@hotel.local',
            'housekeeping-rooms-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /rooms — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/rooms').expect(401);
  });

  it('POST /rooms — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/rooms').expect(401);
  });

  // ── RBAC — RECEPTIONIST cannot POST/DELETE ───────────────────────────────────

  it('POST /rooms — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        code: 'RBAC_e2e',
        name: 'Should Fail',
        typeId,
        statusId,
        cleaningStatusId,
        basePrice: 500000,
      })
      .expect(403);
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  it('POST /rooms — admin can create room', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'T101_e2e',
        name: 'Phòng Test 101',
        typeId,
        areaId,
        capacity: 2,
        basePrice: 850000,
        weekendPrice: 950000,
        holidayPrice: 1150000,
        statusId,
        cleaningStatusId,
        defaultCheckIn: '14:00',
        defaultCheckOut: '12:00',
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe('T101_e2e');
    expect(res.body.data.basePrice).toBe('850000');
    expect(res.body.data.type).toMatchObject({ id: typeId });
    expect(res.body.data.area).toMatchObject({ id: areaId });
    expect(res.body.data.status).toMatchObject({ id: statusId });
    expect(res.body.data.cleaningStatus).toMatchObject({ id: cleaningStatusId });
    expect(res.body.data.deletedAt).toBeUndefined();
    createdId = res.body.data.id as string;
  });

  it('POST /rooms — manager can create room', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        code: 'T102_e2e',
        name: 'Phòng Test 102',
        typeId,
        statusId,
        cleaningStatusId,
        basePrice: 900000,
      })
      .expect(201);

    expect(res.body.data.code).toBe('T102_e2e');

    // cleanup immediately
    await prisma.room.delete({ where: { id: res.body.data.id as string } });
  });

  // ── VALIDATION ───────────────────────────────────────────────────────────────

  it('POST /rooms — duplicate code returns 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'T101_e2e',
        name: 'Duplicate',
        typeId,
        statusId,
        cleaningStatusId,
        basePrice: 500000,
      })
      .expect(409);
  });

  it('POST /rooms — wrong typeId group returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'BAD_e2e',
        name: 'Bad Room',
        typeId: statusId, // wrong group: passing a ROOM_STATUS id as typeId
        statusId,
        cleaningStatusId,
        basePrice: 500000,
      })
      .expect(400);
  });

  it('POST /rooms — missing required fields returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'NOFIELDS_e2e',
        name: 'No Fields',
        // missing typeId, statusId, cleaningStatusId, basePrice
      })
      .expect(400);
  });

  // ── LIST ────────────────────────────────────────────────────────────────────

  it('GET /rooms — returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1 });
  });

  it('GET /rooms — RECEPTIONIST can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rooms')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);
  });

  it('GET /rooms — HOUSEKEEPING can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rooms')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  it('GET /rooms?typeId=<id> — filter by typeId returns only matching rooms', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/rooms?typeId=${typeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const item of res.body.data as Array<{ type: { id: string } }>) {
      expect(item.type.id).toBe(typeId);
    }
  });

  it('GET /rooms?keyword=Test 101 — keyword filter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rooms?keyword=Test 101')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('GET /rooms?statusId=<id> — filter by statusId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/rooms?statusId=${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const item of res.body.data as Array<{ status: { id: string } }>) {
      expect(item.status.id).toBe(statusId);
    }
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────

  it('GET /rooms/:id — returns single room', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.type.id).toBe(typeId);
    expect(res.body.data.deletedAt).toBeUndefined();
  });

  it('GET /rooms/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rooms/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  it('PATCH /rooms/:id — admin updates name', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Phòng Test 101 (updated)' })
      .expect(200);

    expect(res.body.data.name).toBe('Phòng Test 101 (updated)');
  });

  it('PATCH /rooms/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  it('PATCH /rooms/:id — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  // ── CHANGE STATUS ──────────────────────────────────────────────────────────

  it('PATCH /rooms/:id/status — RECEPTIONIST can change status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}/status`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ statusId: altStatusId })
      .expect(200);

    expect(res.body.data.status.id).toBe(altStatusId);
  });

  it('PATCH /rooms/:id/status — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}/status`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ statusId: altStatusId })
      .expect(403);
  });

  it('PATCH /rooms/:id/status — wrong group returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: cleaningStatusId }) // CLEANING_STATUS id, not ROOM_STATUS
      .expect(400);
  });

  // ── CHANGE CLEANING ────────────────────────────────────────────────────────

  it('PATCH /rooms/:id/cleaning — HOUSEKEEPING can change cleaning status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}/cleaning`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ cleaningStatusId: altCleaningId })
      .expect(200);

    expect(res.body.data.cleaningStatus.id).toBe(altCleaningId);
  });

  it('PATCH /rooms/:id/cleaning — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}/cleaning`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ cleaningStatusId: altCleaningId })
      .expect(403);
  });

  it('PATCH /rooms/:id/cleaning — wrong group returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${createdId}/cleaning`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cleaningStatusId: statusId }) // ROOM_STATUS id, not CLEANING_STATUS
      .expect(400);
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('DELETE /rooms/:id — RECEPTIONIST returns 403', async () => {
    const temp = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'DEL_RBAC_e2e',
        name: 'Delete RBAC Test',
        typeId,
        statusId,
        cleaningStatusId,
        basePrice: 500000,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/rooms/${temp.body.data.id as string}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);

    // Cleanup
    await request(app.getHttpServer())
      .delete(`/api/v1/rooms/${temp.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('DELETE /rooms/:id — soft-deletes room (204)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/rooms/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /rooms/:id — deleted room returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/rooms/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /rooms/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/rooms/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
