import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from '../test-utils';

interface SessionBody {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

describe('Auth sessions (e2e) - refresh & logout', () => {
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

  it('el login devuelve access y refresh token', async () => {
    const body = await doLogin();
    expect(typeof body.access_token).toBe('string');
    expect(typeof body.refresh_token).toBe('string');
    expect(body.refresh_token.length).toBeGreaterThan(50);
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBeGreaterThan(0);
    expect(body.refresh_expires_in).toBe(7 * 86_400);
  });

  it('el refresh rota el token y el access nuevo es utilizable', async () => {
    const first = await doLogin();

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: first.refresh_token })
      .expect(200);

    const rotated = res.body as SessionBody;
    expect(rotated.refresh_token).not.toBe(first.refresh_token);

    await request(app.getHttpServer())
      .get('/resources')
      .set('Authorization', `Bearer ${rotated.access_token}`)
      .expect(200);
  });

  it('reutilizar un refresh consumido revoca todas las sesiones (401)', async () => {
    const first = await doLogin();

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: first.refresh_token })
      .expect(200);
    const secondRefresh = (rotated.body as SessionBody).refresh_token;

    // Reutilización del token ya consumido -> 401
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: first.refresh_token })
      .expect(401);

    // El token que era válido también quedó revocado
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: secondRefresh })
      .expect(401);
  });

  it('logout revoca el refresh token', async () => {
    const session = await doLogin();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${session.access_token}`)
      .send({ refresh_token: session.refresh_token })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: session.refresh_token })
      .expect(401);
  });

  it('logout sin autenticación devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refresh_token: 'algo' })
      .expect(401);
  });

  it('refresh inválido devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: 'no-existe' })
      .expect(401);
  });

  it('refresh sin refresh_token devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({})
      .expect(400);
  });
});
