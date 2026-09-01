import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { MODULOS_SGI, TOTAL_PREGUNTAS, KB_VERSION } from "@/lib/dominio/modulos";

const KPIS = [
  { etiqueta: "Módulos del SGI", valor: String(MODULOS_SGI.length) },
  { etiqueta: "Preguntas del banco", valor: String(TOTAL_PREGUNTAS) },
  { etiqueta: "Versión del banco", valor: KB_VERSION },
  { etiqueta: "Ítems SST oficiales", valor: "60" },
];

export default function Home() {
  return (
    <DashboardShell titulo="Panel">
      <div className="mx-auto max-w-[1080px] space-y-6">
        {/* Hero */}
        <section
          className="rounded-2xl px-7 py-7 text-white"
          style={{ background: "#1E3050" }}
        >
          <p className="mb-2.5 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[2px] text-[color:var(--gold)]">
            Autodiagnóstico del SGI
          </p>
          <h2 className="max-w-[24ch] font-[family-name:var(--font-space-grotesk)] text-[27px] leading-[1.15] font-bold">
            Mide, prioriza y actúa sobre tu Sistema de Gestión Integral
          </h2>
          <p className="mt-3 max-w-[56ch] text-[13.5px] text-[#CBD5E1]">
            SIGINEX evalúa el cumplimiento normativo y la madurez de tu
            organización en {MODULOS_SGI.length} módulos, y convierte cada
            brecha en un plan de acción y en rutas de aprendizaje.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              render={<Link href="/diagnostico" />}
              className="bg-[color:var(--gold)] text-white hover:bg-[#a9781f]"
            >
              Iniciar diagnóstico
            </Button>
            <Button
              render={<Link href="/reportes" />}
              className="border border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              Ver reportes
            </Button>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {KPIS.map((kpi) => (
            <div
              key={kpi.etiqueta}
              className="rounded-xl border border-border bg-card p-[18px] shadow-[var(--shadow-card)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
                {kpi.etiqueta}
              </p>
              <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-[30px] leading-[1.1] font-bold text-foreground">
                {kpi.valor}
              </p>
            </div>
          ))}
        </section>

        {/* Módulos */}
        <section className="space-y-4">
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-foreground">
              Módulos del SGI
            </h3>
            <p className="text-sm text-muted-foreground">
              Cada módulo se evalúa por separado y aporta su peso al score
              global.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS_SGI.map((m) => (
              <Link
                key={m.id}
                href={`/diagnostico/${m.id}`}
                className="group rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:border-[color:var(--gold)]/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-[family-name:var(--font-space-grotesk)] text-[15px] font-semibold text-foreground">
                    {m.nombre}
                  </h4>
                  <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-[family-name:var(--font-plex-mono)] text-[10.5px] text-[#2A4571]">
                    {m.corto}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {m.descripcion}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-[11.5px] text-muted-foreground">
                  <span className="font-[family-name:var(--font-plex-mono)]">
                    {m.preguntas} preguntas
                  </span>
                  <span className="font-[family-name:var(--font-plex-mono)]">
                    Peso {(m.peso * 100).toFixed(0)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Descargo */}
        <section>
          <div className="rounded-[11px] border border-[#F3E7CC] bg-[#FFF7E6] px-4 py-3 text-[13px] leading-relaxed text-[#7a5b18]">
            <strong className="font-semibold">Resultado orientativo.</strong> El
            diagnóstico no sustituye la autoevaluación oficial de estándares
            mínimos, una auditoría formal ni un concepto legal. Los 60 ítems de
            SG-SST son oficiales (Res. 0312/2019); el resto se generó desde la
            estructura normativa de cada dominio.
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
