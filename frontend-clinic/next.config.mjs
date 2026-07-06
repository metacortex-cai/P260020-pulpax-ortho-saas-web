/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// Content-Security-Policy is intentionally NOT set here.
// A per-request nonce-based CSP is generated in src/middleware.ts,
// which sets the Content-Security-Policy response header dynamically.
// A static CSP header here cannot carry a nonce and would be overridden
// by (or conflict with) the middleware header anyway.

const securityHeaders = [
  // Clickjacking koruması
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // MIME sniffing koruması
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // XSS filter (eski tarayıcılar için)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Referrer bilgisi sınırlandırma
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // HTTPS zorunluluğu (production'da aktif, dev'de atlanır)
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]),
  // Tarayıcı özelliklerine erişim kısıtlaması
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)',
  },
];

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  // Diş görselleri harici CDN'den (DrDentes) çekiliyor; next/image optimizasyonu
  // için bu domainin remotePatterns içinde tanımlı olması gerekir.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.drdentes.com',
        pathname: '/img/**',
      },
    ],
  },

  // Tüm rotalara güvenlik header'ları uygula
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // API proxy (CORS sorunlarını önlemek için opsiyonel)
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
  //     },
  //   ];
  // },
};

let finalConfig = nextConfig;

if (!isDev) {
  const { default: withPWAInit } = await import("@ducanh2912/next-pwa");
  const withPWA = withPWAInit({
    dest: "public",
    disable: isDev,
    register: true,
    skipWaiting: true,
  });
  finalConfig = withPWA(nextConfig);
}

export default finalConfig;
