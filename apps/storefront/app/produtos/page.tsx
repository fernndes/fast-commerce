import { Pagination } from '@/components/pagination/pagination';
import { ProductGrid } from '@/components/product-grid/product-grid';
import { SortSelect } from '@/components/product-grid/sort-select';
import { listProducts } from '@/lib/catalog';
import { parseProductQuery, toURLSearchParams } from '@/lib/query';

/**
 * PLP — a listagem geral do catálogo, 10.000 produtos.
 *
 * Não há `revalidate`: a página é função de `searchParams` (`page`, `sort`,
 * `q`, faixa de preço), e cada combinação é uma resposta diferente. O que se
 * cacheia aqui é o CATÁLOGO, não a página — `getCatalog()` lê o arquivo uma
 * vez por processo e todo request depois disso só fatia índices em memória.
 *
 * A query passa pelo MESMO parser de `/api/produtos` (`lib/query.ts`), então
 * a primeira página renderizada no servidor e as páginas que o cliente venha a
 * buscar pela API concordam sobre o que `?sort=` significa.
 */
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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
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
