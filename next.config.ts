import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // No basePath — we deploy to k4rto.com (root domain).
  // If we ever move to a subpath like K4RTO.github.io/<repo>, set basePath here
  // AND set NEXT_PUBLIC_BASE_PATH=<same> in the build env so withBase() picks it up.
  trailingSlash: true,
  // Silence the "multiple lockfiles" workspace root warning.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
