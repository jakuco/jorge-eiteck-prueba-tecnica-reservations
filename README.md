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
- **Auth**: JWT access token (15 min) + refresh tokens rotativos (7 días) + bcrypt
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
- **Postgres**: `localhost:5434` (user: `eiteck`, pass: `eiteck_dev_password`, db: `eiteck_reservations`)

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
| `JWT_SECRET` | Secreto para firmar el access token (mín. 32 chars) | generado con `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Vida del access token (corto a propósito) | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Vida del refresh token (rotativo) | `7` |

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

### D4 — RBAC por tipo de recurso (M:N)

- **Fecha:** 2026-10-08 (actualizado 2026-10-09)
- **Contexto:** el enunciado pide "consultar los recursos que puede utilizar"
  y "aplicación de permisos según el tipo de usuario".
- **Decisión:** tabla `roles` con FK desde `users.role_id` (1:N) + tabla puente
  `role_type_access` (M:N entre `roles` y `type_resources`). **El acceso a cada
  tipo de recurso se resuelve 100% desde `role_type_access`**, sin hardcodear
  nombres de rol en el código.
- **Cómo funciona:**
  - Cada rol tiene un conjunto de `type_resource` permitidos.
  - `GET /resources` filtra los recursos por los tipos permitidos del rol.
  - `GET /resources/:id`, `GET /resources/:id/availability` y
    `POST /reservations` devuelven **403** si el tipo no está permitido.
  - No hay `if (roleName === 'admin')`: admin ve todo porque el seed le
    asigna ambos tipos en `role_type_access`.
- **Perfiles sembrados:**
  - `admin@eiteck.local` → todos los tipos (salas + vehículos).
  - `user@eiteck.local` → solo "Sala de reuniones".
  - `userplus@eiteck.local` → "Sala de reuniones" + "Vehículo".
- **Por qué:**
  - El spec pide permisos según el tipo de usuario/relación con la información.
  - M:N permite reglas por categoría sin `text[]` ni tablas por permiso.
  - Data-driven: cambiar permisos es cambiar una fila, no un guard.
- **Extensibilidad:** para permisos granulares por acción se agregan tablas
  `permissions` y `role_permissions` apuntando a `roles.id`; la FK
  `users.role_id` no se toca.

### D5 — Sesiones: refresh tokens rotativos persistidos

- **Fecha:** 2026-10-09
- **Contexto:** el enunciado (§7) pide un mecanismo razonable de **renovación**
  y **finalización** de sesiones, además de proteger el acceso ante robo de
  credenciales.
- **Decisión:**
  - **Access token** JWT corto (`15m`) para autorizar requests.
  - **Refresh token** *opaco* (384 bits aleatorios), persistido **hasheado
    (sha256)** en `refresh_tokens`, con **rotación** en cada `/auth/refresh`.
  - **Detección de reuso:** si se presenta un refresh ya consumido, se asume
    robo y se **revocan todas las sesiones** del usuario.
- **Endpoints:** `POST /auth/login` (emite ambos), `POST /auth/refresh`
  (rota), `POST /auth/logout` (revoca el refresh del usuario).
- **Alternativas consideradas:**
  - *Refresh token JWT stateless*: más simple, pero **no se puede revocar** sin
    una lista de bloqueo (que igual es una tabla), así que no aporta ventaja.
  - *Solo access token*: sin renovación; obliga a sesiones largas o re-login
    frecuente.
- **Por qué así:** el refresh opaco + hash en DB permite revocación real,
  rotación y detección de reuso, y demuestra modelado SQL, índices y
  transacciones (la rotación consume el token viejo y emite el nuevo en una
  única transacción).
- **Trade-off:** el access token sigue siendo stateless; tras un logout muere
  como máximo en su TTL (`15m`). Se acota la ventana a propósito con un access
  corto.

## Supuestos y trade-offs

- **Autorización con `roleId` en el JWT**: el access token es stateless y lleva
  `roleId`/`roleName`; `JwtStrategy.validate()` no revalida contra la DB. El
  *enforcement* de tipos sí es data-driven en cada request (lee
  `role_type_access` con ese `roleId`), pero **revocar un tipo, cambiar de rol
  o desactivar al usuario no surte efecto hasta que expire el access token
  (≤15 min)**. Mitigación propuesta: revalidar rol/usuario en `validate()` o
  token-version. La **renovación y el cierre de sesión** sí están resueltos con
  refresh tokens rotativos (ver D5).
- **Dos planos de autorización**: `role_type_access` gobierna el **plano de
  datos** (qué tipos de recurso se ven/reservan) de forma 100% data-driven. Los
  endpoints de administración (`POST /resources`, `PATCH /:id/status`,
  `GET /users`) siguen usando `@Roles('admin')` como **plano de gestión**; un
  RBAC por permisos de acción (`role_permissions`) queda documentado como
  extensión.
- **Observabilidad**: solo pino con redacción. Sin tracing ni métricas
  avanzadas.
- **CI**: pendiente de justificación; se agrega si entra en el cronograma.

## PostgreSQL / SQL

### Modelo de datos (7 tablas)

El siguiente diagrama de entidades (Mermaid) resume el modelo relacional:

```mermaid
erDiagram
    roles ||--o{ users : "asigna"
    roles ||--o{ role_type_access : "accede"
    type_resources ||--o{ role_type_access : "concede"
    type_resources ||--o{ resources : "clasifica"
    resources ||--o{ reservations : "reservado"
    users ||--o{ reservations : "solicita"
    users ||--o{ refresh_tokens : "sesiones"

    roles {
        int id PK
        varchar name UK
        text description
        boolean is_active
    }
    users {
        int id PK
        varchar email UK
        varchar password_hash
        varchar name
        int role_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    type_resources {
        int id PK
        varchar name UK
        text description
    }
    role_type_access {
        int role_id PK,FK
        int type_resource_id PK,FK
    }
    resources {
        int id PK
        varchar name UK
        text description
        int type_id FK
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }
    reservations {
        int id PK
        int resource_id FK
        int user_id FK
        timestamptz start_time
        timestamptz end_time
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }
    refresh_tokens {
        int id PK
        int user_id FK
        char token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        int replaced_by_id FK
        varchar user_agent
        varchar ip
        timestamptz created_at
    }
```

Notas del modelo:

- `role_type_access` es **PK compuesta** (`role_id`, `type_resource_id`); define
  qué tipos de recurso puede ver/reservar cada rol.
- `refresh_tokens.replaced_by_id` es **auto-referencia** (cadena de rotación).
- `refresh_tokens.revoked_at` marca la revocación; `token_hash` tiene índice
  único.

### Sesiones: rotación de refresh tokens

- El token se guarda **hasheado (sha256)** en `refresh_tokens.token_hash`
  (índice único); el token crudo nunca se persiste.
- La rotación ocurre en **una transacción**: consume el token actual
  (`revoked_at = now()`) e inserta el nuevo, enlazándolos con
  `replaced_by_id`. Dos `/auth/refresh` concurrentes con el mismo token no
  pueden tener ambos éxito.
- Índice `(user_id, revoked_at)` para revocar todas las sesiones de un usuario
  ante reuso; índice `(expires_at)` para limpieza de tokens expirados.

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

# Insertar datos de prueba (roles, tipos, usuarios, recursos)
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

- **Unitarios: 14 tests** (4 suites) — entidad `RefreshToken`, helpers de
  token y casos de uso `RefreshTokenUseCase`/`LogoutUseCase` con repositorios
  fake (incluye el camino de reuso).
- **E2E: 78 tests** en 10 archivos (`resources`, `reservations`,
  `exception-filter`, `concurrency`, `security`, `availability`, `users-roles`,
  `type-resources`, `type-access`, `auth-sessions`).

Cubren: auth, CRUD, validaciones, ownership, time-range, exception filter,
concurrencia con `Promise.all` (2 users, mismo user ×2, N=10, ganador
verificado en DB), throttler, JWT inválido, control de acceso por tipo de
recurso (`role_type_access`), y **sesiones** (rotación de refresh, detección de
reuso con revocación total y logout).

## Despliegue

### Railway

1. Crear proyecto nuevo en Railway.
2. Agregar servicio Postgres (Railway provisiona la URL en `DATABASE_URL`).
3. Conectar repo y configurar variables de entorno:
   - `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET` → valor fuerte (≥32 chars)
   - `JWT_EXPIRES_IN` → `15m` (opcional; access token corto)
   - `REFRESH_TOKEN_TTL_DAYS` → `7` (opcional)
4. **Configurar Release Command** (Settings → Deploy → Release Command):

   ```bash
   npm run db:migrate && npm run db:seed
   ```

   Esto corre antes de cada deploy y aplica las migraciones `0000`–`0002`. Si
   solo es necesario migrar, usar `npm run db:migrate`; el seed es idempotente
   (`onConflictDoNothing`).
5. Railway detecta `Dockerfile` y construye.

### Seed manual en el servicio desplegado

Si la base del servicio queda sin datos de prueba (por ejemplo, cuando el
Release Command solo corrió las migraciones), se ejecuta el seed a mano desde
la consola del contenedor en Railway:

```bash
/app # npm run db:seed

> eiteck-resource-reservations@0.1.0 db:seed
> node dist/data/seeds/initial-seed.js

[seed] Insertando roles...
[seed] Insertando type_resources...
[seed] Reconstruyendo role_type_access (matriz de permisos)...
[seed] Insertando usuarios de prueba...
[seed] Insertando recursos de ejemplo...
[seed] Listo ✓
```

El seed es idempotente (`onConflictDoNothing` + reconstrucción de
`role_type_access`), por lo que puede ejecutarse nuevamente sin duplicar datos.

### Servicio desplegado

- **API:** <https://jorge-eiteck-prueba-tecnica-reservations-production.up.railway.app>
- **Swagger UI:** <https://jorge-eiteck-prueba-tecnica-reservations-production.up.railway.app/api/docs>
- **OpenAPI (JSON):** `.../api/docs-json`
- **Health:** <https://jorge-eiteck-prueba-tecnica-reservations-production.up.railway.app/health>

La documentación **OpenAPI/Swagger** expone y permite probar todos los
endpoints (botón `Authorize` para enviar el JWT `Bearer`).

> **Importante:** sin el Release Command, el contenedor arranca apuntando
> a una DB sin tablas y `/health` devuelve 200 (es un `SELECT 1` que no
> consulta tablas) aunque `/auth/login` tire 500.

## Comandos útiles

```bash
npm run start:dev     # dev con hot reload
npm run build         # build a dist/ (type-check estricto)
npm run start:prod    # producción (node dist/main)
npm test              # tests unitarios
npm run test:e2e      # tests e2e
npm run db:generate   # generar migración Drizzle desde el schema
npm run db:migrate    # aplicar migraciones
npm run db:push       # push directo del schema (solo dev)
npm run db:seed       # insertar roles, tipos, usuarios y recursos
npm run db:studio     # Drizzle Studio (GUI)
```

## Credenciales de prueba (seed)

Tras correr `npm run db:seed`:

| Rol         | Email                     | Password    | Tipos que ve            |
|-------------|---------------------------|-------------|-------------------------|
| `admin`     | `admin@eiteck.local`      | `admin123!` | Salas + Vehículos       |
| `user`      | `user@eiteck.local`       | `user123!`  | Solo Salas              |
| `user_plus` | `userplus@eiteck.local`   | `user123!`  | Salas + Vehículos       |

## Cómo probar (evaluador)

Base de producción:
`https://jorge-eiteck-prueba-tecnica-reservations-production.up.railway.app`

```bash
BASE=https://jorge-eiteck-prueba-tecnica-reservations-production.up.railway.app

# 1) Login: devuelve access_token + refresh_token
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"user@eiteck.local","password":"user123!"}'

# 2) Token de user (requiere jq)
ACCESS=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"user@eiteck.local","password":"user123!"}' | jq -r .access_token)

# 3) user ve SOLO salas
curl -s $BASE/resources -H "Authorization: Bearer $ACCESS"

# 4) user NO puede reservar un vehículo -> 403
#    (ajustá resourceId al id real del vehículo: GET /resources con admin)
curl -s -o /dev/null -w '%{http_code}\n' -X POST $BASE/reservations \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d '{"resourceId":3,"startTime":"2030-01-01T10:00:00.000Z","endTime":"2030-01-01T11:00:00.000Z"}'

# 5) user_plus ve salas + vehículos
ACCESS_PLUS=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"userplus@eiteck.local","password":"user123!"}' | jq -r .access_token)
curl -s $BASE/resources -H "Authorization: Bearer $ACCESS_PLUS"

# 6) Rotación: /auth/refresh devuelve un refresh_token NUEVO
REFRESH=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"user@eiteck.local","password":"user123!"}' | jq -r .refresh_token)
curl -s -X POST $BASE/auth/refresh -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}"

# 7) Reusar el refresh viejo -> 401 (y revoca todas las sesiones del usuario)
curl -s -o /dev/null -w '%{http_code}\n' -X POST $BASE/auth/refresh \
  -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$REFRESH\"}"

# 8) Logout -> 204
curl -s -o /dev/null -w '%{http_code}\n' -X POST $BASE/auth/logout \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}"
```

> Atajo: todo lo anterior también se puede probar desde **Swagger** en
> `/api/docs` (botón `Authorize` para enviar el JWT `Bearer`).