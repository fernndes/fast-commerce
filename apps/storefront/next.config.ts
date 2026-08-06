import type { NextConfig } from "next";

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

  /**
   * `data/big.json` é lido em runtime com `fs` (ver `lib/catalog.ts`), nunca
   * importado. O rastreador de dependências do Next só enxerga `import`, então
   * sem esta linha o arquivo ficaria de fora do bundle do servidor e o deploy
   * quebraria com ENOENT — funcionando em dev e falhando em produção.
   */
  outputFileTracingIncludes: {
    '/**': ['./data/big.json'],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
