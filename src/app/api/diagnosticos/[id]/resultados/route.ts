import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withTenantRoute, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { diagnostico, resultadoPilar } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const DESCARGO =
  "Resultado orientativo. No sustituye auditoría formal ni concepto legal.";

// GET /diagnosticos/{id}/resultados — consolidado por módulo.
export const GET = withTenantRoute("diagnosticos:read", async (_request, { tx }, params) => {
  const id = requireUuidParam(params.id, "Diagnóstico");

  const [diag] = await tx
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);
  if (!diag) throw ApiError.notFound("Diagnóstico no encontrado.");

  const pilares = await tx
    .select()
    .from(resultadoPilar)
    .where(eq(resultadoPilar.diagnosticoId, id));

  return NextResponse.json({
    diagnostico_id: id,
    kb_version: diag.kbVersion,
    estado: diag.estado,
    score_sgi: diag.scoreSgi,
    nivel_sgi: diag.nivelSgi,
    cumplimiento_global_pct: diag.cumplimientoGlobal,
    madurez_global_1a5: diag.madurezGlobal,
    pilares,
    descargo: DESCARGO,
  });
});
