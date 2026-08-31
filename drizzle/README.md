# Migraciones de SIGINEX (Drizzle)

Fuente de verdad del modelo: `reference/siginex-schema.sql` (DDL 1.1.1).

## `0000_init.sql`

Generada con `npm run db:generate` a partir de `src/lib/db/schema.ts`, y luego
**editada a mano** para añadir lo que drizzle-kit no gestiona automáticamente:

1. **Extensiones** `pgcrypto` y `pg_trgm` (al inicio) — necesarias para
   `gen_random_uuid()` y el índice trigram `gin_trgm_ops`.
2. **FKs circulares** `evidencia.respuesta_id → respuesta.id` y
   `respuesta.evidencia_ref → evidencia.id` (al final, tras crear ambas tablas).
3. **Row-Level Security**: función `siginex.current_tenant()` + `ENABLE`/`FORCE`
   RLS + política `tenant_isolation` en las 8 tablas con `tenant_id` de negocio.
4. **Vista** `v_ultimo_diagnostico`.
5. **Seed** de `kb_version` (3.0.0).

## Importante para futuras migraciones

El snapshot en `meta/` NO conoce los elementos añadidos a mano (RLS, vista,
FKs circulares, extensiones). Al correr `db:generate` de nuevo, revisa el diff
generado: si drizzle-kit intenta recrear o borrar algo de lo anterior, ajústalo
manualmente. Estos elementos se gestionan fuera del schema de Drizzle a
propósito.

## Aplicar

Con `DATABASE_URL` apuntando a un Postgres (ver `.env`):

```bash
npm run db:migrate
```

## Verificación pendiente

La migración aún no se ha aplicado contra un Postgres real (no hay Docker/PG en
la máquina de desarrollo). Debe validarse en la VM Oracle o con Docker Desktop:
aplicar la migración y comprobar tablas, tipos, constraints y políticas RLS
contra el DDL de referencia (test de esquema de la spec `plataforma-datos-api`).
