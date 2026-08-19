import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Camada de dados do catálogo. Ver ADR 0005 (adr/0005-camada-de-dados-do-catalogo-leitura-via-fs.md).

// ---------------------------------------------------------------- shape cru

/** Preço e disponibilidade vivem no SKU, nunca no produto. Valores em centavos. */
export type Offer = {
  /** "De" — preço cheio. Igual a `price` quando não há desconto. */
  listPrice: number;
  /** "Por" — o que se cobra. */
  price: number;
  availableQuantity: number;
};

export type Sku = {
  itemId: string;
  sku: string;
  name: string;
  /** Valor da variação: `P`/`M`/`G` ou `500g`/`1kg`. O rótulo é `tipoOpcao`. */
  opcao: string;
  images: string[];
  offer: Offer;
};

/** Shape literal de um item de `data/big.json`. Não sai desta camada. */
export type RawProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  /** Par hierárquico `[departamento, subcategoria]`. */
  categories: string[];
  thumb_image: string;
  images: string[];
  /** O que a variação significa: `'peso'` ou `'tamanho'`. */
  tipoOpcao: string;
  items: Sku[];
};

// -------------------------------------------------------- shape normalizado

// `priceFrom`/`listPriceFrom`/`inStock` são de exibição em listagem — PDP e carrinho
// leem sempre `items[].offer`. Ver ADR 0005 (adr/0005-camada-de-dados-do-catalogo-leitura-via-fs.md).
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  categories: string[];
  /** `categories[0]` — o departamento, nomeado para não indexar por posição. */
  department: string;
  /** `categories[1]` — a subcategoria. */
  subcategory: string;
  thumb_image: string;
  images: string[];
  tipoOpcao: string;
  items: Sku[];
  /** Menor `offer.price` entre os SKUs — o "a partir de" da listagem. */
  priceFrom: number;
  /** `offer.listPrice` do MESMO SKU de `priceFrom` — o "de" do par de/por. */
  listPriceFrom: number;
  /** Algum SKU com `availableQuantity > 0`. */
  inStock: boolean;
  /**
   * Soma de `availableQuantity` de todos os SKUs. Chave de ORDENAÇÃO apenas
   * (proxy de giro, régua de últimas unidades) — não é "o estoque do produto"
   * e não deve ser exibido como tal.
   */
  totalAvailable: number;
  /** Nome e marca normalizados (sem acento, minúsculos). Índice de busca. */
  search: { name: string; brand: string; blob: string };
};

export type Catalog = {
  /** Ordem do arquivo — que é a ordem de entrada no catálogo. */
  products: Product[];
  bySlug: Map<string, Product>;
  byDept: Map<string, Product[]>;
  bySub: Map<string, Product[]>;
  deptCounts: Map<string, number>;
  subCounts: Map<string, number>;
};

// ------------------------------------------------------------------ leitura

