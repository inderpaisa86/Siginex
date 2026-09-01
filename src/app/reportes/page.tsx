import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { listarDiagnosticos } from "@/lib/server/diagnostico-service";

export const dynamic = "force-dynamic";

const NIVEL_NOMBRE: Record<number, string> = {
  1: "Inicial",
  2: "Básico",
  3: "En desarrollo",
  4: "Optimizado",
  5: "Excelencia",
};

function fecha(d: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(new Date(d));
}

export default async function ReportesPage() {
  const todos = await listarDiagnosticos();
  const calculados = todos.filter((d) => d.estado === "calculado");

  return (
    <DashboardShell titulo="Reportes">
      <div className="mx-auto max-w-[1080px] space-y-5">
        <section>
          <p className="mb-1 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[2px] text-[color:var(--gold)]">
            Histórico
          </p>
          <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Diagnósticos calculados
          </h3>
          <p className="text-sm text-muted-foreground">
            Cada diagnóstico calculado queda registrado con su score y la
            versión de la base de conocimiento usada.
          </p>
        </section>

        {calculados.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay diagnósticos calculados.
            </p>
            <div className="mt-4">
              <Button
                render={<Link href="/diagnostico" />}
                className="bg-[color:var(--gold)] text-white hover:bg-[#a9781f]"
              >
                Iniciar un diagnóstico
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Empresa
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Score
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Nivel
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {calculados.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-[color:var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {d.organizacionNombre}
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-plex-mono)] text-muted-foreground">
                      {fecha(d.creadoEn)}
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-plex-mono)] font-semibold">
                      {d.scoreSgi ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {d.nivelSgi ? NIVEL_NOMBRE[d.nivelSgi] : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/diagnostico/${d.id}/resultados`}
                        className="font-[family-name:var(--font-space-grotesk)] text-[13px] font-semibold text-[color:var(--primary)] hover:underline"
                      >
                        Ver reporte
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
