import type { NextConfig } from "next";

const apiProxyOrigin = (process.env.API_PROXY_ORIGIN || "http://localhost:8080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyOrigin}/api/:path*`,
      },
      {
        source: "/oauth2/:path*",
        destination: `${apiProxyOrigin}/oauth2/:path*`,
      },
      {
        source: "/login/oauth2/:path*",
        destination: `${apiProxyOrigin}/login/oauth2/:path*`,
      }
    ];
  },
};

export default nextConfig;
