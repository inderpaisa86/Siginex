import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { Pool, neonConfig } from "@neondatabase/serverless";
import postgres from "postgres";
import ws from "ws";
import * as schema from "./schema";

/**
 * Cliente de base de datos de SIGINEX (Drizzle).
 *
 * Soporta dos entornos con el mismo interfaz:
 *  - Neon serverless (producción en Vercel): driver neon-serverless por
 *    WebSocket, que SÍ soporta transacciones (necesarias para la RLS por
 *    tenant). Se activa cuando DATABASE_URL apunta a Neon.
 *  - PostgreSQL normal (local / Docker): driver postgres.js.
 *
 * Multi-tenant con Row-Level Security: NUNCA usar este cliente "crudo" para
 * queries de negocio directamente. Todo acceso a datos de una organización
 * pasa por withTenant() (ver ./tenant.ts). El cliente crudo es solo para
 * operaciones sin tenant (health, KB público, migraciones, resolver API key).
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta la variable de entorno DATABASE_URL (ver .env.example).",
  );
}

// Estrechado a string tras la validación (evita string | undefined aguas abajo).
const url: string = connectionString;
const esNeon = /neon\.tech|neon\.build/.test(url);

/**
 * Ambos drivers exponen el mismo interfaz de Drizzle (select/insert/transaction/
 * execute...). Unificamos el tipo con el del driver postgres.js para que el
 * resto del código no dependa del driver concreto.
 */
type DbCliente = ReturnType<typeof drizzlePg<typeof schema>>;

function crearDb(): DbCliente {
  if (esNeon) {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: url });
    return drizzleNeon(pool, { schema }) as unknown as DbCliente;
  }
  const sql = postgres(url, {
    max: 10,
    connection: { search_path: "siginex,public" },
  });
  return drizzlePg(sql, { schema });
}

// Reutiliza el cliente en desarrollo para no agotar el pool con HMR.
const globalForDb = globalThis as unknown as {
  __siginexDb?: DbCliente;
};

export const db: DbCliente = globalForDb.__siginexDb ?? crearDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__siginexDb = db;
}

export type Database = DbCliente;
