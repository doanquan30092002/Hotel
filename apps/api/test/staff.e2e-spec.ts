import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Staff (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;

  // Category IDs resolved at setup
  let positionHousekeeperId: string;
  let positionManagerId: string;
  let positionReceptionistId: string;
  let wrongGroupId: string; // ROOM_TYPE — to test wrong group

  // Created staff ID for sequential tests
  let createdStaffId: string;

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

    // Clean up e2e staff from previous runs
    await prisma.staff.deleteMany({ where: { code: { startsWith: 'NS_E2E' } } });

    // Helper to get category ID
    const getCatId = async (group: string, code: string) => {
      const cat = await prisma.category.findUniqueOrThrow({
        where: { group_code: { group, code } as never },
        select: { id: true },
      });
      return cat.id;
    };

    positionManagerId = await getCatId('STAFF_POSITION', 'manager');
    positionReceptionistId = await getCatId('STAFF_POSITION', 'receptionist');
    positionHousekeeperId = await getCatId('STAFF_POSITION', 'housekeeper');
    wrongGroupId = await getCatId('ROOM_TYPE', 'single');

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
        email: 'manager-staff-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Staff E2E',
        role: 'MANAGER',
      });
    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-staff-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create and login receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'recept-staff-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Staff E2E',
        role: 'RECEPTIONIST',
      });
    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recept-staff-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Clean up test fixtures
    await prisma.staff.deleteMany({ where: { code: { startsWith: 'NS_E2E' } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['manager-staff-e2e@hotel.local', 'recept-staff-e2e@hotel.local'],
        },
      },
    });
    await app.close();
  });

  // Helper: build a minimal valid create payload
  function buildCreatePayload(overrides: Record<string, unknown> = {}) {
    return {
      fullName: 'Test Staff Member',
      positionId: positionReceptionistId,
      phone: '0900099999',
      joinDate: '2026-01-01',
      baseSalary: 7000000,
      allowance: 500000,
      ...overrides,
    };
  }

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /staff — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/staff').expect(401);
  });

  it('POST /staff — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/staff').expect(401);
  });

  it('DELETE /staff/:id — no token returns 401', async () => {
    await request(app.getHttpServer()).delete('/api/v1/staff/some-id').expect(401);
  });

  // ── RBAC ────────────────────────────────────────────────────────────────────

  it('GET /staff — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/staff')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  it('POST /staff — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send(buildCreatePayload())
      .expect(403);
  });

  it('PATCH /staff/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/staff/some-id')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ fullName: 'Updated' })
      .expect(403);
  });

  it('DELETE /staff/:id — RECEPTIONIST returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/staff/some-id')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);
  });

  // ── GET LIST ─────────────────────────────────────────────────────────────────

  it('GET /staff — returns 6 seed staff', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
    expect(res.body.meta.page).toBe(1);
  });

  it('GET /staff — MANAGER can access list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/staff')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
  });

  // ── FILTER ────────────────────────────────────────────────────────────────────

  it('GET /staff?positionId=<receptionist> — returns only receptionist position staff', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/staff?positionId=${positionReceptionistId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(2); // NS002, NS006
    for (const s of res.body.data as { position: { id: string } }[]) {
      expect(s.position.id).toBe(positionReceptionistId);
    }
  });

  it('GET /staff?positionId=<manager> — returns manager position staff', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/staff?positionId=${positionManagerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1); // NS001 (after seed removed dept)
    for (const s of res.body.data as { position: { id: string } }[]) {
      expect(s.position.id).toBe(positionManagerId);
    }
  });

  it('GET /staff?active=true — returns only active staff', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/staff?active=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const s of res.body.data as { active: boolean }[]) {
      expect(s.active).toBe(true);
    }
  });

  it('GET /staff?active=false — returns only inactive staff', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/staff?active=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const s of res.body.data as { active: boolean }[]) {
      expect(s.active).toBe(false);
    }
  });

  it('GET /staff?keyword=NS001 — returns NS001', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/staff?keyword=NS001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    const found = (res.body.data as { code: string }[]).find((s) => s.code === 'NS001');
    expect(found).toBeDefined();
  });

  it(`GET /staff?keyword=Nguy%E1%BB%85n — returns staff with Nguyễn in name`, async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/staff?keyword=${encodeURIComponent('Nguyễn')}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  // ── GET DETAIL ────────────────────────────────────────────────────────────────

  it('GET /staff/:id — returns detail for NS001', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/staff?keyword=NS001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ns001 = (listRes.body.data as { code: string; id: string }[]).find(
      (s) => s.code === 'NS001',
    );
    expect(ns001).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/staff/${ns001!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.code).toBe('NS001');
    expect(res.body.data.fullName).toBe('Nguyễn Hiền An');
    expect(res.body.data.position).toBeDefined();
    expect(res.body.data.baseSalary).toBe('12000000');
    expect(res.body.data.allowance).toBe('1500000');
    expect(res.body.data.active).toBe(true);
  });

  it('GET /staff/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/staff/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── POST CREATE ───────────────────────────────────────────────────────────────

  it('POST /staff — creates staff with auto-generated code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ fullName: 'E2E New Staff' }))
      .expect(201);

    expect(res.body.data.code).toMatch(/^NS\d{3}$/);
    expect(res.body.data.fullName).toBe('E2E New Staff');
    expect(res.body.data.position).toBeDefined();
    expect(res.body.data.joinDate).toBe('2026-01-01');
    expect(res.body.data.baseSalary).toBe('7000000');
    expect(res.body.data.allowance).toBe('500000');
    expect(res.body.data.active).toBe(true);

    createdStaffId = res.body.data.id as string;
  });

  it('POST /staff — MANAGER can create staff', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(buildCreatePayload({ fullName: 'E2E Manager Created Staff' }))
      .expect(201);

    expect(res.body.data.code).toMatch(/^NS\d{3}$/);

    // Clean up
    await prisma.staff.delete({ where: { id: res.body.data.id as string } });
  });

  // ── POST VALIDATION ───────────────────────────────────────────────────────────

  it('POST /staff — missing fullName returns 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fullName: _fn, ...rest } = buildCreatePayload();
    await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(rest)
      .expect(400);
  });

  it('POST /staff — invalid joinDate returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ joinDate: 'not-a-date' }))
      .expect(400);
  });

  it('POST /staff — negative baseSalary returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ baseSalary: -100 }))
      .expect(400);
  });

  it('POST /staff — positionId must be STAFF_POSITION group returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildCreatePayload({ positionId: wrongGroupId }))
      .expect(400);
  });

  // ── PATCH UPDATE ──────────────────────────────────────────────────────────────

  it('PATCH /staff/:id — updates fullName and shiftType', async () => {
    expect(createdStaffId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/staff/${createdStaffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Updated E2E Staff',
        shiftType: 'night',
      })
      .expect(200);

    expect(res.body.data.fullName).toBe('Updated E2E Staff');
    expect(res.body.data.shiftType).toBe('night');
  });

  it('PATCH /staff/:id — can update positionId to housekeeper', async () => {
    expect(createdStaffId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/staff/${createdStaffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ positionId: positionHousekeeperId })
      .expect(200);

    expect(res.body.data.position.id).toBe(positionHousekeeperId);
  });

  it('PATCH /staff/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/staff/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'does not matter' })
      .expect(404);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────────

  it('DELETE /staff/:id — soft deletes and returns 204', async () => {
    expect(createdStaffId).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/v1/staff/${createdStaffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /staff/:id — after soft delete returns 404', async () => {
    expect(createdStaffId).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/v1/staff/${createdStaffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /staff/:id — non-existent returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/staff/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── PAGINATION ────────────────────────────────────────────────────────────────

  it('GET /staff?page=1&pageSize=3 — returns 3 items with correct meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/staff?page=1&pageSize=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(3);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
  });
});
