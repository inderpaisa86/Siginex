import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withTenantRoute, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { diagnostico, rutaAprendizaje } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// GET /diagnosticos/{id}/rutas-aprendizaje — origen siempre visible (interno).
export const GET = withTenantRoute("diagnosticos:read", async (_request, { tx }, params) => {
  const id = requireUuidParam(params.id, "Diagnóstico");

  const [diag] = await tx
    .select({ id: diagnostico.id })
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);
  if (!diag) throw ApiError.notFound("Diagnóstico no encontrado.");

  const rows = await tx
    .select()
    .from(rutaAprendizaje)
    .where(eq(rutaAprendizaje.diagnosticoId, id));

  return NextResponse.json(rows);
});
