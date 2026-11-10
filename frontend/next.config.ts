import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": { as: "*.css", loaders: ["@tailwindcss/turbopack"] },
    },
  },

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
