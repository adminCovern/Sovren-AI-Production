/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle Three.js and WebGL dependencies
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    });

    // Handle audio files for voice synthesis
    config.module.rules.push({
      test: /\.(mp3|wav|ogg|m4a)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/audio/',
          outputPath: 'static/audio/',
        },
      },
    });

    // Handle 3D model files
    config.module.rules.push({
      test: /\.(gltf|glb|fbx|obj)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/models/',
          outputPath: 'static/models/',
        },
      },
    });

    // Optimize for WebGL and Three.js
    config.resolve.alias = {
      ...config.resolve.alias,
      three: 'three',
    };

    // Handle WebAssembly for StyleTTS2
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Production optimizations
    if (!dev) {
      // Bundle splitting for optimal loading
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            maxSize: 244000, // 244KB chunks
          },
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'three',
            chunks: 'all',
            priority: 20,
            maxSize: 244000,
          },
          voice: {
            test: /[\\/]src[\\/]lib[\\/]voice[\\/]/,
            name: 'voice',
            chunks: 'all',
            priority: 15,
            maxSize: 244000,
          },
          shadowboard: {
            test: /[\\/]src[\\/]lib[\\/]shadowboard[\\/]/,
            name: 'shadowboard',
            chunks: 'all',
            priority: 15,
            maxSize: 244000,
          },
        },
      };

      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Minimize bundle size
      config.optimization.minimize = true;
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
  // Optimize for performance
  swcMinify: true,
  // Enable experimental features for SOVREN AI
  experimental: {
    serverComponentsExternalPackages: ['three', 'cannon-es'],
    optimizePackageImports: ['@react-three/fiber', '@react-three/drei'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

module.exports = nextConfig;
