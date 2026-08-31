import { NextResponse } from "next/server";
import { and, eq, gte, type SQL } from "drizzle-orm";
import { withTenantRoute } from "@/lib/api/route";
import { marketSignal } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// GET /market-signals?impacto=&desde= — feed de vigilancia de mercado.
export const GET = withTenantRoute("market:read", async (request, { tx }) => {
  const url = new URL(request.url);
  const impacto = url.searchParams.get("impacto");
  const desde = url.searchParams.get("desde");

  const conds: SQL[] = [];
  if (impacto) conds.push(eq(marketSignal.impacto, impacto));
  if (desde) conds.push(gte(marketSignal.fecha, desde));

  const rows = await tx
    .select()
    .from(marketSignal)
    .where(conds.length ? and(...conds) : undefined);

  return NextResponse.json({ data: rows, next_cursor: null });
});
