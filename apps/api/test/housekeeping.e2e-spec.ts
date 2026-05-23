import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Housekeeping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let housekeepingToken: string;
  let receptionistToken: string;

  // Category IDs resolved at setup
  let statusWaitingId: string;
  let statusInProgressId: string;
  let statusDoneId: string;
  let wrongGroupId: string; // ROOM_TYPE — to test bad group

  // Room IDs
  let roomP101Id: string;

  // Admin user ID for assignee tests
  let adminUserId: string;

  // Housekeeping user ID
  let hkUserId: string;

  // Task ID for sequential tests
  let createdTaskId: string;

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

    // Clean up e2e tasks from previous runs
    await prisma.housekeepingTask.deleteMany({ where: { code: { startsWith: 'TEST_' } } });

    // Resolve category IDs
    const getCatId = async (group: string, code: string) => {
      const cat = await prisma.category.findUniqueOrThrow({
        where: { group_code: { group, code } as never },
        select: { id: true },
      });
      return cat.id;
    };

    statusWaitingId = await getCatId('HOUSEKEEPING_TASK_STATUS', 'waiting');
    statusInProgressId = await getCatId('HOUSEKEEPING_TASK_STATUS', 'in_progress');
    statusDoneId = await getCatId('HOUSEKEEPING_TASK_STATUS', 'done');
    wrongGroupId = await getCatId('ROOM_TYPE', 'single');

    // Resolve room IDs
    const rP101 = await prisma.room.findUniqueOrThrow({
      where: { code: 'P101' },
      select: { id: true },
    });
    roomP101Id = rP101.id;

    // Obtain admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Resolve admin user ID
    const adminUser = await prisma.user.findFirstOrThrow({
      where: { email: 'admin@hotel.local', deletedAt: null },
      select: { id: true },
    });
    adminUserId = adminUser.id;

    // Create and login housekeeping user
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'hk-hke2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping HK E2E',
        role: 'HOUSEKEEPING',
      });
    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hk-hke2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
    const hkUserDb = await prisma.user.findFirstOrThrow({
      where: { email: 'hk-hke2e@hotel.local', deletedAt: null },
      select: { id: true },
    });
    hkUserId = hkUserDb.id;

    // Create and login receptionist user
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'recept-hke2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist HK E2E',
        role: 'RECEPTIONIST',
      });
    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recept-hke2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Clean up test fixtures
    await prisma.housekeepingTask.deleteMany({ where: { code: { startsWith: 'TEST_' } } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['hk-hke2e@hotel.local', 'recept-hke2e@hotel.local'] },
      },
    });
    await app.close();
  });

  // Helper: build a minimal valid create payload
  function buildCreatePayload(overrides: Record<string, unknown> = {}) {
    return {
      roomId: roomP101Id,
      statusId: statusWaitingId,
      description: 'Test cleaning task',
      scheduledAt: '2026-06-01',
      ...overrides,
    };
  }

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /housekeeping — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/housekeeping').expect(401);
  });

  it('POST /housekeeping — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/housekeeping').expect(401);
  });

  it('DELETE /housekeeping/:id — no token returns 401', async () => {
    await request(app.getHttpServer()).delete('/api/v1/housekeeping/some-id').expect(401);
  });

  // ── RBAC ────────────────────────────────────────────────────────────────────

  it('DELETE /housekeeping/:id — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/housekeeping/some-id')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  it('DELETE /housekeeping/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/housekeeping/some-id')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  it('PATCH /housekeeping/:id/assign — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/housekeeping/some-id/assign')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ assigneeId: adminUserId })
      .expect(403);
  });

  it('PATCH /housekeeping/:id/assign — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/housekeeping/some-id/assign')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ assigneeId: adminUserId })
      .expect(403);
  });

  // ── GET LIST ────────────────────────────────────────────────────────────────

  it('GET /housekeeping — returns paginated list with seed data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
  });

  it('GET /housekeeping — HOUSEKEEPING can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  it('GET /housekeeping?roomId=<P101Id> — filter by roomId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/housekeeping?roomId=${roomP101Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data as Array<{ room: { id: string } }>) {
      expect(t.room.id).toBe(roomP101Id);
    }
  });

  it('GET /housekeeping?statusId=<waitingId> — filter by statusId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/housekeeping?statusId=${statusWaitingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data as Array<{ status: { id: string } }>) {
      expect(t.status.id).toBe(statusWaitingId);
    }
  });

  it('GET /housekeeping?assigneeId=<adminId> — filter by assigneeId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/housekeeping?assigneeId=${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // DP002 is assigned to admin
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data as Array<{ assignee: { id: string } | null }>) {
      expect(t.assignee?.id).toBe(adminUserId);
    }
  });

  it('GET /housekeeping?priority=high — filter by priority', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/housekeeping?priority=high')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(2); // DP001, DP005
    for (const t of res.body.data as Array<{ priority: string }>) {
      expect(t.priority).toBe('high');
    }
  });

  it('GET /housekeeping?from=2026-05-22&to=2026-05-23 — filter by scheduledAt range', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/housekeeping?from=2026-05-22&to=2026-05-23')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(2); // DP001 (22), DP002 (23), DP003 (22)
  });

  it('GET /housekeeping?keyword=DP001 — keyword search by code', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/housekeeping?keyword=DP001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = (res.body.data as Array<{ code: string }>).find((t) => t.code === 'DP001');
    expect(found).toBeDefined();
  });

  it('GET /housekeeping?keyword=Dọn — keyword search by description', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/housekeeping?keyword=${encodeURIComponent('Dọn')}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  // ── GET DETAIL ──────────────────────────────────────────────────────────────

  it('GET /housekeeping/:id — detail returns correct shape', async () => {
    const dp001 = await prisma.housekeepingTask.findUniqueOrThrow({ where: { code: 'DP001' } });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/housekeeping/${dp001.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.code).toBe('DP001');
    expect(res.body.data.room).toMatchObject({ code: 'P101' });
    expect(res.body.data.priority).toBe('high');
    expect(res.body.data.scheduledAt).toBe('2026-05-22');
    // booking ref should be present (linked to BK001)
    expect(res.body.data.booking).not.toBeNull();
  });

  it('GET /housekeeping/:id — 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/housekeeping/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── POST CREATE ─────────────────────────────────────────────────────────────

  it('POST /housekeeping — creates task, returns 201 with code DP###', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload())
      .expect(201);

    expect(res.body.data.code).toMatch(/^DP\d{3}$/);
    expect(res.body.data.priority).toBe('normal');
    expect(res.body.data.room.id).toBe(roomP101Id);
    createdTaskId = res.body.data.id as string;
  });

  it('POST /housekeeping — creates task with all optional fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildCreatePayload({
          assigneeId: adminUserId,
          priority: 'high',
          startTime: '09:00',
          endTime: '11:00',
          note: 'Test note',
          scheduledAt: '2026-06-02',
        }),
      )
      .expect(201);

    expect(res.body.data.assignee).toMatchObject({ id: adminUserId });
    expect(res.body.data.priority).toBe('high');
    expect(res.body.data.startTime).toBe('09:00');
    expect(res.body.data.endTime).toBe('11:00');
    expect(res.body.data.note).toBe('Test note');
  });

  it('POST /housekeeping — HOUSEKEEPING role can create', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send(buildCreatePayload({ scheduledAt: '2026-06-10' }))
      .expect(201);
  });

  it('POST /housekeeping — missing roomId returns 400', async () => {
    const payload = buildCreatePayload();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { roomId: _roomId, ...withoutRoom } = payload;
    await request(app.getHttpServer())
      .post('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(withoutRoom)
      .expect(400);
  });

  it('POST /housekeeping — wrong statusId group returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ statusId: wrongGroupId }))
      .expect(400);
  });

  it('POST /housekeeping — invalid scheduledAt returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ scheduledAt: 'not-a-date' }))
      .expect(400);
  });

  it('POST /housekeeping — nonexistent roomId returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/housekeeping')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ roomId: 'nonexistent-room-id' }))
      .expect(400);
  });

  // ── PATCH UPDATE ─────────────────────────────────────────────────────────────

  it('PATCH /housekeeping/:id — updates description', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated description' })
      .expect(200);

    expect(res.body.data.description).toBe('Updated description');
  });

  it('PATCH /housekeeping/:id — updates scheduledAt and priority', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scheduledAt: '2026-07-01', priority: 'low' })
      .expect(200);

    expect(res.body.data.scheduledAt).toBe('2026-07-01');
    expect(res.body.data.priority).toBe('low');
  });

  it('PATCH /housekeeping/:id — HOUSEKEEPING role can update', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ description: 'HK updated' })
      .expect(200);
  });

  it('PATCH /housekeeping/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ description: 'Recept update attempt' })
      .expect(403);
  });

  it('PATCH /housekeeping/:id — 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/housekeeping/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'x' })
      .expect(404);
  });

  // ── PATCH STATUS ─────────────────────────────────────────────────────────────

  it('PATCH /housekeeping/:id/status — flips status to in_progress', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusInProgressId })
      .expect(200);

    expect(res.body.data.status.id).toBe(statusInProgressId);
    expect(res.body.data.completedAt).toBeNull();
  });

  it('PATCH /housekeeping/:id/status — flipping to done auto-sets completedAt', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusDoneId })
      .expect(200);

    expect(res.body.data.status.id).toBe(statusDoneId);
    expect(res.body.data.completedAt).not.toBeNull();
    // completedAt should be a valid ISO string
    expect(new Date(res.body.data.completedAt as string).getFullYear()).toBe(2026);
  });

  it('PATCH /housekeeping/:id/status — wrong statusId group returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: wrongGroupId })
      .expect(400);
  });

  it('PATCH /housekeeping/:id/status — HOUSEKEEPING can change status', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ statusId: statusInProgressId })
      .expect(200);
  });

  it('PATCH /housekeeping/:id/status — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ statusId: statusInProgressId })
      .expect(403);
  });

  // ── PATCH ASSIGN ─────────────────────────────────────────────────────────────

  it('PATCH /housekeeping/:id/assign — sets assigneeId', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigneeId: hkUserId })
      .expect(200);

    expect(res.body.data.assignee).toMatchObject({ id: hkUserId });
  });

  it('PATCH /housekeeping/:id/assign — null unassigns', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigneeId: null })
      .expect(200);

    expect(res.body.data.assignee).toBeNull();
  });

  it('PATCH /housekeeping/:id/assign — nonexistent assigneeId returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/${createdTaskId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigneeId: 'nonexistent-user-id' })
      .expect(400);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────────

  it('DELETE /housekeeping/:id — soft deletes task (204)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/housekeeping/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /housekeeping/:id — 404 after soft delete', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/housekeeping/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /housekeeping/:id — 404 for already deleted task', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/housekeeping/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
