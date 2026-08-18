import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

// CSP — autorização por origem, sem nonce nem SRI. Ver ADR 0002
// (adr/0002-csp-por-origem-sem-nonce-nem-sri.md).
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.clarity.ms${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://dummyimage.com https://*.googletagmanager.com https://*.google-analytics.com;
    connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // DENY, consistente com frame-ancestors 'none' — ver ADR 0002.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  /*
   * Os pacotes da casca exportam TSX cru — sem `dist`, sem step de build (ver o
   * campo `exports` de cada um). É o compilador desta zona que os transpila, e
   * é isso que permite `AppHeader`/`AppFooter` serem Server Components de
   * verdade: eles são compilados no mesmo grafo do app, sob a mesma fronteira
   * server/client. Ver ADR 0004.
   */
  transpilePackages: ['@repo/ui', '@repo/ui-patterns'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dummyimage.com' }
    ],
  },

  outputFileTracingIncludes: {
    '/**': ['./data/big.json'],
  },

  /*
   * Multi-Zones: o storefront é o HOST do domínio e proxeia a zona blog.
   * Ver Blog-0001 (apps/blog/adr/0001-multi-zones-assetprefix-rewrites-e-navegacao.md).
   *
   * `rewrites()` estático em vez de `proxy()`: o destino é fixo, então não há o
   * que decidir por request — o rewrite evita o hop extra de function por
   * request. `proxy()` só se justificaria com decisão dinâmica (feature flag
   * escolhendo a rota, migração parcial).
   *
   * ATENÇÃO — acoplamento de build: `rewrites()` roda durante `next build` para
   * gerar o manifest de rotas, então `BLOG_ZONE_URL` é resolvida em BUILD TIME,
   * não por request. Trocar o domínio do blog exige REBUILDAR o storefront, não
   * só redeployar o blog.
   */
  async rewrites() {
  const blog = process.env.BLOG_ZONE_URL;
  if (!blog) return { beforeFiles: [] };

  return {
    beforeFiles: [
      { source: '/blog', destination: `${blog}/blog` },
      { source: '/blog/:path+', destination: `${blog}/blog/:path+` },
      { source: '/blog-static/:path+', destination: `${blog}/blog-static/:path+` },
    ],
  };
},

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        ...securityHeaders,
        {
          key: 'Content-Security-Policy',
          value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
        },
      ],
    }];
  },
};

export default withSentryConfig(nextConfig, {
 // For all available options, see:
 // https://www.npmjs.com/package/@sentry/webpack-plugin#options

 org: "gabriel-j0",

 project: "javascript-nextjs",

 // Only print logs for uploading source maps in CI
 silent: !process.env.CI,

 // For all available options, see:
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

 // Upload a larger set of source maps for prettier stack traces (increases build time)
 widenClientFileUpload: true,

 // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
 // This can increase your server load as well as your hosting bill.
 // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
 // side errors will fail.
 // tunnelRoute: "/monitoring",

 webpack: {
   // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   // See the following for more information:
   // https://docs.sentry.io/product/crons/
   // https://vercel.com/docs/cron-jobs
   automaticVercelMonitors: true,

   // Tree-shaking options for reducing bundle size
   treeshake: {
     // Automatically tree-shake Sentry logger statements to reduce bundle size
     removeDebugLogging: true,
   },
 },
});
