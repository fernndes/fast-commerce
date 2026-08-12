import Link from 'next/link';

import type { Page } from '@/lib/catalog';

type PaginationProps = {
  /** Rota base, sem query — `/produtos`, `/categorias/alimentacao`. */
  basePath: string;
  /** Query atual, para preservar `sort`/`q` ao trocar de página. */
  params: Record<string, string | undefined>;
  page: Pick<Page<unknown>, 'page' | 'totalPages' | 'total'>;
};

// Paginação em `<a href>` — Server Component, zero JS. `prefetch={false}`: ver
// ADR 0011 (adr/0011-convencao-prefetch-false-em-links-de-baixa-intencao.md).
export function Pagination({ basePath, params, page }: PaginationProps) {
  if (page.totalPages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '' && key !== 'page') query.set(key, value);
    }
    // Página 1 sem `?page=` — evita conteúdo duplicado. Ver ADR 0011.
    if (target > 1) query.set('page', String(target));

    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const janela = 2;
  const numeros = new Set<number>([1, page.totalPages]);
  for (let i = page.page - janela; i <= page.page + janela; i++) {
    if (i >= 1 && i <= page.totalPages) numeros.add(i);
  }
  const paginas = [...numeros].sort((a, b) => a - b);

  return (
    <nav aria-label="Paginação" className="flex flex-col items-center gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page.page > 1 ? (
            <Link
              href={href(page.page - 1)}
              prefetch={false}
              rel="prev"
              className="grid h-9 items-center rounded-md px-3 text-sm hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
            >
              Anterior
            </Link>
          ) : (
            <span className="grid h-9 items-center px-3 text-sm text-zinc-400">Anterior</span>
          )}
        </li>

        {paginas.map((numero, i) => (
          <li key={numero} className="flex items-center">
            {/* Buraco na sequência vira reticência, não um link para o vazio. */}
            {i > 0 && numero - paginas[i - 1] > 1 && (
              <span className="px-1 text-sm text-zinc-400">…</span>
            )}
            {numero === page.page ? (
              <span
                aria-current="page"
                className="grid h-9 min-w-9 items-center justify-center rounded-md bg-zinc-950 px-2 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950"
              >
                {numero}
              </span>
            ) : (
              <Link
                href={href(numero)}
                prefetch={false}
                className="grid h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
              >
                {numero}
              </Link>
            )}
          </li>
        ))}

        <li>
          {page.page < page.totalPages ? (
            <Link
              href={href(page.page + 1)}
              prefetch={false}
              rel="next"
              className="grid h-9 items-center rounded-md px-3 text-sm hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
            >
              Próxima
            </Link>
          ) : (
            <span className="grid h-9 items-center px-3 text-sm text-zinc-400">Próxima</span>
          )}
        </li>
      </ul>

      <p className="text-xs text-zinc-500">
        Página {page.page} de {page.totalPages}
      </p>
    </nav>
  );
}
