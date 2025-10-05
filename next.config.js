/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración del workspace root para resolver advertencias de múltiples lockfiles
  outputFileTracingRoot: __dirname,

  // NOTA: Si unificas todo en Next.js, elimina estas líneas de proxy
  // Configuración del proxy para redirigir llamadas API al servidor Express
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3003/api/:path*',
      },
    ];
  },

  // Configuración de imágenes optimizada para PWA
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Variables de entorno
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },

  // Optimizaciones de TypeScript y ESLint
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configuración PWA y performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Headers de seguridad y PWA
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack configuration con optimizaciones PWA
  webpack: (config, { dev, isServer }) => {
    // Resolver problemas con PDF.js worker imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/legacy/build/pdf.worker.mjs': false,
      'pdfjs-dist/build/pdf.worker.mjs': false,
      'pdfjs-dist/legacy/build/pdf.worker.js': false,
      'pdfjs-dist/build/pdf.worker.js': false,
    };

    // Optimizaciones para PWA
    if (!dev && !isServer) {
      // Optimizar chunks para mejor cacheo
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        pwa: {
          test: /[\\/]public[\\/]sw\.js/,
          name: 'service-worker',
          chunks: 'all',
          enforce: true,
        },
      };
    }

    // Agregar soporte para Web Workers
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },

  // Configuración de compresión
  compress: true,

  // Configuración de PWA con Workbox (si se instala después)
  // workboxOpts: {
  //   swSrc: 'public/sw.js',
  //   swDest: 'public/sw.js',
  // },
}

module.exports = nextConfig
