import { MODULOS_SGI } from "@/lib/dominio/modulos";
import type { TareaPlanUI } from "@/lib/server/diagnostico-service";

const NOMBRE_MODULO = Object.fromEntries(MODULOS_SGI.map((m) => [m.id, m.nombre]));

const COLOR_PRIORIDAD: Record<string, string> = {
  alta: "#C0433A",
  media: "#D8862B",
  baja: "#64748B",
};

/** Lista de tareas del plan de mejora, agrupadas visualmente por prioridad. */
export function PlanMejora({ tareas }: { tareas: TareaPlanUI[] }) {
  if (tareas.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        No hay tareas de plan de mejora. Se generan al calcular un diagnóstico
        con brechas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tareas.map((t, i) => (
        <div
          key={i}
          className="rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)]"
        >
          <div className="mb-2 flex items-center gap-3">
            <span
              className="size-2.5 flex-none rounded-full"
              style={{ background: COLOR_PRIORIDAD[t.prioridad] ?? "#64748B" }}
            />
            <h4 className="flex-1 font-[family-name:var(--font-space-grotesk)] text-[14.5px] font-semibold leading-snug">
              {t.brecha}
            </h4>
            <span
              className="h-fit rounded-md px-2 py-0.5 font-[family-name:var(--font-plex-mono)] text-[10.5px] font-semibold uppercase"
              style={{
                background: `${COLOR_PRIORIDAD[t.prioridad] ?? "#64748B"}1a`,
                color: COLOR_PRIORIDAD[t.prioridad] ?? "#64748B",
              }}
            >
              {t.prioridad}
            </span>
          </div>

          <p className="mb-3 pl-[22px] text-[13px] leading-relaxed text-[#3A4658]">
            {t.accion}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pl-[22px] font-[family-name:var(--font-plex-mono)] text-[11px] text-muted-foreground">
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[#2A4571]">
              {NOMBRE_MODULO[t.skillId] ?? t.skillId}
            </span>
            {t.responsable && <span>Responsable: {t.responsable}</span>}
            {t.plazoDias != null && <span>Plazo: {t.plazoDias} días</span>}
            {t.fase != null && <span>Fase {t.fase}</span>}
            {t.normaRef && <span>{t.normaRef}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
