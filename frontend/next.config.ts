import type { NextConfig } from "next";

// バックエンド(Spring Boot)のオリジン。Docker Compose では http://backend:8080 が入る
const apiOrigin = process.env.API_PROXY_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // /api/* をすべてSpring Bootへプロキシする(同一オリジン構成)。
  // ブラウザから見るとフロントもAPIも localhost:3000 になるため、
  // CORS設定が不要になり、セッションCookieのSameSite/Domain問題も消える。
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
