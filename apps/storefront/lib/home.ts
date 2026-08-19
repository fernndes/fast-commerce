import { listProducts, type Product, type ProductQuery } from '@/lib/catalog';

// Curadoria da home: prateleiras são spec editorial, `app/page.tsx` só decide o
// arranjo. Ver ADR 0010 (adr/0010-navegacao-e-curadoria-editorial-fail-loud.md).

export type HomeShelf = {
  id: string;
  title: string;
  /** Destino do "ver tudo" do cabeçalho da prateleira. */
  href: string;
  products: Product[];
};

/**
 * Teto de itens por régua. Ninguém arrasta 30 cards, e cada card a mais é DOM
 * (e um `<img>` lazy) pago por todas as 14 prateleiras da página. Também é o
 * `perPage` de cada consulta: a régua nunca pede mais do que mostra.
 */
const MAX_ITEMS = 12;

type ShelfSpec = Omit<HomeShelf, 'products'> &
  (
    | { query: ProductQuery }
    /** União de categorias — uma consulta por slug, deduplicada por slug. */
    | { categories: string[]; query?: ProductQuery }
  );

const SPECS: ShelfSpec[] = [
  {
    id: 'mais-vendidos',
    title: 'Mais vendidos',
    href: '/produtos?sort=stock',
    // Proxy de "mais vendidos" (sem telemetria no mock) — ver ADR 0010.
    query: { sort: 'stock' },
  },
  {
    id: 'ofertas',
    title: 'Ofertas do dia',
    href: '/produtos?sort=discount',
    query: { sort: 'discount' },
  },
  {
    id: 'alimentacao',
    title: 'Mercearia',
    href: '/categorias/mercearia',
    categories: ['mercearia'],
  },
  {
    id: 'farmacia',
    title: 'Laticínios e frios',
    href: '/categorias/laticinios-e-frios',
    categories: ['laticinios-e-frios'],
  },
  {
    id: 'lancamentos',
    title: 'Lançamentos',
    href: '/categorias/lancamentos',
    categories: ['lancamentos'],
  },
  {
    id: 'higiene',
    title: 'Higiene e limpeza',
    href: '/categorias/higiene-e-limpeza',
    categories: ['higiene-e-limpeza'],
  },
  {
    id: 'passeio',
    title: 'Açougue e peixaria',
    href: '/categorias/acougue-e-peixaria',
    categories: ['acougue-e-peixaria'],
  },
  {
    id: 'casa',
    title: 'Hortifruti',
    href: '/categorias/hortifruti',
    categories: ['hortifruti'],
  },
  {
    id: 'ate-50',
    title: 'Tudo até R$ 50',
    href: '/produtos?maxPrice=5000&sort=price-asc',
    // Preços em centavos, como no `offer`. A faixa compara contra `priceFrom`,
    // o "a partir de" — o produto entra se ALGUM SKU dele cabe no bolso.
    query: { maxPrice: 5000, sort: 'price-asc' },
  },
  {
    id: 'brincar',
    title: 'Bebidas para todo momento',
    href: '/categorias/bebidas',
    categories: ['bebidas'],
  },
  {
    id: 'premium',
    title: 'Seleção premium',
    href: '/produtos?minPrice=15000&sort=price-desc',
    query: { minPrice: 15000, sort: 'price-desc' },
  },
  {
    id: 'frete-gratis',
    title: 'Frete grátis a partir de R$ 99',
    href: '/lp/frete-gratis',
    query: { minPrice: 9900 },
  },
  {
    id: 'ultimas-unidades',
    title: 'Últimas unidades',
    href: '/produtos?inStock=true&sort=stock-asc',
    // Pouco estoque MAS ainda comprável — ver ADR 0010.
    query: { inStock: true, sort: 'stock-asc' },
  },
  {
    id: 'novidades',
    title: 'Chegou agora',
    href: '/produtos?sort=newest',
    query: { sort: 'newest' },
  },
];

async function buildShelf(spec: ShelfSpec): Promise<HomeShelf> {
  const { id, title, href } = spec;
  const base: ProductQuery = { ...spec.query, perPage: MAX_ITEMS, page: 1 };

  if (!('categories' in spec)) {
    const { items } = await listProducts(base);
    return { id, title, href, products: items };
  }

  // Uma consulta por categoria, cada uma já limitada a MAX_ITEMS — ver ADR 0010.
  const pages = await Promise.all(
    spec.categories.map((category) => listProducts({ ...base, category })),
  );

  const products: Product[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const product of page.items) {
      // Dedup por slug — ver ADR 0005.
      if (seen.has(product.slug)) continue;
      seen.add(product.slug);
      products.push(product);
    }
  }

  return { id, title, href, products: products.slice(0, MAX_ITEMS) };
}

let cache: Promise<Map<string, HomeShelf>> | null = null;

// Memoizado na promise, não mais um `Map` de topo de módulo (I/O travaria o boot).
// Ver ADR 0010.
function getShelves(): Promise<Map<string, HomeShelf>> {
  cache ??= Promise.all(SPECS.map(buildShelf)).then(
    (shelves) => new Map(shelves.map((shelf) => [shelf.id, shelf])),
  );
  return cache;
}

// Lança em id desconhecido (fail-loud); sem produto, só não renderiza. Ver ADR 0010.
export async function getHomeShelf(id: string): Promise<HomeShelf> {
  const shelves = await getShelves();
  const shelf = shelves.get(id);

  if (!shelf) {
    throw new Error(
      `[home] prateleira "${id}" não existe. Disponíveis: ${[...shelves.keys()].join(', ')}.`,
    );
  }
  return shelf;
}

export async function getHomeShelves(): Promise<HomeShelf[]> {
  return [...(await getShelves()).values()];
}
