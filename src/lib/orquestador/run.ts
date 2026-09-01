import type { Kb, ModuloKb } from "@/lib/dominio/kb/banco";
import type { ModuloId } from "@/lib/dominio/modulos";
import { aplica } from "./aplicabilidad";
import { levelFor, round2 } from "./scoring";
import { RESP, esLegal, rutaFor, calcularBenchmark } from "./motores";
import type {
  Alerta,
  Brecha,
  OrquestadorCompany,
  ResultadoConsolidado,
  ResultadoModulo,
  RutaAprendizajePlan,
  TareaPlan,
  ValorRespuesta,
} from "./tipos";

/**
 * Orquestador de SIGINEX — pipeline de diagnóstico de punta a punta.
 * Portado 1:1 de reference/siginex_orchestrator.py::run().
 *
 * Orden: aplicabilidad -> scoring -> recomendaciones -> plan -> adopción ->
 * benchmark (opcional) -> consolidar -> alertas (opcional).
 * Determinista: mismo (kb, company, answers) -> mismo resultado.
 */
export function run(
  kb: Kb,
  company: OrquestadorCompany,
  answers: Record<string, ValorRespuesta>,
): ResultadoConsolidado {
  const profile = company.aplicabilidad ?? {};
  const mods = kb.modulos;

  const perModulo: ResultadoModulo[] = [];
  const brechas: Brecha[] = [];
  const plan: TareaPlan[] = [];
  const alertas: Alerta[] = [];
  const aprend = new Map<
    string,
    { competencia: string; modulo: ModuloId; brechas: number; prioridad: number }
  >();

  let answeredTot = 0;
  let aplicTot = 0;

  for (const m of mods) {
    const apq = m.preguntas.filter((q) => aplica(q, profile));
    aplicTot += apq.length;
    let num = 0;
    let den = 0;
    let answered = 0;

    for (const q of apq) {
      const v = answers[q.id];
      if (v === undefined || v === null) continue;
      answered += 1;
      if (v === "na") continue;

      const valor = v as 0 | 1 | 2;
      num += (valor / 2) * q.peso;
      den += q.peso;

      if (valor < 2) {
        const legal = esLegal(q.norma);
        // prioridad: alta si 0 o norma legal; media en el resto de casos con 1.
        const prioridad: "alta" | "media" =
          valor === 0 || legal ? "alta" : "media";

        brechas.push({
          modulo: m.id,
          pregunta_id: q.id,
          brecha: q.pregunta,
          norma: q.norma,
          evaluacion: valor as 0 | 1,
          prioridad,
        });

        const dias = prioridad === "alta" ? 30 : 90;
        plan.push({
          modulo: m.id,
          pregunta_id: q.id,
          accion: q.recomendacion[String(valor)] ?? "",
          responsable: RESP[m.id],
          prioridad,
          plazo_dias: dias,
          fase: prioridad === "alta" ? 1 : 2,
          norma: q.norma,
          criterio_cierre:
            "Evidencia verificable del requisito, vigente y trazable.",
        });

        const comp = rutaFor(m.id, q);
        if (comp) {
          const existente = aprend.get(comp);
          if (!existente) {
            aprend.set(comp, {
              competencia: comp,
              modulo: m.id,
              brechas: 1,
              prioridad: valor === 0 ? 0 : 1,
            });
          } else {
            existente.brechas += 1;
            if (valor === 0) existente.prioridad = 0;
          }
        }
      }
    }

    answeredTot += answered;
    const compPct = den > 0 ? (num / den) * 100 : null;
    perModulo.push({
      modulo: m.id,
      nombre: m.nombre ?? m.short ?? m.id,
      cumplimiento: compPct !== null ? round2(compPct) : null,
      nivel: levelFor(compPct),
      respondidas: answered,
      aplicables: apq.length,
    });
  }

  // Global ponderado por peso de módulo (renormalizado sobre los evaluados).
  const pesoDe = (id: ModuloId) =>
    (mods.find((mm) => mm.id === id) as ModuloKb).weight;
  const ev = perModulo.filter((p) => p.cumplimiento !== null);
  const gw = ev.reduce((a, p) => a + pesoDe(p.modulo), 0);
  const gs = ev.reduce((a, p) => a + (p.cumplimiento as number) * pesoDe(p.modulo), 0);
  const score = gw > 0 ? round2(gs / gw) : 0;
  const nivelSgi = levelFor(score);

  // Ordenar plan: primero prioridad alta.
  plan.sort((a, b) => (a.prioridad === "alta" ? 0 : 1) - (b.prioridad === "alta" ? 0 : 1));

  // Adopción: ordenar por prioridad (0 antes que 1) y luego por más brechas.
  const planAprendizaje: RutaAprendizajePlan[] = [...aprend.values()]
    .sort((a, b) => a.prioridad - b.prioridad || b.brechas - a.brechas)
    .map((r) => ({
      competencia: r.competencia,
      modulo: r.modulo,
      nivel: r.prioridad === 0 ? "Básico" : "Intermedio",
      brechas: r.brechas,
      origen: "interno" as const,
    }));

  // Benchmark (opcional).
  const nt = company.nivel_tecnologico;
  const benchmark: ResultadoConsolidado["benchmark"] = nt
    ? calcularBenchmark(nt)
    : null;

  // Alertas (brechas críticas).
  const criticas = brechas.filter((b) => b.prioridad === "alta");
  if (criticas.length > 0) {
    alertas.push({
      tipo: "plan",
      severidad: "alta",
      titulo: "Brechas de alta prioridad detectadas",
      detalle: { cantidad: criticas.length },
    });
  }

  return {
    kb_version: kb.kb_version,
    organizacion: {
      nombre: company.nombre,
      sector: company.sector,
      tamano: company.tamano,
    },
    aplicabilidad: profile,
    resultado: {
      score_sgi: score,
      nivel_sgi: nivelSgi,
      cumplimiento_global: score,
      por_modulo: perModulo,
    },
    brechas,
    plan_mejora: plan,
    plan_aprendizaje: planAprendizaje,
    benchmark,
    alertas,
    meta: {
      preguntas_aplicables: aplicTot,
      respondidas: answeredTot,
      generado_en: new Date().toISOString(),
    },
  };
}

const CLAVES_REQUERIDAS = [
  "kb_version",
  "organizacion",
  "aplicabilidad",
  "resultado",
  "brechas",
  "plan_mejora",
  "plan_aprendizaje",
  "benchmark",
  "alertas",
  "meta",
] as const;

/**
 * Valida la integridad del contrato de salida. Devuelve la lista de claves
 * faltantes o problemas; debe ser [] antes de devolver el resultado.
 */
export function validarContrato(r: ResultadoConsolidado): string[] {
  const faltan: string[] = CLAVES_REQUERIDAS.filter((k) => !(k in r));
  if (r.resultado.por_modulo.length !== 9) {
    faltan.push("por_modulo.length !== 9");
  }
  return faltan;
}
