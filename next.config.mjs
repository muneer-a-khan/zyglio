/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js']
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      }
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24 hours
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      '@prisma/client': '@prisma/client',
    }

    // Add bundle analyzer in development
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all'
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      }
    }

    return config
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ]
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // Environment-specific optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Output configuration for Vercel
  output: 'standalone',

  // Power optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Serverless function configuration
  serverRuntimeConfig: {},
  publicRuntimeConfig: {},

  // Internationalization (if needed)
  // i18n: {
  //   locales: ['en', 'es', 'fr'],
  //   defaultLocale: 'en',
  // },

  // Analytics and monitoring
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ]
  },

  // Compress responses
  compress: true,

  // Generate ETags for better caching
  generateEtags: true,

  // Disable X-Powered-By header
  poweredByHeader: false,

  // Trailing slash configuration
  trailingSlash: false,
}

// Production-specific optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable bundle analyzer if needed
  if (process.env.ANALYZE === 'true') {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    })
    module.exports = withBundleAnalyzer(nextConfig)
  } else {
    module.exports = nextConfig
  }
} else {
  module.exports = nextConfig
}

export default nextConfig 