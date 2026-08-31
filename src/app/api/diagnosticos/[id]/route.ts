import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withTenantRoute, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { diagnostico } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// GET /diagnosticos/{id}
export const GET = withTenantRoute("diagnosticos:read", async (_request, { tx }, params) => {
  const id = requireUuidParam(params.id, "Diagnóstico");

  const [row] = await tx
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);

  if (!row) throw ApiError.notFound("Diagnóstico no encontrado.");

  return NextResponse.json(row);
});
