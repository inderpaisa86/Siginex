"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  crearOrganizacion,
  crearDiagnostico,
  guardarRespuestas,
  calcularDiagnostico,
} from "@/lib/server/diagnostico-service";

/** Crea una organización e inicia un diagnóstico; redirige al cuestionario. */
export async function accionCrearOrganizacionYDiagnostico(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim() || undefined;
  const tamanoRaw = String(formData.get("tamano") ?? "").trim();
  const tamano =
    tamanoRaw === "micro" ||
    tamanoRaw === "pequena" ||
    tamanoRaw === "mediana" ||
    tamanoRaw === "grande"
      ? tamanoRaw
      : undefined;

  if (!nombre) throw new Error("El nombre es obligatorio.");

  const orgId = await crearOrganizacion({ nombre, sector, tamano });
  const diagId = await crearDiagnostico(orgId);
  redirect(`/diagnostico/${diagId}`);
}

/** Inicia un diagnóstico para una organización existente. */
export async function accionIniciarDiagnostico(organizacionId: string) {
  const diagId = await crearDiagnostico(organizacionId);
  redirect(`/diagnostico/${diagId}`);
}

/** Guarda las respuestas de un módulo (lote). */
export async function accionGuardarRespuestas(
  diagnosticoId: string,
  respuestas: Array<{ preguntaId: string; valor: string }>,
) {
  await guardarRespuestas(diagnosticoId, respuestas);
  revalidatePath(`/diagnostico/${diagnosticoId}`);
}

/** Calcula el diagnóstico y redirige a resultados. */
export async function accionCalcular(diagnosticoId: string) {
  await calcularDiagnostico(diagnosticoId);
  redirect(`/diagnostico/${diagnosticoId}/resultados`);
}
