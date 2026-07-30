import { notFound } from 'next/navigation';

import { Pagination } from '@/components/pagination/pagination';
import { ProductGrid } from '@/components/product-grid/product-grid';
import { SortSelect } from '@/components/product-grid/sort-select';
import { findCategory, getProductsByCategory } from '@/lib/categories';
import { parseProductQuery, toURLSearchParams } from '@/lib/query';

/**
 * Uma rota serve departamento (`/categorias/alimentacao`) e subcategoria
 * (`/categorias/racao-seca`) — `findCategory` resolve os dois.
 *
 * SEM `generateStaticParams` e sem `revalidate`, e isso é uma correção de
 * rumo: os ~30 slugs até que caberiam num prerender, mas esta página lê
 * `searchParams` para paginar, e ler `searchParams` torna a rota dinâmica.
 * Medido no `next build`, o `generateStaticParams` daqui gerava ZERO páginas —
 * era código morto anunciando um prerender que não acontecia.
 *
 * Servir sob demanda custa pouco: o catálogo já está indexado em memória
 * (`byDept`/`bySub`), então a página é uma fatia de array, não uma varredura.
 * Se um dia a primeira página precisar ser estática, o caminho é tirar a
 * paginação da query string (`/categorias/[slug]/pagina/[n]`), não ressuscitar
 * esta função.
 */

export async function generateMetadata({ params }: PageProps<'/categorias/[slug]'>) {
  const { slug } = await params;
  const categoria = await findCategory(slug);
  return { title: categoria ? `${categoria.name} — Fast Commerce` : 'Categoria não encontrada' };
}

export default async function Categoria({ params, searchParams }: PageProps<'/categorias/[slug]'>) {
  const { slug } = await params;

  const categoria = await findCategory(slug);
  if (!categoria) notFound();

  const parsed = parseProductQuery(toURLSearchParams(await searchParams));
  const query = parsed.ok ? parsed.query : {};

  // A categoria é a do path: `getProductsByCategory` ignora qualquer
  // `?category=` que venha na query string.
  const page = await getProductsByCategory(slug, query);

  // Tudo que o parser aceitou volta para os links de paginação e para o form de
  // ordenação — menos `category`, que é o path. Guardar só `sort` fazia o
  // filtro valer na página 1 e sumir na 2.
  const current = {
    q: query.q,
    sort: query.sort,
    minPrice: query.minPrice === undefined ? undefined : String(query.minPrice),
    maxPrice: query.maxPrice === undefined ? undefined : String(query.maxPrice),
    inStock: query.inStock ? 'true' : undefined,
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{categoria.name}</h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {page.total.toLocaleString('pt-BR')} {page.total === 1 ? 'produto' : 'produtos'}
          </p>
          <SortSelect
            action={categoria.href}
            current={query.sort ?? 'relevance'}
            hidden={{ q: current.q, minPrice: current.minPrice, maxPrice: current.maxPrice }}
          />
        </div>

        {!parsed.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-500">
            Filtro ignorado: {parsed.error}.
          </p>
        )}
      </header>

      <ProductGrid products={page.items} />

      <Pagination basePath={categoria.href} params={current} page={page} />
    </main>
  );
}
