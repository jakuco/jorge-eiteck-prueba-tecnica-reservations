import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
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
      { name: 'user', description: 'Usuario regular' },
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

  console.log('[seed] Insertando role_type_access (todos pueden todos los tipos)...');
  for (const r of allRoles) {
    for (const t of allTypes) {
      await db
        .insert(roleTypeAccess)
        .values({ roleId: r.id, typeResourceId: t.id })
        .onConflictDoNothing();
    }
  }

  const adminRole = allRoles.find((r) => r.name === 'admin');
  const userRole = allRoles.find((r) => r.name === 'user');
  if (!adminRole || !userRole) {
    throw new Error('Roles no encontrados después del seed inicial');
  }

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
    ])
    .onConflictDoNothing();

  const salaReuniones = allTypes.find((t) => t.name === 'Sala de reuniones');
  const vehiculo = allTypes.find((t) => t.name === 'Vehículo');

  console.log('[seed] Insertando recursos de ejemplo...');
  await db
    .insert(resources)
    .values([
      {
        name: 'Sala A1',
        description: 'Sala principal con proyector',
        typeId: salaReuniones!.id,
        status: 'enabled',
      },
      {
        name: 'Sala B2',
        description: 'Sala mediana',
        typeId: salaReuniones!.id,
        status: 'enabled',
      },
      {
        name: 'Vehículo corporativo',
        description: 'Auto de la empresa',
        typeId: vehiculo!.id,
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