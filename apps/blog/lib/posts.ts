import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { FIRST_WINDOW_SIZE, type Post, type PostSummary } from '@/lib/post-types';

/*
 * Camada de dados do blog — SÓ SERVIDOR (abre `node:fs`). O shape e as
 * constantes que o cliente também precisa vivem em `lib/post-types.ts`.
 *
 * Cópia fiel do padrão do ADR 0005 do storefront
 * (apps/storefront/adr/0005-camada-de-dados-do-catalogo-leitura-via-fs.md):
 * `data/posts.json` é o irmão mais novo do `data/big.json`.
 *
 * Duas regras herdadas de lá, pelos mesmos motivos:
 *
 *   Nunca `import` de JSON grande. Um `import` de 19 MB entra no grafo de
 *   módulos, é serializado no bundle do servidor e paga parse a cada cold
 *   start. `fs.readFile` mantém o arquivo como dado, não como código.
 *
 *   Memoizar a PROMISE, não o resultado. Duas rotas renderizando em paralelo no
 *   mesmo processo chamariam `load()` duas vezes se o cache guardasse o valor
 *   resolvido — a promise memoizada faz a segunda chamada esperar a primeira.
 *
 * Ver Blog-0003 (adr/0003-conteudo-via-faker-build-time-seed-fixa.md).
 */

export type { Post, PostSummary };

type PostsData = {
  /** Ordem editorial: mais recente primeiro. É a ordem da listagem. */
  posts: Post[];
  bySlug: Map<string, Post>;
};

async function load(): Promise<PostsData> {
  // `outputFileTracingIncludes` em `next.config.ts` depende deste caminho: sem
  // ele o arquivo não é empacotado no deploy e todo post vira 404. Mesma
  // pegadinha silenciosa registrada no ADR 0005.
  const file = path.join(process.cwd(), 'data', 'posts.json');
  const posts: Post[] = JSON.parse(await readFile(file, 'utf8'));

  const bySlug = new Map<string, Post>();
  // Slug é a chave de identidade, não um índice numérico — ver Blog-0003.
  for (const post of posts) bySlug.set(post.slug, post);

  return { posts, bySlug };
}

let cache: Promise<PostsData> | null = null;

/** Memoizado na PROMISE — ver o cabeçalho deste arquivo e o ADR 0005. */
export function getPosts(): Promise<PostsData> {
  cache ??= load();
  return cache;
}

/** Post completo. `null` para a rota decidir chamar `notFound()`. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { bySlug } = await getPosts();
  return bySlug.get(slug) ?? null;
}

function toSummary(post: Post): PostSummary {
  const { slug, title, excerpt, author, publishedAt, coverImage } = post;
  return { slug, title, excerpt, author, publishedAt, coverImage };
}

/**
 * O prefixo da listagem, renderizado no servidor para LCP e crawlabilidade.
 * Devolve também o total, que a ilha usa para dimensionar a lista virtual e a
 * página usa para dizer quantos posts existem.
 */
export async function getFirstWindow(): Promise<{ window: PostSummary[]; total: number }> {
  const { posts } = await getPosts();
  return { window: posts.slice(0, FIRST_WINDOW_SIZE).map(toSummary), total: posts.length };
}

/**
 * Os posts pré-gerados no build. O resto é ISR sob demanda — ver Blog-0006.
 *
 * O ADR 0008 do storefront registrou "pré-gerar os N mais vistos" como o
 * meio-termo que não deu para implementar lá, por falta de telemetria. Aqui o
 * conjunto é FECHADO e conhecido no build, então o meio-termo é trivial: os
 * mais recentes são exatamente os que a listagem mostra na primeira janela.
 */
export const PREGENERATED_POSTS = 50;

export async function getPregeneratedSlugs(): Promise<string[]> {
  const { posts } = await getPosts();
  return posts.slice(0, PREGENERATED_POSTS).map((post) => post.slug);
}

/** Todos os slugs — o insumo do `sitemap.xml`. Ver Blog-0005. */
export async function getAllPostRefs(): Promise<{ slug: string; publishedAt: string }[]> {
  const { posts } = await getPosts();
  return posts.map(({ slug, publishedAt }) => ({ slug, publishedAt }));
}
