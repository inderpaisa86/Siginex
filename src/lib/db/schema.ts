/**
 * Esquema Drizzle de SIGINEX.
 *
 * Fuente de verdad: `reference/siginex-schema.sql` (DDL 1.1.1).
 * Se preservan exactamente los nombres de schema, tablas, enums, columnas,
 * constraints e índices. La Row-Level Security forzada, la función
 * current_tenant() y la vista v_ultimo_diagnostico se aplican como SQL crudo
 * en la migración (drizzle-kit no las genera). Ver ./tenant.ts para cómo se
 * fija el tenant activo por transacción.
 *
 * Resultado orientativo: no sustituye auditoría formal ni concepto legal.
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  smallint,
  integer,
  date,
  jsonb,
  bigserial,
  index,
  uniqueIndex,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Todo el modelo vive en el schema `siginex` (igual que el DDL). */
export const siginex = pgSchema("siginex");

// ---------------------------------------------------------------------------
// Enumeraciones (idénticas al DDL)
// ---------------------------------------------------------------------------
export const tamanoEmpresa = siginex.enum("tamano_empresa", [
  "micro",
  "pequena",
  "mediana",
  "grande",
]);
export const modoDiagnostico = siginex.enum("modo_diagnostico", [
  "completo",
  "rapido",
]);
export const estadoDiag = siginex.enum("estado_diag", [
  "en_progreso",
  "calculado",
  "archivado",
]);
export const tipoPregunta = siginex.enum("tipo_pregunta", [
  "si_no",
  "escala",
  "cero_uno_dos",
]);
export const valorRespuesta = siginex.enum("valor_respuesta", [
  "0",
  "1",
  "2",
  "si",
  "no",
  "na",
  "sin_dato",
]);
export const prioridadReco = siginex.enum("prioridad_reco", [
  "alta",
  "media",
  "baja",
]);
export const origenRuta = siginex.enum("origen_ruta", ["interno", "externo"]);
export const nivelTecnologico = siginex.enum("nivel_tecnologico", [
  "1",
  "2",
  "3",
  "4",
  "5",
]);
export const estadoTarea = siginex.enum("estado_tarea", [
  "pendiente",
  "en_progreso",
  "cerrada",
  "vencida",
]);

// ---------------------------------------------------------------------------
// 0. TENANTS
// ---------------------------------------------------------------------------
export const tenant = siginex.table("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  slug: text("slug").notNull().unique(),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// 1. KB_VERSION
// ---------------------------------------------------------------------------
export const kbVersion = siginex.table("kb_version", {
  version: text("version").primaryKey(),
  publicadoEn: timestamp("publicado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
  checksum: text("checksum"),
  totalPreguntas: integer("total_preguntas"),
  notas: text("notas"),
});

// ---------------------------------------------------------------------------
// 2. ORGANIZACION
// ---------------------------------------------------------------------------
export const organizacion = siginex.table(
  "organizacion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    nit: text("nit"),
    sector: text("sector"),
    tamano: tamanoEmpresa("tamano"),
    aplicabilidad: jsonb("aplicabilidad")
      .notNull()
      .default(sql`'{}'::jsonb`),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_org_tenant").on(t.tenantId),
    index("ix_org_sector").on(t.sector),
    index("ix_org_nombre_trgm").using("gin", sql`${t.nombre} gin_trgm_ops`),
  ],
);

// ---------------------------------------------------------------------------
// 3. DIAGNOSTICO
// ---------------------------------------------------------------------------
export const diagnostico = siginex.table(
  "diagnostico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    organizacionId: uuid("organizacion_id")
      .notNull()
      .references(() => organizacion.id, { onDelete: "cascade" }),
    kbVersion: text("kb_version")
      .notNull()
      .references(() => kbVersion.version),
    estado: estadoDiag("estado").notNull().default("en_progreso"),
    modo: modoDiagnostico("modo").notNull().default("completo"),
    exigirCompletitud: boolean("exigir_completitud").notNull().default(false),
    scoreSgi: numeric("score_sgi", { precision: 5, scale: 2 }),
    nivelSgi: smallint("nivel_sgi"),
    cumplimientoGlobal: numeric("cumplimiento_global", {
      precision: 5,
      scale: 2,
    }),
    madurezGlobal: numeric("madurez_global", { precision: 4, scale: 2 }),
    nivelTecnologico: nivelTecnologico("nivel_tecnologico"),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completadoEn: timestamp("completado_en", { withTimezone: true }),
    idempotencyKey: text("idempotency_key"),
  },
  (t) => [
    check("diagnostico_nivel_sgi_check", sql`${t.nivelSgi} BETWEEN 1 AND 5`),
    index("ix_diag_tenant").on(t.tenantId),
    index("ix_diag_org").on(t.organizacionId, t.creadoEn.desc()),
    uniqueIndex("ux_diag_idem")
      .on(t.tenantId, t.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
  ],
);

// ---------------------------------------------------------------------------
// 5. EVIDENCIA  (definida antes de respuesta para la FK evidencia_ref)
// ---------------------------------------------------------------------------
export const evidencia = siginex.table(
  "evidencia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    // FK a respuesta(id) ON DELETE CASCADE: se aplica como SQL crudo en la
    // migración para romper la dependencia circular respuesta <-> evidencia.
    respuestaId: uuid("respuesta_id").notNull(),
    tipo: text("tipo").notNull(),
    uri: text("uri"),
    hash: text("hash"),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("evidencia_tipo_check", sql`${t.tipo} IN ('url','archivo','nota')`),
    index("ix_evid_resp").on(t.respuestaId),
  ],
);

