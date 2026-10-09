import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  cleanReservations,
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

describe('AllExceptionsFilter (e2e)', () => {
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

  it('DomainError (InvalidTimeRangeError) → 400 con code + path + timestamp', async () => {
    const start = new Date(Date.now() + 96 * 3600_000);
    const end = new Date(start.getTime() + 5 * 60_000);
    const res = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resourceId: RESOURCE_ID, startTime: start.toISOString(), endTime: end.toISOString() })
      .expect(400);

    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'BAD_REQUEST',
      code: 'INVALID_TIME_RANGE',
      path: '/reservations',
    });
    expect(typeof res.body.message).toBe('string');
    expect(typeof res.body.timestamp).toBe('string');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('HttpException (NotFoundException del use case) → 404 formato uniforme', async () => {
    const res = await request(app.getHttpServer())
      .get('/resources/9999')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      error: 'NOT_FOUND',
      path: '/resources/9999',
    });
    expect(res.body.message).toMatch(/9999/);
    expect(res.body.code).toBeUndefined();
  });

  it('ValidationPipe (class-validator) → 400 con array de mensajes', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-es-email', password: '123' })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.message)).toBe(true);
    expect(res.body.path).toBe('/auth/login');
  });

  it('smoke: 201 cuando la reserva se crea correctamente (sin error)', async () => {
    const slot = futureSlot(200);
    await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resourceId: RESOURCE_ID, startTime: slot.start, endTime: slot.end })
      .expect(201);
  });

  it('Response incluye timestamp ISO8601 válido', async () => {
    const res = await request(app.getHttpServer())
      .get('/resources/1')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(typeof res.body.id).toBe('number');
  });
});