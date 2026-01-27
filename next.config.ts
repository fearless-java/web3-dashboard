import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false, // 暫時禁用以測試 - 實驗性功能可能干擾 TanStack Query 的 refetchInterval
};

export default nextConfig;
