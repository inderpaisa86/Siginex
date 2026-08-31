import { defineConfig } from "drizzle-kit";

/**
 * Configuración de drizzle-kit para generar y aplicar migraciones.
 *
 * El schema (siginex) coincide con el DDL de referencia. Las políticas RLS y
 * la función current_tenant() se incluyen como SQL crudo en las migraciones
 * (drizzle-kit no las genera automáticamente).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["siginex"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
