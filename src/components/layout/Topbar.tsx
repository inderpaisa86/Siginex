import { KB_VERSION } from "@/lib/dominio/modulos";

export function Topbar({ titulo }: { titulo: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-[rgba(237,241,247,0.9)] px-6 py-3.5 backdrop-blur">
      <div>
        <p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[1px] text-muted-foreground">
          SIGINEX · SGI
        </p>
        <h2 className="mt-0.5 font-[family-name:var(--font-space-grotesk)] text-[19px] font-semibold text-foreground">
          {titulo}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-[7px] border border-[#F3E7CC] bg-[#FFF7E6] px-2.5 py-1 font-[family-name:var(--font-plex-mono)] text-[11px] font-semibold text-[#a9781f]">
          KB {KB_VERSION}
        </span>
      </div>
    </header>
  );
}
