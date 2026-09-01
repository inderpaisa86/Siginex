import "server-only";

/**
 * Sesión de servidor para la UI (fase 1, sin login de usuarios).
 *
 * La UI corre server-side (server components / server actions) y accede a los
 * datos con el tenant fijado desde una variable de entorno del servidor. Así
 * la credencial nunca llega al navegador. En fase 2, este tenant vendrá del
 * usuario autenticado en vez de una variable de entorno.
 *
 * Config:
 *   SIGINEX_TENANT_ID  UUID del tenant que usa la UI (el creado por el seed).
 */

export function tenantActual(): string {
  const tenantId = process.env.SIGINEX_TENANT_ID;
  if (!tenantId) {
    throw new Error(
      "Falta SIGINEX_TENANT_ID: define el tenant que usa la UI (ver seed).",
    );
  }
  return tenantId;
}
