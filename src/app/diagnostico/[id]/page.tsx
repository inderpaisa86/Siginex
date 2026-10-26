import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { obtenerDiagnostico } from "@/lib/server/diagnostico-service";
import { KB } from "@/lib/dominio/kb/banco";
import { Cuestionario } from "./Cuestionario";

export const dynamic = "force-dynamic";

// El [id] de esta ruta es el UUID de un diagnóstico. Validamos el formato
// antes de consultar la base de datos: un valor no-UUID (p. ej. un id de
// módulo como "sst") haría fallar la consulta Postgres con un error 500.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DiagnosticoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const diag = await obtenerDiagnostico(id);
  if (!diag) notFound();

  // Si ya se calculó, ir directo a resultados.
  if (diag.estado === "calculado") {
    redirect(`/diagnostico/${id}/resultados`);
  }

  // Banco compacto para el cliente (sin criterios largos, para aligerar).
  const modulos = KB.modulos.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    short: m.short,
    preguntas: m.preguntas.map((q) => ({
      id: q.id,
      pregunta: q.pregunta,
      norma: q.norma,
    })),
  }));

  return (
    <DashboardShell titulo={`Diagnóstico · ${diag.organizacionNombre}`}>
      <div className="mx-auto max-w-[1080px]">
        <Cuestionario
          diagnosticoId={id}
          modulos={modulos}
          respuestasIniciales={diag.respuestas}
        />
      </div>
    </DashboardShell>
  );
}
