import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from '../test-utils';
import { DATABASE, type DB } from '../../src/data/database.module';
import { refreshTokens } from '../../src/data/schema';
import { hashRefreshToken } from '../../src/domain/helpers/refresh-token';

interface SessionBody {
  access_token: string;
  refresh_token: string;
  user: { id: number; email: string; roleName: string };
}

describe('Auth refresh avanzado (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function doLogin(): Promise<SessionBody> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@eiteck.local', password: 'user123!' })
      .expect(200);
    return res.body as SessionBody;
  }

  it('refresh expirado devuelve 401', async () => {
    const session = await doLogin();
    const db = app.get<DB>(DATABASE);
    const raw = `expired-${Date.now()}`;

    await db.insert(refreshTokens).values({
      userId: session.user.id,
      tokenHash: hashRefreshToken(raw),
      expiresAt: new Date(Date.now() - 60_000),
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: raw })
      .expect(401);
  });

  it('refresh concurrente con el mismo token: uno gana y el otro 401 (revoca todo)', async () => {
    const session = await doLogin();

    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: session.refresh_token }),
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: session.refresh_token }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 401]);

    const winner = a.status === 200 ? a : b;
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: (winner.body as SessionBody).refresh_token })
      .expect(401);
  });
});
