/*
 * Guarda-corpo do conteúdo gerado. Roda no CI, antes do build. Ver Blog-0003.
 *
 * Um ADR que afirma "o markdown é sanitizado no build" só vale alguma coisa se
 * alguma coisa quebrar quando deixar de ser verdade. É o que este arquivo faz:
 * ele falha o build, não escreve um aviso.
 *
 * Rodar: `npm run verify:posts`
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');

type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  coverImage: string;
};

type Post = PostSummary & { bodyHtml: string; readingMinutes: number; tags: string[] };

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

const posts: Post[] = JSON.parse(
  await readFile(path.join(ROOT, 'data', 'posts.json'), 'utf8'),
);
const index: PostSummary[] = JSON.parse(
  await readFile(path.join(ROOT, 'public', 'blog-data', 'posts-index.json'), 'utf8'),
);

// --------------------------------------------------------------- integridade

check(posts.length === 10_000, `esperado 10000 posts, veio ${posts.length}`);
check(
  index.length === posts.length,
  `índice (${index.length}) e posts (${posts.length}) divergem em tamanho`,
);

const slugs = new Set(posts.map((post) => post.slug));
check(
  slugs.size === posts.length,
  `slug duplicado: ${posts.length - slugs.size} colisão(ões). Slug é identidade — ver Blog-0003.`,
);

check(
  posts.every((post) => post.slug && post.title && post.excerpt && post.coverImage),
  'post com campo de resumo vazio',
);

// A ordem do índice É a ordem da listagem: o virtualizador confia nela, e a
// primeira janela renderizada no servidor tem que ser o mesmo prefixo.
check(
  index.every((summary, i) => summary.slug === posts[i]!.slug),
  'índice fora de ordem em relação a posts.json',
);

// ------------------------------------------------------------- sanitização

// O peso do índice é o trade-off assumido em Blog-0002 — se disparar, a decisão
// precisa ser reavaliada, não silenciosamente tolerada.
const indexBytes = Buffer.byteLength(JSON.stringify(index), 'utf8');
check(
  indexBytes < 6 * 1024 * 1024,
  `índice com ${(indexBytes / 1024 / 1024).toFixed(1)} MB — acima do teto de 6 MB assumido em Blog-0002`,
);

// `data/posts.json` NÃO pode ter vazado para `public/`: lá ele viraria um
// download de ~20 MB acessível publicamente, e o índice perderia a razão de ser.
check(
  !index.some((summary) => 'bodyHtml' in summary),
  'o índice estático carrega `bodyHtml` — ele deve conter só resumo. Ver Blog-0002.',
);

// O fixture plantado por `generate-posts.ts` a cada 500 posts: link markdown com
// esquema `javascript:`. Markdown válido, atravessa o parser, e é `rehype-sanitize`
// quem o remove. Se este teste passar a falhar, a cadeia de sanitização caiu.
const withFixture = posts.filter((post) => post.bodyHtml.includes('fixture do Blog-0004'));

check(
  withFixture.length > 0,
  'fixture de sanitização não encontrado — o teste de XSS não está mais cobrindo nada',
);

for (const pattern of [/javascript:/i, /<script/i, /\son\w+=/i]) {
  const leaked = posts.find((post) => pattern.test(post.bodyHtml));
  check(
    leaked === undefined,
    `HTML perigoso sobreviveu à sanitização (${pattern}) em "${leaked?.slug}". Ver Blog-0004.`,
  );
}

// ------------------------------------------------------------------ saída

if (failures.length > 0) {
  console.error('verificação do conteúdo FALHOU:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `conteúdo verificado: ${posts.length} posts, índice com ${(indexBytes / 1024 / 1024).toFixed(1)} MB, sanitização ativa.`,
);
