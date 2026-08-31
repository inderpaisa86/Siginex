import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { withTenantRoute, parseJson, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { diagnostico, respuesta, kbVersion } from "@/lib/db/schema";
import type { TenantTx } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

// Valor de respuesta según el contrato. El banco usa escala 0|1|2|na;
// el OpenAPI admite además si/no/sin_dato, que mapeamos al enum del schema.
const valorRespuesta = z.enum(["0", "1", "2", "si", "no", "na", "sin_dato"]);

const respuestasInput = z.object({
  respuestas: z
    .array(
      z.object({
        pregunta_id: z.string().min(1),
        valor: valorRespuesta,
      }),
    )
    .min(1),
});

/**
 * Deriva el skill_id (módulo) del pregunta_id. En el banco de referencia los
 * ids tienen forma "<skill>-<seccion>" (p. ej. "sst-1.1.1"), por lo que el
 * módulo es el prefijo antes del primer guion. El peso real de cada pregunta
 * se completará cuando se cargue el banco versionado (spec diagnostico-sgi).
 */
function skillIdDe(preguntaId: string): string {
  const i = preguntaId.indexOf("-");
  return i > 0 ? preguntaId.slice(0, i) : preguntaId;
}

async function totalPreguntasVigente(tx: TenantTx, version: string): Promise<number | null> {
  const [row] = await tx
    .select({ total: kbVersion.totalPreguntas })
    .from(kbVersion)
    .where(eq(kbVersion.version, version))
    .limit(1);
  return row?.total ?? null;
}

// PUT /diagnosticos/{id}/respuestas — upsert por (diagnostico_id, pregunta_id).
export const PUT = withTenantRoute("diagnosticos:write", async (request, { auth, tx }, params) => {
  const id = requireUuidParam(params.id, "Diagnóstico");
  const input = await parseJson(request, respuestasInput);

  const [diag] = await tx
    .select({ estado: diagnostico.estado, kbVersion: diagnostico.kbVersion })
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);
  if (!diag) throw ApiError.notFound("Diagnóstico no encontrado.");

  // No se aceptan respuestas sobre un diagnóstico ya calculado.
  if (diag.estado === "calculado") {
    throw ApiError.conflict(
      "El diagnóstico ya está calculado; crea una nueva versión para responder.",
    );
  }

  // Upsert de cada respuesta (idempotente por diagnostico_id + pregunta_id).
  for (const r of input.respuestas) {
    await tx
      .insert(respuesta)
      .values({
        tenantId: auth.tenantId,
        diagnosticoId: id,
        preguntaId: r.pregunta_id,
        skillId: skillIdDe(r.pregunta_id),
        tipo: "cero_uno_dos",
        valor: r.valor,
      })
      .onConflictDoUpdate({
        target: [respuesta.diagnosticoId, respuesta.preguntaId],
        set: { valor: r.valor, actualizadoEn: sql`now()` },
      });
  }

  // Progreso: respuestas registradas sobre el total del banco vigente.
  const [{ respondidas }] = await tx
    .select({ respondidas: sql<number>`count(*)::int` })
    .from(respuesta)
    .where(and(eq(respuesta.diagnosticoId, id)));

  const total = await totalPreguntasVigente(tx, diag.kbVersion);
  const progresoPct =
    total && total > 0 ? Math.round((respondidas / total) * 10000) / 100 : 0;

  return NextResponse.json({
    diagnostico_id: id,
    total_preguntas: total,
    respondidas,
    progreso_pct: progresoPct,
  });
});
