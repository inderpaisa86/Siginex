import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withTenantRoute, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { diagnostico, recomendacion } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PRIORIDADES = ["alta", "media", "baja"] as const;
type Prioridad = (typeof PRIORIDADES)[number];

// GET /diagnosticos/{id}/recomendaciones?prioridad=alta|media|baja
export const GET = withTenantRoute("diagnosticos:read", async (request, { tx }, params) => {
  const id = requireUuidParam(params.id, "Diagnóstico");

  const [diag] = await tx
    .select({ id: diagnostico.id })
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);
  if (!diag) throw ApiError.notFound("Diagnóstico no encontrado.");

  const url = new URL(request.url);
  const prioridadParam = url.searchParams.get("prioridad");
  const prioridad = PRIORIDADES.includes(prioridadParam as Prioridad)
    ? (prioridadParam as Prioridad)
    : null;

  const cond = prioridad
    ? and(eq(recomendacion.diagnosticoId, id), eq(recomendacion.prioridad, prioridad))
    : eq(recomendacion.diagnosticoId, id);

  const rows = await tx.select().from(recomendacion).where(cond);

  return NextResponse.json(rows);
});
