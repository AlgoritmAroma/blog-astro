import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Default is 1MB — too small for a real cover-image upload.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
