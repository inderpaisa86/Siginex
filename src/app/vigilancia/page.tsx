import { DashboardShell } from "@/components/layout/DashboardShell";
import { obtenerVigilancia } from "@/lib/server/diagnostico-service";

export const dynamic = "force-dynamic";

export default async function VigilanciaPage() {
  const { normativa, mercado } = await obtenerVigilancia();

  return (
    <DashboardShell titulo="Vigilancia">
      <div className="mx-auto max-w-[1080px] space-y-6">
        <section>
          <p className="mb-1 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[2px] text-[color:var(--gold)]">
            Monitoreo continuo
          </p>
          <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
            Vigilancia normativa y de mercado
          </h3>
          <p className="text-sm text-muted-foreground">
            Cambios normativos y señales de mercado relevantes para el SGI. La
            vigilancia no participa en el cálculo del diagnóstico.
          </p>
        </section>

        {/* Normativa */}
        <section className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h4 className="mb-3 font-[family-name:var(--font-space-grotesk)] text-[15px] font-semibold">
            Normativa
          </h4>
          {normativa.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin entradas normativas por ahora. Se poblarán cuando se active la
              ingesta de vigilancia.
            </p>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {normativa.map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-snug">
                      {n.titulo}
                    </span>
                    <span className="mt-1 block font-[family-name:var(--font-plex-mono)] text-[11px] text-muted-foreground">
                      {[n.fuente, n.fecha].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {n.moduloSgi && (
                    <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-[family-name:var(--font-plex-mono)] text-[10.5px] text-[#2A4571]">
                      {n.moduloSgi}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mercado */}
        <section className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h4 className="mb-3 font-[family-name:var(--font-space-grotesk)] text-[15px] font-semibold">
            Señales de mercado
          </h4>
          {mercado.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin señales de mercado por ahora. Se poblarán cuando se active la
              ingesta de vigilancia.
            </p>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {mercado.map((m) => (
                <div key={m.id} className="flex items-start gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-snug">
                      {m.titulo}
                    </span>
                    <span className="mt-1 block font-[family-name:var(--font-plex-mono)] text-[11px] text-muted-foreground">
                      {[m.tipo, m.fuente, m.fecha].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {m.impacto && (
                    <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-[family-name:var(--font-plex-mono)] text-[10.5px] text-[#2A4571]">
                      {m.impacto}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
