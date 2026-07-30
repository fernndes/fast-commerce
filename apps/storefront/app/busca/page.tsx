import Link from 'next/link';

import { Pagination } from '@/components/pagination/pagination';
import { ProductGrid } from '@/components/product-grid/product-grid';
import { SortSelect } from '@/components/product-grid/sort-select';
import { searchProducts } from '@/lib/catalog';
import { parseProductQuery, toURLSearchParams } from '@/lib/query';

/**
 * Resultados da busca.
 *
 * Esta página buscava `https://api.exemplo/busca` — um host que não existe,
 * então a rota quebrava em toda visita. Agora ela consulta o catálogo pela
 * camada de dados, no mesmo processo: `searchProducts` casa o termo contra
 * nome, marca e categorias, normalizando acento e caixa, e pontua o que casa
 * no INÍCIO do nome acima do que casa no meio.
 *
 * A rota é dinâmica por natureza (depende de `?q=`), o que o `searchParams`
 * já garante — sem `force-dynamic`, que aqui só repetiria o que a leitura de
 * `searchParams` produz.
 */
export const metadata = {
  title: 'Busca — Fast Commerce',
};

export default async function SearchResult({ searchParams }: PageProps<'/busca'>) {
  const params = await searchParams;
  const parsed = parseProductQuery(toURLSearchParams(params));
  const query = parsed.ok ? parsed.query : {};
  const termo = query.q ?? '';

  // Busca sem termo não é erro nem tela em branco: é o convite para buscar.
  if (!termo) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Busca</h1>
        <p className="text-sm text-zinc-500">
          Digite o que você procura no campo acima, ou{' '}
          <Link href="/produtos" className="underline">
            veja todos os produtos
          </Link>
          .
        </p>
      </main>
    );
  }

  const page = await searchProducts(termo, query);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Resultados para <span className="text-zinc-500">“{termo}”</span>
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {page.total.toLocaleString('pt-BR')} {page.total === 1 ? 'produto' : 'produtos'}
          </p>
          {page.total > 0 && (
            <SortSelect action="/busca" current={query.sort ?? 'relevance'} hidden={{ q: termo }} />
          )}
        </div>
      </header>

      {page.total === 0 ? (
        <p className="text-sm text-zinc-500">
          Nada encontrado. Tente outro termo ou{' '}
          <Link href="/produtos" className="underline">
            navegue pelo catálogo
          </Link>
          .
        </p>
      ) : (
        <>
          <ProductGrid products={page.items} />
          <Pagination basePath="/busca" params={{ q: termo, sort: query.sort }} page={page} />
        </>
      )}
    </main>
  );
}
