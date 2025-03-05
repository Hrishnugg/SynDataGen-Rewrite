/** @type {import('next').NextConfig} */
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ['firebase-admin', 'google-auth-library', 'google-logging-utils'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'ngrams.ai' },
      { protocol: 'https', hostname: 'www.ngrams.ai' }
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Add the node polyfill plugin
      config.plugins.push(new NodePolyfillPlugin());
      
      // Handle node: protocol imports
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:events': 'events',
        'node:process': 'process/browser',
        'node:stream': 'stream-browserify',
        'node:util': 'util',
        'node:buffer': 'buffer',
        'node:path': 'path-browserify',
        'node:url': 'url',
        'node:crypto': 'crypto-browserify',
        'node:http': 'stream-http',
        'node:https': 'https-browserify',
        'node:os': 'os-browserify/browser',
        'node:zlib': 'browserify-zlib',
        'node:assert': 'assert',
        'node:fs': false,
        'node:net': false,
        'node:tls': false,
        'node:http2': false,
        'node:child_process': false,
      };
      
      // Don't resolve 'fs', 'net', 'http2' modules on the client to prevent errors
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        http2: false,
        tls: false,
        child_process: false,
        events: require.resolve('events/'),
        process: require.resolve('process/browser'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
        buffer: require.resolve('buffer/'),
        path: require.resolve('path-browserify'),
        url: require.resolve('url/'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        zlib: require.resolve('browserify-zlib'),
        assert: require.resolve('assert/'),
      };
    }
    return config;
  },
};

module.exports = nextConfig; 