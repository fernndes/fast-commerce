import { notFound } from 'next/navigation';

import { Pagination } from '@/components/pagination/pagination';
import { ProductGrid } from '@/components/product-grid/product-grid';
import { SortSelect } from '@/components/product-grid/sort-select';
import { findCategory, getProductsByCategory } from '@/lib/categories';
import { parseProductQuery, toURLSearchParams } from '@/lib/query';

// Uma rota serve departamento e subcategoria — `findCategory` resolve os
// dois. Dinâmica por ler `searchParams`, sem `generateStaticParams` — ver
// ADR 0012 (adr/0012-estrategia-de-renderizacao-por-rota.md), §6.

export async function generateMetadata({ params }: PageProps<'/categorias/[slug]'>) {
  const { slug } = await params;
  const category = await findCategory(slug);
  return { title: category ? `${category.name} — Fast Commerce` : 'Categoria não encontrada' };
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/categorias/[slug]'>) {
  const { slug } = await params;

  const category = await findCategory(slug);
  if (!category) notFound();

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
    <main className="page-shell flex flex-1 flex-col gap-6 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {page.total.toLocaleString('pt-BR')} {page.total === 1 ? 'produto' : 'produtos'}
          </p>
          <SortSelect
            action={category.href}
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

      <Pagination basePath={category.href} params={current} page={page} />
    </main>
  );
}
