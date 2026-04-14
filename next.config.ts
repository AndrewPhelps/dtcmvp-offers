import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker image — produces /app/server.js with
  // minimal node_modules, so the runner stage stays small.
  output: "standalone",
};

export default nextConfig;
