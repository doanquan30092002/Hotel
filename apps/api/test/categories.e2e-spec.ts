import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let receptionistToken: string;
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

    // Hard-clean any leftover e2e categories from previous runs.
    await prisma.category.deleteMany({ where: { code: { endsWith: '_e2e' } } });

    // Obtain admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Create a receptionist for RBAC tests
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'receptionist-cat@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Cat',
        role: 'RECEPTIONIST',
      });

    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist-cat@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Hard-clean e2e fixtures (test isolation).
    await prisma.category.deleteMany({ where: { code: { endsWith: '_e2e' } } });
    await prisma.user.deleteMany({ where: { email: 'receptionist-cat@hotel.local' } });
    await app.close();
  });

  // ── CREATE ────────────────────────────────────────────────────────────────

  it('POST /categories — admin can create', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ group: 'ROOM_TYPE', code: 'suite_e2e', name: 'Phòng suite (e2e)', sortOrder: 99 })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.group).toBe('ROOM_TYPE');
    expect(res.body.data.code).toBe('suite_e2e');
    expect(res.body.data.deletedAt).toBeUndefined();
    createdId = res.body.data.id as string;
  });

  it('POST /categories — duplicate code+group returns 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ group: 'ROOM_TYPE', code: 'suite_e2e', name: 'Duplicate' })
      .expect(409);
  });

  it('POST /categories — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ group: 'ROOM_TYPE', code: 'should_fail', name: 'Should Fail' })
      .expect(403);
  });

  it('POST /categories — invalid group returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ group: 'INVALID_GROUP', code: 'x', name: 'X' })
      .expect(400);
  });

  it('POST /categories — code with special chars returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ group: 'ROOM_TYPE', code: 'bad code!', name: 'Bad' })
      .expect(400);
  });

  // ── LIST ──────────────────────────────────────────────────────────────────

  it('GET /categories — returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1 });
  });

  it('GET /categories?group=ROOM_TYPE — filters by group', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?group=ROOM_TYPE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const item of res.body.data as Array<{ group: string }>) {
      expect(item.group).toBe('ROOM_TYPE');
    }
  });

  it('GET /categories?keyword=suite — keyword filter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?keyword=suite')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('GET /categories?active=true — active filter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?active=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const item of res.body.data as Array<{ active: boolean }>) {
      expect(item.active).toBe(true);
    }
  });

  it('GET /categories — RECEPTIONIST can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);
  });

  it('GET /categories — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/categories').expect(401);
  });

  // ── GROUP COUNTS ──────────────────────────────────────────────────────────

  it('GET /categories/group-counts — returns all groups', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories/group-counts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    const groups = (res.body.data as Array<{ group: string; total: number; active: number }>).map(
      (g) => g.group,
    );
    expect(groups).toContain('ROOM_TYPE');
    expect(groups).toContain('BOOKING_STATUS');
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────

  it('GET /categories/:id — returns single item', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.deletedAt).toBeUndefined();
  });

  it('GET /categories/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/categories/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────

  it('PATCH /categories/:id — updates name', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Phòng suite (updated)' })
      .expect(200);

    expect(res.body.data.name).toBe('Phòng suite (updated)');
  });

  it('PATCH /categories/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${createdId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  // ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────

  it('PATCH /categories/:id/toggle-active — toggles active flag', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/v1/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const wasActive = before.body.data.active as boolean;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/categories/${createdId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.active).toBe(!wasActive);
  });

  // ── REORDER ───────────────────────────────────────────────────────────────

  it('PUT /categories/reorder — reorders items in group', async () => {
    // Get all ROOM_TYPE ids
    const list = await request(app.getHttpServer())
      .get('/api/v1/categories?group=ROOM_TYPE&pageSize=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ids = (list.body.data as Array<{ id: string }>).map((c) => c.id).reverse();

    const res = await request(app.getHttpServer())
      .put('/api/v1/categories/reorder')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ group: 'ROOM_TYPE', orderedIds: ids })
      .expect(200);

    expect(res.body.data.affected).toBe(ids.length);
  });

  it('PUT /categories/reorder — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/categories/reorder')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ group: 'ROOM_TYPE', orderedIds: ['some-id'] })
      .expect(403);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  it('DELETE /categories/:id — soft-deletes item (204)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /categories/:id — deleted item returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /categories/:id — RECEPTIONIST returns 403', async () => {
    // Re-create a row to test delete RBAC
    const created = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ group: 'UNIT', code: 'e2e_rbac_unit', name: 'Test unit rbac' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${created.body.data.id as string}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);

    // Cleanup
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${created.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });
});
