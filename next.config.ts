import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker image — produces /app/server.js with
  // minimal node_modules, so the runner stage stays small.
  output: "standalone",
  images: {
    remotePatterns: [
      // Partner logos + attachments served from Airtable CDN (signed URLs).
      { protocol: "https", hostname: "*.airtableusercontent.com" },
      { protocol: "https", hostname: "v5.airtableusercontent.com" },
      { protocol: "https", hostname: "dl.airtable.com" },
    ],
  },
};

export default nextConfig;
