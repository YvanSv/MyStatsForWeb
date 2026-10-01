import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Pochettes et images d'artistes (Spotify) : les seules images distantes passées à next/image
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/image/**',
      },
      // Serveur de développement local uniquement : jamais autorisé en production
      ...(isProduction ? [] : [{
        protocol: 'http' as const,
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/**',
      }]),
    ],
  },
};

export default nextConfig;
