/*
 * Gera o conteúdo do blog UMA VEZ, em build time. Ver Blog-0003
 * (adr/0003-conteudo-via-faker-build-time-seed-fixa.md).
 *
 * Três regras que este arquivo existe para garantir:
 *
 * 1. `@faker-js/faker` é devDependency e só é importado AQUI. Ele nunca entra no
 *    bundle nem no servidor — em produção o blog lê JSON por `fs`. Usar
 *    justamente a lib do episódio de supply-chain obriga a fazer isso direito.
 * 2. `faker.seed(SEED)` torna a geração determinística: o mesmo commit produz o
 *    mesmo `posts.json`, então diff é estável e conteúdo é reproduzível.
 * 3. O markdown vira HTML **aqui**, sanitizado. Em runtime não existe markdown,
 *    não existe parser e não existe conversão — só HTML já auditado.
 *
 * Rodar: `npm run generate:posts` (Node 24 executa TypeScript direto).
 *
 * Saídas:
 *   data/posts.json                    posts completos (com corpo). Lido por `fs`.
 *   public/blog-data/posts-index.json  só os resumos. Asset estático do windowing.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fakerPT_BR as faker } from '@faker-js/faker';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

/** Muda isto e o conteúdo inteiro do blog muda. É a identidade do dataset. */
const SEED = 42;

const TOTAL_POSTS = 10_000;

/**
 * Janela de datas FIXA. `faker.date.past()` mediria a partir de "agora", o que
 * faria o dataset mudar a cada build e quebraria a reprodutibilidade — o ponto
 * inteiro da seed. Datas ancoradas em literais não têm esse problema.
 */
const PUBLISHED_FROM = new Date('2019-01-01T00:00:00.000Z');
const PUBLISHED_TO = new Date('2026-06-30T00:00:00.000Z');

const TAGS = [
  'nutricao', 'comportamento', 'saude', 'adestramento', 'filhotes',
  'gatos', 'caes', 'bem-estar', 'higiene', 'passeio',
  'racas', 'veterinaria', 'brinquedos', 'adocao', 'viagem',
];

const ROOT = path.join(import.meta.dirname, '..');

// -------------------------------------------------------------------- tipos

/** Campos que entram no índice do windowing. Sem `body` — ver Blog-0002. */
export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  /** ISO 8601, em UTC. */
  publishedAt: string;
  coverImage: string;
};

/** O post inteiro. `bodyHtml` já vem sanitizado do build. */
export type Post = PostSummary & {
  bodyHtml: string;
  readingMinutes: number;
  tags: string[];
};

// ------------------------------------------------------------- sanitização

/*
 * markdown -> HTML, com DUAS barreiras independentes contra XSS:
 *
 *   remark-rehype   descarta nós de HTML cru do markdown (`allowDangerousHtml`
 *                   fica em `false`, que é o padrão). `<script>` escrito no
 *                   corpo não chega nem a virar nó.
 *   rehype-sanitize aplica um whitelist de tags/atributos e — o que importa de
 *                   verdade aqui — valida o ESQUEMA das URLs. Um link markdown
 *                   `[x](javascript:...)` é sintaxe markdown 100% legítima, ou
 *                   seja, atravessa a primeira barreira intacto. É esta segunda
 *                   que o remove.
 *
 * O conteúdo hoje é "confiável" (nós mesmos geramos). A barreira existe porque
 * "a fonte é confiável" é uma premissa que envelhece mal — mesmo espírito do
 * ADR 0004 do storefront: fechar o vetor antes que ele exista.
 */
const markdownToSafeHtml = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

async function renderMarkdown(markdown: string): Promise<string> {
  const file = await markdownToSafeHtml.process(markdown);
  return String(file);
}

// ---------------------------------------------------------------- geração

/** `"Como Adestrar Filhotes"` -> `"como-adestrar-filhotes"`. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    // NFD separa a letra do acento; o strip remove só o acento. Sem isto,
    // "nutrição" viraria "nutri-o" em vez de "nutricao".
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Título curto o bastante para caber num card sem truncar feio. */
function makeTitle(): string {
  return capitalize(faker.lorem.words({ min: 4, max: 8 }).replace(/\.$/, ''));
}

/**
 * Corpo em markdown: alguns parágrafos, subtítulos, uma lista e uma citação.
 * Variedade suficiente para o CSS do artigo ter o que estilizar.
 */
