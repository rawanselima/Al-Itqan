import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    return config;
  },
  experimental: {
    webpackBuildWorker: false,
    cpus: 1,
  },
};

export default nextConfig;
