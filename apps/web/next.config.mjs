import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports for common libraries
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
    ],
  },
  // Compress output for better performance
  compress: true,
  // Add headers for caching
  async headers() {
    return [
      {
        // Security headers for all routes except embed pages
        source: '/((?!t/[^/]+/embed).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // Embed pages: allow iframing, keep other security headers
        source: '/t/:token/embed',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
        ],
      },
      {
        // Cache static assets
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Enable bundle analyzer only when ANALYZE env var is set
const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default config;
