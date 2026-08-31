import type { ModuloId } from "@/lib/dominio/modulos";
import type { Aplicabilidad } from "@/lib/dominio/aplicabilidad";

/** Valor de respuesta que consume el orquestador. */
export type ValorRespuesta = 0 | 1 | 2 | "na";

export interface OrquestadorCompany {
  nombre?: string;
  sector?: string;
  tamano?: "micro" | "pequena" | "mediana" | "grande";
  nivel_tecnologico?: 1 | 2 | 3 | 4 | 5;
  aplicabilidad: Aplicabilidad;
}

export interface Nivel {
  n: number;
  nombre: string;
}

export interface ResultadoModulo {
  modulo: ModuloId;
  nombre: string;
  cumplimiento: number | null;
  nivel: Nivel | null;
  respondidas: number;
  aplicables: number;
}

export interface Brecha {
  modulo: ModuloId;
  pregunta_id: string;
  brecha: string;
  norma?: string;
  evaluacion: 0 | 1;
  prioridad: "alta" | "media";
}

export interface TareaPlan {
  modulo: ModuloId;
  pregunta_id: string;
  accion: string;
  responsable: string;
  prioridad: "alta" | "media";
  plazo_dias: number;
  fase: 1 | 2 | 3;
  norma?: string;
  criterio_cierre: string;
}

export interface RutaAprendizajePlan {
  competencia: string;
  modulo: ModuloId;
  nivel: "Básico" | "Intermedio";
  brechas: number;
  origen: "interno";
}

export interface Benchmark {
  nivel_empresa: number;
  promedio_mercado: number;
  rango_mercado: [number, number];
  herramientas_por_encima: number;
  brecha_al_lider: number;
  recomendacion: string;
}

export interface Alerta {
  tipo: "plan" | "normativa" | "mercado";
  severidad: "critica" | "alta" | "media" | "informativa";
  titulo: string;
  detalle: Record<string, unknown>;
}

export interface ResultadoConsolidado {
  kb_version: string;
  organizacion: { nombre?: string; sector?: string; tamano?: string };
  aplicabilidad: Aplicabilidad;
  resultado: {
    score_sgi: number;
    nivel_sgi: Nivel | null;
    cumplimiento_global: number;
    por_modulo: ResultadoModulo[];
  };
  brechas: Brecha[];
  plan_mejora: TareaPlan[];
  plan_aprendizaje: RutaAprendizajePlan[];
  benchmark: Benchmark | null;
  alertas: Alerta[];
  meta: {
    preguntas_aplicables: number;
    respondidas: number;
    generado_en: string;
  };
}
