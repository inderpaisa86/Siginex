// Seed inicial de SIGINEX: crea un tenant y una API key para poder usar la API.
//
// Uso:  node --env-file=.env scripts/seed.mjs [slug] [nombre]
//   slug   (opcional) identificador del tenant. Default: "dqnexus".
//   nombre (opcional) nombre del tenant.        Default: "DQnexus".
//
// Imprime, UNA sola vez, la API key en claro: guárdala, no se puede recuperar
// después (solo se almacena su hash SHA-256).
import postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL (usa: node --env-file=.env scripts/seed.mjs)");
  process.exit(1);
}

const slug = process.argv[2] ?? "dqnexus";
const nombre = process.argv[3] ?? "DQnexus";

// Todos los scopes de la API (equivalentes a src/lib/api/auth.ts).
const SCOPES = [
  "kb:read",
  "market:read",
  "diagnosticos:read",
  "diagnosticos:write",
  "normativa:read",
];

const sql = postgres(DATABASE_URL, { connection: { search_path: "siginex,public" } });

function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

try {
  // Tenant (idempotente por slug).
  const [tenant] = await sql`
    INSERT INTO siginex.tenant (nombre, slug)
    VALUES (${nombre}, ${slug})
    ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id, slug
  `;

  // API key: se genera una nueva y se guarda solo su hash.
  const apiKeyPlano = `sgx_${randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(apiKeyPlano);

  await sql`
    INSERT INTO siginex.api_key (tenant_id, key_hash, nombre, scopes)
    VALUES (${tenant.id}, ${keyHash}, ${"seed key"}, ${JSON.stringify(SCOPES)}::jsonb)
  `;

  console.log("\n=== Seed completado ===");
  console.log("Tenant:");
  console.log("  slug:      ", tenant.slug);
  console.log("  X-Tenant-Id:", tenant.id);
  console.log("\nAPI key (guárdala ahora, no se vuelve a mostrar):");
  console.log("  X-Api-Key: ", apiKeyPlano);
  console.log("\nEjemplo:");
  console.log(
    `  curl -H "X-Api-Key: ${apiKeyPlano}" -H "X-Tenant-Id: ${tenant.id}" http://localhost:3000/api/diagnosticos`,
  );
  console.log("");
} catch (err) {
  console.error("Error en el seed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
