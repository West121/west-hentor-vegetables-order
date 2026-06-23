import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const springApiBaseUrl = (
  process.env.SPRING_API_BASE_URL || "http://127.0.0.1:8080"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/admin/:path*",
          destination: `${springApiBaseUrl}/api/spring/admin/:path*`,
        },
        {
          source: "/api/v1/:path*",
          destination: `${springApiBaseUrl}/api/spring/v1/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
