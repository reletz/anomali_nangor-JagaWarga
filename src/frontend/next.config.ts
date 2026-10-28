import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: { cpus: 1 },
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
