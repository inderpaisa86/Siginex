import Link from "next/link";
import { MODULOS_SGI } from "@/lib/dominio/modulos";

const NAV_PRINCIPAL = [
  { href: "/", label: "Panel", icono: "▣" },
  { href: "/diagnostico", label: "Diagnóstico", icono: "◈" },
  { href: "/plan-mejora", label: "Plan de mejora", icono: "◆" },
  { href: "/benchmark", label: "Benchmark", icono: "◇" },
  { href: "/vigilancia", label: "Vigilancia", icono: "◉" },
  { href: "/reportes", label: "Reportes", icono: "▤" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
          S
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">SIGINEX</p>
          <p className="text-[11px] text-muted-foreground">by DQnexus</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_PRINCIPAL.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="text-muted-foreground">{item.icono}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Módulos del SGI
        </p>
        <ul className="space-y-0.5">
          {MODULOS_SGI.map((m) => (
            <li key={m.id}>
              <Link
                href={`/diagnostico/${m.id}`}
                className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="truncate">{m.corto}</span>
                <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                  {m.preguntas}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Resultado orientativo. No sustituye una auditoría formal ni un
          concepto legal.
        </p>
      </div>
    </aside>
  );
}
