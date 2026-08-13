/**
 * A URL PÚBLICA do site — o domínio do storefront, não o do deploy do blog.
 *
 * Esta distinção é a pegadinha das Multi-Zones em SEO: a zona blog tem uma URL
 * de deploy própria (`blog-xxx.vercel.app`), mas nenhuma URL canônica, nenhuma
 * entrada de sitemap e nenhum `og:url` pode apontar para lá. Para o Google o
 * blog vive em `dominio.com/blog/*`, e é só isso que pode ser publicado. Anunciar
 * a URL do deploy criaria duas URLs indexáveis para o mesmo conteúdo — o
 * conteúdo duplicado que Blog-0005 existe para evitar.
 *
 * Sem a env var, cai no domínio de produção conhecido: é melhor um build local
 * gerar URLs de produção do que gerar `localhost` e alguém publicar isso.
 *
 * O valor padrão é o MESMO domínio que o container do GTM usa para servir os
 * scripts do Silktide (`/consent/silktide-consent-manager.js`). Não é
 * coincidência e não pode divergir: é a origem compartilhada que faz o consent
 * valer nas duas zonas. Ver Blog-0004.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fast-commerce-ten.vercel.app'
).replace(/\/$/, '');

/** Prefixo de toda rota desta zona. Igual ao `basePath` do `next.config.ts`. */
export const BLOG_BASE_PATH = '/blog';

/** URL absoluta e pública de um post. */
export const postUrl = (slug: string) => `${SITE_URL}${BLOG_BASE_PATH}/${slug}`;
