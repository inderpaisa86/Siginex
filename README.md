# SIGINEX

Capa de inteligencia de **DQnexus** para el autodiagnóstico del Sistema de
Gestión Integral (SGI): 9 módulos, banco de preguntas, motor de scoring con
aplicabilidad, orquestador, plan de mejora, benchmarking y vigilancia.

App fullstack en **Next.js (App Router) + TypeScript**, **PostgreSQL** con
**Drizzle ORM** y despliegue en **Docker**. Ver `../.kiro/steering/` para el
contexto de producto, stack y estructura, y `../reference/` para la
implementación de referencia (fuente de verdad funcional).

## Requisitos

- Node.js 22+ (probado con 24)
- PostgreSQL 16 (local, Docker, o la VM Oracle)

## Desarrollo local

```bash
cp .env.example .env        # ajusta DATABASE_URL y SIGINEX_API_KEYS
npm install
npm run db:migrate          # aplica las migraciones de Drizzle
npm run dev                 # http://localhost:3000
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (standalone) |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera migración desde `src/lib/db/schema.ts` |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:push` | Sincroniza el schema (solo desarrollo) |
| `npm run db:studio` | Drizzle Studio |

## Despliegue en pruebas (Docker / VM Oracle)

```bash
cp .env.example .env        # ajusta credenciales
docker compose up -d --build
docker compose run --rm migrate   # aplica migraciones
```

- `web` → app Next.js en modo standalone (puerto 3000)
- `db` → PostgreSQL 16 con volumen persistente
- `migrate` → servicio efímero que aplica las migraciones de Drizzle

Health check: `GET /api/health`.

## Arquitectura de datos y multi-tenant

El modelo vive en el schema `siginex` (ver `drizzle/`). El aislamiento entre
organizaciones se hace con **Row-Level Security forzada** de PostgreSQL: todo
acceso de negocio pasa por `withTenant()` (`src/lib/db/tenant.ts`), que fija
`app.tenant_id` por transacción. Nunca se pasa `tenant_id` como parámetro
manipulable por el cliente.

## Aviso

Resultado orientativo. No sustituye la autoevaluación oficial de estándares
mínimos, una auditoría formal ni un concepto legal.
