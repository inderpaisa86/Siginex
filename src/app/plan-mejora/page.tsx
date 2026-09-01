import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { PlanMejora } from "@/components/plan/PlanMejora";
import {
  ultimoDiagnosticoCalculado,
  obtenerPlanMejora,
} from "@/lib/server/diagnostico-service";

export const dynamic = "force-dynamic";

export default async function PlanMejoraPage() {
  const ultimo = await ultimoDiagnosticoCalculado();

  if (!ultimo) {
    return (
      <DashboardShell titulo="Plan de mejora">
        <div className="mx-auto max-w-[1080px]">
          <p className="rounded-[14px] border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Aún no hay diagnósticos calculados. El plan de mejora se genera a
            partir de las brechas de un diagnóstico.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              render={<Link href="/diagnostico" />}
              className="bg-[color:var(--gold)] text-white hover:bg-[#a9781f]"
            >
              Ir a diagnósticos
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const tareas = await obtenerPlanMejora(ultimo.id);

  return (
    <DashboardShell titulo="Plan de mejora">
      <div className="mx-auto max-w-[1080px] space-y-5">
        <section className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <p className="mb-1 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[2px] text-[color:var(--gold)]">
            {ultimo.organizacionNombre}
          </p>
          <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Tareas de mejora priorizadas
          </h3>
          <p className="text-sm text-muted-foreground">
            Generadas automáticamente desde las brechas del diagnóstico. Cada
            tarea incluye acción, responsable sugerido, plazo y criterio de
            cierre.
          </p>
          <div className="mt-3">
            <Link
              href={`/diagnostico/${ultimo.id}/resultados`}
              className="font-[family-name:var(--font-space-grotesk)] text-[13px] font-semibold text-[color:var(--primary)] hover:underline"
            >
              Ver resultados del diagnóstico →
            </Link>
          </div>
        </section>

        <PlanMejora tareas={tareas} />

        <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Resultado orientativo. No sustituye la autoevaluación oficial de
          estándares mínimos, una auditoría formal ni un concepto legal.
        </p>
      </div>
    </DashboardShell>
  );
}
