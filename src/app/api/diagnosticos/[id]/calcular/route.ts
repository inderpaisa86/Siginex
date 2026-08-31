import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { withTenantRoute, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import {
  diagnostico,
  organizacion,
  respuesta,
  resultadoPilar,
  recomendacion,
  tareaMejora,
  rutaAprendizaje,
  eventoAuditoria,
} from "@/lib/db/schema";
import type { TenantTx } from "@/lib/db/tenant";
import { KB } from "@/lib/dominio/kb/banco";
import { aplicabilidadSchema, APLICABILIDAD_DEFAULT } from "@/lib/dominio/aplicabilidad";
import { run, validarContrato } from "@/lib/orquestador";
import type { ValorRespuesta } from "@/lib/orquestador";

export const dynamic = "force-dynamic";

const IDEMPOTENCY_HEADER = "idempotency-key";

/** Convierte el valor del enum de la BD al valor que consume el orquestador. */
function aValorOrquestador(v: string | null): ValorRespuesta | undefined {
  switch (v) {
    case "0":
      return 0;
    case "1":
      return 1;
    case "2":
      return 2;
    case "si":
      return 2;
    case "no":
      return 0;
    case "na":
      return "na";
    case "sin_dato":
    case null:
    default:
      return undefined; // no responde -> no cuenta
  }
}

// POST /diagnosticos/{id}/calcular — ejecuta el pipeline y persiste resultados.
export const POST = withTenantRoute("diagnosticos:write", async (request, { auth, tx }, params) => {
  const id = requireUuidParam(params.id, "Diagnóstico");
  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER);

  const [diag] = await tx
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);
  if (!diag) throw ApiError.notFound("Diagnóstico no encontrado.");

  // Idempotencia: si ya se calculó con la misma clave, devolver lo persistido.
  if (
    idempotencyKey &&
    diag.idempotencyKey === idempotencyKey &&
    diag.estado === "calculado"
  ) {
    return NextResponse.json(await leerResultado(tx, id));
  }

  const [org] = await tx
    .select()
    .from(organizacion)
    .where(eq(organizacion.id, diag.organizacionId))
    .limit(1);
  if (!org) throw ApiError.notFound("Organización no encontrada.");

  // Cargar respuestas del diagnóstico -> mapa pregunta_id -> valor.
  const resp = await tx
    .select({ preguntaId: respuesta.preguntaId, valor: respuesta.valor })
    .from(respuesta)
    .where(eq(respuesta.diagnosticoId, id));

  const answers: Record<string, ValorRespuesta> = {};
  for (const r of resp) {
    const v = aValorOrquestador(r.valor);
    if (v !== undefined) answers[r.preguntaId] = v;
  }

  // Perfil de aplicabilidad de la organización (con defaults si falta).
  const parsedAplic = aplicabilidadSchema.safeParse(org.aplicabilidad ?? {});
  const aplicabilidad = {
    ...APLICABILIDAD_DEFAULT,
    ...(parsedAplic.success ? parsedAplic.data : {}),
  };

  // Ejecutar el orquestador.
  const resultado = run(
    KB,
    {
      nombre: org.nombre,
      sector: org.sector ?? undefined,
      tamano: org.tamano ?? undefined,
      nivel_tecnologico: diag.nivelTecnologico
        ? (Number(diag.nivelTecnologico) as 1 | 2 | 3 | 4 | 5)
        : undefined,
      aplicabilidad,
    },
    answers,
  );

  const faltan = validarContrato(resultado);
  if (faltan.length) {
    throw new Error(`Contrato de salida inválido: ${faltan.join(", ")}`);
  }

  // Persistencia: limpiar resultados previos y reescribir (recálculo idempotente).
  await tx.delete(resultadoPilar).where(eq(resultadoPilar.diagnosticoId, id));
  await tx.delete(tareaMejora).where(eq(tareaMejora.diagnosticoId, id));
  await tx.delete(rutaAprendizaje).where(eq(rutaAprendizaje.diagnosticoId, id));
  await tx.delete(recomendacion).where(eq(recomendacion.diagnosticoId, id));

  // resultado_pilar (uno por módulo).
  for (const p of resultado.resultado.por_modulo) {
    await tx.insert(resultadoPilar).values({
      tenantId: auth.tenantId,
      diagnosticoId: id,
      skillId: p.modulo,
      cumplimientoPct: p.cumplimiento !== null ? String(p.cumplimiento) : null,
      nivel: p.nivel ? p.nivel.n : null,
      score: p.cumplimiento !== null ? String(p.cumplimiento) : null,
      banda: p.nivel ? p.nivel.nombre : null,
    });
  }

  // recomendacion (una por brecha) y su tarea de mejora asociada.
  for (const b of resultado.brechas) {
    const [reco] = await tx
      .insert(recomendacion)
      .values({
        tenantId: auth.tenantId,
        diagnosticoId: id,
        skillId: b.modulo,
        preguntaId: b.pregunta_id,
        prioridad: b.prioridad,
        texto: b.brecha,
        normaRefs: b.norma ? [b.norma] : [],
      })
      .returning({ id: recomendacion.id });

    const tarea = resultado.plan_mejora.find((t) => t.pregunta_id === b.pregunta_id);
    if (tarea) {
      await tx.insert(tareaMejora).values({
        tenantId: auth.tenantId,
        diagnosticoId: id,
        recomendacionId: reco.id,
        skillId: tarea.modulo,
        preguntaId: tarea.pregunta_id,
        brecha: b.brecha,
        accion: tarea.accion,
        normaRef: tarea.norma,
        prioridad: tarea.prioridad,
        responsable: tarea.responsable,
        plazoDias: tarea.plazo_dias,
        fase: tarea.fase,
        criterioCierre: tarea.criterio_cierre,
      });
    }
  }

  // ruta_aprendizaje (por competencia).
  for (const r of resultado.plan_aprendizaje) {
    await tx.insert(rutaAprendizaje).values({
      tenantId: auth.tenantId,
      diagnosticoId: id,
      skillId: r.modulo,
      brecha: r.competencia,
      origen: r.origen,
    });
  }

  // Actualizar el diagnóstico a calculado.
  await tx
    .update(diagnostico)
    .set({
      estado: "calculado",
      scoreSgi: String(resultado.resultado.score_sgi),
      nivelSgi: resultado.resultado.nivel_sgi?.n ?? null,
      cumplimientoGlobal: String(resultado.resultado.cumplimiento_global),
      completadoEn: new Date(),
      idempotencyKey: idempotencyKey ?? diag.idempotencyKey,
    })
    .where(eq(diagnostico.id, id));

  // Auditoría.
  await tx.insert(eventoAuditoria).values({
    tenantId: auth.tenantId,
    actor: "api",
    accion: "diagnostico.calculado",
    entidad: "diagnostico",
    entidadId: id,
    payload: {
      kb_version: resultado.kb_version,
      score_sgi: resultado.resultado.score_sgi,
      brechas: resultado.brechas.length,
    },
  });

  return NextResponse.json(resultado);
});

/** Relee el resultado persistido (para respuestas idempotentes). */
async function leerResultado(tx: TenantTx, id: string) {
  const [diag] = await tx
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);
  const pilares = await tx
    .select()
    .from(resultadoPilar)
    .where(and(eq(resultadoPilar.diagnosticoId, id)));
  return {
    diagnostico_id: id,
    kb_version: diag?.kbVersion,
    score_sgi: diag?.scoreSgi,
    nivel_sgi: diag?.nivelSgi,
    cumplimiento_global: diag?.cumplimientoGlobal,
    pilares,
  };
}
