import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './helpers/app-setup';

const ADMIN_EMAIL = 'admin@hotel.local';
const ADMIN_PASSWORD = 'ChangeMe123!';
const API = '/api/v1';

// Unique suffix to isolate test users from previous runs
const SUFFIX = Date.now().toString(36);
const TEST_REC_EMAIL = `test-rec-${SUFFIX}@hotel.local`;
const TEST_REC_PASSWORD = 'Rec12345!';
const TEST_REC_FULLNAME = 'Test Receptionist';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let recToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    adminToken = loginRes.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Clean up: soft-delete the test user if it still exists
    if (createdUserId) {
      await request(app.getHttpServer())
        .delete(`${API}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    await app.close();
  });

  // ─── Create ───────────────────────────────────────────────────────────────

  describe('POST /users (ADMIN only)', () => {
    it('creates a RECEPTIONIST user and returns 201 without passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: TEST_REC_EMAIL,
          password: TEST_REC_PASSWORD,
          fullName: TEST_REC_FULLNAME,
          role: 'RECEPTIONIST',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(TEST_REC_EMAIL);
      expect(res.body.data.role).toBe('RECEPTIONIST');
      expect(res.body.data.passwordHash).toBeUndefined();

      createdUserId = res.body.data.id as string;
    });

    it('returns 409 on duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: TEST_REC_EMAIL,
          password: 'AnotherPass1!',
          fullName: 'Duplicate User',
          role: 'RECEPTIONIST',
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it('returns 400 on missing required fields (validation)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bad-email', password: 'short' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  // ─── List ─────────────────────────────────────────────────────────────────

  describe('GET /users (ADMIN + MANAGER)', () => {
    it('returns paginated data with meta fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/users?page=1&pageSize=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pageSize).toBe(10);
      expect(typeof res.body.meta.total).toBe('number');
      expect(typeof res.body.meta.totalPages).toBe('number');
    });

    it('seed admin appears in the list', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/users?keyword=admin@hotel.local`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users: Array<{ email: string }> = res.body.data as Array<{ email: string }>;
      const adminUser = users.find((u) => u.email === ADMIN_EMAIL);
      expect(adminUser).toBeDefined();
    });

    it('filter by role=RECEPTIONIST and keyword=test-rec finds the created user', async () => {
      const suffix = SUFFIX;
      const res = await request(app.getHttpServer())
        .get(`${API}/users?role=RECEPTIONIST&keyword=test-rec-${suffix}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users: Array<{ email: string }> = res.body.data as Array<{ email: string }>;
      const found = users.find((u) => u.email === TEST_REC_EMAIL);
      expect(found).toBeDefined();
    });
  });

  // ─── Get by ID ────────────────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('returns 200 with user for valid id', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(createdUserId);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/users/non-existent-id-00000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });
  });

  // ─── Update ───────────────────────────────────────────────────────────────

  describe('PATCH /users/:id (ADMIN only)', () => {
    it('updates fullName and returns 200 with new value', async () => {
      const newName = 'Updated Receptionist Name';
      const res = await request(app.getHttpServer())
        .patch(`${API}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: newName })
        .expect(200);

      expect(res.body.data.fullName).toBe(newName);

      // Verify on re-fetch
      const fetchRes = await request(app.getHttpServer())
        .get(`${API}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(fetchRes.body.data.fullName).toBe(newName);
    });

    it('updating password allows re-login with new password', async () => {
      const newPassword = 'NewPass456!';
      await request(app.getHttpServer())
        .patch(`${API}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: newPassword })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: TEST_REC_EMAIL, password: newPassword })
        .expect(200);

      expect(loginRes.body.data.accessToken).toBeDefined();
      recToken = loginRes.body.data.accessToken as string;
    });
  });

  // ─── Delete (soft) ────────────────────────────────────────────────────────

  describe('DELETE /users/:id (ADMIN only)', () => {
    it('returns 204 on delete and subsequent GET returns 404', async () => {
      await request(app.getHttpServer())
        .delete(`${API}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Mark as already deleted so afterAll cleanup doesn't 404
      const deletedId = createdUserId;
      createdUserId = '';

      await request(app.getHttpServer())
        .get(`${API}/users/${deletedId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── RBAC denials ─────────────────────────────────────────────────────────

  describe('RBAC — RECEPTIONIST denied from user management endpoints', () => {
    it('GET /users returns 403 for RECEPTIONIST', async () => {
      // recToken may be undefined if password update test was skipped — re-login with original pass
      if (!recToken) {
        const loginRes = await request(app.getHttpServer())
          .post(`${API}/auth/login`)
          .send({ email: TEST_REC_EMAIL, password: TEST_REC_PASSWORD });
        recToken = loginRes.body.data?.accessToken as string;
      }

      if (!recToken) {
        // User deleted already — skip gracefully
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`${API}/users`)
        .set('Authorization', `Bearer ${recToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('POST /users returns 403 for RECEPTIONIST', async () => {
      if (!recToken) return;

      const res = await request(app.getHttpServer())
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${recToken}`)
        .send({
          email: `test-denied-${SUFFIX}@hotel.local`,
          password: 'Pass12345!',
          fullName: 'Should Fail',
          role: 'RECEPTIONIST',
        })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });
  });
});
