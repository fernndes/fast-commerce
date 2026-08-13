import type { MetadataRoute } from 'next';

import { BLOG_BASE_PATH, SITE_URL } from '@/lib/site';

/*
 * `robots.txt` da zona blog, servido em `/blog/robots.txt` (o `basePath`
 * prefixa). Ver Blog-0005.
 *
 * Nota sobre Multi-Zones: crawlers leem `dominio.com/robots.txt` — a RAIZ — e
 * essa rota pertence ao storefront, não a esta zona. Então o `robots.txt` que o
 * Google efetivamente obedece é o do host; este aqui é o que responde se alguém
 * pedir o caminho prefixado, e existe principalmente para declarar o sitemap.
 * Para o Google descobrir o sitemap do blog sozinho, o `robots.txt` do host
 * precisa referenciá-lo — está registrado como pendência em Blog-0005.
 *
 * O caminho mais confiável, independente de robots.txt, continua sendo submeter
 * `/blog/sitemap.xml` direto no Search Console.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}${BLOG_BASE_PATH}/sitemap.xml`,
  };
}
