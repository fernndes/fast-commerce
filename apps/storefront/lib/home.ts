import { listProducts, type Product, type ProductQuery } from '@/lib/catalog';

/**
 * Curadoria da home. As prateleiras são conteúdo editorial — quais existem, em
 * que ordem e com que nome é decisão de negócio, não algo que se derive do
 * catálogo. Por isso ficam declaradas aqui, e não espalhadas pelo JSX da página.
 *
 * `app/page.tsx` só decide o ARRANJO (o que vem antes, onde entra banner). Se
 * amanhã "Mais vendidos" passar a vir de um endpoint de telemetria, muda o
 * `query` daquela spec e mais nada — a página não sabe a diferença.
 *
 * Cada recorte agora é uma CONSULTA paginada (`listProducts`), não um
 * `.filter()` sobre o catálogo inteiro: com 10.000 produtos, montar 14
 * prateleiras varrendo tudo 14 vezes seria o trabalho mais caro da rota mais
 * acessada do site.
 */

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
    // Não há telemetria de vendas no mock: estoque alto é a melhor proxy de
    // giro que os dados oferecem. Ponto de troca óbvio quando houver API.
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
    title: 'Ração e alimentação',
    href: '/categorias/alimentacao',
    categories: ['alimentacao'],
  },
  {
    id: 'farmacia',
    title: 'Farmácia e bem-estar',
    href: '/categorias/farmacia',
    categories: ['farmacia'],
  },
  {
    id: 'lancamentos',
    title: 'Lançamentos',
    href: '/categorias/lancamentos',
    categories: ['lancamentos'],
  },
  {
    id: 'higiene',
    title: 'Higiene, banho e cuidados',
    href: '/categorias/higiene',
    categories: ['higiene'],
  },
  {
    id: 'passeio',
    title: 'Passeio e acessórios',
    href: '/categorias/acessorios',
    categories: ['acessorios'],
  },
  {
    id: 'casa',
    title: 'Casa e conforto',
    href: '/categorias/camas-e-casinhas',
    categories: ['camas-e-casinhas'],
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
    title: 'Hora de brincar (e petiscar)',
    href: '/categorias/brinquedos',
    categories: ['brinquedos', 'petiscos'],
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
    // Pouco estoque MAS ainda comprável: sem o `inStock`, a régua encheria de
    // produto esgotado, que é o oposto de "corra que está acabando".
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

  // Uma consulta por categoria, cada uma já limitada a MAX_ITEMS — a união de
  // duas categorias nunca precisa de mais itens do que a régua mostra.
  const pages = await Promise.all(
    spec.categories.map((category) => listProducts({ ...base, category })),
  );

  const products: Product[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const product of page.items) {
      // Dedup por slug: o `id` do `big.json` repete (59 colisões em 10.000).
      if (seen.has(product.slug)) continue;
      seen.add(product.slug);
      products.push(product);
    }
  }

  return { id, title, href, products: products.slice(0, MAX_ITEMS) };
}

let cache: Promise<Map<string, HomeShelf>> | null = null;

/**
 * As 14 prateleiras, montadas UMA vez por processo. Memoizado na promise: a
 * home chama `getHomeShelf` 14 vezes e todas compartilham a mesma montagem,
 * em vez de disparar 14 pipelines concorrentes no primeiro request.
 *
 * Antes isso era um `new Map(...)` no topo do módulo. Não dá mais: montar a
 * prateleira agora depende de I/O (a leitura do `big.json`), e I/O no corpo
 * de um módulo é feito no import — travando o boot em vez do primeiro uso.
 */
function getShelves(): Promise<Map<string, HomeShelf>> {
  cache ??= Promise.all(SPECS.map(buildShelf)).then(
    (shelves) => new Map(shelves.map((shelf) => [shelf.id, shelf])),
  );
  return cache;
}

/**
 * Uma prateleira pelo id. Lança em id desconhecido — é typo de quem monta a
 * página, e o build é a hora certa de descobrir. Prateleira que ficou sem
 * produto não lança: o `<Shelf>` simplesmente não renderiza.
 */
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
