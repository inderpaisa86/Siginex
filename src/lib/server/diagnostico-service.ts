import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  organizacion,
  diagnostico,
  respuesta,
  resultadoPilar,
  recomendacion,
  tareaMejora,
  rutaAprendizaje,
  eventoAuditoria,
  kbVersion,
} from "@/lib/db/schema";
import { KB } from "@/lib/dominio/kb/banco";
import { APLICABILIDAD_DEFAULT, aplicabilidadSchema } from "@/lib/dominio/aplicabilidad";
import { run, validarContrato, type ValorRespuesta } from "@/lib/orquestador";
import { tenantActual } from "./sesion";

/**
 * Servicios de dominio para la UI (server-side). Reutilizan withTenant() para
 * que la RLS aísle el tenant. Toda la UI (server components / actions) pasa por
 * aquí; el tenant se resuelve de la sesión de servidor.
 */

export interface OrgResumen {
  id: string;
  nombre: string;
  sector: string | null;
  tamano: string | null;
}

export async function listarOrganizaciones(): Promise<OrgResumen[]> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: organizacion.id,
        nombre: organizacion.nombre,
        sector: organizacion.sector,
        tamano: organizacion.tamano,
      })
      .from(organizacion)
      .orderBy(desc(organizacion.creadoEn));
    return rows;
  });
}

export async function crearOrganizacion(input: {
  nombre: string;
  sector?: string;
  tamano?: "micro" | "pequena" | "mediana" | "grande";
}): Promise<string> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .insert(organizacion)
      .values({
        tenantId,
        nombre: input.nombre,
        sector: input.sector,
        tamano: input.tamano,
        aplicabilidad: {},
      })
      .returning({ id: organizacion.id });
    return row.id;
  });
}

async function kbVersionVigente(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
): Promise<string> {
  const [row] = await tx
    .select({ version: kbVersion.version })
    .from(kbVersion)
    .orderBy(desc(kbVersion.publicadoEn))
    .limit(1);
  return row?.version ?? "3.0.0";
}

/** Crea un diagnóstico para una organización y devuelve su id. */
export async function crearDiagnostico(organizacionId: string): Promise<string> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const [org] = await tx
      .select({ id: organizacion.id })
      .from(organizacion)
      .where(eq(organizacion.id, organizacionId))
      .limit(1);
    if (!org) throw new Error("Organización no encontrada.");

    const version = await kbVersionVigente(tx);
    const [row] = await tx
      .insert(diagnostico)
      .values({ tenantId, organizacionId, kbVersion: version })
      .returning({ id: diagnostico.id });
    return row.id;
  });
}

export interface DiagnosticoResumen {
  id: string;
  organizacionId: string;
  organizacionNombre: string;
  estado: string;
  scoreSgi: string | null;
  nivelSgi: number | null;
  creadoEn: Date;
}

export async function listarDiagnosticos(): Promise<DiagnosticoResumen[]> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: diagnostico.id,
        organizacionId: diagnostico.organizacionId,
        organizacionNombre: organizacion.nombre,
        estado: diagnostico.estado,
        scoreSgi: diagnostico.scoreSgi,
        nivelSgi: diagnostico.nivelSgi,
        creadoEn: diagnostico.creadoEn,
      })
      .from(diagnostico)
      .innerJoin(organizacion, eq(diagnostico.organizacionId, organizacion.id))
      .orderBy(desc(diagnostico.creadoEn));
    return rows;
  });
}

export interface DiagnosticoDetalle {
  id: string;
  organizacionId: string;
  organizacionNombre: string;
  estado: string;
  respuestas: Record<string, string>;
}

export async function obtenerDiagnostico(
  id: string,
): Promise<DiagnosticoDetalle | null> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const [diag] = await tx
      .select({
        id: diagnostico.id,
        organizacionId: diagnostico.organizacionId,
        organizacionNombre: organizacion.nombre,
        estado: diagnostico.estado,
      })
      .from(diagnostico)
      .innerJoin(organizacion, eq(diagnostico.organizacionId, organizacion.id))
      .where(eq(diagnostico.id, id))
      .limit(1);
    if (!diag) return null;

    const resp = await tx
      .select({ preguntaId: respuesta.preguntaId, valor: respuesta.valor })
      .from(respuesta)
      .where(eq(respuesta.diagnosticoId, id));

    const respuestas: Record<string, string> = {};
    for (const r of resp) if (r.valor) respuestas[r.preguntaId] = r.valor;

    return { ...diag, respuestas };
  });
}

