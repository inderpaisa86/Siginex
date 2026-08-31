import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apiKey } from "@/lib/db/schema";
import { ApiError } from "./errors";

/** Scopes de la API (equivalentes a los del OpenAPI de referencia). */
export type Scope =
  | "kb:read"
  | "market:read"
  | "diagnosticos:read"
  | "diagnosticos:write"
  | "normativa:read";

export interface AuthContext {
  tenantId: string;
  scopes: Scope[];
}

const API_KEY_HEADER = "x-api-key";
const TENANT_HEADER = "x-tenant-id";

/** Hash SHA-256 en hex de la API key (nunca se guarda la key en claro). */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Resuelve y valida las credenciales de una petición de negocio.
 *
 * - 400 si falta X-Tenant-Id o no es un UUID.
 * - 401 si falta o es inválida la X-Api-Key (revocada, inexistente).
 * - 404-equivalente vía 401: si la key es válida pero el X-Tenant-Id no
 *   coincide con el tenant de la key, se rechaza (no se revela cross-tenant).
 *
 * Devuelve el tenant y los scopes para que el handler los use y fije la RLS.
 */
export async function resolveAuth(request: Request): Promise<AuthContext> {
  const rawKey = request.headers.get(API_KEY_HEADER);
  const tenantId = request.headers.get(TENANT_HEADER);

  if (!tenantId) {
    throw ApiError.badRequest("Falta la cabecera X-Tenant-Id.");
  }
  if (!isUuid(tenantId)) {
    throw ApiError.badRequest("X-Tenant-Id no es un UUID válido.");
  }
  if (!rawKey) {
    throw ApiError.unauthorized("Falta la cabecera X-Api-Key.");
  }

  const rows = await db
    .select({
      tenantId: apiKey.tenantId,
      activa: apiKey.activa,
      scopes: apiKey.scopes,
    })
    .from(apiKey)
    .where(eq(apiKey.keyHash, hashApiKey(rawKey)))
    .limit(1);

  const row = rows[0];
  if (!row || !row.activa) {
    throw ApiError.unauthorized();
  }
  // La key debe pertenecer al tenant declarado (no revelar cross-tenant).
  if (row.tenantId !== tenantId) {
    throw ApiError.unauthorized();
  }

  return {
    tenantId: row.tenantId,
    scopes: (row.scopes as Scope[]) ?? [],
  };
}

/** Lanza 403 si el contexto no incluye el scope requerido. */
export function requireScope(ctx: AuthContext, scope: Scope): void {
  if (!ctx.scopes.includes(scope)) {
    throw ApiError.forbidden(`Se requiere el permiso '${scope}'.`);
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
