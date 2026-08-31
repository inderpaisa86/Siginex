CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE SCHEMA "siginex";
--> statement-breakpoint
CREATE TYPE "siginex"."estado_diag" AS ENUM('en_progreso', 'calculado', 'archivado');--> statement-breakpoint
CREATE TYPE "siginex"."estado_tarea" AS ENUM('pendiente', 'en_progreso', 'cerrada', 'vencida');--> statement-breakpoint
CREATE TYPE "siginex"."modo_diagnostico" AS ENUM('completo', 'rapido');--> statement-breakpoint
CREATE TYPE "siginex"."nivel_tecnologico" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "siginex"."origen_ruta" AS ENUM('interno', 'externo');--> statement-breakpoint
CREATE TYPE "siginex"."prioridad_reco" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "siginex"."tamano_empresa" AS ENUM('micro', 'pequena', 'mediana', 'grande');--> statement-breakpoint
CREATE TYPE "siginex"."tipo_pregunta" AS ENUM('si_no', 'escala', 'cero_uno_dos');--> statement-breakpoint
CREATE TYPE "siginex"."valor_respuesta" AS ENUM('0', '1', '2', 'si', 'no', 'na', 'sin_dato');--> statement-breakpoint
CREATE TABLE "siginex"."alerta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"tipo" text NOT NULL,
	"severidad" text NOT NULL,
	"titulo" text NOT NULL,
	"detalle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origen_id" text,
	"estado" text DEFAULT 'nueva' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"despachada_en" timestamp with time zone,
	CONSTRAINT "alerta_tipo_check" CHECK ("siginex"."alerta"."tipo" IN ('normativa','mercado','plan')),
	CONSTRAINT "alerta_severidad_check" CHECK ("siginex"."alerta"."severidad" IN ('critica','alta','media','informativa')),
	CONSTRAINT "alerta_estado_check" CHECK ("siginex"."alerta"."estado" IN ('nueva','despachada','resuelta'))
);
--> statement-breakpoint
CREATE TABLE "siginex"."diagnostico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"kb_version" text NOT NULL,
	"estado" "siginex"."estado_diag" DEFAULT 'en_progreso' NOT NULL,
	"modo" "siginex"."modo_diagnostico" DEFAULT 'completo' NOT NULL,
	"exigir_completitud" boolean DEFAULT false NOT NULL,
	"score_sgi" numeric(5, 2),
	"nivel_sgi" smallint,
	"cumplimiento_global" numeric(5, 2),
	"madurez_global" numeric(4, 2),
	"nivel_tecnologico" "siginex"."nivel_tecnologico",
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"completado_en" timestamp with time zone,
	"idempotency_key" text,
	CONSTRAINT "diagnostico_nivel_sgi_check" CHECK ("siginex"."diagnostico"."nivel_sgi" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "siginex"."evento_auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"actor" text,
	"accion" text NOT NULL,
	"entidad" text,
	"entidad_id" text,
	"payload" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siginex"."evidencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"respuesta_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"uri" text,
	"hash" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidencia_tipo_check" CHECK ("siginex"."evidencia"."tipo" IN ('url','archivo','nota'))
);
--> statement-breakpoint
CREATE TABLE "siginex"."kb_version" (
	"version" text PRIMARY KEY NOT NULL,
	"publicado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"checksum" text,
	"total_preguntas" integer,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "siginex"."market_signal" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text,
	"titulo" text NOT NULL,
	"fecha" date,
	"impacto" text,
	"fuente" text,
	"resumen" text,
	"ingerido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siginex"."normativa_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"modulo_sgi" text,
	"fuente" text,
	"tipo" text,
	"titulo" text NOT NULL,
	"fecha" date,
	"url" text,
	"estado" text,
	"relevancia" text,
	"resumen" text,
	"ingerido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siginex"."organizacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"nit" text,
	"sector" text,
	"tamano" "siginex"."tamano_empresa",
	"aplicabilidad" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siginex"."recomendacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"diagnostico_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"pregunta_id" text,
	"prioridad" "siginex"."prioridad_reco" NOT NULL,
	"score" numeric(5, 2),
	"texto" text NOT NULL,
	"acciones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"norma_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siginex"."respuesta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"diagnostico_id" uuid NOT NULL,
	"pregunta_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"tipo" "siginex"."tipo_pregunta" NOT NULL,
	"valor" "siginex"."valor_respuesta",
	"peso" numeric(8, 5),
	"evidencia_ref" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respuesta_diagnostico_pregunta_key" UNIQUE("diagnostico_id","pregunta_id")
);
--> statement-breakpoint
CREATE TABLE "siginex"."resultado_pilar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"diagnostico_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"score" numeric(5, 2),
	"nivel" smallint,
	"cumplimiento_pct" numeric(5, 2),
	"madurez_promedio" numeric(4, 2),
	"banda" text,
	"hallazgos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "resultado_pilar_diagnostico_skill_key" UNIQUE("diagnostico_id","skill_id"),
	CONSTRAINT "resultado_pilar_nivel_check" CHECK ("siginex"."resultado_pilar"."nivel" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "siginex"."ruta_aprendizaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"recomendacion_id" uuid,
	"diagnostico_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"brecha" text NOT NULL,
	"recurso_url" text,
	"origen" "siginex"."origen_ruta" DEFAULT 'interno' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siginex"."tarea_mejora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"diagnostico_id" uuid NOT NULL,
	"recomendacion_id" uuid,
	"skill_id" text NOT NULL,
	"pregunta_id" text,
	"brecha" text NOT NULL,
	"accion" text NOT NULL,
	"norma_ref" text,
	"prioridad" "siginex"."prioridad_reco" NOT NULL,
	"responsable" text,
	"plazo_dias" integer,
	"fecha_limite" date,
	"esfuerzo" text,
	"fase" smallint,
	"criterio_cierre" text,
	"estado" "siginex"."estado_tarea" DEFAULT 'pendiente' NOT NULL,
	"ruta_aprendizaje_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cerrado_en" timestamp with time zone,
	CONSTRAINT "tarea_mejora_esfuerzo_check" CHECK ("siginex"."tarea_mejora"."esfuerzo" IN ('Alto','Medio','Bajo')),
	CONSTRAINT "tarea_mejora_fase_check" CHECK ("siginex"."tarea_mejora"."fase" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE TABLE "siginex"."tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "siginex"."alerta" ADD CONSTRAINT "alerta_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."diagnostico" ADD CONSTRAINT "diagnostico_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."diagnostico" ADD CONSTRAINT "diagnostico_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "siginex"."organizacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."diagnostico" ADD CONSTRAINT "diagnostico_kb_version_kb_version_version_fk" FOREIGN KEY ("kb_version") REFERENCES "siginex"."kb_version"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."evidencia" ADD CONSTRAINT "evidencia_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."organizacion" ADD CONSTRAINT "organizacion_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."recomendacion" ADD CONSTRAINT "recomendacion_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."recomendacion" ADD CONSTRAINT "recomendacion_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "siginex"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."respuesta" ADD CONSTRAINT "respuesta_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."respuesta" ADD CONSTRAINT "respuesta_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "siginex"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."resultado_pilar" ADD CONSTRAINT "resultado_pilar_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."resultado_pilar" ADD CONSTRAINT "resultado_pilar_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "siginex"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."ruta_aprendizaje" ADD CONSTRAINT "ruta_aprendizaje_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."ruta_aprendizaje" ADD CONSTRAINT "ruta_aprendizaje_recomendacion_id_recomendacion_id_fk" FOREIGN KEY ("recomendacion_id") REFERENCES "siginex"."recomendacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."ruta_aprendizaje" ADD CONSTRAINT "ruta_aprendizaje_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "siginex"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."tarea_mejora" ADD CONSTRAINT "tarea_mejora_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "siginex"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."tarea_mejora" ADD CONSTRAINT "tarea_mejora_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "siginex"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."tarea_mejora" ADD CONSTRAINT "tarea_mejora_recomendacion_id_recomendacion_id_fk" FOREIGN KEY ("recomendacion_id") REFERENCES "siginex"."recomendacion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."tarea_mejora" ADD CONSTRAINT "tarea_mejora_ruta_aprendizaje_id_ruta_aprendizaje_id_fk" FOREIGN KEY ("ruta_aprendizaje_id") REFERENCES "siginex"."ruta_aprendizaje"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_alerta_estado" ON "siginex"."alerta" USING btree ("estado","severidad","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_diag_tenant" ON "siginex"."diagnostico" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ix_diag_org" ON "siginex"."diagnostico" USING btree ("organizacion_id","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_diag_idem" ON "siginex"."diagnostico" USING btree ("tenant_id","idempotency_key") WHERE idempotency_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_evt_tenant" ON "siginex"."evento_auditoria" USING btree ("tenant_id","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_evid_resp" ON "siginex"."evidencia" USING btree ("respuesta_id");--> statement-breakpoint
CREATE INDEX "ix_norm_modulo" ON "siginex"."normativa_entry" USING btree ("modulo_sgi","estado");--> statement-breakpoint
CREATE INDEX "ix_org_tenant" ON "siginex"."organizacion" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ix_org_sector" ON "siginex"."organizacion" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "ix_org_nombre_trgm" ON "siginex"."organizacion" USING gin ("nombre" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ix_reco_diag" ON "siginex"."recomendacion" USING btree ("diagnostico_id","prioridad");--> statement-breakpoint
CREATE INDEX "ix_resp_diag" ON "siginex"."respuesta" USING btree ("diagnostico_id");--> statement-breakpoint
CREATE INDEX "ix_resp_skill" ON "siginex"."respuesta" USING btree ("diagnostico_id","skill_id");--> statement-breakpoint
CREATE INDEX "ix_respil_diag" ON "siginex"."resultado_pilar" USING btree ("diagnostico_id");--> statement-breakpoint
CREATE INDEX "ix_ruta_diag" ON "siginex"."ruta_aprendizaje" USING btree ("diagnostico_id");--> statement-breakpoint
CREATE INDEX "ix_tarea_diag" ON "siginex"."tarea_mejora" USING btree ("diagnostico_id","prioridad");--> statement-breakpoint
CREATE INDEX "ix_tarea_estado" ON "siginex"."tarea_mejora" USING btree ("estado","fecha_limite");

--> statement-breakpoint
-- =====================================================================
-- FKs circulares respuesta <-> evidencia (aplicadas aquí, tras crear ambas)
-- =====================================================================
ALTER TABLE "siginex"."evidencia" ADD CONSTRAINT "evidencia_respuesta_id_fkey" FOREIGN KEY ("respuesta_id") REFERENCES "siginex"."respuesta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siginex"."respuesta" ADD CONSTRAINT "fk_resp_evid" FOREIGN KEY ("evidencia_ref") REFERENCES "siginex"."evidencia"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- =====================================================================
-- Row-Level Security (aislamiento por tenant)
--   La app fija:  SELECT set_config('app.tenant_id', '<uuid>', true)  por transacción.
-- =====================================================================
CREATE OR REPLACE FUNCTION "siginex".current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizacion','diagnostico','respuesta','evidencia',
    'resultado_pilar','recomendacion','ruta_aprendizaje','tarea_mejora'
  ] LOOP
    EXECUTE format('ALTER TABLE siginex.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE siginex.%I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON siginex.%I
      USING (tenant_id = siginex.current_tenant())
      WITH CHECK (tenant_id = siginex.current_tenant());
    $f$, t);
  END LOOP;
END $$;--> statement-breakpoint
-- =====================================================================
-- Vista de conveniencia: última foto por organización
-- =====================================================================
CREATE VIEW "siginex"."v_ultimo_diagnostico" AS
SELECT DISTINCT ON (organizacion_id)
       organizacion_id, id AS diagnostico_id, score_sgi, nivel_sgi,
       cumplimiento_global, kb_version, completado_en
FROM   "siginex"."diagnostico"
WHERE  estado = 'calculado'
ORDER  BY organizacion_id, completado_en DESC NULLS LAST;--> statement-breakpoint
-- =====================================================================
-- Semilla de versión de KB (banco de referencia; ajustar checksum en despliegue)
-- =====================================================================
INSERT INTO "siginex"."kb_version"(version, total_preguntas, notas)
VALUES ('3.0.0', 521, 'Banco de referencia (artefacto "500"); SST=60 oficiales Res. 0312')
ON CONFLICT (version) DO NOTHING;
