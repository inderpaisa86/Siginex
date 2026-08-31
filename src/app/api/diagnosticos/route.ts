import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { withTenantRoute, parseJson } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { diagnostico, kbVersion, organizacion } from "@/lib/db/schema";
import type { TenantTx } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

const diagnosticoInput = z.object({
  organizacion_id: z.string().uuid(),
  modo: z.enum(["completo", "rapido"]).default("completo"),
  exigir_completitud: z.boolean().default(false),
});

/** Devuelve la versión de KB vigente (la publicada más recientemente). */
async function kbVersionVigente(tx: TenantTx): Promise<string> {
  const [row] = await tx
    .select({ version: kbVersion.version })
    .from(kbVersion)
    .orderBy(desc(kbVersion.publicadoEn))
    .limit(1);
  if (!row) {
    throw ApiError.conflict("No hay una versión de KB publicada.");
  }
  return row.version;
}

// POST /diagnosticos — inicia un diagnóstico en estado en_progreso.
export const POST = withTenantRoute("diagnosticos:write", async (request, { auth, tx }) => {
  const input = await parseJson(request, diagnosticoInput);

  // La organización debe existir y pertenecer al tenant (RLS lo garantiza).
  const [org] = await tx
    .select({ id: organizacion.id })
    .from(organizacion)
    .where(eq(organizacion.id, input.organizacion_id))
    .limit(1);
  if (!org) throw ApiError.notFound("Organización no encontrada.");

  const version = await kbVersionVigente(tx);

  const [row] = await tx
    .insert(diagnostico)
    .values({
      tenantId: auth.tenantId,
      organizacionId: input.organizacion_id,
      kbVersion: version,
      modo: input.modo,
      exigirCompletitud: input.exigir_completitud,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
});

// GET /diagnosticos?organizacion_id=... — lista los diagnósticos del tenant.
export const GET = withTenantRoute("diagnosticos:read", async (request, { tx }) => {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("organizacion_id");

  const rows = await tx
    .select()
    .from(diagnostico)
    .where(orgId ? eq(diagnostico.organizacionId, orgId) : undefined)
    .orderBy(desc(diagnostico.creadoEn));

  return NextResponse.json({ data: rows, next_cursor: null });
});
