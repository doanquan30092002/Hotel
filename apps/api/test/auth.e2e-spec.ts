import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './helpers/app-setup';

const ADMIN_EMAIL = 'admin@hotel.local';
const ADMIN_PASSWORD = 'ChangeMe123!';
const API = '/api/v1';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Login ────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns 401 with Vietnamese message on wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: 'WrongPassword99!' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(typeof res.body.message).toBe('string');
      // Vietnamese message from auth.service
      expect(res.body.message).toMatch(/mật khẩu/i);
    });

    it('returns 200 + tokens + user (no passwordHash) on valid creds', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(ADMIN_EMAIL);
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Persist for subsequent tests
      accessToken = res.body.data.accessToken as string;
      refreshToken = res.body.data.refreshToken as string;
    });

    it('returns 400 when body is missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  // ─── /auth/me ─────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).get(`${API}/auth/me`).expect(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('returns 200 with user data when valid access token is provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(ADMIN_EMAIL);
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data.passwordHash).toBeUndefined();
    });
  });

  // ─── /auth/refresh ────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns 200 with new accessToken on valid refreshToken', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
    });

    it('returns 401 on garbage refreshToken', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: 'garbage.token.value' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('returns 401 when an access token is used where a refresh token is expected (typ check)', async () => {
      // accessToken has typ="access" — the refresh endpoint should reject it
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: accessToken })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });
});
