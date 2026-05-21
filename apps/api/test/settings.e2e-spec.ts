import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './helpers/app-setup';

const ADMIN_EMAIL = 'admin@hotel.local';
const ADMIN_PASSWORD = 'ChangeMe123!';
const API = '/api/v1';

// Test RECEPTIONIST — created once for RBAC assertions
const SUFFIX = Date.now().toString(36) + 'set';
const TEST_REC_EMAIL = `test-rec-${SUFFIX}@hotel.local`;
const TEST_REC_PASSWORD = 'Rec12345!';

describe('Settings (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let recToken: string;
  let recUserId: string;
  let originalPropertyName: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    adminToken = loginRes.body.data.accessToken as string;

    // Capture original settings so we can restore in afterAll
    const settingsRes = await request(app.getHttpServer())
      .get(`${API}/settings`)
      .set('Authorization', `Bearer ${adminToken}`);

    originalPropertyName = settingsRes.body.data.propertyName as string;

    // Create a RECEPTIONIST user for RBAC tests
    const createRes = await request(app.getHttpServer())
      .post(`${API}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: TEST_REC_EMAIL,
        password: TEST_REC_PASSWORD,
        fullName: 'Settings Test Rec',
        role: 'RECEPTIONIST',
      });

    recUserId = createRes.body.data?.id as string;

    // Login as receptionist
    const recLoginRes = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: TEST_REC_EMAIL, password: TEST_REC_PASSWORD });

    recToken = recLoginRes.body.data.accessToken as string;
  });

  afterAll(async () => {
    // Restore original propertyName
    if (adminToken && originalPropertyName) {
      await request(app.getHttpServer())
        .put(`${API}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ propertyName: originalPropertyName });
    }

    // Clean up test receptionist
    if (recUserId) {
      await request(app.getHttpServer())
        .delete(`${API}/users/${recUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    await app.close();
  });

  // ─── GET /settings ────────────────────────────────────────────────────────

  describe('GET /settings', () => {
    it('returns 200 with seeded singleton data as admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe('singleton');
      expect(typeof res.body.data.propertyName).toBe('string');
      expect(typeof res.body.data.themeTone).toBe('number');
    });

    it('returns 200 for RECEPTIONIST (all roles can GET)', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/settings`)
        .set('Authorization', `Bearer ${recToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer()).get(`${API}/settings`).expect(401);
      expect(res.body.statusCode).toBe(401);
    });
  });

  // ─── PUT /settings ────────────────────────────────────────────────────────

  describe('PUT /settings (ADMIN + MANAGER only)', () => {
    it('updates propertyName and themeTone as admin, returns 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`${API}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ propertyName: 'Homestay Test', themeTone: 3 })
        .expect(200);

      expect(res.body.data.propertyName).toBe('Homestay Test');
      expect(res.body.data.themeTone).toBe(3);
    });

    it('verifies updated values are persisted on re-GET', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.propertyName).toBe('Homestay Test');
      expect(res.body.data.themeTone).toBe(3);
    });

    it('returns 403 for RECEPTIONIST on PUT /settings', async () => {
      const res = await request(app.getHttpServer())
        .put(`${API}/settings`)
        .set('Authorization', `Bearer ${recToken}`)
        .send({ propertyName: 'Should Fail' })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('returns 400 for themeTone out of range (> 3)', async () => {
      const res = await request(app.getHttpServer())
        .put(`${API}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ themeTone: 5 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('returns 400 for themeTone below minimum (< 1)', async () => {
      const res = await request(app.getHttpServer())
        .put(`${API}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ themeTone: 0 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });
});
