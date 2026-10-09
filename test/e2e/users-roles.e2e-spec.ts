import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  cleanReservations,
  getAdminToken,
  getUserToken,
} from '../test-utils';

describe('Users and Roles (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    await cleanReservations(app);
    adminToken = await getAdminToken(app);
    userToken = await getUserToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('401 sin token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('403 cuando el caller no es admin', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('200 admin: devuelve la lista sin passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);

      for (const u of res.body.items) {
        expect(u).toHaveProperty('id');
        expect(u).toHaveProperty('email');
        expect(u).toHaveProperty('name');
        expect(u).toHaveProperty('role');
        expect(u).not.toHaveProperty('passwordHash');
      }
    });
  });

  describe('GET /roles', () => {
    it('401 sin token', async () => {
      await request(app.getHttpServer()).get('/roles').expect(401);
    });

    it('200 cualquier user autenticado: devuelve admin y user', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((r: { name: string }) => r.name);
      expect(names).toContain('admin');
      expect(names).toContain('user');
    });
  });
});