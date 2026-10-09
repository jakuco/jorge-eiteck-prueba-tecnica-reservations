import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  cleanReservations,
  getAdminToken,
  getUserToken,
  login,
} from '../test-utils';

function futureSlot(offsetHours: number): { start: string; end: string } {
  const start = new Date(Date.now() + offsetHours * 3600_000);
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(0);
  const end = new Date(start.getTime() + 3600_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

interface ResourceItem {
  id: number;
  name: string;
  type: { id: number; name: string };
}

describe('Type access control (e2e) - role_type_access', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let userPlusToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    await cleanReservations(app);
    adminToken = await getAdminToken(app);
    userToken = await getUserToken(app);
    userPlusToken = await login(app, 'userplus@eiteck.local', 'user123!');
  });

  afterAll(async () => {
    await app.close();
  });

  async function listResources(token: string): Promise<ResourceItem[]> {
    const res = await request(app.getHttpServer())
      .get('/resources?pageSize=100')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.items as ResourceItem[];
  }

  async function findVehicleId(): Promise<number> {
    const items = await listResources(adminToken);
    const vehicle = items.find((r) => r.type.name === 'Vehículo');
    expect(vehicle).toBeDefined();
    return vehicle!.id;
  }

  it('admin ve vehículos (acceso total)', async () => {
    const items = await listResources(adminToken);
    expect(items.some((r) => r.type.name === 'Vehículo')).toBe(true);
  });

  it('user (tipo A) NO ve vehículos, solo salas', async () => {
    const items = await listResources(userToken);
    expect(items.some((r) => r.type.name === 'Vehículo')).toBe(false);
    expect(items.every((r) => r.type.name === 'Sala de reuniones')).toBe(true);
  });

  it('user_plus (tipo B) SÍ ve vehículos', async () => {
    const items = await listResources(userPlusToken);
    expect(items.some((r) => r.type.name === 'Vehículo')).toBe(true);
  });

  it('user GET de un vehículo → 403', async () => {
    const vehicleId = await findVehicleId();
    await request(app.getHttpServer())
      .get(`/resources/${vehicleId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('user_plus GET de un vehículo → 200', async () => {
    const vehicleId = await findVehicleId();
    await request(app.getHttpServer())
      .get(`/resources/${vehicleId}`)
      .set('Authorization', `Bearer ${userPlusToken}`)
      .expect(200);
  });

  it('user reserva un vehículo → 403', async () => {
    const vehicleId = await findVehicleId();
    const slot = futureSlot(240);
    await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resourceId: vehicleId, startTime: slot.start, endTime: slot.end })
      .expect(403);
  });

  it('user_plus reserva un vehículo → 201', async () => {
    const vehicleId = await findVehicleId();
    const slot = futureSlot(264);
    await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${userPlusToken}`)
      .send({ resourceId: vehicleId, startTime: slot.start, endTime: slot.end })
      .expect(201);
  });

  it('user consulta availability de un vehículo → 403', async () => {
    const vehicleId = await findVehicleId();
    await request(app.getHttpServer())
      .get(
        `/resources/${vehicleId}/availability?from=2030-01-01T00:00:00.000Z&to=2030-01-31T23:59:59.000Z`,
      )
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});