import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MODULOS_SGI,
  TOTAL_PREGUNTAS,
  KB_VERSION,
} from "@/lib/dominio/modulos";

const KPIS = [
  { etiqueta: "Módulos del SGI", valor: String(MODULOS_SGI.length) },
  { etiqueta: "Preguntas del banco", valor: String(TOTAL_PREGUNTAS) },
  { etiqueta: "Versión del banco", valor: KB_VERSION },
  { etiqueta: "Ítems SST oficiales", valor: "60" },
];

export default function Home() {
  return (
    <DashboardShell titulo="Panel">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Encabezado */}
        <section className="space-y-3">
          <Badge variant="outline">Autodiagnóstico del SGI</Badge>
          <h2 className="text-3xl font-bold tracking-tight">
            Mide, prioriza y actúa sobre tu Sistema de Gestión Integral
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            SIGINEX evalúa el cumplimiento normativo y la madurez de tu
            organización en {MODULOS_SGI.length} módulos, y convierte cada
            brecha en un plan de acción y en rutas de aprendizaje.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button render={<Link href="/diagnostico" />}>
              Iniciar diagnóstico
            </Button>
            <Button variant="outline" render={<Link href="/reportes" />}>
              Ver reportes
            </Button>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {KPIS.map((kpi) => (
            <Card key={kpi.etiqueta}>
              <CardHeader className="pb-2">
                <CardDescription>{kpi.etiqueta}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {kpi.valor}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Separator />

        {/* Módulos */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                Módulos del SGI
              </h3>
              <p className="text-sm text-muted-foreground">
                Cada módulo se evalúa por separado y aporta su peso al score
                global.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS_SGI.map((m) => (
              <Link key={m.id} href={`/diagnostico/${m.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{m.nombre}</CardTitle>
                      <Badge variant="secondary" className="font-mono">
                        {m.corto}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {m.descripcion}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{m.preguntas} preguntas</span>
                    <span className="tabular-nums">
                      Peso {(m.peso * 100).toFixed(0)}%
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Descargo */}
        <section>
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-4 text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">
                Resultado orientativo.
              </strong>{" "}
              El diagnóstico no sustituye la autoevaluación oficial de
              estándares mínimos, una auditoría formal ni un concepto legal.
              Los 60 ítems de SG-SST son oficiales (Res. 0312/2019); el resto se
              generó desde la estructura normativa de cada dominio.
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardShell>
  );
}
