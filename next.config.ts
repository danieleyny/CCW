import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The public reference page uploads a notarized PDF/scan through a server
    // action (anonymous users can't write Storage directly), so allow up to ~6MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
