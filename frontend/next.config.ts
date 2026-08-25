import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  transpilePackages: ["@roomtune/simulation"],
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
