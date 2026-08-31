import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { publicRoute } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db/client";
import { kbVersion } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// GET /meta/kb-version — versión vigente de la base de conocimiento (público).
export const GET = publicRoute(async () => {
  const [row] = await db
    .select()
    .from(kbVersion)
    .orderBy(desc(kbVersion.publicadoEn))
    .limit(1);

  if (!row) throw ApiError.notFound("No hay versión de KB publicada.");

  return NextResponse.json({
    version: row.version,
    publicado_en: row.publicadoEn,
    checksum: row.checksum,
    total_preguntas: row.totalPreguntas,
  });
});
