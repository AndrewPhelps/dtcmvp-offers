import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker image — produces /app/server.js with
  // minimal node_modules, so the runner stage stays small.
  output: "standalone",
  // Native modules must not be webpack-bundled; leave them in node_modules
  // and require at runtime. better-sqlite3 = /scrape-results backing store.
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      // Partner logos + attachments served from Airtable CDN (signed URLs).
      { protocol: "https", hostname: "*.airtableusercontent.com" },
      { protocol: "https", hostname: "v5.airtableusercontent.com" },
      { protocol: "https", hostname: "dl.airtable.com" },
      // 1800dtc.com scrape data — logos/screenshots on Webflow CDN.
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
      { protocol: "https", hostname: "uploads-ssl.webflow.com" },
    ],
  },
};

export default nextConfig;