// ---------------------------------------------------------------------------
// 4. RESPUESTA
// ---------------------------------------------------------------------------
export const respuesta = siginex.table(
  "respuesta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    diagnosticoId: uuid("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    preguntaId: text("pregunta_id").notNull(),
    skillId: text("skill_id").notNull(),
    tipo: tipoPregunta("tipo").notNull(),
    valor: valorRespuesta("valor"),
    peso: numeric("peso", { precision: 8, scale: 5 }),
    // FK a evidencia(id) ON DELETE SET NULL: se aplica como SQL crudo en la
    // migración para romper la dependencia circular respuesta <-> evidencia.
    evidenciaRef: uuid("evidencia_ref"),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("respuesta_diagnostico_pregunta_key").on(
      t.diagnosticoId,
      t.preguntaId,
    ),
    index("ix_resp_diag").on(t.diagnosticoId),
    index("ix_resp_skill").on(t.diagnosticoId, t.skillId),
  ],
);

// ---------------------------------------------------------------------------
// 6. RESULTADO_PILAR
// ---------------------------------------------------------------------------
export const resultadoPilar = siginex.table(
  "resultado_pilar",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    diagnosticoId: uuid("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    score: numeric("score", { precision: 5, scale: 2 }),
    nivel: smallint("nivel"),
    cumplimientoPct: numeric("cumplimiento_pct", { precision: 5, scale: 2 }),
    madurezPromedio: numeric("madurez_promedio", { precision: 4, scale: 2 }),
    banda: text("banda"),
    hallazgos: jsonb("hallazgos").notNull().default(sql`'[]'::jsonb`),
  },
  (t) => [
    check("resultado_pilar_nivel_check", sql`${t.nivel} BETWEEN 1 AND 5`),
    unique("resultado_pilar_diagnostico_skill_key").on(
      t.diagnosticoId,
      t.skillId,
    ),
    index("ix_respil_diag").on(t.diagnosticoId),
  ],
);

// ---------------------------------------------------------------------------
// 7. RECOMENDACION
// ---------------------------------------------------------------------------
export const recomendacion = siginex.table(
  "recomendacion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    diagnosticoId: uuid("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    preguntaId: text("pregunta_id"),
    prioridad: prioridadReco("prioridad").notNull(),
    score: numeric("score", { precision: 5, scale: 2 }),
    texto: text("texto").notNull(),
    acciones: jsonb("acciones").notNull().default(sql`'[]'::jsonb`),
    normaRefs: jsonb("norma_refs").notNull().default(sql`'[]'::jsonb`),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_reco_diag").on(t.diagnosticoId, t.prioridad)],
);

