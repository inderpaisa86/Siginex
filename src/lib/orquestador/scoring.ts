import type { Nivel } from "./tipos";

/**
 * Mapeo de porcentaje de cumplimiento a nivel de madurez (1..5), portado 1:1
 * de siginex_orchestrator.py::level_for. Umbrales: <21, <41, <61, <81, resto.
 */
export function levelFor(pct: number | null): Nivel | null {
  if (pct === null) return null;
  if (pct < 21) return { n: 1, nombre: "Inicial" };
  if (pct < 41) return { n: 2, nombre: "Básico" };
  if (pct < 61) return { n: 3, nombre: "En desarrollo" };
  if (pct < 81) return { n: 4, nombre: "Optimizado" };
  return { n: 5, nombre: "Excelencia" };
}

/** Redondeo a 2 decimales (equivalente al round(x, 2) de Python). */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
