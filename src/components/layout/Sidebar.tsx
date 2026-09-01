import Link from "next/link";
import { MODULOS_SGI } from "@/lib/dominio/modulos";

const NAV_PRINCIPAL = [
  { href: "/", label: "Panel" },
  { href: "/diagnostico", label: "Diagnóstico" },
  { href: "/plan-mejora", label: "Plan de mejora" },
  { href: "/benchmark", label: "Benchmark" },
  { href: "/vigilancia", label: "Vigilancia" },
  { href: "/reportes", label: "Reportes" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-62 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <span
          className="grid size-10 flex-none place-items-center rounded-[10px] border border-white/15 font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-white"
          style={{ background: "linear-gradient(150deg,#2A4571,#14202E)" }}
        >
          S
        </span>
        <div className="leading-tight">
          <p className="font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-white">
            SIGINEX
          </p>
          <span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-wider text-[#93A1B5]">
            by DQnexus
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-2.5 pt-3 pb-1.5 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[1.4px] text-[#6B7A92]">
          Navegación
        </p>
        <ul className="space-y-0.5">
          {NAV_PRINCIPAL.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-[9px] px-2.5 py-2 text-[13px] text-[#C6D0DE] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="px-2.5 pt-4 pb-1.5 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[1.4px] text-[#6B7A92]">
          Módulos del SGI
        </p>
        <ul className="space-y-0.5">
          {MODULOS_SGI.map((m) => (
            <li key={m.id}>
              <Link
                href={`/diagnostico/${m.id}`}
                className="flex items-center gap-3 rounded-[9px] px-2.5 py-2 text-[13px] text-[#C6D0DE] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <span className="grid size-[22px] flex-none place-items-center rounded-[7px] border border-white/[0.18] font-[family-name:var(--font-plex-mono)] text-[10px] text-[#93A1B5]">
                  {m.corto.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{m.corto}</span>
                <span className="font-[family-name:var(--font-plex-mono)] text-[10px] text-[#6B7A92]">
                  {m.preguntas}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Pie */}
      <div className="border-t border-white/[0.08] px-[18px] py-3.5 text-[10px] leading-relaxed text-[#6B7A92]">
        Resultado orientativo. No sustituye una auditoría formal ni un concepto
        legal.
      </div>
    </aside>
  );
}
