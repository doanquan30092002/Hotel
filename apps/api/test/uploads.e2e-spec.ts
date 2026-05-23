import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Uploads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;

  // Created upload ID for sequential tests
  let createdUploadId: string;

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

    // Clean up e2e uploads from previous runs
    await prisma.upload.deleteMany({ where: { code: { startsWith: 'TU_E2E' } } });

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hotel.local', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken as string;

    // Create and login manager
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'manager-uploads-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Uploads E2E',
        role: 'MANAGER',
      });
    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-uploads-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create and login receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'recept-uploads-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Uploads E2E',
        role: 'RECEPTIONIST',
      });
    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recept-uploads-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;

    // Create and login housekeeping
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'hk-uploads-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Uploads E2E',
        role: 'HOUSEKEEPING',
      });
    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hk-uploads-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    await prisma.upload.deleteMany({ where: { code: { startsWith: 'TU_E2E' } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-uploads-e2e@hotel.local',
            'recept-uploads-e2e@hotel.local',
            'hk-uploads-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  function buildCreatePayload(overrides: Record<string, unknown> = {}) {
    return {
      kind: 'ROOM_IMAGE',
      entityType: 'room',
      entityId: 'room-001',
      fileName: 'test-room.png',
      fileSize: 204800,
      mimeType: 'image/png',
      url: '/uploads/rooms/test-room.png',
      fileId: 'upload_test_abc12345',
      note: 'E2E test upload',
      ...overrides,
    };
  }

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /uploads — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/uploads').expect(401);
  });

  it('POST /uploads — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/uploads').expect(401);
  });

  it('DELETE /uploads/:id — no token returns 401', async () => {
    await request(app.getHttpServer()).delete('/api/v1/uploads/some-id').expect(401);
  });

  // ── GET LIST ────────────────────────────────────────────────────────────────

  it('GET /uploads — returns seed 10 uploads', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    expect(res.body.meta).toMatchObject({
      page: 1,
      pageSize: 20,
    });
    // Verify shape of first item
    const item: Record<string, unknown> = res.body.data[0] as Record<string, unknown>;
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('code');
    expect(item).toHaveProperty('kind');
    expect(item).toHaveProperty('fileName');
    expect(item).toHaveProperty('url');
    expect(item).toHaveProperty('mimeType');
    expect(item).toHaveProperty('fileSize');
  });

  it('GET /uploads?kind=ROOM_IMAGE — returns 10 room images', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads?kind=ROOM_IMAGE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(10);
    const items = res.body.data as Array<Record<string, unknown>>;
    for (const item of items) {
      expect(item['kind']).toBe('ROOM_IMAGE');
    }
  });

  it('GET /uploads?entityType=room — returns room-type uploads', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads?entityType=room')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    const items = res.body.data as Array<Record<string, unknown>>;
    for (const item of items) {
      expect(item['entityType']).toBe('room');
    }
  });

  it('GET /uploads?entityId=<id> — returns subset for that entity', async () => {
    // Resolve entityId of TU001 from DB
    const tu001 = await prisma.upload.findUniqueOrThrow({
      where: { code: 'TU001' },
      select: { entityId: true },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/uploads?entityId=${tu001.entityId ?? ''}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    const items = res.body.data as Array<Record<string, unknown>>;
    for (const item of items) {
      expect(item['entityId']).toBe(tu001.entityId);
    }
  });

  it('GET /uploads?keyword=P101 — keyword search on fileName', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads?keyword=P101')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    const items = res.body.data as Array<Record<string, unknown>>;
    // Should match fileName containing P101
    const hasP101 = items.some(
      (i) => typeof i['fileName'] === 'string' && (i['fileName'] as string).includes('P101'),
    );
    expect(hasP101).toBe(true);
  });

  it('GET /uploads?keyword=TU001 — keyword search on code', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads?keyword=TU001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /uploads — pagination works (pageSize=3)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads?page=1&pageSize=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.pageSize).toBe(3);
  });

  // ── GET STATS ───────────────────────────────────────────────────────────────

  it('GET /uploads/stats — returns byKind with all 4 kinds', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('byKind');
    expect(res.body.data.byKind).toHaveProperty('ROOM_IMAGE');
    expect(res.body.data.byKind).toHaveProperty('GUEST_DOC');
    expect(res.body.data.byKind).toHaveProperty('STAFF_AVATAR');
    expect(res.body.data.byKind).toHaveProperty('OTHER');
    // ROOM_IMAGE should be >= 10 from seed
    expect(res.body.data.byKind.ROOM_IMAGE).toBeGreaterThanOrEqual(10);
    expect(res.body.data.total).toBeGreaterThanOrEqual(10);
  });

  it('GET /uploads/stats — HOUSEKEEPING can view stats', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/uploads/stats')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  // ── GET DETAIL ──────────────────────────────────────────────────────────────

  it('GET /uploads/TU001-id — returns detail of seeded upload', async () => {
    const tu001 = await prisma.upload.findUniqueOrThrow({
      where: { code: 'TU001' },
      select: { id: true },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/uploads/${tu001.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.code).toBe('TU001');
    expect(res.body.data.kind).toBe('ROOM_IMAGE');
    expect(res.body.data.entityType).toBe('room');
    expect(res.body.data.uploadedBy).not.toBeNull();
    expect(res.body.data.uploadedBy).toHaveProperty('fullName');
  });

  it('GET /uploads/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/uploads/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── POST CREATE ─────────────────────────────────────────────────────────────

  it('POST /uploads — ADMIN creates upload (auto-code TU011+)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload())
      .expect(201);

    expect(res.body.data.code).toMatch(/^TU\d{3}$/);
    expect(res.body.data.kind).toBe('ROOM_IMAGE');
    expect(res.body.data.fileName).toBe('test-room.png');
    expect(res.body.data.url).toBe('/uploads/rooms/test-room.png');
    expect(res.body.data.fileSize).toBe(204800);
    expect(res.body.data.mimeType).toBe('image/png');
    expect(res.body.data.uploadedBy).not.toBeNull();

    createdUploadId = res.body.data.id as string;

    // Override code for cleanup
    await prisma.upload.update({ where: { id: createdUploadId }, data: { code: 'TU_E2E001' } });
  });

  it('POST /uploads — RECEPTIONIST can create', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send(buildCreatePayload({ fileName: 'recept-upload.jpg', url: '/uploads/recept.jpg' }))
      .expect(201);

    expect(res.body.data.kind).toBe('ROOM_IMAGE');
    // Cleanup
    await prisma.upload.update({
      where: { id: res.body.data.id as string },
      data: { code: 'TU_E2E_R', deletedAt: new Date() },
    });
  });

  it('POST /uploads — missing fileName returns 400', async () => {
    const payload = buildCreatePayload();
    delete (payload as Record<string, unknown>)['fileName'];
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(400);
  });

  it('POST /uploads — missing url returns 400', async () => {
    const payload = buildCreatePayload();
    delete (payload as Record<string, unknown>)['url'];
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(400);
  });

  it('POST /uploads — invalid kind returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ kind: 'INVALID_KIND' }))
      .expect(400);
  });

  it('POST /uploads — HOUSEKEEPING cannot create (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send(buildCreatePayload())
      .expect(403);
  });

  // ── PATCH UPDATE ────────────────────────────────────────────────────────────

  it('PATCH /uploads/:id — ADMIN can update note', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/uploads/${createdUploadId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Updated via e2e test' })
      .expect(200);

    expect(res.body.data.note).toBe('Updated via e2e test');
    expect(res.body.data.id).toBe(createdUploadId);
  });

  it('PATCH /uploads/:id — MANAGER can update metadata', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/uploads/${createdUploadId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ fileName: 'updated-name.png', note: 'Manager updated' })
      .expect(200);

    expect(res.body.data.fileName).toBe('updated-name.png');
  });

  it('PATCH /uploads/:id — RECEPTIONIST cannot update (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/uploads/${createdUploadId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ note: 'Should be blocked' })
      .expect(403);
  });

  it('PATCH /uploads/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/uploads/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'test' })
      .expect(404);
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('DELETE /uploads/:id — HOUSEKEEPING cannot delete (403)', async () => {
    const tu001 = await prisma.upload.findUniqueOrThrow({
      where: { code: 'TU001' },
      select: { id: true },
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/uploads/${tu001.id}`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  it('DELETE /uploads/:id — ADMIN soft-deletes successfully', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/uploads/${createdUploadId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /uploads/:id — returns 404 after soft-delete', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/uploads/${createdUploadId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /uploads/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/uploads/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── HOUSEKEEPING can read ───────────────────────────────────────────────────

  it('GET /uploads — HOUSEKEEPING can list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/uploads')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  it('GET /uploads — soft-deleted items not in list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const items = res.body.data as Array<Record<string, unknown>>;
    const found = items.find((i) => i['id'] === createdUploadId);
    expect(found).toBeUndefined();
  });

  it('GET /uploads?kind=OTHER — returns 0 (no seed data for OTHER)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/uploads?kind=OTHER')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });
});