function makeMarkdown(index: number): string {
  const blocks: string[] = [];

  blocks.push(faker.lorem.paragraph({ min: 3, max: 5 }));

  const sections = faker.number.int({ min: 2, max: 4 });

  for (let s = 0; s < sections; s += 1) {
    blocks.push(`## ${capitalize(faker.lorem.words({ min: 2, max: 5 }))}`);
    blocks.push(faker.lorem.paragraph({ min: 3, max: 6 }));

    if (faker.datatype.boolean()) {
      const items = faker.helpers.multiple(() => `- ${capitalize(faker.lorem.sentence())}`, {
        count: { min: 3, max: 5 },
      });
      blocks.push(items.join('\n'));
    }

    if (faker.datatype.boolean()) {
      blocks.push(`> ${capitalize(faker.lorem.sentence())}`);
    }
  }

  /*
   * Fixture de segurança, determinística: um post a cada 500 carrega um link
   * markdown com esquema `javascript:`. É markdown válido — nenhum parser o
   * rejeita — então ele prova que `rehype-sanitize` está de fato na cadeia.
   * `npm run verify:posts` falha se esse `href` sobreviver no HTML gerado.
   */
  if (index % 500 === 0) {
    blocks.push(`[link de teste](javascript:alert('xss')) — fixture do Blog-0004.`);
  }

  return blocks.join('\n\n');
}

/** ~200 palavras por minuto, o número que todo blog usa. Mínimo de 1. */
function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(markdown.split(/\s+/).length / 200));
}

async function main(): Promise<void> {
  // Antes de qualquer chamada ao faker — é isto que torna tudo reproduzível.
  faker.seed(SEED);

  const posts: Post[] = [];

  // Slug é a IDENTIDADE do post (chave do `bySlug`, `key` do React, URL da
  // página). Faker repete valores, então dois títulos iguais gerariam duas URLs
  // iguais e um post ficaria inalcançável. O sufixo numérico é a garantia.
  // Mesma decisão de identidade-por-slug do ADR 0005.
  const usedSlugs = new Set<string>();

  for (let i = 0; i < TOTAL_POSTS; i += 1) {
    const title = makeTitle();

    let slug = slugify(title);
    if (usedSlugs.has(slug)) {
      let suffix = 2;
      while (usedSlugs.has(`${slug}-${suffix}`)) suffix += 1;
      slug = `${slug}-${suffix}`;
    }
    usedSlugs.add(slug);

    const markdown = makeMarkdown(i);

    posts.push({
      slug,
      title,
      excerpt: faker.lorem.sentences({ min: 1, max: 2 }),
      author: faker.person.fullName(),
      publishedAt: faker.date.between({ from: PUBLISHED_FROM, to: PUBLISHED_TO }).toISOString(),
      // Mesma origem de imagem do storefront, já autorizada na CSP. Proporção
      // 1200x630 é a de card social (OpenGraph).
      coverImage: `https://dummyimage.com/1200x630/${faker.string.hexadecimal({
        length: 6,
        casing: 'lower',
        prefix: '',
      })}/ffffff`,
      bodyHtml: await renderMarkdown(markdown),
      readingMinutes: readingMinutes(markdown),
      tags: faker.helpers.arrayElements(TAGS, { min: 2, max: 4 }),
    });
  }

  // Mais recente primeiro: é a ordem editorial que a listagem mostra e a ordem
  // em que os posts "em destaque" do `generateStaticParams` são escolhidos.
  posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // O índice do windowing: SÓ resumo, sem `bodyHtml`. A mesma separação
  // resumo-vs-detalhe do ADR 0006 (`ListItem = Omit<Product, 'items'>`) — e é o
  // que mantém o payload do índice viável com 10.000 itens. Ver Blog-0002.
  const index: PostSummary[] = posts.map(
    ({ slug, title, excerpt, author, publishedAt, coverImage }) => ({
      slug,
      title,
      excerpt,
      author,
      publishedAt,
      coverImage,
    }),
  );

  await mkdir(path.join(ROOT, 'data'), { recursive: true });
  await mkdir(path.join(ROOT, 'public', 'blog-data'), { recursive: true });

  // Sem indentação: são ~10-20 MB e ~2 MB de JSON. Pretty-print aqui só
  // engordaria arquivo que nenhum humano vai ler.
  await writeFile(path.join(ROOT, 'data', 'posts.json'), JSON.stringify(posts), 'utf8');
  await writeFile(
    path.join(ROOT, 'public', 'blog-data', 'posts-index.json'),
    JSON.stringify(index),
    'utf8',
  );

  console.log(`posts gerados: ${posts.length} (seed ${SEED})`);
  console.log(`  data/posts.json                    corpo completo, lido por fs`);
  console.log(`  public/blog-data/posts-index.json  resumos, asset estático`);
}

await main();
