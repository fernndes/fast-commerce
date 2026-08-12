import { clampPerPage, isSortKey, type ProductQuery } from '@/lib/catalog';

// Parser único de query string → `ProductQuery` — ver ADR 0007 (adr/0007-busca-parser-unico-ranking-e-correcao-do-host-externo.md).

export type ParseResult =
  | { ok: true; query: ProductQuery }
  | { ok: false; error: string };

/** Aceita apenas inteiro não-negativo. `''`, `'abc'` e `'-1'` são recusados. */
function intParam(params: URLSearchParams, key: string): number | undefined | null {
  const raw = params.get(key);
  if (raw === null || raw === '') return undefined;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return null; // null = inválido
  return value;
}

function stringParam(params: URLSearchParams, key: string): string | undefined {
  const raw = params.get(key)?.trim();
  return raw ? raw : undefined;
}

const MAX_QUERY_LENGTH = 100;

// Normaliza `q` em vez de rejeitar — ver ADR 0004 (adr/0004-sanitizacao-de-termo-de-busca.md).
export function sanitizeSearchTerm(raw: string): string | undefined {
  const cleaned = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

  return cleaned ? cleaned : undefined;
}

function searchTermParam(params: URLSearchParams, key: string): string | undefined {
  const raw = params.get(key);
  return raw ? sanitizeSearchTerm(raw) : undefined;
}

export function parseProductQuery(params: URLSearchParams): ParseResult {
  const sort = stringParam(params, 'sort');
  if (sort !== undefined && !isSortKey(sort)) {
    return { ok: false, error: `sort inválido: "${sort}"` };
  }

  const numbers: Record<string, number | undefined> = {};
  for (const key of ['page', 'perPage', 'minPrice', 'maxPrice']) {
    const value = intParam(params, key);
    if (value === null) {
      return { ok: false, error: `${key} deve ser um inteiro não-negativo` };
    }
    numbers[key] = value;
  }

  const { page, perPage, minPrice, maxPrice } = numbers;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { ok: false, error: 'minPrice não pode ser maior que maxPrice' };
  }

  if (page !== undefined && page < 1) {
    return { ok: false, error: 'page começa em 1' };
  }

  const inStockRaw = params.get('inStock');

  return {
    ok: true,
    query: {
      q: searchTermParam(params, 'q'),
      category: stringParam(params, 'category'),
      brand: stringParam(params, 'brand'),
      minPrice,
      maxPrice,
      // Só `true`/`1` ligam o filtro — evita truthy coercion em `?inStock=false`.
      inStock: inStockRaw === 'true' || inStockRaw === '1' ? true : undefined,
      sort: sort as ProductQuery['sort'],
      page,
      perPage: perPage === undefined ? undefined : clampPerPage(perPage),
    },
  };
}

// Versão para páginas (`searchParams` de Server Component) — ver ADR 0007.
export function toURLSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    // Repetido (`?sort=a&sort=b`): vale o primeiro. Ver ADR 0007.
    params.set(key, Array.isArray(value) ? (value[0] ?? '') : value);
  }
  return params;
}
