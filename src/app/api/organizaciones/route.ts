import { NextResponse } from "next/server";
import { z } from "zod";
import { withTenantRoute, parseJson } from "@/lib/api/route";
import { organizacion } from "@/lib/db/schema";
import { aplicabilidadSchema } from "@/lib/dominio/aplicabilidad";

export const dynamic = "force-dynamic";

const organizacionInput = z.object({
  nombre: z.string().min(1),
  nit: z.string().optional(),
  sector: z.string().optional(),
  tamano: z.enum(["micro", "pequena", "mediana", "grande"]).optional(),
  aplicabilidad: aplicabilidadSchema.optional(),
});

// POST /organizaciones — crea una organización para el tenant activo.
export const POST = withTenantRoute("diagnosticos:write", async (request, { auth, tx }) => {
  const input = await parseJson(request, organizacionInput);

  const [row] = await tx
    .insert(organizacion)
    .values({
      tenantId: auth.tenantId,
      nombre: input.nombre,
      nit: input.nit,
      sector: input.sector,
      tamano: input.tamano,
      aplicabilidad: input.aplicabilidad ?? {},
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
});
