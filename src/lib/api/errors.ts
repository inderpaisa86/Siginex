import { NextResponse } from "next/server";

/**
 * Manejo uniforme de errores de la API.
 *
 * Forma del cuerpo (alineada con el OpenAPI de referencia):
 *   { error: { code, message, details? } }
 *
 * Tabla de códigos (ver plataforma-datos-api/design.md):
 *   400 bad_request      — falta X-Tenant-Id, o body no es JSON válido
 *   401 unauthorized     — X-Api-Key inválida o revocada
 *   403 forbidden        — key válida sin el scope requerido
 *   404 not_found        — recurso inexistente o de otro tenant (no revelar)
 *   409 conflict         — conflicto de estado (p. ej. diagnóstico ya calculado)
 *   422 validation_error — el body no cumple el esquema
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_error"
  | "internal_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation_error: 422,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: string[];

  constructor(code: ApiErrorCode, message: string, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static badRequest(message = "Petición inválida.", details?: string[]) {
    return new ApiError("bad_request", message, details);
  }
  static unauthorized(message = "API key inválida o revocada.") {
    return new ApiError("unauthorized", message);
  }
  static forbidden(message = "La API key no tiene el permiso requerido.") {
    return new ApiError("forbidden", message);
  }
  static notFound(message = "Recurso no encontrado.") {
    return new ApiError("not_found", message);
  }
  static conflict(message = "Conflicto con el estado actual del recurso.") {
    return new ApiError("conflict", message);
  }
  static validation(message = "El cuerpo no cumple el esquema.", details?: string[]) {
    return new ApiError("validation_error", message, details);
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details ? { details: this.details } : {}),
        },
      },
      { status: this.status },
    );
  }
}

/**
 * Traduce cualquier excepción a una respuesta de error uniforme.
 * Las ApiError se mapean tal cual; el resto se degradan a 500 sin filtrar
 * detalles internos al cliente.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return err.toResponse();
  }
  console.error("[api] error no controlado:", err);
  return new ApiError(
    "internal_error",
    "Ocurrió un error interno.",
  ).toResponse();
}
