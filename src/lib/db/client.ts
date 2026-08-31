import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Cliente de base de datos de SIGINEX (Drizzle + postgres.js).
 *
 * Multi-tenant con Row-Level Security: NUNCA se debe usar este cliente
 * "crudo" para queries de negocio directamente. Todo acceso a datos de una
 * organización pasa por `withTenant()` (ver ./tenant.ts), que fija el tenant
 * activo de la sesión antes de cualquier query. Este cliente se usa solo para
 * operaciones sin tenant (health checks, consulta pública del KB, migraciones).
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta la variable de entorno DATABASE_URL (ver .env.example).",
  );
}

// Reutiliza la conexión en desarrollo para evitar agotar el pool con HMR.
const globalForDb = globalThis as unknown as {
  __siginexSql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb.__siginexSql ??
  postgres(connectionString, {
    max: 10,
    // El search_path coincide con el schema del DDL de referencia.
    connection: { search_path: "siginex,public" },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__siginexSql = sql;
}

export const db = drizzle(sql, { schema });

export type Database = typeof db;
