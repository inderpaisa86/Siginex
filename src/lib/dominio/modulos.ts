/**
 * Los 9 módulos del SGI (Sistema de Gestión Integral).
 *
 * Los `id` son la clave canónica del dominio y NUNCA deben traducirse ni
 * renombrarse en el código, aunque la UI muestre otro texto (ver product.md).
 * Los pesos suman 1.00.
 *
 * NOTA sobre el conteo: el artefacto de referencia se llama "500" y su
 * metadato declara `total_preguntas: 500`, pero el banco embebido contiene
 * realmente 521 preguntas (verificado parseando el HTML). Usamos el conteo
 * real por módulo. La `kb_version` de trabajo es "3.0.0".
 */

export const MODULO_IDS = [
  "sst",
  "ambiental",
  "calidad",
  "riesgos",
  "cumplimiento",
  "datos",
  "gobierno",
  "esg",
  "gobernanza_ia",
] as const;

export type ModuloId = (typeof MODULO_IDS)[number];

export interface ModuloSgi {
  /** Clave canónica del dominio. No traducir. */
  readonly id: ModuloId;
  /** Nombre para mostrar en la UI. */
  readonly nombre: string;
  /** Nombre corto para espacios reducidos (sidebar, chips). */
  readonly corto: string;
  /** Peso del módulo en el score global (Σ = 1.00). */
  readonly peso: number;
  /** Número de preguntas del banco (conteo real del artefacto de referencia). */
  readonly preguntas: number;
  /** Descripción breve del alcance del módulo. */
  readonly descripcion: string;
}

export const MODULOS_SGI: readonly ModuloSgi[] = [
  {
    id: "sst",
    nombre: "Seguridad y Salud en el Trabajo",
    corto: "SG-SST",
    peso: 0.18,
    preguntas: 60,
    descripcion:
      "60 ítems oficiales de Estándares Mínimos (Res. 0312/2019), Decreto 1072, ISO 45001.",
  },
  {
    id: "ambiental",
    nombre: "Gestión Ambiental",
    corto: "Ambiental",
    peso: 0.13,
    preguntas: 74,
    descripcion:
      "Gestión ambiental, cumplimiento legal, permisos y manejo de residuos (ISO 14001).",
  },
  {
    id: "calidad",
    nombre: "Gestión de Calidad",
    corto: "Calidad",
    peso: 0.12,
    preguntas: 73,
    descripcion:
      "Sistema de gestión de calidad, enfoque a procesos y mejora continua (ISO 9001).",
  },
  {
    id: "riesgos",
    nombre: "Gestión de Riesgos",
    corto: "Riesgos",
    peso: 0.15,
    preguntas: 74,
    descripcion:
      "Gestión de riesgos, continuidad del negocio y prevención LA/FT (ISO 31000/22301).",
  },
  {
    id: "cumplimiento",
    nombre: "Cumplimiento Legal",
    corto: "Cumplimiento",
    peso: 0.15,
    preguntas: 75,
    descripcion:
      "Cumplimiento legal, matriz de requisitos, PTEE y anticorrupción.",
  },
  {
    id: "datos",
    nombre: "Protección de Datos",
    corto: "Datos",
    peso: 0.15,
    preguntas: 74,
    descripcion:
      "Protección de datos personales (Ley 1581) y seguridad de la información (ISO 27001).",
  },
  {
    id: "gobierno",
    nombre: "Gobierno Corporativo",
    corto: "Gobierno",
    peso: 0.12,
    preguntas: 70,
    descripcion:
      "Gobierno corporativo, ética, antisoborno (ISO 37001) y control interno.",
  },
  {
    id: "esg",
    nombre: "Sostenibilidad / ESG",
    corto: "ESG",
    peso: 0.14,
    preguntas: 10,
    descripcion:
      "Fundamentos de sostenibilidad, reporte (NIIF S1/S2, GRI) y riesgos ASG/clima.",
  },
  {
    id: "gobernanza_ia",
    nombre: "Gobernanza de IA (ISO 42001)",
    corto: "Gob. IA",
    peso: 0.12,
    preguntas: 11,
    descripcion:
      "Gobernanza de IA (ISO 42001): evaluación de impacto, sesgos y transparencia.",
  },
] as const;

/** Total de preguntas del banco vigente (conteo real = 521). */
export const TOTAL_PREGUNTAS = MODULOS_SGI.reduce(
  (acc, m) => acc + m.preguntas,
  0,
);

/** Versión de la base de conocimiento con la que se calcula el diagnóstico. */
export const KB_VERSION = "3.0.0";
