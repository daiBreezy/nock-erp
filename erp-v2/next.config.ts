import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // npm run line builds the parents' server into its own folders (.next-line-a / -b, swapped on each rebuild) so a
  // rebuild never touches the running copy or the staff dev server (owner 2026-10-19: Rich Menu was slow on dev)
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // the dev badge overlaps the sidebar's demo controls
  devIndicators: false,
  // dev testing goes through a cloudflared tunnel (real LINE OA webhook + LIFF form need a public HTTPS
  // URL) — without this, Next.js dev blocks the JS chunk requests coming from that origin and pages hang
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
