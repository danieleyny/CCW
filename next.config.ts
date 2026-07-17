import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The public reference page uploads a notarized PDF/scan through a server
    // action (anonymous users can't write Storage directly), so allow up to ~6MB.
    serverActions: { bodySizeLimit: "6mb" },
  },

  /**
   * Blog posts that cannibalized the pillar pages. Three early posts covered the
   * same queries as /requirements and /timeline, competing with them for the same
   * terms and splitting the signal. The pillars win: each post 301s to the page
   * that superseded it, and the .mdx files are deleted so nothing regenerates
   * them (getAllPosts() reads the directory, so the sitemap and blog index drop
   * them automatically — do not hand-edit app/sitemap.ts).
   *
   * These are permanent on purpose: the posts are gone, the pillar is the
   * canonical home of the topic, and the redirect passes their equity along.
   */
  async redirects() {
    return [
      { source: "/blog/nyc-ccw-requirements-2026", destination: "/requirements", permanent: true },
      { source: "/blog/how-long-does-nyc-ccw-take", destination: "/timeline", permanent: true },
      { source: "/blog/documents-you-need-for-nyc-ccw", destination: "/requirements", permanent: true },
    ]
  },
};

export default nextConfig;
