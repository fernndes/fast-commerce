import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/*
 * CSP replicada do storefront, ORIGEM POR ORIGEM. Ver Blog-0004 e ADR 0002 do
 * storefront (apps/storefront/adr/0002-csp-por-origem-sem-nonce-nem-sri.md).
 *
 * Divergir aqui é um buraco: as duas zonas vivem sob o MESMO domínio, então uma
 * política mais frouxa no blog é uma política mais frouxa no site inteiro do
 * ponto de vista de quem ataca. Qualquer origem adicionada lá tem que ser
 * adicionada aqui — e vice-versa.
 *
 * O que o blog NÃO precisa acrescentar:
 * - `connect-src`: o índice estático é same-origin (`/blog/blog-data/...`),
 *   coberto por `'self'`. Não há endpoint de paginação — ver Blog-0002.
 * - `script-src`: os assets do blog saem sob `/blog-static/_next/...`, que é
 *   same-origin por causa do rewrite no host. `'self'` cobre. É essa a razão de
 *   `assetPrefix` ser um caminho e não um subdomínio.
 */
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
`;

// Valores idênticos aos do storefront — ver ADR 0002 e Blog-0004.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Toda rota do blog vive sob `/blog/*`. O `app/page.tsx` deste projeto
  // responde em `/blog`, NÃO em `/blog/blog` — o Next aplica o prefixo sozinho.
  // Ver Blog-0001.
  basePath: '/blog',

  // Evita colisão de `/_next/` entre as duas zonas sob o mesmo domínio: os
  // assets do blog saem sob `/blog-static/_next/...`. Ver Blog-0001.
  assetPrefix: '/blog-static',

  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'dummyimage.com' }],
  },

  // `data/posts.json` é lido por `fs` em runtime e o tracing do Next não o
  // enxerga (não há `import`). Sem isto o arquivo some no deploy e todo post
  // vira 404 — a mesma pegadinha silenciosa do ADR 0005. Ver Blog-0003.
  outputFileTracingIncludes: {
    '/**': ['./data/posts.json'],
  },

  async headers() {
    return [
      {
        // Com `basePath`, o `source` é prefixado automaticamente: isto casa
        // `/blog` e `/blog/:slug` — as respostas HTML da zona. Cada zona serve
        // seus próprios headers; o `headers()` do storefront não alcança o que
        // este projeto responde. Ver Blog-0004.
        source: '/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Content-Security-Policy', value: cspHeader.replace(/\s{2,}/g, ' ').trim() },
        ],
      },
      {
        /*
         * O índice do windowing (`/blog/blog-data/posts-index.json`). É o único
         * payload grande do projeto — ~3,1 MB, ~740 KB comprimido — e o
         * trade-off assumido em Blog-0002 só se paga se ele for servido do EDGE,
         * não regerado por request.
         *
         * `max-age=0` no browser + `s-maxage` de um ano na CDN: a revalidação
         * fica de graça no cliente e o edge entrega sem tocar em origem. O nome
         * do arquivo não tem hash de conteúdo, então `immutable` seria mentira
         * entre deploys — mas a Vercel invalida o cache de edge a cada deploy, e
         * é isso que torna o `s-maxage` longo seguro aqui.
         */
        source: '/blog-data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
