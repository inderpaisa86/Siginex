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
 * La conexión se crea de forma PEREZOSA (lazy): no se abre al importar el
 * módulo, sino en el primer uso real. Así el build de Next/Vercel puede
 * cargar los route handlers sin necesitar DATABASE_URL en tiempo de build; la
 * variable solo hace falta cuando se ejecuta una query (en runtime).
 *
 * Multi-tenant con Row-Level Security: NUNCA usar este cliente "crudo" para
 * queries de negocio directamente. Todo acceso a datos de una organización
 * pasa por withTenant() (ver ./tenant.ts). El cliente crudo es solo para
 * operaciones sin tenant (health, KB público, migraciones, resolver API key).
 */

/** Ambos drivers exponen el mismo interfaz de Drizzle; unificamos el tipo. */
type DbCliente = ReturnType<typeof drizzlePg<typeof schema>>;

function crearDb(): DbCliente {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta la variable de entorno DATABASE_URL (ver .env.example).",
    );
  }

  const esNeon = /neon\.tech|neon\.build/.test(connectionString);
  if (esNeon) {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString });
    return drizzleNeon(pool, { schema }) as unknown as DbCliente;
  }
  const sql = postgres(connectionString, {
    max: 10,
    connection: { search_path: "siginex,public" },
  });
  return drizzlePg(sql, { schema });
}

// Cachea la instancia (también reutiliza entre invocaciones/HMR).
const globalForDb = globalThis as unknown as {
  __siginexDb?: DbCliente;
};

function obtenerDb(): DbCliente {
  if (!globalForDb.__siginexDb) {
    globalForDb.__siginexDb = crearDb();
  }
  return globalForDb.__siginexDb;
}

/**
 * `db` es un proxy perezoso: al usar cualquier método (db.select, db.transaction,
 * db.execute...) se crea la conexión la primera vez. Importar este módulo NO
 * abre conexión ni exige DATABASE_URL.
 */
export const db: DbCliente = new Proxy({} as DbCliente, {
  get(_target, prop, receiver) {
    const real = obtenerDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Database = DbCliente;
