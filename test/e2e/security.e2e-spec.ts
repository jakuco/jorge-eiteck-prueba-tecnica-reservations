import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  cleanReservations,
  getAdminToken,
  getUserToken,
} from '../test-utils';

const RESOURCE_ID = 1;

function futureSlot(offsetHours: number): { start: string; end: string } {
  const start = new Date(Date.now() + offsetHours * 3600_000);
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(0);
  const end = new Date(start.getTime() + 3600_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

describe('Security (e2e) - Hardening', () => {
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

  describe('403 horizontal (user cancela reserva de otro)', () => {
    it('user A crea, user B (con otro token) intenta cancelar → 403', async () => {
      const slot = futureSlot(48);

      const loginA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@eiteck.local', password: 'admin123!' })
        .expect(200);
      const tokenA = loginA.body.access_token;

      const created = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/reservations/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/reservations/${created.body.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
    });
  });

  describe('Recurso deshabilitado', () => {
    afterAll(async () => {
      await request(app.getHttpServer())
        .patch(`/resources/${RESOURCE_ID}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'enabled' })
        .expect(200);
    });

    it('POST /reservations con recurso en status=disabled → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/resources/${RESOURCE_ID}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' })
        .expect(200);

      try {
        const slot = futureSlot(72);
        await request(app.getHttpServer())
          .post('/reservations')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toMatch(/habilitado/i);
          });
      } finally {
        await request(app.getHttpServer())
          .patch(`/resources/${RESOURCE_ID}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'enabled' })
          .expect(200);
      }
    });
  });

  describe('JWT inválido', () => {
    it('token con firma inválida → 401', async () => {
      const tamperedToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImVtYWlsIjoiYWRtaW5AZWl0ZWNrLmxvY2FsIiwicm9sZU5hbWUiOiJhZG1pbiIsInJvbGVJZCI6MSwiaWF0IjoxNzkxNTA2Mjc4LCJleHAiOjk5OTk5OTk5OTl9.invalid_signature_xxxxxxxxxxxxxxxxx';

      await request(app.getHttpServer())
        .get('/resources')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('token con formato malformado → 401', async () => {
      await request(app.getHttpServer())
        .get('/resources')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });

    it('sin header Authorization → 401', async () => {
      await request(app.getHttpServer())
        .get('/resources')
        .expect(401);
    });
  });
});