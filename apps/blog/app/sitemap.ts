import type { MetadataRoute } from 'next';

import { getAllPostRefs } from '@/lib/posts';
import { BLOG_BASE_PATH, SITE_URL, postUrl } from '@/lib/site';

/*
 * O sitemap é o que PAGA o custo de SEO de não ter paginação. Ver Blog-0005.
 *
 * A divisão de responsabilidades da listagem:
 *   a listagem virtualizada é para HUMANOS;
 *   o sitemap.xml é para CRAWLERS.
 *
 * Sem URLs de página, nenhum crawler alcança o post nº 5.000 seguindo links da
 * listagem — a primeira janela expõe 24 `<a href>` e o resto só existe depois
 * que JS roda. Este arquivo é o canal alternativo: os 10.000 slugs declarados de
 * uma vez, cada um uma página real com URL canônica própria.
 *
 * Isso é decisão consciente e documentada, não efeito colateral do windowing.
 *
 * Servido em `/blog/sitemap.xml` — o `basePath` prefixa a rota. É estático: sai
 * pronto do build, sem invocação por request.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPostRefs();

  return [
    {
      url: `${SITE_URL}${BLOG_BASE_PATH}`,
      lastModified: posts[0] ? new Date(posts[0].publishedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...posts.map((post) => ({
      url: postUrl(post.slug),
      // O conteúdo é imutável: `lastModified` é a data de publicação e nunca
      // muda. Mentir aqui (mandar `new Date()`) faria o crawler revisitar 10.000
      // páginas que não mudaram — desperdício do crawl budget dele e nosso.
      lastModified: new Date(post.publishedAt),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
