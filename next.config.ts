import type { NextConfig } from "next";

// En Vercel NO usamos output:standalone (Vercel hace su propio empaquetado y
// el modo standalone provoca errores de traza .nft.json). El standalone solo
// se activa fuera de Vercel, para el build de Docker (VM propia / local).
const esVercel = !!process.env.VERCEL;

// Sub-fase 3e: se RETIRÓ el `basePath`/`assetPrefix` "/siginex" que servía esta
// app por proxy desde concientic. El frontend de SIGINEX ahora es nativo en
// concientic (`concientic/src/app/siginex/*`), así que esta app deja de usarse
// como destino del proxy. No se apaga su despliegue (eso es Fase 6); solo se
// retira la configuración de proxy/basePath.
const nextConfig: NextConfig = {
  ...(esVercel ? {} : { output: "standalone" as const }),
};

export default nextConfig;
