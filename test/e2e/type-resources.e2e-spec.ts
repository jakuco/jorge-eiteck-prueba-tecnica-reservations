import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp, getUserToken } from '../test-utils';

describe('Type resources (e2e)', () => {
  let app: INestApplication;
  let userToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    userToken = await getUserToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 sin token', async () => {
    await request(app.getHttpServer()).get('/type-resources').expect(401);
  });

  it('200 cualquier user autenticado: devuelve los tipos', async () => {
    const res = await request(app.getHttpServer())
      .get('/type-resources')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((t: { name: string }) => t.name);
    expect(names).toContain('Sala de reuniones');
    expect(names).toContain('Vehículo');
  });
});