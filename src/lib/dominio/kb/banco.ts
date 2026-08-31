import bancoJson from "./banco.json";
import type { ModuloId } from "../modulos";

/**
 * Banco de conocimiento (KB) de SIGINEX, extraído del artefacto de referencia
 * a JSON versionado (ver scripts/extraer-banco.mjs). Es la entrada del
 * orquestador. Fuente de verdad del contenido: reference/*.
 */

export interface PreguntaKb {
  id: string;
  pregunta: string;
  norma: string;
  articulo: string;
  requisito: string;
  criterio: string;
  /** Peso relativo dentro del módulo. */
  peso: number;
  /** Texto de recomendación por valor de respuesta ("0" | "1" | "2"). */
  recomendacion: Record<string, string>;
}

export interface ModuloKb {
  id: ModuloId;
  nombre: string;
  short: string;
  /** Peso del módulo en el score global. */
  weight: number;
  escala: string | null;
  preguntas: PreguntaKb[];
}

export interface Kb {
  kb_version: string;
  total_preguntas: number;
  checksum: string;
  modulos: ModuloKb[];
}

export const KB: Kb = bancoJson as Kb;

/** Índice pregunta_id -> { modulo, pregunta } para acceso O(1). */
const INDICE = new Map<string, { modulo: ModuloKb; pregunta: PreguntaKb }>();
for (const modulo of KB.modulos) {
  for (const pregunta of modulo.preguntas) {
    INDICE.set(pregunta.id, { modulo, pregunta });
  }
}

export function preguntaPorId(id: string) {
  return INDICE.get(id);
}
