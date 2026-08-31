import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { resolveAuth, requireScope, type AuthContext, type Scope } from "./auth";
import { ApiError, toErrorResponse } from "./errors";
import { withTenant, type TenantTx } from "@/lib/db/tenant";

/** Contexto que recibe un handler de negocio. */
export interface RouteContext {
  auth: AuthContext;
  tx: TenantTx;
}

/**
 * Envuelve un handler de API de negocio:
 *  1. Resuelve y valida la autenticación (API key + tenant).
 *  2. Verifica el scope requerido (si se indica).
 *  3. Ejecuta el handler dentro de withTenant() para que la RLS aísle el tenant.
 *  4. Traduce cualquier error a la respuesta uniforme.
 */
export function withTenantRoute(
  scope: Scope | null,
  handler: (
    request: Request,
    ctx: RouteContext,
    params: Record<string, string>,
  ) => Promise<NextResponse>,
) {
  return async (
    request: Request,
    segmentData: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const auth = await resolveAuth(request);
      if (scope) requireScope(auth, scope);
      const params = segmentData?.params ? await segmentData.params : {};
      return await withTenant(auth.tenantId, (tx) =>
        handler(request, { auth, tx }, params),
      );
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/**
 * Envuelve un handler público (sin tenant ni API key): KB y meta.
 * Solo traduce errores.
 */
export function publicRoute(
  handler: (
    request: Request,
    params: Record<string, string>,
  ) => Promise<NextResponse>,
) {
  return async (
    request: Request,
    segmentData: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const params = segmentData?.params ? await segmentData.params : {};
      return await handler(request, params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Parsea y valida el cuerpo JSON con un esquema Zod. 400 si no es JSON; 422 si no valida. */
export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw ApiError.badRequest("El cuerpo no es JSON válido.");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map(
      (i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`,
    );
    throw ApiError.validation("El cuerpo no cumple el esquema.", details);
  }
  return result.data;
}

/** Valida un UUID de parámetro de ruta; 404 si no es válido (no revelar). */
export function requireUuidParam(value: string | undefined, nombre: string): string {
  const schema = z.string().uuid();
  const r = schema.safeParse(value);
  if (!r.success) {
    throw ApiError.notFound(`${nombre} no encontrado.`);
  }
  return r.data;
}
