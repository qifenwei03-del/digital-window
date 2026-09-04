import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  // Next 的開發指示器預設疊在左下角。正式建置本來就沒有，
  // 但展場常常直接跑 dev server，那顆圓點會出現在電視上。
  devIndicators: false,
};

export default nextConfig;
