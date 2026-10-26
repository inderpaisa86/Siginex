import type { NextConfig } from "next";

// En Vercel NO usamos output:standalone (Vercel hace su propio empaquetado y
// el modo standalone provoca errores de traza .nft.json). El standalone solo
// se activa fuera de Vercel, para el build de Docker (VM propia / local).
const esVercel = !!process.env.VERCEL;

// Siginex se publica bajo la ruta /siginex para integrarse como una sección de
// concientic.com mediante un rewrite/proxy en el proyecto concientic. El
// basePath hace que todas las rutas internas (next/link, /api) y los assets
// (/_next/...) queden prefijados con /siginex y no colisionen con concientic.
const nextConfig: NextConfig = {
  basePath: "/siginex",
  assetPrefix: "/siginex",
  ...(esVercel ? {} : { output: "standalone" as const }),
};

export default nextConfig;
