import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false, // 暫時禁用以測試 - 實驗性功能可能干擾 TanStack Query 的 refetchInterval
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "icons.llamao.fi",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
