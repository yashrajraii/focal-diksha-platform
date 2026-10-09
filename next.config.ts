import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Cloudflare bindings are native to Sites, not Vercel's Node.js runtime.
  // The Vercel build uses a server-side D1 HTTP adapter instead.
  webpack(config, { webpack }) {
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(
      /^cloudflare:workers$/,
      path.resolve(process.cwd(), "lib/server/vercel-d1-env.ts"),
    ));
    return config;
  },
};

export default nextConfig;
