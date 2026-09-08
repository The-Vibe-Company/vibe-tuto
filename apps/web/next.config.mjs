import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Local screenshots are already compressed and need no second image proxy.
    unoptimized: process.env.CAPTUTO_DEV_BACKEND === 'local',
    remotePatterns: [
      // The isolated local Supabase backend serves the same signed storage URLs.
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http://127.0.0.1:') ? [{
        protocol: 'http', hostname: '127.0.0.1',
        port: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).port,
        pathname: '/storage/v1/object/sign/**',
      }] : []),
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    outputFileTracingIncludes: { '/api/**/*': ['./lib/render/fonts/**/*'] },
    serverComponentsExternalPackages: ['sharp', '@pdf-lib/fontkit'],
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
      ...(process.env.NODE_ENV === 'production' ? [{
        // Development chunks have stable filenames and must never be immutable.
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      }] : []),
    ];
  },
};

// Enable bundle analyzer only when ANALYZE env var is set
const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default config;
