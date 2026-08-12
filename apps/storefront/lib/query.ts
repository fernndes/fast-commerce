import { clampPerPage, isSortKey, type ProductQuery } from '@/lib/catalog';

/**
 * Parser único de query string → `ProductQuery`. Rota de API e página (que lê
 * `searchParams`) passam pelo MESMO parser: se a PLP e o `/api/produtos`
 * interpretassem `?sort=` de jeitos diferentes, a paginação client-side
 * discordaria da primeira página renderizada no servidor.
 *
 * A política é: parâmetro ausente ou vazio some (vira `undefined`);
 * parâmetro PRESENTE e inválido é erro. Ignorar um `?sort=xyz` silenciosamente
 * devolveria 200 com uma ordenação que ninguém pediu.
 */

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

/** Nenhuma busca legítima no catálogo precisa de mais que isso. */
const MAX_QUERY_LENGTH = 100;

/**
 * `q` é busca livre digitada por gente: em vez de recusar um valor
 * "estranho" (política do resto do arquivo), normaliza — remove caracteres
 * de controle/invisíveis, colapsa espaços e limita o tamanho, para não
 * arrastar lixo para logs, URLs de paginação e a linha "Resultados para".
 */
function sanitizeSearchTerm(raw: string): string | undefined {
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
      // Só `true`/`1` ligam o filtro — `?inStock=false` não deve virar `true`
      // pelo simples fato de a string ser truthy.
      inStock: inStockRaw === 'true' || inStockRaw === '1' ? true : undefined,
      sort: sort as ProductQuery['sort'],
      page,
      perPage: perPage === undefined ? undefined : clampPerPage(perPage),
    },
  };
}

/**
 * Versão para páginas: `searchParams` de Server Component é um objeto, não
 * `URLSearchParams`, e um mesmo parâmetro repetido chega como array.
 */
export function toURLSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    // Repetido (`?sort=a&sort=b`): vale o primeiro, que é o que
    // `URLSearchParams.get` devolveria numa rota de API.
    params.set(key, Array.isArray(value) ? (value[0] ?? '') : value);
  }
  return params;
}
