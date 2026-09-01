import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { listarDiagnosticos } from "@/lib/server/diagnostico-service";
import { accionCrearOrganizacionYDiagnostico } from "./actions";

export const dynamic = "force-dynamic";

const NIVEL_NOMBRE: Record<number, string> = {
  1: "Inicial",
  2: "Básico",
  3: "En desarrollo",
  4: "Optimizado",
  5: "Excelencia",
};

export default async function DiagnosticoPage() {
  const diagnosticos = await listarDiagnosticos();

  return (
    <DashboardShell titulo="Diagnóstico">
      <div className="mx-auto max-w-[1080px] space-y-6">
        {/* Nuevo diagnóstico */}
        <section className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <p className="mb-1 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[2px] text-[color:var(--gold)]">
            Nuevo diagnóstico
          </p>
          <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Registra una empresa y arranca
          </h3>
          <p className="mb-5 text-sm text-muted-foreground">
            Crea la organización a diagnosticar; luego responderás el
            cuestionario del SGI.
          </p>

          <form
            action={accionCrearOrganizacionYDiagnostico}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11.5px] font-semibold text-muted-foreground">
                Nombre de la empresa
              </label>
              <input
                name="nombre"
                required
                className="w-full rounded-[9px] border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring)]/30"
                placeholder="Manufacturas del Valle S.A.S."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-muted-foreground">
                Sector
              </label>
              <input
                name="sector"
                className="w-full rounded-[9px] border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring)]/30"
                placeholder="Manufactura / Industria"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-muted-foreground">
                Tamaño
              </label>
              <select
                name="tamano"
                defaultValue="mediana"
                className="w-full rounded-[9px] border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring)]/30"
              >
                <option value="micro">Micro</option>
                <option value="pequena">Pequeña</option>
                <option value="mediana">Mediana</option>
                <option value="grande">Grande</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                className="bg-[color:var(--gold)] text-white hover:bg-[#a9781f]"
              >
                Crear e iniciar diagnóstico
              </Button>
            </div>
          </form>
        </section>

        {/* Diagnósticos existentes */}
        <section className="space-y-3">
          <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Diagnósticos
          </h3>
          {diagnosticos.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Aún no hay diagnósticos. Crea el primero arriba.
            </p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Score
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosticos.map((d) => (
                    <tr key={d.id} className="border-b border-[color:var(--border)] last:border-0">
                      <td className="px-4 py-3 font-medium">{d.organizacionNombre}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-md px-2 py-0.5 font-[family-name:var(--font-plex-mono)] text-[11px] font-semibold"
                          style={
                            d.estado === "calculado"
                              ? { background: "#E6F4EC", color: "#2F8A66" }
                              : { background: "#EDF1F6", color: "#64748B" }
                          }
                        >
                          {d.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-[family-name:var(--font-plex-mono)]">
                        {d.scoreSgi != null
                          ? `${d.scoreSgi} · ${d.nivelSgi ? NIVEL_NOMBRE[d.nivelSgi] : ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={
                            d.estado === "calculado"
                              ? `/diagnostico/${d.id}/resultados`
                              : `/diagnostico/${d.id}`
                          }
                          className="font-[family-name:var(--font-space-grotesk)] text-[13px] font-semibold text-[color:var(--primary)] hover:underline"
                        >
                          {d.estado === "calculado" ? "Ver resultados" : "Continuar"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
