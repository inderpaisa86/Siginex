import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { obtenerResultado, obtenerBenchmark } from "@/lib/server/diagnostico-service";
import { MODULOS_SGI } from "@/lib/dominio/modulos";
import { Benchmark } from "./Benchmark";

export const dynamic = "force-dynamic";

const NOMBRE_MODULO = Object.fromEntries(
  MODULOS_SGI.map((m) => [m.id, m.nombre]),
);

function colorPorPct(pct: number | null): string {
  if (pct === null) return "#CBD5E1";
  if (pct < 41) return "#C0433A";
  if (pct < 61) return "#D8862B";
  if (pct < 81) return "#C08A2E";
  return "#2F8A66";
}

export default async function ResultadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await obtenerResultado(id);
  if (!r) notFound();
  const benchmark = await obtenerBenchmark(id);

  const score = r.scoreSgi != null ? Number(r.scoreSgi) : 0;

  // Ordena los pilares según el orden canónico de los 9 módulos.
  const pilaresPorId = new Map(r.pilares.map((p) => [p.skillId, p]));
  const pilares = MODULOS_SGI.map((m) => {
    const p = pilaresPorId.get(m.id);
    return {
      skillId: m.id,
      nombre: m.nombre,
      cumplimientoPct: p?.cumplimientoPct ?? null,
      nivel: p?.nivel ?? null,
      banda: p?.banda ?? null,
    };
  });

  return (
    <DashboardShell titulo={`Resultados · ${r.organizacionNombre}`}>
      <div className="mx-auto max-w-[1080px] space-y-5">
        {/* Hero con score global */}
        <section
          className="grid items-center gap-8 rounded-2xl px-7 py-7 text-white sm:grid-cols-[auto_1fr]"
          style={{ background: "#1E3050" }}
        >
          <div className="grid size-[132px] place-content-center justify-items-center rounded-full border-4 border-[color:var(--gold)]/40 text-center">
            <span className="font-[family-name:var(--font-space-grotesk)] text-[40px] font-bold leading-none">
              {score.toFixed(0)}
            </span>
            <span className="mt-1 font-[family-name:var(--font-plex-mono)] text-[11px] text-[#93A1B5]">
              / 100
            </span>
          </div>
          <div>
            <p className="font-[family-name:var(--font-space-grotesk)] text-[13px] uppercase tracking-[1.4px] text-[#93A1B5]">
              Score SGI
            </p>
            <p className="font-[family-name:var(--font-space-grotesk)] text-[27px] font-bold">
              {r.nivelSgi ? nivelNombre(r.nivelSgi) : "—"}
            </p>
            <p className="max-w-[56ch] text-[13.5px] text-[#CBD5E1]">
              Cumplimiento global ponderado de los módulos evaluados. Resultado
              orientativo.
            </p>
          </div>
        </section>

        {/* Cumplimiento por módulo */}
        <section className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Cumplimiento por módulo
          </h3>
          <div className="space-y-3">
            {pilares.map((p) => {
              const pct = p.cumplimientoPct != null ? Number(p.cumplimientoPct) : null;
              return (
                <div key={p.skillId}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] font-semibold">
                      {NOMBRE_MODULO[p.skillId] ?? p.nombre}
                    </span>
                    <span className="font-[family-name:var(--font-plex-mono)] text-[12.5px] font-semibold text-muted-foreground">
                      {pct != null ? `${pct.toFixed(0)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-full bg-[#EDF1F6]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct ?? 0}%`,
                        background: colorPorPct(pct),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benchmark de mercado */}
        <Benchmark diagnosticoId={id} inicial={benchmark} />

        {/* Brechas prioritarias */}
        <section className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="mb-1 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Brechas de alta prioridad
          </h3>
          <p className="mb-4 text-[12px] text-muted-foreground">
            Requisitos legales sin cumplir o con respuesta &ldquo;no
            cumple&rdquo;.
          </p>
          {r.recomendaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No se detectaron brechas de alta prioridad.
            </p>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {r.recomendaciones.slice(0, 20).map((rec, i) => (
                <div key={i} className="flex gap-3 py-3">
                  <span className="mt-1.5 size-2 flex-none rounded-full bg-[#C0433A]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug">{rec.texto}</p>
                  </div>
                  <span className="h-fit rounded-md border border-border bg-secondary px-2 py-0.5 font-[family-name:var(--font-plex-mono)] text-[10.5px] text-[#2A4571]">
                    {rec.skillId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <Button
            render={<Link href="/diagnostico" />}
            className="border border-border bg-white text-foreground hover:bg-muted"
          >
            Volver a diagnósticos
          </Button>
        </div>

        <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Resultado orientativo. No sustituye la autoevaluación oficial de
          estándares mínimos, una auditoría formal ni un concepto legal.
        </p>
      </div>
    </DashboardShell>
  );
}

function nivelNombre(n: number): string {
  return (
    { 1: "Inicial", 2: "Básico", 3: "En desarrollo", 4: "Optimizado", 5: "Excelencia" }[
      n
    ] ?? "—"
  );
}
