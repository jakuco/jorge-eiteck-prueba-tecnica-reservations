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

## Supuestos y trade-offs

- **Refresh tokens**: simplificación inicial — solo access token con vida
  moderada (1 h). Renovación de sesión queda como mejora documentada.
- **Observabilidad**: solo pino con redacción. Sin tracing ni métricas
  avanzadas.
- **CI**: pendiente de justificación; se agrega si entra en el cronograma.

## PostgreSQL / SQL

> Esta sección se completa el día 2 con las decisiones de modelado, índices
> y estrategia de transacciones. Por ahora: pendiente.

## Pruebas

```bash
# Unit + integration
npm test

# Coverage
npm run test:cov
```

## Despliegue

### Railway

1. Crear proyecto nuevo en Railway.
2. Agregar servicio Postgres (Railway provisiona la URL en `DATABASE_URL`).
3. Conectar repo y configurar variables de entorno
   (`JWT_SECRET`, `JWT_EXPIRES_IN`).
4. Railway detecta `Dockerfile` y construye.

> URL de producción se documenta una vez desplegado.

## Comandos útiles

```bash
npm run start:dev     # dev con hot reload
npm run build         # build a dist/
npm run lint          # eslint
npm test              # correr tests
npm run db:generate   # generar migración Drizzle desde el schema
npm run db:migrate    # aplicar migraciones
npm run db:studio     # Drizzle Studio (GUI)
```