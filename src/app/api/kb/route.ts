import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { publicRoute } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db/client";
import { kbVersion } from "@/lib/db/schema";
import { MODULOS_SGI } from "@/lib/dominio/modulos";

export const dynamic = "force-dynamic";

/**
 * GET /kb — sirve el banco de conocimiento vigente. Público y cacheable por
 * ETag (checksum del banco, o la versión si no hay checksum). Si el cliente
 * envía If-None-Match con el ETag vigente, se responde 304 sin cuerpo.
 *
 * NOTA: por ahora sirve la metadata y la estructura de módulos (id, nombre,
 * peso, número de preguntas). Las preguntas completas se añadirán cuando el
 * banco se extraiga a un JSON versionado (spec diagnostico-sgi).
 */
export const GET = publicRoute(async (request) => {
  const [row] = await db
    .select()
    .from(kbVersion)
    .orderBy(desc(kbVersion.publicadoEn))
    .limit(1);

  if (!row) throw ApiError.notFound("No hay versión de KB publicada.");

  const etag = `"${row.checksum ?? row.version}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const bundle = {
    kb_version: row.version,
    total_preguntas: row.totalPreguntas,
    modulos: MODULOS_SGI.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      weight: m.peso,
      preguntas: [] as unknown[],
    })),
  };

  return NextResponse.json(bundle, {
    headers: { ETag: etag, "Cache-Control": "no-cache" },
  });
});
