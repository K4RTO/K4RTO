import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // basePath: "/profile",    // ← uncomment and set to repo name if not root domain
  trailingSlash: true,
};

export default nextConfig;
