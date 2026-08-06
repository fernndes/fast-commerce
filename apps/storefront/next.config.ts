import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

/**
 * CSP em REPORT-ONLY: reporta violações no console/endpoint sem bloquear.
 * Fluxo: deploy → navegar por tudo (home, PDP, busca, aceitar/recusar consent)
 * → coletar violações → ajustar → só então trocar a key para
 * 'Content-Security-Policy' (enforcing).
 *
 * Autorização por mecanismo:
 * - Bundles do Next  → hash via experimental.sri (build time)
 * - GTM / GA4        → por domínio (conteúdo controlado pelo Google, muda)
 * - Silktide         → self-hosted, coberto por 'self'
 * - Custom HTML do GTM (init do Silktide) → INLINE: vai aparecer como
 *   violação no Report-Only. Decisão pendente (mover pro código / hash / relaxar).
 */
const cspHeader = `
    default-src 'self';
    script-src 'self' https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://dummyimage.com https://www.googletagmanager.com https://www.google-analytics.com;
    connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dummyimage.com' }
    ],
  },

  outputFileTracingIncludes: {
    '/**': ['./data/big.json'],
  },

  // experimental: {
  //   sri: {
  //     algorithm: 'sha256',
  //   },
  // },

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        ...securityHeaders,
        {
          key: 'Content-Security-Policy-Report-Only', // trocar p/ enforcing só depois de limpar as violações
          value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
        },
      ],
    }];
  },
};

export default nextConfig;