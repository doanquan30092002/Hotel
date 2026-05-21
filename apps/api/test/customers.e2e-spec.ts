import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let receptionistToken: string;
  let housekeepingToken: string;
  let createdId: string;

  // Category IDs resolved at setup
  let sourceId: string; // GUEST_SOURCE — individual
  let altSourceId: string; // GUEST_SOURCE — group
  let wrongGroupId: string; // ROOM_TYPE — to test bad sourceId

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

    // Hard-clean any leftover e2e customers from previous runs.
    await prisma.customer.deleteMany({ where: { code: { endsWith: '_e2e' } } });

    // Resolve category IDs by (group, code) — seeded in seedCategories().
    const guestIndividual = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'GUEST_SOURCE', code: 'individual' } },
    });
    const guestGroup = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'GUEST_SOURCE', code: 'group' } },
    });
    const roomType = await prisma.category.findUniqueOrThrow({
      where: { group_code: { group: 'ROOM_TYPE', code: 'single' } },
    });

    sourceId = guestIndividual.id;
    altSourceId = guestGroup.id;
    wrongGroupId = roomType.id;

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
        email: 'manager-cust-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Manager Customers E2E',
        role: 'MANAGER',
      });

    const managerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager-cust-e2e@hotel.local', password: 'Test1234!' });
    managerToken = managerLogin.body.data.accessToken as string;

    // Create receptionist
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'receptionist-cust-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Receptionist Customers E2E',
        role: 'RECEPTIONIST',
      });

    const receptLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist-cust-e2e@hotel.local', password: 'Test1234!' });
    receptionistToken = receptLogin.body.data.accessToken as string;

    // Create housekeeping user
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'housekeeping-cust-e2e@hotel.local',
        password: 'Test1234!',
        fullName: 'Housekeeping Customers E2E',
        role: 'HOUSEKEEPING',
      });

    const hkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'housekeeping-cust-e2e@hotel.local', password: 'Test1234!' });
    housekeepingToken = hkLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Hard-clean e2e fixtures.
    await prisma.customer.deleteMany({ where: { code: { endsWith: '_e2e' } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'manager-cust-e2e@hotel.local',
            'receptionist-cust-e2e@hotel.local',
            'housekeeping-cust-e2e@hotel.local',
          ],
        },
      },
    });
    await app.close();
  });

  // ── UNAUTHENTICATED ─────────────────────────────────────────────────────────

  it('GET /customers — no token returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/customers').expect(401);
  });

  it('POST /customers — no token returns 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/customers').expect(401);
  });

  // ── RBAC — HOUSEKEEPING cannot POST/PATCH/DELETE ─────────────────────────────

  it('POST /customers — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({
        code: 'RBAC_e2e',
        fullName: 'Should Fail',
        phone: '0911000000',
      })
      .expect(403);
  });

  it('PATCH /customers/:id — HOUSEKEEPING returns 403 (will use placeholder id)', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/customers/some-id')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ fullName: 'Should Fail' })
      .expect(403);
  });

  it('DELETE /customers/:id — HOUSEKEEPING returns 403', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/customers/some-id')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(403);
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  it('POST /customers — admin can create customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC001_e2e',
        fullName: 'Nguyễn Test Anh',
        phone: '0901112222',
        idNumber: '079201001234',
        email: 'test001@example.com',
        address: 'Hà Nội',
        nationality: 'Việt Nam',
        sourceId,
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe('TC001_e2e');
    expect(res.body.data.fullName).toBe('Nguyễn Test Anh');
    expect(res.body.data.source).toMatchObject({ id: sourceId });
    expect(res.body.data.deletedAt).toBeUndefined();
    createdId = res.body.data.id as string;
  });

  it('POST /customers — manager can create customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        code: 'TC002_e2e',
        fullName: 'Trần Test Yến',
        phone: '0902223333',
        idNumber: '079201005678',
        email: 'test002@example.com',
      })
      .expect(201);

    expect(res.body.data.code).toBe('TC002_e2e');
    // cleanup immediately
    await prisma.customer.delete({ where: { id: res.body.data.id as string } });
  });

  it('POST /customers — RECEPTIONIST can create customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        code: 'TC003_e2e',
        fullName: 'Lê Test Bảo',
        phone: '0903334444',
      })
      .expect(201);

    expect(res.body.data.code).toBe('TC003_e2e');
    // cleanup immediately
    await prisma.customer.delete({ where: { id: res.body.data.id as string } });
  });

  // ── VALIDATION ───────────────────────────────────────────────────────────────

  it('POST /customers — duplicate code returns 409 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC001_e2e',
        fullName: 'Duplicate Code',
        phone: '0909999991',
      })
      .expect(409);

    expect(res.body.message).toMatch(/Mã khách hàng đã tồn tại/);
  });

  it('POST /customers — duplicate phone returns 409 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC_DUPPHONE_e2e',
        fullName: 'Duplicate Phone',
        phone: '0901112222', // same phone as TC001_e2e
      })
      .expect(409);

    expect(res.body.message).toMatch(/Số điện thoại đã được sử dụng/);
  });

  it('POST /customers — duplicate idNumber returns 409 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC_DUPID_e2e',
        fullName: 'Duplicate ID',
        idNumber: '079201001234', // same idNumber as TC001_e2e
      })
      .expect(409);

    expect(res.body.message).toMatch(/CCCD\/Hộ chiếu đã được sử dụng/);
  });

  it('POST /customers — wrong sourceId group returns 400 with Vietnamese message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC_BADSRC_e2e',
        fullName: 'Bad Source',
        sourceId: wrongGroupId, // ROOM_TYPE id, not GUEST_SOURCE
      })
      .expect(400);

    expect(res.body.message).toMatch(/Nguồn khách|sourceId/);
  });

  it('POST /customers — invalid phone format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC_BADPHONE_e2e',
        fullName: 'Bad Phone',
        phone: 'not-a-phone',
      })
      .expect(400);
  });

  it('POST /customers — invalid email format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC_BADEMAIL_e2e',
        fullName: 'Bad Email',
        email: 'not-an-email',
      })
      .expect(400);
  });

  it('POST /customers — missing required fields returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // missing code and fullName
        phone: '0908887777',
      })
      .expect(400);
  });

  // ── LIST ────────────────────────────────────────────────────────────────────

  it('GET /customers — returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1 });
  });

  it('GET /customers — RECEPTIONIST can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);
  });

  it('GET /customers — HOUSEKEEPING can list (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .expect(200);
  });

  it('GET /customers?sourceId=<id> — filter by sourceId returns only matching customers', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers?sourceId=${sourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const item of res.body.data as Array<{ source: { id: string } | null }>) {
      if (item.source !== null) {
        expect(item.source.id).toBe(sourceId);
      }
    }
  });

  it('GET /customers?keyword=<phone> — keyword search hits phone field', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers?keyword=0901112222')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
    const found = (res.body.data as Array<{ phone: string }>).find((c) => c.phone === '0901112222');
    expect(found).toBeDefined();
  });

  it('GET /customers?keyword=<name> — keyword search hits fullName field', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers?keyword=${encodeURIComponent('Nguyễn Test Anh')}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('GET /customers?keyword=<code> — keyword search hits code field', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers?keyword=TC001_e2e')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────

  it('GET /customers/:id — returns single customer', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.source.id).toBe(sourceId);
    expect(res.body.data.deletedAt).toBeUndefined();
  });

  it('GET /customers/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  it('PATCH /customers/:id — admin updates fullName', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Nguyễn Test Anh (đã cập nhật)' })
      .expect(200);

    expect(res.body.data.fullName).toBe('Nguyễn Test Anh (đã cập nhật)');
  });

  it('PATCH /customers/:id — RECEPTIONIST can update (200)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ address: 'Đà Nẵng' })
      .expect(200);

    expect(res.body.data.address).toBe('Đà Nẵng');
  });

  it('PATCH /customers/:id — can update sourceId to valid GUEST_SOURCE', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceId: altSourceId })
      .expect(200);

    expect(res.body.data.source.id).toBe(altSourceId);
  });

  it('PATCH /customers/:id — bad sourceId group returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceId: wrongGroupId })
      .expect(400);
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('DELETE /customers/:id — RECEPTIONIST returns 403', async () => {
    // Create a temp customer to test RBAC on delete
    const temp = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC_DEL_RBAC_e2e',
        fullName: 'Delete RBAC Test',
        phone: '0904445555',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${temp.body.data.id as string}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);

    // Cleanup
    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${temp.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('DELETE /customers/:id — soft-deletes customer (204)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET /customers/:id — deleted customer returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /customers/:id — unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/customers/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  // ── SOFT-DELETE RESURRECTION ──────────────────────────────────────────────

  it('POST /customers — create with same code as soft-deleted resurrects and returns same id', async () => {
    // TC001_e2e is now soft-deleted. Re-creating with the same code should resurrect it.
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TC001_e2e',
        fullName: 'Nguyễn Test Anh Phục Hoạt',
        phone: '0905556666', // different phone (original was freed by soft-delete)
      })
      .expect(201);

    // Should reuse the same DB id (resurrection)
    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.fullName).toBe('Nguyễn Test Anh Phục Hoạt');
    expect(res.body.data.deletedAt).toBeUndefined();

    // Update createdId so afterAll cleanup works
    createdId = res.body.data.id as string;
  });

  it('GET /customers/:id — resurrected customer is visible again', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