/** Guarda (upsert) un lote de respuestas de un diagnóstico. */
export async function guardarRespuestas(
  diagnosticoId: string,
  respuestas: Array<{ preguntaId: string; valor: string }>,
): Promise<void> {
  const tenantId = tenantActual();
  await withTenant(tenantId, async (tx) => {
    for (const r of respuestas) {
      const i = r.preguntaId.indexOf("-");
      const skillId = i > 0 ? r.preguntaId.slice(0, i) : r.preguntaId;
      await tx
        .insert(respuesta)
        .values({
          tenantId,
          diagnosticoId,
          preguntaId: r.preguntaId,
          skillId,
          tipo: "cero_uno_dos",
          valor: r.valor as (typeof respuesta.valor.enumValues)[number],
        })
        .onConflictDoUpdate({
          target: [respuesta.diagnosticoId, respuesta.preguntaId],
          set: { valor: r.valor as (typeof respuesta.valor.enumValues)[number], actualizadoEn: sql`now()` },
        });
    }
  });
}

function aValorOrquestador(v: string | null): ValorRespuesta | undefined {
  switch (v) {
    case "0": return 0;
    case "1": return 1;
    case "2": return 2;
    case "si": return 2;
    case "no": return 0;
    case "na": return "na";
    default: return undefined;
  }
}

/** Ejecuta el orquestador sobre un diagnóstico y persiste los resultados. */
export async function calcularDiagnostico(diagnosticoId: string): Promise<void> {
  const tenantId = tenantActual();
  await withTenant(tenantId, async (tx) => {
    const [diag] = await tx
      .select()
      .from(diagnostico)
      .where(eq(diagnostico.id, diagnosticoId))
      .limit(1);
    if (!diag) throw new Error("Diagnóstico no encontrado.");

    const [org] = await tx
      .select()
      .from(organizacion)
      .where(eq(organizacion.id, diag.organizacionId))
      .limit(1);
    if (!org) throw new Error("Organización no encontrada.");

    const resp = await tx
      .select({ preguntaId: respuesta.preguntaId, valor: respuesta.valor })
      .from(respuesta)
      .where(eq(respuesta.diagnosticoId, diagnosticoId));
    const answers: Record<string, ValorRespuesta> = {};
    for (const r of resp) {
      const v = aValorOrquestador(r.valor);
      if (v !== undefined) answers[r.preguntaId] = v;
    }

    const parsed = aplicabilidadSchema.safeParse(org.aplicabilidad ?? {});
    const aplicabilidad = {
      ...APLICABILIDAD_DEFAULT,
      ...(parsed.success ? parsed.data : {}),
    };

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
    if (faltan.length) throw new Error(`Contrato inválido: ${faltan.join(", ")}`);

    // Reescribe resultados (recálculo idempotente).
    await tx.delete(resultadoPilar).where(eq(resultadoPilar.diagnosticoId, diagnosticoId));
    await tx.delete(tareaMejora).where(eq(tareaMejora.diagnosticoId, diagnosticoId));
    await tx.delete(rutaAprendizaje).where(eq(rutaAprendizaje.diagnosticoId, diagnosticoId));
    await tx.delete(recomendacion).where(eq(recomendacion.diagnosticoId, diagnosticoId));

    for (const p of resultado.resultado.por_modulo) {
      await tx.insert(resultadoPilar).values({
        tenantId,
        diagnosticoId,
        skillId: p.modulo,
        cumplimientoPct: p.cumplimiento !== null ? String(p.cumplimiento) : null,
        nivel: p.nivel ? p.nivel.n : null,
        score: p.cumplimiento !== null ? String(p.cumplimiento) : null,
        banda: p.nivel ? p.nivel.nombre : null,
      });
    }

    for (const b of resultado.brechas) {
      const [reco] = await tx
        .insert(recomendacion)
        .values({
          tenantId,
          diagnosticoId,
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
          tenantId,
          diagnosticoId,
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

    for (const r of resultado.plan_aprendizaje) {
      await tx.insert(rutaAprendizaje).values({
        tenantId,
        diagnosticoId,
        skillId: r.modulo,
        brecha: r.competencia,
        origen: r.origen,
      });
    }

    await tx
      .update(diagnostico)
      .set({
        estado: "calculado",
        scoreSgi: String(resultado.resultado.score_sgi),
        nivelSgi: resultado.resultado.nivel_sgi?.n ?? null,
        cumplimientoGlobal: String(resultado.resultado.cumplimiento_global),
        completadoEn: new Date(),
      })
      .where(eq(diagnostico.id, diagnosticoId));

    await tx.insert(eventoAuditoria).values({
      tenantId,
      actor: "ui",
      accion: "diagnostico.calculado",
      entidad: "diagnostico",
      entidadId: diagnosticoId,
      payload: { score_sgi: resultado.resultado.score_sgi, brechas: resultado.brechas.length },
    });
  });
}

export interface ResultadoUI {
  scoreSgi: string | null;
  nivelSgi: number | null;
  cumplimientoGlobal: string | null;
  organizacionNombre: string;
  pilares: Array<{
    skillId: string;
    cumplimientoPct: string | null;
    nivel: number | null;
    banda: string | null;
  }>;
  recomendaciones: Array<{
    skillId: string;
    prioridad: string;
    texto: string;
  }>;
}

export async function obtenerResultado(
  diagnosticoId: string,
): Promise<ResultadoUI | null> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const [diag] = await tx
      .select({
        scoreSgi: diagnostico.scoreSgi,
        nivelSgi: diagnostico.nivelSgi,
        cumplimientoGlobal: diagnostico.cumplimientoGlobal,
        organizacionNombre: organizacion.nombre,
      })
      .from(diagnostico)
      .innerJoin(organizacion, eq(diagnostico.organizacionId, organizacion.id))
      .where(eq(diagnostico.id, diagnosticoId))
      .limit(1);
    if (!diag) return null;

    const pilares = await tx
      .select({
        skillId: resultadoPilar.skillId,
        cumplimientoPct: resultadoPilar.cumplimientoPct,
        nivel: resultadoPilar.nivel,
        banda: resultadoPilar.banda,
      })
      .from(resultadoPilar)
      .where(eq(resultadoPilar.diagnosticoId, diagnosticoId));

    const recos = await tx
      .select({
        skillId: recomendacion.skillId,
        prioridad: recomendacion.prioridad,
        texto: recomendacion.texto,
      })
      .from(recomendacion)
      .where(and(eq(recomendacion.diagnosticoId, diagnosticoId), eq(recomendacion.prioridad, "alta")));

    return { ...diag, pilares, recomendaciones: recos };
  });
}

