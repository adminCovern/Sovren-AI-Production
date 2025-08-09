const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Minimal webpack configuration to fix build issues

    // Resolve TS path aliases (@/*)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    // Handle server-side externals
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('redis', 'modesl', 'ws', 'bcrypt', 'node-gyp-build');
    }



    return config;
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Production caching and security headers
  headers: async () => {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=*, camera=*, display-capture=*, geolocation=*',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },

  // Enable experimental features for SOVREN AI
  experimental: {
    // Temporarily disable Three.js optimization to fix build
    // optimizePackageImports: ['@react-three/fiber', '@react-three/drei'],
  },

  // Server external packages (moved from experimental in Next.js 15)
  serverExternalPackages: [
    'redis',
    'modesl',
    'ws',
    'bcrypt',
    'node-gyp-build',
    // Graphics and animation libraries that use browser globals
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    '@react-three/cannon',
    'cannon-es',
    'gsap',
    'framer-motion'
  ],
};

module.exports = nextConfig;
