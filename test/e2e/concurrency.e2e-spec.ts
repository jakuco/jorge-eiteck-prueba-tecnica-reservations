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

describe('Concurrency (e2e) - Escenario crítico', () => {
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

  it('1A: dos usuarios distintos en paralelo → 1×201 + 1×409', async () => {
    const slot = futureSlot(24);
    const payload = {
      resourceId: RESOURCE_ID,
      startTime: slot.start,
      endTime: slot.end,
    };

    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload),
      request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload),
    ]);

    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('1B: mismo usuario dos veces en paralelo → 1×201 + 1×409', async () => {
    const slot = futureSlot(36);
    const payload = {
      resourceId: RESOURCE_ID,
      startTime: slot.start,
      endTime: slot.end,
    };

    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload),
      request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload),
    ]);

    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('2: N=10 requests en paralelo → 1×201 + 9×409', async () => {
    const slot = futureSlot(48);
    const payload = {
      resourceId: RESOURCE_ID,
      startTime: slot.start,
      endTime: slot.end,
    };

    const N = 10;
    const requests = Array.from({ length: N }, (_, i) =>
      request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${i % 2 === 0 ? adminToken : userToken}`)
        .send(payload),
    );

    const responses = await Promise.all(requests);
    const successCount = responses.filter((r) => r.status === 201).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(N - 1);
  });
});