import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the dev badge overlaps the sidebar's demo controls
  devIndicators: false,
  // dev testing goes through a cloudflared tunnel (real LINE OA webhook + LIFF form need a public HTTPS
  // URL) — without this, Next.js dev blocks the JS chunk requests coming from that origin and pages hang
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
