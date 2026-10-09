# Eiteck — API de Reservas de Recursos Compartidos

API backend para gestionar la reserva de recursos compartidos dentro de una
organización (salas, vehículos, equipos, etc.) con prevención de reservas
superpuestas, autenticación JWT, control de acceso por rol y trazabilidad.

## Stack

- **Lenguaje**: TypeScript (strict)
- **Runtime**: Node.js 22
- **Framework**: NestJS 10
- **ORM**: Drizzle ORM
- **DB**: PostgreSQL 16
- **Auth**: JWT (access tokens) + bcrypt
- **Validación**: class-validator + class-transformer
- **Docs**: Swagger / OpenAPI (`/api/docs`)
- **Tests**: Jest + Supertest
- **Logging**: pino (con redacción de secretos)
- **Rate limiting**: `@nestjs/throttler`
- **Deploy**: Docker (multi-stage) + Railway

## Requisitos

- Node.js 22+
- npm 10+
- Docker + Docker Compose (recomendado para entorno local)
- PostgreSQL 16+ (o usar el del `docker-compose.yml`)

## Ejecución local

### Con Docker Compose (recomendado)

```bash
cp .env.example .env
# Editar JWT_SECRET en .env con un valor real (openssl rand -base64 48)

docker compose up --build
```

Servicios levantados:

- **API**: <http://localhost:3000>
- **Swagger**: <http://localhost:3000/api/docs>
- **Postgres**: `localhost:5432` (user: `eiteck`, pass: `eiteck_dev_password`, db: `eiteck_reservations`)

### Sin Docker (modo dev nativo)

```bash
cp .env.example .env
# Apuntar DATABASE_URL a un Postgres local
npm install
npm run start:dev
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto HTTP | `3000` |
| `DATABASE_URL` | URL de conexión a Postgres | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto para firmar tokens (mín. 32 chars) | generado con `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Vida del access token | `1h` |

Ver `src/config/env.schema.ts` para el detalle de validación.

## Arquitectura

Estructura por capas (interpretación de Clean Architecture):

```
src/
├── config/         # carga y validación de variables de entorno
├── data/           # implementación de repositorios con Drizzle, migraciones, seeds
├── domain/         # entidades, value objects, use cases, interfaces de repo
└── presentation/   # controllers, guards, filters, DTOs de entrada/salida
```

**Dependency rule**:

- `presentation → domain ← data`
- `domain` no importa nada de `data`, `presentation`, ni de frameworks
  (sin `@nestjs/*`, sin `drizzle-orm`, sin `pg`). Es TypeScript puro.
- Las reglas de negocio viven en `domain/`, no en controllers ni repositorios.

## Decisiones de diseño

> Esta sección se va completando durante el desarrollo. Cada decisión lleva
> fecha, contexto, alternativas consideradas y por qué se eligió esta.

### D1 — ORM: Drizzle

- **Fecha:** 2026-10-06
- **Contexto:** necesitamos un ORM que no opaque el SQL subyacente (el
  evaluador puntúa fuertemente el criterio SQL).
- **Decisión:** Drizzle ORM.
- **Alternativas:** TypeORM (NestJS default), Prisma (más alto nivel).
- **Por qué:** Drizzle es liviano, tipado, y permite escribir queries
  cercanas a SQL puro, fáciles de defender en la revisión.

### D2 — Concurrencia: exclusion constraint con `tstzrange` + `EXCLUDE USING gist`

- **Fecha:** 2026-10-06
- **Contexto:** dos usuarios pueden intentar reservar el mismo recurso en
  intervalos coincidentes.
- **Decisión:** `EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time) WITH &&)`
  con un filtro `WHERE status = 'confirmed'`.
- **Por qué:** garantía a nivel de base de datos. El motor rechaza el INSERT
  con error `23P01` ante cualquier solapamiento. Más simple y elegante que
  `SELECT ... FOR UPDATE` y defendible en la revisión.

### D3 — Deploy: Railway

- **Fecha:** 2026-10-06
- **Contexto:** necesitamos deploy activo y accesible durante el periodo de
  evaluación (sección 15 del enunciado).
- **Decisión:** Railway.
- **Alternativas:** Render, Fly.io, AWS, GCP.
- **Por qué:** setup mínimo para Node + Postgres, plan free alcanza para
  evaluación.

### D4 — RBAC simplificado con hooks de extensibilidad (M:N)

- **Fecha:** 2026-10-08
- **Contexto:** el enunciado menciona "consultar los recursos que puede
  utilizar" pero no define la granularidad ni exige un sistema RBAC completo.
- **Decisión:** tabla `roles` con FK desde `users.role_id` (1:N). Tabla
  puente `role_type_access` para el control de acceso por tipo (M:N).
  Permisos efectivos viven en guards, no en filas de DB.
