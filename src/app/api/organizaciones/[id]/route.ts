import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withTenantRoute, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { organizacion } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// GET /organizaciones/{id} — la RLS garantiza que solo se ve la del tenant activo.
export const GET = withTenantRoute("diagnosticos:read", async (_request, { tx }, params) => {
  const id = requireUuidParam(params.id, "Organización");

  const [row] = await tx
    .select()
    .from(organizacion)
    .where(eq(organizacion.id, id))
    .limit(1);

  if (!row) throw ApiError.notFound("Organización no encontrada.");

  return NextResponse.json(row);
});