// ---------------------------------------------------------------------------
// 8. RUTA_APRENDIZAJE
// ---------------------------------------------------------------------------
export const rutaAprendizaje = siginex.table(
  "ruta_aprendizaje",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    recomendacionId: uuid("recomendacion_id").references(
      () => recomendacion.id,
      { onDelete: "cascade" },
    ),
    diagnosticoId: uuid("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    brecha: text("brecha").notNull(),
    recursoUrl: text("recurso_url"),
    origen: origenRuta("origen").notNull().default("interno"),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_ruta_diag").on(t.diagnosticoId)],
);

// ---------------------------------------------------------------------------
// 9. Vigilancia (feed normativo y de mercado)
// ---------------------------------------------------------------------------
export const normativaEntry = siginex.table(
  "normativa_entry",
  {
    id: text("id").primaryKey(),
    moduloSgi: text("modulo_sgi"),
    fuente: text("fuente"),
    tipo: text("tipo"),
    titulo: text("titulo").notNull(),
    fecha: date("fecha"),
    url: text("url"),
    estado: text("estado"),
    relevancia: text("relevancia"),
    resumen: text("resumen"),
    ingeridoEn: timestamp("ingerido_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_norm_modulo").on(t.moduloSgi, t.estado)],
);

export const marketSignal = siginex.table("market_signal", {
  id: text("id").primaryKey(),
  tipo: text("tipo"),
  titulo: text("titulo").notNull(),
  fecha: date("fecha"),
  impacto: text("impacto"),
  fuente: text("fuente"),
  resumen: text("resumen"),
  ingeridoEn: timestamp("ingerido_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// 10. Auditoría de eventos
// ---------------------------------------------------------------------------
export const eventoAuditoria = siginex.table(
  "evento_auditoria",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id"),
    actor: text("actor"),
    accion: text("accion").notNull(),
    entidad: text("entidad"),
    entidadId: text("entidad_id"),
    payload: jsonb("payload"),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_evt_tenant").on(t.tenantId, t.creadoEn.desc())],
);

// ---------------------------------------------------------------------------
// 10b. TAREA_MEJORA
// ---------------------------------------------------------------------------
export const tareaMejora = siginex.table(
  "tarea_mejora",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    diagnosticoId: uuid("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    recomendacionId: uuid("recomendacion_id").references(
      () => recomendacion.id,
      { onDelete: "set null" },
    ),
    skillId: text("skill_id").notNull(),
    preguntaId: text("pregunta_id"),
    brecha: text("brecha").notNull(),
    accion: text("accion").notNull(),
    normaRef: text("norma_ref"),
    prioridad: prioridadReco("prioridad").notNull(),
    responsable: text("responsable"),
    plazoDias: integer("plazo_dias"),
    fechaLimite: date("fecha_limite"),
    esfuerzo: text("esfuerzo"),
    fase: smallint("fase"),
    criterioCierre: text("criterio_cierre"),
    estado: estadoTarea("estado").notNull().default("pendiente"),
    rutaAprendizajeId: uuid("ruta_aprendizaje_id").references(
      () => rutaAprendizaje.id,
      { onDelete: "set null" },
    ),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
    cerradoEn: timestamp("cerrado_en", { withTimezone: true }),
  },
  (t) => [
    check("tarea_mejora_esfuerzo_check", sql`${t.esfuerzo} IN ('Alto','Medio','Bajo')`),
    check("tarea_mejora_fase_check", sql`${t.fase} BETWEEN 1 AND 3`),
    index("ix_tarea_diag").on(t.diagnosticoId, t.prioridad),
    index("ix_tarea_estado").on(t.estado, t.fechaLimite),
  ],
);

// ---------------------------------------------------------------------------
// 10c. ALERTA
// ---------------------------------------------------------------------------
export const alerta = siginex.table(
  "alerta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenant.id, {
      onDelete: "cascade",
    }),
    tipo: text("tipo").notNull(),
    severidad: text("severidad").notNull(),
    titulo: text("titulo").notNull(),
    detalle: jsonb("detalle").notNull().default(sql`'{}'::jsonb`),
    origenId: text("origen_id"),
    estado: text("estado").notNull().default("nueva"),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
    despachadaEn: timestamp("despachada_en", { withTimezone: true }),
  },
  (t) => [
    check("alerta_tipo_check", sql`${t.tipo} IN ('normativa','mercado','plan')`),
    check(
      "alerta_severidad_check",
      sql`${t.severidad} IN ('critica','alta','media','informativa')`,
    ),
    check(
      "alerta_estado_check",
      sql`${t.estado} IN ('nueva','despachada','resuelta')`,
    ),
    index("ix_alerta_estado").on(t.estado, t.severidad, t.creadoEn.desc()),
  ],
);