/** Acento e caixa fora: `"Açúcar"` e `"acucar"` têm que casar na busca. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toProduct(raw: RawProduct): Product {
  let cheapest: Sku | null = null;
  let totalAvailable = 0;

  for (const item of raw.items) {
    totalAvailable += item.offer.availableQuantity;
    if (!cheapest || item.offer.price < cheapest.offer.price) cheapest = item;
  }

  const name = normalize(raw.name);
  const brand = normalize(raw.brand);

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    brand: raw.brand,
    categories: raw.categories,
    department: raw.categories[0] ?? '',
    subcategory: raw.categories[1] ?? '',
    thumb_image: raw.thumb_image,
    images: raw.images,
    tipoOpcao: raw.tipoOpcao,
    items: raw.items,
    // Produto sem SKU: cai como indisponível/preço zero. Ver ADR 0005.
    priceFrom: cheapest?.offer.price ?? 0,
    listPriceFrom: cheapest?.offer.listPrice ?? 0,
    inStock: totalAvailable > 0,
    totalAvailable,
    search: { name, brand, blob: `${name} ${brand} ${normalize(raw.categories.join(' '))}` },
  };
}

async function load(): Promise<Catalog> {
  // `outputFileTracingIncludes` em `next.config.ts` depende deste caminho. Ver ADR 0005.
  const file = path.join(process.cwd(), 'data', 'big.json');
  const raw: RawProduct[] = JSON.parse(await readFile(file, 'utf8'));

  const products = raw.map(toProduct);

  const bySlug = new Map<string, Product>();
  const byDept = new Map<string, Product[]>();
  const bySub = new Map<string, Product[]>();

  for (const product of products) {
    // Slug, não `id`, é a chave de identidade — ver ADR 0005.
    bySlug.set(product.slug, product);

    const dept = byDept.get(product.department);
    if (dept) dept.push(product);
    else byDept.set(product.department, [product]);

    const sub = bySub.get(product.subcategory);
    if (sub) sub.push(product);
    else bySub.set(product.subcategory, [product]);
  }

  const counts = (index: Map<string, Product[]>) =>
    new Map([...index].map(([slug, list]) => [slug, list.length] as const));

  return {
    products,
    bySlug,
    byDept,
    bySub,
    deptCounts: counts(byDept),
    subCounts: counts(bySub),
  };
}

let cache: Promise<Catalog> | null = null;

// Memoizado na PROMISE, não no resultado — ver ADR 0005.
export function getCatalog(): Promise<Catalog> {
  cache ??= load();
  return cache;
}

// ------------------------------------------------------------------ consulta

export const SORT_KEYS = [
  'relevance',
  'price-asc',
  'price-desc',
  'discount',
  'stock',
  'stock-asc',
  'newest',
  'name',
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

export type ProductQuery = {
  q?: string;
  /** Slug de departamento OU de subcategoria — os dois resolvem. */
  category?: string;
  brand?: string;
  /** Faixa em CENTAVOS, comparada contra `priceFrom`. */
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export type Page<T> = {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export const DEFAULT_PER_PAGE = 24;
export const MAX_PER_PAGE = 60;

export const clampPerPage = (value: number) =>
  Math.min(Math.max(Math.trunc(value) || DEFAULT_PER_PAGE, 1), MAX_PER_PAGE);

/** Desconto do "a partir de", em fração. Zero quando não há `listPrice` maior. */
export const discountOf = (product: Product) =>
  product.listPriceFrom > product.priceFrom
    ? (product.listPriceFrom - product.priceFrom) / product.listPriceFrom
    : 0;

// Pontuação de relevância por token — ver ADR 0007 (adr/0007-busca-parser-unico-ranking-e-correcao-do-host-externo.md).
function score(product: Product, tokens: string[]): number {
  let total = 0;

  for (const token of tokens) {
    const { name, brand, blob } = product.search;

    if (name.startsWith(token)) total += 100;
    else if (name.includes(` ${token}`)) total += 60;
    else if (name.includes(token)) total += 30;
    else if (brand.includes(token)) total += 15;
    else if (blob.includes(token)) total += 5;
    // Token que não casa em lugar nenhum elimina o produto: a busca é AND.
    else return 0;
  }

  return total;
}

const tokenize = (q: string) => normalize(q).split(/\s+/).filter(Boolean);

/** Produtos da categoria, usando o índice. Sem índice seriam 10.000 `.filter()`. */
function baseList(catalog: Catalog, category?: string): Product[] {
  if (!category) return catalog.products;
  return catalog.byDept.get(category) ?? catalog.bySub.get(category) ?? [];
}

function applyFilters(catalog: Catalog, query: ProductQuery): Product[] {
  const tokens = query.q ? tokenize(query.q) : [];
  const brand = query.brand ? normalize(query.brand) : null;

  let list = baseList(catalog, query.category);

  if (brand) list = list.filter((p) => p.search.brand.includes(brand));
  if (query.inStock) list = list.filter((p) => p.inStock);
  if (query.minPrice !== undefined) list = list.filter((p) => p.priceFrom >= query.minPrice!);
  if (query.maxPrice !== undefined) list = list.filter((p) => p.priceFrom <= query.maxPrice!);

  if (tokens.length > 0) {
    // Guarda a pontuação junto para não recalcular na ordenação por relevância.
    const scored: Product[] = [];
    for (const product of list) {
      if (score(product, tokens) > 0) scored.push(product);
    }
    list = scored;
  }

  return list;
}

function applySort(list: Product[], sort: SortKey, q?: string): Product[] {
  // Copiar antes de ordenar: `list` pode ser o array indexado do catálogo. Ver ADR 0007.
  const items = [...list];
  const tokens = q ? tokenize(q) : [];

  switch (sort) {
    case 'price-asc':
      return items.sort((a, b) => a.priceFrom - b.priceFrom);
    case 'price-desc':
      return items.sort((a, b) => b.priceFrom - a.priceFrom);
    case 'discount':
      return items.sort((a, b) => discountOf(b) - discountOf(a));
    case 'stock':
      return items.sort((a, b) => b.totalAvailable - a.totalAvailable);
    case 'stock-asc':
      return items.sort((a, b) => a.totalAvailable - b.totalAvailable);
    case 'name':
      return items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    case 'newest':
      // Sem campo de data no mock: ordem do arquivo é a ordem de entrada. Ver ADR 0007.
      return items.reverse();
    case 'relevance':
      // Sem termo de busca, "relevância" é a ordem do catálogo: qualquer
      // outra coisa seria uma ordem inventada.
      return tokens.length > 0
        ? items.sort((a, b) => score(b, tokens) - score(a, tokens))
        : items;
  }
}

function paginate<T>(list: T[], page: number, perPage: number): Page<T> {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // Página fora da faixa cai na última, não vazia. Ver ADR 0007.
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * perPage;

  return { items: list.slice(start, start + perPage), page: current, perPage, total, totalPages };
}

/** Listagem paginada — o motor da PLP, das categorias e de `/api/produtos`. */
export async function listProducts(query: ProductQuery = {}): Promise<Page<Product>> {
  const catalog = await getCatalog();
  const perPage = clampPerPage(query.perPage ?? DEFAULT_PER_PAGE);

  const filtered = applyFilters(catalog, query);
  const sorted = applySort(filtered, query.sort ?? 'relevance', query.q);

  return paginate(sorted, query.page ?? 1, perPage);
}

/** Produto completo, com `items[]`. `null` para a rota chamar `notFound()`. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { bySlug } = await getCatalog();
  return bySlug.get(slug) ?? null;
}

/** Busca por termo. É `listProducts` com relevância como ordem padrão. */
export function searchProducts(
  q: string,
  opts: Omit<ProductQuery, 'q'> = {},
): Promise<Page<Product>> {
  return listProducts({ ...opts, q, sort: opts.sort ?? 'relevance' });
}

/**
 * Sugestões de autocomplete: nomes de produto primeiro, marcas depois.
 * Prefixo antes de substring — quem digitou "rac" espera ver o que COMEÇA com
 * "rac" no topo. `q` curto demais não sugere nada (todo produto casaria).
 */
export async function getSuggestions(q: string, limit = 8): Promise<string[]> {
  const term = normalize(q).trim();
  if (term.length < 2) return [];

  const { products } = await getCatalog();

  const prefix: string[] = [];
  const contains: string[] = [];
  const brands = new Set<string>();
  const seen = new Set<string>();

  for (const product of products) {
    if (product.search.name.startsWith(term)) {
      if (!seen.has(product.search.name)) {
        seen.add(product.search.name);
        prefix.push(product.name);
      }
    } else if (product.search.name.includes(term)) {
      if (!seen.has(product.search.name)) {
        seen.add(product.search.name);
        contains.push(product.name);
      }
    } else if (product.search.brand.includes(term) && brands.size < limit) {
      brands.add(product.brand);
    }

    // Corte cedo — ver ADR 0007.
    if (prefix.length >= limit) break;
  }

  return [...prefix, ...contains, ...brands].slice(0, limit);
}

export type Facets = {
  brands: { value: string; count: number }[];
  subcategories: { value: string; count: number }[];
};

// Contagens do resultado atual, limitadas às marcas mais frequentes — ver ADR 0007.
export async function getFacets(query: ProductQuery = {}, limit = 12): Promise<Facets> {
  const catalog = await getCatalog();
  const list = applyFilters(catalog, query);

  const brands = new Map<string, number>();
  const subs = new Map<string, number>();

  for (const product of list) {
    brands.set(product.brand, (brands.get(product.brand) ?? 0) + 1);
    subs.set(product.subcategory, (subs.get(product.subcategory) ?? 0) + 1);
  }

  const top = (counts: Map<string, number>, max: number) =>
    [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([value, count]) => ({ value, count }));

  return { brands: top(brands, limit), subcategories: top(subs, subs.size) };
}
