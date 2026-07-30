import type { NextConfig } from "next";

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
};

export default nextConfig;
