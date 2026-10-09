import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcrypt';
import * as schema from '../schema';
import {
  resources,
  roleTypeAccess,
  roles,
  typeResources,
  users,
} from '../schema';

export async function runSeed(connectionString: string): Promise<void> {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('[seed] Insertando roles...');
  await db
    .insert(roles)
    .values([
      { name: 'admin', description: 'Administrador del sistema' },
      { name: 'user', description: 'Usuario regular (solo salas)' },
      {
        name: 'user_plus',
        description: 'Usuario con acceso a salas y vehículos',
      },
    ])
    .onConflictDoNothing();

  console.log('[seed] Insertando type_resources...');
  await db
    .insert(typeResources)
    .values([
      { name: 'Sala de reuniones', description: 'Salas para reuniones' },
      { name: 'Vehículo', description: 'Vehículos de la organización' },
    ])
    .onConflictDoNothing();

  const allRoles = await db.select().from(roles);
  const allTypes = await db.select().from(typeResources);

  const adminRole = allRoles.find((r) => r.name === 'admin');
  const userRole = allRoles.find((r) => r.name === 'user');
  const userPlusRole = allRoles.find((r) => r.name === 'user_plus');
  const sala = allTypes.find((t) => t.name === 'Sala de reuniones');
  const vehiculo = allTypes.find((t) => t.name === 'Vehículo');

  if (!adminRole || !userRole || !userPlusRole || !sala || !vehiculo) {
    throw new Error('Roles o tipos no encontrados después del seed inicial');
  }

  console.log('[seed] Reconstruyendo role_type_access (matriz de permisos)...');
  await db.delete(roleTypeAccess);

  const accessMatrix: { roleId: number; typeResourceId: number }[] = [
    // admin → todos los tipos
    { roleId: adminRole.id, typeResourceId: sala.id },
    { roleId: adminRole.id, typeResourceId: vehiculo.id },
    // user (tipo A) → solo salas
    { roleId: userRole.id, typeResourceId: sala.id },
    // user_plus (tipo B) → salas + vehículos
    { roleId: userPlusRole.id, typeResourceId: sala.id },
    { roleId: userPlusRole.id, typeResourceId: vehiculo.id },
  ];
  await db.insert(roleTypeAccess).values(accessMatrix);

  console.log('[seed] Insertando usuarios de prueba...');
  await db
    .insert(users)
    .values([
      {
        email: 'admin@eiteck.local',
        passwordHash: await bcrypt.hash('admin123!', 10),
        name: 'Admin User',
        roleId: adminRole.id,
      },
      {
        email: 'user@eiteck.local',
        passwordHash: await bcrypt.hash('user123!', 10),
        name: 'Regular User',
        roleId: userRole.id,
      },
      {
        email: 'userplus@eiteck.local',
        passwordHash: await bcrypt.hash('user123!', 10),
        name: 'Plus User',
        roleId: userPlusRole.id,
      },
    ])
    .onConflictDoNothing();

  console.log('[seed] Insertando recursos de ejemplo...');
  await db
    .insert(resources)
    .values([
      {
        name: 'Sala A1',
        description: 'Sala principal con proyector',
        typeId: sala.id,
        status: 'enabled',
      },
      {
        name: 'Sala B2',
        description: 'Sala mediana',
        typeId: sala.id,
        status: 'enabled',
      },
      {
        name: 'Vehículo corporativo',
        description: 'Auto de la empresa',
        typeId: vehiculo.id,
        status: 'enabled',
      },
    ])
    .onConflictDoNothing();

  console.log('[seed] Listo ✓');
  await client.end();
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está definida');
  runSeed(url).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}