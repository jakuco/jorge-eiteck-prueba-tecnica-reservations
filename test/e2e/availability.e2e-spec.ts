import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  cleanReservations,
  getAdminToken,
  getUserToken,
} from '../test-utils';

const RESOURCE_ID = 1;

function futureSlot(offsetHours: number, durationMinutes = 60): { start: string; end: string } {
  const start = new Date(Date.now() + offsetHours * 3600_000);
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

describe('Availability (e2e) - GET /resources/:id/availability', () => {
  let app: INestApplication;
  let userToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    await cleanReservations(app);
    userToken = await getUserToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 sin token', async () => {
    await request(app.getHttpServer())
      .get(`/resources/${RESOURCE_ID}/availability?from=2026-12-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z`)
      .expect(401);
  });

  it('404 si el recurso no existe', async () => {
    await request(app.getHttpServer())
      .get('/resources/9999/availability?from=2026-12-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });

  it('400 si from >= to', async () => {
    await request(app.getHttpServer())
      .get('/resources/1/availability?from=2026-12-31T00:00:00.000Z&to=2026-12-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);
  });

  it('400 si from no es ISO8601', async () => {
    await request(app.getHttpServer())
      .get('/resources/1/availability?from=ayer&to=mañana')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);
  });

  it('200 con busy=[] cuando no hay reservas en el rango', async () => {
    const res = await request(app.getHttpServer())
      .get('/resources/1/availability?from=2030-01-01T00:00:00.000Z&to=2030-01-31T23:59:59.000Z')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.resourceId).toBe(1);
    expect(res.body.busy).toEqual([]);
  });

  it('200 devuelve las reservas confirmadas en el rango', async () => {
    const slot1 = futureSlot(48);
    const slot2 = futureSlot(120);

    const created1 = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resourceId: RESOURCE_ID, startTime: slot1.start, endTime: slot1.end })
      .expect(201);

    const created2 = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resourceId: RESOURCE_ID, startTime: slot2.start, endTime: slot2.end })
      .expect(201);

    const from = new Date(Date.now() + 24 * 3600_000).toISOString();
    const to = new Date(Date.now() + 240 * 3600_000).toISOString();

    const res = await request(app.getHttpServer())
      .get(`/resources/${RESOURCE_ID}/availability?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.busy).toHaveLength(2);
    const ids = res.body.busy.map((b: { id: number }) => b.id);
    expect(ids).toContain(created1.body.id);
    expect(ids).toContain(created2.body.id);

    await request(app.getHttpServer())
      .delete(`/reservations/${created1.body.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/reservations/${created2.body.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });

  it('reservas canceladas NO aparecen en busy', async () => {
    const slot = futureSlot(72);

    const created = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/reservations/${created.body.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const from = new Date(Date.now() + 24 * 3600_000).toISOString();
    const to = new Date(Date.now() + 240 * 3600_000).toISOString();

    const res = await request(app.getHttpServer())
      .get(`/resources/${RESOURCE_ID}/availability?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const ids = res.body.busy.map((b: { id: number }) => b.id);
    expect(ids).not.toContain(created.body.id);
  });

  it('reservas que solapan con el inicio del rango SÍ aparecen', async () => {
    const start = new Date(Date.now() + 300 * 3600_000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3600_000);

    const created = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resourceId: RESOURCE_ID, startTime: start.toISOString(), endTime: end.toISOString() })
      .expect(201);

    const from = new Date(start.getTime() + 30 * 60_000).toISOString();
    const to = new Date(Date.now() + 720 * 3600_000).toISOString();

    const res = await request(app.getHttpServer())
      .get(`/resources/${RESOURCE_ID}/availability?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const ids = res.body.busy.map((b: { id: number }) => b.id);
    expect(ids).toContain(created.body.id);

    await request(app.getHttpServer())
      .delete(`/reservations/${created.body.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });
});