import { calcularBenchmark, type BenchmarkResult } from "@/lib/orquestador";

/**
 * Registra el nivel tecnológico de la empresa (1-5) en el diagnóstico y
 * devuelve la comparación con el mercado. Idempotente: sobrescribe el nivel.
 */
export async function registrarBenchmark(
  diagnosticoId: string,
  nivel: number,
): Promise<BenchmarkResult> {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) {
    throw new Error("El nivel tecnológico debe ser un entero de 1 a 5.");
  }
  const tenantId = tenantActual();
  await withTenant(tenantId, async (tx) => {
    await tx
      .update(diagnostico)
      .set({
        nivelTecnologico: String(nivel) as "1" | "2" | "3" | "4" | "5",
      })
      .where(eq(diagnostico.id, diagnosticoId));
  });
  return calcularBenchmark(nivel);
}

/** Devuelve el benchmark si el diagnóstico ya tiene nivel tecnológico declarado. */
export async function obtenerBenchmark(
  diagnosticoId: string,
): Promise<BenchmarkResult | null> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const [diag] = await tx
      .select({ nivelTecnologico: diagnostico.nivelTecnologico })
      .from(diagnostico)
      .where(eq(diagnostico.id, diagnosticoId))
      .limit(1);
    if (!diag?.nivelTecnologico) return null;
    return calcularBenchmark(Number(diag.nivelTecnologico));
  });
}

export interface TareaPlanUI {
  skillId: string;
  preguntaId: string | null;
  brecha: string;
  accion: string;
  normaRef: string | null;
  prioridad: string;
  responsable: string | null;
  plazoDias: number | null;
  fase: number | null;
  criterioCierre: string | null;
}

/** Devuelve las tareas del plan de mejora de un diagnóstico, priorizadas. */
export async function obtenerPlanMejora(
  diagnosticoId: string,
): Promise<TareaPlanUI[]> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        skillId: tareaMejora.skillId,
        preguntaId: tareaMejora.preguntaId,
        brecha: tareaMejora.brecha,
        accion: tareaMejora.accion,
        normaRef: tareaMejora.normaRef,
        prioridad: tareaMejora.prioridad,
        responsable: tareaMejora.responsable,
        plazoDias: tareaMejora.plazoDias,
        fase: tareaMejora.fase,
        criterioCierre: tareaMejora.criterioCierre,
      })
      .from(tareaMejora)
      .where(eq(tareaMejora.diagnosticoId, diagnosticoId))
      .orderBy(tareaMejora.prioridad, tareaMejora.skillId);
    return rows;
  });
}

/** Último diagnóstico calculado (para vistas que no reciben un id explícito). */
export async function ultimoDiagnosticoCalculado(): Promise<
  { id: string; organizacionNombre: string } | null
> {
  const tenantId = tenantActual();
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: diagnostico.id,
        organizacionNombre: organizacion.nombre,
      })
      .from(diagnostico)
      .innerJoin(organizacion, eq(diagnostico.organizacionId, organizacion.id))
      .where(eq(diagnostico.estado, "calculado"))
      .orderBy(desc(diagnostico.completadoEn))
      .limit(1);
    return row ?? null;
  });
}
