import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Belt and braces with the layout's noindex meta: the header also covers
  // what has no <head> to carry one — uploaded images, API routes.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  experimental: {
    serverActions: {
      // Default is 1MB — too small for a real cover-image upload.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
