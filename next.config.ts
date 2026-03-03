import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static', '@google/genai'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
    ],
  },
};

export default nextConfig;