- **Por qué:**
  - El spec solo pide 2 roles (`admin`, `user`) con permisos diferenciados.
  - 1:N entre user y role matchea el spec literal ("una persona que utiliza
    el sistema").
  - M:N entre role y type_resource permite reglas por categoría sin
    agregar columnas `text[]` ni tablas puente para cada permiso.
  - Menor superficie de cambios, más rápido de implementar.
- **Extensibilidad:** si en el futuro se necesitan permisos granulares por
  acción, se agregan tablas `permissions` y `role_permissions` que apuntan
  a `roles.id`. La FK `users.role_id` no se toca.
- **Trade-off aceptado:** cambiar permisos requiere redeploy (vs INSERT en DB).
  En 3 días con roles congelados, aceptable.

## Supuestos y trade-offs

- **Refresh tokens**: simplificación inicial — solo access token con vida
  moderada (1 h). Renovación de sesión queda como mejora documentada.
- **Observabilidad**: solo pino con redacción. Sin tracing ni métricas
  avanzadas.
- **CI**: pendiente de justificación; se agrega si entra en el cronograma.

## PostgreSQL / SQL

### Modelo de datos (6 tablas)

```
users ──────────────┐
                    │
roles ──────────────┤── users.role_id → roles.id
                    │
type_resources ─────┤
                    │
resources ──────────┤── resources.type_id → type_resources.id
   │                │
   │   ┌────────────┘
   │   │
   ▼   ▼
reservations ──────── resources.id (FK)
   │
   │   ┌───────────── reservations.user_id → users.id
   ▼   ▼
role_type_access (M:N) ── roles.id, type_resources.id
```

### Anti-solapamiento: EXCLUDE constraint

La pieza clave del sistema. Garantiza a nivel DB que dos reservas confirmadas
del mismo recurso no se solapen, sin necesidad de check a nivel aplicación:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (status = 'confirmed');
```

- `tstzrange(start, end, '[)')` → rango **semi-abierto** (la reserva 10:00–11:00
  no se solapa con 11:00–12:00, contigüidad permitida).
- `WHERE (status = 'confirmed')` → una reserva cancelada libera el slot.
- El motor de Postgres devuelve **`SQLSTATE 23P01`** (`exclusion_violation`)
  ante cualquier intento de solapamiento, que el backend traduce a `409`.

### Índices

```sql
-- Listado de recursos por estado y tipo
CREATE INDEX "resources_status_type_idx"
  ON "resources" USING btree ("status", "type_id");

-- Listado de reservas por usuario + estado
CREATE INDEX "reservations_user_status_idx"
  ON "reservations" USING btree ("user_id", "status");

-- Listado de reservas por recurso + rango temporal
CREATE INDEX "reservations_resource_range_idx"
  ON "reservations" USING btree ("resource_id", "start_time", "end_time");
```

### Comandos de DB

```bash
# Generar migración desde schema Drizzle
npm run db:generate

# Aplicar migraciones (local o Railway)
npm run db:migrate

# Insertar datos de prueba (roles, tipos, admin, user)
npm run db:seed
```

### Conexión a Railway

```bash
# Con Railway CLI autenticado:
railway run npm run db:migrate
railway run npm run db:seed
```

El plugin PostgreSQL de Railway expone la URL en `${{Postgres.DATABASE_URL}}`,
que se inyecta al servicio de la app vía variables de entorno.

## Pruebas

```bash
# Tests unitarios (Jest, *.spec.ts dentro de src/)
npm test

# Tests e2e (Jest + Supertest, config en test/jest-e2e.json)
npm run test:e2e

# Coverage
npm run test:cov
```

Suite e2e: **47 tests** en 5 archivos (`resources`, `reservations`,
`exception-filter`, `concurrency`, `security`). Cubre auth, CRUD, validaciones,
ownership, time-range, exception filter, concurrencia con `Promise.all`
(2 users, mismo user ×2, N=10, ganador verificado en DB), throttler y
JWT inválido/expirado.

## Despliegue

### Railway

1. Crear proyecto nuevo en Railway.
2. Agregar servicio Postgres (Railway provisiona la URL en `DATABASE_URL`).
3. Conectar repo y configurar variables de entorno:
   - `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET` → valor fuerte (≥32 chars)
   - `JWT_EXPIRES_IN` → `1h` (opcional)
4. **Configurar Release Command** (Settings → Deploy → Release Command):

   ```bash
   npm run db:migrate && npm run db:seed
   ```

   Esto corre antes de cada deploy. Si solo es necesario migrar, usar
   `npm run db:migrate`; el seed es idempotente (`onConflictDoNothing`).
5. Railway detecta `Dockerfile` y construye.

> URL de producción se documenta una vez desplegado.

> **Importante:** sin el Release Command, el contenedor arranca apuntando
> a una DB sin tablas y `/health` devuelve 200 (es un `SELECT 1` que no
> consulta tablas) aunque `/auth/login` tire 500.

## Comandos útiles

```bash
npm run start:dev     # dev con hot reload
npm run build         # build a dist/
npm run start:prod    # producción (node dist/main)
npm run lint          # eslint
npm test              # tests unitarios
npm run test:e2e      # tests e2e
npm run db:generate   # generar migración Drizzle desde el schema
npm run db:migrate    # aplicar migraciones
npm run db:push       # push directo del schema (solo dev)
npm run db:seed       # insertar roles, tipos, admin, user
npm run db:studio     # Drizzle Studio (GUI)
```

## Credenciales de prueba (seed)

Tras correr `npm run db:seed`:

| Rol   | Email                  | Password    |
|-------|------------------------|-------------|
| admin | `admin@eiteck.local`   | `admin123!` |
| user  | `user@eiteck.local`    | `user123!`  |