import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jobready.co.ke",
      },
      {
        protocol: "https",
        hostname: "company.jobready.co.ke",
      },
      {
        protocol: "https",
        hostname: "**.vercel.app",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
