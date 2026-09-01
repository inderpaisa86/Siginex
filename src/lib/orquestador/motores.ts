import type { ModuloId } from "@/lib/dominio/modulos";
import type { PreguntaKb } from "@/lib/dominio/kb/banco";

/**
 * Constantes y funciones auxiliares de los motores del pipeline, portadas 1:1
 * de siginex_orchestrator.py (RESP, ADOPT, BENCH_*, es_legal, ruta_for).
 */

/** Responsable sugerido por módulo. */
export const RESP: Record<ModuloId, string> = {
  sst: "Responsable del SG-SST",
  ambiental: "Coordinador Ambiental / HSEQ",
  calidad: "Líder de Calidad",
  riesgos: "Oficial de Riesgos / Continuidad",
  cumplimiento: "Oficial de Cumplimiento",
  datos: "Oficial de Protección de Datos / Seguridad de la Información",
  gobierno: "Secretaría General / Gobierno Corporativo",
  esg: "Líder de Sostenibilidad / ESG",
  gobernanza_ia: "Responsable de Gobernanza de IA",
};

/** Catálogo de competencias de adopción por módulo (competencia, disparadores). */
type CompetenciaAdopcion = [competencia: string, disparadores: string[]];

export const ADOPT: Record<ModuloId, CompetenciaAdopcion[]> = {
  sst: [
    ["Fundamentos del SG-SST", []],
    ["Identificación de peligros y valoración de riesgos (IPER)", ["peligro", "iper", "riesgo"]],
    ["Investigación de incidentes e indicadores de SST", ["incidente", "accidente", "indicador"]],
  ],
  ambiental: [
    ["Gestión ambiental ISO 14001", []],
    ["Cumplimiento legal ambiental y permisos", ["permiso", "licencia", "legal", "631", "vertimiento"]],
    ["Gestión de residuos y uso eficiente de recursos", ["residuo", "respel", "agua", "energía"]],
  ],
  calidad: [
    ["Sistema de gestión de calidad ISO 9001", []],
    ["Enfoque a procesos e indicadores", ["proceso", "indicador", "satisfacción"]],
    ["Auditoría interna y mejora continua", ["auditoría", "no conformidad", "mejora", "revisión"]],
  ],
  riesgos: [
    ["Gestión de riesgos ISO 31000", []],
    ["Continuidad del negocio ISO 22301", ["continuidad", "22301", "bia"]],
    ["Prevención LA/FT (SAGRLAFT/SARLAFT)", ["saglaft", "sarlaft", "la/ft", "lavado", "supersociedades"]],
  ],
  cumplimiento: [
    ["Cumplimiento legal y matriz de requisitos", []],
    ["Programa de Transparencia y Ética Empresarial (PTEE)", ["ptee", "transparencia", "2195"]],
    ["Anticorrupción y debida diligencia", ["anticorrup", "1474", "debida diligencia"]],
  ],
  datos: [
    ["Protección de datos personales (Ley 1581)", ["1581", "dato", "rnbd", "titular", "autoriz"]],
    ["Seguridad de la información ISO 27001", ["27001", "seguridad", "control", "acceso"]],
    ["Gestión de incidentes de seguridad", ["incidente"]],
  ],
  gobierno: [
    ["Gobierno corporativo y ética", []],
    ["Antisoborno ISO 37001", ["soborno", "37001", "regalo", "conflicto"]],
    ["Control interno y rendición de cuentas", ["control interno", "coso", "transparencia", "rendición", "1712"]],
  ],
  esg: [
    ["Fundamentos de sostenibilidad y ESG", []],
    ["Reporte de sostenibilidad (NIIF S1/S2, GRI)", ["reporte", "divulga", "niif", "gri", "emisor", "031"]],
    ["Gestión de riesgos ASG y clima", ["riesgo", "clima", "emisi", "material", "escenario"]],
  ],
  gobernanza_ia: [
    ["Fundamentos de gobernanza de IA (ISO 42001)", []],
    ["Evaluación de impacto y riesgos de IA", ["impacto", "aia", "riesgo", "ciclo"]],
    ["Datos, sesgos y transparencia en IA", ["dato", "sesgo", "transparen", "explica", "supervis", "seguridad"]],
  ],
};

/** Niveles tecnológicos de las 9 herramientas del mercado (Benchmark_SGI_Tools). */
export const BENCH_NIVELES = [3, 3, 2, 2, 4, 4, 5, 4, 5];

export const BENCH_RECO: Record<number, string> = {
  1: "Digitalice el SGI: pase de papel/Excel a una plataforma integrada.",
  2: "Consolide en una sola plataforma integrada (nivel 3) y elimine silos.",
  3: "Automatice flujos, alertas e indicadores (nivel 4) e incorpore analítica.",
  4: "Incorpore inteligencia (nivel 5): IA para vigilancia, priorización y recomendaciones.",
  5: "Manténgase a la vanguardia: orqueste IA sobre los datos del SGI (predicción y benchmarking).",
};

/** True si la norma es de tipo legal (ley/decreto/resolución/circular). */
export function esLegal(norma?: string): boolean {
  const n = (norma ?? "").toLowerCase();
  return ["ley", "decreto", "resolución", "resolucion", "circular"].some((k) =>
    n.includes(k),
  );
}

/**
 * Devuelve la competencia de adopción para una pregunta con brecha, según los
 * disparadores del catálogo (portado de ruta_for). Si ningún disparador matchea,
 * usa la primera competencia del módulo (la genérica).
 */
export function rutaFor(mid: ModuloId, q: PreguntaKb): string | null {
  const cat = ADOPT[mid];
  if (!cat) return null;
  const s = [q.requisito, q.pregunta, q.norma].join(" ").toLowerCase();
  let route = cat[0][0];
  for (const [comp, trig] of cat) {
    if (trig.length && trig.some((t) => s.includes(t))) {
      route = comp;
      break;
    }
  }
  return route;
}

/**
 * Calcula el benchmark de mercado para un nivel tecnológico (1-5): compara a la
 * empresa contra las 9 herramientas del mercado (BENCH_NIVELES). Función pura,
 * reutilizada por run() y por el endpoint/servicio de benchmark.
 */
export interface BenchmarkResult {
  nivel_empresa: number;
  promedio_mercado: number;
  rango_mercado: [number, number];
  herramientas_por_encima: number;
  brecha_al_lider: number;
  recomendacion: string;
}

export function calcularBenchmark(nivel: number): BenchmarkResult {
  const prom = BENCH_NIVELES.reduce((a, b) => a + b, 0) / BENCH_NIVELES.length;
  return {
    nivel_empresa: nivel,
    promedio_mercado: Math.round(prom * 10) / 10,
    rango_mercado: [Math.min(...BENCH_NIVELES), Math.max(...BENCH_NIVELES)],
    herramientas_por_encima: BENCH_NIVELES.filter((x) => x > nivel).length,
    brecha_al_lider: Math.max(...BENCH_NIVELES) - nivel,
    recomendacion: BENCH_RECO[nivel] ?? "",
  };
}
