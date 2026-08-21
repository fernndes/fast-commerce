/*
 * Shape e constantes do post. Módulo deliberadamente PURO: sem `node:fs`, sem
 * `next/*`, sem nada de servidor.
 *
 * A razão é concreta: a ilha de virtualização é um Client Component e precisa do
 * tipo `PostSummary` e da URL do índice. Se essas duas coisas morassem em
 * `lib/posts.ts` — que abre `node:fs` — importá-las do cliente arrastaria a
 * camada de leitura de arquivo para o bundle do browser. Separar aqui é o que
 * mantém essa fronteira honesta. Ver ADR 0009 do storefront.
 */

/** Campos de resumo — o que entra no índice do windowing. Ver Blog-0002. */
export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  /** ISO 8601, em UTC. */
  publishedAt: string;
  coverImage: string;
};

/** Post completo. `bodyHtml` já vem sanitizado do build — ver Blog-0004. */
export type Post = PostSummary & {
  bodyHtml: string;
  readingMinutes: number;
  tags: string[];
};

/**
 * O índice estático dos 10.000 resumos, buscado UMA vez pela ilha.
 *
 * O caminho carrega o `/blog` na mão de propósito. `assetPrefix` só afeta
 * `/_next/*`; arquivos de `public/` são servidos sob o `basePath`, e nem o
 * `fetch` nem o `basePath` se falam — o Next não prefixa URL de `fetch`. Ou
 * seja: escrever `/blog-data/...` aqui daria 404 em produção e funcionaria em
 * nenhum lugar. Ver Blog-0001 e Blog-0002.
 */
export const POSTS_INDEX_URL = '/blog/blog-data/posts-index.json';

/**
 * Quantos posts a listagem pinta no HTML servido, antes de qualquer JS.
 *
 * É a mesma janela que o virtualizador mostraria de início — não é uma "página".
 * Não existe leva 2: o resto aparece por virtualização do índice em memória, e a
 * única forma de um crawler alcançar o post nº 5.000 é o `sitemap.xml`.
 * Ver Blog-0002 e Blog-0005.
 */
export const FIRST_WINDOW_SIZE = 24;

/** Chute inicial do virtualizador, MEDIDO (não estimado) — ver Blog-0002, §5. */
export const ESTIMATED_ROW_HEIGHT = 113;

/**
 * Data por extenso. Locale e fuso FIXOS: sem `timeZone: 'UTC'` o servidor
 * formataria no fuso da máquina de build e o cliente no fuso do usuário, e a
 * mesma data renderizaria diferente dos dois lados — erro de hidratação.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
