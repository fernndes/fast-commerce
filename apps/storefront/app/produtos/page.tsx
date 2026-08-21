import { Pagination } from '@/components/pagination/pagination';
import { ProductGrid } from '@/components/product-grid/product-grid';
import { SortSelect } from '@/components/product-grid/sort-select';
import { listProducts } from '@/lib/catalog';
import { parseProductQuery, toURLSearchParams } from '@/lib/query';

// PLP — a listagem geral do catálogo, 10.000 produtos. Dinâmica por
// `searchParams` — ver ADR 0012 (adr/0012-estrategia-de-renderizacao-por-rota.md)
// e ADR 0007 (adr/0007-busca-parser-unico-ranking-e-correcao-do-host-externo.md).
export const metadata = {
  title: 'Todos os produtos — Fast Commerce',
};

export default async function Products({ searchParams }: PageProps<'/produtos'>) {
  const params = await searchParams;
  const parsed = parseProductQuery(toURLSearchParams(params));

  // Query inválida não derruba a página (o 400 é papel da API): a PLP cai no
  // padrão e diz o que ignorou. Uma tela de erro por causa de um `?sort=`
  // digitado errado seria um beco sem saída para quem chegou pelo link.
  const query = parsed.ok ? parsed.query : {};
  const page = await listProducts(query);

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
        <h1 className="text-2xl font-semibold tracking-tight">Todos os produtos</h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {page.total.toLocaleString('pt-BR')} {page.total === 1 ? 'produto' : 'produtos'}
          </p>
          <SortSelect
            action="/produtos"
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

      <Pagination basePath="/produtos" params={current} page={page} />
    </main>
  );
}
