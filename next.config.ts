import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida standalone para empaquetar en Docker (despliegue en la VM Oracle).
  output: "standalone",
};

export default nextConfig;
