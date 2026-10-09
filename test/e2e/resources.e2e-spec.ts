import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  getAdminToken,
  getUserToken,
} from '../test-utils';

describe('Resources (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    adminToken = await getAdminToken(app);
    userToken = await getUserToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /resources', () => {
    it('401 sin token', () => {
      return request(app.getHttpServer()).get('/resources').expect(401);
    });

    it('200 con token: devuelve items + total + paginación', async () => {
      const res = await request(app.getHttpServer())
        .get('/resources')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('pageSize');
      expect(res.body).toHaveProperty('totalPages');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('filtra por typeId', async () => {
      const res = await request(app.getHttpServer())
        .get('/resources?typeId=1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.items.every((r: { type: { id: number } }) => r.type.id === 1)).toBe(true);
    });
  });

  describe('GET /resources/:id', () => {
    it('200 si existe', async () => {
      await request(app.getHttpServer())
        .get('/resources/1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(1);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('type');
          expect(res.body).toHaveProperty('status');
        });
    });

    it('404 si no existe', async () => {
      await request(app.getHttpServer())
        .get('/resources/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('POST /resources', () => {
    it('403 con user', async () => {
      await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'X', typeId: 1 })
        .expect(403);
    });

    it('201 con admin: crea el recurso', async () => {
      const uniqueName = `Test Sala ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: uniqueName, typeId: 1 })
        .expect(201);

      expect(res.body.name).toBe(uniqueName);
      expect(res.body.status).toBe('enabled');
      expect(res.body.type.id).toBe(1);
    });

    it('409 si el nombre ya existe', async () => {
      const name = `Dup ${Date.now()}`;
      await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, typeId: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, typeId: 1 })
        .expect(409);
    });

    it('400 si typeId no existe', async () => {
      await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X', typeId: 999 })
        .expect(400);
    });

    it('400 si falta name', async () => {
      await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ typeId: 1 })
        .expect(400);
    });
  });

  describe('PATCH /resources/:id/status', () => {
    it('403 con user', async () => {
      await request(app.getHttpServer())
        .patch('/resources/1/status')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'disabled' })
        .expect(403);
    });

    it('200 con admin: cambia a disabled', async () => {
      await request(app.getHttpServer())
        .patch('/resources/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('disabled');
        });
    });

    it('idempotente: 200 al re-aplicar disabled', async () => {
      await request(app.getHttpServer())
        .patch('/resources/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('disabled');
        });
    });

    it('400 con status inválido', async () => {
      await request(app.getHttpServer())
        .patch('/resources/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid' })
        .expect(400);
    });

    it('404 si recurso no existe', async () => {
      await request(app.getHttpServer())
        .patch('/resources/9999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' })
        .expect(404);
    });

    afterAll(async () => {
      await request(app.getHttpServer())
        .patch('/resources/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'enabled' })
        .expect(200);
    });
  });
});