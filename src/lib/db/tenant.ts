import { sql } from "drizzle-orm";
import { db, type Database } from "./client";

/** Tipo del cliente transaccional que expone Drizzle dentro de db.transaction(). */
export type TenantTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Ejecuta una unidad de trabajo con el tenant activo fijado para la sesión,
 * de modo que la Row-Level Security de PostgreSQL aísle los datos.
 *
 * Implementación: abre una transacción de Drizzle y fija `app.tenant_id` con
 * `set_config(..., is_local => true)`, que solo vive dentro de esa transacción.
 * Así, aunque el pool reutilice la conexión para otra petición después, el
 * valor no se filtra (a diferencia de un `SET` de sesión). La política RLS del
 * DDL de referencia compara `tenant_id = current_tenant()`, donde
 * `current_tenant()` lee ese setting.
 *
 * Prohibido pasar `tenant_id` como parámetro de negocio manipulable por el
 * cliente: el tenant se resuelve en el borde (API key / header) y se fija aquí.
 *
 * @param tenantId UUID del tenant resuelto por la capa de autenticación.
 * @param work     Función que recibe el cliente Drizzle ligado a la transacción.
 */
export async function withTenant<T>(
  tenantId: string,
  work: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  if (!isUuid(tenantId)) {
    throw new Error("tenantId inválido: se esperaba un UUID.");
  }

  return db.transaction(async (tx) => {
    // is_local = true → el setting vive solo dentro de esta transacción.
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return work(tx);
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
