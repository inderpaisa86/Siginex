import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

// Toca la BD: nunca debe prerenderizarse en build.
export const dynamic = "force-dynamic";

/**
 * Health check. Verifica que la app responde y que la base de datos es
 * alcanzable. Endpoint público (no requiere tenant ni API key).
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "up" });
  } catch {
    return NextResponse.json(
      { status: "degraded", db: "down" },
      { status: 503 },
    );
  }
}
