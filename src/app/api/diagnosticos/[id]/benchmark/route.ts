import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { withTenantRoute, parseJson, requireUuidParam } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { diagnostico } from "@/lib/db/schema";
import { calcularBenchmark } from "@/lib/orquestador";

export const dynamic = "force-dynamic";

const benchmarkInput = z.object({
  nivel_tecnologico: z.number().int().min(1).max(5),
});

// POST /diagnosticos/{id}/benchmark — registra el nivel tecnológico y compara con el mercado.
export const POST = withTenantRoute("diagnosticos:write", async (request, _ctx, params) => {
  const id = requireUuidParam(params.id, "Diagnóstico");
  const input = await parseJson(request, benchmarkInput);

  const { tx } = _ctx;
  const [diag] = await tx
    .select({ id: diagnostico.id })
    .from(diagnostico)
    .where(eq(diagnostico.id, id))
    .limit(1);
  if (!diag) throw ApiError.notFound("Diagnóstico no encontrado.");

  // Guarda el nivel declarado (enum '1'..'5').
  await tx
    .update(diagnostico)
    .set({
      nivelTecnologico: String(input.nivel_tecnologico) as
        | "1" | "2" | "3" | "4" | "5",
    })
    .where(eq(diagnostico.id, id));

  return NextResponse.json(calcularBenchmark(input.nivel_tecnologico));
});
