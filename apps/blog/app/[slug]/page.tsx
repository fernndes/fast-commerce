import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPostBySlug, getPregeneratedSlugs } from '@/lib/posts';
import { formatDate } from '@/lib/post-types';

/*
 * Página do post — `/blog/[slug]` (o `basePath` põe o prefixo). Ver Blog-0006.
 *
 * Aplicando a matriz do ADR 0012 do storefront: cardinalidade ALTA (10 mil),
 * tolerância à defasagem INFINITA (o conteúdo é imutável — o faker gerou uma vez
 * e nunca mais roda), conjunto FECHADO. Isso dá ISR sob demanda com um
 * subconjunto curado pré-gerado.
 */

// O conteúdo NUNCA muda, então revalidar seria puro desperdício de invocação.
// `false` = cacheia indefinidamente. É o caso em que o eixo "defasagem" do ADR
// 0012 é literalmente infinito — a PDP do storefront usa 3600 porque preço e
// estoque mudam; aqui, não há o que mudar.
export const revalidate = false;

/**
 * Pré-gera só os ~50 posts mais recentes; o resto gera-e-cacheia na primeira
 * visita.
 *
 * O ADR 0008 do storefront devolveu `[]` e registrou "pré-gerar um subconjunto
 * curado" como o meio-termo que não deu para implementar lá — faltava telemetria
 * de popularidade. Aqui esse impedimento não existe: o conjunto é fechado e
 * conhecido no build, e "mais recentes" é um critério editorial legítimo, não um
 * palpite. São exatamente os posts que a listagem mostra na primeira janela, ou
 * seja, os que mais provavelmente recebem o primeiro clique.
 *
 * Continua valendo a semântica deliberada do ADR 0008: lista NÃO-VAZIA gera
 * esses caminhos no build, e `dynamicParams` (padrão `true`) mantém os outros
 * 9.950 sob demanda. Remover a função não é equivalente a nada disso.
 *
 * 50 páginas no build são segundos, não os minutos que 10.000 custariam.
 */
export async function generateStaticParams() {
  const slugs = await getPregeneratedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return { title: 'Post não encontrado' };

  return {
    title: post.title,
    description: post.excerpt,
    // Canônica única por post. Não existe `?page=` em lugar nenhum deste
    // projeto, então não há a classe de conteúdo duplicado que paginação cria —
    // ver Blog-0005 e o cuidado do ADR 0011.
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }],
    },
  };
}

export default async function PostPage({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // 404 real, não um `<h1>` de desculpa com status 200 — ver ADR 0008.
  if (!post) notFound();

  return (
    <main className="page-shell flex flex-1 flex-col py-10">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <nav aria-label="Trilha" className="text-sm text-zinc-500">
          {/* Dentro da zona: `<Link>`. Vira `/blog` pelo `basePath`. */}
          <Link href="/" className="hover:underline">
            Blog
          </Link>
        </nav>

        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{post.title}</h1>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {post.author}
            <span aria-hidden="true"> · </span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true"> · </span>
            {post.readingMinutes} min de leitura
          </p>
        </header>

        {/*
          A capa é o LCP desta rota. `preload` — não `priority`: a partir do
          Next 16 `priority` está DEPRECIADA em favor de `preload`, que diz o que
          de fato acontece (um `<link rel="preload">` no `<head>`). As imagens do
          corpo ficam lazy, o padrão. Mesma disciplina do ADR 0013.
        */}
        <Image
          src={post.coverImage}
          alt=""
          width={1200}
          height={630}
          preload
          sizes="(min-width: 768px) 42rem, 100vw"
          className="h-auto w-full rounded-xl bg-zinc-100 object-cover dark:bg-zinc-900"
        />

        {/*
          `bodyHtml` é HTML SANITIZADO NO BUILD (`scripts/generate-posts.ts`):
          markdown passou por remark-rehype, que descarta HTML cru, e por
          rehype-sanitize, que aplica whitelist e valida esquema de URL. Em
          runtime não há markdown, não há parser e não há conversão — o vetor foi
          fechado antes de existir, no espírito do ADR 0004. Ver Blog-0004.

          `npm run verify:posts` falha o build se algo perigoso sobreviver.
        */}
        <div
          className="post-body text-[0.975rem] text-zinc-800 dark:text-zinc-200"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />

        <footer className="flex flex-wrap gap-2 border-t border-black/10 pt-6 dark:border-white/15">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-black/10 px-2.5 py-1 text-xs text-zinc-600 dark:border-white/15 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </footer>
      </article>
    </main>
  );
}
