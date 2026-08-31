import { Badge } from "@/components/ui/badge";
import { KB_VERSION } from "@/lib/dominio/modulos";

export function Topbar({ titulo }: { titulo: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-bold tracking-tight lg:hidden">SIGINEX</span>
        <h1 className="text-lg font-semibold tracking-tight">{titulo}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="font-mono text-[11px]">
          KB {KB_VERSION}
        </Badge>
      </div>
    </header>
  );
}
