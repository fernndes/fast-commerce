import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

/**
 * CSP — estratégia: autorização por ORIGEM + defesa em profundidade.
 * Sem nonce, sem SRI. Decisão documentada:
 *
 * - nonce  → exigiria renderização dinâmica em todas as rotas, destruindo o
 *   estático/ISR que é a tese de performance do projeto. Descartado.
 * - SRI (experimental.sri) → quebrou silenciosamente a cadeia GTM → Custom
 *   HTML → Silktide (SRI não tem modo report; bloqueia sempre). Descartado
 *   após diagnóstico por eliminação.
 * - 'unsafe-inline' em script-src → concessão OBRIGATÓRIA desta estratégia:
 *   o próprio Next injeta scripts inline (self.__next_f, payload RSC) e o
 *   GTM injeta bootstrap + Custom HTML (init do Silktide) inline. Sem
 *   nonce/hash, negar inline quebraria a hidratação do framework.
 *   Mitigação da lacuna: React escapa interpolações por padrão (sem
 *   dangerouslySetInnerHTML com input de usuário no projeto); connect-src
 *   restrito limita exfiltração mesmo se um inline malicioso executar.
 *
 * O que esta CSP ainda garante:
 * - script-src por origem: só 'self' e GTM podem servir scripts EXTERNOS
 *   (bloqueia <script src="evil.com">, o vetor XSS mais comum)
 * - object-src 'none': mata <object>/<embed>
 * - frame-ancestors 'none': anti-clickjacking
 * - base-uri 'self': bloqueia hijack de URLs relativas via <base>
 * - form-action 'self': formulários só submetem ao próprio domínio
 * - connect-src: mesmo script malicioso rodando só "liga" para os domínios
 *   listados — exfiltração contida
 *
 * Fluxo: REPORT-ONLY → navegar tudo (home, PDP, busca, aceitar E recusar
 * consent em sessão limpa, trocar preferências) → tratar violações → trocar
 * a key para 'Content-Security-Policy' (idealmente mantendo o Report-Only
 * junto por alguns dias).
 */
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://dummyimage.com https://*.googletagmanager.com https://*.google-analytics.com;
    connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // DENY (e não SAMEORIGIN) para ficar consistente com frame-ancestors 'none'
  { key: 'X-Frame-Options', value: 'DENY' },
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

export default nextConfig;