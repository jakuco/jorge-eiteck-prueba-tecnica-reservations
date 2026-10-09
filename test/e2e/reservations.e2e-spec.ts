import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  getAdminToken,
  getUserToken,
} from '../test-utils';

const RESOURCE_ID = 1;

function futureSlot(offsetHours: number, durationMinutes = 60): { start: string; end: string } {
  const start = new Date(Date.now() + offsetHours * 3600_000);
  start.setSeconds(0, 0);
  start.setMinutes(0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function nextSlot(): { start: string; end: string } {
  const base = new Date();
  base.setUTCMinutes(0, 0, 0);
  const slotHour = 24 + (base.getUTCHours() % 12);
  const start = new Date(base);
  start.setUTCHours(slotHour, 0, 0, 0);
  if (start.getTime() <= Date.now() + 60_000) {
    start.setUTCDate(start.getUTCDate() + 1);
  }
  const end = new Date(start.getTime() + 3600_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

describe('Reservations (e2e)', () => {
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

  describe('POST /reservations', () => {
    it('401 sin token', () => {
      return request(app.getHttpServer())
        .post('/reservations')
        .send({ resourceId: RESOURCE_ID, ...nextSlot() })
        .expect(401);
    });

    it('201: crea reserva válida', async () => {
      const slot = futureSlot(48);
      const res = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(201);

      expect(res.body.resourceId).toBe(RESOURCE_ID);
      expect(res.body.status).toBe('confirmed');
      expect(res.body.userId).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .delete(`/reservations/${res.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('400 si startTime no es ISO8601', async () => {
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: 'ayer', endTime: 'hoy' })
        .expect(400);
    });

    it('400 si falta resourceId', async () => {
      const slot = nextSlot();
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startTime: slot.start, endTime: slot.end })
        .expect(400);
    });

    it('400 si recurso no existe', async () => {
      const slot = futureSlot(72);
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: 9999, startTime: slot.start, endTime: slot.end })
        .expect(400);
    });

    it('TODO bloque 9: 400 si rango < 30 min (TimeRange VO)', async () => {
      const start = new Date(Date.now() + 96 * 3600_000);
      const end = new Date(start.getTime() + 5 * 60_000);
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          resourceId: RESOURCE_ID,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });
    });

    it('TODO bloque 9: 400 si rango no alineado a 30 min', async () => {
      const start = new Date(Date.now() + 120 * 3600_000);
      start.setMinutes(15, 0, 0);
      const end = new Date(start.getTime() + 3600_000);
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          resourceId: RESOURCE_ID,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });
    });

    it('409: solapamiento (escenario §4)', async () => {
      const slot = futureSlot(168);

      const first = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(201);

      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toMatch(/reservado|horario|conflicto/i);
        });

      await request(app.getHttpServer())
        .delete(`/reservations/${first.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('201: admin puede crear también', async () => {
      const slot = futureSlot(192);
      const res = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/reservations/${res.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /reservations', () => {
    it('401 sin token', () => {
      return request(app.getHttpServer()).get('/reservations').expect(401);
    });

    it('200 con paginación', async () => {
      const res = await request(app.getHttpServer())
        .get('/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
    });

    it('user solo ve las propias; admin ve todas', async () => {
      const userOnly = await request(app.getHttpServer())
        .get('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const all = await request(app.getHttpServer())
        .get('/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@eiteck.local', password: 'user123!' })
        .expect(200);
      const userId = Number(login.body.user.id);

      expect(
        userOnly.body.items.every((r: { userId: number }) => r.userId === userId),
      ).toBe(true);
      expect(all.body.total).toBeGreaterThanOrEqual(userOnly.body.total);
    });

    it('200 con filtro resourceId', async () => {
      await request(app.getHttpServer())
        .get(`/reservations?resourceId=${RESOURCE_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(
            res.body.items.every((r: { resourceId: number }) => r.resourceId === RESOURCE_ID),
          ).toBe(true);
        });
    });

    it('200 con filtro status', async () => {
      await request(app.getHttpServer())
        .get('/reservations?status=confirmed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(
            res.body.items.every((r: { status: string }) => r.status === 'confirmed'),
          ).toBe(true);
        });
    });
  });

  describe('DELETE /reservations/:id', () => {
    it('401 sin token', async () => {
      await request(app.getHttpServer())
        .delete('/reservations/1')
        .expect(401);
    });

    it('404 si no existe', async () => {
      await request(app.getHttpServer())
        .delete('/reservations/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('200: dueño cancela su propia reserva', async () => {
      const slot = futureSlot(240);
      const created = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/reservations/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('cancelled');
        });
    });

    it('200 idempotente: cancelar dos veces devuelve cancelled', async () => {
      const slot = futureSlot(264);
      const created = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(201);

      const id = created.body.id;

      await request(app.getHttpServer())
        .delete(`/reservations/${id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/reservations/${id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('cancelled');
        });
    });

    it('200: admin puede cancelar reserva de otro', async () => {
      const slot = futureSlot(288);
      const created = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/reservations/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('cancelled');
        });
    });
  });
});