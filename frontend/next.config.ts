import type { NextConfig } from "next";

// Once resource routes start migrating to backend/ (Phase 1+ of the backend/frontend
// split), this rewrite makes the frontend and backend look like one origin in dev, so
// httpOnly session cookies keep working without CORS. In production this same job is
// done by a reverse proxy (e.g. Nginx) in front of both services — see the split plan.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
