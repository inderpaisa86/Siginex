import { NextResponse } from "next/server";
import { and, eq, gte, type SQL } from "drizzle-orm";
import { withTenantRoute } from "@/lib/api/route";
import { normativaEntry } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// GET /normativa?modulo_sgi=&estado=&desde= — feed de vigilancia normativa.
export const GET = withTenantRoute("normativa:read", async (request, { tx }) => {
  const url = new URL(request.url);
  const moduloSgi = url.searchParams.get("modulo_sgi");
  const estado = url.searchParams.get("estado");
  const desde = url.searchParams.get("desde");

  const conds: SQL[] = [];
  if (moduloSgi) conds.push(eq(normativaEntry.moduloSgi, moduloSgi));
  if (estado) conds.push(eq(normativaEntry.estado, estado));
  if (desde) conds.push(gte(normativaEntry.fecha, desde));

  const rows = await tx
    .select()
    .from(normativaEntry)
    .where(conds.length ? and(...conds) : undefined);

  return NextResponse.json({ data: rows, next_cursor: null });
});
