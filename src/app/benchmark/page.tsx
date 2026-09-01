import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Benchmark } from "@/app/diagnostico/[id]/resultados/Benchmark";
import {
  ultimoDiagnosticoCalculado,
  obtenerBenchmark,
} from "@/lib/server/diagnostico-service";

export const dynamic = "force-dynamic";

export default async function BenchmarkPage() {
  const ultimo = await ultimoDiagnosticoCalculado();

  if (!ultimo) {
    return (
      <DashboardShell titulo="Benchmark">
        <div className="mx-auto max-w-[1080px]">
          <div className="rounded-[14px] border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              El benchmark compara el nivel tecnológico de tu empresa con el
              mercado. Necesitas un diagnóstico calculado primero.
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
        </div>
      </DashboardShell>
    );
  }

  const benchmark = await obtenerBenchmark(ultimo.id);

  return (
    <DashboardShell titulo="Benchmark">
      <div className="mx-auto max-w-[1080px] space-y-5">
        <section>
          <p className="mb-1 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[2px] text-[color:var(--gold)]">
            {ultimo.organizacionNombre}
          </p>
          <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Comparación con el mercado
          </h3>
          <p className="text-sm text-muted-foreground">
            Registra el nivel tecnológico de tu SGI y compáralo con las
            herramientas del mercado.
          </p>
        </section>

        <Benchmark diagnosticoId={ultimo.id} inicial={benchmark} />

        <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          El benchmark de mercado compara contra herramientas competidoras; es
          distinto del benchmark sectorial (vs. otras empresas del sector).
        </p>
      </div>
    </DashboardShell>
  );
}
