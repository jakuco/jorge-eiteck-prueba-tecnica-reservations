import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { bootstrapTestApp, login } from '../test-utils';
import { DATABASE, type DB } from '../../src/data/database.module';
import { permissions, rolePermissions, roles } from '../../src/data/schema';
import { PERMISSIONS } from '../../src/domain/authz/permissions';

describe('Authz por permisos (e2e) - role_permissions', () => {
  let app: INestApplication;
  let db: DB;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    db = app.get<DB>(DATABASE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('user sin users:read -> 403; al otorgarlo en DB -> 200, y al quitarlo -> 403', async () => {
    const token = await login(app, 'user@eiteck.local', 'user123!');

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    const [userRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'user'))
      .limit(1);
    const [perm] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.name, PERMISSIONS.USERS_READ))
      .limit(1);

    await db
      .insert(rolePermissions)
      .values({ roleId: userRole.id, permissionId: perm.id })
      .onConflictDoNothing();

    try {
      // El mismo token sirve: la autorización se resuelve por request contra DB.
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    } finally {
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, userRole.id),
            eq(rolePermissions.permissionId, perm.id),
          ),
        );
    }

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
